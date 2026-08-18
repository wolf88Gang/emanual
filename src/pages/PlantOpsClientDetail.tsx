import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Loader2, ArrowLeft, Plus, Droplets, AlertTriangle, Share2, FileText, ClipboardList, Archive, Settings2,
} from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrgType } from '@/hooks/usePlantOps';
import {
  fetchClientDetail,
  fetchOrgModules,
  updateClientContact,
  saveProjectPlanPatch,
  PROJECT_CAPABILITY_KEYS,
  PORTAL_VISIBILITY_KEYS,
  CAPABILITY_LABELS,
  PORTAL_VISIBILITY_LABELS,
  DEFAULT_ORG_MODULES,
  type ClientDetailData,
  type ClientProjectRow,
  type CurrencyBalance,
} from '@/lib/plantopsClients';
import { fetchServicePlan } from '@/lib/plantopsProperty';
import { ClientContactsPanel } from '@/components/plantops/ClientContactsPanel';
import { ClientOutboxPanel } from '@/components/plantops/ClientOutboxPanel';
import { ClientPortalPanel } from '@/components/plantops/ClientPortalPanel';
import { ClientRemindersPanel } from '@/components/plantops/ClientRemindersPanel';

const fmt = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * Client detail: the client of the service organization, with all its projects.
 * Operational depth stays in `/plantops/propiedad/:estateId` — never duplicated here.
 */
export default function PlantOpsClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, tl } = useLanguage();
  const { orgId } = useOrgType();
  const l = (en: string, es: string, de?: string) => tl({ en, es, de: de || en });

  const [data, setData] = useState<ClientDetailData | null>(null);
  const [orgModules, setOrgModules] = useState<Record<string, boolean>>(DEFAULT_ORG_MODULES);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(searchParams.get('tab') || 'resumen');

  const [contactOpen, setContactOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [saving, setSaving] = useState(false);

  const [capProject, setCapProject] = useState<ClientProjectRow | null>(null);
  const [caps, setCaps] = useState<Record<string, boolean>>({});
  const [portalVis, setPortalVis] = useState<Record<string, boolean>>({});

  const load = async () => {
    if (!orgId || !clientId) return;
    setLoading(true);
    try {
      const [d, m] = await Promise.all([fetchClientDetail(orgId, clientId), fetchOrgModules(orgId)]);
      setData(d);
      setOrgModules(m);
      setForm({ name: d.client.name, email: d.client.email ?? '', phone: d.client.phone ?? '', address: d.client.address ?? '' });
      document.title = `${d.client.name} | PlantOps`;
    } catch (e: any) {
      toast({ title: l('Could not load client', 'No se pudo cargar el cliente'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId, clientId]);

  const saveContact = async () => {
    if (!clientId) return;
    setSaving(true);
    try {
      await updateClientContact(clientId, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
      });
      setContactOpen(false);
      await load();
      toast({ title: l('Contact updated', 'Contacto actualizado') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const openCapabilities = async (p: ClientProjectRow) => {
    setCapProject(p);
    const plan = await fetchServicePlan(p.id);
    setCaps({ ...p.capabilities });
    setPortalVis({ ...(plan.portal_visibility || {}) });
  };

  const saveCapabilities = async () => {
    if (!capProject) return;
    setSaving(true);
    try {
      await saveProjectPlanPatch(capProject.id, { capabilities: caps, portal_visibility: portalVis });
      setCapProject(null);
      await load();
      toast({ title: l('Capabilities saved', 'Capacidades guardadas') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const archiveProject = async (p: ClientProjectRow) => {
    try {
      await saveProjectPlanPatch(p.id, { project_status: 'archived' });
      await load();
      toast({ title: l('Project archived', 'Proyecto archivado') });
    } catch (e: any) {
      toast({ title: l('Could not archive', 'No se pudo archivar'), description: e.message, variant: 'destructive' });
    }
  };

  if (loading || !data) {
    return (
      <ModernAppLayout>
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin" /></div>
      </ModernAppLayout>
    );
  }

  const totals = {
    projects: data.projects.length,
    active: data.projects.filter((p) => p.project_status === 'active').length,
    plants: data.projects.reduce((a, p) => a + p.plants, 0),
    water: data.projects.reduce((a, p) => a + p.waterToday, 0),
    review: data.projects.reduce((a, p) => a + p.needsReview, 0),
    issues: data.projects.reduce((a, p) => a + p.openIssues, 0),
    nextVisit: data.projects.map((p) => p.nextVisit).filter(Boolean).sort()[0] ?? null,
  };

  const balanceBadges = (list: CurrencyBalance[]) =>
    list.length === 0 ? (
      <span className="text-sm text-muted-foreground">—</span>
    ) : (
      list.map((b) => (
        <Badge key={b.currency} variant={b.overdue > 0 ? 'destructive' : 'outline'}>
          {fmt(b.pending, b.currency)} {l('pending', 'pendiente')}
        </Badge>
      ))
    );

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plantops/clientes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{data.client.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[data.client.email, data.client.phone].filter(Boolean).join(' · ') || l('No contact', 'Sin contacto')}
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate(`/plantops/nuevo-cliente?client=${data.client.id}`)}>
            <Plus className="h-4 w-4 mr-2" />{l('New project', 'Nuevo proyecto')}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="resumen">{l('Summary', 'Resumen')}</TabsTrigger>
            <TabsTrigger value="proyectos">{l('Projects', 'Proyectos')}</TabsTrigger>
            <TabsTrigger value="contactos">{l('Contacts', 'Contactos')}</TabsTrigger>
            <TabsTrigger value="comunicaciones">{l('Communications', 'Comunicaciones')}</TabsTrigger>
            <TabsTrigger value="portal">{l('Portal', 'Portal')}</TabsTrigger>
            <TabsTrigger value="facturacion">{l('Billing', 'Facturación')}</TabsTrigger>
          </TabsList>

          {/* ---------- Summary ---------- */}
          <TabsContent value="resumen" className="space-y-3 pt-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: l('Active projects', 'Proyectos activos'), value: `${totals.active}/${totals.projects}` },
                { label: l('Plants', 'Plantas'), value: totals.plants },
                { label: l('Water today', 'Riegos de hoy'), value: totals.water },
                { label: l('In review', 'Revisiones'), value: totals.review },
              ].map((s) => (
                <Card key={s.label}><CardContent className="p-4">
                  <div className="text-2xl font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>{l('Next visit', 'Próxima visita')}</span><span>{totals.nextVisit ?? '—'}</span></div>
              <div className="flex justify-between"><span>{l('Open issues', 'Incidencias')}</span><span>{totals.issues}</span></div>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span>{l('Balances', 'Saldos')}</span>
                <div className="flex gap-2 flex-wrap">{balanceBadges(data.balances)}</div>
              </div>
              <div className="flex justify-between">
                <span>{l('Last communication', 'Última comunicación')}</span>
                <span>{data.communications[0] ? new Date(data.communications[0].at).toLocaleString() : '—'}</span>
              </div>
            </CardContent></Card>
          </TabsContent>

          {/* ---------- Projects ---------- */}
          <TabsContent value="proyectos" className="space-y-3 pt-3">
            {data.projects.length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                {l('This client has no projects yet', 'Este cliente aún no tiene proyectos')}
              </CardContent></Card>
            )}
            {data.projects.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    {p.name}
                    <Badge variant={p.project_status === 'active' ? 'default' : 'secondary'}>{p.project_status}</Badge>
                    <Badge variant="outline">{p.project_type}</Badge>
                    {p.setup_status === 'setup' && <Badge variant="destructive">{l('Setup pending', 'Configuración pendiente')}</Badge>}
                  </CardTitle>
                  {p.address_text && <p className="text-xs text-muted-foreground">{p.address_text}</p>}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {PROJECT_CAPABILITY_KEYS.filter((k) => p.capabilities[k] && orgModules[k] !== false).map((k) => (
                      <Badge key={k} variant="secondary">{tl(CAPABILITY_LABELS[k])}</Badge>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    <div>{l('Plants', 'Plantas')}: <strong>{p.plants}</strong></div>
                    <div className="flex items-center gap-1"><Droplets className="h-3 w-3" />{l('Next care', 'Próximo cuidado')}: <strong>{p.nextCare ?? '—'}</strong></div>
                    <div>{l('Next visit', 'Próxima visita')}: <strong>{p.nextVisit ?? '—'}</strong></div>
                    <div className="flex items-center gap-1"><FileText className="h-3 w-3" />{p.manualApproved ? l('Manual approved', 'Manual aprobado') : l('No manual', 'Sin manual')}</div>
                    <div>{p.portalActive ? l('Portal active', 'Portal activo') : l('Portal inactive', 'Portal inactivo')}</div>
                    {p.openIssues > 0 && (
                      <div className="flex items-center gap-1 text-destructive"><AlertTriangle className="h-3 w-3" />{p.openIssues} {l('issues', 'incidencias')}</div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => navigate(`/plantops/propiedad/${p.id}`)}>{l('Open project', 'Abrir proyecto')}</Button>
                    {p.setup_status === 'setup' && (
                      <Button size="sm" variant="outline" onClick={() => navigate(`/plantops/nuevo-cliente?estate=${p.id}`)}>
                        {l('Continue setup', 'Continuar configuración')}
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openCapabilities(p)}>
                      <Settings2 className="h-3.5 w-3.5 mr-1" />{l('Capabilities', 'Capacidades')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/plantops/visita?estate=${p.id}`)}>
                      <ClipboardList className="h-3.5 w-3.5 mr-1" />{l('Start visit', 'Iniciar visita')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/plantops/propiedad/${p.id}?tab=portal`)}>
                      <Share2 className="h-3.5 w-3.5 mr-1" />{l('Share portal', 'Compartir portal')}
                    </Button>
                    {p.project_status !== 'archived' && (
                      <Button size="sm" variant="ghost" onClick={() => archiveProject(p)}>
                        <Archive className="h-3.5 w-3.5 mr-1" />{l('Archive', 'Archivar')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* ---------- Contacts ---------- */}
          <TabsContent value="contactos" className="pt-3 space-y-3">
            <Card><CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span>{l('Client', 'Cliente')}</span><strong>{data.client.name}</strong></div>
              <div className="flex justify-between"><span>{l('Address', 'Dirección')}</span><span>{data.client.address ?? '—'}</span></div>
              <Button className="mt-2" size="sm" variant="outline" onClick={() => setContactOpen(true)}>
                {l('Edit client record', 'Editar ficha del cliente')}
              </Button>
            </CardContent></Card>
            {orgId && <ClientContactsPanel orgId={orgId} clientId={data.client.id} />}
          </TabsContent>

          {/* ---------- Communications ---------- */}
          <TabsContent value="comunicaciones" className="pt-3 space-y-4">
            <ClientOutboxPanel
              clientId={data.client.id}
              projects={data.projects.map((p) => ({ id: p.id, name: p.name }))}
            />
            <ClientRemindersPanel projects={data.projects.map((p) => ({ id: p.id, name: p.name }))} />
            <Card><CardContent className="p-4 space-y-2">
              <div className="text-sm font-medium">{l('Portal & manual history', 'Historial de portal y manual')}</div>
              {data.communications.length === 0 && (
                <p className="text-sm text-muted-foreground">{l('No events yet', 'Aún no hay eventos')}</p>
              )}
              {data.communications.map((c) => (
                <div key={c.id} className="flex justify-between text-sm border-b border-border py-1.5 last:border-0">
                  <span>
                    {c.kind === 'portal_created' && l('Portal created', 'Portal creado')}
                    {c.kind === 'portal_updated' && l('Portal updated', 'Portal actualizado')}
                    {c.kind === 'portal_revoked' && l('Portal revoked', 'Portal revocado')}
                    {c.kind === 'manual_approved' && l('Manual approved', 'Manual aprobado')}
                    {' — '}{c.estate_name}
                  </span>
                  <span className="text-muted-foreground">{new Date(c.at).toLocaleString()}</span>
                </div>
              ))}
            </CardContent></Card>
          </TabsContent>

          {/* ---------- Portal ---------- */}
          <TabsContent value="portal" className="pt-3 space-y-3">
            <ClientPortalPanel clientId={data.client.id} />
            <div className="text-sm font-medium pt-2">{l('Per-project links', 'Enlaces por proyecto')}</div>
            {data.portals.length === 0 && (
              <Card><CardContent className="p-8 text-center text-muted-foreground">
                {l('No portal links yet', 'Aún no hay enlaces de portal')}
              </CardContent></Card>
            )}
            {data.portals.map((lk) => (
              <Card key={lk.id}><CardContent className="p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <strong>{lk.estate_name}</strong>
                  <Badge variant={lk.revoked_at ? 'secondary' : 'default'}>
                    {lk.revoked_at ? l('Revoked', 'Revocado') : l('Active', 'Activo')}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {l('Created', 'Creado')}: {new Date(lk.created_at).toLocaleDateString()}
                  {lk.expires_at && ` · ${l('Expires', 'Expira')}: ${new Date(lk.expires_at).toLocaleDateString()}`}
                  {lk.manual_approved_at && ` · ${l('Manual approved', 'Manual aprobado')}`}
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate(`/plantops/propiedad/${lk.estate_id}?tab=portal`)}>
                  {l('Manage in project', 'Gestionar en el proyecto')}
                </Button>
              </CardContent></Card>
            ))}
          </TabsContent>

          {/* ---------- Billing ---------- */}
          <TabsContent value="facturacion" className="pt-3 space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              {data.balances.length === 0 && (
                <Card><CardContent className="p-6 text-muted-foreground text-sm">{l('No invoices yet', 'Aún no hay facturas')}</CardContent></Card>
              )}
              {data.balances.map((b) => (
                <Card key={b.currency}><CardContent className="p-4 space-y-1 text-sm">
                  <div className="font-semibold">{b.currency}</div>
                  <div className="flex justify-between"><span>{l('Invoiced', 'Facturado')}</span><span>{fmt(b.invoiced, b.currency)}</span></div>
                  <div className="flex justify-between"><span>{l('Paid', 'Pagado')}</span><span>{fmt(b.paid, b.currency)}</span></div>
                  <div className="flex justify-between"><span>{l('Pending', 'Pendiente')}</span><span>{fmt(b.pending, b.currency)}</span></div>
                  <div className="flex justify-between text-destructive"><span>{l('Overdue', 'Vencido')}</span><span>{fmt(b.overdue, b.currency)}</span></div>
                </CardContent></Card>
              ))}
            </div>
            <Card><CardContent className="p-4 space-y-2">
              {data.invoices.map((i) => (
                <div key={i.id} className="flex justify-between text-sm border-b border-border py-1.5 last:border-0">
                  <span>{i.invoice_number ?? i.id.slice(0, 8)} · {i.status}</span>
                  <span>{fmt(i.total, i.currency)} · {i.issue_date ?? '—'}</span>
                </div>
              ))}
              {data.invoices.length === 0 && <p className="text-sm text-muted-foreground">—</p>}
            </CardContent></Card>
            <p className="text-xs text-muted-foreground">
              {l('Currencies are never summed together.', 'Las monedas nunca se suman entre sí.')}
            </p>
          </TabsContent>
        </Tabs>
      </main>

      {/* Contact dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{l('Edit contact', 'Editar contacto')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {([
              ['name', l('Client name', 'Nombre del cliente')],
              ['email', l('Email', 'Correo')],
              ['phone', l('Phone', 'Teléfono')],
              ['address', l('Address', 'Dirección')],
            ] as const).map(([k, label]) => (
              <div key={k} className="space-y-1">
                <Label>{label}</Label>
                <Input value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={saveContact} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Capabilities dialog */}
      <Dialog open={!!capProject} onOpenChange={(o) => !o && setCapProject(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l('Project capabilities', 'Capacidades del proyecto')} — {capProject?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              {PROJECT_CAPABILITY_KEYS.map((k) => {
                const orgOff = orgModules[k] === false;
                return (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <Label className="text-sm">
                      {tl(CAPABILITY_LABELS[k])}
                      {orgOff && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {l('off for the organization', 'desactivado en la organización')}
                        </span>
                      )}
                    </Label>
                    <Switch
                      checked={!!caps[k] && !orgOff}
                      disabled={orgOff}
                      onCheckedChange={(v) => setCaps((p) => ({ ...p, [k]: v }))}
                    />
                  </div>
                );
              })}
            </div>
            <div className="space-y-2 border-t border-border pt-3">
              <div className="text-sm font-medium">{l('Client portal visibility', 'Visibilidad del portal del cliente')}</div>
              {PORTAL_VISIBILITY_KEYS.map((k) => (
                <div key={k} className="flex items-center justify-between gap-2">
                  <Label className="text-sm">{tl(PORTAL_VISIBILITY_LABELS[k])}</Label>
                  <Switch checked={!!portalVis[k]} onCheckedChange={(v) => setPortalVis((p) => ({ ...p, [k]: v }))} />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCapProject(null)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={saveCapabilities} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernAppLayout>
  );
}
