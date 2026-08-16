CREATE OR REPLACE FUNCTION public.plantops_set_pot_details(
  p_asset_id uuid,
  p_material text DEFAULT NULL,
  p_diameter_cm numeric DEFAULT NULL,
  p_height_cm numeric DEFAULT NULL,
  p_volume_liters numeric DEFAULT NULL,
  p_has_drainage boolean DEFAULT NULL,
  p_drainage_holes integer DEFAULT NULL,
  p_has_saucer boolean DEFAULT NULL,
  p_reservoir boolean DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
BEGIN
  PERFORM public.plantops_require_internal();

  SELECT org_id INTO v_org FROM public.assets WHERE id = p_asset_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Asset not found';
  END IF;
  IF v_org <> (SELECT org_id FROM public.profiles WHERE id = auth.uid()) THEN
    RAISE EXCEPTION 'Cross-organization access denied';
  END IF;

  INSERT INTO public.plantops_asset_details (asset_id, org_id, pot_material, pot_diameter_cm,
    pot_height_cm, pot_volume_liters, pot_has_drainage, pot_drainage_holes, pot_has_saucer,
    pot_reservoir, pot_notes)
  VALUES (p_asset_id, v_org, p_material, p_diameter_cm, p_height_cm, p_volume_liters,
    p_has_drainage, p_drainage_holes, p_has_saucer, p_reservoir, p_notes)
  ON CONFLICT (asset_id) DO UPDATE SET
    pot_material = EXCLUDED.pot_material,
    pot_diameter_cm = EXCLUDED.pot_diameter_cm,
    pot_height_cm = EXCLUDED.pot_height_cm,
    pot_volume_liters = EXCLUDED.pot_volume_liters,
    pot_has_drainage = EXCLUDED.pot_has_drainage,
    pot_drainage_holes = EXCLUDED.pot_drainage_holes,
    pot_has_saucer = EXCLUDED.pot_has_saucer,
    pot_reservoir = EXCLUDED.pot_reservoir,
    pot_notes = EXCLUDED.pot_notes,
    updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_set_pot_details(uuid, text, numeric, numeric, numeric, boolean, integer, boolean, boolean, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.plantops_set_pot_details(uuid, text, numeric, numeric, numeric, boolean, integer, boolean, boolean, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.plantops_set_pot_details(uuid, text, numeric, numeric, numeric, boolean, integer, boolean, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_set_pot_details(uuid, text, numeric, numeric, numeric, boolean, integer, boolean, boolean, text) TO service_role;