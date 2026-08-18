import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Users, Plus, Pencil, Share2, Bell, Droplets, AlertTriangle, Search } from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOrgType } from '@/hooks/usePlantOps';
import {
  fetchClientWorkspace,
  updateClientContact,
  type ClientWorkspaceRow,
  type CurrencyBalance,
} from '@/lib/plantopsClients';

type FilterKey = 'all' | 'active' | 'inactive' | 'care_due' | 'review' | 'overdue_balance' | 'portal_on' | 'portal_off';

const money = (b: CurrencyBalance) =>
  `${b.currency} ${b.pending.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

/**
 * Client workspace: one row per CLIENT of the service organization (B2B2C),
 * never one row per contact or user. Projects live inside each client.
 */
export default function PlantOpsClients() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, tl } = useLanguage();
  const { orgId } = useOrgType();
  const l = (en: string, es: string, de?: string) => tl({ en, es, de: de || en });

  const [rows, setRows] = useState<ClientWorkspaceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [editing, setEditing] = useState<ClientWorkspaceRow | null>(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = l('Clients | PlantOps', 'Clientes | PlantOps');
  }, [language]);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      setRows(await fetchClientWorkspace(orgId));
    } catch (e: any) {
      toast({ title: l('Could not load clients', 'No se pudieron cargar los clientes'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [orgId]);

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: l('All', 'Todos') },
    { key: 'active', label: l('Active', 'Activos') },
    { key: 'inactive', label: l('Inactive', 'Inactivos') },
    { key: 'care_due', label: l('Care due', 'Cuidado pendiente') },
    { key: 'review', label: l('Needs review', 'Revisión pendiente') },
    { key: 'overdue_balance', label: l('Overdue balance', 'Saldo vencido') },
    { key: 'portal_on', label: l('Portal active', 'Portal activo') },
    { key: 'portal_off', label: l('Portal inactive', 'Portal inactivo') },
  ];

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (term && !`${r.name} ${r.email ?? ''} ${r.phone ?? ''}`.toLowerCase().includes(term)) return false;
      switch (filter) {
        case 'active':
          return r.activeProjects > 0;
        case 'inactive':
          return r.activeProjects === 0;
        case 'care_due':
          return r.waterToday > 0;
        case 'review':
          return r.needsReview > 0;
        case 'overdue_balance':
          return r.balances.some((b) => b.overdue > 0);
        case 'portal_on':
          return r.portalActive;
        case 'portal_off':
          return !r.portalActive;
        default:
          return true;
      }
    });
  }, [rows, q, filter]);

  const openEdit = (r: ClientWorkspaceRow) => {
    setEditing(r);
    setForm({ name: r.name, email: r.email ?? '', phone: r.phone ?? '' });
  };

  const saveContact = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await updateClientContact(editing.id, {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
      });
      setEditing(null);
      await load();
      toast({ title: l('Contact updated', 'Contacto actualizado') });
    } catch (e: any) {
      toast({ title: l('Could not save', 'No se pudo guardar'), description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  /** Reminder uses the client's own channel — no client login is ever required. */
  const sendReminder = (r: ClientWorkspaceRow) => {
    const text = encodeURIComponent(
      l(
        `Hello ${r.name}, a reminder about the plant care at your project.`,
        `Hola ${r.name}, un recordatorio sobre el cuidado de las plantas en su proyecto.`,
      ),
    );
    if (r.phone) window.open(`https://wa.me/${r.phone.replace(/[^\d]/g, '')}?text=${text}`, '_blank');
    else if (r.email) window.open(`mailto:${r.email}?body=${text}`, '_blank');
    else toast({ title: l('No contact channel on file', 'El cliente no tiene contacto registrado'), variant: 'destructive' });
  };

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-6xl mx-auto">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              {l('Clients', 'Clientes')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {l('Your clients and their projects', 'Sus clientes y sus proyectos')}
            </p>
          </div>
          <Button onClick={() => navigate('/plantops/nuevo-cliente')}>
            <Plus className="h-4 w-4 mr-2" />
            {l('New client', 'Nuevo cliente')}
          </Button>
        </header>

        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" placeholder={l('Search client', 'Buscar cliente')} value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {filters.map((f) => (
            <Button key={f.key} size="sm" variant={filter === f.key ? 'default' : 'outline'} onClick={() => setFilter(f.key)}>
              {f.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : visible.length === 0 ? (
          <Card><CardContent className="p-8 text-center text-muted-foreground">{l('No clients yet', 'Aún no hay clientes')}</CardContent></Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {visible.map((r) => (
              <Card key={r.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <button className="text-left" onClick={() => navigate(`/plantops/clientes/${r.id}`)}>
                      <div className="font-semibold">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {[r.email, r.phone].filter(Boolean).join(' · ') || l('No contact', 'Sin contacto')}
                      </div>
                    </button>
                    <Badge variant={r.portalActive ? 'default' : 'secondary'}>
                      {r.portalActive ? l('Portal active', 'Portal activo') : l('Portal inactive', 'Portal inactivo')}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md bg-muted p-2">
                      <div className="text-base font-semibold">{r.projectsCount}</div>
                      {l('Projects', 'Proyectos')}
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <div className="text-base font-semibold">{r.plants}</div>
                      {l('Plants', 'Plantas')}
                    </div>
                    <div className="rounded-md bg-muted p-2">
                      <div className="text-base font-semibold flex items-center justify-center gap-1">
                        <Droplets className="h-3.5 w-3.5" />{r.waterToday}
                      </div>
                      {l('Water today', 'Riego hoy')}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs">
                    {r.needsReview > 0 && (
                      <Badge variant="outline">{r.needsReview} {l('in review', 'en revisión')}</Badge>
                    )}
                    {r.openIssues > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />{r.openIssues} {l('open issues', 'incidencias')}
                      </Badge>
                    )}
                    <Badge variant="secondary">
                      {l('Next visit', 'Próxima visita')}: {r.nextVisit ?? '—'}
                    </Badge>
                    {r.balances.filter((b) => b.pending > 0).map((b) => (
                      <Badge key={b.currency} variant={b.overdue > 0 ? 'destructive' : 'outline'}>{money(b)}</Badge>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => navigate(`/plantops/clientes/${r.id}`)}>{l('Open', 'Abrir')}</Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/plantops/nuevo-cliente?client=${r.id}`)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />{l('New project', 'Nuevo proyecto')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" />{l('Contact', 'Contacto')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/plantops/clientes/${r.id}?tab=portal`)}>
                      <Share2 className="h-3.5 w-3.5 mr-1" />{l('Portal', 'Portal')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => sendReminder(r)}>
                      <Bell className="h-3.5 w-3.5 mr-1" />{l('Reminder', 'Recordatorio')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{l('Edit contact', 'Editar contacto')}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{l('Client name', 'Nombre del cliente')}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l('Email', 'Correo')}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>{l('Phone', 'Teléfono')}</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={saveContact} disabled={saving || !form.name.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernAppLayout>
  );
}
