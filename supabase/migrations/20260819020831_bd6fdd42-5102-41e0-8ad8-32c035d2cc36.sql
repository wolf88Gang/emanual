ALTER TABLE public.client_message_outbox DROP CONSTRAINT IF EXISTS outbox_type_chk;
ALTER TABLE public.client_message_outbox ADD CONSTRAINT outbox_type_chk CHECK (message_type = ANY (ARRAY[
  'watering_due','watering_completed','do_not_water','care_issue','visit_reminder','visit_summary',
  'manual_ready','invoice_sent','invoice_overdue','light_check','fertilization','pruning','cleaning',
  'rotation','replacement','custom'
]));