-- PlantOps V2 acceptance pass: admin guard, stale-date invariant, pot validation,
-- currency-scoped charges, transactional plant line, care queue.

-- 1. Owner/manager guard -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plantops_require_admin()
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Insufficient role: owner or manager required';
  END IF;
  v_org := public.get_user_org_id(auth.uid());
  IF v_org IS NULL THEN RAISE EXCEPTION 'No organization'; END IF;
  RETURN v_org;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_require_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_require_admin() TO authenticated;

-- 2. Care plan: owner/manager only, and never keep a stale due date ------------
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
  v_org := public.plantops_require_admin();

  IF p_care_responsibility IS NOT NULL
     AND p_care_responsibility NOT IN ('raiz_y_forma','cliente','compartido') THEN
    RAISE EXCEPTION 'Invalid care responsibility';
  END IF;
  IF p_explicit AND p_care_responsibility IS NULL THEN
    RAISE EXCEPTION 'Care responsibility is required';
  END IF;
  IF p_override_days IS NOT NULL
     AND NULLIF(btrim(COALESCE(p_override_reason,'')), '') IS NULL THEN
    RAISE EXCEPTION 'An override reason is required when a manual override is set';
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

  -- Invariant: no effective plan => no due date (state REVISAR, no reminder).
  UPDATE public.plant_placements
  SET next_water_due = CASE
        WHEN v_interval IS NULL THEN NULL
        WHEN last_watered_at IS NULL THEN CURRENT_DATE
        ELSE (last_watered_at + (v_interval || ' days')::interval)::date
      END
  WHERE id = p_placement_id AND org_id = v_org;

  RETURN public.plantops_effective_care(p_placement_id);
END;
$function$;

-- 3. Care log: same invariant on watering ---------------------------------------
CREATE OR REPLACE FUNCTION public.plantops_log_care(p_placement_id uuid, p_action_type text, p_notes text DEFAULT NULL::text, p_amount_note text DEFAULT NULL::text, p_photo_path text DEFAULT NULL::text, p_shift_id uuid DEFAULT NULL::uuid, p_override_reason text DEFAULT NULL::text, p_performed_at timestamp with time zone DEFAULT now())
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    v_next := CASE WHEN v_interval IS NULL THEN NULL
                   ELSE (p_performed_at + (v_interval || ' days')::interval)::date END;
    UPDATE public.plant_placements
    SET last_watered_at = p_performed_at,
        next_water_due = v_next,
        updated_at = now()
    WHERE id = p_placement_id AND org_id = v_org;
  END IF;

  RETURN jsonb_build_object('log_id', v_log_id, 'care', public.plantops_effective_care(p_placement_id));
END;
$function$;

-- 4. Pot details: admin only, pot assets only, canonical materials --------------
CREATE OR REPLACE FUNCTION public.plantops_set_pot_details(p_asset_id uuid, p_material text DEFAULT NULL::text, p_diameter_cm numeric DEFAULT NULL::numeric, p_height_cm numeric DEFAULT NULL::numeric, p_volume_liters numeric DEFAULT NULL::numeric, p_has_drainage boolean DEFAULT NULL::boolean, p_drainage_holes integer DEFAULT NULL::integer, p_has_saucer boolean DEFAULT NULL::boolean, p_reservoir boolean DEFAULT NULL::boolean, p_notes text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_asset_org uuid;
  v_type public.asset_type;
BEGIN
  v_org := public.plantops_require_admin();

  IF p_material IS NOT NULL AND p_material NOT IN ('ceramica','plastico','barro','fibra','metal','vidrio','otro') THEN
    RAISE EXCEPTION 'Invalid pot material %', p_material;
  END IF;

  SELECT e.org_id, a.asset_type INTO v_asset_org, v_type
  FROM public.assets a
  JOIN public.estates e ON e.id = a.estate_id
  WHERE a.id = p_asset_id;

  IF v_asset_org IS NULL THEN RAISE EXCEPTION 'Asset not found'; END IF;
  IF v_asset_org <> v_org THEN RAISE EXCEPTION 'Cross-organization access denied'; END IF;
  IF v_type <> 'pot' THEN RAISE EXCEPTION 'Pot metadata can only be set on a pot asset'; END IF;

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

-- 5. Share links + manual approval are administrative --------------------------
CREATE OR REPLACE FUNCTION public.plantops_approve_manual(p_link_id uuid, p_snapshot jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
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
$function$;

-- Rotation preserves the approved snapshot and display options.
CREATE OR REPLACE FUNCTION public.plantops_create_share_link(p_estate_id uuid, p_token_hash text, p_show_plants boolean DEFAULT true, p_show_manual boolean DEFAULT true, p_show_last_visit boolean DEFAULT true, p_show_history boolean DEFAULT false, p_show_balance boolean DEFAULT false, p_contact_note text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_client uuid;
  v_id uuid;
  v_prev record;
BEGIN
  v_org := public.plantops_require_admin();
  IF length(COALESCE(p_token_hash, '')) < 32 THEN
    RAISE EXCEPTION 'Invalid token hash';
  END IF;
  SELECT client_id INTO v_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
  IF v_client IS NULL THEN
    RAISE EXCEPTION 'Estate not found in your organization or has no client';
  END IF;

  SELECT * INTO v_prev FROM public.estate_share_links
  WHERE estate_id = p_estate_id AND org_id = v_org AND revoked_at IS NULL
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO public.estate_share_links (
    org_id, client_id, estate_id, token_hash, show_plants, show_manual,
    show_last_visit, show_history, show_balance, contact_note, expires_at, created_by,
    manual_snapshot_json, manual_approved_at, manual_approved_by
  ) VALUES (
    v_org, v_client, p_estate_id, p_token_hash,
    COALESCE(v_prev.show_plants, p_show_plants),
    COALESCE(v_prev.show_manual, p_show_manual),
    COALESCE(v_prev.show_last_visit, p_show_last_visit),
    COALESCE(v_prev.show_history, p_show_history),
    COALESCE(v_prev.show_balance, p_show_balance),
    COALESCE(p_contact_note, v_prev.contact_note),
    COALESCE(p_expires_at, v_prev.expires_at),
    auth.uid(),
    v_prev.manual_snapshot_json, v_prev.manual_approved_at, v_prev.manual_approved_by
  ) RETURNING id INTO v_id;

  -- old token is revoked only after the new one exists
  IF v_prev.id IS NOT NULL THEN
    UPDATE public.estate_share_links SET revoked_at = now(), updated_at = now() WHERE id = v_prev.id;
  END IF;

  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.plantops_revoke_share_link(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.estate_share_links SET revoked_at = now() WHERE id = p_link_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Link not found in your organization'; END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.plantops_update_share_link(p_link_id uuid, p_show_plants boolean DEFAULT NULL::boolean, p_show_manual boolean DEFAULT NULL::boolean, p_show_last_visit boolean DEFAULT NULL::boolean, p_show_history boolean DEFAULT NULL::boolean, p_show_balance boolean DEFAULT NULL::boolean, p_contact_note text DEFAULT NULL::text, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_clear_expiry boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.estate_share_links
  SET show_plants = COALESCE(p_show_plants, show_plants),
      show_manual = COALESCE(p_show_manual, show_manual),
      show_last_visit = COALESCE(p_show_last_visit, show_last_visit),
      show_history = COALESCE(p_show_history, show_history),
      show_balance = COALESCE(p_show_balance, show_balance),
      contact_note = COALESCE(NULLIF(btrim(p_contact_note), ''), contact_note),
      expires_at = CASE WHEN p_clear_expiry THEN NULL ELSE COALESCE(p_expires_at, expires_at) END,
      updated_at = now()
  WHERE id = p_link_id AND org_id = v_org AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Share link not found or already revoked'; END IF;
END;
$function$;

-- 6. Billing: currency-scoped drafts and estate attribution --------------------
ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS source_estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS invoice_items_source_estate_idx ON public.invoice_items(source_estate_id);

CREATE OR REPLACE FUNCTION public.plantops_add_charge(p_client_id uuid, p_description text, p_quantity numeric, p_unit_price numeric, p_product_id uuid DEFAULT NULL::uuid, p_shift_id uuid DEFAULT NULL::uuid, p_currency text DEFAULT 'CRC'::text, p_estate_id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_invoice uuid;
  v_number text;
  v_currency text;
BEGIN
  v_org := public.plantops_require_internal();
  v_currency := upper(COALESCE(NULLIF(btrim(p_currency), ''), 'CRC'));
  IF v_currency NOT IN ('CRC','USD') THEN RAISE EXCEPTION 'Unsupported currency %', v_currency; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Invalid quantity or price';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Client not found in your organization';
  END IF;
  IF p_estate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estates WHERE id = p_estate_id AND org_id = v_org
  ) THEN
    RAISE EXCEPTION 'Property not found in your organization';
  END IF;

  -- A draft is only reusable when the currency matches.
  SELECT id INTO v_invoice FROM public.invoices
  WHERE org_id = v_org AND client_id = p_client_id AND status = 'draft' AND currency = v_currency
  ORDER BY created_at DESC LIMIT 1;

  IF v_invoice IS NULL THEN
    v_number := 'DRAFT-' || v_currency || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    INSERT INTO public.invoices (org_id, client_id, invoice_number, status, issue_date, subtotal, total, currency)
    VALUES (v_org, p_client_id, v_number, 'draft', CURRENT_DATE, 0, 0, v_currency)
    RETURNING id INTO v_invoice;
  END IF;

  INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, total, source_shift_id, source_estate_id)
  VALUES (v_invoice, p_product_id, p_description, p_quantity, p_unit_price, p_quantity * p_unit_price, p_shift_id, p_estate_id);

  UPDATE public.invoices i
  SET subtotal = s.sum_total,
      total = ROUND(s.sum_total * (1 + COALESCE(i.tax_percent, 0) / 100.0), 2),
      updated_at = now()
  FROM (SELECT COALESCE(SUM(total), 0) AS sum_total FROM public.invoice_items WHERE invoice_id = v_invoice) s
  WHERE i.id = v_invoice;

  RETURN v_invoice;
END;
$function$;

CREATE OR REPLACE FUNCTION public.plantops_add_charge_for_estate(p_estate_id uuid, p_description text, p_quantity numeric, p_unit_price numeric, p_product_id uuid DEFAULT NULL::uuid, p_shift_id uuid DEFAULT NULL::uuid, p_currency text DEFAULT 'CRC'::text)
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

  v_invoice := public.plantops_add_charge(v_client, p_description, p_quantity, p_unit_price, p_product_id, p_shift_id, p_currency, p_estate_id);
  RETURN jsonb_build_object('invoice_id', v_invoice, 'client_id', v_client);
END;
$function$;

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
  v_org := public.plantops_require_admin();
  IF p_amount IS NULL OR p_amount <= 0 THEN RAISE EXCEPTION 'Invalid payment amount'; END IF;

  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND org_id = v_org FOR UPDATE;
  IF v_inv.id IS NULL THEN RAISE EXCEPTION 'Invoice not found in your organization'; END IF;
  IF v_inv.status = 'cancelled' THEN RAISE EXCEPTION 'Cannot register a payment on a cancelled invoice'; END IF;
  IF v_inv.status = 'draft' THEN RAISE EXCEPTION 'Cannot register a payment on a draft invoice'; END IF;
  IF v_inv.status = 'paid' THEN RAISE EXCEPTION 'Invoice is already fully paid'; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM public.client_payments WHERE invoice_id = p_invoice_id;
  v_remaining := COALESCE(v_inv.total, 0) - v_paid;

  IF v_remaining <= 0 THEN RAISE EXCEPTION 'Invoice is already fully paid'; END IF;
  IF p_amount > v_remaining THEN RAISE EXCEPTION 'Payment exceeds remaining balance (%)', v_remaining; END IF;

  INSERT INTO public.client_payments (org_id, invoice_id, client_id, amount, currency, payment_method, payment_date, reference, notes)
  VALUES (v_org, p_invoice_id, v_inv.client_id, p_amount, v_inv.currency,
          COALESCE(NULLIF(btrim(p_payment_method),''),'cash'), COALESCE(p_payment_date, CURRENT_DATE),
          NULLIF(btrim(p_reference),''), NULLIF(btrim(p_notes),''));

  v_paid := v_paid + p_amount;
  IF v_paid >= COALESCE(v_inv.total,0) THEN
    UPDATE public.invoices SET status = 'paid', updated_at = now() WHERE id = p_invoice_id;
  END IF;

  RETURN jsonb_build_object('invoice_id', p_invoice_id, 'currency', v_inv.currency, 'total', v_inv.total,
                            'paid', v_paid, 'pending', GREATEST(0, COALESCE(v_inv.total,0) - v_paid));
END;
$function$;

-- 7. Transactional wizard plant line -------------------------------------------
CREATE OR REPLACE FUNCTION public.plantops_save_plant_line(
  p_estate_id uuid,
  p_plant_name text,
  p_placement_id uuid DEFAULT NULL,
  p_plant_asset_id uuid DEFAULT NULL,
  p_pot_asset_id uuid DEFAULT NULL,
  p_zone_id uuid DEFAULT NULL,
  p_zone_name text DEFAULT NULL,
  p_floor_label text DEFAULT NULL,
  p_spot_label text DEFAULT NULL,
  p_spot_notes text DEFAULT NULL,
  p_access_notes text DEFAULT NULL,
  p_contract_id uuid DEFAULT NULL,
  p_plant_notes text DEFAULT NULL,
  p_pot_material text DEFAULT NULL,
  p_pot_diameter_cm numeric DEFAULT NULL,
  p_pot_height_cm numeric DEFAULT NULL,
  p_pot_volume_liters numeric DEFAULT NULL,
  p_pot_has_drainage boolean DEFAULT NULL,
  p_pot_drainage_holes integer DEFAULT NULL,
  p_pot_has_saucer boolean DEFAULT NULL,
  p_pot_reservoir boolean DEFAULT NULL,
  p_pot_notes text DEFAULT NULL,
  p_with_pot boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_zone uuid := p_zone_id;
  v_plant uuid := p_plant_asset_id;
  v_pot uuid := p_pot_asset_id;
  v_placement uuid := p_placement_id;
  v_status text;
BEGIN
  v_org := public.plantops_require_admin();

  IF NULLIF(btrim(COALESCE(p_plant_name,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Plant name is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.estates WHERE id = p_estate_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Property not found in your organization';
  END IF;
  IF p_pot_material IS NOT NULL AND p_pot_material NOT IN ('ceramica','plastico','barro','fibra','metal','vidrio','otro') THEN
    RAISE EXCEPTION 'Invalid pot material %', p_pot_material;
  END IF;

  -- Zone / floor ---------------------------------------------------------------
  IF v_zone IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.zones WHERE id = v_zone AND estate_id = p_estate_id) THEN
      RAISE EXCEPTION 'Zone does not belong to that property';
    END IF;
    UPDATE public.zones
    SET name = COALESCE(NULLIF(btrim(p_zone_name),''), name),
        floor_label = COALESCE(NULLIF(btrim(p_floor_label),''), floor_label),
        updated_at = now()
    WHERE id = v_zone;
  ELSIF NULLIF(btrim(COALESCE(p_zone_name,'')),'') IS NOT NULL THEN
    SELECT id INTO v_zone FROM public.zones
    WHERE estate_id = p_estate_id AND lower(name) = lower(btrim(p_zone_name))
      AND COALESCE(lower(floor_label),'') = COALESCE(lower(NULLIF(btrim(p_floor_label),'')),'')
    LIMIT 1;
    IF v_zone IS NULL THEN
      INSERT INTO public.zones (estate_id, name, floor_label)
      VALUES (p_estate_id, btrim(p_zone_name), NULLIF(btrim(p_floor_label),''))
      RETURNING id INTO v_zone;
    END IF;
  END IF;

  -- Plant asset ----------------------------------------------------------------
  IF v_plant IS NOT NULL THEN
    UPDATE public.assets a
    SET name = btrim(p_plant_name),
        description = COALESCE(NULLIF(btrim(p_plant_notes),''), a.description),
        zone_id = COALESCE(v_zone, a.zone_id),
        updated_at = now()
    WHERE a.id = v_plant
      AND a.asset_type = 'plant'
      AND a.estate_id IN (SELECT id FROM public.estates WHERE org_id = v_org);
    IF NOT FOUND THEN RAISE EXCEPTION 'Plant asset not found in your organization'; END IF;
  ELSE
    INSERT INTO public.assets (estate_id, zone_id, asset_type, name, description)
    VALUES (p_estate_id, v_zone, 'plant', btrim(p_plant_name), NULLIF(btrim(p_plant_notes),''))
    RETURNING id INTO v_plant;
  END IF;

  INSERT INTO public.plantops_asset_details (asset_id, org_id, lifecycle_status)
  VALUES (v_plant, v_org, 'active')
  ON CONFLICT (asset_id) DO UPDATE SET updated_at = now();

  -- Pot asset + pot metadata ---------------------------------------------------
  IF p_with_pot THEN
    IF v_pot IS NOT NULL THEN
      UPDATE public.assets a
      SET name = 'Maceta — ' || btrim(p_plant_name),
          zone_id = COALESCE(v_zone, a.zone_id),
          updated_at = now()
      WHERE a.id = v_pot
        AND a.asset_type = 'pot'
        AND a.estate_id IN (SELECT id FROM public.estates WHERE org_id = v_org);
      IF NOT FOUND THEN RAISE EXCEPTION 'Pot asset not found in your organization'; END IF;
    ELSE
      INSERT INTO public.assets (estate_id, zone_id, asset_type, name)
      VALUES (p_estate_id, v_zone, 'pot', 'Maceta — ' || btrim(p_plant_name))
      RETURNING id INTO v_pot;
    END IF;

    INSERT INTO public.plantops_asset_details (
      asset_id, org_id, lifecycle_status, pot_material, pot_diameter_cm, pot_height_cm,
      pot_volume_liters, pot_has_drainage, pot_drainage_holes, pot_has_saucer, pot_reservoir, pot_notes
    ) VALUES (
      v_pot, v_org, 'active', p_pot_material, p_pot_diameter_cm, p_pot_height_cm,
      p_pot_volume_liters, p_pot_has_drainage, p_pot_drainage_holes, p_pot_has_saucer,
      p_pot_reservoir, NULLIF(btrim(p_pot_notes),'')
    )
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
  END IF;

  -- Placement ------------------------------------------------------------------
  IF v_placement IS NOT NULL THEN
    SELECT status INTO v_status FROM public.plant_placements
    WHERE id = v_placement AND org_id = v_org FOR UPDATE;
    IF v_status IS NULL THEN RAISE EXCEPTION 'Placement not found in your organization'; END IF;

    UPDATE public.plant_placements
    SET pot_asset_id = v_pot,
        zone_id = v_zone,
        spot_label = NULLIF(btrim(p_spot_label),''),
        spot_notes = NULLIF(btrim(p_spot_notes),''),
        access_notes = NULLIF(btrim(p_access_notes),''),
        contract_id = COALESCE(p_contract_id, contract_id),
        updated_at = now()
    WHERE id = v_placement;
  ELSE
    v_placement := public.plantops_reserve_asset(
      v_plant, v_pot, p_estate_id, v_zone, p_contract_id,
      NULLIF(btrim(p_spot_label),''), now(), NULL, NULL,
      NULLIF(btrim(p_spot_notes),''), NULLIF(btrim(p_access_notes),'')
    );
    v_status := 'reserved';
  END IF;

  IF v_status = 'reserved' THEN
    PERFORM public.plantops_install_asset(v_placement, now(), NULL);
    v_status := 'installed';
  END IF;

  RETURN jsonb_build_object(
    'placement_id', v_placement,
    'plant_asset_id', v_plant,
    'pot_asset_id', v_pot,
    'zone_id', v_zone,
    'status', v_status
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_save_plant_line(uuid,text,uuid,uuid,uuid,uuid,text,text,text,text,text,uuid,text,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_save_plant_line(uuid,text,uuid,uuid,uuid,uuid,text,text,text,text,text,uuid,text,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text,boolean) TO authenticated;

-- 8. Care queue: one org-scoped read with names, effective plan and flags -------
CREATE OR REPLACE FUNCTION public.plantops_care_queue(p_estate_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_rows jsonb;
BEGIN
  v_org := public.plantops_require_internal();

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'sort_key'), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'placement_id', p.id,
      'asset_id', p.asset_id,
      'plant_name', COALESCE(a.name, '—'),
      'estate_id', p.estate_id,
      'estate_name', e.name,
      'zone_id', p.zone_id,
      'zone_name', z.name,
      'floor_label', z.floor_label,
      'spot_label', p.spot_label,
      'last_watered_at', p.last_watered_at,
      'next_water_due', p.next_water_due,
      'base_days', (cc.c->>'base_days')::int,
      'configured_factors', cc.c->'configured_factors',
      'factors_total_days', (cc.c->>'factors_total_days')::int,
      'min_interval_days', (cc.c->>'min_interval_days')::int,
      'override_days', (cc.c->>'override_days')::int,
      'override_reason', cc.c->>'override_reason',
      'effective_days', (cc.c->>'effective_days')::int,
      'care_responsibility', p.care_responsibility,
      'light_required', p.light_required,
      'light_actual', p.light_actual,
      'water_amount_note', p.water_amount_note,
      'water_method', p.water_method,
      'client_instructions', p.client_instructions,
      'do_not_do', p.do_not_do,
      'pot', cc.c->'pot',
      'open_incident', COALESCE(t.open_incident, false),
      'replacement_pending', COALESCE(t.replacement_pending, false),
      'care_state', CASE
        WHEN (cc.c->>'effective_days') IS NULL THEN 'revisar'
        WHEN COALESCE(t.open_incident, false) OR COALESCE(t.replacement_pending, false) THEN 'revisar'
        WHEN p.next_water_due IS NULL THEN 'revisar'
        WHEN p.next_water_due <= CURRENT_DATE THEN 'regar'
        ELSE 'no_regar'
      END,
      'sort_key', CASE
        WHEN (cc.c->>'effective_days') IS NULL THEN '0'
        WHEN p.next_water_due IS NULL THEN '0'
        WHEN p.next_water_due <= CURRENT_DATE THEN '1'
        ELSE '2'
      END || COALESCE(p.next_water_due::text, '9999-12-31') || COALESCE(a.name, '')
    ) AS x
    FROM public.plant_placements p
    JOIN public.estates e ON e.id = p.estate_id
    LEFT JOIN public.assets a ON a.id = p.asset_id
    LEFT JOIN public.zones z ON z.id = p.zone_id
    LEFT JOIN LATERAL (SELECT public.plantops_effective_care(p.id) AS c) cc ON true
    LEFT JOIN LATERAL (
      SELECT
        bool_or(tk.status IN ('pending','in_progress') AND (
          tk.title ILIKE '%problema%' OR tk.title ILIKE '%incident%' OR tk.title ILIKE '%plaga%'
          OR tk.title ILIKE '%pest%' OR tk.title ILIKE '%luz%' OR tk.title ILIKE '%light%')) AS open_incident,
        bool_or(tk.status IN ('pending','in_progress')
                AND (tk.title ILIKE '%reemplaz%' OR tk.title ILIKE '%replace%')) AS replacement_pending
      FROM public.tasks tk WHERE tk.asset_id = p.asset_id
    ) t ON true
    WHERE p.org_id = v_org
      AND p.status = 'installed'
      AND (p_estate_id IS NULL OR p.estate_id = p_estate_id)
  ) q;

  RETURN v_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_care_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_care_queue(uuid) TO authenticated;