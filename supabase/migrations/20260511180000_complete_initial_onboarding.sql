create or replace function public.complete_initial_onboarding(
  p_org_name text,
  p_org_type text,
  p_client_type text,
  p_estate_name text,
  p_country text default null,
  p_address_text text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_org_id uuid;
  v_estate_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(trim(p_org_name), '') = '' then
    raise exception 'Organization name is required';
  end if;

  if coalesce(trim(p_estate_name), '') = '' then
    raise exception 'Estate name is required';
  end if;

  select org_id into v_org_id
  from public.profiles
  where id = v_user_id;

  if v_org_id is null then
    insert into public.organizations (name, org_type)
    values (trim(p_org_name), coalesce(nullif(trim(p_org_type), ''), 'residential'))
    returning id into v_org_id;
  end if;

  update public.profiles
  set
    org_id = v_org_id,
    client_type = case
      when p_client_type in ('property_owner', 'landscaping_company', 'hybrid', 'other') then p_client_type::public.client_type
      else client_type
    end,
    updated_at = now()
  where id = v_user_id;

  insert into public.user_roles (user_id, role)
  values (v_user_id, 'owner'::public.app_role)
  on conflict (user_id, role) do nothing;

  insert into public.estates (name, org_id, country, address_text)
  values (trim(p_estate_name), v_org_id, nullif(trim(coalesce(p_country, '')), ''), nullif(trim(coalesce(p_address_text, '')), ''))
  returning id into v_estate_id;

  return v_estate_id;
end;
$$;

grant execute on function public.complete_initial_onboarding(text, text, text, text, text, text) to authenticated;
