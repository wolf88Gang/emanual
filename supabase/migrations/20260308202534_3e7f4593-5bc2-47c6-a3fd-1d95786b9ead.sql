
CREATE TABLE public.feature_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    org_id uuid REFERENCES public.organizations(id),
    category text NOT NULL DEFAULT 'feature',
    title text NOT NULL,
    description text NOT NULL,
    priority text NOT NULL DEFAULT 'medium',
    status text NOT NULL DEFAULT 'pending',
    admin_notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own requests"
ON public.feature_requests FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own requests"
ON public.feature_requests FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Platform admins can view all requests"
ON public.feature_requests FOR SELECT TO authenticated
USING (is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update all requests"
ON public.feature_requests FOR UPDATE TO authenticated
USING (is_platform_admin(auth.uid()));

CREATE TRIGGER update_feature_requests_updated_at
    BEFORE UPDATE ON public.feature_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
