import React, { useState, useEffect } from 'react';
import { Plus, Thermometer, Droplets, RotateCcw, Leaf, Archive, CheckCircle, Package } from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';

interface CompostPile {
  id: string;
  name: string;
  status: string;
  started_at: string;
  estimated_ready_at: string | null;
  volume_liters: number | null;
  notes: string | null;
  zone?: { name: string } | null;
  latest_log?: { temperature_c: number | null; moisture_percent: number | null; logged_at: string } | null;
}

const STATUS_CONFIG: Record<string, { label: string; labelEs: string; color: string; icon: React.ComponentType<any> }> = {
  active: { label: 'Active', labelEs: 'Activa', color: 'bg-green-100 text-green-700', icon: RotateCcw },
  curing: { label: 'Curing', labelEs: 'Curando', color: 'bg-amber-100 text-amber-700', icon: Thermometer },
  ready: { label: 'Ready', labelEs: 'Lista', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  applied: { label: 'Applied', labelEs: 'Aplicada', color: 'bg-purple-100 text-purple-700', icon: Leaf },
  archived: { label: 'Archived', labelEs: 'Archivada', color: 'bg-muted text-muted-foreground', icon: Archive },
};

export default function CompostManager() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const { isOwnerOrManager } = useAuth();
  const es = language === 'es';

  const [piles, setPiles] = useState<CompostPile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPile, setShowNewPile] = useState(false);
  const [showLogDialog, setShowLogDialog] = useState(false);
  const [selectedPile, setSelectedPile] = useState<CompostPile | null>(null);
  const [activeTab, setActiveTab] = useState('active');
  const [newPile, setNewPile] = useState({ name: '', volume_liters: '', notes: '', estimated_ready_at: '' });
  const [logForm, setLogForm] = useState({ temperature_c: '', moisture_percent: '', turned: false, notes: '' });

  useEffect(() => {
    if (currentEstate) fetchPiles();
  }, [currentEstate]);

  async function fetchPiles() {
    if (!currentEstate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('compost_piles')
        .select('*, zones:zone_id(name)')
        .eq('estate_id', currentEstate.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch latest log for each pile
      const pilesWithLogs = await Promise.all((data || []).map(async (pile: any) => {
        const { data: logs } = await supabase
          .from('compost_logs')
          .select('temperature_c, moisture_percent, logged_at')
          .eq('pile_id', pile.id)
          .order('logged_at', { ascending: false })
          .limit(1);
        return { ...pile, zone: pile.zones, latest_log: logs?.[0] || null };
      }));

      setPiles(pilesWithLogs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePile() {
    if (!newPile.name.trim() || !currentEstate) return;
    try {
      const { error } = await supabase.from('compost_piles').insert({
        estate_id: currentEstate.id,
        name: newPile.name,
        volume_liters: newPile.volume_liters ? Number(newPile.volume_liters) : null,
        notes: newPile.notes || null,
        estimated_ready_at: newPile.estimated_ready_at || null,
      });
      if (error) throw error;
      toast.success(es ? 'Pila creada' : 'Pile created');
      setShowNewPile(false);
      setNewPile({ name: '', volume_liters: '', notes: '', estimated_ready_at: '' });
      fetchPiles();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function handleAddLog() {
    if (!selectedPile) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('compost_logs').insert({
        pile_id: selectedPile.id,
        logged_by: user?.id,
        temperature_c: logForm.temperature_c ? Number(logForm.temperature_c) : null,
        moisture_percent: logForm.moisture_percent ? Number(logForm.moisture_percent) : null,
        turned: logForm.turned,
        notes: logForm.notes || null,
      });
      if (error) throw error;
      toast.success(es ? 'Registro agregado' : 'Log added');
      setShowLogDialog(false);
      setLogForm({ temperature_c: '', moisture_percent: '', turned: false, notes: '' });
      fetchPiles();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function updatePileStatus(pile: CompostPile, newStatus: string) {
    try {
      const { error } = await supabase.from('compost_piles').update({ status: newStatus }).eq('id', pile.id);
      if (error) throw error;
      toast.success(es ? 'Estado actualizado' : 'Status updated');
      fetchPiles();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const filteredPiles = piles.filter(p => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return ['active', 'curing'].includes(p.status);
    return p.status === activeTab;
  });

  const stats = {
    active: piles.filter(p => p.status === 'active').length,
    curing: piles.filter(p => p.status === 'curing').length,
    ready: piles.filter(p => p.status === 'ready').length,
  };

  return (
    <ModernAppLayout>
      <div className="container py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold">
              {es ? 'Gestor de Compost' : 'Compost Manager'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {es ? 'Ciclo completo: pilas, ingredientes, monitoreo y aplicación' : 'Full cycle: piles, ingredients, monitoring & application'}
            </p>
          </div>
          {isOwnerOrManager && (
            <Button onClick={() => setShowNewPile(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {es ? 'Nueva Pila' : 'New Pile'}
            </Button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: es ? 'Activas' : 'Active', value: stats.active, icon: RotateCcw, color: 'text-green-600' },
            { label: es ? 'Curando' : 'Curing', value: stats.curing, icon: Thermometer, color: 'text-amber-600' },
            { label: es ? 'Listas' : 'Ready', value: stats.ready, icon: Package, color: 'text-blue-600' },
          ].map(s => (
            <Card key={s.label} className="estate-card">
              <CardContent className="p-4 flex items-center gap-3">
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active">{es ? 'Activas' : 'Active'}</TabsTrigger>
            <TabsTrigger value="ready">{es ? 'Listas' : 'Ready'}</TabsTrigger>
            <TabsTrigger value="all">{es ? 'Todas' : 'All'}</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Pile Cards */}
        <div className="space-y-4">
          {loading ? (
            [1, 2].map(i => <div key={i} className="h-32 rounded-xl shimmer" />)
          ) : filteredPiles.length === 0 ? (
            <Card className="estate-card">
              <CardContent className="py-12 text-center">
                <Leaf className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">{es ? 'Sin pilas en esta categoría' : 'No piles in this category'}</p>
              </CardContent>
            </Card>
          ) : (
            filteredPiles.map(pile => {
              const cfg = STATUS_CONFIG[pile.status] || STATUS_CONFIG.active;
              const Icon = cfg.icon;
              return (
                <Card key={pile.id} className="estate-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{pile.name}</h3>
                          <Badge className={cfg.color}>
                            <Icon className="h-3 w-3 mr-1" />
                            {es ? cfg.labelEs : cfg.label}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-2">
                          <span>{es ? 'Inicio' : 'Started'}: {format(new Date(pile.started_at), 'MMM d, yyyy')}</span>
                          {pile.volume_liters && <span>{pile.volume_liters}L</span>}
                          {pile.estimated_ready_at && (
                            <span>{es ? 'Est. lista' : 'Est. ready'}: {format(new Date(pile.estimated_ready_at), 'MMM d')}</span>
                          )}
                        </div>
                        {/* Latest monitoring */}
                        {pile.latest_log && (
                          <div className="flex gap-4 mt-2 text-sm">
                            {pile.latest_log.temperature_c != null && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1">
                                    <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                                    {pile.latest_log.temperature_c}°C
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{es ? 'Última temperatura registrada' : 'Last recorded temperature'}</TooltipContent>
                              </Tooltip>
                            )}
                            {pile.latest_log.moisture_percent != null && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="flex items-center gap-1">
                                    <Droplets className="h-3.5 w-3.5 text-blue-500" />
                                    {pile.latest_log.moisture_percent}%
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>{es ? 'Última humedad registrada' : 'Last recorded moisture'}</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedPile(pile); setShowLogDialog(true); }}>
                              <Thermometer className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{es ? 'Registrar monitoreo' : 'Log monitoring'}</TooltipContent>
                        </Tooltip>
                        {pile.status === 'active' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => updatePileStatus(pile, 'curing')}>
                                <Thermometer className="h-3.5 w-3.5 text-amber-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{es ? 'Marcar como curando' : 'Mark as curing'}</TooltipContent>
                          </Tooltip>
                        )}
                        {pile.status === 'curing' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => updatePileStatus(pile, 'ready')}>
                                <CheckCircle className="h-3.5 w-3.5 text-blue-500" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{es ? 'Marcar como lista' : 'Mark as ready'}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* New Pile Dialog */}
        <Dialog open={showNewPile} onOpenChange={setShowNewPile}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{es ? 'Nueva Pila de Compost' : 'New Compost Pile'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{es ? 'Nombre' : 'Name'}</Label>
                <Input value={newPile.name} onChange={e => setNewPile(p => ({ ...p, name: e.target.value }))} placeholder={es ? 'Ej: Pila Norte #1' : 'E.g., North Pile #1'} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{es ? 'Volumen (L)' : 'Volume (L)'}</Label>
                  <Input type="number" value={newPile.volume_liters} onChange={e => setNewPile(p => ({ ...p, volume_liters: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{es ? 'Fecha est. lista' : 'Est. ready date'}</Label>
                  <Input type="date" value={newPile.estimated_ready_at} onChange={e => setNewPile(p => ({ ...p, estimated_ready_at: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Notas' : 'Notes'}</Label>
                <Textarea value={newPile.notes} onChange={e => setNewPile(p => ({ ...p, notes: e.target.value }))} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewPile(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleCreatePile}>{es ? 'Crear' : 'Create'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Log Monitoring Dialog */}
        <Dialog open={showLogDialog} onOpenChange={setShowLogDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{es ? 'Registrar Monitoreo' : 'Log Monitoring'} - {selectedPile?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{es ? 'Temperatura (°C)' : 'Temperature (°C)'}</Label>
                  <Input type="number" value={logForm.temperature_c} onChange={e => setLogForm(f => ({ ...f, temperature_c: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{es ? 'Humedad (%)' : 'Moisture (%)'}</Label>
                  <Input type="number" value={logForm.moisture_percent} onChange={e => setLogForm(f => ({ ...f, moisture_percent: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={logForm.turned} onChange={e => setLogForm(f => ({ ...f, turned: e.target.checked }))} />
                <Label>{es ? '¿Se volteó la pila?' : 'Was the pile turned?'}</Label>
              </div>
              <div className="space-y-2">
                <Label>{es ? 'Notas' : 'Notes'}</Label>
                <Textarea value={logForm.notes} onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowLogDialog(false)}>{es ? 'Cancelar' : 'Cancel'}</Button>
              <Button onClick={handleAddLog}>{es ? 'Guardar' : 'Save'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ModernAppLayout>
  );
}
