ALTER TABLE public.plant_placements
  ADD COLUMN IF NOT EXISTS care_override_by uuid,
  ADD COLUMN IF NOT EXISTS care_override_at timestamptz;

-- Stamp override actor/timestamp whenever an override is set or changed.
CREATE OR REPLACE FUNCTION public.plantops_stamp_care_override()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.water_interval_override_days IS NULL THEN
    NEW.care_override_by := NULL;
    NEW.care_override_at := NULL;
  ELSIF TG_OP = 'INSERT'
     OR OLD.water_interval_override_days IS DISTINCT FROM NEW.water_interval_override_days
     OR OLD.care_override_reason IS DISTINCT FROM NEW.care_override_reason THEN
    NEW.care_override_by := COALESCE(auth.uid(), NEW.care_override_by);
    NEW.care_override_at := now();
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_plantops_stamp_care_override ON public.plant_placements;
CREATE TRIGGER trg_plantops_stamp_care_override
BEFORE INSERT OR UPDATE ON public.plant_placements
FOR EACH ROW EXECUTE FUNCTION public.plantops_stamp_care_override();

-- Care queue: expose baseline source / species baseline / review flags, no factors.
CREATE OR REPLACE FUNCTION public.plantops_care_queue(p_estate_id uuid DEFAULT NULL::uuid)
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
      'base_source', cc.c->>'base_source',
      'baseline_source', cc.c->>'baseline_source',
      'effective_source', cc.c->>'effective_source',
      'species_baseline_days', (cc.c->>'species_baseline_days')::int,
      'review_flags', cc.c->'review_flags',
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