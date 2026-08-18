REVOKE ALL ON FUNCTION public.plantops_create_client_portal_link(uuid,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_rotate_client_portal_link(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_update_client_portal_link(uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,timestamptz) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_revoke_client_portal_link(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_queue_message(uuid,text,text,text,text,uuid,uuid,uuid,text[],timestamptz,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_mark_message_sent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_cancel_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_retry_message(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.plantops_enqueue_due_client_reminders() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.plantops_create_client_portal_link(uuid,text,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_rotate_client_portal_link(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_update_client_portal_link(uuid,boolean,boolean,boolean,boolean,boolean,boolean,boolean,text,timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_revoke_client_portal_link(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_queue_message(uuid,text,text,text,text,uuid,uuid,uuid,text[],timestamptz,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_mark_message_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_cancel_message(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_retry_message(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.plantops_enqueue_due_client_reminders() TO service_role;