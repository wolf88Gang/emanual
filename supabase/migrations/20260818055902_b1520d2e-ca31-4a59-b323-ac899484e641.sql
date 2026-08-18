CREATE OR REPLACE FUNCTION public.plantops_update_share_link(
  p_link_id uuid,
  p_show_plants boolean DEFAULT NULL,
  p_show_manual boolean DEFAULT NULL,
  p_show_last_visit boolean DEFAULT NULL,
  p_show_history boolean DEFAULT NULL,
  p_show_balance boolean DEFAULT NULL,
  p_contact_note text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL,
  p_clear_expiry boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  v_org := public.plantops_require_internal();

  UPDATE public.estate_share_links
  SET show_plants = COALESCE(p_show_plants, show_plants),
      show_manual = COALESCE(p_show_manual, show_manual),
      show_last_visit = COALESCE(p_show_last_visit, show_last_visit),
      show_history = COALESCE(p_show_history, show_history),
      show_balance = COALESCE(p_show_balance, show_balance),
      contact_note = COALESCE(NULLIF(btrim(p_contact_note), ''), contact_note),
      expires_at = CASE WHEN p_clear_expiry THEN NULL ELSE COALESCE(p_expires_at, expires_at) END,
      updated_at = now()
  WHERE id = p_link_id AND org_id = v_org AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share link not found or already revoked';
  END IF;
END;
$function$;

REVOKE ALL ON FUNCTION public.plantops_update_share_link(uuid, boolean, boolean, boolean, boolean, boolean, text, timestamptz, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_update_share_link(uuid, boolean, boolean, boolean, boolean, boolean, text, timestamptz, boolean) TO authenticated;