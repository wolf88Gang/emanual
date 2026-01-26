import React, { useState } from 'react';
import { Plus, Loader2, Clock, Calendar, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ManualShiftDialogProps {
  onShiftAdded?: () => void;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
}

export function ManualShiftDialog({ onShiftAdded }: ManualShiftDialogProps) {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [shiftDate, setShiftDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [checkInTime, setCheckInTime] = useState('08:00');
  const [checkOutTime, setCheckOutTime] = useState('17:00');
  const [notes, setNotes] = useState('');

  async function fetchProfiles() {
    if (!currentEstate) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('org_id', currentEstate.org_id)
        .order('full_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  }

  function handleOpen(isOpen: boolean) {
    setOpen(isOpen);
    if (isOpen) {
      fetchProfiles();
      resetForm();
    }
  }

  function resetForm() {
    setSelectedUser('');
    setShiftDate(format(new Date(), 'yyyy-MM-dd'));
    setCheckInTime('08:00');
    setCheckOutTime('17:00');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!currentEstate || !selectedUser) {
      toast.error(language === 'es' ? 'Complete todos los campos' : 'Complete all fields');
      return;
    }

    // Validate times
    const checkIn = new Date(`${shiftDate}T${checkInTime}`);
    const checkOut = new Date(`${shiftDate}T${checkOutTime}`);
    
    if (checkOut <= checkIn) {
      toast.error(
        language === 'es' 
          ? 'La hora de salida debe ser posterior a la de entrada' 
          : 'Check-out time must be after check-in time'
      );
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('worker_shifts')
        .insert({
          estate_id: currentEstate.id,
          user_id: selectedUser,
          check_in_at: checkIn.toISOString(),
          check_out_at: checkOut.toISOString(),
          notes: notes.trim() || null,
          checkin_type: 'manual',
        });

      if (error) throw error;

      toast.success(
        language === 'es' 
          ? '✅ Turno registrado manualmente' 
          : '✅ Shift registered manually'
      );
      
      setOpen(false);
      resetForm();
      onShiftAdded?.();
    } catch (error: any) {
      console.error('Error creating manual shift:', error);
      toast.error(error.message || (language === 'es' ? 'Error al registrar' : 'Failed to register'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          {language === 'es' ? 'Agregar Turno Manual' : 'Add Manual Shift'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {language === 'es' ? 'Registrar Turno Manual' : 'Register Manual Shift'}
          </DialogTitle>
          <DialogDescription>
            {language === 'es'
              ? 'Ingrese las horas trabajadas manualmente para un trabajador'
              : 'Enter worked hours manually for a worker'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Worker Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {language === 'es' ? 'Trabajador' : 'Worker'}
            </Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'es' ? 'Seleccionar trabajador' : 'Select worker'} />
              </SelectTrigger>
              <SelectContent>
                {loading ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </div>
                ) : profiles.length === 0 ? (
                  <div className="p-2 text-center text-sm text-muted-foreground">
                    {language === 'es' ? 'Sin trabajadores' : 'No workers found'}
                  </div>
                ) : (
                  profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.full_name || profile.email}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {language === 'es' ? 'Fecha' : 'Date'}
            </Label>
            <Input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {language === 'es' ? 'Hora de entrada' : 'Check-in time'}
              </Label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>
                {language === 'es' ? 'Hora de salida' : 'Check-out time'}
              </Label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
              />
            </div>
          </div>

          {/* Calculated duration */}
          {checkInTime && checkOutTime && (
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <span className="text-sm text-muted-foreground">
                {language === 'es' ? 'Duración:' : 'Duration:'}{' '}
              </span>
              <span className="font-medium">
                {(() => {
                  const checkIn = new Date(`2000-01-01T${checkInTime}`);
                  const checkOut = new Date(`2000-01-01T${checkOutTime}`);
                  const minutes = Math.max(0, (checkOut.getTime() - checkIn.getTime()) / 60000);
                  const hours = Math.floor(minutes / 60);
                  const mins = Math.round(minutes % 60);
                  return `${hours}h ${mins}m`;
                })()}
              </span>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label>
              {language === 'es' ? 'Notas (opcional)' : 'Notes (optional)'}
            </Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                language === 'es' 
                  ? 'Razón del registro manual, trabajo realizado, etc.'
                  : 'Reason for manual entry, work performed, etc.'
              }
              rows={2}
            />
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button type="submit" disabled={saving || !selectedUser}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {language === 'es' ? 'Guardando...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {language === 'es' ? 'Registrar Turno' : 'Register Shift'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
