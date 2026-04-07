import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Eye } from 'lucide-react';

export function DemoBanner() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const es = language === 'es';
  const de = language === 'de';

  const isDemo = user?.email?.endsWith('@demo.com');
  if (!isDemo) return null;

  const text = de
    ? 'Sie nutzen die Demo-Version'
    : es
      ? 'Estás usando la versión demo'
      : "You're viewing the demo";

  return (
    <div className="px-4 py-2 text-sm flex items-center justify-center gap-2 bg-primary/5 text-primary border-b border-primary/10">
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">{text}</span>
    </div>
  );
}
