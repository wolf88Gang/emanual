ALTER TYPE public.client_type ADD VALUE IF NOT EXISTS 'property_management';

CREATE OR REPLACE FUNCTION public.complete_initial_onboarding(
  p_org_name text,
  p_org_type text,
  p_client_type text,
  p_estate_name text,
  p_country text DEFAULT null,
  p_address_text text DEFAULT null
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_estate_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF coalesce(trim(p_org_name), '') = '' THEN
    RAISE EXCEPTION 'Organization name is required';
  END IF;

  IF coalesce(trim(p_estate_name), '') = '' THEN
    RAISE EXCEPTION 'Estate name is required';
  END IF;

  SELECT org_id INTO v_org_id
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, org_type)
    VALUES (trim(p_org_name), coalesce(nullif(trim(p_org_type), ''), 'residential'))
    RETURNING id INTO v_org_id;
  END IF;

  UPDATE public.profiles
  SET
    org_id = v_org_id,
    client_type = CASE
      WHEN p_client_type IN ('property_owner', 'landscaping_company', 'hybrid', 'other', 'property_management')
        THEN p_client_type::public.client_type
      ELSE client_type
    END,
    updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  INSERT INTO public.estates (name, org_id, country, address_text)
  VALUES (
    trim(p_estate_name),
    v_org_id,
    nullif(trim(coalesce(p_country, '')), ''),
    nullif(trim(coalesce(p_address_text, '')), '')
  )
  RETURNING id INTO v_estate_id;

  RETURN v_estate_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_initial_onboarding(text, text, text, text, text, text) TO authenticated;