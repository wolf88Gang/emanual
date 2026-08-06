-- 1) Additive: link subscriptions to the billable organization
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE;

-- 2) Backfill from the legacy user linkage (user_id kept as legacy data)
UPDATE public.subscriptions s
SET org_id = p.org_id
FROM public.profiles p
WHERE p.id = s.user_id
  AND s.org_id IS NULL
  AND p.org_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_org_id ON public.subscriptions(org_id);

-- 3) Keep org_id populated automatically on future writes
CREATE OR REPLACE FUNCTION public.subscriptions_fill_org_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.org_id IS NULL AND NEW.user_id IS NOT NULL THEN
    SELECT p.org_id INTO NEW.org_id FROM public.profiles p WHERE p.id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_fill_org_id ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_fill_org_id
BEFORE INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.subscriptions_fill_org_id();

-- 4) Org-scoped read access (in addition to existing own-row and platform-admin policies)
DROP POLICY IF EXISTS "Members can view their organization subscription" ON public.subscriptions;
CREATE POLICY "Members can view their organization subscription"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  org_id IS NOT NULL
  AND org_id = (SELECT p.org_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- NOTE (documented, intentionally NOT executed here):
-- A partial unique index enforcing one active subscription per organization
-- ( CREATE UNIQUE INDEX ... ON public.subscriptions(org_id) WHERE status = 'active' )
-- cannot be created yet because legacy demo rows contain 4 active subscriptions for
-- org 11111111-1111-1111-1111-111111111111. Reconciliation plan: keep the oldest
-- active row per org as canonical, set the remaining ones to status = 'superseded',
-- then add the unique index in a follow-up migration.