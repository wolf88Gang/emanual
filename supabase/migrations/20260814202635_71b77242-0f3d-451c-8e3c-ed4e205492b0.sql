-- 1. Care action vocabulary (additive)
ALTER TABLE public.plant_care_logs DROP CONSTRAINT IF EXISTS plant_care_logs_action_type_chk;
ALTER TABLE public.plant_care_logs ADD CONSTRAINT plant_care_logs_action_type_chk
  CHECK (action_type = ANY (ARRAY[
    'water','skip_water','clean','prune','fertilize','pest','light_issue',
    'move','rotate','replace','replace_requested','photo','issue','note','inspect'
  ]));

-- 2. Tool assignments linked to a visit (shift)
ALTER TABLE public.tool_assignments
  ADD COLUMN IF NOT EXISTS shift_id uuid REFERENCES public.worker_shifts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS tool_assignments_shift_idx ON public.tool_assignments(shift_id) WHERE shift_id IS NOT NULL;

-- 3. Effective care: explicit operational base, no natural-language parsing
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

  -- Species guide is reference knowledge. Only a genuinely structured numeric
  -- value is surfaced; arbitrary sentences are never parsed into integers.
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

  -- Operational base is the explicit value on the installed plant.
  v_base := v_p.water_interval_days;
  IF v_base IS NOT NULL THEN
    v_base_src := 'placement';
  ELSIF v_species IS NOT NULL THEN
    v_base := v_species;
    v_base_src := 'species_structured';
  END IF;

  SELECT plantops_care_settings_json INTO v_settings FROM public.organizations WHERE id = v_org;
  v_settings := COALESCE(v_settings, '{}'::jsonb);

  SELECT d.* INTO v_pot FROM public.plantops_asset_details d
  WHERE d.asset_id = v_p.pot_asset_id AND d.org_id = v_org;

  -- Only organization-configured factors are applied. No hardcoded agronomy.
  IF v_pot.pot_material IS NOT NULL AND (v_settings->'pot_material'->>v_pot.pot_material) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'pot_material'->>v_pot.pot_material)::integer;
    v_factors := v_factors || jsonb_build_object('label', 'Maceta: ' || v_pot.pot_material, 'days', (v_settings->'pot_material'->>v_pot.pot_material)::integer);
  END IF;
  IF v_p.ventilation IS NOT NULL AND (v_settings->'ventilation'->>v_p.ventilation) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'ventilation'->>v_p.ventilation)::integer;
    v_factors := v_factors || jsonb_build_object('label', 'Ventilación: ' || v_p.ventilation, 'days', (v_settings->'ventilation'->>v_p.ventilation)::integer);
  END IF;
  IF v_p.light_actual IS NOT NULL AND (v_settings->'light_actual'->>v_p.light_actual) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'light_actual'->>v_p.light_actual)::integer;
    v_factors := v_factors || jsonb_build_object('label', 'Luz actual: ' || v_p.light_actual, 'days', (v_settings->'light_actual'->>v_p.light_actual)::integer);
  END IF;
  IF (v_settings->'season'->>to_char(now(), 'MM')) IS NOT NULL THEN
    v_factor_total := v_factor_total + (v_settings->'season'->>to_char(now(), 'MM'))::integer;
    v_factors := v_factors || jsonb_build_object('label', 'Estación (mes ' || to_char(now(),'MM') || ')', 'days', (v_settings->'season'->>to_char(now(),'MM'))::integer);
  END IF;

  v_effective := COALESCE(
    v_p.water_interval_override_days,
    CASE WHEN v_base IS NOT NULL THEN GREATEST(1, v_base + v_factor_total) ELSE NULL END
  );
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

-- 4. Care plan writes: explicit mode allows intentional clearing
CREATE OR REPLACE FUNCTION public.plantops_set_care_plan(
  p_placement_id uuid,
  p_water_interval_days integer DEFAULT NULL,
  p_override_days integer DEFAULT NULL,
  p_min_interval_days integer DEFAULT NULL,
  p_water_amount_note text DEFAULT NULL,
  p_water_method text DEFAULT NULL,
  p_light_required text DEFAULT NULL,
  p_light_actual text DEFAULT NULL,
  p_ventilation text DEFAULT NULL,
  p_care_responsibility text DEFAULT NULL,
  p_reminder_contact text DEFAULT NULL,
  p_client_instructions text DEFAULT NULL,
  p_do_not_do text DEFAULT NULL,
  p_care_notes text DEFAULT NULL,
  p_override_reason text DEFAULT NULL,
  p_explicit boolean DEFAULT false
)
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

  IF p_explicit THEN
    -- Explicit strategy: every care field on this form is written as sent,
    -- so optional fields can be intentionally cleared. Unrelated placement
    -- columns are untouched.
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

-- 5. Visit tools: assign / return / close using this shift only
CREATE OR REPLACE FUNCTION public.plantops_assign_visit_tools(p_shift_id uuid, p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_estate uuid;
  v_user uuid;
  v_item jsonb;
  v_count integer := 0;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT s.estate_id, s.user_id INTO v_estate, v_user
  FROM public.worker_shifts s JOIN public.estates e ON e.id = s.estate_id
  WHERE s.id = p_shift_id AND e.org_id = v_org AND s.check_out_at IS NULL;
  IF v_estate IS NULL THEN RAISE EXCEPTION 'Open visit not found in your organization'; END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid tool list';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.inventory_items i JOIN public.estates e ON e.id = i.estate_id
      WHERE i.id = (v_item->>'inventory_item_id')::uuid AND e.org_id = v_org
    ) THEN
      RAISE EXCEPTION 'Tool not found in your organization';
    END IF;
    IF COALESCE((v_item->>'quantity')::integer, 0) < 1 THEN
      RAISE EXCEPTION 'Invalid tool quantity';
    END IF;

    INSERT INTO public.tool_assignments (inventory_item_id, assigned_to_user_id, estate_id, quantity_assigned, shift_id)
    VALUES ((v_item->>'inventory_item_id')::uuid, v_user, v_estate, (v_item->>'quantity')::integer, p_shift_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.plantops_return_visit_tools(p_shift_id uuid, p_items jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_item jsonb;
  v_count integer := 0;
  v_cond text;
BEGIN
  v_org := public.plantops_require_internal();
  IF NOT EXISTS (
    SELECT 1 FROM public.worker_shifts s JOIN public.estates e ON e.id = s.estate_id
    WHERE s.id = p_shift_id AND e.org_id = v_org
  ) THEN RAISE EXCEPTION 'Visit not found in your organization'; END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Invalid return list';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_cond := NULLIF(btrim(COALESCE(v_item->>'condition','')), '');
    UPDATE public.tool_assignments
    SET returned_at = now(),
        return_condition = COALESCE(v_cond::inventory_condition, return_condition)
    WHERE id = (v_item->>'assignment_id')::uuid
      AND shift_id = p_shift_id
      AND returned_at IS NULL;
    IF FOUND THEN v_count := v_count + 1; END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.plantops_close_visit(
  p_shift_id uuid,
  p_work_description text DEFAULT NULL,
  p_tools_exception_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_estate uuid;
  v_pending integer;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT s.estate_id INTO v_estate
  FROM public.worker_shifts s JOIN public.estates e ON e.id = s.estate_id
  WHERE s.id = p_shift_id AND e.org_id = v_org;
  IF v_estate IS NULL THEN RAISE EXCEPTION 'Visit not found in your organization'; END IF;

  -- Only tools taken out on THIS visit matter for a normal close.
  SELECT count(*) INTO v_pending FROM public.tool_assignments t
  WHERE t.shift_id = p_shift_id AND t.returned_at IS NULL;

  IF v_pending > 0 AND COALESCE(btrim(p_tools_exception_reason), '') = '' THEN
    RAISE EXCEPTION 'There are % tools not returned. Provide an exception reason to close the visit.', v_pending;
  END IF;

  UPDATE public.worker_shifts
  SET check_out_at = now(),
      work_description = COALESCE(p_work_description, work_description),
      notes = CASE WHEN COALESCE(btrim(p_tools_exception_reason), '') = '' THEN notes
                   ELSE COALESCE(notes || E'\n', '') || 'Herramientas pendientes: ' || p_tools_exception_reason END,
      updated_at = now()
  WHERE id = p_shift_id;
END;
$function$;

-- 6. Extra charge derived from the visited property's client
CREATE OR REPLACE FUNCTION public.plantops_add_charge_for_estate(
  p_estate_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_product_id uuid DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'CRC'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_client uuid;
  v_invoice uuid;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT client_id INTO v_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found in your organization'; END IF;
  IF v_client IS NULL THEN RAISE EXCEPTION 'This property has no client assigned'; END IF;

  v_invoice := public.plantops_add_charge(v_client, p_description, p_quantity, p_unit_price, p_product_id, p_shift_id, p_currency);
  RETURN jsonb_build_object('invoice_id', v_invoice, 'client_id', v_client);
END;
$function$;

-- 7. Idempotent internal watering reminders (runs via pg_cron, no external service)
CREATE OR REPLACE FUNCTION public.plantops_generate_water_reminders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_row record;
  v_created integer := 0;
BEGIN
  FOR v_row IN
    SELECT p.id, p.estate_id, p.org_id, p.next_water_due, a.name AS plant_name, e.name AS estate_name
    FROM public.plant_placements p
    JOIN public.organizations o ON o.id = p.org_id AND o.org_type = 'plant_rental'
    JOIN public.estates e ON e.id = p.estate_id
    LEFT JOIN public.assets a ON a.id = p.asset_id
    WHERE p.status = 'installed'
      AND p.next_water_due IS NOT NULL
      AND p.next_water_due <= CURRENT_DATE
      AND COALESCE(p.care_responsibility, 'raiz_y_forma') <> 'cliente'
  LOOP
    INSERT INTO public.notifications (user_id, estate_id, type, title, title_es, body, body_es, link)
    SELECT ur.user_id, v_row.estate_id, 'plantops_water_due',
           'Watering due: ' || COALESCE(v_row.plant_name, 'plant'),
           'Riego pendiente: ' || COALESCE(v_row.plant_name, 'planta'),
           COALESCE(v_row.estate_name, '') || ' — due ' || v_row.next_water_due,
           COALESCE(v_row.estate_name, '') || ' — para el ' || v_row.next_water_due,
           '/plantops/care?placement=' || v_row.id::text
    FROM public.user_roles ur
    JOIN public.profiles pr ON pr.id = ur.user_id
    WHERE pr.org_id = v_row.org_id
      AND ur.role IN ('owner','manager','crew')
      AND NOT EXISTS (
        SELECT 1 FROM public.notifications n
        WHERE n.user_id = ur.user_id
          AND n.type = 'plantops_water_due'
          AND n.read_at IS NULL
          AND n.link = '/plantops/care?placement=' || v_row.id::text
      );
    v_created := v_created + 1;
  END LOOP;
  RETURN v_created;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_generate_water_reminders() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plantops_generate_water_reminders() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_generate_water_reminders() TO postgres, service_role;

-- 8. Simple payment registration reusing client_payments/invoices
CREATE OR REPLACE FUNCTION public.plantops_register_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text DEFAULT 'cash',
  p_payment_date date DEFAULT CURRENT_DATE,
  p_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_inv record;
  v_paid numeric;
BEGIN
  v_org := public.plantops_require_internal();
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid payment amount'; END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND org_id = v_org;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found in your organization'; END IF;

  INSERT INTO public.client_payments (org_id, invoice_id, client_id, amount, currency, payment_method, payment_date, reference, notes)
  VALUES (v_org, p_invoice_id, v_inv.client_id, p_amount, v_inv.currency, COALESCE(NULLIF(btrim(p_payment_method),''),'cash'), COALESCE(p_payment_date, CURRENT_DATE), NULLIF(btrim(p_reference),''), NULLIF(btrim(p_notes),''));

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.client_payments WHERE invoice_id = p_invoice_id;

  IF v_paid >= v_inv.total AND v_inv.status <> 'paid' THEN
    UPDATE public.invoices SET status = 'paid', updated_at = now() WHERE id = p_invoice_id;
  END IF;

  RETURN jsonb_build_object('invoice_id', p_invoice_id, 'total', v_inv.total, 'paid', v_paid, 'pending', GREATEST(0, v_inv.total - v_paid));
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_assign_visit_tools(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_return_visit_tools(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_add_charge_for_estate(uuid, text, numeric, numeric, uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_register_payment(uuid, numeric, text, date, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_set_care_plan(uuid, integer, integer, integer, text, text, text, text, text, text, text, text, text, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_assign_visit_tools(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_return_visit_tools(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_add_charge_for_estate(uuid, text, numeric, numeric, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_register_payment(uuid, numeric, text, date, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_set_care_plan(uuid, integer, integer, integer, text, text, text, text, text, text, text, text, text, text, text, boolean) TO authenticated, service_role;

-- Daily internal reminder run
SELECT cron.schedule('plantops-water-reminders-daily', '15 6 * * *', $$SELECT public.plantops_generate_water_reminders();$$)
WHERE NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'plantops-water-reminders-daily');