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
     <Card className="absolute top-4 left-4 right-4 z-[1000] bg-card/95 backdrop-blur-sm max-w-2xl max-h-[calc(100vh-8rem)] overflow-y-auto">
       <CardHeader className="pb-3">
         <CardTitle className="text-lg flex items-center gap-2">
           <MapPin className="h-4 w-4 text-primary" />
           {language === 'es' ? 'Crear Nuevo Activo' : 'Create New Asset'}
         </CardTitle>
         <p className="text-xs text-muted-foreground">
           📍 {lat.toFixed(6)}, {lng.toFixed(6)}
         </p>
       </CardHeader>
       <CardContent className="space-y-4">
         {/* Basic Info */}
         <div className="grid gap-4 sm:grid-cols-2">
           <div className="space-y-2">
             <Label>{language === 'es' ? 'Nombre *' : 'Name *'}</Label>
             <Input
               value={formData.name}
               onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
               autoFocus
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
 
         {/* Purpose Tags */}
         <div className="space-y-2">
           <Label className="flex items-center gap-2">
             <Tag className="h-4 w-4" />
             {language === 'es' ? 'Etiquetas de Propósito' : 'Purpose Tags'}
           </Label>
           <div className="flex flex-wrap gap-2 mb-2">
             {formData.purpose_tags.map(tag => (
               <Badge key={tag} variant="secondary" className="gap-1">
                 {tag}
                 <button onClick={() => removePurposeTag(tag)} className="ml-1">
                   <X className="h-3 w-3" />
                 </button>
               </Badge>
             ))}
           </div>
           <div className="flex gap-2">
             <Input
               placeholder={language === 'es' ? 'Nueva etiqueta...' : 'New tag...'}
               value={newTag}
               onChange={(e) => setNewTag(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPurposeTag(newTag))}
               className="flex-1"
             />
             <Button variant="outline" size="sm" onClick={() => addPurposeTag(newTag)}>
               {language === 'es' ? 'Agregar' : 'Add'}
             </Button>
           </div>
           <div className="flex flex-wrap gap-1 mt-2">
             {COMMON_PURPOSE_TAGS.filter(t => !formData.purpose_tags.includes(t)).slice(0, 5).map(tag => (
               <Button
                 key={tag}
                 variant="ghost"
                 size="sm"
                 className="h-6 text-xs"
                 onClick={() => addPurposeTag(tag)}
               >
                 + {tag}
               </Button>
             ))}
           </div>
         </div>
 
         {/* Risk Flags */}
         <div className="space-y-2">
           <Label className="flex items-center gap-2 text-destructive">
             <AlertTriangle className="h-4 w-4" />
             {language === 'es' ? 'Banderas de Riesgo' : 'Risk Flags'}
           </Label>
           <div className="flex flex-wrap gap-2 mb-2">
             {formData.risk_flags.map(flag => (
               <Badge key={flag} variant="destructive" className="gap-1 bg-destructive/10 text-destructive">
                 {flag.replace(/_/g, ' ')}
                 <button onClick={() => removeRiskFlag(flag)} className="ml-1">
                   <X className="h-3 w-3" />
                 </button>
               </Badge>
             ))}
           </div>
           <div className="flex gap-2">
             <Input
               placeholder={language === 'es' ? 'Nuevo riesgo...' : 'New risk...'}
               value={newRisk}
               onChange={(e) => setNewRisk(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRiskFlag(newRisk))}
               className="flex-1"
             />
             <Button variant="outline" size="sm" onClick={() => addRiskFlag(newRisk)}>
               {language === 'es' ? 'Agregar' : 'Add'}
             </Button>
           </div>
           <div className="flex flex-wrap gap-1 mt-2">
             {COMMON_RISK_FLAGS.filter(f => !formData.risk_flags.includes(f)).slice(0, 5).map(flag => (
               <Button
                 key={flag}
                 variant="ghost"
                 size="sm"
                 className="h-6 text-xs text-destructive"
                 onClick={() => addRiskFlag(flag)}
               >
                 + {flag.replace(/_/g, ' ')}
               </Button>
             ))}
           </div>
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
               : (language === 'es' ? 'Guardar' : 'Save')}
           </Button>
         </div>
       </CardContent>
     </Card>
   );
 }