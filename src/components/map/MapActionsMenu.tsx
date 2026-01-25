import React, { useState } from 'react';
import { Plus, X, MapPin, Pencil, QrCode, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MapActionsMenuProps {
  onAddAsset: () => void;
  onDrawZone: () => void;
  onScanQR: () => void;
  onLocateMe: () => void;
  isAddingAsset?: boolean;
  isDrawingZone?: boolean;
  locatingDisabled?: boolean;
}

export function MapActionsMenu({
  onAddAsset,
  onDrawZone,
  onScanQR,
  onLocateMe,
  isAddingAsset = false,
  isDrawingZone = false,
  locatingDisabled = false,
}: MapActionsMenuProps) {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'locate',
      icon: Navigation,
      label: language === 'es' ? 'Mi ubicación' : 'My location',
      onClick: () => {
        onLocateMe();
        setIsOpen(false);
      },
      disabled: locatingDisabled,
      variant: 'secondary' as const,
    },
    {
      id: 'scan',
      icon: QrCode,
      label: language === 'es' ? 'Escanear QR' : 'Scan QR',
      onClick: () => {
        onScanQR();
        setIsOpen(false);
      },
      variant: 'secondary' as const,
    },
    {
      id: 'zone',
      icon: Pencil,
      label: language === 'es' ? 'Dibujar zona' : 'Draw zone',
      onClick: () => {
        onDrawZone();
        setIsOpen(false);
      },
      active: isDrawingZone,
      variant: 'secondary' as const,
    },
    {
      id: 'asset',
      icon: MapPin,
      label: language === 'es' ? 'Agregar activo' : 'Add asset',
      onClick: () => {
        onAddAsset();
        setIsOpen(false);
      },
      active: isAddingAsset,
      variant: 'default' as const,
    },
  ];

  return (
    <div className="fixed bottom-24 right-4 z-[1001] flex flex-col items-end gap-2 lg:bottom-6">
      {/* Action buttons - visible when open */}
      <div className={cn(
        'flex flex-col gap-2 transition-all duration-200 origin-bottom',
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}>
        {actions.map((action) => (
          <div key={action.id} className="flex items-center gap-2 justify-end">
            <span className="bg-background/95 backdrop-blur-sm text-foreground text-sm px-3 py-1.5 rounded-lg shadow-lg border border-border whitespace-nowrap">
              {action.label}
            </span>
            <Button
              variant={action.active ? 'default' : action.variant}
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg',
                action.active && 'ring-2 ring-primary ring-offset-2'
              )}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              <action.icon className="h-5 w-5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Main FAB button */}
      <Button
        size="icon"
        className={cn(
          'h-14 w-14 rounded-full shadow-xl transition-transform duration-200',
          isOpen && 'rotate-45'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
