
CREATE TYPE public.visual_brief_status AS ENUM ('draft','client_submitted','professional_review','needs_clarification','professionally_validated','scope_agreed','result_submitted','client_approved','adjustment_requested');
CREATE TYPE public.visual_assessment AS ENUM ('viable','partial','not_recommended','inspect_first');
CREATE TYPE public.visual_agreement AS ENUM ('exact','approximate','modified');
CREATE TYPE public.visual_match AS ENUM ('yes','partial','no');
CREATE TYPE public.visual_review_action AS ENUM ('approve','request_adjustment');
CREATE TYPE public.visual_asset_kind AS ENUM ('before','target_reference','agreed_target','after');
CREATE TYPE public.visual_asset_source AS ENUM ('camera','upload','plant_history','completion');

CREATE TABLE public.service_types (
  key text PRIMARY KEY,
  label_es text NOT NULL, label_en text NOT NULL, label_de text NOT NULL,
  requires_after_photo boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  sort int NOT NULL DEFAULT 100
);
GRANT SELECT ON public.service_types TO authenticated;
GRANT ALL ON public.service_types TO service_role;
ALTER TABLE public.service_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in users read service types" ON public.service_types FOR SELECT TO authenticated USING (true);
INSERT INTO public.service_types(key,label_es,label_en,label_de,sort) VALUES
 ('pruning','Poda','Pruning','Rückschnitt',10),
 ('shaping','Formación','Shaping','Formschnitt',20),
 ('crown_reduction','Reducción de copa','Crown reduction','Kronenreduktion',30),
 ('cleanup','Limpieza estética','Aesthetic cleanup','Pflegeschnitt',40),
 ('ornamental_maintenance','Mantenimiento ornamental','Ornamental maintenance','Zierpflege',50),
 ('transplant','Trasplante','Transplant','Umpflanzen',60),
 ('rearrangement','Reorganización visual','Visual rearrangement','Neuanordnung',70),
 ('installation','Instalación o montaje','Installation','Installation',80),
 ('arrangement','Arreglo o decoración vegetal','Plant arrangement','Pflanzenarrangement',90),
 ('visual_recovery','Recuperación visual','Visual recovery','Optische Erholung',100);

CREATE TABLE public.service_visual_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL UNIQUE REFERENCES public.tasks(id) ON DELETE RESTRICT,
  service_type text NOT NULL REFERENCES public.service_types(key) ON DELETE RESTRICT,
  status public.visual_brief_status NOT NULL DEFAULT 'draft',
  client_description text,
  requested_by uuid NOT NULL,
  professional_assessment public.visual_assessment,
  professional_notes text, assessed_by uuid, assessed_at timestamptz,
  proposed_agreement public.visual_agreement,
  proposed_scope text, proposed_by uuid, proposed_at timestamptz,
  agreed_scope text, agreed_by uuid, agreed_at timestamptz,
  client_match public.visual_match,
  client_action public.visual_review_action,
  client_feedback text, reviewed_by uuid, reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vsb_status ON public.service_visual_briefs(status);
CREATE TRIGGER trg_vsb_updated BEFORE UPDATE ON public.service_visual_briefs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.service_visual_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.service_visual_briefs(id) ON DELETE RESTRICT,
  kind public.visual_asset_kind NOT NULL,
  bucket text NOT NULL,
  storage_path text NOT NULL,
  source public.visual_asset_source NOT NULL,
  source_ref_id uuid,
  width int, height int, mime text, bytes int,
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  frozen_at timestamptz,
  removed_at timestamptz
);
CREATE INDEX idx_vsa_brief_kind ON public.service_visual_assets(brief_id, kind);
CREATE INDEX idx_vsa_object ON public.service_visual_assets(bucket, storage_path);

CREATE TABLE public.visual_annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visual_asset_id uuid NOT NULL REFERENCES public.service_visual_assets(id) ON DELETE RESTRICT,
  annotation_type text NOT NULL DEFAULT 'pin' CHECK (annotation_type = 'pin'),
  x numeric NOT NULL CHECK (x >= 0 AND x <= 1),
  y numeric NOT NULL CHECK (y >= 0 AND y <= 1),
  label text, note text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_va_asset ON public.visual_annotations(visual_asset_id);

CREATE TABLE public.service_visual_brief_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brief_id uuid NOT NULL REFERENCES public.service_visual_briefs(id) ON DELETE RESTRICT,
  actor_user_id uuid,
  event_type text NOT NULL,
  from_status public.visual_brief_status,
  to_status public.visual_brief_status,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vsbe_brief ON public.service_visual_brief_events(brief_id, created_at);

GRANT SELECT ON public.service_visual_briefs, public.service_visual_assets, public.visual_annotations, public.service_visual_brief_events TO authenticated;
GRANT ALL ON public.service_visual_briefs, public.service_visual_assets, public.visual_annotations, public.service_visual_brief_events TO service_role;
ALTER TABLE public.service_visual_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visual_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visual_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_visual_brief_events ENABLE ROW LEVEL SECURITY;

-- Immutability guards
CREATE OR REPLACE FUNCTION public.vsb_block_mutation() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN RAISE EXCEPTION 'append-only record'; END; $$;
CREATE TRIGGER trg_vsbe_no_update BEFORE UPDATE OR DELETE ON public.service_visual_brief_events FOR EACH ROW EXECUTE FUNCTION public.vsb_block_mutation();
CREATE TRIGGER trg_va_no_update BEFORE UPDATE OR DELETE ON public.visual_annotations FOR EACH ROW EXECUTE FUNCTION public.vsb_block_mutation();

CREATE OR REPLACE FUNCTION public.vsa_guard() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'visual assets cannot be deleted'; END IF;
  IF OLD.frozen_at IS NOT NULL THEN RAISE EXCEPTION 'visual asset is frozen'; END IF;
  IF NEW.storage_path <> OLD.storage_path OR NEW.bucket <> OLD.bucket OR NEW.kind <> OLD.kind OR NEW.brief_id <> OLD.brief_id THEN
    RAISE EXCEPTION 'visual asset identity is immutable';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_vsa_guard BEFORE UPDATE OR DELETE ON public.service_visual_assets FOR EACH ROW EXECUTE FUNCTION public.vsa_guard();

-- Role helpers against a task
CREATE OR REPLACE FUNCTION public.vsb_task_role(_task_id uuid, _uid uuid) RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE t record; uorg uuid;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT tk.*, e.org_id AS eorg INTO t FROM tasks tk JOIN estates e ON e.id = tk.estate_id WHERE tk.id = _task_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  uorg := get_user_org_id(_uid);
  IF uorg = t.eorg AND (has_role(_uid,'owner') OR has_role(_uid,'manager')) THEN RETURN 'manager'; END IF;
  IF uorg = t.eorg AND t.assigned_to_user_id = _uid THEN RETURN 'assignee'; END IF;
  IF uorg = t.eorg AND has_role(_uid,'vendor') AND t.assigned_vendor_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM vendors v JOIN estates ve ON ve.id = v.estate_id WHERE v.id = t.assigned_vendor_id AND ve.org_id = uorg) THEN
    RETURN 'assignee';
  END IF;
  IF EXISTS (SELECT 1 FROM client_access ca WHERE ca.client_user_id = _uid AND ca.estate_id = t.estate_id AND ca.can_view_tasks) THEN
    RETURN 'client';
  END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.can_access_visual_brief(_brief_id uuid, _uid uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM service_visual_briefs b WHERE b.id = _brief_id AND vsb_task_role(b.task_id, _uid) IS NOT NULL)
$$;

CREATE POLICY "Task-scoped read of briefs" ON public.service_visual_briefs FOR SELECT TO authenticated USING (public.vsb_task_role(task_id, auth.uid()) IS NOT NULL);
CREATE POLICY "Task-scoped read of visual assets" ON public.service_visual_assets FOR SELECT TO authenticated USING (public.can_access_visual_brief(brief_id, auth.uid()));
CREATE POLICY "Task-scoped read of brief events" ON public.service_visual_brief_events FOR SELECT TO authenticated USING (public.can_access_visual_brief(brief_id, auth.uid()));
CREATE POLICY "Task-scoped read of annotations" ON public.visual_annotations FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM service_visual_assets a WHERE a.id = visual_asset_id AND public.can_access_visual_brief(a.brief_id, auth.uid())));

-- Internal helpers
CREATE OR REPLACE FUNCTION public.vsb_log(_brief uuid, _type text, _from public.visual_brief_status, _to public.visual_brief_status, _payload jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO service_visual_brief_events(brief_id, actor_user_id, event_type, from_status, to_status, payload)
  VALUES (_brief, auth.uid(), _type, _from, _to, COALESCE(_payload,'{}'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.vsb_notify(_brief uuid, _target text, _type text, _title_en text, _title_es text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE b record; t record;
BEGIN
  SELECT * INTO b FROM service_visual_briefs WHERE id = _brief;
  SELECT * INTO t FROM tasks WHERE id = b.task_id;
  IF _target = 'requester' AND b.requested_by IS DISTINCT FROM auth.uid() THEN
    INSERT INTO notifications(user_id, estate_id, type, title, title_es, body, body_es, link)
    VALUES (b.requested_by, t.estate_id, _type, _title_en || ': ' || t.title, _title_es || ': ' || COALESCE(t.title_es, t.title), '', '', '/tasks?brief=' || t.id);
  ELSIF _target = 'assignee' AND t.assigned_to_user_id IS NOT NULL AND t.assigned_to_user_id IS DISTINCT FROM auth.uid() THEN
    INSERT INTO notifications(user_id, estate_id, type, title, title_es, body, body_es, link)
    VALUES (t.assigned_to_user_id, t.estate_id, _type, _title_en || ': ' || t.title, _title_es || ': ' || COALESCE(t.title_es, t.title), '', '', '/tasks?brief=' || t.id);
  END IF;
END; $$;

CREATE OR REPLACE FUNCTION public.vsb_load(_brief uuid, OUT b public.service_visual_briefs, OUT role text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO b FROM service_visual_briefs WHERE id = _brief FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'brief not found'; END IF;
  role := vsb_task_role(b.task_id, auth.uid());
  IF role IS NULL THEN RAISE EXCEPTION 'access denied'; END IF;
END; $$;

-- Evidence path helpers (storage)
CREATE OR REPLACE FUNCTION public.is_frozen_visual_evidence(_bucket text, _name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM service_visual_assets a WHERE a.bucket = _bucket AND a.storage_path = _name AND a.removed_at IS NULL AND a.frozen_at IS NOT NULL)
$$;

CREATE OR REPLACE FUNCTION public.can_write_visual_brief_object(_name text, _uid uuid) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE parts text[]; b record; r text; eorg uuid;
BEGIN
  parts := storage.foldername(_name);
  IF array_length(parts,1) < 3 OR parts[2] <> 'briefs' THEN RETURN false; END IF;
  BEGIN
    SELECT * INTO b FROM service_visual_briefs WHERE id = parts[3]::uuid;
  EXCEPTION WHEN others THEN RETURN false; END;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT e.org_id INTO eorg FROM tasks t JOIN estates e ON e.id = t.estate_id WHERE t.id = b.task_id;
  IF eorg::text <> parts[1] THEN RETURN false; END IF;
  r := vsb_task_role(b.task_id, _uid);
  IF r IS NULL THEN RETURN false; END IF;
  IF b.status IN ('draft','needs_clarification') AND (b.requested_by = _uid OR r = 'manager') THEN RETURN true; END IF;
  IF b.status = 'professionally_validated' AND r IN ('assignee','manager') THEN RETURN true; END IF;
  RETURN false;
END; $$;

-- RPCs
CREATE OR REPLACE FUNCTION public.create_visual_service_request(
  p_estate_id uuid, p_service_type text, p_title text, p_description text,
  p_zone_id uuid DEFAULT NULL, p_asset_id uuid DEFAULT NULL, p_placement_id uuid DEFAULT NULL, p_due_date date DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); eorg uuid; is_mgr boolean; is_client boolean; tid uuid; bid uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF COALESCE(trim(p_title),'') = '' THEN RAISE EXCEPTION 'title required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM service_types WHERE key = p_service_type AND active) THEN RAISE EXCEPTION 'invalid service type'; END IF;
  SELECT org_id INTO eorg FROM estates WHERE id = p_estate_id;
  IF eorg IS NULL THEN RAISE EXCEPTION 'estate not found'; END IF;
  is_mgr := get_user_org_id(uid) = eorg AND (has_role(uid,'owner') OR has_role(uid,'manager'));
  is_client := EXISTS (SELECT 1 FROM client_access WHERE client_user_id = uid AND estate_id = p_estate_id AND can_view_tasks);
  IF NOT (is_mgr OR is_client) THEN RAISE EXCEPTION 'access denied'; END IF;
  IF p_zone_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM zones WHERE id = p_zone_id AND estate_id = p_estate_id) THEN RAISE EXCEPTION 'zone outside estate'; END IF;
  IF p_asset_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM assets WHERE id = p_asset_id AND estate_id = p_estate_id) THEN RAISE EXCEPTION 'asset outside estate'; END IF;
  IF p_placement_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM plant_placements WHERE id = p_placement_id AND estate_id = p_estate_id) THEN RAISE EXCEPTION 'placement outside estate'; END IF;
  INSERT INTO tasks(estate_id, zone_id, asset_id, placement_id, title, description, due_date, required_photo, frequency, status)
  VALUES (p_estate_id, p_zone_id, p_asset_id, p_placement_id, trim(p_title), p_description, COALESCE(p_due_date, current_date + 7), true, 'once', 'pending')
  RETURNING id INTO tid;
  INSERT INTO service_visual_briefs(task_id, service_type, client_description, requested_by)
  VALUES (tid, p_service_type, p_description, uid) RETURNING id INTO bid;
  PERFORM vsb_log(bid, 'brief_created', NULL, 'draft', jsonb_build_object('service_type', p_service_type, 'client_description', p_description));
  RETURN jsonb_build_object('task_id', tid, 'brief_id', bid);
END; $$;

CREATE OR REPLACE FUNCTION public.add_visual_asset(
  p_brief_id uuid, p_kind public.visual_asset_kind, p_source public.visual_asset_source,
  p_storage_path text DEFAULT NULL, p_source_ref_id uuid DEFAULT NULL,
  p_width int DEFAULT NULL, p_height int DEFAULT NULL, p_mime text DEFAULT NULL, p_bytes int DEFAULT NULL,
  p_pins jsonb DEFAULT '[]'::jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; eorg uuid; bkt text := 'photos'; pth text; src record; aid uuid; pin jsonb;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  SELECT e.org_id INTO eorg FROM tasks t JOIN estates e ON e.id = t.estate_id WHERE t.id = (l.b).task_id;
  IF p_kind IN ('before','target_reference') THEN
    IF (l.b).status NOT IN ('draft','needs_clarification') OR NOT ((l.b).requested_by = auth.uid() OR l.role = 'manager') THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  ELSIF p_kind = 'agreed_target' THEN
    IF (l.b).status <> 'professionally_validated' OR l.role NOT IN ('assignee','manager') THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  ELSE
    RAISE EXCEPTION 'after photos come from task completion';
  END IF;

  IF p_source IN ('camera','upload') THEN
    pth := p_storage_path;
    IF pth IS NULL OR pth NOT LIKE eorg::text || '/briefs/' || p_brief_id::text || '/%' THEN RAISE EXCEPTION 'invalid storage path'; END IF;
  ELSIF p_source = 'plant_history' THEN
    SELECT a.bucket, a.storage_path INTO src FROM service_visual_assets a
      JOIN service_visual_briefs ob ON ob.id = a.brief_id JOIN tasks ot ON ot.id = ob.task_id JOIN estates oe ON oe.id = ot.estate_id
      WHERE a.id = p_source_ref_id AND a.removed_at IS NULL AND oe.org_id = eorg AND vsb_task_role(ob.task_id, auth.uid()) IS NOT NULL;
    IF NOT FOUND THEN RAISE EXCEPTION 'invalid source reference'; END IF;
    bkt := src.bucket; pth := src.storage_path;
  ELSE
    RAISE EXCEPTION 'invalid source';
  END IF;

  INSERT INTO service_visual_assets(brief_id, kind, bucket, storage_path, source, source_ref_id, width, height, mime, bytes, uploaded_by, frozen_at)
  VALUES (p_brief_id, p_kind, bkt, pth, p_source, CASE WHEN p_source = 'plant_history' THEN p_source_ref_id END,
          p_width, p_height, p_mime, p_bytes, auth.uid(), CASE WHEN p_source = 'plant_history' THEN now() END)
  RETURNING id INTO aid;
  FOR pin IN SELECT * FROM jsonb_array_elements(COALESCE(p_pins,'[]'::jsonb)) LOOP
    INSERT INTO visual_annotations(visual_asset_id, x, y, label, note, created_by)
    VALUES (aid, (pin->>'x')::numeric, (pin->>'y')::numeric, left(pin->>'label',60), left(pin->>'note',500), auth.uid());
  END LOOP;
  PERFORM vsb_log(p_brief_id, 'reference_added', (l.b).status, (l.b).status, jsonb_build_object('asset_id', aid, 'kind', p_kind, 'source', p_source, 'pins', jsonb_array_length(COALESCE(p_pins,'[]'::jsonb))));
  RETURN aid;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_visual_asset(p_asset_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a record; l record;
BEGIN
  SELECT * INTO a FROM service_visual_assets WHERE id = p_asset_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'asset not found'; END IF;
  SELECT * INTO l FROM vsb_load(a.brief_id);
  IF a.frozen_at IS NOT NULL OR a.removed_at IS NOT NULL OR (l.b).status NOT IN ('draft','needs_clarification','professionally_validated') THEN RAISE EXCEPTION 'asset is frozen'; END IF;
  IF NOT (a.uploaded_by = auth.uid() OR l.role = 'manager') THEN RAISE EXCEPTION 'access denied'; END IF;
  UPDATE service_visual_assets SET removed_at = now() WHERE id = p_asset_id;
  PERFORM vsb_log(a.brief_id, 'reference_removed_before_submission', (l.b).status, (l.b).status, jsonb_build_object('asset_id', p_asset_id, 'kind', a.kind));
END; $$;

CREATE OR REPLACE FUNCTION public.submit_visual_brief(p_brief_id uuid, p_client_description text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status NOT IN ('draft','needs_clarification') THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  IF NOT ((l.b).requested_by = auth.uid() OR l.role = 'manager') THEN RAISE EXCEPTION 'access denied'; END IF;
  IF NOT EXISTS (SELECT 1 FROM service_visual_assets WHERE brief_id = p_brief_id AND removed_at IS NULL AND kind IN ('before','target_reference'))
     AND COALESCE(trim(COALESCE(p_client_description,(l.b).client_description)),'') = '' THEN
    RAISE EXCEPTION 'brief is empty';
  END IF;
  UPDATE service_visual_briefs SET client_description = COALESCE(p_client_description, client_description), status = 'professional_review' WHERE id = p_brief_id;
  UPDATE service_visual_assets SET frozen_at = now() WHERE brief_id = p_brief_id AND removed_at IS NULL AND frozen_at IS NULL AND kind IN ('before','target_reference');
  PERFORM vsb_log(p_brief_id, 'client_submitted', (l.b).status, 'client_submitted', jsonb_build_object('client_description', COALESCE(p_client_description,(l.b).client_description)));
  PERFORM vsb_log(p_brief_id, 'professional_review_started', 'client_submitted', 'professional_review', '{}'::jsonb);
  PERFORM vsb_notify(p_brief_id, 'assignee', 'visual_brief_submitted', 'Desired result submitted', 'Resultado deseado enviado');
END; $$;

CREATE OR REPLACE FUNCTION public.request_visual_clarification(p_brief_id uuid, p_note text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status <> 'professional_review' THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  IF l.role NOT IN ('assignee','manager') THEN RAISE EXCEPTION 'access denied'; END IF;
  IF COALESCE(trim(p_note),'') = '' THEN RAISE EXCEPTION 'note required'; END IF;
  UPDATE service_visual_briefs SET status = 'needs_clarification', professional_notes = p_note WHERE id = p_brief_id;
  PERFORM vsb_log(p_brief_id, 'clarification_requested', 'professional_review', 'needs_clarification', jsonb_build_object('note', p_note));
  PERFORM vsb_notify(p_brief_id, 'requester', 'visual_brief_clarification', 'Clarification requested', 'Se solicita aclaración');
END; $$;

CREATE OR REPLACE FUNCTION public.assess_visual_brief(p_brief_id uuid, p_assessment public.visual_assessment, p_notes text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status NOT IN ('professional_review','professionally_validated') THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  IF l.role NOT IN ('assignee','manager') THEN RAISE EXCEPTION 'access denied'; END IF;
  UPDATE service_visual_briefs SET professional_assessment = p_assessment, professional_notes = p_notes, assessed_by = auth.uid(), assessed_at = now(),
    status = 'professionally_validated', proposed_agreement = NULL, proposed_scope = NULL, proposed_by = NULL, proposed_at = NULL WHERE id = p_brief_id;
  PERFORM vsb_log(p_brief_id, 'professional_assessed', (l.b).status, 'professionally_validated', jsonb_build_object('assessment', p_assessment, 'notes', p_notes));
  PERFORM vsb_notify(p_brief_id, 'requester', 'visual_brief_assessed', 'Professional assessment ready', 'Evaluación profesional lista');
END; $$;

CREATE OR REPLACE FUNCTION public.propose_visual_scope(p_brief_id uuid, p_agreement public.visual_agreement, p_scope text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status <> 'professionally_validated' OR (l.b).professional_assessment IS NULL THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  IF l.role NOT IN ('assignee','manager') THEN RAISE EXCEPTION 'access denied'; END IF;
  IF COALESCE(trim(p_scope),'') = '' THEN RAISE EXCEPTION 'scope required'; END IF;
  UPDATE service_visual_briefs SET proposed_agreement = p_agreement, proposed_scope = p_scope, proposed_by = auth.uid(), proposed_at = now() WHERE id = p_brief_id;
  PERFORM vsb_log(p_brief_id, 'scope_proposed', 'professionally_validated', 'professionally_validated', jsonb_build_object('agreement', p_agreement, 'scope', p_scope));
  PERFORM vsb_notify(p_brief_id, 'requester', 'visual_scope_proposed', 'Scope proposed', 'Alcance propuesto');
END; $$;

CREATE OR REPLACE FUNCTION public.agree_visual_scope(p_brief_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; requester_role text;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status <> 'professionally_validated' OR (l.b).proposed_scope IS NULL THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  requester_role := vsb_task_role((l.b).task_id, (l.b).requested_by);
  IF NOT ((l.b).requested_by = auth.uid() OR l.role = 'client' OR (l.role = 'manager' AND requester_role = 'manager' AND (l.b).proposed_by IS DISTINCT FROM auth.uid()) OR (l.role = 'manager' AND requester_role = 'manager' AND (l.b).requested_by = auth.uid())) THEN
    RAISE EXCEPTION 'access denied';
  END IF;
  UPDATE service_visual_briefs SET status = 'scope_agreed', agreed_scope = proposed_scope, agreed_by = auth.uid(), agreed_at = now() WHERE id = p_brief_id;
  UPDATE service_visual_assets SET frozen_at = now() WHERE brief_id = p_brief_id AND kind = 'agreed_target' AND removed_at IS NULL AND frozen_at IS NULL;
  PERFORM vsb_log(p_brief_id, 'scope_agreed', 'professionally_validated', 'scope_agreed', jsonb_build_object('agreement', (l.b).proposed_agreement, 'scope', (l.b).proposed_scope, 'assessment', (l.b).professional_assessment));
  PERFORM vsb_notify(p_brief_id, 'assignee', 'visual_scope_agreed', 'Scope agreed', 'Alcance acordado');
END; $$;

CREATE OR REPLACE FUNCTION public.complete_visual_brief(p_brief_id uuid, p_completion_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; c record; pth text; aid uuid;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status NOT IN ('scope_agreed','adjustment_requested') THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  IF l.role NOT IN ('assignee','manager') THEN RAISE EXCEPTION 'access denied'; END IF;
  SELECT * INTO c FROM task_completions WHERE id = p_completion_id AND task_id = (l.b).task_id AND completed_by_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid completion'; END IF;
  IF c.photo_url IS NULL THEN RAISE EXCEPTION 'final photo required'; END IF;
  pth := split_part(regexp_replace(c.photo_url, '^.*/storage/v1/object/(public|sign)/photos/', ''), '?', 1);
  IF pth = c.photo_url OR pth = '' THEN RAISE EXCEPTION 'completion photo not in evidence storage'; END IF;
  INSERT INTO service_visual_assets(brief_id, kind, bucket, storage_path, source, source_ref_id, uploaded_by, frozen_at)
  VALUES (p_brief_id, 'after', 'photos', pth, 'completion', p_completion_id, auth.uid(), now()) RETURNING id INTO aid;
  UPDATE service_visual_briefs SET status = 'result_submitted', client_match = NULL, client_action = NULL, client_feedback = NULL, reviewed_by = NULL, reviewed_at = NULL WHERE id = p_brief_id;
  PERFORM vsb_log(p_brief_id, 'result_submitted', (l.b).status, 'result_submitted', jsonb_build_object('asset_id', aid, 'completion_id', p_completion_id));
  PERFORM vsb_notify(p_brief_id, 'requester', 'visual_result_submitted', 'Final result available', 'Resultado final disponible');
  RETURN aid;
END; $$;

CREATE OR REPLACE FUNCTION public.review_visual_result(p_brief_id uuid, p_match public.visual_match, p_action public.visual_review_action, p_feedback text DEFAULT NULL) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; nxt public.visual_brief_status;
BEGIN
  SELECT * INTO l FROM vsb_load(p_brief_id);
  IF (l.b).status <> 'result_submitted' THEN RAISE EXCEPTION 'transition not allowed'; END IF;
  IF NOT ((l.b).requested_by = auth.uid() OR l.role = 'client') OR l.role = 'assignee' THEN RAISE EXCEPTION 'access denied'; END IF;
  IF p_action = 'request_adjustment' AND COALESCE(trim(p_feedback),'') = '' THEN RAISE EXCEPTION 'feedback required'; END IF;
  nxt := CASE WHEN p_action = 'approve' THEN 'client_approved'::public.visual_brief_status ELSE 'adjustment_requested'::public.visual_brief_status END;
  UPDATE service_visual_briefs SET status = nxt, client_match = p_match, client_action = p_action, client_feedback = p_feedback, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = p_brief_id;
  PERFORM vsb_log(p_brief_id, CASE WHEN p_action = 'approve' THEN 'client_approved' ELSE 'adjustment_requested' END, 'result_submitted', nxt, jsonb_build_object('match', p_match, 'feedback', p_feedback));
  PERFORM vsb_notify(p_brief_id, 'assignee', 'visual_result_reviewed', CASE WHEN p_action='approve' THEN 'Result approved' ELSE 'Adjustment requested' END, CASE WHEN p_action='approve' THEN 'Resultado aprobado' ELSE 'Ajuste solicitado' END);
END; $$;

-- Execute permissions
DO $$ DECLARE f text; BEGIN
  FOREACH f IN ARRAY ARRAY[
    'vsb_task_role(uuid,uuid)','can_access_visual_brief(uuid,uuid)','vsb_log(uuid,text,public.visual_brief_status,public.visual_brief_status,jsonb)',
    'vsb_notify(uuid,text,text,text,text)','vsb_load(uuid)','is_frozen_visual_evidence(text,text)','can_write_visual_brief_object(text,uuid)',
    'create_visual_service_request(uuid,text,text,text,uuid,uuid,uuid,date)',
    'add_visual_asset(uuid,public.visual_asset_kind,public.visual_asset_source,text,uuid,int,int,text,int,jsonb)',
    'remove_visual_asset(uuid)','submit_visual_brief(uuid,text)','request_visual_clarification(uuid,text)',
    'assess_visual_brief(uuid,public.visual_assessment,text)','propose_visual_scope(uuid,public.visual_agreement,text)',
    'agree_visual_scope(uuid)','complete_visual_brief(uuid,uuid)','review_visual_result(uuid,public.visual_match,public.visual_review_action,text)']
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated, service_role', f);
  END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.vsb_log(uuid,text,public.visual_brief_status,public.visual_brief_status,jsonb) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.vsb_notify(uuid,text,text,text,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.vsb_load(uuid) FROM authenticated;

-- Storage: brief uploads + frozen evidence protection
CREATE POLICY "Visual brief uploads" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos' AND public.can_write_visual_brief_object(name, auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own photos" ON storage.objects;
CREATE POLICY "Users can delete their own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'photos' AND (auth.uid())::text = (storage.foldername(name))[1] AND NOT public.is_frozen_visual_evidence('photos', name));
DROP POLICY IF EXISTS "Users can update their own photos" ON storage.objects;
CREATE POLICY "Users can update their own photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'photos' AND (auth.uid())::text = (storage.foldername(name))[1] AND NOT public.is_frozen_visual_evidence('photos', name));
DROP POLICY IF EXISTS "Org members can delete asset photos" ON storage.objects;
CREATE POLICY "Org members can delete asset photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-photos' AND public.user_can_write_asset_photo(name, auth.uid()) AND NOT public.is_frozen_visual_evidence('asset-photos', name));
