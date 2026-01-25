 import React, { useState, useRef } from 'react';
 import { Camera, Upload, X, Loader2 } from 'lucide-react';
 import { Button } from '@/components/ui/button';
 import { Card } from '@/components/ui/card';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 import { useLanguage } from '@/contexts/LanguageContext';
 
 interface AssetPhotoUploadProps {
   assetId: string;
   assetName: string;
   currentPhotos?: { id: string; url: string; caption: string | null }[];
   onPhotoUploaded: () => void;
 }
 
 export function AssetPhotoUpload({ assetId, assetName, currentPhotos = [], onPhotoUploaded }: AssetPhotoUploadProps) {
   const { language } = useLanguage();
   const [uploading, setUploading] = useState(false);
   const [deleting, setDeleting] = useState<string | null>(null);
   const fileInputRef = useRef<HTMLInputElement>(null);
 
   async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
     const file = event.target.files?.[0];
     if (!file) return;
 
     // Validate file type
     if (!file.type.startsWith('image/')) {
       toast.error(language === 'es' ? 'Por favor selecciona una imagen' : 'Please select an image');
       return;
     }
 
     // Validate file size (max 5MB)
     if (file.size > 5 * 1024 * 1024) {
       toast.error(language === 'es' ? 'La imagen es muy grande (máx. 5MB)' : 'Image too large (max 5MB)');
       return;
     }
 
     setUploading(true);
     try {
       // Upload to storage
       const fileExt = file.name.split('.').pop();
       const fileName = `${assetId}-${Date.now()}.${fileExt}`;
       const filePath = `asset-photos/${fileName}`;
 
       const { error: uploadError, data } = await supabase.storage
         .from('asset-photos')
         .upload(filePath, file, {
           cacheControl: '3600',
           upsert: false
         });
 
       if (uploadError) throw uploadError;
 
       // Get public URL
       const { data: urlData } = supabase.storage
         .from('asset-photos')
         .getPublicUrl(filePath);
 
       // Save to database
       const { error: dbError } = await supabase
         .from('asset_photos')
         .insert({
           asset_id: assetId,
           url: urlData.publicUrl,
           caption: null
         });
 
       if (dbError) throw dbError;
 
       toast.success(language === 'es' ? '✅ Foto subida' : '✅ Photo uploaded');
       onPhotoUploaded();
       
       // Reset input
       if (fileInputRef.current) {
         fileInputRef.current.value = '';
       }
     } catch (error: any) {
       console.error('Error uploading photo:', error);
       toast.error(error.message || (language === 'es' ? 'Error al subir foto' : 'Failed to upload photo'));
     } finally {
       setUploading(false);
     }
   }
 
   async function handleDeletePhoto(photoId: string, photoUrl: string) {
     if (!confirm(language === 'es' ? '¿Eliminar esta foto?' : 'Delete this photo?')) return;
 
     setDeleting(photoId);
     try {
       // Extract file path from URL
       const urlParts = photoUrl.split('/');
       const fileName = urlParts[urlParts.length - 1];
       const filePath = `asset-photos/${fileName}`;
 
       // Delete from storage
       const { error: storageError } = await supabase.storage
         .from('asset-photos')
         .remove([filePath]);
 
       if (storageError) console.warn('Storage delete warning:', storageError);
 
       // Delete from database
       const { error: dbError } = await supabase
         .from('asset_photos')
         .delete()
         .eq('id', photoId);
 
       if (dbError) throw dbError;
 
       toast.success(language === 'es' ? '✅ Foto eliminada' : '✅ Photo deleted');
       onPhotoUploaded();
     } catch (error: any) {
       console.error('Error deleting photo:', error);
       toast.error(error.message || (language === 'es' ? 'Error al eliminar' : 'Failed to delete'));
     } finally {
       setDeleting(null);
     }
   }
 
   return (
     <Card className="estate-card p-4">
       <div className="space-y-4">
         <div className="flex items-center justify-between">
           <h3 className="font-medium text-sm">
             {language === 'es' ? 'Fotos del Activo' : 'Asset Photos'}
           </h3>
           <Button
             size="sm"
             variant="outline"
             onClick={() => fileInputRef.current?.click()}
             disabled={uploading}
           >
             {uploading ? (
               <>
                 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                 {language === 'es' ? 'Subiendo...' : 'Uploading...'}
               </>
             ) : (
               <>
                 <Camera className="h-4 w-4 mr-2" />
                 {language === 'es' ? 'Agregar Foto' : 'Add Photo'}
               </>
             )}
           </Button>
           <input
             ref={fileInputRef}
             type="file"
             accept="image/*"
             className="hidden"
             onChange={handleFileSelect}
           />
         </div>
 
         {currentPhotos.length === 0 ? (
           <div className="text-center py-8 border-2 border-dashed rounded-lg">
             <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
             <p className="text-sm text-muted-foreground">
               {language === 'es' ? 'No hay fotos. Agrega una para identificar mejor este activo.' : 'No photos. Add one to better identify this asset.'}
             </p>
           </div>
         ) : (
           <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
             {currentPhotos.map((photo) => (
               <div key={photo.id} className="relative group">
                 <img
                   src={photo.url}
                   alt={assetName}
                   className="w-full h-32 object-cover rounded-lg"
                 />
                 <Button
                   size="icon"
                   variant="destructive"
                   className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                   onClick={() => handleDeletePhoto(photo.id, photo.url)}
                   disabled={deleting === photo.id}
                 >
                   {deleting === photo.id ? (
                     <Loader2 className="h-3 w-3 animate-spin" />
                   ) : (
                     <X className="h-3 w-3" />
                   )}
                 </Button>
               </div>
             ))}
           </div>
         )}
 
         <p className="text-xs text-muted-foreground">
           {language === 'es' 
             ? 'Sube fotos reales de este activo. La primera foto se usará como imagen principal.'
             : 'Upload real photos of this asset. The first photo will be used as the main image.'}
         </p>
       </div>
     </Card>
   );
 }