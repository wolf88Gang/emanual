ALTER TABLE public.plant_placements
  ADD COLUMN IF NOT EXISTS send_water_reminders boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.plantops_set_water_reminders(p_placement_id uuid, p_enabled boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org uuid;
BEGIN
  v_org := public.plantops_require_admin();
  UPDATE public.plant_placements
     SET send_water_reminders = COALESCE(p_enabled, true),
         updated_at = now()
   WHERE id = p_placement_id AND org_id = v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Placement not found in your organization';
  END IF;
  RETURN jsonb_build_object('placement_id', p_placement_id, 'send_water_reminders', COALESCE(p_enabled, true));
END;
$function$;

CREATE OR REPLACE FUNCTION public.plantops_enqueue_due_client_reminders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      AND p.send_water_reminders
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
$function$;
