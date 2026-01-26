 import React, { useState } from 'react';
 import { Save, X, MapPin, AlertTriangle, Tag, Shield } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Textarea } from '@/components/ui/textarea';
 import { Label } from '@/components/ui/label';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Badge } from '@/components/ui/badge';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface AssetCreationDialogProps {
   estateId: string;
   lat: number;
   lng: number;
   zones: Array<{ id: string; name: string; color: string | null }>;
   onSave: () => void;
   onCancel: () => void;
 }
 
 type AssetType = 'plant' | 'tree' | 'irrigation_controller' | 'valve' | 'lighting_transformer' | 'hardscape' | 'equipment' | 'structure';
 
 const ASSET_TYPES: AssetType[] = ['plant', 'tree', 'irrigation_controller', 'valve', 'lighting_transformer', 'hardscape', 'equipment', 'structure'];
 
 const COMMON_RISK_FLAGS = [
   'pest_infestation',
   'disease',
   'drought_stress',
   'overwatering',
   'nutrient_deficiency',
   'structural_damage',
   'weather_damage',
 ];
 
 const COMMON_PURPOSE_TAGS = [
   'ornamental',
   'shade',
   'privacy',
   'edible',
   'pollinator',
   'erosion_control',
   'water_feature',
   'pathway',
   'focal_point',
   'screening'
 ];
 
 export function AssetCreationDialog({ estateId, lat, lng, zones, onSave, onCancel }: AssetCreationDialogProps) {
   const { language } = useLanguage();
   const [saving, setSaving] = useState(false);
   const [formData, setFormData] = useState({
     name: '',
     description: '',
     asset_type: 'plant' as AssetType,
     purpose_tags: [] as string[],
     risk_flags: [] as string[],
     critical_care_note: '',
     do_not_do_warnings: '',
     zone_id: ''
   });
 
   const [newTag, setNewTag] = useState('');
   const [newRisk, setNewRisk] = useState('');
 
   async function handleSave() {
     if (!formData.name.trim()) {
       toast.error(language === 'es' ? 'Nombre requerido' : 'Name is required');
       return;
     }
 
     setSaving(true);
     try {
       const { error } = await supabase
         .from('assets')
         .insert({
           estate_id: estateId,
           name: formData.name.trim(),
           description: formData.description.trim() || null,
           asset_type: formData.asset_type,
           purpose_tags: formData.purpose_tags,
           risk_flags: formData.risk_flags,
           critical_care_note: formData.critical_care_note.trim() || null,
           do_not_do_warnings: formData.do_not_do_warnings.trim() || null,
           lat,
           lng,
           zone_id: formData.zone_id || null,
         });
 
       if (error) throw error;
 
       toast.success(language === 'es' ? '✅ Activo creado' : '✅ Asset created');
       onSave();
     } catch (error) {
       console.error('Error creating asset:', error);
       toast.error(language === 'es' ? 'Error al crear activo' : 'Failed to create asset');
     } finally {
       setSaving(false);
     }
   }
 
   function addPurposeTag(tag: string) {
     const trimmed = tag.trim().toLowerCase();
     if (trimmed && !formData.purpose_tags.includes(trimmed)) {
       setFormData(prev => ({
         ...prev,
         purpose_tags: [...prev.purpose_tags, trimmed]
       }));
     }
     setNewTag('');
   }
 
   function removePurposeTag(tag: string) {
     setFormData(prev => ({
       ...prev,
       purpose_tags: prev.purpose_tags.filter(t => t !== tag)
     }));
   }
 
   function addRiskFlag(flag: string) {
     const trimmed = flag.trim().toLowerCase();
     if (trimmed && !formData.risk_flags.includes(trimmed)) {
       setFormData(prev => ({
         ...prev,
         risk_flags: [...prev.risk_flags, trimmed]
       }));
     }
     setNewRisk('');
   }
 
   function removeRiskFlag(flag: string) {
     setFormData(prev => ({
       ...prev,
       risk_flags: prev.risk_flags.filter(f => f !== flag)
     }));
   }
 
   const assetTypeLabels: Record<AssetType, { en: string; es: string }> = {
     plant: { en: 'Plant', es: 'Planta' },
     tree: { en: 'Tree', es: 'Árbol' },
     irrigation_controller: { en: 'Irrigation Controller', es: 'Controlador de Riego' },
     valve: { en: 'Valve', es: 'Válvula' },
     lighting_transformer: { en: 'Lighting Transformer', es: 'Transformador' },
     hardscape: { en: 'Hardscape', es: 'Hardscape' },
     equipment: { en: 'Equipment', es: 'Equipo' },
     structure: { en: 'Structure', es: 'Estructura' }
   };
 
  return (
    <Card className="absolute top-4 left-4 z-[1000] bg-card/95 backdrop-blur-sm w-80 sm:w-96 max-h-[calc(100vh-10rem)] flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          {language === 'es' ? 'Nuevo Activo' : 'New Asset'}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          📍 {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3 overflow-y-auto flex-1 pb-4">
        {/* Basic Info */}
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Nombre *' : 'Name *'}</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
            autoFocus
            className="h-9"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Tipo' : 'Type'}</Label>
          <Select 
            value={formData.asset_type}
            onValueChange={(v: AssetType) => setFormData(p => ({ ...p, asset_type: v }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ASSET_TYPES.map(type => (
                <SelectItem key={type} value={type}>
                  {language === 'es' ? assetTypeLabels[type].es : assetTypeLabels[type].en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
 
        <div className="space-y-2">
          <Label className="text-xs">{language === 'es' ? 'Zona' : 'Zone'}</Label>
          <Select 
            value={formData.zone_id}
            onValueChange={(v) => setFormData(p => ({ ...p, zone_id: v }))}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={language === 'es' ? 'Sin zona' : 'No zone'} />
            </SelectTrigger>
            <SelectContent>
              {zones.map(zone => (
                <SelectItem key={zone.id} value={zone.id}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: zone.color || '#10b981' }}
                    />
                    {zone.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
 
        {/* Purpose Tags - Compact */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">
            <Tag className="h-3 w-3" />
            {language === 'es' ? 'Etiquetas' : 'Purpose Tags'}
          </Label>
          <div className="flex flex-wrap gap-1">
            {formData.purpose_tags.map(tag => (
              <Badge key={tag} variant="secondary" className="gap-1 text-xs h-5">
                {tag}
                <button onClick={() => removePurposeTag(tag)}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {COMMON_PURPOSE_TAGS.filter(t => !formData.purpose_tags.includes(t)).slice(0, 4).map(tag => (
              <Button
                key={tag}
                variant="ghost"
                size="sm"
                className="h-5 text-xs px-2"
                onClick={() => addPurposeTag(tag)}
              >
                + {tag}
              </Button>
            ))}
          </div>
        </div>

        {/* Risk Flags - Compact */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" />
            {language === 'es' ? 'Riesgos' : 'Risks'}
          </Label>
          <div className="flex flex-wrap gap-1">
            {formData.risk_flags.map(flag => (
              <Badge key={flag} variant="destructive" className="gap-1 text-xs h-5 bg-destructive/10 text-destructive">
                {flag.replace(/_/g, ' ')}
                <button onClick={() => removeRiskFlag(flag)}>
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {COMMON_RISK_FLAGS.filter(f => !formData.risk_flags.includes(f)).slice(0, 4).map(flag => (
              <Button
                key={flag}
                variant="ghost"
                size="sm"
                className="h-5 text-xs px-2 text-destructive"
                onClick={() => addRiskFlag(flag)}
              >
                + {flag.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Critical Care - Compact */}
        <div className="space-y-1">
          <Label className="flex items-center gap-1 text-xs">
            <Shield className="h-3 w-3 text-primary" />
            {language === 'es' ? 'Nota Crítica' : 'Critical Note'}
          </Label>
          <Textarea
            value={formData.critical_care_note}
            onChange={(e) => setFormData(p => ({ ...p, critical_care_note: e.target.value }))}
            placeholder={language === 'es' ? 'Instrucciones especiales...' : 'Special instructions...'}
            rows={1}
            className="resize-none text-sm"
          />
        </div>
 
        {/* Actions - Sticky */}
        <div className="flex gap-2 pt-2 border-t border-border mt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onCancel}>
            <X className="h-3 w-3 mr-1" />
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button size="sm" className="flex-1" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-1" />
            {saving 
              ? (language === 'es' ? 'Guardando...' : 'Saving...') 
              : (language === 'es' ? 'Guardar' : 'Save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}