
-- Add 'client' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'client';

-- Client access permissions table (per client user per estate)
CREATE TABLE public.client_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_user_id uuid NOT NULL,
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL,
  
  -- Permission flags
  can_view_map boolean NOT NULL DEFAULT false,
  can_view_assets boolean NOT NULL DEFAULT false,
  can_view_tasks boolean NOT NULL DEFAULT false,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_view_photos boolean NOT NULL DEFAULT false,
  can_view_documents boolean NOT NULL DEFAULT false,
  can_view_work_hours boolean NOT NULL DEFAULT false,
  can_view_statistics boolean NOT NULL DEFAULT false,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(client_user_id, estate_id)
);

ALTER TABLE public.client_access ENABLE ROW LEVEL SECURITY;

-- Owners/Managers can manage client access for their org
CREATE POLICY "Owners/Managers can manage client access"
  ON public.client_access FOR ALL
  TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    org_id = get_user_org_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

-- Clients can view their own access records
CREATE POLICY "Clients can view own access"
  ON public.client_access FOR SELECT
  TO authenticated
  USING (client_user_id = auth.uid());

-- Client invitations table
CREATE TABLE public.client_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  estate_id uuid NOT NULL REFERENCES public.estates(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL,
  code text NOT NULL UNIQUE,
  email text,
  
  -- Default permissions for when client joins
  can_view_map boolean NOT NULL DEFAULT true,
  can_view_assets boolean NOT NULL DEFAULT true,
  can_view_tasks boolean NOT NULL DEFAULT true,
  can_view_reports boolean NOT NULL DEFAULT false,
  can_view_photos boolean NOT NULL DEFAULT true,
  can_view_documents boolean NOT NULL DEFAULT false,
  can_view_work_hours boolean NOT NULL DEFAULT false,
  can_view_statistics boolean NOT NULL DEFAULT false,
  
  max_uses integer DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(email, estate_id)
);

ALTER TABLE public.client_invites ENABLE ROW LEVEL SECURITY;

-- Owners/Managers can manage client invites
CREATE POLICY "Owners/Managers can manage client invites"
  ON public.client_invites FOR ALL
  TO authenticated
  USING (
    org_id = get_user_org_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  )
  WITH CHECK (
    org_id = get_user_org_id(auth.uid()) 
    AND (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
  );

-- Anyone can read active invites by code (for joining flow)
CREATE POLICY "Anyone can read active invites by code"
  ON public.client_invites FOR SELECT
  TO public
  USING (active = true);

-- Security definer function to check client permissions
CREATE OR REPLACE FUNCTION public.get_client_permissions(_user_id uuid, _estate_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'can_view_map', ca.can_view_map,
    'can_view_assets', ca.can_view_assets,
    'can_view_tasks', ca.can_view_tasks,
    'can_view_reports', ca.can_view_reports,
    'can_view_photos', ca.can_view_photos,
    'can_view_documents', ca.can_view_documents,
    'can_view_work_hours', ca.can_view_work_hours,
    'can_view_statistics', ca.can_view_statistics
  )
  FROM public.client_access ca
  WHERE ca.client_user_id = _user_id AND ca.estate_id = _estate_id
$$;
