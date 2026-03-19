import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LANGUAGE_OPTIONS, Language } from '@/lib/i18n';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

interface LanguagePickerProps {
  variant?: 'icon' | 'full';
}

export function LanguagePicker({ variant = 'icon' }: LanguagePickerProps) {
  const { language, setLanguage } = useLanguage();
  const current = LANGUAGE_OPTIONS.find(l => l.code === language)!;

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
          <span>{current.flag}</span>
          {variant === 'full' && <span>{current.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} collisionPadding={16} className="min-w-[140px]">
        {LANGUAGE_OPTIONS.map(opt => (
          <DropdownMenuItem
            key={opt.code}
            onClick={() => setLanguage(opt.code)}
            className={`gap-2 ${language === opt.code ? 'bg-accent/10 font-medium' : ''}`}
          >
            <span>{opt.flag}</span>
            <span>{opt.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
