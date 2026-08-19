import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Leaf, Plus, Loader2, MapPin, PackageCheck, RefreshCw, Truck, XCircle, Search, Sprout,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/currency';
import { usePlantOpsData } from '@/hooks/usePlantOps';
import {
  upsertAssetDetails, reserveAsset, installAsset, collectAsset, cancelReservation, replacePlant,
  uploadPlacementPhoto, type PlantOpsAssetRow,
} from '@/lib/plantops';
import { fetchIncompleteSetups } from '@/lib/plantopsProperty';
import { useModules } from '@/hooks/useModules';
import { moduleLabel, moduleDescription } from '@/lib/homeGuideModules';

export default function PlantOps() {
  const { tl, language } = useLanguage();
  const navigate = useNavigate();
  const { estates } = useEstate();
  const { orgId, inventory, placements, contracts, loading, error, refetch } = usePlantOpsData();
  const { navModules, isEnabled } = useModules();
  const l = (en: string, es: string, de: string) => tl({ en, es, de });

  const [search, setSearch] = useState('');
  const [incomplete, setIncomplete] = useState<{ id: string; name: string; client_name: string | null }[]>([]);

  React.useEffect(() => {
    if (!orgId) return;
    let cancelled = false;
    fetchIncompleteSetups(orgId)
      .then((rows) => { if (!cancelled) setIncomplete(rows); })
      .catch(() => { if (!cancelled) setIncomplete([]); });
    return () => { cancelled = true; };
  }, [orgId, placements.length]);

  const [busy, setBusy] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [selected, setSelected] = useState<PlantOpsAssetRow | null>(null);

  const [detailsForm, setDetailsForm] = useState({
    assetId: '', lifecycle: 'active', condition: '', supplier: '', cost: '', replacement: '', rental: '', currency: 'CRC', acquisition: '', retiredReason: '',
  });
  const [reserveForm, setReserveForm] = useState({
    estateId: '', contractId: '', spotLabel: '', from: '', until: '', notes: '', access: '',
  });
  const [collectForm, setCollectForm] = useState({ condition: '', next: 'active', reason: '' });
  const [replaceForm, setReplaceForm] = useState({ replacementAssetId: '', cause: '', retired: 'recovery', condition: '' });
  const [installFile, setInstallFile] = useState<File | null>(null);

  const plants = useMemo(
    () => inventory.filter((i) => i.asset_type !== 'pot' && i.name.toLowerCase().includes(search.toLowerCase())),
    [inventory, search],
  );
  const pots = useMemo(
    () => inventory.filter((i) => i.asset_type === 'pot' && i.name.toLowerCase().includes(search.toLowerCase())),
    [inventory, search],
  );
  const availablePlants = useMemo(
    () => inventory.filter((i) => i.asset_type !== 'pot' && i.lifecycle_status === 'active' && !i.placement),
    [inventory],
  );

  const stats = useMemo(() => ({
    total: inventory.length,
    installed: inventory.filter((i) => i.placement?.status === 'installed').length,
    reserved: inventory.filter((i) => i.placement?.status === 'reserved').length,
    recovery: inventory.filter((i) => i.lifecycle_status === 'recovery').length,
  }), [inventory]);

  const estateName = (id?: string | null) => estates.find((e) => e.id === id)?.name ?? '—';

  const lifecycleBadge = (s: string) => {
    const map: Record<string, string> = {
      active: 'bg-primary/15 text-primary border-primary/30',
      recovery: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
      retired: 'bg-muted text-muted-foreground border-border',
    };
    const label: Record<string, string> = {
      active: l('Active', 'Activa', 'Aktiv'),
      recovery: l('In recovery', 'En recuperación', 'Erholung'),
      retired: l('Retired', 'Retirada', 'Ausgemustert'),
    };
    return <Badge variant="outline" className={map[s]}>{label[s] ?? s}</Badge>;
  };

  const run = async (fn: () => Promise<void>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      await refetch();
      return true;
    } catch (e: any) {
      toast.error(e?.message || l('Operation failed', 'La operación falló', 'Vorgang fehlgeschlagen'));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openDetails = (row: PlantOpsAssetRow) => {
    setSelected(row);
    setDetailsForm({
      assetId: row.asset_id,
      lifecycle: row.lifecycle_status,
      condition: row.condition_rating?.toString() ?? '',
      supplier: row.supplier_name ?? '',
      cost: row.cost?.toString() ?? '',
      replacement: row.replacement_value?.toString() ?? '',
      rental: row.rental_price?.toString() ?? '',
      currency: row.currency || 'CRC',
      acquisition: row.acquisition_date ?? '',
      retiredReason: row.retired_reason ?? '',
    });
    setDetailsOpen(true);
  };

  const saveDetails = async () => {
    const ok = await run(async () => {
      await upsertAssetDetails({
        assetId: detailsForm.assetId,
        lifecycleStatus: detailsForm.lifecycle as any,
        conditionRating: detailsForm.condition ? Number(detailsForm.condition) : null,
        supplierName: detailsForm.supplier || null,
        cost: detailsForm.cost ? Number(detailsForm.cost) : null,
        replacementValue: detailsForm.replacement ? Number(detailsForm.replacement) : null,
        rentalPrice: detailsForm.rental ? Number(detailsForm.rental) : null,
        currency: detailsForm.currency,
        acquisitionDate: detailsForm.acquisition || null,
        retiredReason: detailsForm.retiredReason || null,
      });
    }, l('Details saved', 'Detalles guardados', 'Details gespeichert'));
    if (ok) setDetailsOpen(false);
  };

  const openReserve = (row: PlantOpsAssetRow) => {
    setSelected(row);
    setReserveForm({
      estateId: estates[0]?.id ?? '', contractId: '', spotLabel: '', from: new Date().toISOString().slice(0, 10), until: '', notes: '', access: '',
    });
    setReserveOpen(true);
  };

  const submitReserve = async () => {
    if (!selected) return;
    if (!reserveForm.estateId || !reserveForm.from) {
      toast.error(l('Site and start date are required', 'Sede y fecha de inicio son obligatorias', 'Standort und Startdatum erforderlich'));
      return;
    }
    const ok = await run(async () => {
      await reserveAsset({
        assetId: selected.asset_id,
        estateId: reserveForm.estateId,
        contractId: reserveForm.contractId || null,
        spotLabel: reserveForm.spotLabel || null,
        reservedFrom: new Date(reserveForm.from).toISOString(),
        reservedUntil: reserveForm.until ? new Date(reserveForm.until).toISOString() : null,
        spotNotes: reserveForm.notes || null,
        accessNotes: reserveForm.access || null,
      });
    }, l('Reserved', 'Reservada', 'Reserviert'));
    if (ok) setReserveOpen(false);
  };

  const doInstall = async (row: PlantOpsAssetRow) => {
    if (!row.placement || !orgId) return;
    await run(async () => {
      let path: string | null = null;
      if (installFile) path = await uploadPlacementPhoto(orgId, row.placement!.id, installFile);
      await installAsset(row.placement!.id, path);
      setInstallFile(null);
    }, l('Installed on site', 'Instalada en sitio', 'Vor Ort installiert'));
  };

  const submitCollect = async () => {
    if (!selected?.placement) return;
    const ok = await run(async () => {
      await collectAsset({
        placementId: selected.placement!.id,
        conditionRating: collectForm.condition ? Number(collectForm.condition) : null,
        nextLifecycle: collectForm.next as any,
        retiredReason: collectForm.reason || null,
      });
    }, l('Collected', 'Retirada', 'Abgeholt'));
    if (ok) setCollectOpen(false);
  };

  const submitReplace = async () => {
    if (!selected?.placement || !replaceForm.replacementAssetId) {
      toast.error(l('Select a replacement plant', 'Seleccione una planta de reemplazo', 'Ersatzpflanze auswählen'));
      return;
    }
    const ok = await run(async () => {
      await replacePlant({
        placementId: selected.placement!.id,
        replacementAssetId: replaceForm.replacementAssetId,
        cause: replaceForm.cause || null,
        retiredLifecycle: replaceForm.retired as any,
        conditionRating: replaceForm.condition ? Number(replaceForm.condition) : null,
      });
    }, l('Plant replaced', 'Planta reemplazada', 'Pflanze ersetzt'));
    if (ok) setReplaceOpen(false);
  };

  const renderRows = (rows: PlantOpsAssetRow[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{l('Name', 'Nombre', 'Name')}</TableHead>
          <TableHead>{l('Status', 'Estado', 'Status')}</TableHead>
          <TableHead>{l('Location', 'Ubicación', 'Standort')}</TableHead>
          <TableHead>{l('Rental price', 'Precio alquiler', 'Mietpreis')}</TableHead>
          <TableHead className="text-right">{l('Actions', 'Acciones', 'Aktionen')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.asset_id}>
            <TableCell className="font-medium">
              <button className="hover:underline text-left" onClick={() => openDetails(row)}>{row.name}</button>
              {row.condition_rating != null && (
                <span className="ml-2 text-xs text-muted-foreground">{row.condition_rating}/5</span>
              )}
            </TableCell>
            <TableCell className="space-x-2">
              {lifecycleBadge(row.lifecycle_status)}
              {row.placement?.status === 'reserved' && (
                <Badge variant="outline">{l('Reserved', 'Reservada', 'Reserviert')}</Badge>
              )}
              {row.placement?.status === 'installed' && (
                <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">
                  {l('On site', 'En sitio', 'Vor Ort')}
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {row.placement ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {estateName(row.placement.estate_id)}
                  {row.placement.spot_label ? ` · ${row.placement.spot_label}` : ''}
                </span>
              ) : (
                l('Warehouse', 'Bodega', 'Lager')
              )}
            </TableCell>
            <TableCell className="text-sm">
              {row.rental_price != null ? formatCurrency(row.rental_price, row.currency as any) : '—'}
            </TableCell>
            <TableCell className="text-right space-x-1 whitespace-nowrap">
              {!row.placement && row.lifecycle_status === 'active' && (
                <Button size="sm" variant="outline" onClick={() => openReserve(row)}>
                  <PackageCheck className="h-3.5 w-3.5 mr-1" />{l('Reserve', 'Reservar', 'Reservieren')}
                </Button>
              )}
              {row.placement?.status === 'reserved' && (
                <>
                  <Button size="sm" onClick={() => doInstall(row)} disabled={busy}>
                    <Truck className="h-3.5 w-3.5 mr-1" />{l('Install', 'Instalar', 'Installieren')}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => run(() => cancelReservation(row.placement!.id), l('Reservation cancelled', 'Reserva cancelada', 'Reservierung storniert'))}>
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
              {row.placement?.status === 'installed' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => { setSelected(row); setCollectForm({ condition: '', next: 'active', reason: '' }); setCollectOpen(true); }}>
                    {l('Collect', 'Retirar', 'Abholen')}
                  </Button>
                  {row.asset_type !== 'pot' && (
                    <Button size="sm" variant="ghost" onClick={() => { setSelected(row); setReplaceForm({ replacementAssetId: '', cause: '', retired: 'recovery', condition: '' }); setReplaceOpen(true); }}>
                      <RefreshCw className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </>
              )}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
              {l('No records yet', 'Aún no hay registros', 'Noch keine Einträge')}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <ModernAppLayout>
      <main className="p-4 md:p-6 space-y-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sprout className="h-6 w-6 text-primary" />
              PlantOps
            </h1>
            <p className="text-sm text-muted-foreground">
              {l('Plant rental inventory, placements and replacements', 'Inventario de alquiler de plantas, ubicaciones y reemplazos', 'Mietbestand, Standorte und Ersatz')}
            </p>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder={l('Search…', 'Buscar…', 'Suchen…')} value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        {navModules.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {navModules.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => navigate(m.navRoute!)}
                className="text-left rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
              >
                <m.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium mt-2">{moduleLabel(m.key, language)}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{moduleDescription(m.key, language)}</p>
              </button>
            ))}
          </div>
        )}

        {isEnabled('plants_pots') && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { label: l('Registered units', 'Unidades registradas', 'Registrierte Einheiten'), value: stats.total },
              { label: l('On site', 'En sitio', 'Vor Ort'), value: stats.installed },
              { label: l('Reserved', 'Reservadas', 'Reserviert'), value: stats.reserved },
              { label: l('In recovery', 'En recuperación', 'In Erholung'), value: stats.recovery },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}


        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">{l('Properties', 'Propiedades', 'Objekte')}</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigate('/plantops/clientes')}>
                {l('Clients', 'Clientes', 'Kunden')}
              </Button>
              <Button size="sm" onClick={() => navigate('/plantops/nuevo-cliente')}>
                {l('New client', 'Nuevo cliente', 'Neuer Kunde')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {incomplete.length > 0 && (
              <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 space-y-2">
                <p className="text-sm font-medium">
                  {l('Unfinished setups', 'Configuraciones incompletas', 'Unvollständige Einrichtungen')}
                </p>
                {incomplete.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm truncate">{e.name}</p>
                      {e.client_name && <p className="text-xs text-muted-foreground truncate">{e.client_name}</p>}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/plantops/nuevo-cliente?estate=${e.id}`)}
                    >
                      {l('Continue setup', 'Continuar configuración', 'Einrichtung fortsetzen')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {estates.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {l('No properties yet.', 'Sin propiedades todavía.', 'Noch keine Objekte.')}
              </p>
            ) : (
              estates.map((e) => (
                <button
                  key={e.id}
                  onClick={() => navigate(`/plantops/propiedad/${e.id}`)}
                  className="w-full text-left rounded-lg border p-3 hover:border-primary/50 transition-colors"
                >
                  <p className="font-medium text-sm">{e.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {placements.filter((p) => p.estate_id === e.id && p.status === 'installed').length}{' '}
                    {l('plants on site', 'plantas en sitio', 'Pflanzen vor Ort')}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <Tabs defaultValue={isEnabled('plants_pots') ? 'plants' : 'history'}>
            <TabsList>
              {isEnabled('plants_pots') && (
                <>
                  <TabsTrigger value="plants"><Leaf className="h-4 w-4 mr-1" />{l('Plants', 'Plantas', 'Pflanzen')}</TabsTrigger>
                  <TabsTrigger value="pots">{l('Pots', 'Macetas', 'Töpfe')}</TabsTrigger>
                </>
              )}
              <TabsTrigger value="history">{l('History', 'Historial', 'Verlauf')}</TabsTrigger>
            </TabsList>


            <TabsContent value="plants" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">{renderRows(plants)}</CardContent></Card>
            </TabsContent>

            <TabsContent value="pots" className="mt-4">
              <Card><CardContent className="p-0 overflow-x-auto">{renderRows(pots)}</CardContent></Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">{l('Placement history', 'Historial de ubicaciones', 'Standortverlauf')}</CardTitle></CardHeader>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{l('Site', 'Sede', 'Standort')}</TableHead>
                        <TableHead>{l('Spot', 'Punto', 'Platz')}</TableHead>
                        <TableHead>{l('Status', 'Estado', 'Status')}</TableHead>
                        <TableHead>{l('From', 'Desde', 'Von')}</TableHead>
                        <TableHead>{l('Collected', 'Retirada', 'Abgeholt')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {placements.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>{estateName(p.estate_id)}</TableCell>
                          <TableCell>{p.spot_label || '—'}</TableCell>
                          <TableCell><Badge variant="outline">{p.status}</Badge></TableCell>
                          <TableCell className="text-sm text-muted-foreground">{format(new Date(p.reserved_from), 'dd MMM yyyy')}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.collected_at ? format(new Date(p.collected_at), 'dd MMM yyyy') : '—'}</TableCell>
                        </TableRow>
                      ))}
                      {placements.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">{l('No placements yet', 'Aún no hay ubicaciones', 'Noch keine Standorte')}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Commercial details */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected?.name}</DialogTitle>
              <DialogDescription>{l('Commercial and lifecycle details', 'Detalles comerciales y de ciclo de vida', 'Kommerzielle und Lebenszyklus-Details')}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{l('Lifecycle', 'Ciclo de vida', 'Lebenszyklus')}</Label>
                <Select value={detailsForm.lifecycle} onValueChange={(v) => setDetailsForm({ ...detailsForm, lifecycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{l('Active', 'Activa', 'Aktiv')}</SelectItem>
                    <SelectItem value="recovery">{l('In recovery', 'En recuperación', 'Erholung')}</SelectItem>
                    <SelectItem value="retired">{l('Retired', 'Retirada', 'Ausgemustert')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('Condition (1-5)', 'Condición (1-5)', 'Zustand (1-5)')}</Label>
                <Input type="number" min={1} max={5} value={detailsForm.condition} onChange={(e) => setDetailsForm({ ...detailsForm, condition: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Supplier', 'Proveedor', 'Lieferant')}</Label>
                <Input value={detailsForm.supplier} onChange={(e) => setDetailsForm({ ...detailsForm, supplier: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Acquisition date', 'Fecha de adquisición', 'Kaufdatum')}</Label>
                <Input type="date" value={detailsForm.acquisition} onChange={(e) => setDetailsForm({ ...detailsForm, acquisition: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Cost', 'Costo', 'Kosten')}</Label>
                <Input type="number" min={0} value={detailsForm.cost} onChange={(e) => setDetailsForm({ ...detailsForm, cost: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Replacement value', 'Valor de reposición', 'Wiederbeschaffungswert')}</Label>
                <Input type="number" min={0} value={detailsForm.replacement} onChange={(e) => setDetailsForm({ ...detailsForm, replacement: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Rental price', 'Precio de alquiler', 'Mietpreis')}</Label>
                <Input type="number" min={0} value={detailsForm.rental} onChange={(e) => setDetailsForm({ ...detailsForm, rental: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Currency', 'Moneda', 'Währung')}</Label>
                <Select value={detailsForm.currency} onValueChange={(v) => setDetailsForm({ ...detailsForm, currency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CRC">CRC</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {detailsForm.lifecycle === 'retired' && (
                <div className="col-span-2 space-y-1">
                  <Label>{l('Retirement reason', 'Motivo de retiro', 'Grund der Ausmusterung')}</Label>
                  <Textarea rows={2} value={detailsForm.retiredReason} onChange={(e) => setDetailsForm({ ...detailsForm, retiredReason: e.target.value })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
              <Button onClick={saveDetails} disabled={busy}>{l('Save', 'Guardar', 'Speichern')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reserve */}
        <Dialog open={reserveOpen} onOpenChange={setReserveOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{l('Reserve', 'Reservar', 'Reservieren')} · {selected?.name}</DialogTitle>
              <DialogDescription>{l('Assign this unit to a client site and date range', 'Asigne esta unidad a una sede y rango de fechas', 'Einheit einem Standort und Zeitraum zuweisen')}</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>{l('Client site', 'Sede del cliente', 'Kundenstandort')}</Label>
                <Select value={reserveForm.estateId} onValueChange={(v) => setReserveForm({ ...reserveForm, estateId: v })}>
                  <SelectTrigger><SelectValue placeholder={l('Select site', 'Seleccione sede', 'Standort wählen')} /></SelectTrigger>
                  <SelectContent>
                    {estates.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Contract (optional)', 'Contrato (opcional)', 'Vertrag (optional)')}</Label>
                <Select value={reserveForm.contractId} onValueChange={(v) => setReserveForm({ ...reserveForm, contractId: v })}>
                  <SelectTrigger><SelectValue placeholder={l('No contract', 'Sin contrato', 'Kein Vertrag')} /></SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.contract_type === 'event' ? l('Event', 'Evento', 'Event') : l('Recurring', 'Recurrente', 'Wiederkehrend')} · {format(new Date(c.starts_on), 'dd MMM yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('From', 'Desde', 'Von')}</Label>
                <Input type="date" value={reserveForm.from} onChange={(e) => setReserveForm({ ...reserveForm, from: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Until (optional)', 'Hasta (opcional)', 'Bis (optional)')}</Label>
                <Input type="date" value={reserveForm.until} onChange={(e) => setReserveForm({ ...reserveForm, until: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Spot label', 'Punto exacto', 'Platzbezeichnung')}</Label>
                <Input placeholder={l('e.g. Floor 2 · Lobby · Column A', 'ej. Piso 2 · Lobby · Columna A', 'z.B. 2. OG · Lobby · Säule A')} value={reserveForm.spotLabel} onChange={(e) => setReserveForm({ ...reserveForm, spotLabel: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Spot notes', 'Notas del punto', 'Platznotizen')}</Label>
                <Textarea rows={2} value={reserveForm.notes} onChange={(e) => setReserveForm({ ...reserveForm, notes: e.target.value })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>{l('Access notes', 'Notas de acceso', 'Zugangshinweise')}</Label>
                <Textarea rows={2} value={reserveForm.access} onChange={(e) => setReserveForm({ ...reserveForm, access: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReserveOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
              <Button onClick={submitReserve} disabled={busy}>{l('Reserve', 'Reservar', 'Reservieren')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Collect */}
        <Dialog open={collectOpen} onOpenChange={setCollectOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{l('Collect', 'Retirar', 'Abholen')} · {selected?.name}</DialogTitle>
              <DialogDescription>{l('Record the condition on collection', 'Registre la condición al retirar', 'Zustand bei Abholung erfassen')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{l('Condition (1-5)', 'Condición (1-5)', 'Zustand (1-5)')}</Label>
                <Input type="number" min={1} max={5} value={collectForm.condition} onChange={(e) => setCollectForm({ ...collectForm, condition: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Next lifecycle', 'Siguiente ciclo', 'Nächster Status')}</Label>
                <Select value={collectForm.next} onValueChange={(v) => setCollectForm({ ...collectForm, next: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{l('Back to warehouse (active)', 'Vuelve a bodega (activa)', 'Zurück ins Lager (aktiv)')}</SelectItem>
                    <SelectItem value="recovery">{l('Recovery', 'Recuperación', 'Erholung')}</SelectItem>
                    <SelectItem value="retired">{l('Retired', 'Retirada', 'Ausgemustert')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {collectForm.next === 'retired' && (
                <div className="space-y-1">
                  <Label>{l('Retirement reason', 'Motivo de retiro', 'Grund')}</Label>
                  <Textarea rows={2} value={collectForm.reason} onChange={(e) => setCollectForm({ ...collectForm, reason: e.target.value })} />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCollectOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
              <Button onClick={submitCollect} disabled={busy}>{l('Confirm', 'Confirmar', 'Bestätigen')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Replace */}
        <Dialog open={replaceOpen} onOpenChange={setReplaceOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{l('Replace plant', 'Reemplazar planta', 'Pflanze ersetzen')}</DialogTitle>
              <DialogDescription>{l('The same spot keeps its history and a completed incident task is logged', 'El mismo punto conserva su historial y se registra una tarea de incidencia completada', 'Der Platz behält seine Historie; eine abgeschlossene Aufgabe wird protokolliert')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>{l('Replacement plant', 'Planta de reemplazo', 'Ersatzpflanze')}</Label>
                <Select value={replaceForm.replacementAssetId} onValueChange={(v) => setReplaceForm({ ...replaceForm, replacementAssetId: v })}>
                  <SelectTrigger><SelectValue placeholder={l('Select', 'Seleccionar', 'Auswählen')} /></SelectTrigger>
                  <SelectContent>
                    {availablePlants.map((p) => <SelectItem key={p.asset_id} value={p.asset_id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('Cause', 'Causa', 'Ursache')}</Label>
                <Textarea rows={2} value={replaceForm.cause} onChange={(e) => setReplaceForm({ ...replaceForm, cause: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>{l('Removed plant goes to', 'La planta retirada pasa a', 'Entfernte Pflanze geht in')}</Label>
                <Select value={replaceForm.retired} onValueChange={(v) => setReplaceForm({ ...replaceForm, retired: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recovery">{l('Recovery', 'Recuperación', 'Erholung')}</SelectItem>
                    <SelectItem value="retired">{l('Retired', 'Retirada', 'Ausgemustert')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{l('Condition (1-5)', 'Condición (1-5)', 'Zustand (1-5)')}</Label>
                <Input type="number" min={1} max={5} value={replaceForm.condition} onChange={(e) => setReplaceForm({ ...replaceForm, condition: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setReplaceOpen(false)}>{l('Cancel', 'Cancelar', 'Abbrechen')}</Button>
              <Button onClick={submitReplace} disabled={busy}>{l('Replace', 'Reemplazar', 'Ersetzen')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </ModernAppLayout>
  );
}
