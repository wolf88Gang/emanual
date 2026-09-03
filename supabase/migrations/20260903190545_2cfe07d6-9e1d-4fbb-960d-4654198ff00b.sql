CREATE TABLE public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  company_name text,
  country text,
  operation_type text NOT NULL,
  team_size text,
  sites_count text,
  current_tools text,
  needs text NOT NULL,
  preferred_language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'new',
  internal_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT access_requests_status_check CHECK (status IN ('new','contacted','approved','rejected')),
  CONSTRAINT access_requests_full_name_len CHECK (char_length(full_name) BETWEEN 2 AND 120),
  CONSTRAINT access_requests_email_len CHECK (char_length(email) BETWEEN 5 AND 255),
  CONSTRAINT access_requests_needs_len CHECK (char_length(needs) BETWEEN 10 AND 2000)
);

GRANT INSERT ON public.access_requests TO anon;
GRANT INSERT ON public.access_requests TO authenticated;
GRANT SELECT, UPDATE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;

ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit an access request"
ON public.access_requests FOR INSERT TO anon, authenticated
WITH CHECK (status = 'new' AND internal_notes IS NULL);

CREATE POLICY "Platform admins can read access requests"
ON public.access_requests FOR SELECT TO authenticated
USING (public.is_platform_admin(auth.uid()));

CREATE POLICY "Platform admins can update access requests"
ON public.access_requests FOR UPDATE TO authenticated
USING (public.is_platform_admin(auth.uid()))
WITH CHECK (public.is_platform_admin(auth.uid()));

CREATE TRIGGER access_requests_set_updated_at
BEFORE UPDATE ON public.access_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();