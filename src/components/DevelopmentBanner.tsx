import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { HardHat } from 'lucide-react';
import { useDevBannerVisible } from '@/hooks/useDevBanner';

export function DevelopmentBanner() {
  const { user, isPlatformAdmin, profile } = useAuth();
  const { language } = useLanguage();
  const visible = useDevBannerVisible(profile?.org_id ?? null);

  if (!user || isPlatformAdmin || !visible) return null;

  const es = language === 'es';
  const de = language === 'de';

  const text = de
    ? 'Diese App befindet sich in der aktiven Entwicklung. Funktionen können sich ändern.'
    : es
      ? 'Esta aplicación está en desarrollo activo. Algunas funciones pueden cambiar o estar temporalmente no disponibles.'
      : 'This app is under active development. Some features may change or be temporarily unavailable.';

  return (
    <div className="px-4 py-2 text-sm flex items-center justify-center gap-2 bg-warning/15 text-warning-foreground border-b border-warning/30">
      <HardHat className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium text-center">{text}</span>
    </div>
  );
}
