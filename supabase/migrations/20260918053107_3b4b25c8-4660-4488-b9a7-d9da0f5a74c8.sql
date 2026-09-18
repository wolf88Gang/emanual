-- Trigger / internal-only helpers: no direct API access at all
REVOKE ALL ON FUNCTION public.auto_task_from_weather_alert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cancel_tasks_on_asset_delete() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_on_task_assignment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.subscriptions_fill_org_id() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.user_can_write_asset_photo(text, uuid) FROM PUBLIC, anon, authenticated;

-- Signed-in only helpers
REVOKE ALL ON FUNCTION public.get_user_org_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_org_id(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_business_onboarding(text, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_business_onboarding(text, text, text, jsonb) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.complete_initial_onboarding(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_initial_onboarding(text, text, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_maintenance_history(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_maintenance_history(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_permissions(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_permissions(uuid, uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_plant_placements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_plant_placements(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_client_rental_contracts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_client_rental_contracts(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.plantops_set_water_reminders(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_set_water_reminders(uuid, boolean) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.plantops_update_share_link(uuid, boolean, boolean, boolean, boolean, boolean, text, timestamp with time zone, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.plantops_update_share_link(uuid, boolean, boolean, boolean, boolean, boolean, text, timestamp with time zone, boolean, boolean) TO authenticated, service_role;