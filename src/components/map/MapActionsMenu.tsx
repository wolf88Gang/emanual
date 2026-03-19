import React, { useState } from 'react';
import { Plus, X, MapPin, Pencil, QrCode, Navigation, Clock, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MapActionsMenuProps {
  onAddAsset: () => void;
  onDrawZone: () => void;
  onScanQR: () => void;
  onLocateMe: () => void;
  onStartShift?: () => void;
  onEndShift?: () => void;
  isAddingAsset?: boolean;
  isDrawingZone?: boolean;
  locatingDisabled?: boolean;
  hasActiveShift?: boolean;
}

export function MapActionsMenu({
  onAddAsset,
  onDrawZone,
  onScanQR,
  onLocateMe,
  onStartShift,
  onEndShift,
  isAddingAsset = false,
  isDrawingZone = false,
  locatingDisabled = false,
  hasActiveShift = false,
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
    // Shift action - dynamic based on active shift
    hasActiveShift ? {
      id: 'end-shift',
      icon: LogOut,
      label: language === 'es' ? 'Finalizar Jornada' : 'End Shift',
      onClick: () => {
        onEndShift?.();
        setIsOpen(false);
      },
      variant: 'destructive' as const,
      highlight: true,
    } : {
      id: 'start-shift',
      icon: LogIn,
      label: language === 'es' ? 'Iniciar Jornada (QR)' : 'Start Shift (QR)',
      onClick: () => {
        onStartShift?.();
        setIsOpen(false);
      },
      variant: 'default' as const,
      highlight: true,
    },
    {
      id: 'scan',
      icon: QrCode,
      label: language === 'es' ? 'Ver Activo (QR)' : 'View Asset (QR)',
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
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="fixed bottom-24 right-4 z-30 flex flex-col items-end gap-2 lg:bottom-6">
      {/* Active Shift Indicator */}
      {hasActiveShift && !isOpen && (
        <div className="flex items-center gap-2 bg-primary/90 text-primary-foreground px-3 py-1.5 rounded-full shadow-lg text-sm animate-pulse">
          <Clock className="h-4 w-4" />
          {language === 'es' ? 'Jornada activa' : 'Shift active'}
        </div>
      )}

      {/* Action buttons - visible when open */}
      <div className={cn(
        'flex flex-col gap-2 transition-all duration-200 origin-bottom',
        isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
      )}>
        {actions.map((action) => (
          <div key={action.id} className="flex items-center gap-2 justify-end">
            <span className={cn(
              "text-sm px-3 py-1.5 rounded-lg shadow-lg border whitespace-nowrap",
              action.highlight 
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background/95 backdrop-blur-sm text-foreground border-border"
            )}>
              {action.label}
            </span>
            <Button
              variant={action.active ? 'default' : action.variant as any}
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg',
                action.active && 'ring-2 ring-primary ring-offset-2',
                action.highlight && !action.active && 'ring-2 ring-offset-2',
                action.id === 'end-shift' && 'ring-destructive'
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
          isOpen && 'rotate-45',
          hasActiveShift && !isOpen && 'bg-primary'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
      </Button>
    </div>
  );
}
