import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, ArrowLeft, Copy, Droplets, FileText, Link2, Loader2, Plus, RefreshCw, ShieldOff, Wallet,
} from 'lucide-react';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatCurrency } from '@/lib/currency';
import {
  fetchPropertyDetail, fetchPropertyHistory, fetchPropertyBilling, buildManualSnapshot, manualIsStale,
  updateShareLink, type PropertyDetail, type PropertyHistoryItem, type PropertyBilling, type ManualSnapshot,
} from '@/lib/plantopsProperty';
import {
  fetchShareLinks, createShareLink, revokeShareLink, approveManual, addChargeForEstate, registerPayment,
  careState, formatDateEs, CARE_RESPONSIBILITY_LABELS, fetchCareQueue, type ShareLinkRow, type CareResponsibility,
} from '@/lib/plantopsCare';

/** Central operational screen for one property: plants, care, history, manual, billing. */
export default function PlantOpsProperty() {
  const { estateId } = useParams<{ estateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { language, tl } = useLanguage();
  const l = (en: string, es: string) => (language === 'es' ? es : en);
  const lang = language === 'es' ? 'es' : language === 'de' ? 'de' : 'en';

  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<PropertyDetail | null>(null);
  const [history, setHistory] = useState<PropertyHistoryItem[]>([]);
  const [billing, setBilling] = useState<PropertyBilling | null>(null);
  const [links, setLinks] = useState<ShareLinkRow[]>([]);
  const [busy, setBusy] = useState(false);

  const [preview, setPreview] = useState<ManualSnapshot | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [charge, setCharge] = useState({ description: '', qty: '1', price: '' });
  const [payOpen, setPayOpen] = useState<{ invoiceId: string; pending: number } | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [contactNote, setContactNote] = useState('');

  const load = useCallback(async () => {
    if (!estateId) return;
    setLoading(true);
    try {
      const d = await fetchPropertyDetail(estateId);
      setDetail(d);
      const [h, b, sl] = await Promise.all([
        fetchPropertyHistory(estateId, d.client?.id ?? null, lang as any),
        fetchPropertyBilling(d.client?.id ?? null),
        fetchShareLinks(estateId),
      ]);
      setHistory(h);
      setBilling(b);
      setLinks(sl);
    } catch (e: any) {
      toast({ title: l('Could not load the property', 'No se pudo cargar la propiedad'), description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [estateId, lang]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (detail) document.title = `${detail.estate.name} | PlantOps`;
  }, [detail]);

  const activeLink = links.find((x) => !x.revoked_at) ?? null;
  const stale = detail ? manualIsStale(detail, activeLink?.manual_approved_at ?? null) : false;

  const doApprove = async () => {
    if (!detail || !estateId) return;
    setBusy(true);
    try {
      const queue = await fetchCareQueue(estateId);
      const effective: Record<string, number | null> = {};
      for (const row of queue) effective[row.placement_id] = row.effective_days;
      const snapshot = buildManualSnapshot(detail, contactNote || activeLink?.contact_note || null, effective);
      let linkId = activeLink?.id;
      if (!linkId) {
        const created = await createShareLink({ estateId, contactNote: contactNote || null });
        linkId = created.id;
        toast({ title: l('Link created', 'Enlace creado'), description: created.url });
      }
      await approveManual(linkId!, snapshot);
      setPreview(null);
      await load();
      toast({ title: l('Manual version approved', 'Versión del manual aprobada') });
    } catch (e: any) {
      toast({ title: l('Could not approve', 'No se pudo aprobar'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const regenerate = async () => {
    if (!estateId) return;
    setBusy(true);
    try {
      if (activeLink) await revokeShareLink(activeLink.id);
      const created = await createShareLink({
        estateId,
        showPlants: activeLink?.show_plants ?? true,
        showManual: activeLink?.show_manual ?? true,
        showLastVisit: activeLink?.show_last_visit ?? true,
        showHistory: activeLink?.show_history ?? false,
        showBalance: activeLink?.show_balance ?? false,
        contactNote: activeLink?.contact_note ?? null,
      });
      if (detail) await approveManual(created.id, buildManualSnapshot(detail, activeLink?.contact_note ?? null));
      await navigator.clipboard.writeText(created.url).catch(() => {});
      await load();
      toast({ title: l('New link generated and copied', 'Nuevo enlace generado y copiado'), description: created.url });
    } catch (e: any) {
      toast({ title: l('Could not regenerate', 'No se pudo regenerar'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const toggleLink = async (key: 'showPlants' | 'showManual' | 'showLastVisit' | 'showHistory' | 'showBalance', value: boolean) => {
    if (!activeLink) return;
    try {
      await updateShareLink({ linkId: activeLink.id, [key]: value } as any);
      await load();
    } catch (e: any) {
      toast({ title: l('Could not update the link', 'No se pudo actualizar el enlace'), description: e.message, variant: 'destructive' });
    }
  };

  const submitCharge = async () => {
    if (!estateId) return;
    setBusy(true);
    try {
      await addChargeForEstate({
        estateId,
        description: charge.description.trim(),
        quantity: Number(charge.qty || 1),
        unitPrice: Number(charge.price),
        currency: billing?.currency ?? 'CRC',
      });
      setChargeOpen(false);
      setCharge({ description: '', qty: '1', price: '' });
      await load();
      toast({ title: l('Charge added', 'Cargo agregado') });
    } catch (e: any) {
      toast({ title: l('Could not add the charge', 'No se pudo agregar el cargo'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const submitPayment = async () => {
    if (!payOpen) return;
    setBusy(true);
    try {
      const res = await registerPayment({ invoiceId: payOpen.invoiceId, amount: Number(payAmount) });
      setPayOpen(null);
      setPayAmount('');
      await load();
      toast({ title: l('Payment registered', 'Pago registrado'), description: `${l('Pending', 'Pendiente')}: ${res.pending}` });
    } catch (e: any) {
      toast({ title: l('Payment rejected', 'Pago rechazado'), description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <ModernAppLayout>
        <main className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></main>
      </ModernAppLayout>
    );
  }

  if (!detail) {
    return (
      <ModernAppLayout>
        <main className="p-6 text-center text-sm text-muted-foreground">{l('Property not found.', 'Propiedad no encontrada.')}</main>
      </ModernAppLayout>
    );
  }

  const money = (n: number) => formatCurrency(n, billing?.currency ?? 'CRC');

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 max-w-3xl mx-auto safe-area-content pb-28">
        <div className="flex items-start gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/plantops')}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold truncate">{detail.estate.name}</h1>
            <p className="text-sm text-muted-foreground truncate">
              {[detail.client?.name, detail.estate.address_text].filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
        </div>

        <Tabs defaultValue="resumen">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="resumen">{l('Summary', 'Resumen')}</TabsTrigger>
            <TabsTrigger value="plantas">{l('Plants', 'Plantas')}</TabsTrigger>
            <TabsTrigger value="historial">{l('History', 'Historial')}</TabsTrigger>
            <TabsTrigger value="manual">{l('Manual', 'Manual')}</TabsTrigger>
            <TabsTrigger value="cobros">{l('Billing', 'Cobros')}</TabsTrigger>
          </TabsList>

          {/* Summary */}
          <TabsContent value="resumen" className="space-y-3 pt-3">
            <Card>
              <CardContent className="p-4 grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-muted-foreground text-xs">{l('Client', 'Cliente')}</p><p>{detail.client?.name ?? '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">{l('Contact', 'Contacto')}</p><p className="truncate">{detail.client?.phone || detail.client?.email || '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">{l('Plants installed', 'Plantas instaladas')}</p><p>{detail.placements.filter((p) => p.status === 'installed').length}</p></div>
                <div><p className="text-muted-foreground text-xs">{l('Contract', 'Contrato')}</p><p>{detail.contract ? `${detail.contract.status} · ${detail.contract.billing_period ?? '—'}` : '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">{l('Monthly price', 'Precio mensual')}</p><p>{detail.contract?.price_amount ? formatCurrency(Number(detail.contract.price_amount), detail.contract.currency) : '—'}</p></div>
                <div><p className="text-muted-foreground text-xs">{l('Pending balance', 'Saldo pendiente')}</p><p>{money(billing?.pending ?? 0)}</p></div>
              </CardContent>
            </Card>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => navigate(`/plantops/visita?estate=${detail.estate.id}`)}>
                <Droplets className="h-4 w-4 mr-2" />{l('Start visit', 'Iniciar visita')}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />{l('Extra charge', 'Cargo extra')}
              </Button>
            </div>
          </TabsContent>

          {/* Plants */}
          <TabsContent value="plantas" className="space-y-2 pt-3">
            {detail.placements.length === 0 && (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{l('No plants yet.', 'Sin plantas todavía.')}</CardContent></Card>
            )}
            {detail.placements.map((p) => {
              const days = p.water_interval_override_days ?? p.water_interval_days;
              const state = days ? careState(p.next_water_due, days) : 'revisar';
              return (
                <Card key={p.id} className="cursor-pointer hover:border-primary/50" onClick={() => navigate(`/plantops/cuidados/${p.id}`)}>
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium truncate">{p.asset_name}</p>
                      <Badge variant={state === 'regar' ? 'default' : state === 'revisar' ? 'outline' : 'secondary'}>
                        {state === 'regar' ? l('Water', 'Regar') : state === 'no_regar' ? l('Do not water', 'No regar') : l('Review', 'Revisar')}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {[p.floor_label, p.zone_name, p.spot_label].filter(Boolean).join(' · ') || '—'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {days && <span>{l('every', 'cada')} {days} {l('days', 'días')}</span>}
                      {p.next_water_due && <span>{formatDateEs(p.next_water_due)}</span>}
                      {p.pot && <span>{[p.pot.material, p.pot.diameter_cm ? `${p.pot.diameter_cm} cm` : null].filter(Boolean).join(' · ')}</span>}
                      {p.care_responsibility && <Badge variant="outline">{tl(CARE_RESPONSIBILITY_LABELS[p.care_responsibility as CareResponsibility])}</Badge>}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>

          {/* History */}
          <TabsContent value="historial" className="space-y-2 pt-3">
            {history.length === 0 && (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{l('No activity yet.', 'Sin actividad todavía.')}</CardContent></Card>
            )}
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="p-3 flex gap-3">
                  <div className="pt-0.5">
                    {h.kind === 'visit' ? <Droplets className="h-4 w-4 text-primary" />
                      : h.kind === 'care' ? <Droplets className="h-4 w-4 text-muted-foreground" />
                      : h.kind === 'charge' ? <FileText className="h-4 w-4 text-muted-foreground" />
                      : <Wallet className="h-4 w-4 text-primary" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{h.title}</p>
                    {h.detail && <p className="text-xs text-muted-foreground">{h.detail}</p>}
                    <p className="text-xs text-muted-foreground">{formatDateEs(h.at?.slice(0, 10))}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Manual + share links */}
          <TabsContent value="manual" className="space-y-3 pt-3">
            {stale && (
              <Card className="border-amber-500/40">
                <CardContent className="p-3 text-sm flex gap-2 items-center">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  {l('The care plan changed after the last shared version.', 'El plan de cuidado cambió después de la última versión compartida.')}
                </CardContent>
              </Card>
            )}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">{l('Client manual', 'Manual del cliente')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>{l('Contact note', 'Nota de contacto')}</Label>
                  <Textarea rows={2} value={contactNote || activeLink?.contact_note || ''} onChange={(e) => setContactNote(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setPreview(buildManualSnapshot(detail, contactNote || activeLink?.contact_note || null))}>
                    <FileText className="h-4 w-4 mr-2" />{l('Preview', 'Previsualizar')}
                  </Button>
                  <Button size="sm" onClick={doApprove} disabled={busy}>
                    {l('Approve version', 'Aprobar versión')}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {l('Last approved', 'Última aprobación')}: {activeLink?.manual_approved_at ? formatDateEs(activeLink.manual_approved_at.slice(0, 10)) : '—'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Link2 className="h-4 w-4" />{l('Share link', 'Enlace compartido')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {activeLink ? (
                  <>
                    {([
                      ['showPlants', 'show_plants', l('Plants', 'Plantas')],
                      ['showManual', 'show_manual', l('Manual', 'Manual')],
                      ['showLastVisit', 'show_last_visit', l('Last visit', 'Última visita')],
                      ['showHistory', 'show_history', l('History', 'Historial')],
                      ['showBalance', 'show_balance', l('Balance', 'Saldo')],
                    ] as const).map(([key, col, label]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="text-sm">{label}</Label>
                        <Switch checked={Boolean((activeLink as any)[col])} onCheckedChange={(v) => toggleLink(key as any, v)} />
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button size="sm" variant="outline" onClick={regenerate} disabled={busy}>
                        <RefreshCw className="h-4 w-4 mr-2" />{l('Regenerate link', 'Regenerar enlace')}
                      </Button>
                      <Button size="sm" variant="destructive" onClick={async () => { await revokeShareLink(activeLink.id); await load(); }} disabled={busy}>
                        <ShieldOff className="h-4 w-4 mr-2" />{l('Revoke', 'Revocar')}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {l('The token is only shown when created or regenerated; only its hash is stored.',
                         'El token solo se muestra al crearlo o regenerarlo; solo se guarda su hash.')}
                    </p>
                  </>
                ) : (
                  <Button size="sm" onClick={regenerate} disabled={busy}>
                    <Link2 className="h-4 w-4 mr-2" />{l('Create client link', 'Crear enlace del cliente')}
                  </Button>
                )}
                {links.filter((x) => x.revoked_at).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {links.filter((x) => x.revoked_at).length} {l('revoked link(s)', 'enlace(s) revocado(s)')}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing */}
          <TabsContent value="cobros" className="space-y-3 pt-3">
            <Card>
              <CardContent className="p-4 grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">{l('Invoiced', 'Facturado')}</p><p>{money(billing?.invoiced ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">{l('Paid', 'Pagado')}</p><p>{money(billing?.paid ?? 0)}</p></div>
                <div><p className="text-xs text-muted-foreground">{l('Pending', 'Pendiente')}</p><p>{money(billing?.pending ?? 0)}</p></div>
              </CardContent>
            </Card>
            <Button size="sm" variant="outline" onClick={() => setChargeOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />{l('Extra charge', 'Cargo extra')}
            </Button>
            {(billing?.invoices ?? []).map((inv) => (
              <Card key={inv.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{inv.invoice_number || inv.id.slice(0, 8)}</p>
                    <Badge variant={inv.pending === 0 ? 'secondary' : 'default'}>{inv.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatDateEs(inv.issue_date)} · {l('Total', 'Total')} {formatCurrency(inv.total, inv.currency)} · {l('Pending', 'Pendiente')} {formatCurrency(inv.pending, inv.currency)}
                  </p>
                  {inv.pending > 0 && (
                    <Button size="sm" variant="outline" onClick={() => { setPayOpen({ invoiceId: inv.id, pending: inv.pending }); setPayAmount(String(inv.pending)); }}>
                      <Wallet className="h-4 w-4 mr-2" />{l('Register payment', 'Registrar pago')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Manual preview */}
        <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
          <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{l('Manual preview', 'Previsualización del manual')}</DialogTitle></DialogHeader>
            {preview && (
              <div className="space-y-3 text-sm">
                <p className="font-medium">{preview.property.name}</p>
                {preview.services.length > 0 && (
                  <p className="text-muted-foreground capitalize">{preview.services.join(' · ')}</p>
                )}
                {preview.plants.map((p, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.location}</p>
                    <p className="text-xs">{p.water}</p>
                    {p.pot && <p className="text-xs text-muted-foreground">{p.pot}</p>}
                    {p.client_instructions && <p className="text-xs">{p.client_instructions}</p>}
                    {p.do_not_do && <p className="text-xs text-destructive">{p.do_not_do}</p>}
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button onClick={doApprove} disabled={busy}>{l('Approve this version', 'Aprobar esta versión')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Extra charge */}
        <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>{l('Extra charge', 'Cargo extra')}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{l('Description', 'Descripción')}</Label>
                <Input value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>{l('Quantity', 'Cantidad')}</Label>
                  <Input type="number" value={charge.qty} onChange={(e) => setCharge({ ...charge, qty: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>{l('Unit price', 'Precio unitario')}</Label>
                  <Input type="number" value={charge.price} onChange={(e) => setCharge({ ...charge, price: e.target.value })} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={submitCharge} disabled={busy || !charge.description.trim() || !charge.price}>
                {l('Add charge', 'Agregar cargo')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment */}
        <Dialog open={!!payOpen} onOpenChange={(o) => !o && setPayOpen(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle>{l('Register payment', 'Registrar pago')}</DialogTitle></DialogHeader>
            <div className="space-y-2">
              <Label>{l('Amount', 'Monto')}</Label>
              <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              <p className="text-xs text-muted-foreground">
                {l('Pending', 'Pendiente')}: {payOpen ? money(payOpen.pending) : '—'} — {l('overpayments are rejected by the backend.', 'los sobrepagos son rechazados por el backend.')}
              </p>
            </div>
            <DialogFooter>
              <Button onClick={submitPayment} disabled={busy || !payAmount}>{l('Register', 'Registrar')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </ModernAppLayout>
  );
}
