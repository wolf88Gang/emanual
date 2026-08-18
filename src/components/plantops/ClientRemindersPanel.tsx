import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  fetchReminderSettings,
  saveReminderSettings,
  DEFAULT_REMINDER_SETTINGS,
  type ReminderSettings,
} from '@/lib/plantopsComms';

interface Props {
  projects: { id: string; name: string }[];
}

/** Reminder configuration lives per project, because service terms differ per site. */
export function ClientRemindersPanel({ projects }: Props) {
  const { toast } = useToast();
  const { tl } = useLanguage();
  const l = (en: string, es: string) => tl({ en, es, de: en });

  const [estateId, setEstateId] = useState(projects[0]?.id ?? '');
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!estateId) return;
    setLoading(true);
    fetchReminderSettings(estateId)
      .then(setSettings)
      .catch((e) => toast({ title: l('Could not load reminders', 'No se pudieron cargar los recordatorios'), description: e.message, variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [estateId]);

  const save = async () => {
    if (!estateId) return;
    setSaving(true);
    try {
      await saveReminderSettings(estateId, settings);
      toast({ title: l('Reminders saved', 'Recordatorios guardados') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (projects.length === 0) return null;

  return (
    <Card><CardContent className="p-4 space-y-3">
      <div className="text-sm font-medium">{l('Reminder settings', 'Configuración de recordatorios')}</div>

      <div className="space-y-1">
        <Label>{l('Project', 'Proyecto')}</Label>
        <Select value={estateId} onValueChange={setEstateId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <>
          <div className="space-y-1">
            <Label>{l('Mode', 'Modo')}</Label>
            <Select value={settings.mode} onValueChange={(v) => setSettings({ ...settings, mode: v as ReminderSettings['mode'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">{l('Manual (queued for review)', 'Manual (queda en cola)')}</SelectItem>
                <SelectItem value="automatic">{l('Automatic (queued daily)', 'Automático (se encola a diario)')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{l('Send time', 'Hora de envío')}</Label>
              <Input type="time" value={settings.send_time} onChange={(e) => setSettings({ ...settings, send_time: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l('Timezone', 'Zona horaria')}</Label>
              <Input value={settings.timezone} onChange={(e) => setSettings({ ...settings, timezone: e.target.value })} />
            </div>
          </div>

          <div className="space-y-2 border-t border-border pt-3">
            {([
              ['include_amount', l('Include watering amount', 'Incluir cantidad de riego')],
              ['include_do_not_water', l('Include "do not water before" notices', 'Incluir avisos de "no regar antes de"')],
            ] as const).map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-2">
                <Label className="text-sm">{label}</Label>
                <Switch checked={!!(settings as any)[k]} onCheckedChange={(v) => setSettings({ ...settings, [k]: v })} />
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            {l(
              'Reminders only go to contacts who opted in, in their own language and channel.',
              'Los recordatorios solo llegan a los contactos suscritos, en su idioma y canal.',
            )}
          </p>

          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
          </Button>
        </>
      )}
    </CardContent></Card>
  );
}
