import React from 'react';
import { 
  Droplets, Sun, Scissors, AlertTriangle, Bug, Leaf, 
  Mountain, Wind, Calendar, CheckCircle, ThermometerSun,
  Waves, TreeDeciduous, Sprout, ClipboardList, Shield
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useLanguage } from '@/contexts/LanguageContext';
import { ChevronDown } from 'lucide-react';

interface CareProtocolSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plantName: string;
  scientificName?: string;
  careProtocol: any;
}

// Helper to check if protocol is the new structured format vs legacy simple format
function isNewFormat(protocol: any): boolean {
  return protocol && (
    (protocol.watering && typeof protocol.watering === 'object') ||
    (protocol.sunlight && typeof protocol.sunlight === 'object') ||
    protocol.crew_checklist ||
    protocol.do_not_do
  );
}

// Render legacy simple format
function LegacyCareDisplay({ protocol, language }: { protocol: any; language: string }) {
  const entries = Object.entries(protocol).filter(([key, value]) => value);
  
  const labelMap: Record<string, { es: string; en: string; icon: React.ReactNode }> = {
    watering: { es: 'Riego', en: 'Watering', icon: <Droplets className="h-4 w-4 text-blue-500" /> },
    sunlight: { es: 'Luz Solar', en: 'Sunlight', icon: <Sun className="h-4 w-4 text-yellow-500" /> },
    fertilizer: { es: 'Fertilización', en: 'Fertilizer', icon: <Leaf className="h-4 w-4 text-green-600" /> },
    pruning: { es: 'Poda', en: 'Pruning', icon: <Scissors className="h-4 w-4 text-gray-600" /> },
    soil: { es: 'Suelo', en: 'Soil', icon: <Sprout className="h-4 w-4 text-amber-700" /> },
    notes: { es: 'Notas', en: 'Notes', icon: <ClipboardList className="h-4 w-4 text-indigo-500" /> },
    frequency: { es: 'Frecuencia', en: 'Frequency', icon: <Calendar className="h-4 w-4 text-primary" /> },
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
        const label = labelMap[key] || { es: key, en: key, icon: <Leaf className="h-4 w-4" /> };
        return (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {label.icon}
                <div>
                  <p className="font-medium text-sm">{language === 'es' ? label.es : label.en}</p>
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
  careProtocol 
}: CareProtocolSheetProps) {
  const { language } = useLanguage();

  if (!careProtocol) return null;

  const useNewFormat = isNewFormat(careProtocol);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden p-0">
        <SheetHeader className="p-6 pb-2 bg-primary/5">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <img src="/images/hg-logo.png" alt="HG" className="w-5 h-5 object-contain" />
            {language === 'es' ? 'Protocolo de Cuidados' : language === 'de' ? 'Pflegeprotokoll' : 'Care Protocol'}
          </SheetTitle>
          <p className="text-sm text-muted-foreground">
            {plantName}
            {scientificName && <span className="italic ml-1">({scientificName})</span>}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {language === 'es' 
              ? 'Protocolo especializado para Costa Rica' 
              : language === 'de' ? 'Spezialisiertes Protokoll für Costa Rica' : 'Specialized protocol for Costa Rica'}
          </p>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)]">
          <div className="p-6 space-y-4">
            {!useNewFormat ? (
              <LegacyCareDisplay protocol={careProtocol} language={language} />
            ) : (
              <>
                {/* Watering Section */}
                <CareSection
                  icon={<Droplets className="h-4 w-4 text-blue-500" />}
                  title={language === 'es' ? 'Riego' : 'Watering'}
                  defaultOpen
                  hasContent={!!careProtocol.watering}
                >
                  <div className="space-y-3 text-sm">
                    {careProtocol.watering?.frequency && (
                      <InfoRow 
                        label={language === 'es' ? 'Frecuencia' : 'Frequency'} 
                        value={careProtocol.watering.frequency} 
                      />
                    )}
                    {careProtocol.watering?.amount && (
                      <InfoRow 
                        label={language === 'es' ? 'Cantidad' : 'Amount'} 
                        value={careProtocol.watering.amount} 
                      />
                    )}
                    {careProtocol.watering?.method && (
                      <InfoRow 
                        label={language === 'es' ? 'Método' : 'Method'} 
                        value={careProtocol.watering.method} 
                      />
                    )}
                    {careProtocol.watering?.dry_season && (
                      <InfoRow 
                        label={language === 'es' ? 'Temporada Seca (Dic-Abr)' : 'Dry Season (Dec-Apr)'} 
                        value={careProtocol.watering.dry_season} 
                        highlight
                      />
                    )}
                    {careProtocol.watering?.rainy_season && (
                      <InfoRow 
                        label={language === 'es' ? 'Temporada Lluviosa (May-Nov)' : 'Rainy Season (May-Nov)'} 
                        value={careProtocol.watering.rainy_season} 
                      />
                    )}
                    {careProtocol.watering?.time_of_day && (
                      <InfoRow 
                        label={language === 'es' ? 'Hora del Día' : 'Time of Day'} 
                        value={careProtocol.watering.time_of_day} 
                      />
                    )}
                    {careProtocol.watering?.signs_of_overwatering && (
                      <WarningRow 
                        label={language === 'es' ? 'Señales de exceso de agua' : 'Signs of overwatering'} 
                        value={careProtocol.watering.signs_of_overwatering} 
                      />
                    )}
                    {careProtocol.watering?.signs_of_underwatering && (
                      <WarningRow 
                        label={language === 'es' ? 'Señales de falta de agua' : 'Signs of underwatering'} 
                        value={careProtocol.watering.signs_of_underwatering} 
                      />
                    )}
                  </div>
                </CareSection>

                {/* Sunlight Section */}
                <CareSection
                  icon={<Sun className="h-4 w-4 text-yellow-500" />}
                  title={language === 'es' ? 'Luz Solar' : 'Sunlight'}
                  hasContent={!!careProtocol.sunlight}
                >
                  <div className="space-y-3 text-sm">
                    {careProtocol.sunlight?.requirement && (
                      <InfoRow 
                        label={language === 'es' ? 'Requisito' : 'Requirement'} 
                        value={careProtocol.sunlight.requirement} 
                      />
                    )}
                    {careProtocol.sunlight?.hours && (
                      <InfoRow 
                        label={language === 'es' ? 'Horas' : 'Hours'} 
                        value={careProtocol.sunlight.hours} 
                      />
                    )}
                    {careProtocol.sunlight?.intensity_notes && (
                      <InfoRow 
                        label={language === 'es' ? 'Notas de Intensidad' : 'Intensity Notes'} 
                        value={careProtocol.sunlight.intensity_notes} 
                      />
                    )}
                    {careProtocol.sunlight?.shade_tolerance && (
                      <InfoRow 
                        label={language === 'es' ? 'Tolerancia a Sombra' : 'Shade Tolerance'} 
                        value={careProtocol.sunlight.shade_tolerance} 
                      />
                    )}
                  </div>
                </CareSection>

                {/* Soil Section */}
                <CareSection
                  icon={<Sprout className="h-4 w-4 text-amber-700" />}
                  title={language === 'es' ? 'Suelo' : 'Soil'}
                  hasContent={!!careProtocol.soil}
                >
                  <div className="space-y-3 text-sm">
                    {careProtocol.soil?.type && (
                      <InfoRow 
                        label={language === 'es' ? 'Tipo' : 'Type'} 
                        value={careProtocol.soil.type} 
                      />
                    )}
                    {careProtocol.soil?.ph && (
                      <InfoRow label="pH" value={careProtocol.soil.ph} />
                    )}
                    {careProtocol.soil?.drainage && (
                      <InfoRow 
                        label={language === 'es' ? 'Drenaje' : 'Drainage'} 
                        value={careProtocol.soil.drainage} 
                      />
                    )}
                    {careProtocol.soil?.amendments && (
                      <InfoRow 
                        label={language === 'es' ? 'Enmiendas' : 'Amendments'} 
                        value={careProtocol.soil.amendments} 
                      />
                    )}
                    {careProtocol.soil?.mulch_recommendations && (
                      <InfoRow 
                        label={language === 'es' ? 'Mulch/Mantillo' : 'Mulch'} 
                        value={careProtocol.soil.mulch_recommendations} 
                      />
                    )}
                  </div>
                </CareSection>

                {/* Fertilization Section */}
                <CareSection
                  icon={<Leaf className="h-4 w-4 text-green-600" />}
                  title={language === 'es' ? 'Fertilización' : 'Fertilization'}
                  hasContent={!!careProtocol.fertilization}
                >
                  <div className="space-y-3 text-sm">
                    {careProtocol.fertilization?.type && (
                      <InfoRow 
                        label={language === 'es' ? 'Tipo' : 'Type'} 
                        value={careProtocol.fertilization.type} 
                      />
                    )}
                    {careProtocol.fertilization?.frequency && (
                      <InfoRow 
                        label={language === 'es' ? 'Frecuencia' : 'Frequency'} 
                        value={careProtocol.fertilization.frequency} 
                      />
                    )}
                    {careProtocol.fertilization?.amount && (
                      <InfoRow 
                        label={language === 'es' ? 'Cantidad' : 'Amount'} 
                        value={careProtocol.fertilization.amount} 
                        highlight
                      />
                    )}
                    {careProtocol.fertilization?.timing && (
                      <InfoRow 
                        label={language === 'es' ? 'Temporización' : 'Timing'} 
                        value={careProtocol.fertilization.timing} 
                      />
                    )}
                    {careProtocol.fertilization?.special_nutrients && (
                      <InfoRow 
                        label={language === 'es' ? 'Nutrientes Especiales' : 'Special Nutrients'} 
                        value={careProtocol.fertilization.special_nutrients} 
                      />
                    )}
                    {careProtocol.fertilization?.organic_options && (
                      <InfoRow 
                        label={language === 'es' ? 'Opciones Orgánicas' : 'Organic Options'} 
                        value={careProtocol.fertilization.organic_options} 
                      />
                    )}
                  </div>
                </CareSection>

                {/* Pruning Section */}
                <CareSection
                  icon={<Scissors className="h-4 w-4 text-gray-600" />}
                  title={language === 'es' ? 'Poda' : 'Pruning'}
                  hasContent={!!careProtocol.pruning}
                >
                  <div className="space-y-3 text-sm">
                    {careProtocol.pruning?.frequency && (
                      <InfoRow 
                        label={language === 'es' ? 'Frecuencia' : 'Frequency'} 
                        value={careProtocol.pruning.frequency} 
                      />
                    )}
                    {careProtocol.pruning?.timing && (
                      <InfoRow 
                        label={language === 'es' ? 'Época' : 'Timing'} 
                        value={careProtocol.pruning.timing} 
                        highlight
                      />
                    )}
                    {careProtocol.pruning?.technique && (
                      <InfoRow 
                        label={language === 'es' ? 'Técnica' : 'Technique'} 
                        value={careProtocol.pruning.technique} 
                      />
                    )}
                    {careProtocol.pruning?.tools_required && (
                      <InfoRow 
                        label={language === 'es' ? 'Herramientas' : 'Tools'} 
                        value={careProtocol.pruning.tools_required} 
                      />
                    )}
                    {careProtocol.pruning?.shaping_notes && (
                      <InfoRow 
                        label={language === 'es' ? 'Notas de Forma' : 'Shaping Notes'} 
                        value={careProtocol.pruning.shaping_notes} 
                      />
                    )}
                  </div>
                </CareSection>

                {/* Pest Management */}
                {careProtocol.pest_management && (
                  <CareSection
                    icon={<Bug className="h-4 w-4 text-red-500" />}
                    title={language === 'es' ? 'Manejo de Plagas' : 'Pest Management'}
                    hasContent={true}
                  >
                    <div className="space-y-3 text-sm">
                      {careProtocol.pest_management.common_pests && (
                        <InfoRow 
                          label={language === 'es' ? 'Plagas Comunes' : 'Common Pests'} 
                          value={careProtocol.pest_management.common_pests} 
                        />
                      )}
                      {careProtocol.pest_management.prevention && (
                        <InfoRow 
                          label={language === 'es' ? 'Prevención' : 'Prevention'} 
                          value={careProtocol.pest_management.prevention} 
                        />
                      )}
                      {careProtocol.pest_management.organic_treatments && (
                        <InfoRow 
                          label={language === 'es' ? 'Tratamientos Orgánicos (IPM)' : 'Organic Treatments (IPM)'} 
                          value={careProtocol.pest_management.organic_treatments} 
                          highlight
                        />
                      )}
                      {careProtocol.pest_management.inspection_frequency && (
                        <InfoRow 
                          label={language === 'es' ? 'Frecuencia de Inspección' : 'Inspection Frequency'} 
                          value={careProtocol.pest_management.inspection_frequency} 
                        />
                      )}
                    </div>
                  </CareSection>
                )}

                {/* Disease Management */}
                {careProtocol.disease_management && (
                  <CareSection
                    icon={<Shield className="h-4 w-4 text-purple-500" />}
                    title={language === 'es' ? 'Manejo de Enfermedades' : 'Disease Management'}
                    hasContent={true}
                  >
                    <div className="space-y-3 text-sm">
                      {careProtocol.disease_management.common_diseases && (
                        <InfoRow 
                          label={language === 'es' ? 'Enfermedades Comunes' : 'Common Diseases'} 
                          value={careProtocol.disease_management.common_diseases} 
                        />
                      )}
                      {careProtocol.disease_management.symptoms && (
                        <WarningRow 
                          label={language === 'es' ? 'Síntomas de Alerta' : 'Warning Symptoms'} 
                          value={careProtocol.disease_management.symptoms} 
                        />
                      )}
                      {careProtocol.disease_management.prevention && (
                        <InfoRow 
                          label={language === 'es' ? 'Prevención' : 'Prevention'} 
                          value={careProtocol.disease_management.prevention} 
                        />
                      )}
                      {careProtocol.disease_management.treatment && (
                        <InfoRow 
                          label={language === 'es' ? 'Tratamiento' : 'Treatment'} 
                          value={careProtocol.disease_management.treatment} 
                          highlight
                        />
                      )}
                    </div>
                  </CareSection>
                )}

                {/* Elevation Suitability */}
                {careProtocol.elevation_suitability && (
                  <CareSection
                    icon={<Mountain className="h-4 w-4 text-slate-600" />}
                    title={language === 'es' ? 'Zonas de Elevación' : 'Elevation Zones'}
                    hasContent={true}
                  >
                    <div className="flex flex-wrap gap-2">
                      {careProtocol.elevation_suitability.coastal_suitable && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Waves className="h-3 w-3 mr-1" />
                          {language === 'es' ? 'Costera (0-300m)' : 'Coastal (0-300m)'}
                        </Badge>
                      )}
                      {careProtocol.elevation_suitability.transitional_suitable && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <TreeDeciduous className="h-3 w-3 mr-1" />
                          {language === 'es' ? 'Transicional (300-1500m)' : 'Transitional (300-1500m)'}
                        </Badge>
                      )}
                      {careProtocol.elevation_suitability.highland_suitable && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          <Mountain className="h-3 w-3 mr-1" />
                          {language === 'es' ? 'Montaña (1500m+)' : 'Highland (1500m+)'}
                        </Badge>
                      )}
                    </div>
                    {careProtocol.elevation_suitability.optimal_range && (
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>{language === 'es' ? 'Rango Óptimo:' : 'Optimal Range:'}</strong> {careProtocol.elevation_suitability.optimal_range}
                      </p>
                    )}
                  </CareSection>
                )}

                {/* Salt Tolerance */}
                {careProtocol.salt_tolerance && (
                  <CareSection
                    icon={<Waves className="h-4 w-4 text-cyan-500" />}
                    title={language === 'es' ? 'Tolerancia a Sal (Costera)' : 'Salt Tolerance (Coastal)'}
                    hasContent={true}
                  >
                    <div className="space-y-3 text-sm">
                      {careProtocol.salt_tolerance.tolerance_level && (
                        <InfoRow 
                          label={language === 'es' ? 'Nivel de Tolerancia' : 'Tolerance Level'} 
                          value={careProtocol.salt_tolerance.tolerance_level} 
                        />
                      )}
                      {careProtocol.salt_tolerance.coastal_suitability && (
                        <InfoRow 
                          label={language === 'es' ? 'Idoneidad Costera' : 'Coastal Suitability'} 
                          value={careProtocol.salt_tolerance.coastal_suitability} 
                        />
                      )}
                      {careProtocol.salt_tolerance.mitigation_required && (
                        <InfoRow 
                          label={language === 'es' ? 'Mitigación Requerida' : 'Mitigation Required'} 
                          value={careProtocol.salt_tolerance.mitigation_required} 
                          highlight
                        />
                      )}
                    </div>
                  </CareSection>
                )}

                {/* Weather Triggers */}
                {careProtocol.weather_triggers && (
                  <CareSection
                    icon={<Wind className="h-4 w-4 text-sky-500" />}
                    title={language === 'es' ? 'Disparadores Climáticos' : 'Weather Triggers'}
                    hasContent={true}
                  >
                    <div className="space-y-3 text-sm">
                      {careProtocol.weather_triggers.high_rainfall && (
                        <InfoRow 
                          label={language === 'es' ? 'Lluvia Alta (>100mm/sem)' : 'High Rainfall (>100mm/week)'} 
                          value={careProtocol.weather_triggers.high_rainfall} 
                        />
                      )}
                      {careProtocol.weather_triggers.drought && (
                        <InfoRow 
                          label={language === 'es' ? 'Sequía (<10mm/sem)' : 'Drought (<10mm/week)'} 
                          value={careProtocol.weather_triggers.drought} 
                          highlight
                        />
                      )}
                      {careProtocol.weather_triggers.high_winds && (
                        <InfoRow 
                          label={language === 'es' ? 'Vientos Fuertes' : 'High Winds'} 
                          value={careProtocol.weather_triggers.high_winds} 
                        />
                      )}
                      {careProtocol.weather_triggers.temperature_extremes && (
                        <InfoRow 
                          label={language === 'es' ? 'Temperaturas Extremas' : 'Temperature Extremes'} 
                          value={careProtocol.weather_triggers.temperature_extremes} 
                        />
                      )}
                    </div>
                  </CareSection>
                )}

                {/* Crew Checklist */}
                {careProtocol.crew_checklist && (
                  <CareSection
                    icon={<ClipboardList className="h-4 w-4 text-indigo-500" />}
                    title={language === 'es' ? 'Lista de Tareas del Equipo' : 'Crew Task Checklist'}
                    defaultOpen
                    hasContent={true}
                  >
                    <div className="space-y-4">
                      {careProtocol.crew_checklist.daily_tasks?.length > 0 && (
                        <TaskList 
                          title={language === 'es' ? 'Tareas Diarias' : 'Daily Tasks'} 
                          tasks={careProtocol.crew_checklist.daily_tasks} 
                          color="bg-red-100 text-red-700"
                        />
                      )}
                      {careProtocol.crew_checklist.weekly_tasks?.length > 0 && (
                        <TaskList 
                          title={language === 'es' ? 'Tareas Semanales' : 'Weekly Tasks'} 
                          tasks={careProtocol.crew_checklist.weekly_tasks} 
                          color="bg-orange-100 text-orange-700"
                        />
                      )}
                      {careProtocol.crew_checklist.monthly_tasks?.length > 0 && (
                        <TaskList 
                          title={language === 'es' ? 'Tareas Mensuales' : 'Monthly Tasks'} 
                          tasks={careProtocol.crew_checklist.monthly_tasks} 
                          color="bg-yellow-100 text-yellow-700"
                        />
                      )}
                      {careProtocol.crew_checklist.quarterly_tasks?.length > 0 && (
                        <TaskList 
                          title={language === 'es' ? 'Tareas Trimestrales' : 'Quarterly Tasks'} 
                          tasks={careProtocol.crew_checklist.quarterly_tasks} 
                          color="bg-green-100 text-green-700"
                        />
                      )}
                      {careProtocol.crew_checklist.seasonal_tasks?.length > 0 && (
                        <TaskList 
                          title={language === 'es' ? 'Tareas Estacionales' : 'Seasonal Tasks'} 
                          tasks={careProtocol.crew_checklist.seasonal_tasks} 
                          color="bg-blue-100 text-blue-700"
                        />
                      )}
                    </div>
                  </CareSection>
                )}

                {/* Common Issues */}
                {careProtocol.common_issues?.length > 0 && (
                  <CareSection
                    icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                    title={language === 'es' ? 'Problemas Comunes' : 'Common Issues'}
                    hasContent={true}
                  >
                    <div className="space-y-3">
                      {careProtocol.common_issues.map((issue: any, idx: number) => (
                        <Card key={idx} className="bg-amber-50/50 border-amber-200">
                          <CardContent className="p-3">
                            <p className="font-medium text-sm">{issue.issue}</p>
                            {issue.symptoms && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>{language === 'es' ? 'Síntomas:' : 'Symptoms:'}</strong> {issue.symptoms}
                              </p>
                            )}
                            {issue.cause && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>{language === 'es' ? 'Causa:' : 'Cause:'}</strong> {issue.cause}
                              </p>
                            )}
                            {issue.treatment && (
                              <p className="text-xs text-primary mt-1">
                                <strong>{language === 'es' ? 'Tratamiento:' : 'Treatment:'}</strong> {issue.treatment}
                              </p>
                            )}
                            {issue.prevention && (
                              <p className="text-xs text-green-700 mt-1">
                                <strong>{language === 'es' ? 'Prevención:' : 'Prevention:'}</strong> {issue.prevention}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CareSection>
                )}

                {/* DO NOT DO - Critical Warnings */}
                {careProtocol.do_not_do?.length > 0 && (
                  <Card className="border-destructive/50 bg-destructive/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        {language === 'es' ? '⚠️ NO HACER - Advertencias Críticas' : '⚠️ DO NOT DO - Critical Warnings'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {careProtocol.do_not_do.map((warning: any, idx: number) => {
                          const warningText = typeof warning === 'string' ? warning : warning.warning;
                          const consequence = typeof warning === 'object' ? warning.consequence : null;
                          const severity = typeof warning === 'object' ? warning.severity : 'high';
                          
                          return (
                            <div 
                              key={idx} 
                              className={`p-3 rounded-lg ${
                                severity === 'critical' 
                                  ? 'bg-red-100 border border-red-300' 
                                  : severity === 'high' 
                                    ? 'bg-orange-100 border border-orange-200' 
                                    : 'bg-yellow-100 border border-yellow-200'
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="text-lg">⚠️</span>
                                <div>
                                  <p className="text-sm font-medium text-destructive">{warningText}</p>
                                  {consequence && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      <strong>{language === 'es' ? 'Consecuencia:' : 'Consequence:'}</strong> {consequence}
                                    </p>
                                  )}
                                  {severity && (
                                    <Badge 
                                      variant="outline" 
                                      className={`mt-1 text-xs ${
                                        severity === 'critical' 
                                          ? 'border-red-500 text-red-700' 
                                          : severity === 'high' 
                                            ? 'border-orange-500 text-orange-700' 
                                            : 'border-yellow-500 text-yellow-700'
                                      }`}
                                    >
                                      {severity === 'critical' 
                                        ? (language === 'es' ? 'CRÍTICO' : 'CRITICAL')
                                        : severity === 'high' 
                                          ? (language === 'es' ? 'ALTO' : 'HIGH')
                                          : (language === 'es' ? 'MEDIO' : 'MEDIUM')}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Wildlife Interactions */}
                {careProtocol.wildlife_interactions && (
                  <CareSection
                    icon={<TreeDeciduous className="h-4 w-4 text-emerald-500" />}
                    title={language === 'es' ? 'Interacciones Ecológicas' : 'Wildlife Interactions'}
                    hasContent={true}
                  >
                    <div className="space-y-3 text-sm">
                      {careProtocol.wildlife_interactions.attracts && (
                        <InfoRow 
                          label={language === 'es' ? 'Atrae' : 'Attracts'} 
                          value={careProtocol.wildlife_interactions.attracts} 
                        />
                      )}
                      {careProtocol.wildlife_interactions.ecological_value && (
                        <InfoRow 
                          label={language === 'es' ? 'Valor Ecológico' : 'Ecological Value'} 
                          value={careProtocol.wildlife_interactions.ecological_value} 
                        />
                      )}
                    </div>
                  </CareSection>
                )}

                {/* Special Notes */}
                {careProtocol.special_notes && (
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Leaf className="h-4 w-4 text-primary" />
                        {language === 'es' ? 'Notas Especiales para Costa Rica' : 'Special Notes for Costa Rica'}
                      </p>
                      <p className="text-sm text-muted-foreground">{careProtocol.special_notes}</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

// Helper Components
function CareSection({ 
  icon, 
  title, 
  children, 
  defaultOpen = false,
  hasContent = true 
}: { 
  icon: React.ReactNode; 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  hasContent?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  const { language } = useLanguage();
  
  if (!hasContent) {
    return null;
  }
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-2 cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                {icon}
                {title}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            {React.Children.count(children) > 0 ? (
              children
            ) : (
              <p className="text-sm text-muted-foreground italic">
                {language === 'es' ? 'No hay datos disponibles' : 'No data available'}
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function InfoRow({ 
  label, 
  value, 
  highlight = false 
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
}) {
  return (
    <div className={`${highlight ? 'bg-primary/5 p-2 rounded-lg -mx-2' : ''}`}>
      <span className="font-medium text-foreground">{label}:</span>{' '}
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

function WarningRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-amber-50 p-2 rounded-lg -mx-2 border-l-2 border-amber-400">
      <span className="font-medium text-amber-800">{label}:</span>{' '}
      <span className="text-amber-700">{value}</span>
    </div>
  );
}

function TaskList({ 
  title, 
  tasks, 
  color 
}: { 
  title: string; 
  tasks: string[]; 
  color: string;
}) {
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
