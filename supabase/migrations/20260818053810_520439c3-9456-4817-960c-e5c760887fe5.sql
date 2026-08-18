-- 2. Drop legacy overload (15-arg) of plantops_set_care_plan
DROP FUNCTION IF EXISTS public.plantops_set_care_plan(uuid,integer,integer,integer,text,text,text,text,text,text,text,text,text,text,text);

-- 3. Species baseline is reference only
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
  v_base integer;
  v_base_src text := 'none';
  v_care jsonb;
  v_raw jsonb;
  v_settings jsonb;
  v_factor_total integer := 0;
  v_factors jsonb := '[]'::jsonb;
  v_pot record;
  v_effective integer;
BEGIN
  v_org := public.get_user_org_id(auth.uid());
  SELECT * INTO v_p FROM public.plant_placements WHERE id = p_placement_id AND org_id = v_org;
  IF v_p.id IS NULL THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;

  SELECT pp.care_template_json INTO v_care
  FROM public.plant_instances pi
  JOIN public.plant_profiles pp ON pp.id = pi.plant_profile_id
  WHERE pi.asset_id = v_p.asset_id
  LIMIT 1;

  IF v_care IS NOT NULL AND jsonb_typeof(v_care) = 'object' THEN
    v_raw := COALESCE(v_care->'watering_interval_days', v_care->'water_interval_days');
    IF v_raw IS NOT NULL AND jsonb_typeof(v_raw) = 'number' THEN
      v_species := (v_raw#>>'{}')::numeric::integer;
      IF v_species IS NOT NULL AND (v_species < 1 OR v_species > 365) THEN v_species := NULL; END IF;
    END IF;
  END IF;

  -- Operational base is ONLY the explicit value on the installed plant.
  -- The species guide never becomes operational automatically.
  v_base := v_p.water_interval_days;
  IF v_base IS NOT NULL THEN
    v_base_src := 'placement';
  END IF;

  SELECT plantops_care_settings_json INTO v_settings FROM public.organizations WHERE id = v_org;
  v_settings := COALESCE(v_settings, '{}'::jsonb);

  SELECT d.* INTO v_pot FROM public.plantops_asset_details d
  WHERE d.asset_id = v_p.pot_asset_id AND d.org_id = v_org;

  IF v_pot.pot_material IS NOT NULL AND (v_settings->'pot_material'->>v_pot.pot_material) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'pot_material'->>v_pot.pot_material)::integer;
    v_factors := v_factors || jsonb_build_object('key','pot_material','value',v_pot.pot_material,'days', (v_settings->'pot_material'->>v_pot.pot_material)::integer);
  END IF;
  IF v_p.ventilation IS NOT NULL AND (v_settings->'ventilation'->>v_p.ventilation) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'ventilation'->>v_p.ventilation)::integer;
    v_factors := v_factors || jsonb_build_object('key','ventilation','value',v_p.ventilation,'days', (v_settings->'ventilation'->>v_p.ventilation)::integer);
  END IF;
  IF v_p.light_actual IS NOT NULL AND (v_settings->'light_actual'->>v_p.light_actual) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'light_actual'->>v_p.light_actual)::integer;
    v_factors := v_factors || jsonb_build_object('key','light_actual','value',v_p.light_actual,'days', (v_settings->'light_actual'->>v_p.light_actual)::integer);
  END IF;
  IF (v_settings->'season'->>to_char(now(), 'MM')) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'season'->>to_char(now(), 'MM'))::integer;
    v_factors := v_factors || jsonb_build_object('key','season','value',to_char(now(),'MM'),'days', (v_settings->'season'->>to_char(now(),'MM'))::integer);
  END IF;

  IF v_base IS NULL THEN
    v_effective := v_p.water_interval_override_days;
  ELSE
    v_effective := COALESCE(
      v_p.water_interval_override_days,
      GREATEST(1, v_base + v_factor_total)
    );
  END IF;
  IF v_p.min_interval_days IS NOT NULL AND v_effective IS NOT NULL THEN
    v_effective := GREATEST(v_effective, v_p.min_interval_days);
  END IF;

  RETURN jsonb_build_object(
    'placement_id', v_p.id,
    'species_baseline_days', v_species,
    'base_days', v_base,
    'base_source', v_base_src,
    'baseline_days', v_base,
    'baseline_source', v_base_src,
    'configured_factors', v_factors,
    'factors_total_days', v_factor_total,
    'override_days', v_p.water_interval_override_days,
    'effective_days', v_effective,
    'needs_review', (v_effective IS NULL),
    'min_interval_days', v_p.min_interval_days,
    'override_reason', v_p.care_override_reason,
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

-- 1. care_responsibility never null
CREATE OR REPLACE FUNCTION public.plantops_set_care_plan(p_placement_id uuid, p_water_interval_days integer DEFAULT NULL::integer, p_override_days integer DEFAULT NULL::integer, p_min_interval_days integer DEFAULT NULL::integer, p_water_amount_note text DEFAULT NULL::text, p_water_method text DEFAULT NULL::text, p_light_required text DEFAULT NULL::text, p_light_actual text DEFAULT NULL::text, p_ventilation text DEFAULT NULL::text, p_care_responsibility text DEFAULT NULL::text, p_reminder_contact text DEFAULT NULL::text, p_client_instructions text DEFAULT NULL::text, p_do_not_do text DEFAULT NULL::text, p_care_notes text DEFAULT NULL::text, p_override_reason text DEFAULT NULL::text, p_explicit boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_interval integer;
BEGIN
  v_org := public.plantops_require_internal();

  IF p_care_responsibility IS NOT NULL
     AND p_care_responsibility NOT IN ('raiz_y_forma','cliente','compartido') THEN
    RAISE EXCEPTION 'Invalid care responsibility';
  END IF;
  IF p_explicit AND p_care_responsibility IS NULL THEN
    RAISE EXCEPTION 'Care responsibility is required';
  END IF;

  IF p_explicit THEN
    UPDATE public.plant_placements SET
      water_interval_days = p_water_interval_days,
      water_interval_override_days = p_override_days,
      min_interval_days = p_min_interval_days,
      water_amount_note = NULLIF(btrim(COALESCE(p_water_amount_note,'')), ''),
      water_method = NULLIF(btrim(COALESCE(p_water_method,'')), ''),
      light_required = NULLIF(btrim(COALESCE(p_light_required,'')), ''),
      light_actual = NULLIF(btrim(COALESCE(p_light_actual,'')), ''),
      ventilation = NULLIF(btrim(COALESCE(p_ventilation,'')), ''),
      care_responsibility = p_care_responsibility,
      reminder_contact = NULLIF(btrim(COALESCE(p_reminder_contact,'')), ''),
      client_instructions = NULLIF(btrim(COALESCE(p_client_instructions,'')), ''),
      do_not_do = NULLIF(btrim(COALESCE(p_do_not_do,'')), ''),
      care_notes = NULLIF(btrim(COALESCE(p_care_notes,'')), ''),
      care_override_reason = NULLIF(btrim(COALESCE(p_override_reason,'')), ''),
      care_updated_by = auth.uid(),
      care_updated_at = now(),
      updated_at = now()
    WHERE id = p_placement_id AND org_id = v_org;
  ELSE
    UPDATE public.plant_placements SET
      water_interval_days = COALESCE(p_water_interval_days, water_interval_days),
      water_interval_override_days = p_override_days,
      min_interval_days = COALESCE(p_min_interval_days, min_interval_days),
      water_amount_note = COALESCE(p_water_amount_note, water_amount_note),
      water_method = COALESCE(p_water_method, water_method),
      light_required = COALESCE(p_light_required, light_required),
      light_actual = COALESCE(p_light_actual, light_actual),
      ventilation = COALESCE(p_ventilation, ventilation),
      care_responsibility = COALESCE(p_care_responsibility, care_responsibility),
      reminder_contact = COALESCE(p_reminder_contact, reminder_contact),
      client_instructions = COALESCE(p_client_instructions, client_instructions),
      do_not_do = COALESCE(p_do_not_do, do_not_do),
      care_notes = COALESCE(p_care_notes, care_notes),
      care_override_reason = COALESCE(p_override_reason, care_override_reason),
      care_updated_by = auth.uid(),
      care_updated_at = now(),
      updated_at = now()
    WHERE id = p_placement_id AND org_id = v_org;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;

  v_interval := (public.plantops_effective_care(p_placement_id)->>'effective_days')::integer;

  UPDATE public.plant_placements
  SET next_water_due = CASE
        WHEN v_interval IS NULL THEN next_water_due
        WHEN last_watered_at IS NULL THEN CURRENT_DATE
        ELSE (last_watered_at + (v_interval || ' days')::interval)::date
      END
  WHERE id = p_placement_id AND org_id = v_org;

  RETURN public.plantops_effective_care(p_placement_id);
END;
$function$;

-- 4. pot details: resolve org via estate
CREATE OR REPLACE FUNCTION public.plantops_set_pot_details(p_asset_id uuid, p_material text DEFAULT NULL::text, p_diameter_cm numeric DEFAULT NULL::numeric, p_height_cm numeric DEFAULT NULL::numeric, p_volume_liters numeric DEFAULT NULL::numeric, p_has_drainage boolean DEFAULT NULL::boolean, p_drainage_holes integer DEFAULT NULL::integer, p_has_saucer boolean DEFAULT NULL::boolean, p_reservoir boolean DEFAULT NULL::boolean, p_notes text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_asset_org uuid;
BEGIN
  v_org := public.plantops_require_internal();

  SELECT e.org_id INTO v_asset_org
  FROM public.assets a
  JOIN public.estates e ON e.id = a.estate_id
  WHERE a.id = p_asset_id;

  IF v_asset_org IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  IF v_asset_org <> v_org THEN
    RAISE EXCEPTION 'Cross-organization access denied';
  END IF;

  INSERT INTO public.plantops_asset_details (asset_id, org_id, pot_material, pot_diameter_cm,
    pot_height_cm, pot_volume_liters, pot_has_drainage, pot_drainage_holes, pot_has_saucer,
    pot_reservoir, pot_notes)
  VALUES (p_asset_id, v_org, p_material, p_diameter_cm, p_height_cm, p_volume_liters,
    p_has_drainage, p_drainage_holes, p_has_saucer, p_reservoir, p_notes)
  ON CONFLICT (asset_id) DO UPDATE SET
    pot_material = EXCLUDED.pot_material,
    pot_diameter_cm = EXCLUDED.pot_diameter_cm,
    pot_height_cm = EXCLUDED.pot_height_cm,
    pot_volume_liters = EXCLUDED.pot_volume_liters,
    pot_has_drainage = EXCLUDED.pot_has_drainage,
    pot_drainage_holes = EXCLUDED.pot_drainage_holes,
    pot_has_saucer = EXCLUDED.pot_has_saucer,
    pot_reservoir = EXCLUDED.pot_reservoir,
    pot_notes = EXCLUDED.pot_notes,
    updated_at = now();
END;
$function$;

-- 5. block overpayments
CREATE OR REPLACE FUNCTION public.plantops_register_payment(p_invoice_id uuid, p_amount numeric, p_payment_method text DEFAULT 'cash'::text, p_payment_date date DEFAULT CURRENT_DATE, p_reference text DEFAULT NULL::text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_inv record;
  v_paid numeric;
  v_remaining numeric;
BEGIN
  v_org := public.plantops_require_internal();
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid payment amount'; END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND org_id = v_org FOR UPDATE;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found in your organization'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.client_payments WHERE invoice_id = p_invoice_id;
  v_remaining := COALESCE(v_inv.total, 0) - v_paid;

  IF v_remaining <= 0 THEN
    RAISE EXCEPTION 'Invoice is already fully paid';
  END IF;
  IF p_amount > v_remaining THEN
    RAISE EXCEPTION 'Payment exceeds remaining balance (%)', v_remaining;
  END IF;

  INSERT INTO public.client_payments (org_id, invoice_id, client_id, amount, currency, payment_method, payment_date, reference, notes)
  VALUES (v_org, p_invoice_id, v_inv.client_id, p_amount, v_inv.currency, COALESCE(NULLIF(btrim(p_payment_method),''),'cash'), COALESCE(p_payment_date, CURRENT_DATE), NULLIF(btrim(p_reference),''), NULLIF(btrim(p_notes),''));

  v_paid := v_paid + p_amount;

  IF v_paid >= COALESCE(v_inv.total,0) AND v_inv.status <> 'paid' THEN
    UPDATE public.invoices SET status = 'paid', updated_at = now() WHERE id = p_invoice_id;
  END IF;

  RETURN jsonb_build_object('invoice_id', p_invoice_id, 'total', v_inv.total, 'paid', v_paid, 'pending', GREATEST(0, COALESCE(v_inv.total,0) - v_paid));
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_set_care_plan(uuid,integer,integer,integer,text,text,text,text,text,text,text,text,text,text,text,boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_set_pot_details(uuid,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_register_payment(uuid,numeric,text,date,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_effective_care(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_set_care_plan(uuid,integer,integer,integer,text,text,text,text,text,text,text,text,text,text,text,boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_set_pot_details(uuid,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_register_payment(uuid,numeric,text,date,text,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_effective_care(uuid) TO authenticated, service_role;