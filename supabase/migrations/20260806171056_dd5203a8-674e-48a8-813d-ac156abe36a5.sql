-- ===== internal helper: role guard =====
CREATE OR REPLACE FUNCTION public.plantops_require_internal()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'crew')) THEN
    RAISE EXCEPTION 'Insufficient role';
  END IF;
  v_org := public.get_user_org_id(auth.uid());
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No organization';
  END IF;
  RETURN v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_require_internal() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_require_internal() TO authenticated, service_role;

-- ===== internal helper: validate a plant/pot asset belongs to org and is usable =====
CREATE OR REPLACE FUNCTION public.plantops_validate_asset(_asset_id uuid, _org_id uuid, _expected_type public.asset_type)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_type public.asset_type;
  v_lifecycle text;
BEGIN
  SELECT a.asset_type INTO v_type
  FROM public.assets a
  JOIN public.estates e ON e.id = a.estate_id
  WHERE a.id = _asset_id AND e.org_id = _org_id;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Asset % not found in your organization', _asset_id;
  END IF;
  IF v_type <> _expected_type THEN
    RAISE EXCEPTION 'Asset % must be of type %', _asset_id, _expected_type;
  END IF;

  SELECT d.lifecycle_status INTO v_lifecycle
  FROM public.plantops_asset_details d
  WHERE d.asset_id = _asset_id AND d.org_id = _org_id;

  IF v_lifecycle IS NULL THEN
    RAISE EXCEPTION 'Asset % has no PlantOps details; register it first', _asset_id;
  END IF;
  IF v_lifecycle <> 'active' THEN
    RAISE EXCEPTION 'Asset % is % and cannot be placed', _asset_id, v_lifecycle;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_validate_asset(uuid, uuid, public.asset_type) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_validate_asset(uuid, uuid, public.asset_type) TO authenticated, service_role;

-- ===== 1. reserve =====
CREATE OR REPLACE FUNCTION public.plantops_reserve_asset(
  p_asset_id uuid,
  p_pot_asset_id uuid,
  p_estate_id uuid,
  p_zone_id uuid,
  p_contract_id uuid,
  p_spot_label text,
  p_reserved_from timestamptz,
  p_reserved_until timestamptz,
  p_placement_slot_id uuid DEFAULT NULL,
  p_spot_notes text DEFAULT NULL,
  p_access_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_estate_client uuid;
  v_contract RECORD;
  v_id uuid;
BEGIN
  v_org := public.plantops_require_internal();

  IF p_asset_id IS NULL OR p_estate_id IS NULL OR p_reserved_from IS NULL THEN
    RAISE EXCEPTION 'asset, estate and start date are required';
  END IF;
  IF p_pot_asset_id IS NOT NULL AND p_pot_asset_id = p_asset_id THEN
    RAISE EXCEPTION 'Plant and pot must be different assets';
  END IF;
  IF p_reserved_until IS NOT NULL AND p_reserved_until <= p_reserved_from THEN
    RAISE EXCEPTION 'End date must be after start date';
  END IF;

  PERFORM public.plantops_validate_asset(p_asset_id, v_org, 'plant'::public.asset_type);
  IF p_pot_asset_id IS NOT NULL THEN
    PERFORM public.plantops_validate_asset(p_pot_asset_id, v_org, 'pot'::public.asset_type);
  END IF;

  SELECT e.client_id INTO v_estate_client
  FROM public.estates e WHERE e.id = p_estate_id AND e.org_id = v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Estate not found in your organization';
  END IF;

  IF p_zone_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.zones z WHERE z.id = p_zone_id AND z.estate_id = p_estate_id
  ) THEN
    RAISE EXCEPTION 'Zone does not belong to that estate';
  END IF;

  IF p_contract_id IS NOT NULL THEN
    SELECT * INTO v_contract FROM public.rental_contracts c
    WHERE c.id = p_contract_id AND c.org_id = v_org;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Contract not found in your organization';
    END IF;
    IF v_contract.status NOT IN ('draft','active') THEN
      RAISE EXCEPTION 'Contract is not draft or active';
    END IF;
    IF v_contract.estate_id IS NOT NULL AND v_contract.estate_id <> p_estate_id THEN
      RAISE EXCEPTION 'Contract belongs to a different estate';
    END IF;
    IF v_estate_client IS NOT NULL AND v_contract.client_id <> v_estate_client THEN
      RAISE EXCEPTION 'Contract client does not match estate client';
    END IF;
  END IF;

  INSERT INTO public.plant_placements (
    org_id, placement_slot_id, asset_id, pot_asset_id, estate_id, zone_id, contract_id,
    spot_label, spot_notes, access_notes, status, reserved_from, reserved_until
  ) VALUES (
    v_org, COALESCE(p_placement_slot_id, gen_random_uuid()), p_asset_id, p_pot_asset_id,
    p_estate_id, p_zone_id, p_contract_id, p_spot_label, p_spot_notes, p_access_notes,
    'reserved', p_reserved_from, p_reserved_until
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_reserve_asset(uuid,uuid,uuid,uuid,uuid,text,timestamptz,timestamptz,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_reserve_asset(uuid,uuid,uuid,uuid,uuid,text,timestamptz,timestamptz,uuid,text,text) TO authenticated;

-- ===== 2. install =====
CREATE OR REPLACE FUNCTION public.plantops_install_asset(
  p_placement_id uuid,
  p_installed_at timestamptz DEFAULT now(),
  p_reference_photo_path text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_p RECORD;
BEGIN
  v_org := public.plantops_require_internal();

  SELECT * INTO v_p FROM public.plant_placements
  WHERE id = p_placement_id AND org_id = v_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;
  IF v_p.status <> 'reserved' THEN
    RAISE EXCEPTION 'Only reserved placements can be installed (current: %)', v_p.status;
  END IF;

  UPDATE public.plant_placements
  SET status = 'installed',
      installed_at = GREATEST(COALESCE(p_installed_at, now()), v_p.reserved_from),
      reference_photo_path = COALESCE(p_reference_photo_path, reference_photo_path)
  WHERE id = p_placement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_install_asset(uuid,timestamptz,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_install_asset(uuid,timestamptz,text) TO authenticated;

-- ===== 3. collect =====
CREATE OR REPLACE FUNCTION public.plantops_collect_asset(
  p_placement_id uuid,
  p_condition_rating smallint DEFAULT NULL,
  p_next_lifecycle text DEFAULT 'active',
  p_retired_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_p RECORD;
  v_now timestamptz := now();
BEGIN
  v_org := public.plantops_require_internal();

  IF p_next_lifecycle NOT IN ('active','recovery','retired') THEN
    RAISE EXCEPTION 'Invalid lifecycle target %', p_next_lifecycle;
  END IF;
  IF p_condition_rating IS NOT NULL AND (p_condition_rating < 1 OR p_condition_rating > 5) THEN
    RAISE EXCEPTION 'Condition must be between 1 and 5';
  END IF;

  SELECT * INTO v_p FROM public.plant_placements
  WHERE id = p_placement_id AND org_id = v_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;
  IF v_p.status <> 'installed' OR v_p.collected_at IS NOT NULL THEN
    RAISE EXCEPTION 'Only active installations can be collected';
  END IF;

  UPDATE public.plant_placements
  SET status = 'collected',
      collected_at = GREATEST(v_now, v_p.installed_at),
      condition_at_collection = p_condition_rating
  WHERE id = p_placement_id;

  UPDATE public.plantops_asset_details
  SET lifecycle_status = p_next_lifecycle,
      condition_rating = COALESCE(p_condition_rating, condition_rating),
      retired_reason = CASE WHEN p_next_lifecycle = 'retired' THEN COALESCE(p_retired_reason, retired_reason) ELSE retired_reason END
  WHERE asset_id = v_p.asset_id AND org_id = v_org;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_collect_asset(uuid,smallint,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_collect_asset(uuid,smallint,text,text) TO authenticated;

-- ===== 4. cancel =====
CREATE OR REPLACE FUNCTION public.plantops_cancel_reservation(
  p_placement_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_p RECORD;
BEGIN
  v_org := public.plantops_require_internal();

  SELECT * INTO v_p FROM public.plant_placements
  WHERE id = p_placement_id AND org_id = v_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;
  IF v_p.status <> 'reserved' THEN
    RAISE EXCEPTION 'Only reserved placements can be cancelled';
  END IF;

  UPDATE public.plant_placements
  SET status = 'cancelled',
      cancelled_at = now(),
      spot_notes = CASE WHEN p_reason IS NULL THEN spot_notes
                        ELSE COALESCE(spot_notes || ' | ', '') || 'Cancelled: ' || p_reason END
  WHERE id = p_placement_id;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_cancel_reservation(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_cancel_reservation(uuid,text) TO authenticated;

-- ===== 5. replace =====
CREATE OR REPLACE FUNCTION public.plantops_replace_plant(
  p_placement_id uuid,
  p_replacement_asset_id uuid,
  p_cause text DEFAULT NULL,
  p_retired_lifecycle text DEFAULT 'recovery',
  p_condition_rating smallint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_p RECORD;
  v_now timestamptz := now();
  v_collected timestamptz;
  v_new_id uuid;
  v_task_id uuid;
  v_estate_name text;
BEGIN
  v_org := public.plantops_require_internal();

  IF p_retired_lifecycle NOT IN ('recovery','retired') THEN
    RAISE EXCEPTION 'Retired lifecycle must be recovery or retired';
  END IF;

  SELECT * INTO v_p FROM public.plant_placements
  WHERE id = p_placement_id AND org_id = v_org FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;
  IF v_p.status <> 'installed' OR v_p.collected_at IS NOT NULL THEN
    RAISE EXCEPTION 'Only active installations can be replaced';
  END IF;
  IF p_replacement_asset_id = v_p.asset_id THEN
    RAISE EXCEPTION 'Replacement must be a different plant';
  END IF;

  PERFORM public.plantops_validate_asset(p_replacement_asset_id, v_org, 'plant'::public.asset_type);

  v_collected := GREATEST(v_now, v_p.installed_at);

  -- close previous installation
  UPDATE public.plant_placements
  SET status = 'collected',
      collected_at = v_collected,
      condition_at_collection = p_condition_rating
  WHERE id = p_placement_id;

  -- mark retired plant
  UPDATE public.plantops_asset_details
  SET lifecycle_status = p_retired_lifecycle,
      condition_rating = COALESCE(p_condition_rating, condition_rating),
      retired_reason = COALESCE(p_cause, retired_reason)
  WHERE asset_id = v_p.asset_id AND org_id = v_org;

  -- install replacement on the same slot, keeping the pot
  INSERT INTO public.plant_placements (
    org_id, placement_slot_id, asset_id, pot_asset_id, estate_id, zone_id, contract_id,
    spot_label, spot_notes, access_notes, reference_photo_path,
    status, reserved_from, reserved_until, installed_at
  ) VALUES (
    v_org, v_p.placement_slot_id, p_replacement_asset_id, v_p.pot_asset_id, v_p.estate_id,
    v_p.zone_id, v_p.contract_id, v_p.spot_label, v_p.spot_notes, v_p.access_notes,
    v_p.reference_photo_path, 'installed', v_collected, v_p.reserved_until, v_collected
  ) RETURNING id INTO v_new_id;

  -- incident task, already resolved
  INSERT INTO public.tasks (
    estate_id, zone_id, asset_id, title, title_es, description, description_es,
    frequency, due_date, status, priority, plantops_kind, placement_id, replacement_asset_id
  ) VALUES (
    v_p.estate_id, v_p.zone_id, v_p.asset_id,
    'Plant replacement completed',
    'Reemplazo de planta completado',
    COALESCE('Cause: ' || p_cause, 'Plant replaced at its placement point.'),
    COALESCE('Causa: ' || p_cause, 'Planta reemplazada en su punto de colocación.'),
    'once', CURRENT_DATE, 'completed', 1, 'incident', v_new_id, p_replacement_asset_id
  ) RETURNING id INTO v_task_id;

  INSERT INTO public.task_completions (task_id, completed_by_user_id, completed_at, notes)
  VALUES (v_task_id, auth.uid(), v_collected, COALESCE(p_cause, 'Replacement executed'));

  RETURN v_new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_replace_plant(uuid,uuid,text,text,smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_replace_plant(uuid,uuid,text,text,smallint) TO authenticated;

-- ===== 6. availability =====
CREATE OR REPLACE FUNCTION public.plantops_check_availability(
  p_asset_id uuid,
  p_pot_asset_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_range tstzrange;
BEGIN
  v_org := public.plantops_require_internal();
  v_range := tstzrange(p_from, COALESCE(p_to, 'infinity'::timestamptz), '[)');

  IF NOT EXISTS (
    SELECT 1 FROM public.plantops_asset_details d
    WHERE d.asset_id = p_asset_id AND d.org_id = v_org AND d.lifecycle_status = 'active'
  ) THEN
    RETURN false;
  END IF;

  IF p_pot_asset_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.plantops_asset_details d
    WHERE d.asset_id = p_pot_asset_id AND d.org_id = v_org AND d.lifecycle_status = 'active'
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.plant_placements pp
    WHERE pp.org_id = v_org
      AND pp.status IN ('reserved','installed')
      AND (pp.asset_id = p_asset_id
           OR (p_pot_asset_id IS NOT NULL AND (pp.asset_id = p_pot_asset_id OR pp.pot_asset_id = p_pot_asset_id))
           OR pp.pot_asset_id = p_asset_id)
      AND tstzrange(pp.reserved_from, COALESCE(pp.collected_at, pp.reserved_until, 'infinity'::timestamptz), '[)') && v_range
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_check_availability(uuid,uuid,timestamptz,timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_check_availability(uuid,uuid,timestamptz,timestamptz) TO authenticated;

-- ===== 7. current location =====
CREATE OR REPLACE FUNCTION public.plantops_get_current_location(p_asset_id uuid)
RETURNS TABLE (
  placement_id uuid,
  placement_slot_id uuid,
  estate_id uuid,
  estate_name text,
  zone_id uuid,
  zone_name text,
  floor_label text,
  spot_label text,
  installed_at timestamptz,
  client_id uuid,
  client_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pp.id, pp.placement_slot_id, pp.estate_id, e.name, pp.zone_id, z.name, z.floor_label,
         pp.spot_label, pp.installed_at, c.id, c.name
  FROM public.plant_placements pp
  JOIN public.estates e ON e.id = pp.estate_id
  LEFT JOIN public.zones z ON z.id = pp.zone_id
  LEFT JOIN public.clients c ON c.id = e.client_id
  WHERE pp.asset_id = p_asset_id
    AND pp.org_id = public.plantops_require_internal()
    AND pp.status = 'installed'
    AND pp.collected_at IS NULL
  LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.plantops_get_current_location(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_get_current_location(uuid) TO authenticated;

-- ===== 8. client portal: placements =====
CREATE OR REPLACE FUNCTION public.get_client_plant_placements(p_estate_id uuid)
RETURNS TABLE (
  placement_id uuid,
  asset_id uuid,
  asset_name text,
  zone_name text,
  floor_label text,
  spot_label text,
  installed_at timestamptz,
  reference_photo_path text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.client_access ca
    WHERE ca.client_user_id = auth.uid() AND ca.estate_id = p_estate_id AND ca.can_view_assets
  ) THEN
    RAISE EXCEPTION 'Not authorized for this estate';
  END IF;

  RETURN QUERY
  SELECT pp.id, pp.asset_id, a.name, z.name, z.floor_label, pp.spot_label, pp.installed_at,
         pp.reference_photo_path
  FROM public.plant_placements pp
  JOIN public.assets a ON a.id = pp.asset_id
  LEFT JOIN public.zones z ON z.id = pp.zone_id
  WHERE pp.estate_id = p_estate_id
    AND pp.status = 'installed'
    AND pp.collected_at IS NULL
  ORDER BY z.name NULLS LAST, pp.spot_label NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_plant_placements(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_plant_placements(uuid) TO authenticated;

-- ===== 9. client portal: contracts =====
CREATE OR REPLACE FUNCTION public.get_client_rental_contracts(p_estate_id uuid)
RETURNS TABLE (
  contract_id uuid,
  contract_type text,
  status text,
  starts_on date,
  ends_on date,
  maintenance_frequency public.task_frequency,
  replacement_rules text,
  client_dos_donts text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.client_access ca
    WHERE ca.client_user_id = auth.uid() AND ca.estate_id = p_estate_id AND ca.can_view_documents
  ) THEN
    RAISE EXCEPTION 'Not authorized for this estate';
  END IF;

  RETURN QUERY
  SELECT c.id, c.contract_type, c.status, c.starts_on, c.ends_on, c.maintenance_frequency,
         c.replacement_rules, c.client_dos_donts
  FROM public.rental_contracts c
  WHERE c.estate_id = p_estate_id
  ORDER BY c.starts_on DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_rental_contracts(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_rental_contracts(uuid) TO authenticated;

-- ===== 10. client portal: maintenance history =====
CREATE OR REPLACE FUNCTION public.get_client_maintenance_history(p_estate_id uuid)
RETURNS TABLE (
  task_id uuid,
  title text,
  title_es text,
  plantops_kind text,
  status public.task_status,
  due_date date,
  completed_at timestamptz,
  photo_url text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_photos boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT ca.can_view_photos INTO v_photos
  FROM public.client_access ca
  WHERE ca.client_user_id = auth.uid() AND ca.estate_id = p_estate_id AND ca.can_view_tasks;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Not authorized for this estate';
  END IF;

  RETURN QUERY
  SELECT t.id, t.title, t.title_es, t.plantops_kind, t.status, t.due_date,
         tc.completed_at,
         CASE WHEN v_photos THEN tc.photo_url ELSE NULL END
  FROM public.tasks t
  LEFT JOIN public.task_completions tc ON tc.task_id = t.id
  WHERE t.estate_id = p_estate_id
    AND t.plantops_kind IS NOT NULL
  ORDER BY COALESCE(tc.completed_at, t.due_date::timestamptz) DESC
  LIMIT 200;
END;
$$;

REVOKE ALL ON FUNCTION public.get_client_maintenance_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_client_maintenance_history(uuid) TO authenticated;