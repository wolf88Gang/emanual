
ALTER TABLE public.subscriptions 
ADD COLUMN trial_started_at timestamp with time zone DEFAULT NULL,
ADD COLUMN trial_ends_at timestamp with time zone DEFAULT NULL;
