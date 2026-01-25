import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Copy, Check } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AssetQRCodeProps {
  assetId: string;
  assetName: string;
  qrCode: string;
  size?: number;
}

export function AssetQRCode({ assetId, assetName, qrCode, size = 150 }: AssetQRCodeProps) {
  const { language } = useLanguage();
  const [copied, setCopied] = React.useState(false);
  
  // Generate the URL that the QR code points to
  const assetUrl = `${window.location.origin}/assets/${assetId}`;

  function copyCode() {
    navigator.clipboard.writeText(qrCode);
    setCopied(true);
    toast.success(language === 'es' ? 'Código copiado' : 'Code copied');
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadQR() {
    const svg = document.getElementById(`qr-${assetId}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = size * 2;
      canvas.height = size * 2;
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx!.fillStyle = 'white';
      ctx?.fillRect(0, 0, canvas.width, canvas.height);
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${qrCode}-${assetName.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    toast.success(language === 'es' ? 'QR descargado' : 'QR downloaded');
  }

  return (
    <Card className="estate-card">
      <CardContent className="p-4 flex flex-col items-center gap-4">
        <div className="bg-white p-3 rounded-xl">
          <QRCodeSVG
            id={`qr-${assetId}`}
            value={assetUrl}
            size={size}
            level="M"
            includeMargin={false}
          />
        </div>
        
        <div className="text-center">
          <p className="font-mono text-lg font-bold tracking-wider">{qrCode}</p>
          <p className="text-sm text-muted-foreground mt-1">{assetName}</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? (
              <Check className="h-4 w-4 mr-1" />
            ) : (
              <Copy className="h-4 w-4 mr-1" />
            )}
            {language === 'es' ? 'Copiar' : 'Copy'}
          </Button>
          <Button variant="outline" size="sm" onClick={downloadQR}>
            <Download className="h-4 w-4 mr-1" />
            {language === 'es' ? 'Descargar' : 'Download'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
