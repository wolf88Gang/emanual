-- PILOT CLOSEOUT: org-wide tool inventory, partial returns, transactional availability,
-- visit close with tool exception incident.

ALTER TABLE public.tool_assignments
  ADD COLUMN IF NOT EXISTS quantity_returned integer NOT NULL DEFAULT 0;

UPDATE public.tool_assignments
SET quantity_returned = quantity_assigned
WHERE returned_at IS NOT NULL AND quantity_returned = 0;

ALTER TABLE public.tool_assignments
  DROP CONSTRAINT IF EXISTS tool_assignments_quantity_returned_range;
ALTER TABLE public.tool_assignments
  ADD CONSTRAINT tool_assignments_quantity_returned_range
  CHECK (quantity_returned >= 0 AND quantity_returned <= quantity_assigned);

CREATE INDEX IF NOT EXISTS tool_assignments_open_item_idx
  ON public.tool_assignments(inventory_item_id)
  WHERE quantity_returned < quantity_assigned;

CREATE OR REPLACE FUNCTION public.plantops_org_tool_inventory()
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

  SELECT COALESCE(jsonb_agg(x ORDER BY nm), '[]'::jsonb) INTO v_rows
  FROM (
    SELECT jsonb_build_object(
      'id', i.id,
      'name', COALESCE(i.name_es, i.name),
      'name_en', i.name,
      'category', i.category,
      'condition', i.condition,
      'estate_id', i.estate_id,
      'estate_name', e.name,
      'quantity', COALESCE(i.quantity, 0),
      'assigned_open', COALESCE(o.open_qty, 0),
      'available', GREATEST(COALESCE(i.quantity, 0) - COALESCE(o.open_qty, 0), 0)
    ) AS x,
    COALESCE(i.name_es, i.name) AS nm
    FROM public.inventory_items i
    JOIN public.estates e ON e.id = i.estate_id
    LEFT JOIN LATERAL (
      SELECT SUM(t.quantity_assigned - t.quantity_returned) AS open_qty
      FROM public.tool_assignments t
      WHERE t.inventory_item_id = i.id
        AND t.quantity_returned < t.quantity_assigned
    ) o ON true
    WHERE e.org_id = v_org
      AND i.category IN ('hand_tool', 'equipment')
      AND COALESCE(i.condition::text, 'good') <> 'out_of_service'
  ) q;

  RETURN v_rows;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_org_tool_inventory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_org_tool_inventory() TO authenticated, service_role;

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
  v_item_id uuid;
  v_qty integer;
  v_total integer;
  v_open integer;
  v_cat text;
  v_cond text;
  v_name text;
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
    v_item_id := (v_item->>'inventory_item_id')::uuid;
    v_qty := COALESCE((v_item->>'quantity')::integer, 0);
    IF v_qty < 1 THEN RAISE EXCEPTION 'Invalid tool quantity'; END IF;

    SELECT COALESCE(i.quantity, 0), i.category::text, COALESCE(i.condition::text, 'good'), COALESCE(i.name_es, i.name)
      INTO v_total, v_cat, v_cond, v_name
    FROM public.inventory_items i
    JOIN public.estates e ON e.id = i.estate_id
    WHERE i.id = v_item_id AND e.org_id = v_org
    FOR UPDATE OF i;

    IF v_total IS NULL THEN RAISE EXCEPTION 'Tool not found in your organization'; END IF;
    IF v_cat NOT IN ('hand_tool', 'equipment') THEN
      RAISE EXCEPTION 'Item % is not a tool', v_name;
    END IF;
    IF v_cond = 'out_of_service' THEN
      RAISE EXCEPTION 'Tool % is out of service', v_name;
    END IF;

    SELECT COALESCE(SUM(t.quantity_assigned - t.quantity_returned), 0) INTO v_open
    FROM public.tool_assignments t
    WHERE t.inventory_item_id = v_item_id AND t.quantity_returned < t.quantity_assigned;

    IF v_qty > (v_total - v_open) THEN
      RAISE EXCEPTION 'Only % of % available', GREATEST(v_total - v_open, 0), v_name;
    END IF;

    INSERT INTO public.tool_assignments (inventory_item_id, assigned_to_user_id, estate_id, quantity_assigned, shift_id)
    VALUES (v_item_id, v_user, v_estate, v_qty, p_shift_id);
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
  v_qty integer;
  v_assigned integer;
  v_returned integer;
  v_id uuid;
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
    v_id := (v_item->>'assignment_id')::uuid;
    v_cond := NULLIF(btrim(COALESCE(v_item->>'condition','')), '');
    v_qty := COALESCE((v_item->>'quantity_returned_now')::integer, 0);
    IF v_qty <= 0 THEN RAISE EXCEPTION 'Return quantity must be greater than zero'; END IF;

    SELECT t.quantity_assigned, t.quantity_returned INTO v_assigned, v_returned
    FROM public.tool_assignments t
    WHERE t.id = v_id AND t.shift_id = p_shift_id
    FOR UPDATE;

    IF v_assigned IS NULL THEN RAISE EXCEPTION 'Tool assignment not found on this visit'; END IF;
    IF v_qty > (v_assigned - v_returned) THEN
      RAISE EXCEPTION 'Return quantity exceeds the pending quantity (%)', v_assigned - v_returned;
    END IF;

    UPDATE public.tool_assignments
    SET quantity_returned = v_returned + v_qty,
        return_condition = COALESCE(v_cond::inventory_condition, return_condition),
        returned_at = CASE WHEN v_returned + v_qty >= v_assigned THEN now() ELSE returned_at END
    WHERE id = v_id;
    v_count := v_count + 1;
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
  v_user uuid;
  v_pending integer;
  v_reason text;
  v_detail text;
  v_a record;
BEGIN
  v_org := public.plantops_require_internal();
  SELECT s.estate_id, s.user_id INTO v_estate, v_user
  FROM public.worker_shifts s JOIN public.estates e ON e.id = s.estate_id
  WHERE s.id = p_shift_id AND e.org_id = v_org;
  IF v_estate IS NULL THEN RAISE EXCEPTION 'Visit not found in your organization'; END IF;

  v_reason := NULLIF(btrim(COALESCE(p_tools_exception_reason, '')), '');

  SELECT COALESCE(SUM(t.quantity_assigned - t.quantity_returned), 0) INTO v_pending
  FROM public.tool_assignments t
  WHERE t.shift_id = p_shift_id AND t.quantity_returned < t.quantity_assigned;

  IF v_pending > 0 AND v_reason IS NULL THEN
    RAISE EXCEPTION 'There are % tool units not returned. Provide an exception reason to close the visit.', v_pending;
  END IF;

  IF v_pending > 0 THEN
    FOR v_a IN
      SELECT t.id, t.quantity_assigned, t.quantity_returned, COALESCE(i.name_es, i.name) AS name
      FROM public.tool_assignments t
      JOIN public.inventory_items i ON i.id = t.inventory_item_id
      WHERE t.shift_id = p_shift_id AND t.quantity_returned < t.quantity_assigned
    LOOP
      v_detail := v_a.name || ': ' || (v_a.quantity_assigned - v_a.quantity_returned)
        || ' pendiente(s) de ' || v_a.quantity_assigned
        || ' · visita ' || p_shift_id::text
        || ' · asignación ' || v_a.id::text
        || ' · motivo: ' || v_reason;

      INSERT INTO public.tasks (estate_id, title, title_es, description, description_es,
                                status, priority, plantops_kind, due_date)
      VALUES (v_estate,
              'Tool not returned: ' || v_a.name,
              'Herramienta no devuelta: ' || v_a.name,
              v_detail, v_detail,
              'pending', 1, 'tool_exception', CURRENT_DATE);

      IF v_user IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, estate_id, type, title, title_es, body, body_es)
        VALUES (v_user, v_estate, 'tool_exception',
                'Tool not returned: ' || v_a.name,
                'Herramienta no devuelta: ' || v_a.name,
                v_detail, v_detail);
      END IF;
    END LOOP;
  END IF;

  UPDATE public.worker_shifts
  SET check_out_at = now(),
      work_description = COALESCE(p_work_description, work_description),
      notes = CASE WHEN v_reason IS NULL THEN notes
                   ELSE COALESCE(notes || E'\n', '') || 'Herramientas pendientes (' || v_pending || '): ' || v_reason END,
      updated_at = now()
  WHERE id = p_shift_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_assign_visit_tools(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_return_visit_tools(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_close_visit(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_assign_visit_tools(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_return_visit_tools(uuid, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.plantops_close_visit(uuid, text, text) TO authenticated, service_role;