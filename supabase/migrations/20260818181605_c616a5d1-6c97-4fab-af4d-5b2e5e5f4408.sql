-- 1. Transactional plant line ------------------------------------------------
DROP FUNCTION IF EXISTS public.plantops_save_plant_line(uuid,text,uuid,uuid,uuid,uuid,text,text,text,text,text,uuid,text,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text,boolean);

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
  p_with_pot boolean DEFAULT true,
  p_lifecycle_status text DEFAULT 'active',
  p_rental_price numeric DEFAULT NULL,
  p_currency text DEFAULT 'CRC',
  p_clear_zone boolean DEFAULT false,
  p_clear_contract boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
  v_zone uuid := p_zone_id;
  v_plant uuid := p_plant_asset_id;
  v_pot uuid := p_pot_asset_id;
  v_placement uuid := p_placement_id;
  v_status text;
  v_currency text;
  v_client uuid;
  v_contract uuid;
BEGIN
  v_org := public.plantops_require_admin();

  IF NULLIF(btrim(COALESCE(p_plant_name,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Plant name is required';
  END IF;
  SELECT client_id INTO v_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found in your organization'; END IF;

  v_currency := upper(COALESCE(NULLIF(btrim(p_currency),''), 'CRC'));
  IF v_currency NOT IN ('CRC','USD') THEN RAISE EXCEPTION 'Unsupported currency %', v_currency; END IF;
  IF COALESCE(p_lifecycle_status,'active') NOT IN ('active','recovery','retired') THEN
    RAISE EXCEPTION 'Invalid lifecycle status %', p_lifecycle_status;
  END IF;
  IF p_pot_material IS NOT NULL AND p_pot_material NOT IN ('ceramica','plastico','barro','fibra','metal','vidrio','otro') THEN
    RAISE EXCEPTION 'Invalid pot material %', p_pot_material;
  END IF;

  -- Contract: explicit clear vs explicit set vs preserve
  IF p_clear_contract THEN
    v_contract := NULL;
  ELSIF p_contract_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.rental_contracts c
      WHERE c.id = p_contract_id AND c.org_id = v_org AND c.estate_id = p_estate_id
        AND c.client_id IS NOT DISTINCT FROM v_client
        AND c.status IN ('draft','active')
    ) THEN
      RAISE EXCEPTION 'Contract is not a draft/active contract of this client and property';
    END IF;
    v_contract := p_contract_id;
  END IF;

  -- Zone / floor
  IF p_clear_zone THEN
    v_zone := NULL;
  ELSIF v_zone IS NOT NULL THEN
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

  -- Plant asset
  IF v_plant IS NOT NULL THEN
    UPDATE public.assets a
    SET name = btrim(p_plant_name),
        description = NULLIF(btrim(p_plant_notes),''),
        zone_id = v_zone,
        updated_at = now()
    WHERE a.id = v_plant AND a.asset_type = 'plant'
      AND a.estate_id IN (SELECT id FROM public.estates WHERE org_id = v_org);
    IF NOT FOUND THEN RAISE EXCEPTION 'Plant asset not found in your organization'; END IF;
  ELSE
    INSERT INTO public.assets (estate_id, zone_id, asset_type, name, description)
    VALUES (p_estate_id, v_zone, 'plant', btrim(p_plant_name), NULLIF(btrim(p_plant_notes),''))
    RETURNING id INTO v_plant;
  END IF;

  INSERT INTO public.plantops_asset_details (asset_id, org_id, lifecycle_status, rental_price, currency)
  VALUES (v_plant, v_org, COALESCE(p_lifecycle_status,'active'), p_rental_price, v_currency)
  ON CONFLICT (asset_id) DO UPDATE SET
    lifecycle_status = EXCLUDED.lifecycle_status,
    rental_price = EXCLUDED.rental_price,
    currency = EXCLUDED.currency,
    updated_at = now();

  -- Pot asset
  IF p_with_pot THEN
    IF v_pot IS NOT NULL THEN
      UPDATE public.assets a
      SET name = 'Maceta — ' || btrim(p_plant_name), zone_id = v_zone, updated_at = now()
      WHERE a.id = v_pot AND a.asset_type = 'pot'
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
  ELSE
    -- pot detached from the placement but kept as active inventory
    v_pot := NULL;
  END IF;

  -- Placement
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
        contract_id = v_contract,
        updated_at = now()
    WHERE id = v_placement;
  ELSE
    v_placement := public.plantops_reserve_asset(
      v_plant, v_pot, p_estate_id, v_zone, v_contract,
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

REVOKE ALL ON FUNCTION public.plantops_save_plant_line(uuid,text,uuid,uuid,uuid,uuid,text,text,text,text,text,uuid,text,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text,boolean,text,numeric,text,boolean,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_save_plant_line(uuid,text,uuid,uuid,uuid,uuid,text,text,text,text,text,uuid,text,text,numeric,numeric,numeric,boolean,integer,boolean,boolean,text,boolean,text,numeric,text,boolean,boolean) TO authenticated;

-- 3. Transactional share-link rotation ---------------------------------------
CREATE OR REPLACE FUNCTION public.plantops_rotate_share_link(p_link_id uuid, p_token_hash text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org uuid; v_prev record; v_id uuid;
BEGIN
  v_org := public.plantops_require_admin();
  IF length(COALESCE(p_token_hash,'')) < 32 THEN RAISE EXCEPTION 'Invalid token hash'; END IF;

  SELECT * INTO v_prev FROM public.estate_share_links
  WHERE id = p_link_id AND org_id = v_org AND revoked_at IS NULL FOR UPDATE;
  IF v_prev.id IS NULL THEN RAISE EXCEPTION 'Share link not found or already revoked'; END IF;

  INSERT INTO public.estate_share_links (
    org_id, client_id, estate_id, token_hash, show_plants, show_manual,
    show_last_visit, show_history, show_balance, contact_note, expires_at, created_by,
    manual_snapshot_json, manual_approved_at, manual_approved_by
  ) VALUES (
    v_prev.org_id, v_prev.client_id, v_prev.estate_id, p_token_hash,
    v_prev.show_plants, v_prev.show_manual, v_prev.show_last_visit,
    v_prev.show_history, v_prev.show_balance, v_prev.contact_note, v_prev.expires_at,
    auth.uid(), v_prev.manual_snapshot_json, v_prev.manual_approved_at, v_prev.manual_approved_by
  ) RETURNING id INTO v_id;

  UPDATE public.estate_share_links SET revoked_at = now(), updated_at = now() WHERE id = v_prev.id;
  RETURN v_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_rotate_share_link(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_rotate_share_link(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.plantops_update_share_link(
  p_link_id uuid,
  p_show_plants boolean DEFAULT NULL,
  p_show_manual boolean DEFAULT NULL,
  p_show_last_visit boolean DEFAULT NULL,
  p_show_history boolean DEFAULT NULL,
  p_show_balance boolean DEFAULT NULL,
  p_contact_note text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_clear_expiry boolean DEFAULT false,
  p_clear_contact_note boolean DEFAULT false
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
      contact_note = CASE WHEN p_clear_contact_note THEN NULL
                          ELSE COALESCE(NULLIF(btrim(p_contact_note), ''), contact_note) END,
      expires_at = CASE WHEN p_clear_expiry THEN NULL ELSE COALESCE(p_expires_at, expires_at) END,
      updated_at = now()
  WHERE id = p_link_id AND org_id = v_org AND revoked_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Share link not found or already revoked'; END IF;
END;
$function$;

-- 4. Hardened charges --------------------------------------------------------
DROP FUNCTION IF EXISTS public.plantops_add_charge(uuid,text,numeric,numeric,uuid,uuid,text);
DROP FUNCTION IF EXISTS public.plantops_add_charge(uuid,text,numeric,numeric,uuid,uuid,text,uuid);

CREATE OR REPLACE FUNCTION public.plantops_add_charge(
  p_client_id uuid,
  p_estate_id uuid,
  p_shift_id uuid,
  p_description text,
  p_quantity numeric,
  p_unit_price numeric,
  p_product_id uuid DEFAULT NULL,
  p_currency text DEFAULT 'CRC'
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_invoice uuid; v_number text; v_currency text;
  v_is_admin boolean;
  v_shift record;
  v_estate_client uuid;
BEGIN
  v_org := public.plantops_require_internal();
  v_is_admin := public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager');
  v_currency := upper(COALESCE(NULLIF(btrim(p_currency), ''), 'CRC'));
  IF v_currency NOT IN ('CRC','USD') THEN RAISE EXCEPTION 'Unsupported currency %', v_currency; END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 OR p_unit_price IS NULL OR p_unit_price < 0 THEN
    RAISE EXCEPTION 'Invalid quantity or price';
  END IF;
  IF NULLIF(btrim(COALESCE(p_description,'')),'') IS NULL THEN
    RAISE EXCEPTION 'Description is required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Client not found in your organization';
  END IF;
  IF p_estate_id IS NOT NULL THEN
    SELECT client_id INTO v_estate_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
    IF NOT FOUND THEN RAISE EXCEPTION 'Property not found in your organization'; END IF;
    IF v_estate_client IS DISTINCT FROM p_client_id THEN
      RAISE EXCEPTION 'That property does not belong to this client';
    END IF;
  END IF;

  IF NOT v_is_admin THEN
    IF p_shift_id IS NULL THEN RAISE EXCEPTION 'A shift is required to add charges'; END IF;
    IF p_estate_id IS NULL THEN RAISE EXCEPTION 'A property is required to add charges'; END IF;
    SELECT s.* INTO v_shift FROM public.worker_shifts s
    JOIN public.estates e ON e.id = s.estate_id AND e.org_id = v_org
    WHERE s.id = p_shift_id;
    IF v_shift.id IS NULL THEN RAISE EXCEPTION 'Shift not found in your organization'; END IF;
    IF v_shift.user_id <> auth.uid() THEN RAISE EXCEPTION 'You can only charge from your own shift'; END IF;
    IF v_shift.check_out_at IS NOT NULL THEN RAISE EXCEPTION 'That shift is already closed'; END IF;
    IF v_shift.estate_id <> p_estate_id THEN RAISE EXCEPTION 'Shift belongs to a different property'; END IF;
  ELSIF p_shift_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.worker_shifts s JOIN public.estates e ON e.id = s.estate_id
      WHERE s.id = p_shift_id AND e.org_id = v_org
    ) THEN RAISE EXCEPTION 'Shift not found in your organization'; END IF;
  END IF;

  SELECT id INTO v_invoice FROM public.invoices
  WHERE org_id = v_org AND client_id = p_client_id AND status = 'draft' AND currency = v_currency
  ORDER BY created_at DESC LIMIT 1;

  IF v_invoice IS NULL THEN
    v_number := 'DRAFT-' || v_currency || '-' || to_char(now(), 'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);
    INSERT INTO public.invoices (org_id, client_id, invoice_number, status, issue_date, subtotal, total, currency)
    VALUES (v_org, p_client_id, v_number, 'draft', CURRENT_DATE, 0, 0, v_currency)
    RETURNING id INTO v_invoice;
  END IF;

  INSERT INTO public.invoice_items (invoice_id, product_id, description, quantity, unit_price, total, source_shift_id, source_estate_id, created_at)
  VALUES (v_invoice, p_product_id, btrim(p_description), p_quantity, p_unit_price, p_quantity * p_unit_price, p_shift_id, p_estate_id, now());

  UPDATE public.invoices i
  SET subtotal = s.sum_total,
      total = ROUND(s.sum_total * (1 + COALESCE(i.tax_percent, 0) / 100.0), 2),
      updated_at = now()
  FROM (SELECT COALESCE(SUM(total), 0) AS sum_total FROM public.invoice_items WHERE invoice_id = v_invoice) s
  WHERE i.id = v_invoice;

  RETURN v_invoice;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_add_charge(uuid,uuid,uuid,text,numeric,numeric,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_add_charge(uuid,uuid,uuid,text,numeric,numeric,uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.plantops_add_charge_for_estate(
  p_estate_id uuid, p_description text, p_quantity numeric, p_unit_price numeric,
  p_product_id uuid DEFAULT NULL, p_shift_id uuid DEFAULT NULL, p_currency text DEFAULT 'CRC'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org uuid; v_client uuid; v_invoice uuid;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT client_id INTO v_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found in your organization'; END IF;
  IF v_client IS NULL THEN RAISE EXCEPTION 'This property has no client assigned'; END IF;

  v_invoice := public.plantops_add_charge(v_client, p_estate_id, p_shift_id, p_description, p_quantity, p_unit_price, p_product_id, p_currency);
  RETURN jsonb_build_object('invoice_id', v_invoice, 'client_id', v_client);
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_add_charge_for_estate(uuid,text,numeric,numeric,uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_add_charge_for_estate(uuid,text,numeric,numeric,uuid,uuid,text) TO authenticated;

-- 5. Hardened care logs ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.plantops_log_care(
  p_placement_id uuid, p_action_type text, p_notes text DEFAULT NULL,
  p_amount_note text DEFAULT NULL, p_photo_path text DEFAULT NULL,
  p_shift_id uuid DEFAULT NULL, p_override_reason text DEFAULT NULL,
  p_performed_at timestamptz DEFAULT now()
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid; v_p record; v_interval integer; v_next date; v_log_id uuid;
  v_is_admin boolean; v_shift record;
BEGIN
  v_org := public.plantops_require_internal();
  v_is_admin := public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager');

  SELECT * INTO v_p FROM public.plant_placements WHERE id = p_placement_id AND org_id = v_org;
  IF v_p.id IS NULL THEN RAISE EXCEPTION 'Placement not found in your organization'; END IF;

  IF p_shift_id IS NOT NULL THEN
    SELECT s.* INTO v_shift FROM public.worker_shifts s
    JOIN public.estates e ON e.id = s.estate_id AND e.org_id = v_org
    WHERE s.id = p_shift_id;
    IF v_shift.id IS NULL THEN RAISE EXCEPTION 'Shift not found in your organization'; END IF;
    IF v_shift.check_out_at IS NOT NULL THEN RAISE EXCEPTION 'That shift is already closed'; END IF;
    IF v_shift.estate_id <> v_p.estate_id THEN RAISE EXCEPTION 'Shift belongs to a different property'; END IF;
    IF NOT v_is_admin AND v_shift.user_id <> auth.uid() THEN
      RAISE EXCEPTION 'You can only log care from your own shift';
    END IF;
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
    SET last_watered_at = p_performed_at, next_water_due = v_next, updated_at = now()
    WHERE id = p_placement_id AND org_id = v_org;
  END IF;

  RETURN jsonb_build_object('log_id', v_log_id, 'care', public.plantops_effective_care(p_placement_id));
END;
$function$;

-- 6. Billing grouped by currency --------------------------------------------
CREATE OR REPLACE FUNCTION public.plantops_property_billing(p_estate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_org uuid; v_client uuid; v_out jsonb;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT client_id INTO v_client FROM public.estates WHERE id = p_estate_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Property not found in your organization'; END IF;
  IF v_client IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'currency'), '[]'::jsonb) INTO v_out
  FROM (
    SELECT jsonb_build_object(
      'currency', i.currency,
      'invoiced', SUM(CASE WHEN i.status <> 'draft' THEN i.total ELSE 0 END),
      'draft', SUM(CASE WHEN i.status = 'draft' THEN i.total ELSE 0 END),
      'paid', SUM(COALESCE(pay.paid, 0)),
      'pending', SUM(CASE WHEN i.status IN ('sent','overdue') THEN GREATEST(i.total - COALESCE(pay.paid,0), 0) ELSE 0 END),
      'overdue', SUM(CASE WHEN i.status = 'overdue' OR (i.status = 'sent' AND i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE)
                          THEN GREATEST(i.total - COALESCE(pay.paid,0), 0) ELSE 0 END)
    ) AS x
    FROM public.invoices i
    LEFT JOIN LATERAL (
      SELECT SUM(cp.amount) AS paid FROM public.client_payments cp WHERE cp.invoice_id = i.id
    ) pay ON true
    WHERE i.org_id = v_org AND i.client_id = v_client AND i.status <> 'cancelled'
    GROUP BY i.currency
  ) q;

  RETURN v_out;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_property_billing(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_property_billing(uuid) TO authenticated;