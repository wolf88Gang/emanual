
-- Add org_type to organizations
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS org_type text NOT NULL DEFAULT 'residential';

-- Add worker_marketplace to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'worker_marketplace';

-- Worker profiles (public-facing)
CREATE TABLE public.worker_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio text,
  bio_es text,
  skills text[] DEFAULT '{}',
  service_zone_text text,
  service_zone_lat double precision,
  service_zone_lng double precision,
  service_radius_km integer DEFAULT 25,
  hourly_rate numeric,
  currency text NOT NULL DEFAULT 'USD',
  available boolean NOT NULL DEFAULT true,
  portfolio_urls text[] DEFAULT '{}',
  rating_avg numeric DEFAULT 0,
  rating_count integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view worker profiles (public marketplace)
CREATE POLICY "Public can view worker profiles" ON public.worker_profiles FOR SELECT USING (true);
-- Workers can manage own profile
CREATE POLICY "Workers can manage own profile" ON public.worker_profiles FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Job postings (public board)
CREATE TABLE public.job_postings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  title text NOT NULL,
  title_es text,
  description text NOT NULL,
  description_es text,
  job_type text NOT NULL DEFAULT 'one_time',
  pay_amount numeric,
  pay_type text DEFAULT 'fixed',
  currency text NOT NULL DEFAULT 'USD',
  schedule_text text,
  location_text text,
  location_lat double precision,
  location_lng double precision,
  required_skills text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open',
  max_applicants integer DEFAULT 10,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

-- Anyone can view open job postings (public marketplace)
CREATE POLICY "Public can view open jobs" ON public.job_postings FOR SELECT USING (status = 'open');
-- Org owners/managers can view all their jobs
CREATE POLICY "Org users can view own jobs" ON public.job_postings FOR SELECT USING (org_id = get_user_org_id(auth.uid()));
-- Org owners/managers can manage jobs
CREATE POLICY "Org owners can manage jobs" ON public.job_postings FOR ALL USING (
  org_id = get_user_org_id(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
) WITH CHECK (
  org_id = get_user_org_id(auth.uid()) AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Job applications
CREATE TABLE public.job_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  worker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text,
  proposed_rate numeric,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, worker_id)
);
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

-- Workers can manage own applications
CREATE POLICY "Workers can manage own applications" ON public.job_applications FOR ALL USING (worker_id = auth.uid()) WITH CHECK (worker_id = auth.uid());
-- Job owners can view applications for their jobs
CREATE POLICY "Org owners can view applications" ON public.job_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_applications.job_id AND jp.org_id = get_user_org_id(auth.uid()))
);
-- Job owners can update application status
CREATE POLICY "Org owners can update applications" ON public.job_applications FOR UPDATE USING (
  EXISTS (SELECT 1 FROM job_postings jp WHERE jp.id = job_applications.job_id AND jp.org_id = get_user_org_id(auth.uid()))
  AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
);

-- Ratings (bidirectional)
CREATE TABLE public.job_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  from_user_id uuid NOT NULL REFERENCES auth.users(id),
  to_user_id uuid NOT NULL REFERENCES auth.users(id),
  score integer NOT NULL CHECK (score >= 1 AND score <= 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id, from_user_id, to_user_id)
);
ALTER TABLE public.job_ratings ENABLE ROW LEVEL SECURITY;

-- Anyone can view ratings (public transparency)
CREATE POLICY "Public can view ratings" ON public.job_ratings FOR SELECT USING (true);
-- Authenticated users can create ratings
CREATE POLICY "Users can create ratings" ON public.job_ratings FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Messages for job communication
CREATE TABLE public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id),
  receiver_id uuid NOT NULL REFERENCES auth.users(id),
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own messages
CREATE POLICY "Users can view own messages" ON public.job_messages FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
-- Users can send messages
CREATE POLICY "Users can send messages" ON public.job_messages FOR INSERT WITH CHECK (sender_id = auth.uid());
-- Users can mark as read
CREATE POLICY "Users can update own received messages" ON public.job_messages FOR UPDATE USING (receiver_id = auth.uid());

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_messages;
