import React from 'react';
import { Info, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { DATA_SOURCES } from '@/lib/topographyLayers';

export function DataSourcesPanel() {
  const { language } = useLanguage();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Info className="h-4 w-4" />
          {language === 'es' ? 'Fuentes y Limitaciones' : 'Sources & Limitations'}
        </CardTitle>
        <CardDescription>
          {language === 'es' 
            ? 'Información sobre los datos utilizados en este módulo' 
            : 'Information about the data used in this module'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {DATA_SOURCES.map((source) => (
            <AccordionItem key={source.id} value={source.id}>
              <AccordionTrigger className="text-sm hover:no-underline">
                <div className="flex items-center gap-2">
                  <span>{language === 'es' ? source.nameEs : source.name}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {source.resolution}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <p className="text-muted-foreground">
                    {language === 'es' ? source.descriptionEs : source.description}
                  </p>
                  
                  <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-md">
                    <AlertCircle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-xs text-warning-foreground">
                      {language === 'es' ? source.limitationsEs : source.limitations}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-muted-foreground">
                      {source.attribution}
                    </span>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      {language === 'es' ? 'Ver fuente' : 'View source'}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
