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
  dueState, formatDateEs, logCare, startVisit, closeVisit, addChargeForEstate,
  assignVisitTools, returnVisitTools, fetchVisitTools, fetchCareQueue, fetchOrgToolInventory,
  type CareActionType, type VisitToolRow, type CareState, type CareQueueRow, type OrgToolRow,
} from '@/lib/plantopsCare';
import { uploadPlacementPhoto } from '@/lib/plantops';

const ORDER: Record<CareState, number> = { regar: 0, revisar: 1, no_regar: 2 };

export default function PlantOpsVisit() {
  const { profile } = useAuth();
  const { currentEstate, estates, setCurrentEstate } = useEstate();
  const [searchParams] = useSearchParams();
  const { tl } = useLanguage();
  const navigate = useNavigate();
  /** Trilingual literal: EN / ES / DE. */
  const l = (en: string, es: string, de: string) => tl({ en, es, de });

  const [rows, setRows] = useState<CareQueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shiftId, setShiftId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [detail, setDetail] = useState<CareQueueRow | null>(null);
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
  const [inventory, setInventory] = useState<OrgToolRow[]>([]);
  const [pick, setPick] = useState<Record<string, number>>({});
  const [visitTools, setVisitTools] = useState<VisitToolRow[]>([]);
  const [returnQty, setReturnQty] = useState<Record<string, number>>({});
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

  // Care state comes ONLY from the canonical queue RPC. No React-side recalculation.
  const load = useCallback(async () => {
    if (!currentEstate?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const queue = await fetchCareQueue(currentEstate.id);
      const sorted = [...queue].sort((a, b) => ORDER[a.care_state] - ORDER[b.care_state]);
      setRows(sorted);
    } catch (e: any) {
      toast({
        title: l('Could not load plants', 'No se pudieron cargar las plantas', 'Pflanzen konnten nicht geladen werden'),
        description: e.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
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

  // Organization-wide tool stock (every property / warehouse of the org).
  const loadInventory = useCallback(async () => {
    try {
      setInventory(await fetchOrgToolInventory());
    } catch {
      setInventory([]);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

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

  const pendingTools = visitTools.filter((t) => t.quantity_returned < t.quantity_assigned);
  const pendingUnits = pendingTools.reduce((s, t) => s + (t.quantity_assigned - t.quantity_returned), 0);

  const counts = useMemo(() => {
    const c = { regar: 0, no_regar: 0, revisar: 0 };
    rows.forEach((r) => { c[r.care_state]++; });
    return c;
  }, [rows]);

  const badgeFor = (r: CareQueueRow) => {
    if (r.care_state === 'regar') return <Badge className="bg-primary text-primary-foreground">{l('WATER', 'REGAR', 'GIESSEN')}</Badge>;
    if (r.care_state === 'revisar') return <Badge variant="destructive">{l('REVIEW', 'REVISAR', 'PRÜFEN')}</Badge>;
    return <Badge variant="outline">{l('DO NOT WATER', 'NO REGAR', 'NICHT GIESSEN')}</Badge>;
  };

  const isFutureDue = (r: CareQueueRow | null) =>
    !!r && !!r.next_water_due && dueState(r.next_water_due) !== 'overdue' && dueState(r.next_water_due) !== 'today';

  const openDetail = (r: CareQueueRow, a: CareActionType) => {
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
      await loadInventory();
      setToolsOpen(true);
      toast({ title: l('Visit started', 'Visita iniciada', 'Besuch gestartet') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error', 'Fehler'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleAssignTools = async () => {
    if (!shiftId) return;
    const items = Object.entries(pick).filter(([, q]) => q > 0).map(([inventory_item_id, quantity]) => ({ inventory_item_id, quantity }));
    setBusy('tools');
    try {
      if (items.length) await assignVisitTools(shiftId, items);
      await Promise.all([refreshTools(shiftId), loadInventory()]);
      setPick({});
      setToolsOpen(false);
      toast({ title: l('Tools registered', 'Herramientas registradas', 'Werkzeuge erfasst') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error', 'Fehler'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleReturnTools = async () => {
    if (!shiftId) return;
    const items = pendingTools
      .map((t) => ({
        assignment_id: t.id,
        quantity_returned_now: Number(returnQty[t.id] ?? 0),
        condition: returnCond[t.id] || 'good',
      }))
      .filter((i) => i.quantity_returned_now > 0);
    if (!items.length) {
      toast({
        title: l('Nothing to return', 'Nada por devolver', 'Nichts zurückzugeben'),
        description: l('Enter a quantity greater than zero.', 'Indique una cantidad mayor que cero.', 'Geben Sie eine Menge größer als null ein.'),
        variant: 'destructive',
      });
      return;
    }
    setBusy('return');
    try {
      await returnVisitTools(shiftId, items);
      await Promise.all([refreshTools(shiftId), loadInventory()]);
      setReturnQty({}); setReturnCond({});
      toast({ title: l('Tools returned', 'Herramientas devueltas', 'Werkzeuge zurückgegeben') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error', 'Fehler'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleLog = async () => {
    if (!detail) return;
    if (action === 'water' && isFutureDue(detail) && !overrideReason.trim()) {
      toast({
        title: l('Too early to water', 'Aún es pronto para regar', 'Noch zu früh zum Gießen'),
        description: `${l('Do not water before', 'No regar antes del', 'Nicht gießen vor dem')} ${formatDateEs(detail.next_water_due)}. ${l('A reason is required.', 'Se requiere un motivo.', 'Ein Grund ist erforderlich.')}`,
        variant: 'destructive',
      });
      return;
    }
    setBusy('log');
    try {
      let photoPath: string | null = null;
      if (photo && profile?.org_id) photoPath = await uploadPlacementPhoto(profile.org_id, detail.placement_id, photo);
      const res = await logCare({
        placementId: detail.placement_id,
        actionType: action,
        notes: note || null,
        amountNote: amountNote || null,
        photoPath,
        shiftId,
        overrideReason: overrideReason || null,
      });
      if ((res as any)?.too_early && !overrideReason) {
        toast({
          title: l('Too early to water', 'Aún es pronto para regar', 'Noch zu früh zum Gießen'),
          description: l('Add a reason to confirm.', 'Agregue un motivo para confirmar.', 'Fügen Sie einen Grund hinzu, um zu bestätigen.'),
          variant: 'destructive',
        });
        return;
      }
      const nextDue = (res as any)?.care?.next_water_due ?? null;
      if (action === 'water' && nextDue) {
        toast({
          title: l('Plant watered', 'Planta regada', 'Pflanze gegossen'),
          description: `${l('Do not water again before', 'No volver a regar antes del', 'Nicht erneut gießen vor dem')} ${formatDateEs(nextDue)}.`,
        });
      } else {
        toast({ title: l('Registered', 'Registrado', 'Erfasst') });
      }
      setDetail(null);
      load();
    } catch (e: any) {
      const msg = String(e.message || '');
      if (/too early|demasiado pronto/i.test(msg) && !overrideReason) {
        toast({
          title: l('Too early to water', 'Aún es pronto para regar', 'Noch zu früh zum Gießen'),
          description: l('Add a reason to confirm.', 'Agregue un motivo para confirmar.', 'Fügen Sie einen Grund hinzu, um zu bestätigen.'),
          variant: 'destructive',
        });
      } else {
        toast({ title: l('Error', 'Error', 'Fehler'), description: msg, variant: 'destructive' });
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
      toast({ title: l('Charge added to draft invoice', 'Cargo agregado a la factura borrador', 'Position zur Rechnungsvorlage hinzugefügt') });
      setChargeOpen(false);
      setCharge({ description: '', quantity: '1', unitPrice: '', currency: charge.currency });
    } catch (e: any) {
      toast({ title: l('Error', 'Error', 'Fehler'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleClose = async () => {
    if (!shiftId) return;
    if (pendingUnits > 0 && !toolsException.trim()) {
      toast({
        title: l('Tools pending', 'Herramientas pendientes', 'Offene Werkzeuge'),
        description: l(
          'Return the tools of this visit or record an exception reason.',
          'Devuelva las herramientas de esta visita o registre un motivo de excepción.',
          'Geben Sie die Werkzeuge dieses Besuchs zurück oder erfassen Sie einen Ausnahmegrund.',
        ),
        variant: 'destructive',
      });
      return;
    }
    setBusy('close');
    try {
      await closeVisit({
        shiftId,
        workDescription: closeNotes || null,
        toolsExceptionReason: pendingUnits > 0 ? toolsException : null,
      });
      toast({ title: l('Visit closed', 'Visita cerrada', 'Besuch abgeschlossen') });
      setShiftId(null); setCloseOpen(false); setCloseNotes(''); setToolsException('');
      setVisitTools([]);
      loadInventory();
    } catch (e: any) {
      toast({ title: l('Error', 'Error', 'Fehler'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  return (
    <ModernAppLayout>
      <main className="p-4 space-y-4 safe-area-content max-w-3xl mx-auto">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold">{l('Visit', 'Visita', 'Besuch')}</h1>
          <p className="text-sm text-muted-foreground">
            {currentEstate?.name} · {l('WATER', 'REGAR', 'GIESSEN')}: {counts.regar} · {l('REVIEW', 'REVISAR', 'PRÜFEN')}: {counts.revisar} · {l('DO NOT WATER', 'NO REGAR', 'NICHT GIESSEN')}: {counts.no_regar}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {shiftId ? (
            <>
              <Button variant="outline" onClick={() => setToolsOpen(true)}>
                <Wrench className="h-4 w-4 mr-2" />{l('Tools', 'Herramientas', 'Werkzeuge')}
              </Button>
              <Button variant="outline" onClick={() => { setReturnQty({}); setReturnCond({}); setCheckoutOpen(true); }}>
                <PackageCheck className="h-4 w-4 mr-2" />
                {l('Check out tools', 'Devolver herramientas', 'Werkzeuge zurückgeben')}
                {pendingUnits > 0 && <Badge variant="destructive" className="ml-2">{pendingUnits}</Badge>}
              </Button>
              <Button variant="secondary" onClick={() => setChargeOpen(true)}>
                <Receipt className="h-4 w-4 mr-2" />{l('Charge', 'Cargo', 'Position')}
              </Button>
              <Button onClick={() => setCloseOpen(true)}>
                <Square className="h-4 w-4 mr-2" />{l('Close visit', 'Cerrar visita', 'Besuch abschließen')}
              </Button>
            </>
          ) : (
            <Button className="flex-1" onClick={handleStart} disabled={busy === 'visit' || !currentEstate}>
              {busy === 'visit' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              {l('Start visit', 'Iniciar visita', 'Besuch starten')}
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : rows.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">
            {l('No installed plants on this property.', 'No hay plantas instaladas en esta propiedad.', 'Keine installierten Pflanzen auf diesem Objekt.')}
          </CardContent></Card>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <Card key={r.placement_id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.plant_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {[r.zone_name, r.spot_label].filter(Boolean).join(' · ') || l('No spot', 'Sin punto', 'Kein Standort')}
                      </p>
                      {r.care_state === 'no_regar' && (
                        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-1">
                          {l('DO NOT WATER BEFORE', 'NO REGAR ANTES DEL', 'NICHT GIESSEN VOR DEM')} {formatDateEs(r.next_water_due)}
                        </p>
                      )}
                      {r.effective_days != null && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {l('Every', 'Cada', 'Alle')} {r.effective_days} {l('days', 'días', 'Tage')}
                        </p>
                      )}
                      {r.water_amount_note && (
                        <p className="text-sm text-muted-foreground mt-1">💧 {r.water_amount_note}</p>
                      )}
                      {r.water_method && (
                        <p className="text-sm text-muted-foreground">{l('Method', 'Método', 'Methode')}: {r.water_method}</p>
                      )}
                      {r.open_incident && (
                        <p className="text-sm font-semibold text-destructive mt-1">
                          {l('Open issue', 'Incidencia abierta', 'Offener Vorfall')}
                        </p>
                      )}
                      {r.replacement_pending && (
                        <p className="text-sm text-destructive">
                          {l('Replacement pending', 'Reemplazo pendiente', 'Ersatz ausstehend')}
                        </p>
                      )}
                      {r.do_not_do && (
                        <p className="text-sm text-destructive mt-1">{l('Do not', 'No hacer', 'Nicht tun')}: {r.do_not_do}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {badgeFor(r)}
                      <Button size="icon" variant="ghost" aria-label={l('Care plan', 'Plan de cuidado', 'Pflegeplan')}
                        onClick={() => navigate(`/plantops/cuidados/${r.placement_id}`)}>
                        <Settings2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Button size="sm" onClick={() => openDetail(r, 'water')}>
                      <Droplets className="h-4 w-4 mr-1" />{l('Watered', 'Regada', 'Gegossen')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(r, 'skip_water')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />{l('No water', 'Sin agua', 'Kein Wasser')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(r, 'clean')}>
                      <Brush className="h-4 w-4 mr-1" />{l('Cleaned', 'Limpieza', 'Gereinigt')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => openDetail(r, 'issue')}>
                      <AlertTriangle className="h-4 w-4 mr-1" />{l('Issue', 'Problema', 'Problem')}
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
            <DialogDescription>{l('Register the action performed.', 'Registre la acción realizada.', 'Erfassen Sie die durchgeführte Maßnahme.')}</DialogDescription>
          </DialogHeader>
          {action === 'water' && isFutureDue(detail) && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm">
              <p className="font-semibold text-destructive">
                {l('DO NOT WATER BEFORE', 'NO REGAR ANTES DEL', 'NICHT GIESSEN VOR DEM')} {formatDateEs(detail?.next_water_due)}
              </p>
              <p className="text-muted-foreground">
                {l('Watering earlier requires a reason, saved in the care log.', 'Regar antes requiere un motivo, que queda guardado en el historial.', 'Früheres Gießen erfordert einen Grund, der im Verlauf gespeichert wird.')}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label>{l('Action', 'Acción', 'Maßnahme')}</Label>
              <Select value={action} onValueChange={(v) => setAction(v as CareActionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="water">{l('Watered', 'Regada', 'Gegossen')}</SelectItem>
                  <SelectItem value="skip_water">{l('No water needed', 'No necesitaba agua', 'Kein Wasser nötig')}</SelectItem>
                  <SelectItem value="clean">{l('Cleaned', 'Limpieza', 'Gereinigt')}</SelectItem>
                  <SelectItem value="prune">{l('Pruned', 'Poda', 'Beschnitten')}</SelectItem>
                  <SelectItem value="fertilize">{l('Fertilized', 'Abonada', 'Gedüngt')}</SelectItem>
                  <SelectItem value="rotate">{l('Rotated', 'Rotada', 'Gedreht')}</SelectItem>
                  <SelectItem value="inspect">{l('Inspected', 'Revisada', 'Geprüft')}</SelectItem>
                  <SelectItem value="issue">{l('Issue', 'Problema', 'Problem')}</SelectItem>
                  <SelectItem value="replace_requested">{l('Replacement requested', 'Reemplazo solicitado', 'Ersatz angefordert')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {action === 'water' && (
              <div>
                <Label>{l('Amount', 'Cantidad', 'Menge')}</Label>
                <Input value={amountNote} onChange={(e) => setAmountNote(e.target.value)} placeholder={l('e.g. 1 liter', 'ej. 1 litro', 'z. B. 1 Liter')} />
              </div>
            )}
            <div>
              <Label>{l('Notes', 'Notas', 'Notizen')}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <div>
              <Label className="flex items-center gap-2"><Camera className="h-4 w-4" />{l('Photo (optional)', 'Foto (opcional)', 'Foto (optional)')}</Label>
              <Input type="file" accept="image/*" capture="environment"
                onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <Label>{l('Reason (if out of schedule)', 'Motivo (si está fuera de programa)', 'Grund (bei Abweichung vom Plan)')}</Label>
              <Input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetail(null)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
            <Button onClick={handleLog} disabled={busy === 'log'}>
              {busy === 'log' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Save', 'Guardar', 'Speichern')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool check-in — organization-wide stock */}
      <Dialog open={toolsOpen} onOpenChange={setToolsOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l('What tools are you bringing?', '¿Qué herramientas lleva?', 'Welche Werkzeuge nehmen Sie mit?')}</DialogTitle>
            <DialogDescription>
              {l('They stay linked to this visit until you check them out.', 'Quedan ligadas a esta visita hasta que las devuelva.', 'Sie bleiben diesem Besuch zugeordnet, bis Sie sie zurückgeben.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {inventory.length === 0 && (
              <p className="text-sm text-muted-foreground">
                {l('No tools registered in your organization.', 'No hay herramientas registradas en su organización.', 'In Ihrer Organisation sind keine Werkzeuge erfasst.')}
              </p>
            )}
            {inventory.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 border-b border-border/50 pb-2">
                <div className="min-w-0">
                  <p className="text-sm truncate">{i.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {i.estate_name} · {l('Available', 'Disponible', 'Verfügbar')}: {i.available} / {i.quantity}
                    {i.assigned_open > 0 && ` · ${l('Out', 'Fuera', 'Ausgegeben')}: ${i.assigned_open}`}
                  </p>
                </div>
                <Input type="number" min="0" max={i.available} className="w-20"
                  aria-label={i.name}
                  value={pick[i.id] ?? ''}
                  onChange={(e) => setPick({ ...pick, [i.id]: Number(e.target.value) || 0 })} />
              </div>
            ))}
            {visitTools.length > 0 && (
              <div className="pt-2 text-sm text-muted-foreground">
                {l('Already on this visit', 'Ya en esta visita', 'Bereits bei diesem Besuch')}: {visitTools.map((t) => `${t.name}×${t.quantity_assigned}`).join(', ')}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToolsOpen(false)}>{l('Skip', 'Omitir', 'Überspringen')}</Button>
            <Button onClick={handleAssignTools} disabled={busy === 'tools'}>
              {busy === 'tools' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Confirm', 'Confirmar', 'Bestätigen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tool checkout — partial returns */}
      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{l('Check out tools', 'Devolver herramientas', 'Werkzeuge zurückgeben')}</DialogTitle>
            <DialogDescription>
              {l('Only the tools taken out on this visit.', 'Solo las herramientas sacadas en esta visita.', 'Nur die bei diesem Besuch entnommenen Werkzeuge.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {pendingTools.length === 0 && (
              <p className="text-sm text-muted-foreground">{l('Nothing pending.', 'Nada pendiente.', 'Nichts offen.')}</p>
            )}
            {pendingTools.map((t) => {
              const pending = t.quantity_assigned - t.quantity_returned;
              return (
                <div key={t.id} className="space-y-2 border-b border-border/50 pb-3">
                  <p className="text-sm font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {l('Assigned', 'Asignadas', 'Ausgegeben')}: {t.quantity_assigned} ·{' '}
                    {l('Returned', 'Devueltas', 'Zurückgegeben')}: {t.quantity_returned} ·{' '}
                    {l('Pending', 'Pendientes', 'Offen')}: {pending}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">{l('Return now', 'Devolver ahora', 'Jetzt zurückgeben')}</Label>
                      <Input type="number" min="0" max={pending}
                        value={returnQty[t.id] ?? ''}
                        onChange={(e) => setReturnQty({ ...returnQty, [t.id]: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <Label className="text-sm">{l('Condition', 'Condición', 'Zustand')}</Label>
                      <Select value={returnCond[t.id] ?? ''} onValueChange={(v) => setReturnCond({ ...returnCond, [t.id]: v })}>
                        <SelectTrigger><SelectValue placeholder={l('Condition on return', 'Condición al devolver', 'Zustand bei Rückgabe')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="good">{l('Good', 'Buena', 'Gut')}</SelectItem>
                          <SelectItem value="fair">{l('Fair', 'Regular', 'Mittel')}</SelectItem>
                          <SelectItem value="needs_repair">{l('Needs repair', 'Requiere reparación', 'Reparatur nötig')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>{l('Close', 'Cerrar', 'Schließen')}</Button>
            <Button onClick={handleReturnTools} disabled={busy === 'return' || pendingTools.length === 0}>
              {busy === 'return' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Confirm return', 'Confirmar devolución', 'Rückgabe bestätigen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Charge dialog */}
      <Dialog open={chargeOpen} onOpenChange={setChargeOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{l('Extra charge', 'Cargo extra', 'Zusatzposition')}</DialogTitle>
            <DialogDescription>
              {l('Adds a line to the client draft invoice.', 'Agrega una línea a la factura borrador del cliente.', 'Fügt der Rechnungsvorlage des Kunden eine Zeile hinzu.')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>{l('Client', 'Cliente', 'Kunde')}</Label>
              <Input readOnly value={estateClientName || l('No client assigned to this property', 'Esta propiedad no tiene cliente asignado', 'Diesem Objekt ist kein Kunde zugeordnet')} />
            </div>
            <div>
              <Label>{l('Description', 'Descripción', 'Beschreibung')}</Label>
              <Input value={charge.description} onChange={(e) => setCharge({ ...charge, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label>{l('Qty', 'Cant.', 'Menge')}</Label>
                <Input type="number" min="1" value={charge.quantity} onChange={(e) => setCharge({ ...charge, quantity: e.target.value })} />
              </div>
              <div>
                <Label>{l('Unit price', 'Precio', 'Preis')}</Label>
                <Input type="number" min="0" value={charge.unitPrice} onChange={(e) => setCharge({ ...charge, unitPrice: e.target.value })} />
              </div>
              <div>
                <Label>{l('Currency', 'Moneda', 'Währung')}</Label>
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
            <Button variant="outline" onClick={() => setChargeOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
            <Button onClick={handleCharge} disabled={busy === 'charge' || !estateClient}>
              {busy === 'charge' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Add', 'Agregar', 'Hinzufügen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close visit */}
      <Dialog open={closeOpen} onOpenChange={setCloseOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{l('Close visit', 'Cerrar visita', 'Besuch abschließen')}</DialogTitle>
            <DialogDescription>{l('Summary of the work done.', 'Resumen del trabajo realizado.', 'Zusammenfassung der Arbeiten.')}</DialogDescription>
          </DialogHeader>
          {pendingUnits > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 space-y-2">
              <p className="text-sm font-semibold text-destructive">
                {l('Tools not returned', 'Herramientas sin devolver', 'Nicht zurückgegebene Werkzeuge')}:{' '}
                {pendingTools.map((t) => `${t.name} (${t.quantity_assigned - t.quantity_returned})`).join(', ')}
              </p>
              <Label className="text-sm">
                {l('Exception reason (required to close anyway)', 'Motivo de excepción (requerido para cerrar así)', 'Ausnahmegrund (zum Abschließen erforderlich)')}
              </Label>
              <Input value={toolsException} onChange={(e) => setToolsException(e.target.value)} />
            </div>
          )}
          <Textarea value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
            <Button onClick={handleClose} disabled={busy === 'close'}>
              {busy === 'close' && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{l('Close', 'Cerrar', 'Abschließen')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModernAppLayout>
  );
}
