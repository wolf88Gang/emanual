import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ArrowLeft, Mail, Pencil } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlanEditorDialog } from '@/components/platform/PlanEditorDialog';
import { PlatformEmpty, PlatformError, PlatformLoading } from '@/components/platform/PlatformPageState';
import { fetchPlatformOrganizations, formatMoney, type PlatformOrganization } from '@/lib/platformAdmin';

export default function PlatformClientDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);

  const [org, setOrg] = useState<PlatformOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<PlatformOrganization | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const all = await fetchPlatformOrganizations();
      setOrg(all.find((row) => row.id === id) ?? null);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : l('Organization could not be loaded.', 'No se pudo cargar la organización.', 'Organisation konnte nicht geladen werden.'),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
      <Button variant="ghost" size="sm" className="-ml-2" onClick={() => navigate('/platform/clients')}>
        <ArrowLeft className="mr-1 h-4 w-4" />
        {l('Back to clients', 'Volver a clientes', 'Zurück zu Kunden')}
      </Button>

      {loading ? (
        <PlatformLoading />
      ) : error ? (
        <PlatformError message={error} retry={() => void load()} />
      ) : !org ? (
        <PlatformEmpty message={l('Organization not found.', 'Organización no encontrada.', 'Organisation nicht gefunden.')} />
      ) : (
        <>
          <header className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold">{org.name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {org.org_type} · {l('Created', 'Creada', 'Erstellt')} {format(new Date(org.created_at), 'MMM d, yyyy')}
              </p>
            </div>
            <Button onClick={() => setEditing(org)}>
              <Pencil className="mr-2 h-4 w-4" />
              {l('Edit plan', 'Editar plan', 'Plan bearbeiten')}
            </Button>
          </header>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{l('Billing plan', 'Plan de cobro', 'Abrechnungsplan')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {org.subscription ? (
                <>
                  <div className="flex items-center gap-2">
                    <Badge variant={org.subscription.status === 'active' ? 'default' : 'secondary'}>
                      {org.subscription.status}
                    </Badge>
                    <span className="capitalize">{org.subscription.plan_type}</span>
                    <span className="font-semibold">
                      {formatMoney(org.subscription.amount, org.subscription.currency)}
                    </span>
                  </div>
                  {org.subscription.current_period_end && (
                    <p className="text-muted-foreground">
                      {l('Period ends', 'El período termina', 'Zeitraum endet')}{' '}
                      {format(new Date(org.subscription.current_period_end), 'MMM d, yyyy')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">{l('No plan yet.', 'Aún sin plan.', 'Noch kein Plan.')}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {l('Members', 'Miembros', 'Mitglieder')} ({org.members.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {org.members.length === 0 ? (
                <p className="text-sm text-muted-foreground">{l('No members yet.', 'Sin miembros.', 'Keine Mitglieder.')}</p>
              ) : (
                org.members.map((member) => (
                  <div key={member.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{member.full_name || member.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                    </div>
                    <Button size="icon" variant="ghost" asChild aria-label={l('Email', 'Correo', 'E-Mail')}>
                      <a href={`mailto:${member.email}`}>
                        <Mail className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {l('Sites', 'Sitios', 'Standorte')} ({org.estates.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {org.estates.length === 0 ? (
                <p className="text-sm text-muted-foreground">{l('No sites yet.', 'Sin sitios.', 'Keine Standorte.')}</p>
              ) : (
                org.estates.map((estate) => (
                  <div key={estate.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                    <span className="truncate font-medium">{estate.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {estate.country ?? '—'} · {format(new Date(estate.created_at), 'MMM d, yyyy')}
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <PlanEditorDialog organization={editing} onOpenChange={(open) => !open && setEditing(null)} onSaved={load} />
        </>
      )}
    </div>
  );
}
