
-- ==========================================
-- 1. NOTIFICATIONS TABLE
-- ==========================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'task_assigned',
  title TEXT NOT NULL,
  title_es TEXT,
  body TEXT,
  body_es TEXT,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- System/triggers can insert
CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ==========================================
-- 2. TRIGGER: notify worker on task assignment
-- ==========================================
CREATE OR REPLACE FUNCTION public.notify_on_task_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only fire when assigned_to_user_id changes to a non-null value
  IF NEW.assigned_to_user_id IS NOT NULL AND 
     (OLD.assigned_to_user_id IS NULL OR OLD.assigned_to_user_id != NEW.assigned_to_user_id) THEN
    INSERT INTO notifications (user_id, estate_id, type, title, title_es, body, body_es, link)
    VALUES (
      NEW.assigned_to_user_id,
      NEW.estate_id,
      'task_assigned',
      'New task assigned: ' || NEW.title,
      CASE WHEN NEW.title_es IS NOT NULL THEN 'Nueva tarea asignada: ' || NEW.title_es ELSE NULL END,
      COALESCE(NEW.description, ''),
      NEW.description_es,
      '/tasks'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_task_assignment
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_assignment();

-- ==========================================
-- 3. TEAM INVITES TABLE (invite codes)
-- ==========================================
CREATE TABLE public.team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.estates(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'crew',
  created_by UUID NOT NULL,
  max_uses INTEGER DEFAULT 10,
  used_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/Managers can manage team invites"
  ON public.team_invites FOR ALL
  USING (
    org_id = get_user_org_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Anyone can read active invites by code"
  ON public.team_invites FOR SELECT
  USING (active = true);

-- ==========================================
-- 4. TEAM MEMBERS TABLE (workers without accounts)
-- ==========================================
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id UUID REFERENCES public.estates(id) ON DELETE SET NULL,
  user_id UUID,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'crew',
  status TEXT NOT NULL DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners/Managers can manage team members"
  ON public.team_members FOR ALL
  USING (
    org_id = get_user_org_id(auth.uid())
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

CREATE POLICY "Users can view team members in their org"
  ON public.team_members FOR SELECT
  USING (org_id = get_user_org_id(auth.uid()));
