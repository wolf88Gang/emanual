-- Additive product taxonomy: account scope + business archetype (org_type kept for compatibility)
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS business_archetype text,
  ADD COLUMN IF NOT EXISTS account_scope text;

UPDATE public.organizations
SET business_archetype = CASE org_type
    WHEN 'plant_rental' THEN 'plant_services'
    WHEN 'landscaping_company' THEN 'landscaping_services'
    WHEN 'hybrid' THEN 'landscaping_services'
    WHEN 'property_management' THEN 'property_management'
    WHEN 'residential' THEN 'individual'
    ELSE 'general_service'
  END
WHERE business_archetype IS NULL;

UPDATE public.organizations
SET account_scope = CASE WHEN business_archetype = 'individual' THEN 'individual' ELSE 'business' END
WHERE account_scope IS NULL;

ALTER TABLE public.organizations
  ALTER COLUMN business_archetype SET DEFAULT 'general_service',
  ALTER COLUMN account_scope SET DEFAULT 'business';

-- Business onboarding: creates the organization + owner role + module configuration.
-- Deliberately does NOT create an estate/project/client/contract.
CREATE OR REPLACE FUNCTION public.complete_business_onboarding(
  p_org_name text,
  p_archetype text,
  p_country text DEFAULT NULL,
  p_modules jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_archetype text := coalesce(nullif(trim(p_archetype), ''), 'general_service');
  v_org_type text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF coalesce(trim(p_org_name), '') = '' THEN
    RAISE EXCEPTION 'Business name is required';
  END IF;
  IF v_archetype NOT IN ('plant_services','landscaping_services','property_services','property_management','asset_service','general_service','individual') THEN
    RAISE EXCEPTION 'Unknown business archetype: %', v_archetype;
  END IF;

  v_org_type := CASE v_archetype
    WHEN 'plant_services' THEN 'plant_rental'
    WHEN 'landscaping_services' THEN 'landscaping_company'
    WHEN 'property_services' THEN 'landscaping_company'
    WHEN 'property_management' THEN 'property_management'
    WHEN 'individual' THEN 'residential'
    ELSE 'landscaping_company'
  END;

  SELECT org_id INTO v_org_id FROM public.profiles WHERE id = v_user_id;

  IF v_org_id IS NULL THEN
    INSERT INTO public.organizations (name, org_type, business_archetype, account_scope, modules_json)
    VALUES (
      trim(p_org_name),
      v_org_type,
      v_archetype,
      CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
      coalesce(p_modules, '{}'::jsonb)
    )
    RETURNING id INTO v_org_id;
  ELSE
    UPDATE public.organizations
    SET name = trim(p_org_name),
        org_type = v_org_type,
        business_archetype = v_archetype,
        account_scope = CASE WHEN v_archetype = 'individual' THEN 'individual' ELSE 'business' END,
        modules_json = coalesce(p_modules, modules_json),
        updated_at = now()
    WHERE id = v_org_id;
  END IF;

  UPDATE public.profiles
  SET org_id = v_org_id,
      country = CASE WHEN coalesce(trim(coalesce(p_country,'')), '') = '' THEN country ELSE trim(p_country) END,
      updated_at = now()
  WHERE id = v_user_id;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'owner'::public.app_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN v_org_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.complete_business_onboarding(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_business_onboarding(text, text, text, jsonb) TO authenticated;