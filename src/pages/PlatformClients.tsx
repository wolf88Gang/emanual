import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { SidebarLayout } from '@/components/layout/SidebarLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Users, CreditCard, BarChart3, AlertTriangle, Search, Mail, Calendar, Building2, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface SubscriptionRow {
  id: string;
  org_id: string | null;
  user_id: string;
  status: string;
  plan_type: string;
  amount: number;
  currency: string;
  created_at: string;
  current_period_end: string | null;
}

/** One row per billable organization (tenant), never per user/profile. */
interface OrgClient {
  org_id: string;
  org_name: string;
  org_type: string | null;
  org_created_at: string;
  members_count: number;
  estates_count: number;
  primary_contact: { id: string; name: string; email: string } | null;
  subscription: SubscriptionRow | null;
}

export default function PlatformClients() {
  const { language } = useLanguage();
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);

  const [orgs, setOrgs] = useState<OrgClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    totalClients: 0,
    activeSubscriptions: 0,
    totalRevenue: 0,
    newThisMonth: 0,
  });
  const [editOrg, setEditOrg] = useState<OrgClient | null>(null);
  const [planStatus, setPlanStatus] = useState<string>('inactive');
  const [planType, setPlanType] = useState<string>('monthly');
  const [planAmount, setPlanAmount] = useState<string>('0');
  const [savingPlan, setSavingPlan] = useState(false);

  function openEditPlan(org: OrgClient) {
    setEditOrg(org);
    setPlanStatus(org.subscription?.status ?? 'inactive');
    setPlanType(org.subscription?.plan_type ?? 'monthly');
    setPlanAmount(String(org.subscription?.amount ?? 0));
  }

  async function savePlan() {
    if (!editOrg) return;
    setSavingPlan(true);
    try {
      const amount = Number(planAmount) || 0;
      let error;
      if (editOrg.subscription) {
        // Mutate by organization: updates the canonical subscription row of the tenant.
        ({ error } = await supabase
          .from('subscriptions')
          .update({ status: planStatus, plan_type: planType, amount, currency: 'USD' })
          .eq('org_id', editOrg.org_id));
      } else {
        if (!editOrg.primary_contact) {
          throw new Error(
            l(
              'This organization has no members yet, so no plan can be created.',
              'Esta organización aún no tiene miembros, no se puede crear un plan.',
              'Diese Organisation hat noch keine Mitglieder, es kann kein Plan erstellt werden.'
            )
          );
        }
        ({ error } = await supabase.from('subscriptions').insert({
          org_id: editOrg.org_id,
          // legacy NOT NULL column: kept pointing at the org admin contact
          user_id: editOrg.primary_contact.id,
          status: planStatus,
          plan_type: planType,
          amount,
          currency: 'USD',
        }));
      }
      if (error) throw error;
      toast.success(l('Plan updated', 'Plan actualizado', 'Plan aktualisiert'));
      setEditOrg(null);
      await fetchOrgClients();
    } catch (err: any) {
      toast.error(err.message ?? l('Failed to save', 'Error al guardar', 'Speichern fehlgeschlagen'));
    } finally {
      setSavingPlan(false);
    }
  }

  useEffect(() => {
    fetchOrgClients();
  }, []);

  async function fetchOrgClients() {
    try {
      setLoading(true);

      const [orgsRes, profilesRes, subsRes, estatesRes] = await Promise.all([
        supabase.from('organizations').select('id, name, org_type, created_at'),
        supabase.from('profiles').select('id, email, full_name, org_id, created_at'),
        supabase.from('subscriptions').select('*'),
        supabase.from('estates').select('id, org_id'),
      ]);

      if (orgsRes.error) throw orgsRes.error;

      const profiles = profilesRes.data ?? [];
      const subs = (subsRes.data ?? []) as SubscriptionRow[];
      const estates = estatesRes.data ?? [];

      const rows: OrgClient[] = (orgsRes.data ?? []).map((org) => {
        const members = profiles.filter((p) => p.org_id === org.id);
        // Legacy data may hold several rows per org (one per member) — pick a single
        // canonical subscription: prefer active, then the highest amount, then oldest.
        const orgSubs = subs
          .filter((s) => s.org_id === org.id || members.some((m) => m.id === s.user_id))
          .sort((a, b) => {
            if ((a.status === 'active') !== (b.status === 'active')) return a.status === 'active' ? -1 : 1;
            if (Number(b.amount) !== Number(a.amount)) return Number(b.amount) - Number(a.amount);
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          });
        const contact = members[0]
          ? { id: members[0].id, name: members[0].full_name || members[0].email.split('@')[0], email: members[0].email }
          : null;

        return {
          org_id: org.id,
          org_name: org.name,
          org_type: org.org_type,
          org_created_at: org.created_at,
          members_count: members.length,
          estates_count: estates.filter((e) => e.org_id === org.id).length,
          primary_contact: contact,
          subscription: orgSubs[0] ?? null,
        };
      });

      setOrgs(rows);

      const activeSubscriptions = rows.filter((o) => o.subscription?.status === 'active').length;
      const totalRevenue = rows.reduce(
        (sum, o) => sum + (o.subscription?.status === 'active' ? Number(o.subscription.amount) || 0 : 0),
        0
      );
      const now = new Date();
      const newThisMonth = rows.filter((o) => {
        const created = new Date(o.org_created_at);
        return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
      }).length;

      setStats({ totalClients: rows.length, activeSubscriptions, totalRevenue, newThisMonth });
    } catch (error) {
      console.error('Error fetching organization clients:', error);
    } finally {
      setLoading(false);
    }
  }

  const term = searchTerm.toLowerCase();
  const filtered = orgs.filter(
    (o) =>
      o.org_name.toLowerCase().includes(term) ||
      (o.org_type ?? '').toLowerCase().includes(term) ||
      (o.primary_contact?.email ?? '').toLowerCase().includes(term)
  );

  const quickActions = [
    { icon: Building2, label: l('Client Organizations', 'Organizaciones cliente', 'Kundenorganisationen'), count: stats.totalClients },
    { icon: CreditCard, label: l('Manage Plans', 'Gestionar Planes', 'Pläne verwalten'), count: stats.activeSubscriptions },
    { icon: BarChart3, label: l('View Metrics', 'Ver Métricas', 'Metriken ansehen'), count: `$${stats.totalRevenue.toFixed(0)}` },
    { icon: AlertTriangle, label: l('New this month', 'Nuevos este mes', 'Neu diesen Monat'), count: stats.newThisMonth },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground">
            {l('Client Management', 'Gestión de Clientes', 'Kundenverwaltung')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {l(
              'One row per billable organization',
              'Una fila por organización facturable',
              'Eine Zeile pro abrechenbarer Organisation'
            )}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif">{l('Quick Actions', 'Acciones Rápidas', 'Schnellaktionen')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Tooltip key={action.label}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-secondary/50 transition-all cursor-default">
                      <action.icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium text-foreground text-center">{action.label}</span>
                      <span className="text-sm font-bold text-primary">{action.count}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{action.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={l('Search organizations...', 'Buscar organizaciones...', 'Organisationen suchen...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {l('All Client Organizations', 'Todas las Organizaciones Cliente', 'Alle Kundenorganisationen')}
            </CardTitle>
            <CardDescription>
              {l(
                `${filtered.length} organizations found`,
                `${filtered.length} organizaciones encontradas`,
                `${filtered.length} Organisationen gefunden`
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">{l('Loading...', 'Cargando...', 'Wird geladen...')}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {l('No organizations found', 'No se encontraron organizaciones', 'Keine Organisationen gefunden')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((org) => (
                  <Card key={org.org_id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {org.org_name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground">{org.org_name}</h3>
                              <p className="text-sm text-muted-foreground capitalize">
                                {org.org_type?.replace(/_/g, ' ') || '—'}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {l('Members: ', 'Miembros: ', 'Mitglieder: ')}
                                {org.members_count}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {l('Properties: ', 'Propiedades: ', 'Immobilien: ')}
                                {org.estates_count}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {l('Joined: ', 'Registrado: ', 'Beigetreten: ')}
                                {format(new Date(org.org_created_at), 'MMM dd, yyyy')}
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-1">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {org.subscription
                                  ? `${org.subscription.plan_type} · $${org.subscription.amount}`
                                  : l('No plan', 'Sin plan', 'Kein Plan')}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">
                                {l('Subscribed: ', 'Suscrito: ', 'Abonniert: ')}
                                {org.subscription ? format(new Date(org.subscription.created_at), 'MMM dd, yyyy') : '—'}
                              </span>
                            </div>
                            {org.primary_contact && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground truncate">{org.primary_contact.email}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <Badge
                            variant={org.subscription?.status === 'active' ? 'default' : 'secondary'}
                            className="capitalize"
                          >
                            {org.subscription?.status === 'active'
                              ? l('Active', 'Activo', 'Aktiv')
                              : l('Inactive', 'Inactivo', 'Inaktiv')}
                          </Badge>

                          <div className="flex gap-1">
                            {org.primary_contact && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => window.open(`mailto:${org.primary_contact!.email}`)}
                                  >
                                    <Mail className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{l('Email contact', 'Enviar email', 'E-Mail senden')}</TooltipContent>
                              </Tooltip>
                            )}

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button size="sm" variant="outline" onClick={() => openEditPlan(org)}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>{l('Edit plan', 'Editar plan', 'Plan bearbeiten')}</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!editOrg} onOpenChange={(o) => !o && setEditOrg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {l('Edit plan', 'Editar plan', 'Plan bearbeiten')} — {editOrg?.org_name}
            </DialogTitle>
            <DialogDescription>
              {editOrg?.primary_contact
                ? `${l('Admin contact', 'Contacto administrativo', 'Admin-Kontakt')}: ${editOrg.primary_contact.email}`
                : l('Billable organization', 'Organización facturable', 'Abrechenbare Organisation')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{l('Status', 'Estado', 'Status')}</Label>
              <Select value={planStatus} onValueChange={setPlanStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{l('Active', 'Activo', 'Aktiv')}</SelectItem>
                  <SelectItem value="trial">{l('Trial', 'Prueba', 'Testphase')}</SelectItem>
                  <SelectItem value="inactive">{l('Inactive', 'Inactivo', 'Inaktiv')}</SelectItem>
                  <SelectItem value="cancelled">{l('Cancelled', 'Cancelado', 'Storniert')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{l('Plan type', 'Tipo de plan', 'Plantyp')}</Label>
              <Select value={planType} onValueChange={setPlanType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">{l('Monthly', 'Mensual', 'Monatlich')}</SelectItem>
                  <SelectItem value="annual">{l('Annual', 'Anual', 'Jährlich')}</SelectItem>
                  <SelectItem value="trial">{l('Trial', 'Prueba', 'Testphase')}</SelectItem>
                  <SelectItem value="unlimited">{l('Unlimited', 'Ilimitado', 'Unbegrenzt')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{l('Amount (USD)', 'Monto (USD)', 'Betrag (USD)')}</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={planAmount}
                onChange={(e) => setPlanAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOrg(null)}>
              {l('Cancel', 'Cancelar', 'Abbrechen')}
            </Button>
            <Button onClick={savePlan} disabled={savingPlan}>
              {savingPlan ? l('Saving...', 'Guardando...', 'Speichern...') : l('Save', 'Guardar', 'Speichern')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarLayout>
  );
}
