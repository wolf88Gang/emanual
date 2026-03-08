import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  MapPin, 
  X, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Navigation
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useEstate } from '@/contexts/EstateContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePhotoCapture } from '@/hooks/usePhotoCapture';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Zone {
  id: string;
  name: string;
}

interface Asset {
  id: string;
  name: string;
  asset_type: string;
}

interface CheckinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CheckinDialog({ open, onOpenChange, onSuccess }: CheckinDialogProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { currentEstate } = useEstate();
  
  const geolocation = useGeolocation();
  const photoCapture = usePhotoCapture();
  
  const [zones, setZones] = useState<Zone[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedZone, setSelectedZone] = useState<string>('');
  const [selectedAsset, setSelectedAsset] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [reportIssue, setReportIssue] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loadingZones, setLoadingZones] = useState(false);

  // Fetch zones when dialog opens
  useEffect(() => {
    if (open && currentEstate) {
      fetchZones();
      // Auto-fetch location when dialog opens
      geolocation.getCurrentPosition().catch(() => {
        // Silently handle - user might deny permission
      });
    }
  }, [open, currentEstate]);

  // Fetch assets when zone changes
  useEffect(() => {
    if (selectedZone && currentEstate) {
      fetchAssets(selectedZone);
    } else {
      setAssets([]);
      setSelectedAsset('');
    }
  }, [selectedZone, currentEstate]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  async function fetchZones() {
    if (!currentEstate) return;
    setLoadingZones(true);
    try {
      const { data, error } = await supabase
        .from('zones')
        .select('id, name')
        .eq('estate_id', currentEstate.id)
        .order('name');
      
      if (error) throw error;
      setZones(data || []);
    } catch (error) {
      console.error('Error fetching zones:', error);
    } finally {
      setLoadingZones(false);
    }
  }

  async function fetchAssets(zoneId: string) {
    if (!currentEstate) return;
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, asset_type')
        .eq('estate_id', currentEstate.id)
        .eq('zone_id', zoneId)
        .order('name');
      
      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  }

  function resetForm() {
    setSelectedZone('');
    setSelectedAsset('');
    setNotes('');
    setReportIssue(false);
    photoCapture.reset();
    geolocation.reset();
  }

  async function handleSubmit() {
    if (!currentEstate || !user) {
      toast.error('Missing estate or user');
      return;
    }

    if (!photoCapture.hasPhoto) {
      toast.error(language === 'es' ? 'Se requiere foto' : 'Photo is required');
      return;
    }

    setSubmitting(true);
    try {
      let photoUrl: string | null = null;

      // Upload photo to Supabase Storage
      if (photoCapture.photoFile) {
        const fileExt = photoCapture.photoFile.name.split('.').pop() || 'jpg';
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('photos')
          .upload(fileName, photoCapture.photoFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error(language === 'es' ? 'Error al subir foto' : 'Failed to upload photo');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('photos')
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl;
      }

      // Create checkin record
      const { error } = await supabase
        .from('checkins')
        .insert({
          estate_id: currentEstate.id,
          user_id: user.id,
          zone_id: selectedZone || null,
          asset_id: selectedAsset || null,
          checkin_at: new Date().toISOString(),
          gps_lat: geolocation.latitude,
          gps_lng: geolocation.longitude,
          photo_url: photoUrl,
          notes: notes || null,
        });

      if (error) throw error;

      // Auto-create task if issue reported
      if (reportIssue && notes.trim()) {
        await supabase.from('tasks').insert({
          estate_id: currentEstate.id,
          title: `Issue reported: ${notes.slice(0, 60)}`,
          title_es: `Problema reportado: ${notes.slice(0, 60)}`,
          description: `Auto-generated from check-in. Notes: ${notes}`,
          description_es: `Auto-generada desde check-in. Notas: ${notes}`,
          asset_id: selectedAsset || null,
          zone_id: selectedZone || null,
          priority: 2,
          frequency: 'once',
          due_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          status: 'pending',
        });
      }

      toast.success(
        language === 'es' 
          ? reportIssue ? '¡Check-in registrado y tarea creada!' : '¡Check-in registrado!'
          : reportIssue ? 'Check-in recorded & task created!' : 'Check-in recorded!'
      );
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error creating checkin:', error);
      toast.error(
        language === 'es' 
          ? 'Error al registrar check-in' 
          : 'Failed to record check-in'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl">
            {language === 'es' ? 'Nuevo Check-in' : 'New Check-in'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Photo Capture - Required */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Camera className="h-4 w-4" />
              {language === 'es' ? 'Foto (requerida)' : 'Photo (required)'}
            </Label>
            
            <input
              ref={photoCapture.inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={photoCapture.handleFileChange}
              className="hidden"
            />

            {photoCapture.hasPhoto ? (
              <div className="relative">
                <img
                  src={photoCapture.photoPreview || ''}
                  alt="Check-in photo"
                  className="w-full h-48 object-cover rounded-xl border border-border"
                />
                <button
                  onClick={photoCapture.clearPhoto}
                  className="absolute top-2 right-2 p-1.5 bg-background/80 backdrop-blur rounded-full hover:bg-background"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={photoCapture.openCamera}
                className="w-full h-48 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-3 hover:border-primary/50 hover:bg-secondary/30 transition-colors"
              >
                <Camera className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Tomar foto o seleccionar' : 'Take photo or select'}
                </span>
              </button>
            )}
            
            {photoCapture.error && (
              <p className="text-sm text-destructive">{photoCapture.error}</p>
            )}
          </div>

          {/* GPS Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {language === 'es' ? 'Ubicación GPS' : 'GPS Location'}
            </Label>
            
            <div className={cn(
              "p-3 rounded-xl border",
              geolocation.hasLocation 
                ? "bg-accent/30 border-accent" 
                : "bg-secondary/50 border-border"
            )}>
              {geolocation.loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {language === 'es' ? 'Obteniendo ubicación...' : 'Getting location...'}
                </div>
              ) : geolocation.hasLocation ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-accent-foreground">
                    <CheckCircle className="h-4 w-4" />
                    {language === 'es' ? 'Ubicación capturada' : 'Location captured'}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    ±{Math.round(geolocation.accuracy || 0)}m
                  </span>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-4 w-4" />
                    {geolocation.error || (language === 'es' ? 'Sin ubicación' : 'No location')}
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => geolocation.getCurrentPosition()}
                  >
                    <Navigation className="h-4 w-4 mr-1" />
                    {language === 'es' ? 'Obtener' : 'Get'}
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Zone Selection */}
          <div className="space-y-2">
            <Label>{language === 'es' ? 'Zona (opcional)' : 'Zone (optional)'}</Label>
            <Select value={selectedZone} onValueChange={setSelectedZone}>
              <SelectTrigger>
                <SelectValue placeholder={language === 'es' ? 'Seleccionar zona' : 'Select zone'} />
              </SelectTrigger>
              <SelectContent>
                {zones.map((zone) => (
                  <SelectItem key={zone.id} value={zone.id}>
                    {zone.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Asset Selection - only if zone selected */}
          {selectedZone && assets.length > 0 && (
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Activo (opcional)' : 'Asset (optional)'}</Label>
              <Select value={selectedAsset} onValueChange={setSelectedAsset}>
                <SelectTrigger>
                  <SelectValue placeholder={language === 'es' ? 'Seleccionar activo' : 'Select asset'} />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Report Issue Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-destructive/5 border-destructive/20">
            <div>
              <p className="font-medium text-sm">
                {language === 'es' ? '⚠️ Reportar problema' : '⚠️ Report issue'}
              </p>
              <p className="text-xs text-muted-foreground">
                {language === 'es'
                  ? 'Crea una tarea automática de mantenimiento'
                  : 'Auto-creates a maintenance task'}
              </p>
            </div>
            <Switch checked={reportIssue} onCheckedChange={setReportIssue} />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>{language === 'es' ? (reportIssue ? 'Descripción del problema' : 'Notas (opcional)') : (reportIssue ? 'Issue description' : 'Notes (optional)')}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={language === 'es' 
                ? (reportIssue ? 'Describa el problema encontrado...' : 'Añadir observaciones...') 
                : (reportIssue ? 'Describe the issue found...' : 'Add observations...')}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!photoCapture.hasPhoto || submitting}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === 'es' ? 'Registrando...' : 'Recording...'}
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                {language === 'es' ? 'Registrar Check-in' : 'Record Check-in'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
