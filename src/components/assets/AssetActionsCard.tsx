import React, { useState } from 'react';
import { Plus, AlertTriangle, Bug, CheckCircle, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AssetActionsCardProps {
  assetId: string;
  assetName: string;
  currentRiskFlags: string[];
  onUpdate: () => void;
}

const ASSET_STATUS_OPTIONS = [
  { value: 'healthy', label: { es: 'Saludable', en: 'Healthy' }, color: 'bg-green-100 text-green-700', icon: CheckCircle },
  { value: 'infected', label: { es: 'Infectado', en: 'Infected' }, color: 'bg-red-100 text-red-700', icon: Bug },
  { value: 'needs_attention', label: { es: 'Necesita Atención', en: 'Needs Attention' }, color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  { value: 'under_treatment', label: { es: 'En Tratamiento', en: 'Under Treatment' }, color: 'bg-blue-100 text-blue-700', icon: Bug },
  { value: 'recovering', label: { es: 'Recuperándose', en: 'Recovering' }, color: 'bg-teal-100 text-teal-700', icon: CheckCircle },
];

const TASK_FREQUENCY_OPTIONS = [
  { value: 'once', label: { es: 'Una vez', en: 'Once' } },
  { value: 'weekly', label: { es: 'Semanal', en: 'Weekly' } },
  { value: 'monthly', label: { es: 'Mensual', en: 'Monthly' } },
  { value: 'quarterly', label: { es: 'Trimestral', en: 'Quarterly' } },
];

export function AssetActionsCard({ assetId, assetName, currentRiskFlags, onUpdate }: AssetActionsCardProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Task form state
  const [taskForm, setTaskForm] = useState({
    title: '',
    title_es: '',
    description: '',
    description_es: '',
    frequency: 'once' as 'once' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'seasonal',
    priority: 2,
    due_date: new Date().toISOString().split('T')[0],
  });
  
  // Status form state
  const [statusForm, setStatusForm] = useState({
    status: 'healthy',
    notes: '',
  });

  async function handleCreateTask() {
    if (!taskForm.title.trim() || !currentEstate) {
      toast.error(language === 'es' ? 'El título es requerido' : 'Title is required');
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.from('tasks').insert({
        estate_id: currentEstate.id,
        asset_id: assetId,
        title: taskForm.title,
        title_es: taskForm.title_es || taskForm.title,
        description: taskForm.description,
        description_es: taskForm.description_es || taskForm.description,
        frequency: taskForm.frequency,
        priority: taskForm.priority,
        due_date: taskForm.due_date,
        status: 'pending',
      });
      
      if (error) throw error;
      
      toast.success(language === 'es' ? 'Tarea creada exitosamente' : 'Task created successfully');
      setShowTaskDialog(false);
      setTaskForm({
        title: '',
        title_es: '',
        description: '',
        description_es: '',
        frequency: 'once',
        priority: 2,
        due_date: new Date().toISOString().split('T')[0],
      });
      onUpdate();
    } catch (error: any) {
      console.error('Error creating task:', error);
      toast.error(error.message || (language === 'es' ? 'Error al crear tarea' : 'Failed to create task'));
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateStatus() {
    setLoading(true);
    try {
      // Update risk flags based on status
      let newRiskFlags = [...currentRiskFlags.filter(f => 
        !f.startsWith('status_') && f !== 'infected' && f !== 'needs_attention' && f !== 'under_treatment'
      )];
      
      if (statusForm.status !== 'healthy') {
        newRiskFlags.push(`status_${statusForm.status}`);
      }
      
      // Update asset
      const { error: assetError } = await supabase
        .from('assets')
        .update({ 
          risk_flags: newRiskFlags,
          critical_care_note: statusForm.notes || null,
        })
        .eq('id', assetId);
      
      if (assetError) throw assetError;
      
      // Also create a checkin to document the status change
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('checkins').insert({
          estate_id: currentEstate?.id,
          asset_id: assetId,
          user_id: user.id,
          notes: `${language === 'es' ? 'Estado actualizado a:' : 'Status updated to:'} ${
            ASSET_STATUS_OPTIONS.find(o => o.value === statusForm.status)?.label[language] || statusForm.status
          }${statusForm.notes ? ` - ${statusForm.notes}` : ''}`,
        });
      }
      
      toast.success(language === 'es' ? 'Estado actualizado' : 'Status updated');
      setShowStatusDialog(false);
      setStatusForm({ status: 'healthy', notes: '' });
      onUpdate();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message || (language === 'es' ? 'Error al actualizar estado' : 'Failed to update status'));
    } finally {
      setLoading(false);
    }
  }

  // Determine current status from risk flags
  const currentStatus = currentRiskFlags.find(f => f.startsWith('status_'))?.replace('status_', '') || 
    (currentRiskFlags.includes('infected') ? 'infected' : 'healthy');
  const currentStatusOption = ASSET_STATUS_OPTIONS.find(o => o.value === currentStatus) || ASSET_STATUS_OPTIONS[0];
  const StatusIcon = currentStatusOption.icon;

  return (
    <>
      <Card className="estate-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-primary" />
              {language === 'es' ? 'Acciones Rápidas' : 'Quick Actions'}
            </span>
            <Badge className={currentStatusOption.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {currentStatusOption.label[language]}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowStatusDialog(true)}
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Actualizar Estado' : 'Update Status'}
            </Button>
            <Button 
              variant="default" 
              className="flex-1"
              onClick={() => setShowTaskDialog(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Crear Tarea' : 'Create Task'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create Task Dialog */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'es' ? 'Crear Tarea para' : 'Create Task for'} {assetName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Título (Inglés)' : 'Title (English)'}</Label>
              <Input
                value={taskForm.title}
                onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
                placeholder={language === 'es' ? 'Ej: Inspección de plagas' : 'E.g., Pest inspection'}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Título (Español)' : 'Title (Spanish)'}</Label>
              <Input
                value={taskForm.title_es}
                onChange={(e) => setTaskForm(f => ({ ...f, title_es: e.target.value }))}
                placeholder={language === 'es' ? 'Ej: Pest inspection' : 'E.g., Inspección de plagas'}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Descripción' : 'Description'}</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                placeholder={language === 'es' ? 'Instrucciones detalladas...' : 'Detailed instructions...'}
                rows={3}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{language === 'es' ? 'Frecuencia' : 'Frequency'}</Label>
                <Select
                  value={taskForm.frequency}
                  onValueChange={(v) => setTaskForm(f => ({ ...f, frequency: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_FREQUENCY_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label[language]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>{language === 'es' ? 'Prioridad' : 'Priority'}</Label>
                <Select
                  value={String(taskForm.priority)}
                  onValueChange={(v) => setTaskForm(f => ({ ...f, priority: Number(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{language === 'es' ? 'Alta' : 'High'}</SelectItem>
                    <SelectItem value="2">{language === 'es' ? 'Media' : 'Medium'}</SelectItem>
                    <SelectItem value="3">{language === 'es' ? 'Baja' : 'Low'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Fecha de Vencimiento' : 'Due Date'}</Label>
              <Input
                type="date"
                value={taskForm.due_date}
                onChange={(e) => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={handleCreateTask} disabled={loading}>
              {loading ? '...' : (language === 'es' ? 'Crear Tarea' : 'Create Task')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'es' ? 'Actualizar Estado de' : 'Update Status of'} {assetName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Estado' : 'Status'}</Label>
              <Select
                value={statusForm.status}
                onValueChange={(v) => setStatusForm(f => ({ ...f, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_STATUS_OPTIONS.map(opt => {
                    const Icon = opt.icon;
                    return (
                      <SelectItem key={opt.value} value={opt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {opt.label[language]}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Notas / Observaciones' : 'Notes / Observations'}</Label>
              <Textarea
                value={statusForm.notes}
                onChange={(e) => setStatusForm(f => ({ ...f, notes: e.target.value }))}
                placeholder={language === 'es' 
                  ? 'Describa el problema o las observaciones...' 
                  : 'Describe the issue or observations...'}
                rows={4}
              />
            </div>
            
            {statusForm.status !== 'healthy' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {language === 'es' 
                    ? 'Este cambio se documentará en el historial del activo'
                    : 'This change will be documented in the asset history'}
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button onClick={handleUpdateStatus} disabled={loading}>
              {loading ? '...' : (language === 'es' ? 'Guardar' : 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
