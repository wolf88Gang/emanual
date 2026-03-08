import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Plus, Wand2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';

interface NoEstateGuideProps {
  /** Optional context hint for the section */
  sectionHint?: { en: string; es: string; de: string };
}

export function NoEstateGuide({ sectionHint }: NoEstateGuideProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const es = language === 'es';
  const de = language === 'de';

  const hint = sectionHint
    ? (es ? sectionHint.es : de ? sectionHint.de : sectionHint.en)
    : (es
        ? 'Para comenzar, agrega tu primera propiedad. Desde ahí podrás crear zonas, activos y tareas.'
        : de
        ? 'Fügen Sie zunächst Ihre erste Immobilie hinzu. Von dort aus können Sie Zonen, Anlagen und Aufgaben erstellen.'
        : 'To get started, add your first property. From there you can create zones, assets, and tasks.');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <Building2 className="h-16 w-16 text-muted-foreground/40 mb-4" />
      <h2 className="text-2xl font-serif font-semibold mb-2">
        {es ? 'Sin Propiedad Configurada' : de ? 'Keine Immobilie konfiguriert' : 'No Property Set Up'}
      </h2>
      <p className="text-muted-foreground max-w-md mb-6">{hint}</p>
      <div className="flex gap-3">
        <Button onClick={() => navigate('/estates')}>
          <Plus className="h-4 w-4 mr-2" />
          {es ? 'Agregar Propiedad' : de ? 'Immobilie hinzufügen' : 'Add Property'}
        </Button>
        <Button variant="outline" onClick={() => navigate('/setup-wizard')}>
          <Wand2 className="h-4 w-4 mr-2" />
          {es ? 'Asistente' : de ? 'Assistent' : 'Setup Wizard'}
        </Button>
      </div>
    </div>
  );
}
