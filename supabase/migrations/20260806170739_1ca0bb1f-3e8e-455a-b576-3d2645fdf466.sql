-- ============ plantops_asset_details ============
CREATE TABLE public.plantops_asset_details (
  asset_id uuid PRIMARY KEY REFERENCES public.assets(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lifecycle_status text NOT NULL DEFAULT 'active',
  condition_rating smallint NULL,
  acquisition_date date NULL,
  supplier_name text NULL,
  cost numeric NULL,
  replacement_value numeric NULL,
  rental_price numeric NULL,
  currency text NOT NULL DEFAULT 'CRC',
  retired_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plantops_ad_lifecycle_chk CHECK (lifecycle_status IN ('active','recovery','retired')),
  CONSTRAINT plantops_ad_condition_chk CHECK (condition_rating IS NULL OR condition_rating BETWEEN 1 AND 5),
  CONSTRAINT plantops_ad_cost_chk CHECK (cost IS NULL OR cost >= 0),
  CONSTRAINT plantops_ad_replacement_chk CHECK (replacement_value IS NULL OR replacement_value >= 0),
  CONSTRAINT plantops_ad_rental_chk CHECK (rental_price IS NULL OR rental_price >= 0)
);

CREATE INDEX idx_plantops_ad_org_lifecycle ON public.plantops_asset_details(org_id, lifecycle_status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plantops_asset_details TO authenticated;
GRANT ALL ON public.plantops_asset_details TO service_role;

ALTER TABLE public.plantops_asset_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plantops_ad_select_internal"
ON public.plantops_asset_details FOR SELECT TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'crew')
  )
);

CREATE POLICY "plantops_ad_insert_managers"
ON public.plantops_asset_details FOR INSERT TO authenticated
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "plantops_ad_update_managers"
ON public.plantops_asset_details FOR UPDATE TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "plantops_ad_delete_managers"
ON public.plantops_asset_details FOR DELETE TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE TRIGGER update_plantops_asset_details_updated_at
BEFORE UPDATE ON public.plantops_asset_details
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ rental_contracts ============
CREATE TABLE public.rental_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  estate_id uuid NULL REFERENCES public.estates(id) ON DELETE SET NULL,
  contract_type text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  starts_on date NOT NULL,
  ends_on date NULL,
  price_amount numeric NULL,
  currency text NOT NULL DEFAULT 'CRC',
  billing_period text NULL,
  maintenance_frequency public.task_frequency NULL,
  replacement_rules text NULL,
  client_dos_donts text NULL,
  internal_notes text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rental_contracts_type_chk CHECK (contract_type IN ('recurring','event')),
  CONSTRAINT rental_contracts_status_chk CHECK (status IN ('draft','active','ended')),
  CONSTRAINT rental_contracts_billing_chk CHECK (billing_period IS NULL OR billing_period IN ('monthly','event','other')),
  CONSTRAINT rental_contracts_dates_chk CHECK (ends_on IS NULL OR ends_on >= starts_on),
  CONSTRAINT rental_contracts_price_chk CHECK (price_amount IS NULL OR price_amount >= 0)
);

CREATE INDEX idx_rental_contracts_org_status ON public.rental_contracts(org_id, status);
CREATE INDEX idx_rental_contracts_client ON public.rental_contracts(client_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rental_contracts TO authenticated;
GRANT ALL ON public.rental_contracts TO service_role;

ALTER TABLE public.rental_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rental_contracts_select_internal"
ON public.rental_contracts FOR SELECT TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (
    public.has_role(auth.uid(), 'owner')
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'crew')
  )
);

CREATE POLICY "rental_contracts_insert_managers"
ON public.rental_contracts FOR INSERT TO authenticated
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "rental_contracts_update_managers"
ON public.rental_contracts FOR UPDATE TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
)
WITH CHECK (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE POLICY "rental_contracts_delete_managers"
ON public.rental_contracts FOR DELETE TO authenticated
USING (
  org_id = public.get_user_org_id(auth.uid())
  AND (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'))
);

CREATE TRIGGER update_rental_contracts_updated_at
BEFORE UPDATE ON public.rental_contracts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();