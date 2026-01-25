import React, { useState } from 'react';
import { Pencil, Save, X, MapPin, AlertTriangle, Shield, Tag, ChevronDown, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { LocationPickerDialog } from '@/components/map/LocationPickerDialog';

interface AssetEditFormProps {
  asset: {
    id: string;
    name: string;
    description: string | null;
    asset_type: string;
    purpose_tags: string[] | null;
    risk_flags: string[] | null;
    critical_care_note: string | null;
    do_not_do_warnings: string | null;
    lat: number | null;
    lng: number | null;
    zone_id: string | null;
  };
  zones: Array<{ id: string; name: string; color: string | null }>;
  onSave: () => void;
  onCancel: () => void;
}

type AssetType = 'plant' | 'tree' | 'irrigation_controller' | 'valve' | 'lighting_transformer' | 'hardscape' | 'equipment' | 'structure';

const ASSET_TYPES: AssetType[] = ['plant', 'tree', 'irrigation_controller', 'valve', 'lighting_transformer', 'hardscape', 'equipment', 'structure'];

const COMMON_RISK_FLAGS = [
  { value: 'pest_infestation', en: 'Pest Infestation', es: 'Plaga' },
  { value: 'disease', en: 'Disease', es: 'Enfermedad' },
  { value: 'drought_stress', en: 'Drought Stress', es: 'Estrés Hídrico' },
  { value: 'overwatering', en: 'Overwatering', es: 'Exceso de Riego' },
  { value: 'nutrient_deficiency', en: 'Nutrient Deficiency', es: 'Deficiencia Nutricional' },
  { value: 'structural_damage', en: 'Structural Damage', es: 'Daño Estructural' },
  { value: 'weather_damage', en: 'Weather Damage', es: 'Daño Climático' },
  { value: 'vandalism', en: 'Vandalism', es: 'Vandalismo' },
  { value: 'aging_equipment', en: 'Aging Equipment', es: 'Equipo Envejecido' },
  { value: 'needs_replacement', en: 'Needs Replacement', es: 'Requiere Reemplazo' },
  { value: 'salt_spray', en: 'Salt Spray Exposure', es: 'Exposición a Salitre' },
  { value: 'root_damage', en: 'Root Damage', es: 'Daño en Raíces' },
  { value: 'sun_scald', en: 'Sun Scald', es: 'Quemadura Solar' },
];

const COMMON_PURPOSE_TAGS = [
  { value: 'ornamental', en: 'Ornamental', es: 'Ornamental' },
  { value: 'shade', en: 'Shade', es: 'Sombra' },
  { value: 'privacy', en: 'Privacy', es: 'Privacidad' },
  { value: 'edible', en: 'Edible', es: 'Comestible' },
  { value: 'pollinator', en: 'Pollinator Friendly', es: 'Apto para Polinizadores' },
  { value: 'erosion_control', en: 'Erosion Control', es: 'Control de Erosión' },
  { value: 'water_feature', en: 'Water Feature', es: 'Elemento de Agua' },
  { value: 'pathway', en: 'Pathway', es: 'Sendero' },
  { value: 'focal_point', en: 'Focal Point', es: 'Punto Focal' },
  { value: 'screening', en: 'Screening', es: 'Barrera Visual' },
  { value: 'windbreak', en: 'Windbreak', es: 'Cortavientos' },
  { value: 'native', en: 'Native Species', es: 'Especie Nativa' },
];

export function AssetEditForm({ asset, zones, onSave, onCancel }: AssetEditFormProps) {
  const { language } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tagPopoverOpen, setTagPopoverOpen] = useState(false);
  const [riskPopoverOpen, setRiskPopoverOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: asset.name,
    description: asset.description || '',
    asset_type: asset.asset_type as AssetType,
    purpose_tags: asset.purpose_tags || [],
    risk_flags: asset.risk_flags || [],
    critical_care_note: asset.critical_care_note || '',
    do_not_do_warnings: asset.do_not_do_warnings || '',
    lat: asset.lat?.toString() || '',
    lng: asset.lng?.toString() || '',
    zone_id: asset.zone_id || ''
  });

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error(language === 'es' ? 'Nombre requerido' : 'Name is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('assets')
        .update({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          asset_type: formData.asset_type,
          purpose_tags: formData.purpose_tags,
          risk_flags: formData.risk_flags,
          critical_care_note: formData.critical_care_note.trim() || null,
          do_not_do_warnings: formData.do_not_do_warnings.trim() || null,
          lat: formData.lat ? parseFloat(formData.lat) : null,
          lng: formData.lng ? parseFloat(formData.lng) : null,
          zone_id: formData.zone_id || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', asset.id);

      if (error) throw error;

      toast.success(language === 'es' ? '✅ Activo actualizado' : '✅ Asset updated');
      onSave();
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error(language === 'es' ? 'Error al guardar' : 'Failed to save');
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
  }

  function removeRiskFlag(flag: string) {
    setFormData(prev => ({
      ...prev,
      risk_flags: prev.risk_flags.filter(f => f !== flag)
    }));
  }

  function handleLocationConfirm(lat: number, lng: number) {
    setFormData(prev => ({
      ...prev,
      lat: lat.toString(),
      lng: lng.toString()
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

  // Filter available tags/risks (not yet selected)
  const availableTags = COMMON_PURPOSE_TAGS.filter(t => !formData.purpose_tags.includes(t.value));
  const availableRisks = COMMON_RISK_FLAGS.filter(r => !formData.risk_flags.includes(r.value));

  return (
    <>
      <Card className="estate-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Pencil className="h-4 w-4 text-primary" />
            {language === 'es' ? 'Editar Activo' : 'Edit Asset'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Nombre *' : 'Name *'}</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === 'es' ? 'Tipo' : 'Type'}</Label>
              <Select 
                value={formData.asset_type}
                onValueChange={(v: AssetType) => setFormData(p => ({ ...p, asset_type: v }))}
              >
                <SelectTrigger>
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
          </div>

          <div className="space-y-2">
            <Label>{language === 'es' ? 'Descripción' : 'Description'}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>{language === 'es' ? 'Zona' : 'Zone'}</Label>
            <Select 
              value={formData.zone_id}
              onValueChange={(v) => setFormData(p => ({ ...p, zone_id: v }))}
            >
              <SelectTrigger>
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

          {/* GPS Coordinates with Map Picker */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {language === 'es' ? 'Coordenadas GPS' : 'GPS Coordinates'}
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Latitude"
                value={formData.lat}
                onChange={(e) => setFormData(p => ({ ...p, lat: e.target.value }))}
                type="number"
                step="any"
              />
              <Input
                placeholder="Longitude"
                value={formData.lng}
                onChange={(e) => setFormData(p => ({ ...p, lng: e.target.value }))}
                type="number"
                step="any"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2"
              onClick={() => setShowLocationPicker(true)}
            >
              <Map className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Seleccionar en Mapa' : 'Select on Map'}
            </Button>
          </div>

          {/* Purpose Tags with Dropdown */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              {language === 'es' ? 'Etiquetas de Propósito' : 'Purpose Tags'}
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.purpose_tags.map(tag => {
                const tagInfo = COMMON_PURPOSE_TAGS.find(t => t.value === tag);
                const displayName = tagInfo 
                  ? (language === 'es' ? tagInfo.es : tagInfo.en)
                  : tag.replace(/_/g, ' ');
                return (
                  <Badge key={tag} variant="secondary" className="gap-1 capitalize">
                    {displayName}
                    <button onClick={() => removePurposeTag(tag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Popover open={tagPopoverOpen} onOpenChange={setTagPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  {language === 'es' ? 'Agregar etiqueta...' : 'Add tag...'}
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={language === 'es' ? 'Buscar etiqueta...' : 'Search tag...'} />
                  <CommandList>
                    <CommandEmpty>
                      {language === 'es' ? 'No hay etiquetas disponibles' : 'No tags available'}
                    </CommandEmpty>
                    <CommandGroup>
                      {availableTags.map(tag => (
                        <CommandItem
                          key={tag.value}
                          value={tag.value}
                          onSelect={() => {
                            addPurposeTag(tag.value);
                            setTagPopoverOpen(false);
                          }}
                        >
                          {language === 'es' ? tag.es : tag.en}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Risk Flags with Dropdown */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {language === 'es' ? 'Banderas de Riesgo' : 'Risk Flags'}
            </Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.risk_flags.map(flag => {
                const flagInfo = COMMON_RISK_FLAGS.find(f => f.value === flag);
                const displayName = flagInfo 
                  ? (language === 'es' ? flagInfo.es : flagInfo.en)
                  : flag.replace(/_/g, ' ');
                return (
                  <Badge key={flag} variant="destructive" className="gap-1 bg-destructive/10 text-destructive capitalize">
                    {displayName}
                    <button onClick={() => removeRiskFlag(flag)} className="ml-1 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
            <Popover open={riskPopoverOpen} onOpenChange={setRiskPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between border-destructive/30 text-destructive hover:bg-destructive/5">
                  {language === 'es' ? 'Agregar riesgo...' : 'Add risk...'}
                  <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                  <CommandInput placeholder={language === 'es' ? 'Buscar riesgo...' : 'Search risk...'} />
                  <CommandList>
                    <CommandEmpty>
                      {language === 'es' ? 'No hay riesgos disponibles' : 'No risks available'}
                    </CommandEmpty>
                    <CommandGroup>
                      {availableRisks.map(risk => (
                        <CommandItem
                          key={risk.value}
                          value={risk.value}
                          onSelect={() => {
                            addRiskFlag(risk.value);
                            setRiskPopoverOpen(false);
                          }}
                          className="text-destructive"
                        >
                          <AlertTriangle className="h-3 w-3 mr-2" />
                          {language === 'es' ? risk.es : risk.en}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Critical Care */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              {language === 'es' ? 'Nota de Cuidado Crítico' : 'Critical Care Note'}
            </Label>
            <Textarea
              value={formData.critical_care_note}
              onChange={(e) => setFormData(p => ({ ...p, critical_care_note: e.target.value }))}
              placeholder={language === 'es' ? 'Instrucciones especiales de cuidado...' : 'Special care instructions...'}
              rows={2}
            />
          </div>

          {/* Do Not Do */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-destructive">
              <X className="h-4 w-4" />
              {language === 'es' ? 'Advertencias (No Hacer)' : 'Do Not Do Warnings'}
            </Label>
            <Textarea
              value={formData.do_not_do_warnings}
              onChange={(e) => setFormData(p => ({ ...p, do_not_do_warnings: e.target.value }))}
              placeholder={language === 'es' ? 'Qué NO hacer con este activo...' : 'What NOT to do with this asset...'}
              rows={2}
              className="border-destructive/30"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              {language === 'es' ? 'Cancelar' : 'Cancel'}
            </Button>
            <Button className="flex-1" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving 
                ? (language === 'es' ? 'Guardando...' : 'Saving...') 
                : (language === 'es' ? 'Guardar Cambios' : 'Save Changes')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Location Picker Dialog */}
      <LocationPickerDialog
        open={showLocationPicker}
        onOpenChange={setShowLocationPicker}
        initialLat={formData.lat ? parseFloat(formData.lat) : undefined}
        initialLng={formData.lng ? parseFloat(formData.lng) : undefined}
        onConfirm={handleLocationConfirm}
      />
    </>
  );
}
