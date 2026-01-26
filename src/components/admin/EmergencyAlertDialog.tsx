import React, { useState } from 'react';
import { AlertTriangle, Bell, Send, Loader2, Users } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface EmergencyAlertDialogProps {
  onAlertSent?: () => void;
}

type AlertSeverity = 'info' | 'warning' | 'critical';

interface SeverityConfig {
  label: { en: string; es: string };
  icon: string;
  color: string;
}

const severityConfigs: Record<AlertSeverity, SeverityConfig> = {
  info: {
    label: { en: 'Information', es: 'Información' },
    icon: '📢',
    color: 'bg-info/20 text-info border-info/30',
  },
  warning: {
    label: { en: 'Warning', es: 'Advertencia' },
    icon: '⚠️',
    color: 'bg-warning/20 text-warning border-warning/30',
  },
  critical: {
    label: { en: 'Emergency', es: 'Emergencia' },
    icon: '🚨',
    color: 'bg-destructive/20 text-destructive border-destructive/30',
  },
};

const quickTemplates = [
  {
    id: 'evacuation',
    severity: 'critical' as AlertSeverity,
    en: 'URGENT: Evacuate all personnel from the property immediately. Report to designated meeting point.',
    es: 'URGENTE: Evacuar todo el personal de la propiedad inmediatamente. Reportarse al punto de encuentro designado.',
  },
  {
    id: 'storm',
    severity: 'warning' as AlertSeverity,
    en: 'Storm approaching. Secure all loose items and move equipment to shelter. Stay alert.',
    es: 'Tormenta aproximándose. Asegurar objetos sueltos y mover equipo a refugio. Manténgase alerta.',
  },
  {
    id: 'power',
    severity: 'warning' as AlertSeverity,
    en: 'Power outage reported. Check irrigation and lighting systems. Report any issues.',
    es: 'Corte de electricidad reportado. Revisar sistemas de riego e iluminación. Reportar cualquier problema.',
  },
  {
    id: 'meeting',
    severity: 'info' as AlertSeverity,
    en: 'Team meeting in 15 minutes. Please report to the main house.',
    es: 'Reunión del equipo en 15 minutos. Por favor reportarse a la casa principal.',
  },
];

export function EmergencyAlertDialog({ onAlertSent }: EmergencyAlertDialogProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [severity, setSeverity] = useState<AlertSeverity>('warning');
  const [messageEn, setMessageEn] = useState('');
  const [messageEs, setMessageEs] = useState('');

  function applyTemplate(templateId: string) {
    const template = quickTemplates.find(t => t.id === templateId);
    if (template) {
      setSeverity(template.severity);
      setMessageEn(template.en);
      setMessageEs(template.es);
    }
  }

  async function handleSendAlert() {
    if (!currentEstate) {
      toast.error(language === 'es' ? 'Seleccione una finca' : 'Select an estate');
      return;
    }

    if (!messageEn.trim() && !messageEs.trim()) {
      toast.error(language === 'es' ? 'Ingrese un mensaje' : 'Enter a message');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('weather_alerts')
        .insert({
          estate_id: currentEstate.id,
          severity,
          message: messageEn.trim() || messageEs.trim(),
          message_es: messageEs.trim() || messageEn.trim(),
          status: 'active',
          fired_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success(
        language === 'es'
          ? '🚨 Alerta enviada a todo el equipo'
          : '🚨 Alert sent to all team members',
        {
          duration: 5000,
        }
      );

      setOpen(false);
      resetForm();
      onAlertSent?.();
    } catch (error: any) {
      console.error('Error sending alert:', error);
      toast.error(error.message || (language === 'es' ? 'Error al enviar' : 'Failed to send'));
    } finally {
      setSending(false);
    }
  }

  function resetForm() {
    setSeverity('warning');
    setMessageEn('');
    setMessageEs('');
  }

  const config = severityConfigs[severity];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          {language === 'es' ? 'Alerta Rápida' : 'Quick Alert'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-destructive" />
            {language === 'es' ? 'Enviar Alerta de Emergencia' : 'Send Emergency Alert'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es'
              ? 'Esta alerta será visible para todo el equipo inmediatamente'
              : 'This alert will be visible to all team members immediately'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Quick Templates */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              {language === 'es' ? 'Plantillas Rápidas' : 'Quick Templates'}
            </Label>
            <div className="flex flex-wrap gap-2">
              {quickTemplates.map((template) => (
                <Button
                  key={template.id}
                  variant="outline"
                  size="sm"
                  onClick={() => applyTemplate(template.id)}
                  className="text-xs"
                >
                  {severityConfigs[template.severity].icon}{' '}
                  {template.id === 'evacuation' && (language === 'es' ? 'Evacuación' : 'Evacuation')}
                  {template.id === 'storm' && (language === 'es' ? 'Tormenta' : 'Storm')}
                  {template.id === 'power' && (language === 'es' ? 'Electricidad' : 'Power')}
                  {template.id === 'meeting' && (language === 'es' ? 'Reunión' : 'Meeting')}
                </Button>
              ))}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Severidad' : 'Severity'}</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as AlertSeverity)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(severityConfigs) as AlertSeverity[]).map((sev) => (
                  <SelectItem key={sev} value={sev}>
                    <span className="flex items-center gap-2">
                      {severityConfigs[sev].icon}
                      {language === 'es' 
                        ? severityConfigs[sev].label.es 
                        : severityConfigs[sev].label.en}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview */}
          <div className={`p-3 rounded-lg border ${config.color}`}>
            <div className="flex items-center gap-2 font-medium">
              <span className="text-xl">{config.icon}</span>
              {language === 'es' ? config.label.es : config.label.en}
            </div>
          </div>

          {/* Message (English) */}
          <div className="space-y-2">
            <Label htmlFor="message-en">
              {language === 'es' ? 'Mensaje (Inglés)' : 'Message (English)'}
            </Label>
            <Textarea
              id="message-en"
              value={messageEn}
              onChange={(e) => setMessageEn(e.target.value)}
              placeholder="Enter alert message in English..."
              rows={3}
            />
          </div>

          {/* Message (Spanish) */}
          <div className="space-y-2">
            <Label htmlFor="message-es">
              {language === 'es' ? 'Mensaje (Español)' : 'Message (Spanish)'}
            </Label>
            <Textarea
              id="message-es"
              value={messageEs}
              onChange={(e) => setMessageEs(e.target.value)}
              placeholder="Ingrese el mensaje de alerta en español..."
              rows={3}
            />
          </div>

          {/* Recipients info */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {language === 'es'
              ? 'La alerta será visible para todos los miembros del equipo en la propiedad'
              : 'Alert will be visible to all team members on the property'}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleSendAlert} 
              disabled={sending || (!messageEn.trim() && !messageEs.trim())}
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'es' ? 'Enviando...' : 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {language === 'es' ? 'Enviar Alerta' : 'Send Alert'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
