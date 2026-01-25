 import React, { useEffect, useRef, useState } from 'react';
 import { useNavigate } from 'react-router-dom';
 import { X, ScanLine, Loader2, CheckCircle2 } from 'lucide-react';
 import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
 import { Button } from '@/components/ui/button';
 import { Card } from '@/components/ui/card';
 import { useLanguage } from '@/contexts/LanguageContext';
 import { supabase } from '@/integrations/supabase/client';
 import { toast } from 'sonner';
 
 interface QRScannerViewProps {
   onClose: () => void;
   estateId?: string;
 }
 
 export function QRScannerView({ onClose, estateId }: QRScannerViewProps) {
   const { language } = useLanguage();
   const navigate = useNavigate();
   const videoRef = useRef<HTMLVideoElement>(null);
   const [scanning, setScanning] = useState(true);
   const [result, setResult] = useState<string | null>(null);
   const [error, setError] = useState<string | null>(null);
   const readerRef = useRef<BrowserMultiFormatReader | null>(null);
 
   useEffect(() => {
     let mounted = true;
     const reader = new BrowserMultiFormatReader();
     readerRef.current = reader;
 
     async function startScanning() {
       try {
         const videoElement = videoRef.current;
         if (!videoElement) return;
 
         await reader.decodeFromVideoDevice(
           undefined,
           videoElement,
           async (result, error) => {
             if (!mounted) return;
 
             if (result) {
               const code = result.getText();
               setResult(code);
               setScanning(false);
 
               // Look up asset by QR code
               try {
                 const query = supabase
                   .from('qr_labels')
                   .select('asset_id, assets(id, name)')
                   .eq('code', code);
 
                 if (estateId) {
                   query.eq('estate_id', estateId);
                 }
 
                 const { data, error: dbError } = await query.single();
 
                 if (dbError || !data) {
                   toast.error(language === 'es' ? 'Código QR no encontrado' : 'QR code not found');
                   setTimeout(() => {
                     if (mounted) {
                       setResult(null);
                       setScanning(true);
                     }
                   }, 2000);
                   return;
                 }
 
                 toast.success(language === 'es' ? '✓ Código escaneado' : '✓ Code scanned');
                 
                 // Navigate to asset detail
                 setTimeout(() => {
                   navigate(`/assets/${data.asset_id}`);
                 }, 500);
               } catch (err) {
                 console.error('Error looking up QR code:', err);
                 setError(language === 'es' ? 'Error al buscar código' : 'Error looking up code');
               }
             }
           }
         );
       } catch (err: any) {
         console.error('Error starting scanner:', err);
         setError(err.message || (language === 'es' ? 'Error al acceder a la cámara' : 'Error accessing camera'));
         setScanning(false);
       }
     }
 
     startScanning();
 
     return () => {
       mounted = false;
       reader.reset();
     };
   }, [navigate, language, estateId]);
 
   return (
     <div className="fixed inset-0 z-50 bg-black">
       {/* Header */}
       <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/80 to-transparent">
         <div className="flex items-center justify-between">
           <h2 className="text-white font-semibold">
             {language === 'es' ? 'Escanear Código QR' : 'Scan QR Code'}
           </h2>
           <Button
             variant="ghost"
             size="icon"
             className="text-white hover:bg-white/20"
             onClick={onClose}
           >
             <X className="h-5 w-5" />
           </Button>
         </div>
       </div>
 
       {/* Video */}
       <video
         ref={videoRef}
         className="absolute inset-0 w-full h-full object-cover"
         playsInline
         muted
       />
 
       {/* Scanning Overlay */}
       {scanning && (
         <div className="absolute inset-0 flex items-center justify-center">
           <div className="relative">
             <div className="w-64 h-64 border-4 border-white/30 rounded-2xl">
               <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
               <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
               <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
               <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
             </div>
             <div className="absolute inset-0 flex items-center justify-center animate-pulse">
               <ScanLine className="h-8 w-8 text-primary" />
             </div>
           </div>
         </div>
       )}
 
       {/* Result */}
       {result && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/50">
           <Card className="p-6 m-4 max-w-sm">
             <div className="flex flex-col items-center gap-4">
               <CheckCircle2 className="h-12 w-12 text-primary" />
               <p className="text-center font-medium">
                 {language === 'es' ? 'Código escaneado' : 'Code scanned'}
               </p>
               <p className="text-xs text-muted-foreground font-mono">{result}</p>
             </div>
           </Card>
         </div>
       )}
 
       {/* Error */}
       {error && (
         <div className="absolute inset-0 flex items-center justify-center bg-black/80">
           <Card className="p-6 m-4 max-w-sm">
             <div className="flex flex-col items-center gap-4">
               <p className="text-center text-destructive">{error}</p>
               <Button onClick={onClose}>
                 {language === 'es' ? 'Cerrar' : 'Close'}
               </Button>
             </div>
           </Card>
         </div>
       )}
 
       {/* Instructions */}
       <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
         <p className="text-white text-center text-sm">
           {language === 'es' 
             ? 'Apunta la cámara al código QR del activo' 
             : 'Point camera at the asset QR code'}
         </p>
       </div>
     </div>
   );
 }