import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Droplets, Loader2, CheckCircle2, AlertTriangle, Brush, Receipt, Play, Square, Camera, Settings2,
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
import { dueState, logCare, startVisit, closeVisit, addChargeForEstate, type CareActionType } from '@/lib/plantopsCare';
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
  do_not_do: string | null;
  care_responsibility: string | null;
  plant_name: string;
  zone_name: string | null;
}

const ORDER: Record<string, number> = { overdue: 0, today: 1, soon: 2, unknown: 3, ok: 4 };

export default function PlantOpsVisit() {
  const { profile } = useAuth();
  const { currentEstate } = useEstate();
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
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [charge, setCharge] = useState({ clientId: '', description: '', quantity: '1', unitPrice: '', currency: 'CRC' });
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeNotes, setCloseNotes] = useState('');

  const load = useCallback(async () => {
    if (!currentEstate?.id) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('plant_placements')
      .select('id, asset_id, spot_label, spot_notes, access_notes, next_water_due, last_watered_at, water_amount_note, water_method, do_not_do, care_responsibility, asset:assets!plant_placements_asset_id_fkey(name), zone:zones(name)')
      .eq('estate_id', currentEstate.id)
      .eq('status', 'installed');
    if (error) {
      toast({ title: l('Could not load plants', 'No se pudieron cargar las plantas'), description: error.message, variant: 'destructive' });
    } else {
      const mapped = (data || []).map((r: any) => ({
        ...r,
        plant_name: r.asset?.name ?? '—',
        zone_name: r.zone?.name ?? null,
      })) as QueueRow[];
      mapped.sort((a, b) => ORDER[dueState(a.next_water_due)] - ORDER[dueState(b.next_water_due)]);
      setRows(mapped);
    }
    setLoading(false);
  }, [currentEstate?.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!profile?.org_id) return;
    supabase.from('clients').select('id, name').eq('org_id', profile.org_id).order('name')
      .then(({ data }) => setClients(((data || []) as any[]).map((c) => ({ id: c.id, name: c.name }))));
  }, [profile?.org_id]);

  // Resume an open visit for this estate
  useEffect(() => {
    if (!currentEstate?.id || !profile?.id) return;
    supabase.from('worker_shifts').select('id')
      .eq('estate_id', currentEstate.id).eq('user_id', profile.id).is('check_out_at', null)
      .order('check_in_at', { ascending: false }).limit(1)
      .then(({ data }) => { if (data && data[0]) setShiftId((data[0] as any).id); });
  }, [currentEstate?.id, profile?.id]);

  const counts = useMemo(() => {
    const c = { overdue: 0, today: 0, other: 0 };
    rows.forEach((r) => {
      const s = dueState(r.next_water_due);
      if (s === 'overdue') c.overdue++;
      else if (s === 'today') c.today++;
      else c.other++;
    });
    return c;
  }, [rows]);

  const badgeFor = (r: QueueRow) => {
    const s = dueState(r.next_water_due);
    if (s === 'overdue') return <Badge variant="destructive">{l('Overdue', 'Atrasada')}</Badge>;
    if (s === 'today') return <Badge className="bg-primary text-primary-foreground">{l('Today', 'Hoy')}</Badge>;
    if (s === 'soon') return <Badge variant="secondary">{l('Soon', 'Pronto')}</Badge>;
    if (s === 'unknown') return <Badge variant="outline">{l('No plan', 'Sin plan')}</Badge>;
    return <Badge variant="outline">{l('OK', 'Al día')}</Badge>;
  };

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
      toast({ title: l('Visit started', 'Visita iniciada') });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleLog = async () => {
    if (!detail) return;
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
      toast({ title: l('Registered', 'Registrado') });
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
      setCharge({ clientId: charge.clientId, description: '', quantity: '1', unitPrice: '', currency: charge.currency });
    } catch (e: any) {
      toast({ title: l('Error', 'Error'), description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const handleClose = async () => {
    if (!shiftId) return;
    setBusy('close');
    try {
      await closeVisit({ shiftId, workDescription: closeNotes || null });
      toast({ title: l('Visit closed', 'Visita cerrada') });
      setShiftId(null); setCloseOpen(false); setCloseNotes('');
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
            {currentEstate?.name} · {l('Overdue', 'Atrasadas')}: {counts.overdue} · {l('Today', 'Hoy')}: {counts.today}
          </p>
        </header>

        <div className="flex gap-2">
          {shiftId ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => setCloseOpen(true)}>
                <Square className="h-4 w-4 mr-2" />{l('Close visit', 'Cerrar visita')}
              </Button>
              <Button variant="secondary" onClick={() => setChargeOpen(true)}>
                <Receipt className="h-4 w-4 mr-2" />{l('Charge', 'Cargo')}
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{detail?.plant_name}</DialogTitle>
            <DialogDescription>{l('Register the action performed.', 'Registre la acción realizada.')}</DialogDescription>
          </DialogHeader>
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
            <Button onClick={handleCharge} disabled={busy === 'charge'}>
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
