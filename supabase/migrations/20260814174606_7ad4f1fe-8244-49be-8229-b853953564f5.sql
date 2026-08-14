-- ============ M1: care plan on plant_placements ============
ALTER TABLE public.plant_placements
  ADD COLUMN IF NOT EXISTS last_watered_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_water_due date,
  ADD COLUMN IF NOT EXISTS water_interval_days integer,
  ADD COLUMN IF NOT EXISTS water_interval_override_days integer,
  ADD COLUMN IF NOT EXISTS min_interval_days integer,
  ADD COLUMN IF NOT EXISTS water_amount_note text,
  ADD COLUMN IF NOT EXISTS water_method text,
  ADD COLUMN IF NOT EXISTS light_required text,
  ADD COLUMN IF NOT EXISTS light_actual text,
  ADD COLUMN IF NOT EXISTS ventilation text,
  ADD COLUMN IF NOT EXISTS care_responsibility text NOT NULL DEFAULT 'raiz_y_forma',
  ADD COLUMN IF NOT EXISTS reminder_contact text,
  ADD COLUMN IF NOT EXISTS client_instructions text,
  ADD COLUMN IF NOT EXISTS do_not_do text,
  ADD COLUMN IF NOT EXISTS care_notes text,
  ADD COLUMN IF NOT EXISTS care_override_reason text,
  ADD COLUMN IF NOT EXISTS care_updated_by uuid,
  ADD COLUMN IF NOT EXISTS care_updated_at timestamptz;

ALTER TABLE public.plant_placements DROP CONSTRAINT IF EXISTS plant_placements_care_positive_chk;
ALTER TABLE public.plant_placements ADD CONSTRAINT plant_placements_care_positive_chk CHECK (
  (water_interval_days IS NULL OR water_interval_days BETWEEN 1 AND 365)
  AND (water_interval_override_days IS NULL OR water_interval_override_days BETWEEN 1 AND 365)
  AND (min_interval_days IS NULL OR min_interval_days BETWEEN 1 AND 365)
);
ALTER TABLE public.plant_placements DROP CONSTRAINT IF EXISTS plant_placements_care_responsibility_chk;
ALTER TABLE public.plant_placements ADD CONSTRAINT plant_placements_care_responsibility_chk
  CHECK (care_responsibility IN ('raiz_y_forma','cliente','compartido'));

CREATE INDEX IF NOT EXISTS plant_placements_org_next_water_idx ON public.plant_placements (org_id, next_water_due);
CREATE INDEX IF NOT EXISTS plant_placements_estate_status_idx ON public.plant_placements (estate_id, status);

-- ============ M2: pot attributes ============
ALTER TABLE public.plantops_asset_details
  ADD COLUMN IF NOT EXISTS pot_material text,
  ADD COLUMN IF NOT EXISTS pot_diameter_cm numeric,
  ADD COLUMN IF NOT EXISTS pot_height_cm numeric,
  ADD COLUMN IF NOT EXISTS pot_volume_liters numeric,
  ADD COLUMN IF NOT EXISTS pot_has_drainage boolean,
  ADD COLUMN IF NOT EXISTS pot_drainage_holes integer,
  ADD COLUMN IF NOT EXISTS pot_has_saucer boolean,
  ADD COLUMN IF NOT EXISTS pot_reservoir boolean,
  ADD COLUMN IF NOT EXISTS pot_notes text;

ALTER TABLE public.plantops_asset_details DROP CONSTRAINT IF EXISTS plantops_asset_details_pot_positive_chk;
ALTER TABLE public.plantops_asset_details ADD CONSTRAINT plantops_asset_details_pot_positive_chk CHECK (
  (pot_diameter_cm IS NULL OR pot_diameter_cm > 0)
  AND (pot_height_cm IS NULL OR pot_height_cm > 0)
  AND (pot_volume_liters IS NULL OR pot_volume_liters > 0)
  AND (pot_drainage_holes IS NULL OR pot_drainage_holes >= 0)
);
ALTER TABLE public.plantops_asset_details DROP CONSTRAINT IF EXISTS plantops_asset_details_pot_material_chk;
ALTER TABLE public.plantops_asset_details ADD CONSTRAINT plantops_asset_details_pot_material_chk
  CHECK (pot_material IS NULL OR pot_material IN ('ceramica','plastico','barro','fibra','metal','vidrio','otro'));

-- ============ M3: plant_care_logs ============
CREATE TABLE IF NOT EXISTS public.plant_care_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  placement_id uuid REFERENCES public.plant_placements(id) ON DELETE SET NULL,
  asset_id uuid REFERENCES public.assets(id) ON DELETE SET NULL,
  shift_id uuid REFERENCES public.worker_shifts(id) ON DELETE SET NULL,
  action_type text NOT NULL,
  performed_at timestamptz NOT NULL DEFAULT now(),
  performed_by uuid REFERENCES public.profiles(id),
  amount_note text,
  photo_path text,
  notes text,
  override_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plant_care_logs DROP CONSTRAINT IF EXISTS plant_care_logs_action_type_chk;
ALTER TABLE public.plant_care_logs ADD CONSTRAINT plant_care_logs_action_type_chk CHECK (action_type IN (
  'water','clean','prune','fertilize','pest','light_issue','move','replace','photo','issue','note','inspect'
));

GRANT SELECT ON public.plant_care_logs TO authenticated;
GRANT ALL ON public.plant_care_logs TO service_role;
ALTER TABLE public.plant_care_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read care logs" ON public.plant_care_logs;
CREATE POLICY "Org members read care logs" ON public.plant_care_logs
  FOR SELECT TO authenticated USING (org_id = public.get_user_org_id(auth.uid()));

CREATE INDEX IF NOT EXISTS plant_care_logs_placement_idx ON public.plant_care_logs (placement_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS plant_care_logs_estate_idx ON public.plant_care_logs (estate_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS plant_care_logs_shift_idx ON public.plant_care_logs (shift_id);

-- ============ M4: estate_share_links ============
CREATE TABLE IF NOT EXISTS public.estate_share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  show_plants boolean NOT NULL DEFAULT true,
  show_manual boolean NOT NULL DEFAULT true,
  show_last_visit boolean NOT NULL DEFAULT true,
  show_history boolean NOT NULL DEFAULT false,
  show_balance boolean NOT NULL DEFAULT false,
  contact_note text,
  manual_snapshot_json jsonb,
  manual_approved_at timestamptz,
  manual_approved_by uuid REFERENCES public.profiles(id),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.estate_share_links TO authenticated;
GRANT ALL ON public.estate_share_links TO service_role;
ALTER TABLE public.estate_share_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read share links" ON public.estate_share_links;
CREATE POLICY "Org members read share links" ON public.estate_share_links
  FOR SELECT TO authenticated USING (org_id = public.get_user_org_id(auth.uid()));

CREATE INDEX IF NOT EXISTS estate_share_links_estate_idx ON public.estate_share_links (estate_id);

DROP TRIGGER IF EXISTS update_estate_share_links_updated_at ON public.estate_share_links;
CREATE TRIGGER update_estate_share_links_updated_at BEFORE UPDATE ON public.estate_share_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ M5: column extensions ============
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS modules_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS plantops_care_settings_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.worker_shifts ADD COLUMN IF NOT EXISTS visit_kind text;
ALTER TABLE public.rental_contracts ADD COLUMN IF NOT EXISTS services_json jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS source_shift_id uuid REFERENCES public.worker_shifts(id) ON DELETE SET NULL;
ALTER TABLE public.estates ADD COLUMN IF NOT EXISTS setup_status text NOT NULL DEFAULT 'active';
ALTER TABLE public.estates DROP CONSTRAINT IF EXISTS estates_setup_status_chk;
ALTER TABLE public.estates ADD CONSTRAINT estates_setup_status_chk CHECK (setup_status IN ('draft','setup','active','archived'));

-- ============ M6: effective care plan ============
CREATE OR REPLACE FUNCTION public.plantops_effective_care(p_placement_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_p record;
  v_baseline integer;
  v_baseline_src text := 'none';
  v_care jsonb;
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

  IF v_care IS NOT NULL THEN
    v_baseline := NULLIF(regexp_replace(COALESCE(v_care->>'watering_interval_days', v_care->>'water_interval_days', ''), '[^0-9]', '', 'g'), '')::integer;
    IF v_baseline IS NOT NULL THEN v_baseline_src := 'species'; END IF;
  END IF;

  SELECT plantops_care_settings_json INTO v_settings FROM public.organizations WHERE id = v_org;
  v_settings := COALESCE(v_settings, '{}'::jsonb);

  SELECT d.* INTO v_pot FROM public.plantops_asset_details d WHERE d.asset_id = v_p.pot_asset_id AND d.org_id = v_org;

  -- Only organization-configured factors are applied. No hardcoded agronomic rules.
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
    CASE WHEN v_baseline IS NOT NULL THEN GREATEST(1, v_baseline + v_factor_total) ELSE NULL END,
    v_p.water_interval_days
  );
  IF v_p.min_interval_days IS NOT NULL AND v_effective IS NOT NULL THEN
    v_effective := GREATEST(v_effective, v_p.min_interval_days);
  END IF;

  RETURN jsonb_build_object(
    'placement_id', v_p.id,
    'baseline_days', v_baseline,
    'baseline_source', v_baseline_src,
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
    'client_instructions', v_p.client_instructions,
    'do_not_do', v_p.do_not_do,
    'care_notes', v_p.care_notes,
    'last_watered_at', v_p.last_watered_at,
    'next_water_due', v_p.next_water_due,
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
$$;

-- ============ M7: RPCs ============
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
  p_override_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_interval integer;
BEGIN
  v_org := public.plantops_require_internal();

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
$$;

CREATE OR REPLACE FUNCTION public.plantops_log_care(
  p_placement_id uuid,
  p_action_type text,
  p_notes text DEFAULT NULL,
  p_amount_note text DEFAULT NULL,
  p_photo_path text DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_override_reason text DEFAULT NULL,
  p_performed_at timestamptz DEFAULT now()
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_p record;
  v_interval integer;
  v_next date;
  v_log_id uuid;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT * INTO v_p FROM public.plant_placements WHERE id = p_placement_id AND org_id = v_org;
  IF v_p.id IS NULL THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;

  IF p_action_type = 'water' AND v_p.next_water_due IS NOT NULL
     AND p_performed_at::date < v_p.next_water_due
     AND COALESCE(btrim(p_override_reason), '') = '' THEN
    RAISE EXCEPTION 'Too early to water: recommended not before %. Provide an override reason to proceed.', v_p.next_water_due;
  END IF;

  INSERT INTO public.plant_care_logs (
    org_id, estate_id, placement_id, asset_id, shift_id, action_type,
    performed_at, performed_by, amount_note, photo_path, notes, override_reason
  ) VALUES (
    v_org, v_p.estate_id, v_p.id, v_p.asset_id, p_shift_id, p_action_type,
    p_performed_at, auth.uid(), p_amount_note, p_photo_path, p_notes, NULLIF(btrim(p_override_reason), '')
  ) RETURNING id INTO v_log_id;

  IF p_action_type = 'water' THEN
    v_interval := (public.plantops_effective_care(p_placement_id)->>'effective_days')::integer;
    v_next := CASE WHEN v_interval IS NULL THEN NULL ELSE (p_performed_at + (v_interval || ' days')::interval)::date END;
    UPDATE public.plant_placements
    SET last_watered_at = p_performed_at,
        next_water_due = COALESCE(v_next, next_water_due),
        updated_at = now()
    WHERE id = p_placement_id AND org_id = v_org;

    UPDATE public.notifications
    SET read_at = now()
    WHERE estate_id = v_p.estate_id
      AND type = 'plantops_water_due'
      AND read_at IS NULL
      AND link = '/plantops/care?placement=' || p_placement_id::text;
  END IF;

  RETURN jsonb_build_object('log_id', v_log_id, 'care', public.plantops_effective_care(p_placement_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_add_charge(
  p_client_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_product_id uuid DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'CRC'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_invoice uuid;
  v_number text;
BEGIN
  v_org := public.plantops_require_internal();
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Invalid quantity or price';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Client not found in your organization';
  END IF;

  SELECT id INTO v_invoice FROM public.invoices
  WHERE org_id = v_org AND client_id = p_client_id AND status = 'draft'
  ORDER BY created_at DESC LIMIT 1;

  IF v_invoice IS NULL THEN
    v_number := 'DRAFT-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    INSERT INTO public.invoices (org_id, client_id, invoice_number, status, issue_date, subtotal, total, currency)
    VALUES (v_org, p_client_id, v_number, 'draft', CURRENT_DATE, 0, 0, p_currency)
    RETURNING id INTO v_invoice;
  END IF;

  INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, total, source_shift_id)
  VALUES (v_invoice, p_product_id, p_description, p_quantity, p_unit_price, p_quantity * p_unit_price, p_shift_id);

  UPDATE public.invoices i
  SET subtotal = s.sum_total,
      total = ROUND(s.sum_total * (1 + COALESCE(i.tax_percent, 0) / 100.0), 2),
      updated_at = now()
  FROM (SELECT COALESCE(SUM(total), 0) AS sum_total FROM public.invoice_items WHERE invoice_id = v_invoice) s
  WHERE i.id = v_invoice;

  RETURN v_invoice;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_create_share_link(
  p_estate_id uuid,
  p_token_hash text,
  p_show_plants boolean DEFAULT true,
  p_show_manual boolean DEFAULT true,
  p_show_last_visit boolean DEFAULT true,
  p_show_history boolean DEFAULT false,
  p_show_balance boolean DEFAULT false,
  p_contact_note text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_client uuid;
  v_id uuid;
BEGIN
  v_org := public.plantops_require_internal();
  IF length(COALESCE(p_token_hash, '')) < 32 THEN
    RAISE EXCEPTION 'Invalid token hash';
  END IF;
  SELECT client_id INTO v_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Estate not found in your organization or has no client';
  END IF;

  UPDATE public.estate_share_links SET revoked_at = now()
  WHERE estate_id = p_estate_id AND org_id = v_org AND revoked_at IS NULL;

  INSERT INTO public.estate_share_links (
    org_id, client_id, estate_id, token_hash, show_plants, show_manual,
    show_last_visit, show_history, show_balance, contact_note, expires_at, created_by
  ) VALUES (
    v_org, v_client, p_estate_id, p_token_hash, p_show_plants, p_show_manual,
    p_show_last_visit, p_show_history, p_show_balance, p_contact_note, p_expires_at, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_revoke_share_link(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_internal();
  UPDATE public.estate_share_links SET revoked_at = now() WHERE id = p_link_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link not found in your organization'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_approve_manual(p_link_id uuid, p_snapshot jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_internal();
  IF p_snapshot IS NULL OR jsonb_typeof(p_snapshot) <> 'object' THEN
    RAISE EXCEPTION 'Invalid manual snapshot';
  END IF;
  UPDATE public.estate_share_links
  SET manual_snapshot_json = p_snapshot,
      manual_approved_at = now(),
      manual_approved_by = auth.uid(),
      updated_at = now()
  WHERE id = p_link_id AND org_id = v_org AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link not found in your organization'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_start_visit(p_estate_id uuid, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_org uuid; v_id uuid;
BEGIN
  v_org := public.plantops_require_internal();
  IF NOT EXISTS (SELECT 1 FROM public.estates WHERE id = p_estate_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Estate not found in your organization';
  END IF;
  INSERT INTO public.worker_shifts (estate_id, user_id, check_in_at, notes, visit_kind, checkin_type)
  VALUES (p_estate_id, auth.uid(), now(), p_notes, 'plantops', 'plantops')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_close_visit(
  p_shift_id uuid,
  p_work_description text DEFAULT NULL,
  p_tools_exception_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  SELECT count(*) INTO v_pending FROM public.tool_assignments t
  WHERE t.estate_id = v_estate AND t.assigned_to_user_id = auth.uid() AND t.returned_at IS NULL;

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
$$;

REVOKE ALL ON FUNCTION public.plantops_effective_care(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_set_care_plan(uuid,integer,integer,integer,text,text,text,text,text,text,text,text,text,text,text) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_log_care(uuid,text,text,text,text,uuid,text,timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_add_charge(uuid,text,numeric,numeric,uuid,uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_create_share_link(uuid,text,boolean,boolean,boolean,boolean,boolean,text,timestamptz) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_revoke_share_link(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_approve_manual(uuid,jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_start_visit(uuid,text) FROM anon;
REVOKE ALL ON FUNCTION public.plantops_close_visit(uuid,text,text) FROM anon;