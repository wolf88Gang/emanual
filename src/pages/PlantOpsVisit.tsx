import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Droplets, Loader2, CheckCircle2, AlertTriangle, Brush, Receipt, Play, Square, Camera, Settings2,
  Wrench, PackageCheck,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import {
  dueState, careState, formatDateEs, logCare, startVisit, closeVisit, addChargeForEstate,
  assignVisitTools, returnVisitTools, fetchVisitTools, CARE_ISSUE_ACTIONS,
  type CareActionType, type VisitToolRow, type CareState,
} from '@/lib/plantopsCare';
import { uploadPlacementPhoto } from '@/lib/plantops';

interface QueueRow {
  id: string;
  asset_id: string;
  spot_label: string | null;
  spot_notes: string | null;
  access_notes: string | null;
  next_water_due: string | null;
  last_watered_at: string | null;
  water_amount_note: string | null;
  water_method: string | null;
  water_interval_days: number | null;
  water_interval_override_days: number | null;
  do_not_do: string | null;
  care_responsibility: string | null;
  plant_name: string;
  zone_name: string | null;
  state: CareState;
}

const ORDER: Record<CareState, number> = { regar: 0, revisar: 1, no_regar: 2 };

export default function PlantOpsVisit() {
  const { profile } = useAuth();
  const { currentEstate, estates, setCurrentEstate } = useEstate();
  const [searchParams] = useSearchParams();
  const { tl } = useLanguage();
  const navigate = useNavigate();
  const l = (en: string, es: string) => tl({ en, es, de: en });

  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueueRow | null>(null);
  const [action, setAction] = useState<CareActionType>('water');
  const [note, setNote] = useState('');
  const [amountNote, setAmountNote] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [estateClient, setEstateClient] = useState<{ id: string; name: string } | null>(null);
  const [charge, setCharge] = useState({ description: '', quantity: '1', unitPrice: '', currency: 'CRC' });
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');
  const [toolsOpen, setToolsOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [inventory, setInventory] = useState<{ id: string; name: string; quantity: number }[]>([]);
  const [pick, setPick] = useState<Record<string, number>>({});
  const [visitTools, setVisitTools] = useState<VisitToolRow[]>([]);
  const [returnCond, setReturnCond] = useState<Record<string, string>>({});
  const [toolsException, setToolsException] = useState('');

  // A visit is always tied to one property: `?estate=<uuid>` selects it explicitly.
  const requestedEstateId = searchParams.get('estate');
  useEffect(() => {
    if (!requestedEstateId || requestedEstateId === currentEstate?.id) return;
    const match = estates.find((e) => e.id === requestedEstateId);
    if (match) setCurrentEstate(match);
  }, [requestedEstateId, estates, currentEstate?.id]);

  const estateClientName = estateClient?.name ?? null;

  const load = useCallback(async () => {
    if (!currentEstate?.id) { setLoading(false); return; }
    setLoading(true);
    const [{ data, error }, { data: logs }] = await Promise.all([
      supabase
        .from('plant_placements')
        .select('id, asset_id, spot_label, spot_notes, access_notes, next_water_due, last_watered_at, water_amount_note, water_method, water_interval_days, water_interval_override_days, do_not_do, care_responsibility, asset:assets!plant_placements_asset_id_fkey(name), zone:zones(name)')
        .eq('estate_id', currentEstate.id)
        .eq('status', 'installed'),
      supabase
        .from('plant_care_logs')
        .select('placement_id, action_type, performed_at')
        .eq('estate_id', currentEstate.id)
        .order('performed_at', { ascending: false })
        .limit(400),
    ]);
    if (error) {
      toast({ title: l('Could not load plants', 'No se pudieron cargar las plantas'), description: error.message, variant: 'destructive' });
    } else {
      // Latest log per placement decides whether the plant has an open problem.
      const latest = new Map<string, string>();
      ((logs || []) as any[]).forEach((r) => {
        if (r.placement_id && !latest.has(r.placement_id)) latest.set(r.placement_id, r.action_type);
      });
      const mapped = (data || []).map((r: any) => {
        const effective = r.water_interval_override_days ?? r.water_interval_days ?? null;
        const openIssue = CARE_ISSUE_ACTIONS.includes(latest.get(r.id) as CareActionType);
        return {
          ...r,
          plant_name: r.asset?.name ?? '—',
          zone_name: r.zone?.name ?? null,
          state: openIssue ? ('revisar' as CareState) : careState(r.next_water_due, effective),
        } as QueueRow;
      });
      mapped.sort((a, b) => ORDER[a.state] - ORDER[b.state]);
      setRows(mapped);
    }
    setLoading(false);
  }, [currentEstate?.id]);

  useEffect(() => { load(); }, [load]);

  // The extra charge is locked to the client of the visited property.
  useEffect(() => {
    if (!currentEstate?.id) { setEstateClient(null); return; }
    supabase.from('estates').select('client_id, client:clients(id, name)').eq('id', currentEstate.id).maybeSingle()
      .then(({ data }) => {
        const c = (data as any)?.client;
        setEstateClient(c ? { id: c.id, name: c.name } : null);
      });
  }, [currentEstate?.id]);

  // Inventory available for tool check-in (per property).
  useEffect(() => {
    if (!currentEstate?.id) return;
    supabase.from('inventory_items').select('id, name, name_es, quantity').eq('estate_id', currentEstate.id).order('name')
      .then(({ data }) => setInventory(((data || []) as any[]).map((i) => ({
        id: i.id, name: i.name_es || i.name, quantity: i.quantity ?? 1,
      }))));
  }, [currentEstate?.id]);

  // Resume an open visit for this estate
  useEffect(() => {
    if (!currentEstate?.id || !profile?.id) return;
    supabase.from('worker_shifts').select('id')
      .eq('estate_id', currentEstate.id).eq('user_id', profile.id).is('check_out_at', null)
      .order('check_in_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data[0]) setShiftId((data[0] as any).id); });
  }, [currentEstate?.id, profile?.id]);

  const refreshTools = useCallback(async (id: string) => {
    try { setVisitTools(await fetchVisitTools(id)); } catch { /* tools are optional */ }
  }, []);

  useEffect(() => { if (shiftId) refreshTools(shiftId); }, [shiftId, refreshTools]);

  const pendingTools = visitTools.filter((t) => !t.returned_at);

  const counts = useMemo(() => {
    const c = { regar: 0, no_regar: 0, revisar: 0 };
    rows.forEach((r) => { c[r.state]++; });
    return c;
  }, [rows]);

  const badgeFor = (r: QueueRow) => {
    if (r.state === 'regar') return <Badge className="bg-primary text-primary-foreground">{l('WATER', 'REGAR')}</Badge>;
    if (r.state === 'revisar') return <Badge variant="destructive">{l('REVIEW', 'REVISAR')}</Badge>;
    return <Badge variant="outline">{l('DO NOT WATER', 'NO REGAR')}</Badge>;
  };

  const isFutureDue = (r: QueueRow | null) => !!r && dueState(r.next_water_due) !== 'overdue' && dueState(r.next_water_due) !== 'today' && !!r.next_water_due;

  const openDetail = (r: QueueRow, a: CareActionType) => {
    setDetail(r); setAction(a); setNote(''); setAmountNote(r.water_amount_note || '');
    setOverrideReason(''); setPhoto(null);
  };

  const handleStart = async () => {
    if (!currentEstate?.id) return;
    setBusy('visit');
    try {
      const id = await startVisit(currentEstate.id);
      setShiftId(id);
      setPick({});
      setToolsOpen(true);
      toast({ title: l('Visit started', 'Visita iniciada') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleAssignTools = async () => {
    if (!shiftId) return;
    const items = Object.entries(pick).filter(([, q]) => q > 0).map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity }));
    setBusy('tools');
    try {
      if (items.length) await assignVisitTools(shiftId, items);
      await refreshTools(shiftId);
      setToolsOpen(false);
      toast({ title: l('Tools registered', 'Herramientas registradas') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleReturnTools = async () => {
    if (!shiftId) return;
    const items = pendingTools
      .filter((t) => returnCond[t.id] !== undefined)
      .map((t) => ({ assignment_id: t.id, condition: returnCond[t.id] || 'good' }));
    if (!items.length) { setCheckoutOpen(false); return; }
    setBusy('return');
    try {
      await returnVisitTools(shiftId, items);
      await refreshTools(shiftId);
      toast({ title: l('Tools returned', 'Herramientas devueltas') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleLog = async () => {
    if (!detail) return;
    if (action === 'water' && isFutureDue(detail) && !overrideReason.trim()) {
      toast({
        title: l('Too early to water', 'Aún es pronto para regar'),
        description: `${l('Do not water before', 'No regar antes del')} ${formatDateEs(detail.next_water_due)}. ${l('A reason is required.', 'Se requiere un motivo.')}`,
        variant: 'destructive',
      });
      return;
    }
    setBusy('log');
    try {
      let photoPath: string | null = null;
      if (photo && profile?.org_id) photoPath = await uploadPlacementPhoto(profile.org_id, detail.id, photo);
      const res = await logCare({
        placementId: detail.id,
        actionType: action,
        notes: note || null,
        amountNote: amountNote || null,
        photoPath,
        shiftId,
        overrideReason: overrideReason || null,
      });
      if ((res as any)?.too_early && !overrideReason) {
        toast({
          title: l('Too early to water', 'Aún es pronto para regar'),
          description: l('Add a reason to confirm.', 'Agregue un motivo para confirmar.'),
          variant: 'destructive',
        });
        return;
      }
      const nextDue = (res as any)?.care?.next_water_due ?? null;
      if (action === 'water' && nextDue) {
        toast({
          title: l('Plant watered', 'Planta regada'),
          description: `${l('Do not water again before', 'No volver a regar antes del')} ${formatDateEs(nextDue)}.`,
        });
      } else {
        toast({ title: l('Registered', 'Registrado') });
      }
      setDetail(null);
      load();
    } catch (e: any) {
      const msg = String(e.message || '');
      if (/too early|demasiado pronto/i.test(msg) && !overrideReason) {
        toast({ title: l('Too early to water', 'Aún es pronto para regar'), description: l('Add a reason to confirm.', 'Agregue un motivo para confirmar.'), variant: 'destructive' });
      } else {
        toast({ title: l('Error', 'Error'), description: msg, variant: 'destructive' });
      }
    } finally { setBusy(null); }
  };

  const handleCharge = async () => {
    if (!currentEstate?.id || !charge.description || !charge.unitPrice) return;
    setBusy('charge');
    try {
      await addChargeForEstate({
        estateId: currentEstate.id,
        description: charge.description,
        quantity: Number(charge.quantity) || 1,
        unitPrice: Number(charge.unitPrice),
        shiftId,
        currency: charge.currency,
      });
      toast({ title: l('Charge added to draft invoice', 'Cargo agregado a la factura borrador') });
      setChargeOpen(false);
      setCharge({ description: '', quantity: '1', unitPrice: '', currency: charge.currency });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleClose = async () => {
    if (!shiftId) return;
    if (pendingTools.length > 0 && !toolsException.trim()) {
      toast({
        title: l('Tools pending', 'Herramientas pendientes'),
        description: l('Return the tools of this visit or record an exception reason.', 'Devuelva las herramientas de esta visita o registre un motivo de excepción.'),
        variant: 'destructive',
      });
      return;
    }
    setBusy('close');
    try {
      await closeVisit({
        shiftId,
        workDescription: closeNotes || null,
        toolsExceptionReason: pendingTools.length > 0 ? toolsException : null,
      });
      toast({ title: l('Visit closed', 'Visita cerrada') });
      setShiftId(null); setCloseOpen(false); setCloseNotes(''); setToolsException('');
      setVisitTools([]);
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 safe-area-content max-w-3xl mx-auto">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{l('Visit', 'Visita')}</h1>
          <p className="text-sm text-muted-foreground">
            {currentEstate?.name} · {l('WATER', 'REGAR')}: {counts.regar} · {l('REVIEW', 'REVISAR')}: {counts.revisar} · {l('DO NOT WATER', 'NO REGAR')}: {counts.no_regar}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {shiftId ? (
            <>
              <Button variant="outline" onClick={() => setToolsOpen(true)}>
                <Wrench className="h-4 w-4 mr-2" />{l('Tools', 'Herramientas')}
              </Button>
              <Button variant="outline" onClick={() => { setReturnCond({}); setCheckoutOpen(true); }}>
                <PackageCheck className="h-4 w-4 mr-2" />
                {l('Check out tools', 'Devolver herramientas')}
                {pendingTools.length > 0 && <Badge variant="destructive" className="ml-2">{pendingTools.length}</Badge>}
              </Button>
              <Button variant="secondary" onClick={() => setChargeOpen(true)}>
                <Receipt className="h-4 w-4 mr-2" />{l('Charge', 'Cargo')}
              </Button>
              <Button onClick={() => setCloseOpen(true)}>
                <Square className="h-4 w-4 mr-2" />{l('Close visit', 'Cerrar visita')}
              </Button>
            </>
          ) : (
            <Button className="flex-1" onClick={handleStart} disabled={busy === 'visit' || !currentEstate}>
              {busy === 'visit' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {l('Start visit', 'Iniciar visita')}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            {l('No installed plants on this property.', 'No hay plantas instaladas en esta propiedad.')}
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.plant_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[r.zone_name, r.spot_label].filter(Boolean).join(' · ') || l('No spot', 'Sin punto')}
                      </p>
                      {r.state === 'no_regar' && (
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-1">
                          {l('DO NOT WATER BEFORE', 'NO REGAR ANTES DEL')} {formatDateEs(r.next_water_due)}
                        </p>
                      )}
                      {r.water_amount_note && (
                        <p className="text-sm text-muted-foreground mt-1">💧 {r.water_amount_note}</p>
                      )}
                      {r.do_not_do && (
                        <p className="text-sm text-destructive mt-1">{l('Do not', 'No hacer')}: {r.do_not_do}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {badgeFor(r)}
                      <Button size="icon" variant="ghost" aria-label={l('Care plan', 'Plan de cuidado')}
                        onClick={() => navigate(`/plantops/cuidados/${r.id}`)}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button size="sm" onClick={() => openDetail(r, 'water')}>
                      <Droplets className="h-4 w-4 mr-1" />{l('Watered', 'Regada')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(r, 'skip_water')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />{l('No water', 'Sin agua')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(r, 'clean')}>
                      <Brush className="h-4 w-4 mr-1" />{l('Cleaned', 'Limpieza')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(r, 'issue')}>
                      <AlertTriangle className="h-4 w-4 mr-1" />{l('Issue', 'Problema')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Log dialog */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.plant_name}</DialogTitle>
            <DialogDescription>{l('Register the action performed.', 'Registre la acción realizada.')}</DialogDescription>
          </DialogHeader>
          {action === 'water' && isFutureDue(detail) && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">
                {l('DO NOT WATER BEFORE', 'NO REGAR ANTES DEL')} {formatDateEs(detail?.next_water_due)}
              </p>
              <p className="text-muted-foreground">
                {l('Watering earlier requires a reason, saved in the care log.', 'Regar antes requiere un motivo, que queda guardado en el historial.')}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label>{l('Action', 'Acción')}</Label>
              <Select value={action} onValueChange={(v) => setAction(v as CareActionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">{l('Watered', 'Regada')}</SelectItem>
                  <SelectItem value="skip_water">{l('No water needed', 'No necesitaba agua')}</SelectItem>
                  <SelectItem value="clean">{l('Cleaned', 'Limpieza')}</SelectItem>
                  <SelectItem value="prune">{l('Pruned', 'Poda')}</SelectItem>
                  <SelectItem value="fertilize">{l('Fertilized', 'Abonada')}</SelectItem>
                  <SelectItem value="rotate">{l('Rotated', 'Rotada')}</SelectItem>
                  <SelectItem value="inspect">{l('Inspected', 'Revisada')}</SelectItem>
                  <SelectItem value="issue">{l('Issue', 'Problema')}</SelectItem>
                  <SelectItem value="replace_requested">{l('Replacement requested', 'Reemplazo solicitado')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {action === 'water' && (
              <div>
                <Label>{l('Amount', 'Cantidad')}</Label>
                <Input value={amountNote} onChange={(e) => setAmountNote(e.target.value)} placeholder={l('e.g. 1 liter', 'ej. 1 litro')} />
              </div>
            )}
            <div>
              <Label>{l('Notes', 'Notas')}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" />{l('Photo (optional)', 'Foto (opcional)')}</Label>
              <Input type="file" accept="image/*" capture="environment"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>{l('Reason (if out of schedule)', 'Motivo (si está fuera de programa)')}</Label>
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={handleLog} disabled={busy === 'log'}>
              {busy === 'log' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool check-in */}
      <Dialog open={toolsOpen} onOpenChange={setToolsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l('What tools are you bringing?', '¿Qué herramientas lleva?')}</DialogTitle>
            <DialogDescription>
              {l('They stay linked to this visit until you check them out.', 'Quedan ligadas a esta visita hasta que las devuelva.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {inventory.length === 0 && (
              <p className="text-sm text-muted-foreground">{l('No inventory registered for this property.', 'No hay inventario registrado en esta propiedad.')}</p>
            )}
            {inventory.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                <span className="text-sm">{i.name}</span>
                <Input type="number" min="0" max={i.quantity} className="w-20"
                  value={pick[i.id] ?? ''}
                  onChange={(e) => setPick({ ...pick, [i.id]: Number(e.target.value) || 0 })} />
              </div>
            ))}
            {visitTools.length > 0 && (
              <div className="pt-2 text-sm text-muted-foreground">
                {l('Already on this visit', 'Ya en esta visita')}: {visitTools.map((t) => `${t.name}×${t.quantity_assigned}`).join(', ')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToolsOpen(false)}>{l('Skip', 'Omitir')}</Button>
            <Button onClick={handleAssignTools} disabled={busy === 'tools'}>
              {busy === 'tools' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Confirm', 'Confirmar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool checkout */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l('Check out tools', 'Devolver herramientas')}</DialogTitle>
            <DialogDescription>
              {l('Only the tools taken out on this visit.', 'Solo las herramientas sacadas en esta visita.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pendingTools.length === 0 && (
              <p className="text-sm text-muted-foreground">{l('Nothing pending.', 'Nada pendiente.')}</p>
            )}
            {pendingTools.map((t) => (
              <div key={t.id} className="space-y-1 border-b border-border/50 pb-2">
                <p className="text-sm font-medium">{t.name} × {t.quantity_assigned}</p>
                <Select value={returnCond[t.id] ?? ''} onValueChange={(v) => setReturnCond({ ...returnCond, [t.id]: v })}>
                  <SelectTrigger><SelectValue placeholder={l('Condition on return', 'Condición al devolver')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="good">{l('Good', 'Buena')}</SelectItem>
                    <SelectItem value="fair">{l('Fair', 'Regular')}</SelectItem>
                    <SelectItem value="needs_repair">{l('Needs repair', 'Requiere reparación')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>{l('Close', 'Cerrar')}</Button>
            <Button onClick={handleReturnTools} disabled={busy === 'return' || pendingTools.length === 0}>
              {busy === 'return' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Confirm return', 'Confirmar devolución')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charge dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{l('Extra charge', 'Cargo extra')}</DialogTitle>
            <DialogDescription>
              {l('Adds a line to the client draft invoice.', 'Agrega una línea a la factura borrador del cliente.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{l('Client', 'Cliente')}</Label>
              <Input readOnly value={estateClientName || l('No client assigned to this property', 'Esta propiedad no tiene cliente asignado')} />
            </div>
            <div>
              <Label>{l('Description', 'Descripción')}</Label>
              <Input value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>{l('Qty', 'Cant.')}</Label>
                <Input type="number" min="1" value={charge.quantity} onChange={(e) => setCharge({ ...charge, quantity: e.target.value })} />
              </div>
              <div>
                <Label>{l('Unit price', 'Precio')}</Label>
                <Input type="number" min="0" value={charge.unitPrice} onChange={(e) => setCharge({ ...charge, unitPrice: e.target.value })} />
              </div>
              <div>
                <Label>{l('Currency', 'Moneda')}</Label>
                <Select value={charge.currency} onValueChange={(v) => setCharge({ ...charge, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">CRC</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChargeOpen(false)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={handleCharge} disabled={busy === 'charge' || !estateClient}>
              {busy === 'charge' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Add', 'Agregar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close visit */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{l('Close visit', 'Cerrar visita')}</DialogTitle>
            <DialogDescription>{l('Summary of the work done.', 'Resumen del trabajo realizado.')}</DialogDescription>
          </DialogHeader>
          {pendingTools.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                {l('Tools not returned', 'Herramientas sin devolver')}: {pendingTools.map((t) => t.name).join(', ')}
              </p>
              <Label className="text-sm">{l('Exception reason (required to close anyway)', 'Motivo de excepción (requerido para cerrar así)')}</Label>
              <Input value={toolsException} onChange={(e) => setToolsException(e.target.value)} />
            </div>
          )}
          <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>{l('Cancel', 'Cancelar')}</Button>
            <Button onClick={handleClose} disabled={busy === 'close'}>
              {busy === 'close' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Close', 'Cerrar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernAppLayout>
  );
}
