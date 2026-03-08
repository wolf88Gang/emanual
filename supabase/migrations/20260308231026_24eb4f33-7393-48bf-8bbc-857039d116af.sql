
-- Function: auto-create task from weather alert when rule has auto_create_tasks = true
CREATE OR REPLACE FUNCTION public.auto_task_from_weather_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _rule RECORD;
BEGIN
  -- Only proceed if alert has a rule_id
  IF NEW.rule_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO _rule FROM weather_rules WHERE id = NEW.rule_id;

  IF _rule IS NULL OR NOT _rule.auto_create_tasks THEN
    RETURN NEW;
  END IF;

  INSERT INTO tasks (estate_id, title, title_es, description, description_es, priority, frequency, due_date, status)
  VALUES (
    NEW.estate_id,
    'Weather alert: ' || _rule.action_text,
    CASE WHEN _rule.action_text_es IS NOT NULL THEN 'Alerta climática: ' || _rule.action_text_es ELSE NULL END,
    'Auto-generated from weather alert fired at ' || to_char(NEW.fired_at, 'YYYY-MM-DD HH24:MI'),
    CASE WHEN _rule.action_text_es IS NOT NULL THEN 'Auto-generada por alerta climática disparada el ' || to_char(NEW.fired_at, 'YYYY-MM-DD HH24:MI') ELSE NULL END,
    1,
    'once',
    CURRENT_DATE,
    'pending'
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_weather_alert_auto_task
  AFTER INSERT ON public.weather_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_task_from_weather_alert();

-- Function: cancel pending tasks when an asset is deleted
CREATE OR REPLACE FUNCTION public.cancel_tasks_on_asset_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE tasks
  SET status = 'completed', description = COALESCE(description, '') || ' [Auto-closed: asset deleted]'
  WHERE asset_id = OLD.id
    AND status IN ('pending', 'in_progress');
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_cancel_tasks_on_asset_delete
  BEFORE DELETE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_tasks_on_asset_delete();
