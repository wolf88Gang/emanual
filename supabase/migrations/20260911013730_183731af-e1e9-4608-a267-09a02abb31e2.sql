CREATE TABLE IF NOT EXISTS public.platform_settings (
  key text PRIMARY KEY,
  bool_value boolean,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT SELECT ON public.platform_settings TO anon;
GRANT ALL ON public.platform_settings TO service_role;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
ON public.platform_settings FOR SELECT
USING (true);

CREATE POLICY "Platform admins manage platform settings"
ON public.platform_settings FOR ALL
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()));

GRANT INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;

ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS dev_banner_override boolean;

DROP POLICY IF EXISTS "Platform admins update organizations" ON public.organizations;
CREATE POLICY "Platform admins update organizations"
ON public.organizations FOR UPDATE
TO authenticated
USING (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.platform_admins pa WHERE pa.user_id = auth.uid()));