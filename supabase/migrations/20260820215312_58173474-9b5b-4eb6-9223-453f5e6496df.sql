-- 1. Business onboarding: stop writing the non-existent profiles.country column.
CREATE OR REPLACE FUNCTION public.complete_business_onboarding(p_org_name text, p_archetype text, p_country text DEFAULT NULL::text, p_modules jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_archetype text := coalesce(nullif(trim(p_archetype), ''), 'general_service');
  v_org_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF coalesce(trim(p_org_name), '') = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;
  IF v_archetype NOT IN ('plant_services','landscaping_services','property_services','property_management','asset_service','general_service','individual') THEN
    RAISE EXCEPTION 'Unknown business archetype: %', v_archetype;
  END IF;

  v_org_type := CASE v_archetype
    WHEN 'plant_services' THEN 'plant_rental'
    WHEN 'landscaping_services' THEN 'landscaping_company'
    WHEN 'property_services' THEN 'landscaping_company'
    WHEN 'property_management' THEN 'property_management'
    WHEN 'individual' THEN 'residential'
    ELSE 'landscaping_company'
  END;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, org_type, business_archetype, account_scope, modules_json)
    VALUES (
      trim(p_org_name),
      v_org_type,
      v_archetype,
      CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
      coalesce(p_modules, '{}'::jsonb)
    )
    RETURNING id INTO v_org_id;
  ELSE
    UPDATE public.organizations
    SET name = trim(p_org_name),
        org_type = v_org_type,
        business_archetype = v_archetype,
        account_scope = CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
        modules_json = coalesce(p_modules, modules_json),
        updated_at = now()
    WHERE id = v_org_id;
  END IF;

  -- p_country is accepted for backwards compatibility but not persisted:
  -- there is no canonical country field in the data model yet.
  UPDATE public.profiles
  SET org_id = v_org_id,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_org_id;
END;
$function$;

-- 2. Effective care: documented override > explicit placement baseline > structured
--    species baseline > REVISAR. No organization-wide day factors at all.
CREATE OR REPLACE FUNCTION public.plantops_effective_care(p_placement_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_p record;
  v_species integer;
  v_profile record;
  v_care jsonb;
  v_raw jsonb;
  v_base integer;
  v_base_src text := 'none';
  v_pot record;
  v_effective integer;
  v_eff_src text := 'none';
  v_flags jsonb := '[]'::jsonb;
BEGIN
  v_org := public.get_user_org_id(auth.uid());
  SELECT * INTO v_p FROM public.plant_placements WHERE id = p_placement_id AND org_id = v_org;
  IF v_p.id IS NULL THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;

  SELECT pp.id, pp.common_name, pp.scientific_name, pp.care_template_json
    INTO v_profile
  FROM public.plant_instances pi
  JOIN public.plant_profiles pp ON pp.id = pi.plant_profile_id
  WHERE pi.asset_id = v_p.asset_id
  LIMIT 1;

  v_care := v_profile.care_template_json;

  -- Structured numeric baseline only. Care prose is NEVER parsed into days.
  IF v_care IS NOT NULL AND jsonb_typeof(v_care) = 'object' THEN
    v_raw := COALESCE(v_care->'watering_interval_days', v_care->'water_interval_days');
    IF v_raw IS NOT NULL AND jsonb_typeof(v_raw) = 'number' THEN
      v_species := (v_raw#>>'{}')::numeric::integer;
      IF v_species IS NOT NULL AND (v_species < 1 OR v_species > 365) THEN v_species := NULL; END IF;
    END IF;
  END IF;

  -- Baseline precedence (species baseline is used directly, never copied here).
  IF v_p.water_interval_days IS NOT NULL THEN
    v_base := v_p.water_interval_days;
    v_base_src := 'placement';
  ELSIF v_species IS NOT NULL THEN
    v_base := v_species;
    v_base_src := 'species_profile';
  END IF;

  SELECT d.* INTO v_pot FROM public.plantops_asset_details d
  WHERE d.asset_id = v_p.pot_asset_id AND d.org_id = v_org;

  -- Documented override wins over any baseline.
  IF v_p.water_interval_override_days IS NOT NULL THEN
    v_effective := v_p.water_interval_override_days;
    v_eff_src := 'override';
  ELSIF v_base IS NOT NULL THEN
    v_effective := v_base;
    v_eff_src := v_base_src;
  END IF;

  IF v_p.min_interval_days IS NOT NULL AND v_effective IS NOT NULL THEN
    v_effective := GREATEST(v_effective, v_p.min_interval_days);
  END IF;

  -- Review signals from normalized structured fields only (no prose comparison,
  -- and never a day adjustment).
  IF v_effective IS NULL THEN
    v_flags := v_flags || jsonb_build_object('key','no_baseline');
  END IF;
  IF v_p.light_required IS NOT NULL AND v_p.light_actual IS NOT NULL
     AND v_p.light_required <> v_p.light_actual THEN
    v_flags := v_flags || jsonb_build_object(
      'key','light_mismatch','required',v_p.light_required,'actual',v_p.light_actual);
  END IF;
  IF v_p.water_interval_override_days IS NOT NULL
     AND COALESCE(trim(v_p.care_override_reason), '') = '' THEN
    v_flags := v_flags || jsonb_build_object('key','override_without_reason');
  END IF;

  RETURN jsonb_build_object(
    'placement_id', v_p.id,
    'species_baseline_days', v_species,
    'species_profile_id', v_profile.id,
    'species_common_name', v_profile.common_name,
    'species_scientific_name', v_profile.scientific_name,
    'species_care_template', v_care,
    'placement_baseline_days', v_p.water_interval_days,
    'base_days', v_base,
    'base_source', v_base_src,
    'baseline_days', v_base,
    'baseline_source', v_base_src,
    'effective_source', v_eff_src,
    'configured_factors', '[]'::jsonb,
    'factors_total_days', 0,
    'override_days', v_p.water_interval_override_days,
    'effective_days', v_effective,
    'needs_review', (v_effective IS NULL),
    'review_flags', v_flags,
    'min_interval_days', v_p.min_interval_days,
    'override_reason', v_p.care_override_reason,
    'override_by', v_p.care_override_by,
    'override_at', v_p.care_override_at,
    'water_amount_note', v_p.water_amount_note,
    'water_method', v_p.water_method,
    'light_required', v_p.light_required,
    'light_actual', v_p.light_actual,
    'ventilation', v_p.ventilation,
    'care_responsibility', v_p.care_responsibility,
    'reminder_contact', v_p.reminder_contact,
    'client_instructions', v_p.client_instructions,
    'do_not_do', v_p.do_not_do,
    'care_notes', v_p.care_notes,
    'last_watered_at', v_p.last_watered_at,
    'next_water_due', v_p.next_water_due,
    'estate_id', v_p.estate_id,
    'pot', CASE WHEN v_pot.asset_id IS NULL THEN NULL ELSE jsonb_build_object(
      'material', v_pot.pot_material,
      'diameter_cm', v_pot.pot_diameter_cm,
      'height_cm', v_pot.pot_height_cm,
      'volume_liters', v_pot.pot_volume_liters,
      'has_drainage', v_pot.pot_has_drainage,
      'drainage_holes', v_pot.pot_drainage_holes,
      'has_saucer', v_pot.pot_has_saucer,
      'reservoir', v_pot.pot_reservoir,
      'notes', v_pot.pot_notes
    ) END
  );
END;
$function$;