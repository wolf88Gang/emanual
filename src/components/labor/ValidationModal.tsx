import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Clock, 
  MapPin, 
  Camera,
  Sparkles,
  Loader2
} from 'lucide-react';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import type { WorkerShift, DecisionType } from './types';

interface ValidationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: WorkerShift | null;
  language: string;
  onConfirm: (
    shiftId: string,
    status: 'approved' | 'adjusted' | 'rejected',
    decisionType: DecisionType,
    adjustedMinutes: number | null,
    originalMinutes: number,
    message: string,
    aiMessage: string
  ) => void;
}

const AI_TEMPLATES = {
  approval: {
    en: "Your work shift on {date} from {start} to {end} ({duration}) has been approved. Thank you for your dedication and punctuality.",
    es: "Tu turno de trabajo del {date} de {start} a {end} ({duration}) ha sido aprobado. Gracias por tu dedicación y puntualidad."
  },
  adjustment: {
    en: "Your work shift on {date} has been reviewed. The registered time of {original} has been adjusted to {adjusted}. Reason: {reason}. If you have questions, please discuss with your supervisor.",
    es: "Tu turno de trabajo del {date} ha sido revisado. El tiempo registrado de {original} se ha ajustado a {adjusted}. Motivo: {reason}. Si tienes preguntas, por favor consulta con tu supervisor."
  },
  rejection: {
    en: "Your work shift on {date} has been reviewed and cannot be approved at this time. Reason: {reason}. Please contact your supervisor to discuss this matter.",
    es: "Tu turno de trabajo del {date} ha sido revisado y no puede ser aprobado en este momento. Motivo: {reason}. Por favor contacta a tu supervisor para discutir este asunto."
  }
};

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

export function ValidationModal({ 
  open, 
  onOpenChange, 
  shift, 
  language,
  onConfirm 
}: ValidationModalProps) {
  const [decisionType, setDecisionType] = useState<DecisionType>('approval');
  const [adjustedHours, setAdjustedHours] = useState(0);
  const [adjustedMins, setAdjustedMins] = useState(0);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [aiMessage, setAiMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  const dateLocale = language === 'es' ? es : undefined;

  const originalMinutes = shift?.check_out_at && shift?.check_in_at
    ? differenceInMinutes(parseISO(shift.check_out_at), parseISO(shift.check_in_at))
    : 0;

  useEffect(() => {
    if (shift && open) {
      setDecisionType('approval');
      const hours = Math.floor(originalMinutes / 60);
      const mins = originalMinutes % 60;
      setAdjustedHours(hours);
      setAdjustedMins(mins);
      setReason('');
      setMessage('');
      setAiMessage('');
    }
  }, [shift, open, originalMinutes]);

  const generateAIMessage = () => {
    if (!shift) return;
    
    setGenerating(true);
    
    // Simulate AI generation (in production, this would call an API)
    setTimeout(() => {
      const template = AI_TEMPLATES[decisionType][language === 'es' ? 'es' : 'en'];
      const date = format(parseISO(shift.check_in_at), 'd MMMM yyyy', { locale: dateLocale });
      const start = format(parseISO(shift.check_in_at), 'HH:mm');
      const end = shift.check_out_at ? format(parseISO(shift.check_out_at), 'HH:mm') : '--:--';
      const adjustedTotal = adjustedHours * 60 + adjustedMins;
      
      let generated = template
        .replace('{date}', date)
        .replace('{start}', start)
        .replace('{end}', end)
        .replace('{duration}', formatMinutes(originalMinutes))
        .replace('{original}', formatMinutes(originalMinutes))
        .replace('{adjusted}', formatMinutes(adjustedTotal))
        .replace('{reason}', reason || (language === 'es' ? 'Ver detalles con supervisor' : 'See details with supervisor'));
      
      setAiMessage(generated);
      setMessage(generated);
      setGenerating(false);
    }, 800);
  };

  const handleConfirm = () => {
    if (!shift) return;
    
    const adjustedTotal = adjustedHours * 60 + adjustedMins;
    const status = decisionType === 'approval' ? 'approved' 
      : decisionType === 'adjustment' ? 'adjusted' 
      : 'rejected';
    
    onConfirm(
      shift.id,
      status,
      decisionType,
      decisionType === 'adjustment' ? adjustedTotal : null,
      originalMinutes,
      message,
      aiMessage
    );
    
    onOpenChange(false);
  };

  if (!shift) return null;

  const hasEvidence = shift.check_in_photo_url || shift.check_out_photo_url;
  const hasLocation = shift.check_in_lat && shift.check_in_lng;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {language === 'es' ? 'Validar Turno de Trabajo' : 'Validate Work Shift'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es' 
              ? 'Revisa la evidencia y toma una decisión documentada'
              : 'Review evidence and make a documented decision'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Shift Details */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {shift.user?.full_name || shift.user?.email}
              </span>
              <Badge variant="outline">
                {format(parseISO(shift.check_in_at), 'EEEE, d MMMM', { locale: dateLocale })}
              </Badge>
            </div>
            
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">{language === 'es' ? 'Entrada' : 'Check-in'}</div>
                  <div className="font-mono font-medium">
                    {format(parseISO(shift.check_in_at), 'HH:mm')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-muted-foreground">{language === 'es' ? 'Salida' : 'Check-out'}</div>
                  <div className="font-mono font-medium">
                    {shift.check_out_at ? format(parseISO(shift.check_out_at), 'HH:mm') : '--:--'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-muted-foreground">{language === 'es' ? 'Duración' : 'Duration'}</div>
                  <div className="font-mono font-medium text-primary">
                    {formatMinutes(originalMinutes)}
                  </div>
                </div>
              </div>
            </div>

            {/* Evidence indicators */}
            <div className="flex items-center gap-4 pt-2 border-t">
              {hasLocation && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <MapPin className="h-4 w-4" />
                  GPS {language === 'es' ? 'verificado' : 'verified'}
                </span>
              )}
              {hasEvidence && (
                <span className="flex items-center gap-1 text-sm text-emerald-600">
                  <Camera className="h-4 w-4" />
                  {language === 'es' ? 'Con evidencia fotográfica' : 'Photo evidence'}
                </span>
              )}
              {!hasLocation && !hasEvidence && (
                <span className="text-sm text-amber-600">
                  {language === 'es' ? 'Sin evidencia adicional' : 'No additional evidence'}
                </span>
              )}
            </div>

            {/* Photos */}
            {hasEvidence && (
              <div className="flex gap-2 pt-2">
                {shift.check_in_photo_url && (
                  <img 
                    src={shift.check_in_photo_url} 
                    alt="Check-in" 
                    className="w-20 h-20 object-cover rounded border"
                  />
                )}
                {shift.check_out_photo_url && (
                  <img 
                    src={shift.check_out_photo_url} 
                    alt="Check-out" 
                    className="w-20 h-20 object-cover rounded border"
                  />
                )}
              </div>
            )}

            {shift.notes && (
              <div className="text-sm italic bg-background/50 rounded p-2">
                "{shift.notes}"
              </div>
            )}
          </div>

          {/* Decision Type */}
          <div className="space-y-3">
            <Label>{language === 'es' ? 'Tipo de Decisión' : 'Decision Type'}</Label>
            <RadioGroup 
              value={decisionType} 
              onValueChange={(v) => setDecisionType(v as DecisionType)}
              className="grid grid-cols-3 gap-3"
            >
              <Label 
                htmlFor="approval" 
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  decisionType === 'approval' 
                    ? 'border-emerald-500 bg-emerald-500/10' 
                    : 'border-muted hover:border-emerald-500/50'
                }`}
              >
                <RadioGroupItem value="approval" id="approval" className="sr-only" />
                <CheckCircle2 className={`h-6 w-6 ${decisionType === 'approval' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                <span className={decisionType === 'approval' ? 'font-medium text-emerald-600' : ''}>
                  {language === 'es' ? 'Aprobar' : 'Approve'}
                </span>
              </Label>
              
              <Label 
                htmlFor="adjustment" 
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  decisionType === 'adjustment' 
                    ? 'border-amber-500 bg-amber-500/10' 
                    : 'border-muted hover:border-amber-500/50'
                }`}
              >
                <RadioGroupItem value="adjustment" id="adjustment" className="sr-only" />
                <Edit3 className={`h-6 w-6 ${decisionType === 'adjustment' ? 'text-amber-500' : 'text-muted-foreground'}`} />
                <span className={decisionType === 'adjustment' ? 'font-medium text-amber-600' : ''}>
                  {language === 'es' ? 'Ajustar' : 'Adjust'}
                </span>
              </Label>
              
              <Label 
                htmlFor="rejection" 
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  decisionType === 'rejection' 
                    ? 'border-destructive bg-destructive/10' 
                    : 'border-muted hover:border-destructive/50'
                }`}
              >
                <RadioGroupItem value="rejection" id="rejection" className="sr-only" />
                <XCircle className={`h-6 w-6 ${decisionType === 'rejection' ? 'text-destructive' : 'text-muted-foreground'}`} />
                <span className={decisionType === 'rejection' ? 'font-medium text-destructive' : ''}>
                  {language === 'es' ? 'Rechazar' : 'Reject'}
                </span>
              </Label>
            </RadioGroup>
          </div>

          {/* Adjustment fields */}
          {decisionType === 'adjustment' && (
            <div className="space-y-3 p-4 border rounded-lg bg-amber-500/5">
              <Label>{language === 'es' ? 'Tiempo Ajustado' : 'Adjusted Time'}</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={adjustedHours}
                  onChange={(e) => setAdjustedHours(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span>h</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={adjustedMins}
                  onChange={(e) => setAdjustedMins(parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <span>m</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({language === 'es' ? 'Original' : 'Original'}: {formatMinutes(originalMinutes)})
                </span>
              </div>
            </div>
          )}

          {/* Reason */}
          {(decisionType === 'adjustment' || decisionType === 'rejection') && (
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Motivo' : 'Reason'}</Label>
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={language === 'es' ? 'Ej: Llegó 30 minutos tarde' : 'E.g., Arrived 30 minutes late'}
              />
            </div>
          )}

          {/* AI Message Generation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{language === 'es' ? 'Mensaje de Decisión' : 'Decision Message'}</Label>
              <Button 
                variant="outline" 
                size="sm"
                onClick={generateAIMessage}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                {language === 'es' ? 'Generar con IA' : 'Generate with AI'}
              </Button>
            </div>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={language === 'es' 
                ? 'El mensaje será guardado como registro de la decisión...'
                : 'This message will be saved as a record of the decision...'}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {language === 'es' 
                ? 'Este mensaje queda registrado y puede ser revisado posteriormente.'
                : 'This message is recorded and can be reviewed later.'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleConfirm}
              className={
                decisionType === 'approval' ? 'bg-emerald-600 hover:bg-emerald-700' :
                decisionType === 'rejection' ? 'bg-destructive hover:bg-destructive/90' :
                'bg-amber-600 hover:bg-amber-700'
              }
            >
              {decisionType === 'approval' && (language === 'es' ? 'Confirmar Aprobación' : 'Confirm Approval')}
              {decisionType === 'adjustment' && (language === 'es' ? 'Confirmar Ajuste' : 'Confirm Adjustment')}
              {decisionType === 'rejection' && (language === 'es' ? 'Confirmar Rechazo' : 'Confirm Rejection')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
