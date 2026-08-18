-- =========================================================
-- 1. CLIENT CONTACTS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name text NOT NULL,
  role_label text,
  email text,
  phone_e164 text,
  preferred_language text NOT NULL DEFAULT 'es',
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  receive_care_reminders boolean NOT NULL DEFAULT true,
  receive_visit_summaries boolean NOT NULL DEFAULT false,
  receive_invoices boolean NOT NULL DEFAULT false,
  preferred_channels text[] NOT NULL DEFAULT '{}',
  cc_emails text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_contacts_lang_chk CHECK (preferred_language IN ('es','en','de')),
  CONSTRAINT client_contacts_channels_chk CHECK (preferred_channels <@ ARRAY['email','whatsapp']::text[]),
  CONSTRAINT client_contacts_email_channel_chk CHECK (
    NOT ('email' = ANY(preferred_channels)) OR (email IS NOT NULL AND email <> '')
  ),
  CONSTRAINT client_contacts_wa_channel_chk CHECK (
    NOT ('whatsapp' = ANY(preferred_channels)) OR (phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
  ),
  CONSTRAINT client_contacts_phone_chk CHECK (phone_e164 IS NULL OR phone_e164 ~ '^\+[1-9][0-9]{6,14}$')
);

CREATE INDEX IF NOT EXISTS client_contacts_client_idx ON public.client_contacts(client_id, is_active);

GRANT SELECT, INSERT, UPDATE ON public.client_contacts TO authenticated;
GRANT ALL ON public.client_contacts TO service_role;
ALTER TABLE public.client_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_contacts_admin_read ON public.client_contacts;
CREATE POLICY client_contacts_admin_read ON public.client_contacts
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
  );

DROP POLICY IF EXISTS client_contacts_admin_write ON public.client_contacts;
CREATE POLICY client_contacts_admin_write ON public.client_contacts
  FOR INSERT TO authenticated
  WITH CHECK (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
    AND EXISTS (SELECT 1 FROM public.clients c WHERE c.id = client_id AND c.org_id = org_id)
  );

DROP POLICY IF EXISTS client_contacts_admin_update ON public.client_contacts;
CREATE POLICY client_contacts_admin_update ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
  )
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

DROP TRIGGER IF EXISTS client_contacts_updated_at ON public.client_contacts;
CREATE TRIGGER client_contacts_updated_at BEFORE UPDATE ON public.client_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill legacy client contact data as the primary contact (legacy columns kept).
INSERT INTO public.client_contacts (org_id, client_id, name, role_label, email, phone_e164, is_primary, preferred_channels)
SELECT c.org_id, c.id, c.name, 'primary',
       NULLIF(c.email,''),
       CASE WHEN c.phone ~ '^\+[1-9][0-9]{6,14}$' THEN c.phone ELSE NULL END,
       true,
       CASE WHEN NULLIF(c.email,'') IS NOT NULL THEN ARRAY['email']::text[] ELSE '{}'::text[] END
FROM public.clients c
WHERE (NULLIF(c.email,'') IS NOT NULL OR NULLIF(c.phone,'') IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM public.client_contacts cc WHERE cc.client_id = c.id);

-- =========================================================
-- 2. CLIENT MESSAGE OUTBOX
-- =========================================================
CREATE TABLE IF NOT EXISTS public.client_message_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  estate_id uuid REFERENCES public.estates(id) ON DELETE SET NULL,
  contact_id uuid REFERENCES public.client_contacts(id) ON DELETE SET NULL,
  placement_id uuid REFERENCES public.plant_placements(id) ON DELETE SET NULL,
  message_type text NOT NULL,
  channel text NOT NULL,
  send_mode text NOT NULL DEFAULT 'manual',
  subject text,
  body text NOT NULL,
  cc_emails text[] NOT NULL DEFAULT '{}',
  scheduled_at timestamptz,
  status text NOT NULL DEFAULT 'queued',
  provider text,
  provider_message_id text,
  idempotency_key text NOT NULL UNIQUE,
  last_error text,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_type_chk CHECK (message_type IN (
    'watering_due','watering_completed','do_not_water','care_issue','visit_reminder',
    'visit_summary','manual_ready','invoice_sent','invoice_overdue','custom')),
  CONSTRAINT outbox_channel_chk CHECK (channel IN ('email','whatsapp')),
  CONSTRAINT outbox_mode_chk CHECK (send_mode IN ('manual','automatic')),
  CONSTRAINT outbox_status_chk CHECK (status IN ('queued','sending','sent','failed','blocked','cancelled'))
);

CREATE INDEX IF NOT EXISTS outbox_client_idx ON public.client_message_outbox(client_id, status);
CREATE INDEX IF NOT EXISTS outbox_dispatch_idx ON public.client_message_outbox(status, scheduled_at);

GRANT SELECT, INSERT, UPDATE ON public.client_message_outbox TO authenticated;
GRANT ALL ON public.client_message_outbox TO service_role;
ALTER TABLE public.client_message_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_admin_read ON public.client_message_outbox;
CREATE POLICY outbox_admin_read ON public.client_message_outbox
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
  );

DROP POLICY IF EXISTS outbox_admin_update ON public.client_message_outbox;
CREATE POLICY outbox_admin_update ON public.client_message_outbox
  FOR UPDATE TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
  )
  WITH CHECK (org_id = public.get_user_org_id(auth.uid()));

DROP TRIGGER IF EXISTS outbox_updated_at ON public.client_message_outbox;
CREATE TRIGGER outbox_updated_at BEFORE UPDATE ON public.client_message_outbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. AGGREGATED CLIENT PORTAL LINKS
-- =========================================================
CREATE TABLE IF NOT EXISTS public.client_portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  show_projects boolean NOT NULL DEFAULT true,
  show_plants boolean NOT NULL DEFAULT true,
  show_care boolean NOT NULL DEFAULT true,
  show_manuals boolean NOT NULL DEFAULT true,
  show_visits boolean NOT NULL DEFAULT true,
  show_invoices boolean NOT NULL DEFAULT false,
  show_documents boolean NOT NULL DEFAULT false,
  contact_note text,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_portal_links_client_idx ON public.client_portal_links(client_id, revoked_at);

GRANT SELECT ON public.client_portal_links TO authenticated;
GRANT ALL ON public.client_portal_links TO service_role;
ALTER TABLE public.client_portal_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_portal_links_admin_read ON public.client_portal_links;
CREATE POLICY client_portal_links_admin_read ON public.client_portal_links
  FOR SELECT TO authenticated
  USING (
    org_id = public.get_user_org_id(auth.uid())
    AND (public.has_role(auth.uid(),'owner') OR public.has_role(auth.uid(),'manager'))
  );

DROP TRIGGER IF EXISTS client_portal_links_updated_at ON public.client_portal_links;
CREATE TRIGGER client_portal_links_updated_at BEFORE UPDATE ON public.client_portal_links
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 4. PORTAL LINK RPCs (token hash produced by the caller)
-- =========================================================
CREATE OR REPLACE FUNCTION public.plantops_create_client_portal_link(
  p_client_id uuid,
  p_token_hash text,
  p_show_projects boolean DEFAULT true,
  p_show_plants boolean DEFAULT true,
  p_show_care boolean DEFAULT true,
  p_show_manuals boolean DEFAULT true,
  p_show_visits boolean DEFAULT true,
  p_show_invoices boolean DEFAULT false,
  p_show_documents boolean DEFAULT false,
  p_contact_note text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_id uuid;
BEGIN
  v_org := public.plantops_require_admin();
  IF length(COALESCE(p_token_hash,'')) < 32 THEN RAISE EXCEPTION 'Invalid token hash'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Client not found in your organization';
  END IF;

  UPDATE public.client_portal_links SET revoked_at = now()
  WHERE client_id = p_client_id AND org_id = v_org AND revoked_at IS NULL;

  INSERT INTO public.client_portal_links (
    org_id, client_id, token_hash, show_projects, show_plants, show_care, show_manuals,
    show_visits, show_invoices, show_documents, contact_note, expires_at, created_by
  ) VALUES (
    v_org, p_client_id, p_token_hash, p_show_projects, p_show_plants, p_show_care, p_show_manuals,
    p_show_visits, p_show_invoices, p_show_documents, p_contact_note, p_expires_at, auth.uid()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_rotate_client_portal_link(
  p_link_id uuid,
  p_token_hash text
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_old public.client_portal_links; v_id uuid;
BEGIN
  v_org := public.plantops_require_admin();
  IF length(COALESCE(p_token_hash,'')) < 32 THEN RAISE EXCEPTION 'Invalid token hash'; END IF;
  SELECT * INTO v_old FROM public.client_portal_links WHERE id = p_link_id AND org_id = v_org;
  IF v_old.id IS NULL THEN RAISE EXCEPTION 'Portal link not found'; END IF;

  INSERT INTO public.client_portal_links (
    org_id, client_id, token_hash, show_projects, show_plants, show_care, show_manuals,
    show_visits, show_invoices, show_documents, contact_note, expires_at, created_by
  ) VALUES (
    v_old.org_id, v_old.client_id, p_token_hash, v_old.show_projects, v_old.show_plants,
    v_old.show_care, v_old.show_manuals, v_old.show_visits, v_old.show_invoices,
    v_old.show_documents, v_old.contact_note, v_old.expires_at, auth.uid()
  ) RETURNING id INTO v_id;

  UPDATE public.client_portal_links SET revoked_at = now() WHERE id = v_old.id AND revoked_at IS NULL;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_update_client_portal_link(
  p_link_id uuid,
  p_show_projects boolean,
  p_show_plants boolean,
  p_show_care boolean,
  p_show_manuals boolean,
  p_show_visits boolean,
  p_show_invoices boolean,
  p_show_documents boolean,
  p_contact_note text DEFAULT NULL,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.client_portal_links SET
    show_projects = p_show_projects, show_plants = p_show_plants, show_care = p_show_care,
    show_manuals = p_show_manuals, show_visits = p_show_visits, show_invoices = p_show_invoices,
    show_documents = p_show_documents, contact_note = p_contact_note, expires_at = p_expires_at
  WHERE id = p_link_id AND org_id = v_org;
  IF NOT FOUND THEN RAISE EXCEPTION 'Portal link not found'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_revoke_client_portal_link(p_link_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.client_portal_links SET revoked_at = now()
  WHERE id = p_link_id AND org_id = v_org AND revoked_at IS NULL;
END;
$$;

-- =========================================================
-- 5. OUTBOX RPCs
-- =========================================================
CREATE OR REPLACE FUNCTION public.plantops_queue_message(
  p_client_id uuid,
  p_message_type text,
  p_channel text,
  p_body text,
  p_subject text DEFAULT NULL,
  p_estate_id uuid DEFAULT NULL,
  p_contact_id uuid DEFAULT NULL,
  p_placement_id uuid DEFAULT NULL,
  p_cc_emails text[] DEFAULT '{}',
  p_scheduled_at timestamptz DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL,
  p_send_mode text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid; v_id uuid; v_key text;
BEGIN
  v_org := public.plantops_require_admin();
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE id = p_client_id AND org_id = v_org) THEN
    RAISE EXCEPTION 'Client not found in your organization';
  END IF;
  IF p_estate_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.estates WHERE id = p_estate_id AND org_id = v_org AND client_id = p_client_id
  ) THEN RAISE EXCEPTION 'Project does not belong to this client'; END IF;
  IF p_contact_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.client_contacts WHERE id = p_contact_id AND org_id = v_org AND client_id = p_client_id
  ) THEN RAISE EXCEPTION 'Contact does not belong to this client'; END IF;

  v_key := COALESCE(NULLIF(p_idempotency_key,''),
    p_message_type || ':' || p_client_id::text || ':' || COALESCE(p_contact_id::text,'-') || ':' ||
    p_channel || ':' || gen_random_uuid()::text);

  INSERT INTO public.client_message_outbox (
    org_id, client_id, estate_id, contact_id, placement_id, message_type, channel, send_mode,
    subject, body, cc_emails, scheduled_at, idempotency_key, created_by
  ) VALUES (
    v_org, p_client_id, p_estate_id, p_contact_id, p_placement_id, p_message_type, p_channel,
    p_send_mode, p_subject, p_body, COALESCE(p_cc_emails,'{}'), COALESCE(p_scheduled_at, now()),
    v_key, auth.uid()
  )
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.client_message_outbox WHERE idempotency_key = v_key;
  END IF;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_mark_message_sent(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.client_message_outbox
  SET status = 'sent', sent_at = now(), send_mode = 'manual', provider = 'manual',
      created_by = COALESCE(created_by, auth.uid()), last_error = NULL
  WHERE id = p_message_id AND org_id = v_org AND status IN ('queued','blocked','failed','sending');
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found or not sendable'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_cancel_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.client_message_outbox SET status = 'cancelled'
  WHERE id = p_message_id AND org_id = v_org AND status IN ('queued','blocked','failed');
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not found or not cancellable'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.plantops_retry_message(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.client_message_outbox
  SET status = 'queued', last_error = NULL, scheduled_at = now()
  WHERE id = p_message_id AND org_id = v_org AND status IN ('failed','blocked');
  IF NOT FOUND THEN RAISE EXCEPTION 'Message not retryable'; END IF;
END;
$$;

-- =========================================================
-- 6. IDEMPOTENT AUTOMATIC ENQUEUE OF DUE CLIENT REMINDERS
-- =========================================================
CREATE OR REPLACE FUNCTION public.plantops_enqueue_due_client_reminders()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  v_count integer := 0;
  v_plan jsonb;
  v_lang text;
  v_body text;
  v_subject text;
  v_key text;
  v_sched timestamptz;
BEGIN
  FOR r IN
    SELECT p.id AS placement_id, p.estate_id, p.next_water_due, p.water_amount_note,
           p.spot_label, p.care_responsibility,
           e.client_id, e.org_id, e.name AS estate_name,
           e.plantops_service_plan_json AS plan,
           a.name AS plant_name,
           z.name AS zone_name,
           cc.id AS contact_id, cc.preferred_language, cc.preferred_channels,
           cc.email, cc.phone_e164, cc.cc_emails
    FROM public.plant_placements p
    JOIN public.estates e ON e.id = p.estate_id
    JOIN public.client_contacts cc ON cc.client_id = e.client_id AND cc.org_id = e.org_id
    LEFT JOIN public.assets a ON a.id = p.asset_id
    LEFT JOIN public.zones z ON z.id = p.zone_id
    WHERE p.status = 'installed'
      AND p.next_water_due IS NOT NULL
      AND p.next_water_due <= CURRENT_DATE
      AND p.care_responsibility IN ('cliente','compartido')
      AND cc.is_active AND cc.receive_care_reminders
      AND COALESCE(e.plantops_service_plan_json->'reminder_settings'->>'mode','manual') = 'automatic'
  LOOP
    v_plan := COALESCE(r.plan->'reminder_settings','{}'::jsonb);
    v_lang := COALESCE(r.preferred_language,'es');
    v_sched := (CURRENT_DATE::text || ' ' || COALESCE(v_plan->>'send_time','08:00'))::timestamp
               AT TIME ZONE COALESCE(v_plan->>'timezone','America/Costa_Rica');

    IF v_lang = 'en' THEN
      v_subject := 'You may water today: ' || COALESCE(r.plant_name,'plant');
      v_body := 'YOU MAY WATER TODAY' || E'\n\n' || COALESCE(r.plant_name,'Plant') || E'\n' ||
                COALESCE(r.estate_name,'') || E'\n' || COALESCE(NULLIF(concat_ws(' · ', r.zone_name, r.spot_label),''),'') ||
                E'\n\nAmount:' || E'\n' || COALESCE(r.water_amount_note,'as indicated') ||
                E'\n\nAfter watering it, do not water it again until you receive the next notice.';
    ELSIF v_lang = 'de' THEN
      v_subject := 'Heute darf gegossen werden: ' || COALESCE(r.plant_name,'Pflanze');
      v_body := 'HEUTE GIESSEN ERLAUBT' || E'\n\n' || COALESCE(r.plant_name,'Pflanze') || E'\n' ||
                COALESCE(r.estate_name,'') || E'\n' || COALESCE(NULLIF(concat_ws(' · ', r.zone_name, r.spot_label),''),'') ||
                E'\n\nMenge:' || E'\n' || COALESCE(r.water_amount_note,'wie angegeben') ||
                E'\n\nNach dem Gießen bitte erst beim nächsten Hinweis wieder gießen.';
    ELSE
      v_subject := 'Puede regar hoy: ' || COALESCE(r.plant_name,'planta');
      v_body := 'PUEDE REGAR HOY' || E'\n\n' || COALESCE(r.plant_name,'Planta') || E'\n' ||
                COALESCE(r.estate_name,'') || E'\n' || COALESCE(NULLIF(concat_ws(' · ', r.zone_name, r.spot_label),''),'') ||
                E'\n\nCantidad:' || E'\n' || COALESCE(r.water_amount_note,'según indicación') ||
                E'\n\nDespués de regarla, no vuelva a regarla hasta recibir el próximo aviso.';
    END IF;

    -- one row per contact and channel, deduplicated by idempotency key
    IF 'email' = ANY(r.preferred_channels) AND COALESCE(r.email,'') <> '' THEN
      v_key := 'watering_due:' || r.placement_id::text || ':' || r.next_water_due::text || ':' || r.contact_id::text || ':email';
      INSERT INTO public.client_message_outbox (
        org_id, client_id, estate_id, contact_id, placement_id, message_type, channel, send_mode,
        subject, body, cc_emails, scheduled_at, idempotency_key
      ) VALUES (
        r.org_id, r.client_id, r.estate_id, r.contact_id, r.placement_id, 'watering_due', 'email',
        'automatic', v_subject, v_body, COALESCE(r.cc_emails,'{}'), v_sched, v_key
      ) ON CONFLICT (idempotency_key) DO NOTHING;
      IF FOUND THEN v_count := v_count + 1; END IF;
    END IF;

    IF 'whatsapp' = ANY(r.preferred_channels) AND COALESCE(r.phone_e164,'') <> '' THEN
      v_key := 'watering_due:' || r.placement_id::text || ':' || r.next_water_due::text || ':' || r.contact_id::text || ':whatsapp';
      INSERT INTO public.client_message_outbox (
        org_id, client_id, estate_id, contact_id, placement_id, message_type, channel, send_mode,
        subject, body, scheduled_at, idempotency_key
      ) VALUES (
        r.org_id, r.client_id, r.estate_id, r.contact_id, r.placement_id, 'watering_due', 'whatsapp',
        'automatic', NULL, v_body, v_sched, v_key
      ) ON CONFLICT (idempotency_key) DO NOTHING;
      IF FOUND THEN v_count := v_count + 1; END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.plantops_enqueue_due_client_reminders() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.plantops_enqueue_due_client_reminders() TO service_role, authenticated;