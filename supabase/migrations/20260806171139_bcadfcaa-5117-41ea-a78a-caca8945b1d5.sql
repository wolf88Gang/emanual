-- helper: internal member of the org that owns the first path segment
CREATE OR REPLACE FUNCTION public.plantops_can_access_photo(_path text, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL
    AND public.get_user_org_id(_user_id) IS NOT NULL
    AND split_part(_path, '/', 1) = public.get_user_org_id(_user_id)::text
    AND (
      public.has_role(_user_id, 'owner')
      OR public.has_role(_user_id, 'manager')
      OR public.has_role(_user_id, 'crew')
    )
$$;

REVOKE ALL ON FUNCTION public.plantops_can_access_photo(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_can_access_photo(text, uuid) TO authenticated, service_role;

CREATE POLICY "plantops_photos_select_internal"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'plantops-photos' AND public.plantops_can_access_photo(name, auth.uid()));

CREATE POLICY "plantops_photos_insert_internal"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'plantops-photos' AND public.plantops_can_access_photo(name, auth.uid()));

CREATE POLICY "plantops_photos_update_internal"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'plantops-photos' AND public.plantops_can_access_photo(name, auth.uid()))
WITH CHECK (bucket_id = 'plantops-photos' AND public.plantops_can_access_photo(name, auth.uid()));

CREATE POLICY "plantops_photos_delete_internal"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'plantops-photos' AND public.plantops_can_access_photo(name, auth.uid()));

-- ===== upsert PlantOps commercial details for a plant/pot asset =====
CREATE OR REPLACE FUNCTION public.plantops_upsert_asset_details(
  p_asset_id uuid,
  p_lifecycle_status text DEFAULT 'active',
  p_condition_rating smallint DEFAULT NULL,
  p_acquisition_date date DEFAULT NULL,
  p_supplier_name text DEFAULT NULL,
  p_cost numeric DEFAULT NULL,
  p_replacement_value numeric DEFAULT NULL,
  p_rental_price numeric DEFAULT NULL,
  p_currency text DEFAULT 'CRC',
  p_retired_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_type public.asset_type;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF NOT (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager')) THEN
    RAISE EXCEPTION 'Insufficient role';
  END IF;

  v_org := public.get_user_org_id(auth.uid());
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No organization';
  END IF;

  IF p_lifecycle_status NOT IN ('active','recovery','retired') THEN
    RAISE EXCEPTION 'Invalid lifecycle status %', p_lifecycle_status;
  END IF;

  SELECT a.asset_type INTO v_type
  FROM public.assets a
  JOIN public.estates e ON e.id = a.estate_id
  WHERE a.id = p_asset_id AND e.org_id = v_org;

  IF v_type IS NULL THEN
    RAISE EXCEPTION 'Asset not found in your organization';
  END IF;
  IF v_type NOT IN ('plant'::public.asset_type, 'pot'::public.asset_type) THEN
    RAISE EXCEPTION 'Only plant or pot assets can have PlantOps details';
  END IF;

  INSERT INTO public.plantops_asset_details (
    asset_id, org_id, lifecycle_status, condition_rating, acquisition_date, supplier_name,
    cost, replacement_value, rental_price, currency, retired_reason
  ) VALUES (
    p_asset_id, v_org, p_lifecycle_status, p_condition_rating, p_acquisition_date, p_supplier_name,
    p_cost, p_replacement_value, p_rental_price, COALESCE(p_currency,'CRC'), p_retired_reason
  )
  ON CONFLICT (asset_id) DO UPDATE SET
    lifecycle_status = EXCLUDED.lifecycle_status,
    condition_rating = EXCLUDED.condition_rating,
    acquisition_date = EXCLUDED.acquisition_date,
    supplier_name = EXCLUDED.supplier_name,
    cost = EXCLUDED.cost,
    replacement_value = EXCLUDED.replacement_value,
    rental_price = EXCLUDED.rental_price,
    currency = EXCLUDED.currency,
    retired_reason = EXCLUDED.retired_reason;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_upsert_asset_details(uuid,text,smallint,date,text,numeric,numeric,numeric,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_upsert_asset_details(uuid,text,smallint,date,text,numeric,numeric,numeric,text,text) TO authenticated;