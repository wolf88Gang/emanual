import React from 'react';
import {
  Droplets, Sun, Scissors, AlertTriangle, Bug, Leaf,
  Mountain, Wind, Calendar, CheckCircle,
  Waves, TreeDeciduous, Sprout, ClipboardList, Shield
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown, Loader2 } from 'lucide-react';
import { getCareProtocolForLanguage } from '@/lib/careProtocol';

interface CareProtocolSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantName: string;
  scientificName?: string;
  careProtocol: any;
  loading?: boolean;
}

function isNewFormat(protocol: any): boolean {
  return protocol && (
    (protocol.watering && typeof protocol.watering === 'object') ||
    (protocol.sunlight && typeof protocol.sunlight === 'object') ||
    protocol.crew_checklist ||
    protocol.do_not_do
  );
}

function LegacyCareDisplay({ protocol, language }: { protocol: any; language: string }) {
  const entries = Object.entries(protocol).filter(([_, value]) => value);

  const labelMap: Record<string, { es: string; en: string; de: string; icon: React.ReactNode }> = {
    watering: { es: 'Riego', en: 'Watering', de: 'Bewässerung', icon: <Droplets className="h-4 w-4 text-blue-500" /> },
    sunlight: { es: 'Luz Solar', en: 'Sunlight', de: 'Sonnenlicht', icon: <Sun className="h-4 w-4 text-yellow-500" /> },
    fertilizer: { es: 'Fertilización', en: 'Fertilizer', de: 'Düngung', icon: <Leaf className="h-4 w-4 text-green-600" /> },
    pruning: { es: 'Poda', en: 'Pruning', de: 'Schnitt', icon: <Scissors className="h-4 w-4 text-muted-foreground" /> },
    soil: { es: 'Suelo', en: 'Soil', de: 'Boden', icon: <Sprout className="h-4 w-4 text-amber-700" /> },
    notes: { es: 'Notas', en: 'Notes', de: 'Notizen', icon: <ClipboardList className="h-4 w-4 text-indigo-500" /> },
    frequency: { es: 'Frecuencia', en: 'Frequency', de: 'Häufigkeit', icon: <Calendar className="h-4 w-4 text-primary" /> },
  };

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-50" />
        <p>{language === 'es' ? 'No hay datos de protocolo disponibles' : language === 'de' ? 'Keine Protokolldaten verfügbar' : 'No protocol data available'}</p>
        <p className="text-sm mt-1">
          {language === 'es'
            ? 'Regenera el protocolo para obtener información detallada'
            : language === 'de' ? 'Protokoll neu generieren für detaillierte Informationen' : 'Regenerate the protocol to get detailed information'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        const label = labelMap[key] || { es: key, en: key, de: key, icon: <Leaf className="h-4 w-4" /> };
        const labelText = language === 'es' ? label.es : language === 'de' ? label.de : label.en;

        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {label.icon}
                <div>
                  <p className="font-medium text-sm">{labelText}</p>
                  <p className="text-sm text-muted-foreground capitalize">{String(value)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CareProtocolSheet({
  open,
  onOpenChange,
  plantName,
  scientificName,
  careProtocol,
  loading = false,
}: CareProtocolSheetProps) {
  const { language } = useLanguage();
  const resolvedProtocol = getCareProtocolForLanguage(careProtocol, language);

  if (!careProtocol && !loading) return null;

  const useNewFormat = isNewFormat(resolvedProtocol);
  const l = (en: string, es: string, de: string) => (language === 'es' ? es : language === 'de' ? de : en);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0">
        <SheetHeader className="p-6 pb-2 bg-primary/5">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <img src="/images/hg-logo.png" alt="HG" className="w-5 h-5 object-contain" />
            {l('Care Protocol', 'Protocolo de Cuidados', 'Pflegeprotokoll')}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {plantName}
            {scientificName && <span className="italic ml-1">({scientificName})</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {l('Specialized protocol for Costa Rica', 'Protocolo especializado para Costa Rica', 'Spezialisiertes Protokoll für Costa Rica')}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6 space-y-4">
            {loading ? (
              <div className="min-h-[240px] flex flex-col items-center justify-center text-center text-muted-foreground gap-3">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p>{l('Updating protocol language…', 'Actualizando idioma del protocolo…', 'Protokollsprache wird aktualisiert…')}</p>
              </div>
            ) : !resolvedProtocol ? (
              <LegacyCareDisplay protocol={{}} language={language} />
            ) : !useNewFormat ? (
              <LegacyCareDisplay protocol={resolvedProtocol} language={language} />
            ) : (
              <>
                <CareSection icon={<Droplets className="h-4 w-4 text-blue-500" />} title={l('Watering', 'Riego', 'Bewässerung')} defaultOpen hasContent={!!resolvedProtocol.watering}>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.watering?.frequency && <InfoRow label={l('Frequency', 'Frecuencia', 'Häufigkeit')} value={resolvedProtocol.watering.frequency} />}
                    {resolvedProtocol.watering?.amount && <InfoRow label={l('Amount', 'Cantidad', 'Menge')} value={resolvedProtocol.watering.amount} />}
                    {resolvedProtocol.watering?.method && <InfoRow label={l('Method', 'Método', 'Methode')} value={resolvedProtocol.watering.method} />}
                    {resolvedProtocol.watering?.dry_season && <InfoRow label={l('Dry Season (Dec-Apr)', 'Temporada Seca (Dic-Abr)', 'Trockenzeit (Dez-Apr)')} value={resolvedProtocol.watering.dry_season} highlight />}
                    {resolvedProtocol.watering?.rainy_season && <InfoRow label={l('Rainy Season (May-Nov)', 'Temporada Lluviosa (May-Nov)', 'Regenzeit (Mai-Nov)')} value={resolvedProtocol.watering.rainy_season} />}
                    {resolvedProtocol.watering?.time_of_day && <InfoRow label={l('Time of Day', 'Hora del Día', 'Tageszeit')} value={resolvedProtocol.watering.time_of_day} />}
                    {resolvedProtocol.watering?.signs_of_overwatering && <WarningRow label={l('Signs of overwatering', 'Señales de exceso de agua', 'Anzeichen von Überwässerung')} value={resolvedProtocol.watering.signs_of_overwatering} />}
                    {resolvedProtocol.watering?.signs_of_underwatering && <WarningRow label={l('Signs of underwatering', 'Señales de falta de agua', 'Anzeichen von Wassermangel')} value={resolvedProtocol.watering.signs_of_underwatering} />}
                  </div>
                </CareSection>

                <CareSection icon={<Sun className="h-4 w-4 text-yellow-500" />} title={l('Sunlight', 'Luz Solar', 'Sonnenlicht')} hasContent={!!resolvedProtocol.sunlight}>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.sunlight?.requirement && <InfoRow label={l('Requirement', 'Requisito', 'Anforderung')} value={resolvedProtocol.sunlight.requirement} />}
                    {resolvedProtocol.sunlight?.hours && <InfoRow label={l('Hours', 'Horas', 'Stunden')} value={resolvedProtocol.sunlight.hours} />}
                    {resolvedProtocol.sunlight?.intensity_notes && <InfoRow label={l('Intensity Notes', 'Notas de Intensidad', 'Intensitätshinweise')} value={resolvedProtocol.sunlight.intensity_notes} />}
                    {resolvedProtocol.sunlight?.shade_tolerance && <InfoRow label={l('Shade Tolerance', 'Tolerancia a Sombra', 'Schattenverträglichkeit')} value={resolvedProtocol.sunlight.shade_tolerance} />}
                  </div>
                </CareSection>

                <CareSection icon={<Sprout className="h-4 w-4 text-amber-700" />} title={l('Soil', 'Suelo', 'Boden')} hasContent={!!resolvedProtocol.soil}>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.soil?.type && <InfoRow label={l('Type', 'Tipo', 'Typ')} value={resolvedProtocol.soil.type} />}
                    {resolvedProtocol.soil?.ph && <InfoRow label="pH" value={resolvedProtocol.soil.ph} />}
                    {resolvedProtocol.soil?.drainage && <InfoRow label={l('Drainage', 'Drenaje', 'Drainage')} value={resolvedProtocol.soil.drainage} />}
                    {resolvedProtocol.soil?.amendments && <InfoRow label={l('Amendments', 'Enmiendas', 'Bodenverbesserer')} value={resolvedProtocol.soil.amendments} />}
                    {resolvedProtocol.soil?.mulch_recommendations && <InfoRow label={l('Mulch', 'Mulch/Mantillo', 'Mulch')} value={resolvedProtocol.soil.mulch_recommendations} />}
                  </div>
                </CareSection>

                <CareSection icon={<Leaf className="h-4 w-4 text-green-600" />} title={l('Fertilization', 'Fertilización', 'Düngung')} hasContent={!!resolvedProtocol.fertilization}>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.fertilization?.type && <InfoRow label={l('Type', 'Tipo', 'Typ')} value={resolvedProtocol.fertilization.type} />}
                    {resolvedProtocol.fertilization?.frequency && <InfoRow label={l('Frequency', 'Frecuencia', 'Häufigkeit')} value={resolvedProtocol.fertilization.frequency} />}
                    {resolvedProtocol.fertilization?.amount && <InfoRow label={l('Amount', 'Cantidad', 'Menge')} value={resolvedProtocol.fertilization.amount} highlight />}
                    {resolvedProtocol.fertilization?.timing && <InfoRow label={l('Timing', 'Temporización', 'Zeitpunkt')} value={resolvedProtocol.fertilization.timing} />}
                    {resolvedProtocol.fertilization?.special_nutrients && <InfoRow label={l('Special Nutrients', 'Nutrientes Especiales', 'Spezielle Nährstoffe')} value={resolvedProtocol.fertilization.special_nutrients} />}
                    {resolvedProtocol.fertilization?.organic_options && <InfoRow label={l('Organic Options', 'Opciones Orgánicas', 'Organische Optionen')} value={resolvedProtocol.fertilization.organic_options} />}
                  </div>
                </CareSection>

                <CareSection icon={<Scissors className="h-4 w-4 text-muted-foreground" />} title={l('Pruning', 'Poda', 'Schnitt')} hasContent={!!resolvedProtocol.pruning}>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.pruning?.frequency && <InfoRow label={l('Frequency', 'Frecuencia', 'Häufigkeit')} value={resolvedProtocol.pruning.frequency} />}
                    {resolvedProtocol.pruning?.timing && <InfoRow label={l('Timing', 'Época', 'Zeitpunkt')} value={resolvedProtocol.pruning.timing} highlight />}
                    {resolvedProtocol.pruning?.technique && <InfoRow label={l('Technique', 'Técnica', 'Technik')} value={resolvedProtocol.pruning.technique} />}
                    {resolvedProtocol.pruning?.tools_required && <InfoRow label={l('Tools', 'Herramientas', 'Werkzeuge')} value={resolvedProtocol.pruning.tools_required} />}
                    {resolvedProtocol.pruning?.shaping_notes && <InfoRow label={l('Shaping Notes', 'Notas de Forma', 'Formhinweise')} value={resolvedProtocol.pruning.shaping_notes} />}
                  </div>
                </CareSection>

                {resolvedProtocol.pest_management && <CareSection icon={<Bug className="h-4 w-4 text-destructive" />} title={l('Pest Management', 'Manejo de Plagas', 'Schädlingsmanagement')} hasContent>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.pest_management.common_pests && <InfoRow label={l('Common Pests', 'Plagas Comunes', 'Häufige Schädlinge')} value={resolvedProtocol.pest_management.common_pests} />}
                    {resolvedProtocol.pest_management.prevention && <InfoRow label={l('Prevention', 'Prevención', 'Vorbeugung')} value={resolvedProtocol.pest_management.prevention} />}
                    {resolvedProtocol.pest_management.organic_treatments && <InfoRow label={l('Organic Treatments (IPM)', 'Tratamientos Orgánicos (IPM)', 'Organische Behandlungen (IPM)')} value={resolvedProtocol.pest_management.organic_treatments} highlight />}
                    {resolvedProtocol.pest_management.inspection_frequency && <InfoRow label={l('Inspection Frequency', 'Frecuencia de Inspección', 'Inspektionshäufigkeit')} value={resolvedProtocol.pest_management.inspection_frequency} />}
                  </div>
                </CareSection>}

                {resolvedProtocol.disease_management && <CareSection icon={<Shield className="h-4 w-4 text-primary" />} title={l('Disease Management', 'Manejo de Enfermedades', 'Krankheitsmanagement')} hasContent>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.disease_management.common_diseases && <InfoRow label={l('Common Diseases', 'Enfermedades Comunes', 'Häufige Krankheiten')} value={resolvedProtocol.disease_management.common_diseases} />}
                    {resolvedProtocol.disease_management.symptoms && <WarningRow label={l('Warning Symptoms', 'Síntomas de Alerta', 'Warnsymptome')} value={resolvedProtocol.disease_management.symptoms} />}
                    {resolvedProtocol.disease_management.prevention && <InfoRow label={l('Prevention', 'Prevención', 'Vorbeugung')} value={resolvedProtocol.disease_management.prevention} />}
                    {resolvedProtocol.disease_management.treatment && <InfoRow label={l('Treatment', 'Tratamiento', 'Behandlung')} value={resolvedProtocol.disease_management.treatment} highlight />}
                  </div>
                </CareSection>}

                {resolvedProtocol.elevation_suitability && <CareSection icon={<Mountain className="h-4 w-4 text-foreground" />} title={l('Elevation Zones', 'Zonas de Elevación', 'Höhenzonen')} hasContent>
                  <div className="flex flex-wrap gap-2">
                    {resolvedProtocol.elevation_suitability.coastal_suitable && <Badge variant="outline" className="bg-secondary text-foreground border-border"><Waves className="h-3 w-3 mr-1" />{l('Coastal (0-300m)', 'Costera (0-300m)', 'Küste (0-300m)')}</Badge>}
                    {resolvedProtocol.elevation_suitability.transitional_suitable && <Badge variant="outline" className="bg-secondary text-foreground border-border"><TreeDeciduous className="h-3 w-3 mr-1" />{l('Transitional (300-1500m)', 'Transicional (300-1500m)', 'Übergang (300-1500m)')}</Badge>}
                    {resolvedProtocol.elevation_suitability.highland_suitable && <Badge variant="outline" className="bg-secondary text-foreground border-border"><Mountain className="h-3 w-3 mr-1" />{l('Highland (1500m+)', 'Montaña (1500m+)', 'Hochland (1500m+)')}</Badge>}
                  </div>
                  {resolvedProtocol.elevation_suitability.optimal_range && <p className="text-sm text-muted-foreground mt-2"><strong>{l('Optimal Range:', 'Rango Óptimo:', 'Optimaler Bereich:')}</strong> {resolvedProtocol.elevation_suitability.optimal_range}</p>}
                </CareSection>}

                {resolvedProtocol.salt_tolerance && <CareSection icon={<Waves className="h-4 w-4 text-cyan-500" />} title={l('Salt Tolerance (Coastal)', 'Tolerancia a Sal (Costera)', 'Salzverträglichkeit (Küste)')} hasContent>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.salt_tolerance.tolerance_level && <InfoRow label={l('Tolerance Level', 'Nivel de Tolerancia', 'Toleranzgrad')} value={resolvedProtocol.salt_tolerance.tolerance_level} />}
                    {resolvedProtocol.salt_tolerance.coastal_suitability && <InfoRow label={l('Coastal Suitability', 'Idoneidad Costera', 'Eignung für Küste')} value={resolvedProtocol.salt_tolerance.coastal_suitability} />}
                    {resolvedProtocol.salt_tolerance.mitigation_required && <InfoRow label={l('Mitigation Required', 'Mitigación Requerida', 'Erforderliche Gegenmaßnahmen')} value={resolvedProtocol.salt_tolerance.mitigation_required} highlight />}
                  </div>
                </CareSection>}

                {resolvedProtocol.weather_triggers && <CareSection icon={<Wind className="h-4 w-4 text-sky-500" />} title={l('Weather Triggers', 'Disparadores Climáticos', 'Wetterauslöser')} hasContent>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.weather_triggers.high_rainfall && <InfoRow label={l('High Rainfall (>100mm/week)', 'Lluvia Alta (>100mm/sem)', 'Starker Regen (>100mm/Woche)')} value={resolvedProtocol.weather_triggers.high_rainfall} />}
                    {resolvedProtocol.weather_triggers.drought && <InfoRow label={l('Drought (<10mm/week)', 'Sequía (<10mm/sem)', 'Dürre (<10mm/Woche)')} value={resolvedProtocol.weather_triggers.drought} highlight />}
                    {resolvedProtocol.weather_triggers.high_winds && <InfoRow label={l('High Winds', 'Vientos Fuertes', 'Starke Winde')} value={resolvedProtocol.weather_triggers.high_winds} />}
                    {resolvedProtocol.weather_triggers.temperature_extremes && <InfoRow label={l('Temperature Extremes', 'Temperaturas Extremas', 'Extreme Temperaturen')} value={resolvedProtocol.weather_triggers.temperature_extremes} />}
                  </div>
                </CareSection>}

                {resolvedProtocol.crew_checklist && <CareSection icon={<ClipboardList className="h-4 w-4 text-indigo-500" />} title={l('Crew Task Checklist', 'Lista de Tareas del Equipo', 'Team-Aufgabenliste')} defaultOpen hasContent>
                  <div className="space-y-4">
                    {resolvedProtocol.crew_checklist.daily_tasks?.length > 0 && <TaskList title={l('Daily Tasks', 'Tareas Diarias', 'Tägliche Aufgaben')} tasks={resolvedProtocol.crew_checklist.daily_tasks} color="bg-secondary text-foreground" />}
                    {resolvedProtocol.crew_checklist.weekly_tasks?.length > 0 && <TaskList title={l('Weekly Tasks', 'Tareas Semanales', 'Wöchentliche Aufgaben')} tasks={resolvedProtocol.crew_checklist.weekly_tasks} color="bg-secondary text-foreground" />}
                    {resolvedProtocol.crew_checklist.monthly_tasks?.length > 0 && <TaskList title={l('Monthly Tasks', 'Tareas Mensuales', 'Monatliche Aufgaben')} tasks={resolvedProtocol.crew_checklist.monthly_tasks} color="bg-secondary text-foreground" />}
                    {resolvedProtocol.crew_checklist.quarterly_tasks?.length > 0 && <TaskList title={l('Quarterly Tasks', 'Tareas Trimestrales', 'Vierteljährliche Aufgaben')} tasks={resolvedProtocol.crew_checklist.quarterly_tasks} color="bg-secondary text-foreground" />}
                    {resolvedProtocol.crew_checklist.seasonal_tasks?.length > 0 && <TaskList title={l('Seasonal Tasks', 'Tareas Estacionales', 'Saisonale Aufgaben')} tasks={resolvedProtocol.crew_checklist.seasonal_tasks} color="bg-secondary text-foreground" />}
                  </div>
                </CareSection>}

                {resolvedProtocol.common_issues?.length > 0 && <CareSection icon={<AlertTriangle className="h-4 w-4 text-warning" />} title={l('Common Issues', 'Problemas Comunes', 'Häufige Probleme')} hasContent>
                  <div className="space-y-3">
                    {resolvedProtocol.common_issues.map((issue: any, idx: number) => (
                      <Card key={idx} className="bg-warning/10 border-warning/30">
                        <CardContent className="p-3">
                          <p className="font-medium text-sm">{issue.issue}</p>
                          {issue.symptoms && <p className="text-xs text-muted-foreground mt-1"><strong>{l('Symptoms:', 'Síntomas:', 'Symptome:')}</strong> {issue.symptoms}</p>}
                          {issue.cause && <p className="text-xs text-muted-foreground mt-1"><strong>{l('Cause:', 'Causa:', 'Ursache:')}</strong> {issue.cause}</p>}
                          {issue.treatment && <p className="text-xs text-primary mt-1"><strong>{l('Treatment:', 'Tratamiento:', 'Behandlung:')}</strong> {issue.treatment}</p>}
                          {issue.prevention && <p className="text-xs text-success mt-1"><strong>{l('Prevention:', 'Prevención:', 'Vorbeugung:')}</strong> {issue.prevention}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CareSection>}

                {resolvedProtocol.do_not_do?.length > 0 && <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      {l('⚠️ DO NOT DO - Critical Warnings', '⚠️ NO HACER - Advertencias Críticas', '⚠️ NICHT TUN - Kritische Warnungen')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {resolvedProtocol.do_not_do.map((warning: any, idx: number) => {
                        const warningText = typeof warning === 'string' ? warning : warning.warning;
                        const consequence = typeof warning === 'object' ? warning.consequence : null;
                        const severity = typeof warning === 'object' ? warning.severity : 'high';

                        return (
                          <div key={idx} className={`p-3 rounded-lg ${severity === 'critical' ? 'bg-destructive/15 border border-destructive/30' : severity === 'high' ? 'bg-warning/15 border border-warning/30' : 'bg-secondary border border-border'}`}>
                            <div className="flex items-start gap-2">
                              <span className="text-lg">⚠️</span>
                              <div>
                                <p className="text-sm font-medium text-destructive">{warningText}</p>
                                {consequence && <p className="text-xs text-muted-foreground mt-1"><strong>{l('Consequence:', 'Consecuencia:', 'Folge:')}</strong> {consequence}</p>}
                                {severity && <Badge variant="outline" className="mt-1 text-xs">{severity === 'critical' ? l('CRITICAL', 'CRÍTICO', 'KRITISCH') : severity === 'high' ? l('HIGH', 'ALTO', 'HOCH') : l('MEDIUM', 'MEDIO', 'MITTEL')}</Badge>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>}

                {resolvedProtocol.wildlife_interactions && <CareSection icon={<TreeDeciduous className="h-4 w-4 text-emerald-500" />} title={l('Wildlife Interactions', 'Interacciones Ecológicas', 'Ökologische Interaktionen')} hasContent>
                  <div className="space-y-3 text-sm">
                    {resolvedProtocol.wildlife_interactions.attracts && <InfoRow label={l('Attracts', 'Atrae', 'Zieht an')} value={resolvedProtocol.wildlife_interactions.attracts} />}
                    {resolvedProtocol.wildlife_interactions.ecological_value && <InfoRow label={l('Ecological Value', 'Valor Ecológico', 'Ökologischer Wert')} value={resolvedProtocol.wildlife_interactions.ecological_value} />}
                  </div>
                </CareSection>}

                {resolvedProtocol.special_notes && <Card className="bg-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-primary" />
                      {l('Special Notes for Costa Rica', 'Notas Especiales para Costa Rica', 'Besondere Hinweise für Costa Rica')}
                    </p>
                    <p className="text-sm text-muted-foreground">{resolvedProtocol.special_notes}</p>
                  </CardContent>
                </Card>}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function CareSection({ icon, title, children, defaultOpen = false, hasContent = true }: { icon: React.ReactNode; title: string; children: React.ReactNode; defaultOpen?: boolean; hasContent?: boolean; }) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { language } = useLanguage();

  if (!hasContent) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">{icon}{title}</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {React.Children.count(children) > 0 ? children : <p className="text-sm text-muted-foreground italic">{language === 'es' ? 'No hay datos disponibles' : language === 'de' ? 'Keine Daten verfügbar' : 'No data available'}</p>}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function InfoRow({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean; }) {
  return (
    <div className={`${highlight ? 'bg-primary/5 p-2 rounded-lg -mx-2' : ''}`}>
      <span className="font-medium text-foreground">{label}:</span>{' '}
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function WarningRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-warning/10 p-2 rounded-lg -mx-2 border-l-2 border-warning">
      <span className="font-medium text-foreground">{label}:</span>{' '}
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function TaskList({ title, tasks, color }: { title: string; tasks: string[]; color: string; }) {
  return (
    <div>
      <Badge className={`${color} mb-2`}>{title}</Badge>
      <ul className="space-y-1 ml-2">
        {tasks.map((task, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
            <span>{task}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
