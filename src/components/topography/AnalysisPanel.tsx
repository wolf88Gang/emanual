import React, { useState, useEffect } from 'react';
import { BarChart3, Mountain, TrendingUp, Droplets, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { analyzeTopography, TopographyAnalysis } from '@/lib/elevationService';

interface AnalysisPanelProps {
  centerLat: number | null;
  centerLng: number | null;
  onAnalysisComplete?: (analysis: TopographyAnalysis) => void;
}

export function AnalysisPanel({ centerLat, centerLng, onAnalysisComplete }: AnalysisPanelProps) {
  const { language } = useLanguage();
  const [bufferRadius, setBufferRadius] = useState('500');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<TopographyAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    if (centerLat === null || centerLng === null) {
      setError(language === 'es' 
        ? 'Selecciona una ubicación primero' 
        : 'Select a location first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await analyzeTopography(centerLat, centerLng, parseInt(bufferRadius));
      setAnalysis(result);
      onAnalysisComplete?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run analysis when location changes
  useEffect(() => {
    if (centerLat !== null && centerLng !== null && !analysis) {
      runAnalysis();
    }
  }, [centerLat, centerLng]);

  const floodRiskColors: Record<string, string> = {
    none: 'bg-green-500',
    low: 'bg-blue-500',
    medium: 'bg-amber-500',
    high: 'bg-red-500',
    unknown: 'bg-gray-500',
  };

  const floodRiskLabels: Record<string, { en: string; es: string }> = {
    none: { en: 'None', es: 'Ninguno' },
    low: { en: 'Low', es: 'Bajo' },
    medium: { en: 'Medium', es: 'Medio' },
    high: { en: 'High', es: 'Alto' },
    unknown: { en: 'Unknown', es: 'Desconocido' },
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          {language === 'es' ? 'Análisis Topográfico' : 'Topographic Analysis'}
        </CardTitle>
        <CardDescription>
          {centerLat && centerLng 
            ? `${centerLat.toFixed(5)}, ${centerLng.toFixed(5)}`
            : language === 'es' ? 'Sin ubicación seleccionada' : 'No location selected'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Buffer radius selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {language === 'es' ? 'Radio de análisis:' : 'Analysis radius:'}
          </span>
          <Select value={bufferRadius} onValueChange={setBufferRadius}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="250">250m</SelectItem>
              <SelectItem value="500">500m</SelectItem>
              <SelectItem value="1000">1km</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={runAnalysis}
            disabled={loading || centerLat === null}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {analysis && !loading && (
          <div className="space-y-4">
            {/* Elevation Stats */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Mountain className="h-4 w-4" />
                {language === 'es' ? 'Elevación' : 'Elevation'}
                <Badge variant="outline" className="ml-auto">
                  {analysis.elevation.samples} {language === 'es' ? 'muestras' : 'samples'}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-bold">{analysis.elevation.min}m</div>
                  <div className="text-xs text-muted-foreground">Min</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-primary">{analysis.elevation.avg}m</div>
                  <div className="text-xs text-muted-foreground">
                    {language === 'es' ? 'Promedio' : 'Average'}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold">{analysis.elevation.max}m</div>
                  <div className="text-xs text-muted-foreground">Max</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {language === 'es' ? 'Rango' : 'Range'}: {analysis.elevation.range}m
              </div>
            </div>

            {/* Slope Stats */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                {language === 'es' ? 'Pendiente' : 'Slope'}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-lg font-bold">{analysis.slope.avgSlope}°</div>
                  <div className="text-xs text-muted-foreground">
                    {language === 'es' ? 'Promedio' : 'Average'}
                  </div>
                </div>
                <div>
                  <div className="text-lg font-bold">{analysis.slope.maxSlope}°</div>
                  <div className="text-xs text-muted-foreground">
                    {language === 'es' ? 'Máxima' : 'Maximum'}
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>{language === 'es' ? 'Zonas empinadas (>15°)' : 'Steep areas (>15°)'}</span>
                  <span>{analysis.slope.steepAreaPercent}%</span>
                </div>
                <Progress value={analysis.slope.steepAreaPercent} className="h-2" />
              </div>
            </div>

            {/* Flood Risk */}
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Droplets className="h-4 w-4" />
                {language === 'es' ? 'Riesgo de Inundación' : 'Flood Risk'}
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${floodRiskColors[analysis.floodRiskLevel]}`} />
                <span className="font-medium">
                  {floodRiskLabels[analysis.floodRiskLevel]?.[language] || analysis.floodRiskLevel}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {language === 'es' 
                  ? 'Estimación basada en elevación y pendiente. Consultar datos oficiales para confirmación.'
                  : 'Estimate based on elevation and slope. Consult official data for confirmation.'}
              </p>
            </div>

            {/* Water proximity */}
            {analysis.nearestWaterDistance !== null && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  <span>
                    {language === 'es' ? 'Distancia a agua más cercana' : 'Distance to nearest water'}:
                  </span>
                  <span className="font-bold">{analysis.nearestWaterDistance} km</span>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
