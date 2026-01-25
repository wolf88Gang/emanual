import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Camera, QrCode, AlertCircle, Keyboard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface QRScannerViewProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export function QRScannerView({ onScan, onClose }: QRScannerViewProps) {
  const { language } = useLanguage();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (manualMode) return;

    let mounted = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setScanning(true);
        }
      } catch (err) {
        console.error('Camera access error:', err);
        if (mounted) {
          setError(language === 'es' 
            ? 'No se pudo acceder a la cámara. Verifica los permisos.'
            : 'Could not access camera. Please check permissions.');
        }
      }
    }

    startCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [language, manualMode, stopCamera]);

  const handleManualSubmit = () => {
    if (manualCode.trim()) {
      onScan(manualCode.trim());
    }
  };

  const switchToManual = () => {
    stopCamera();
    setManualMode(true);
    setError(null);
  };

  if (manualMode) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Keyboard className="h-8 w-8 text-primary" />
          </div>
          <h3 className="font-medium text-lg mb-1">
            {language === 'es' ? 'Ingreso Manual' : 'Manual Entry'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {language === 'es' 
              ? 'Ingresa el código del activo o escanea la etiqueta QR'
              : 'Enter the asset code or scan the QR label'}
          </p>
        </div>

        <div className="space-y-4">
          <Input 
            placeholder={language === 'es' ? 'Código del activo (UUID)' : 'Asset code (UUID)'}
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            className="text-center font-mono"
            autoFocus
          />
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setManualMode(false);
                setError(null);
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              {language === 'es' ? 'Usar Cámara' : 'Use Camera'}
            </Button>
            <Button 
              className="flex-1"
              onClick={handleManualSubmit}
              disabled={!manualCode.trim()}
            >
              {language === 'es' ? 'Buscar' : 'Search'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-destructive mb-2">{error}</p>
          <p className="text-sm text-muted-foreground">
            {language === 'es' 
              ? 'Puedes ingresar el código manualmente'
              : 'You can enter the code manually'}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            {language === 'es' ? 'Cancelar' : 'Cancel'}
          </Button>
          <Button onClick={switchToManual} className="flex-1">
            <Keyboard className="h-4 w-4 mr-2" />
            {language === 'es' ? 'Manual' : 'Manual'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera View */}
      <div className="relative aspect-square bg-black rounded-2xl overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
        
        {/* Scanning overlay */}
        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Corner brackets */}
            <div className="relative w-56 h-56">
              {/* Top-left */}
              <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-lg" />
              {/* Top-right */}
              <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-lg" />
              {/* Bottom-left */}
              <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-lg" />
              {/* Bottom-right */}
              <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-lg" />
              
              {/* Scanning line */}
              <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse" 
                   style={{ top: '50%' }} />
            </div>
            
            {/* Dim the edges */}
            <div className="absolute inset-0 bg-black/40 pointer-events-none" 
                 style={{ 
                   clipPath: 'polygon(0% 0%, 0% 100%, calc(50% - 7rem) 100%, calc(50% - 7rem) calc(50% - 7rem), calc(50% + 7rem) calc(50% - 7rem), calc(50% + 7rem) calc(50% + 7rem), calc(50% - 7rem) calc(50% + 7rem), calc(50% - 7rem) 100%, 100% 100%, 100% 0%)' 
                 }} />
          </div>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>

      <p className="text-sm text-center text-muted-foreground">
        {language === 'es' 
          ? 'Apunta la cámara al código QR del activo'
          : 'Point camera at asset QR code'}
      </p>
      
      {/* Manual entry fallback */}
      <div className="pt-4 border-t border-border">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={switchToManual}
        >
          <Keyboard className="h-4 w-4 mr-2" />
          {language === 'es' ? 'Ingresar código manualmente' : 'Enter code manually'}
        </Button>
      </div>
    </div>
  );
}
