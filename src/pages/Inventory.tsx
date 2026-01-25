import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, User, Clock, CheckCircle2, AlertCircle, Wrench, Droplets, Box } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type InventoryCategory = 'hand_tool' | 'equipment' | 'supply' | 'material';
type InventoryCondition = 'new' | 'good' | 'fair' | 'needs_repair' | 'out_of_service';

interface InventoryItem {
  id: string;
  name: string;
  name_es: string | null;
  category: InventoryCategory;
  description: string | null;
  quantity: number;
  unit: string;
  condition: InventoryCondition;
  photo_url: string | null;
}

interface ToolAssignment {
  id: string;
  inventory_item_id: string;
  assigned_to_user_id: string;
  quantity_assigned: number;
  assigned_at: string;
  expected_return_at: string | null;
  returned_at: string | null;
  inventory_items?: InventoryItem;
  profiles?: { full_name: string | null; email: string };
}

export default function Inventory() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [assignments, setAssignments] = useState<ToolAssignment[]>([]);
  const [workers, setWorkers] = useState<{ id: string; full_name: string | null; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [showAssignSheet, setShowAssignSheet] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState('inventory');

  const [newItem, setNewItem] = useState({
    name: '',
    name_es: '',
    category: 'hand_tool' as InventoryCategory,
    quantity: 1,
    unit: 'unit',
    condition: 'good' as InventoryCondition
  });

  const [assignForm, setAssignForm] = useState({
    worker_id: '',
    quantity: 1
  });

  useEffect(() => {
    if (currentEstate) {
      fetchData();
    }
  }, [currentEstate]);

  async function fetchData() {
    if (!currentEstate) return;
    setLoading(true);
    
    try {
      const [itemsRes, assignmentsRes, workersRes] = await Promise.all([
        supabase
          .from('inventory_items')
          .select('*')
          .eq('estate_id', currentEstate.id)
          .order('name'),
        supabase
          .from('tool_assignments')
          .select('*, inventory_items(*), profiles(full_name, email)')
          .eq('estate_id', currentEstate.id)
          .is('returned_at', null)
          .order('assigned_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .eq('org_id', currentEstate.org_id)
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;
      
      setItems((itemsRes.data || []) as InventoryItem[]);
      setAssignments((assignmentsRes.data || []) as ToolAssignment[]);
      setWorkers(workersRes.data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function addItem() {
    if (!currentEstate || !newItem.name.trim()) return;

    try {
      const { error } = await supabase.from('inventory_items').insert({
        estate_id: currentEstate.id,
        name: newItem.name,
        name_es: newItem.name_es || null,
        category: newItem.category,
        quantity: newItem.quantity,
        unit: newItem.unit,
        condition: newItem.condition
      });

      if (error) throw error;
      
      toast.success(language === 'es' ? 'Artículo agregado' : 'Item added');
      setShowAddSheet(false);
      setNewItem({ name: '', name_es: '', category: 'hand_tool', quantity: 1, unit: 'unit', condition: 'good' });
      fetchData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error(language === 'es' ? 'Error al agregar' : 'Failed to add');
    }
  }

  async function assignTool() {
    if (!currentEstate || !selectedItem || !assignForm.worker_id) return;

    try {
      const { error } = await supabase.from('tool_assignments').insert({
        estate_id: currentEstate.id,
        inventory_item_id: selectedItem.id,
        assigned_to_user_id: assignForm.worker_id,
        quantity_assigned: assignForm.quantity,
        expected_return_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours from now
      });

      if (error) throw error;
      
      toast.success(language === 'es' ? 'Herramienta asignada' : 'Tool assigned');
      setShowAssignSheet(false);
      setSelectedItem(null);
      setAssignForm({ worker_id: '', quantity: 1 });
      fetchData();
    } catch (error) {
      console.error('Error assigning tool:', error);
      toast.error(language === 'es' ? 'Error al asignar' : 'Failed to assign');
    }
  }

  async function markReturned(assignmentId: string) {
    try {
      const { error } = await supabase
        .from('tool_assignments')
        .update({ 
          returned_at: new Date().toISOString(),
          return_condition: 'good'
        })
        .eq('id', assignmentId);

      if (error) throw error;
      
      toast.success(language === 'es' ? 'Marcado como devuelto' : 'Marked as returned');
      fetchData();
    } catch (error) {
      console.error('Error marking returned:', error);
    }
  }

  const categoryIcons: Record<InventoryCategory, React.ReactNode> = {
    hand_tool: <Wrench className="h-4 w-4" />,
    equipment: <Package className="h-4 w-4" />,
    supply: <Droplets className="h-4 w-4" />,
    material: <Box className="h-4 w-4" />
  };

  const categoryLabels: Record<InventoryCategory, { en: string; es: string }> = {
    hand_tool: { en: 'Hand Tools', es: 'Herramientas' },
    equipment: { en: 'Equipment', es: 'Equipos' },
    supply: { en: 'Supplies', es: 'Suministros' },
    material: { en: 'Materials', es: 'Materiales' }
  };

  const conditionLabels: Record<InventoryCondition, { en: string; es: string }> = {
    new: { en: 'New', es: 'Nuevo' },
    good: { en: 'Good', es: 'Bueno' },
    fair: { en: 'Fair', es: 'Regular' },
    needs_repair: { en: 'Needs Repair', es: 'Necesita Reparación' },
    out_of_service: { en: 'Out of Service', es: 'Fuera de Servicio' }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name_es?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <ModernAppLayout>
      <div className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold">
              {language === 'es' ? 'Inventario' : 'Inventory'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {language === 'es' 
                ? 'Gestiona herramientas, equipos y materiales' 
                : 'Manage tools, equipment, and materials'}
            </p>
          </div>
          <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
            <SheetTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                {language === 'es' ? 'Agregar' : 'Add'}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg overflow-auto">
              <SheetHeader>
                <SheetTitle>
                  {language === 'es' ? 'Agregar Artículo' : 'Add Item'}
                </SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Nombre (EN) *' : 'Name (EN) *'}</Label>
                  <Input
                    placeholder="Shovel, Fertilizer..."
                    value={newItem.name}
                    onChange={(e) => setNewItem(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Nombre (ES)' : 'Name (ES)'}</Label>
                  <Input
                    placeholder="Pala, Fertilizante..."
                    value={newItem.name_es}
                    onChange={(e) => setNewItem(p => ({ ...p, name_es: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Categoría' : 'Category'}</Label>
                  <Select 
                    value={newItem.category} 
                    onValueChange={(v: InventoryCategory) => setNewItem(p => ({ ...p, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(categoryLabels).map(([value, labels]) => (
                        <SelectItem key={value} value={value}>
                          {language === 'es' ? labels.es : labels.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{language === 'es' ? 'Cantidad' : 'Quantity'}</Label>
                    <Input
                      type="number"
                      min={1}
                      value={newItem.quantity}
                      onChange={(e) => setNewItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{language === 'es' ? 'Unidad' : 'Unit'}</Label>
                    <Input
                      placeholder="unit, bag, liter..."
                      value={newItem.unit}
                      onChange={(e) => setNewItem(p => ({ ...p, unit: e.target.value }))}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Condición' : 'Condition'}</Label>
                  <Select 
                    value={newItem.condition} 
                    onValueChange={(v: InventoryCondition) => setNewItem(p => ({ ...p, condition: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(conditionLabels).map(([value, labels]) => (
                        <SelectItem key={value} value={value}>
                          {language === 'es' ? labels.es : labels.en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button className="w-full" onClick={addItem} disabled={!newItem.name.trim()}>
                  {language === 'es' ? 'Agregar Artículo' : 'Add Item'}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="inventory">
              {language === 'es' ? 'Inventario' : 'Inventory'}
            </TabsTrigger>
            <TabsTrigger value="assignments" className="relative">
              {language === 'es' ? 'Asignaciones' : 'Assignments'}
              {assignments.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {assignments.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="inventory" className="mt-4 space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={language === 'es' ? 'Buscar...' : 'Search...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Items Grid */}
            <div className="grid gap-3">
              {filteredItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {categoryIcons[item.category]}
                        </div>
                        <div>
                          <h3 className="font-semibold">
                            {language === 'es' && item.name_es ? item.name_es : item.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.unit}
                          </p>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="secondary" className="text-xs">
                              {categoryLabels[item.category]?.[language === 'es' ? 'es' : 'en']}
                            </Badge>
                            <Badge 
                              variant={item.condition === 'good' || item.condition === 'new' ? 'outline' : 'destructive'}
                              className="text-xs"
                            >
                              {conditionLabels[item.condition]?.[language === 'es' ? 'es' : 'en']}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedItem(item);
                          setShowAssignSheet(true);
                        }}
                      >
                        <User className="h-4 w-4 mr-1" />
                        {language === 'es' ? 'Asignar' : 'Assign'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="assignments" className="mt-4 space-y-4">
            {assignments.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {language === 'es' ? 'No hay asignaciones pendientes' : 'No pending assignments'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {assignments.map((assignment) => (
                  <Card key={assignment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">
                            {(assignment.inventory_items as any)?.name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {(assignment.profiles as any)?.full_name || (assignment.profiles as any)?.email}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {language === 'es' ? 'Asignado:' : 'Assigned:'} {new Date(assignment.assigned_at).toLocaleString()}
                          </p>
                          {assignment.expected_return_at && new Date(assignment.expected_return_at) < new Date() && (
                            <Badge variant="destructive" className="mt-2 text-xs gap-1">
                              <AlertCircle className="h-3 w-3" />
                              {language === 'es' ? 'Devolución pendiente' : 'Return overdue'}
                            </Badge>
                          )}
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => markReturned(assignment.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          {language === 'es' ? 'Devuelto' : 'Returned'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Assign Tool Sheet */}
        <Sheet open={showAssignSheet} onOpenChange={setShowAssignSheet}>
          <SheetContent className="w-full sm:max-w-lg">
            <SheetHeader>
              <SheetTitle>
                {language === 'es' ? 'Asignar Herramienta' : 'Assign Tool'}
              </SheetTitle>
            </SheetHeader>
            
            {selectedItem && (
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-secondary/50 rounded-lg">
                  <p className="font-medium">{selectedItem.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'es' ? 'Disponible:' : 'Available:'} {selectedItem.quantity} {selectedItem.unit}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Trabajador' : 'Worker'}</Label>
                  <Select 
                    value={assignForm.worker_id} 
                    onValueChange={(v) => setAssignForm(p => ({ ...p, worker_id: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={language === 'es' ? 'Seleccionar...' : 'Select...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {workers.map((worker) => (
                        <SelectItem key={worker.id} value={worker.id}>
                          {worker.full_name || worker.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{language === 'es' ? 'Cantidad' : 'Quantity'}</Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedItem.quantity}
                    value={assignForm.quantity}
                    onChange={(e) => setAssignForm(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <Button className="w-full" onClick={assignTool} disabled={!assignForm.worker_id}>
                  {language === 'es' ? 'Asignar' : 'Assign'}
                </Button>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </ModernAppLayout>
  );
}
