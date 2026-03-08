import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Bug, Zap, ChevronRight, ChevronLeft, Check, Send, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { format } from 'date-fns';

type Category = 'feature' | 'improvement' | 'bug';
type Priority = 'low' | 'medium' | 'high';

interface FeatureRequest {
  id: string;
  title: string;
  description: string;
  category: Category;
  priority: Priority;
  status: string;
  created_at: string;
}

export default function FeatureRequests() {
  const { user, profile } = useAuth();
  const { tl } = useLanguage();
  const l = (en: string, es: string, de: string) => tl({ en, es, de });

  const [step, setStep] = useState(0); // 0=list, 1=category, 2=details, 3=confirm, 4=done
  const [category, setCategory] = useState<Category>('feature');
  const [priority, setPriority] = useState<Priority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('feature_requests')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setRequests(data as FeatureRequest[]);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [user]);

  const resetWizard = () => {
    setStep(0);
    setCategory('feature');
    setPriority('medium');
    setTitle('');
    setDescription('');
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from('feature_requests').insert({
      user_id: user.id,
      org_id: profile?.org_id || null,
      category,
      priority,
      title: title.trim(),
      description: description.trim(),
    });
    setSubmitting(false);
    if (error) {
      toast.error(l('Error submitting request', 'Error al enviar solicitud', 'Fehler beim Senden'));
      return;
    }
    setStep(4);
    fetchRequests();
  };

  const categories: { value: Category; icon: React.ReactNode; label: string; desc: string }[] = [
    { value: 'feature', icon: <Lightbulb className="h-6 w-6" />, label: l('New Feature', 'Nueva funcionalidad', 'Neue Funktion'), desc: l('Request a new capability', 'Solicitar una nueva capacidad', 'Eine neue Fähigkeit anfordern') },
    { value: 'improvement', icon: <Zap className="h-6 w-6" />, label: l('Improvement', 'Mejora', 'Verbesserung'), desc: l('Enhance something existing', 'Mejorar algo existente', 'Etwas Bestehendes verbessern') },
    { value: 'bug', icon: <Bug className="h-6 w-6" />, label: l('Bug Report', 'Reporte de error', 'Fehlerbericht'), desc: l('Something isn\'t working right', 'Algo no funciona bien', 'Etwas funktioniert nicht richtig') },
  ];

  const statusColor = (s: string) => {
    if (s === 'pending') return 'secondary';
    if (s === 'in_review') return 'default';
    if (s === 'planned') return 'default';
    if (s === 'completed') return 'default';
    return 'outline';
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      pending: l('Pending', 'Pendiente', 'Ausstehend'),
      in_review: l('In Review', 'En revisión', 'In Prüfung'),
      planned: l('Planned', 'Planeado', 'Geplant'),
      completed: l('Completed', 'Completado', 'Abgeschlossen'),
      rejected: l('Rejected', 'Rechazado', 'Abgelehnt'),
    };
    return map[s] || s;
  };

  // Step 0: List + New button
  if (step === 0) {
    return (
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{l('Feature Requests', 'Solicitudes', 'Anfragen')}</h1>
            <p className="text-sm text-muted-foreground">{l('Suggest improvements or report issues', 'Sugiere mejoras o reporta problemas', 'Verbesserungen vorschlagen oder Probleme melden')}</p>
          </div>
          <Button onClick={() => setStep(1)}>
            <Send className="h-4 w-4 mr-2" />
            {l('New Request', 'Nueva solicitud', 'Neue Anfrage')}
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">{l('Loading...', 'Cargando...', 'Laden...')}</div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">{l('No requests yet. Submit your first idea!', 'Sin solicitudes aún. ¡Envía tu primera idea!', 'Noch keine Anfragen. Reichen Sie Ihre erste Idee ein!')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardContent className="py-4 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">{r.category}</Badge>
                      <Badge variant={statusColor(r.status)} className="text-xs">{statusLabel(r.status)}</Badge>
                    </div>
                    <p className="font-medium text-foreground truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap">
                    <Clock className="h-3 w-3" />
                    {format(new Date(r.created_at), 'MMM d')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Step 1: Category
  if (step === 1) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{l('Step 1 of 3', 'Paso 1 de 3', 'Schritt 1 von 3')}</p>
          <h2 className="text-xl font-bold text-foreground">{l('What type of request?', '¿Qué tipo de solicitud?', 'Welche Art von Anfrage?')}</h2>
        </div>
        <div className="space-y-3">
          {categories.map((c) => (
            <Card
              key={c.value}
              className={`cursor-pointer transition-all hover:border-primary/50 ${category === c.value ? 'border-primary ring-1 ring-primary/20' : ''}`}
              onClick={() => { setCategory(c.value); setStep(2); }}
            >
              <CardContent className="py-4 flex items-center gap-4">
                <div className="text-primary">{c.icon}</div>
                <div>
                  <p className="font-medium text-foreground">{c.label}</p>
                  <p className="text-xs text-muted-foreground">{c.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Button variant="ghost" onClick={resetWizard}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          {l('Cancel', 'Cancelar', 'Abbrechen')}
        </Button>
      </div>
    );
  }

  // Step 2: Details
  if (step === 2) {
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{l('Step 2 of 3', 'Paso 2 de 3', 'Schritt 2 von 3')}</p>
          <h2 className="text-xl font-bold text-foreground">{l('Describe your request', 'Describe tu solicitud', 'Beschreiben Sie Ihre Anfrage')}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground">{l('Title', 'Título', 'Titel')}</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={l('Brief summary...', 'Resumen breve...', 'Kurze Zusammenfassung...')}
              maxLength={100}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{l('Description', 'Descripción', 'Beschreibung')}</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={l('Explain in detail what you need...', 'Explica en detalle lo que necesitas...', 'Erklären Sie im Detail, was Sie brauchen...')}
              rows={5}
              maxLength={2000}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground">{l('Priority', 'Prioridad', 'Priorität')}</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{l('Low', 'Baja', 'Niedrig')}</SelectItem>
                <SelectItem value="medium">{l('Medium', 'Media', 'Mittel')}</SelectItem>
                <SelectItem value="high">{l('High', 'Alta', 'Hoch')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep(1)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {l('Back', 'Atrás', 'Zurück')}
          </Button>
          <Button className="ml-auto" disabled={!title.trim() || !description.trim()} onClick={() => setStep(3)}>
            {l('Review', 'Revisar', 'Überprüfen')}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // Step 3: Confirm
  if (step === 3) {
    const catLabel = categories.find(c => c.value === category)?.label || category;
    return (
      <div className="p-4 md:p-6 max-w-lg mx-auto space-y-6">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{l('Step 3 of 3', 'Paso 3 de 3', 'Schritt 3 von 3')}</p>
          <h2 className="text-xl font-bold text-foreground">{l('Confirm & Submit', 'Confirmar y enviar', 'Bestätigen & Senden')}</h2>
        </div>
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex gap-2">
              <Badge variant="outline" className="capitalize">{catLabel}</Badge>
              <Badge variant="secondary" className="capitalize">{priority}</Badge>
            </div>
            <p className="font-medium text-foreground">{title}</p>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{description}</p>
          </CardContent>
        </Card>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setStep(2)}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            {l('Edit', 'Editar', 'Bearbeiten')}
          </Button>
          <Button className="ml-auto" onClick={handleSubmit} disabled={submitting}>
            <Send className="h-4 w-4 mr-2" />
            {submitting ? l('Sending...', 'Enviando...', 'Senden...') : l('Submit', 'Enviar', 'Senden')}
          </Button>
        </div>
      </div>
    );
  }

  // Step 4: Success
  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <Card>
        <CardContent className="py-12 text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Check className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-foreground">{l('Request Submitted!', '¡Solicitud enviada!', 'Anfrage gesendet!')}</h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {l(
              'We\'ve received your request and will review it soon. You\'ll see status updates here.',
              'Hemos recibido tu solicitud y la revisaremos pronto. Verás actualizaciones de estado aquí.',
              'Wir haben Ihre Anfrage erhalten und werden sie bald prüfen. Sie sehen Statusaktualisierungen hier.'
            )}
          </p>
          <Button onClick={resetWizard}>
            {l('Back to Requests', 'Volver a solicitudes', 'Zurück zu Anfragen')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
