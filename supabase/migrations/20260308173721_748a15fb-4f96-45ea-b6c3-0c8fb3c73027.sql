-- Add client type classification to capture onboarding intent
CREATE TYPE public.client_type AS ENUM ('property_owner', 'landscaping_company', 'hybrid', 'other');

ALTER TABLE public.profiles
ADD COLUMN client_type public.client_type;