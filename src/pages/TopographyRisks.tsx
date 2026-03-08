import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mountain, Download, ChevronLeft, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ModernAppLayout } from '@/components/layout/ModernAppLayout';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEstate } from '@/contexts/EstateContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  KMLUploader,
  LayerSwitcher,
  DataSourcesPanel,
  AnalysisPanel,
  TopographyMap,
  ElevationProfile,
} from '@/components/topography';
import { ParsedGeoJSON } from '@/lib/kmlParser';
import { generateElevationProfile, TopographyAnalysis } from '@/lib/elevationService';
import { jsPDF } from 'jspdf';

interface TopographicReference {
  id: string;
  name: string;
  geometry_geojson: ParsedGeoJSON;
  geometry_type: string;
  source_filename: string | null;
  created_at: string;
  analysis_data: TopographyAnalysis | null;
}

export default function TopographyRisks() {
  const { language } = useLanguage();
  const { currentEstate } = useEstate();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeLayers, setActiveLayers] = useState<string[]>(['contours']);
  const [references, setReferences] = useState<TopographicReference[]>([]);
  const [selectedReference, setSelectedReference] = useState<TopographicReference | null>(null);
  const [importedGeoJSON, setImportedGeoJSON] = useState<ParsedGeoJSON | null>(null);
  const [centerCoords, setCenterCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [analysisResult, setAnalysisResult] = useState<TopographyAnalysis | null>(null);
  const [elevationProfile, setElevationProfile] = useState<{ distance: number; elevation: number }[] | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Fetch existing references
  useEffect(() => {
    if (!currentEstate?.id) return;

    const fetchReferences = async () => {
      const { data, error } = await supabase
        .from('topographic_references')
        .select('*')
        .eq('estate_id', currentEstate.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching references:', error);
        return;
      }

      setReferences(data as unknown as TopographicReference[]);
    };

    fetchReferences();
  }, [currentEstate?.id]);

  // Set initial center from estate
  useEffect(() => {
    if (currentEstate?.lat && currentEstate?.lng) {
      setCenterCoords({ lat: currentEstate.lat, lng: currentEstate.lng });
    }
  }, [currentEstate]);

  const toggleLayer = (layerId: string) => {
    setActiveLayers(prev =>
      prev.includes(layerId)
        ? prev.filter(id => id !== layerId)
        : [...prev, layerId]
    );
  };

  const handleUploadComplete = useCallback((data: ParsedGeoJSON, referenceId: string) => {
    setImportedGeoJSON(data);
    // Refresh references list
    supabase
      .from('topographic_references')
      .select('*')
      .eq('id', referenceId)
      .single()
      .then(({ data: newRef }) => {
        if (newRef) {
          setReferences(prev => [newRef as unknown as TopographicReference, ...prev]);
          setSelectedReference(newRef as unknown as TopographicReference);
        }
      });
  }, []);

  const handleSelectReference = (ref: TopographicReference) => {
    setSelectedReference(ref);
    setImportedGeoJSON(ref.geometry_geojson);
    if (ref.analysis_data) {
      setAnalysisResult(ref.analysis_data);
    }
  };

  const handleTransectDraw = async (coords: [number, number][]) => {
    setProfileLoading(true);
    try {
      const profile = await generateElevationProfile(coords);
      setElevationProfile(profile);
    } catch (error) {
      toast({
        title: language === 'es' ? 'Error al generar perfil' : 'Profile generation failed',
        variant: 'destructive',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePolygonDraw = async (coords: [number, number][]) => {
    // Calculate centroid of polygon for analysis
    const sumLat = coords.reduce((sum, c) => sum + c[0], 0);
    const sumLng = coords.reduce((sum, c) => sum + c[1], 0);
    setCenterCoords({
      lat: sumLat / coords.length,
      lng: sumLng / coords.length,
    });
  };

  const handleAnalysisComplete = async (analysis: TopographyAnalysis) => {
    setAnalysisResult(analysis);
    
    // Save analysis to reference if one is selected
    if (selectedReference) {
      await supabase
        .from('topographic_references')
        .update({ analysis_data: JSON.parse(JSON.stringify(analysis)) })
        .eq('id', selectedReference.id);
    }
  };

  const exportPDF = async () => {
    setExportingPdf(true);
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPos = 20;

      // Title
      pdf.setFontSize(20);
      pdf.text(language === 'es' ? 'Informe Topográfico' : 'Topography Report', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Estate name
      if (currentEstate?.name) {
        pdf.setFontSize(14);
        pdf.text(currentEstate.name, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
      }

      // Date
      pdf.setFontSize(10);
      pdf.text(new Date().toLocaleDateString(), pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Reference info
      if (selectedReference) {
        pdf.setFontSize(12);
        pdf.text(`${language === 'es' ? 'Referencia' : 'Reference'}: ${selectedReference.name}`, 20, yPos);
        yPos += 8;
        pdf.setFontSize(10);
        pdf.text(`${language === 'es' ? 'Tipo' : 'Type'}: ${selectedReference.geometry_type}`, 20, yPos);
        yPos += 15;
      }

      // Analysis results
      if (analysisResult) {
        pdf.setFontSize(14);
        pdf.text(language === 'es' ? 'Análisis de Elevación' : 'Elevation Analysis', 20, yPos);
        yPos += 10;

        pdf.setFontSize(10);
        pdf.text(`${language === 'es' ? 'Radio de análisis' : 'Analysis radius'}: ${analysisResult.bufferRadius}m`, 20, yPos);
        yPos += 6;
        pdf.text(`${language === 'es' ? 'Elevación mínima' : 'Min elevation'}: ${analysisResult.elevation.min}m`, 20, yPos);
        yPos += 6;
        pdf.text(`${language === 'es' ? 'Elevación máxima' : 'Max elevation'}: ${analysisResult.elevation.max}m`, 20, yPos);
        yPos += 6;
        pdf.text(`${language === 'es' ? 'Elevación promedio' : 'Avg elevation'}: ${analysisResult.elevation.avg}m`, 20, yPos);
        yPos += 6;
        pdf.text(`${language === 'es' ? 'Desnivel' : 'Elevation range'}: ${analysisResult.elevation.range}m`, 20, yPos);
        yPos += 10;

        pdf.text(`${language === 'es' ? 'Pendiente promedio' : 'Avg slope'}: ${analysisResult.slope.avgSlope}°`, 20, yPos);
        yPos += 6;
        pdf.text(`${language === 'es' ? 'Pendiente máxima' : 'Max slope'}: ${analysisResult.slope.maxSlope}°`, 20, yPos);
        yPos += 6;
        pdf.text(`${language === 'es' ? 'Áreas empinadas' : 'Steep areas'}: ${analysisResult.slope.steepAreaPercent}%`, 20, yPos);
        yPos += 10;

        const riskLabels: Record<string, string> = {
          none: language === 'es' ? 'Ninguno' : 'None',
          low: language === 'es' ? 'Bajo' : 'Low',
          medium: language === 'es' ? 'Medio' : 'Medium',
          high: language === 'es' ? 'Alto' : 'High',
          unknown: language === 'es' ? 'Desconocido' : 'Unknown',
        };
        pdf.text(`${language === 'es' ? 'Riesgo de inundación' : 'Flood risk'}: ${riskLabels[analysisResult.floodRiskLevel]}`, 20, yPos);
        yPos += 15;
      }

      // Sources & Limitations
      pdf.setFontSize(12);
      pdf.text(language === 'es' ? 'Fuentes de Datos y Limitaciones' : 'Data Sources & Limitations', 20, yPos);
      yPos += 8;

      pdf.setFontSize(8);
      const sources = [
        'OpenTopoMap - Curvas de nivel (~30m)',
        'Esri World Hillshade - Sombreado (~10-30m)',
        'Open-Elevation API / Open-Meteo - Datos de elevación (~30m)',
      ];
      sources.forEach(source => {
        pdf.text(`• ${source}`, 25, yPos);
        yPos += 5;
      });

      yPos += 5;
      pdf.setFontSize(7);
      pdf.text(
        language === 'es' 
          ? 'Nota: Los datos de elevación tienen resolución de 30m y pueden no capturar micro-topografía.'
          : 'Note: Elevation data has 30m resolution and may not capture micro-topography.',
        20, yPos
      );

      // Save
      const filename = `topography-${currentEstate?.name || 'report'}-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(filename);

      toast({
        title: language === 'es' ? 'PDF exportado' : 'PDF exported',
      });
    } catch (error) {
      toast({
        title: language === 'es' ? 'Error al exportar' : 'Export failed',
        variant: 'destructive',
      });
    } finally {
      setExportingPdf(false);
    }
  };

  if (!currentEstate) {
    return (
      <ModernAppLayout>
        <NoEstateGuide />
      </ModernAppLayout>
    );
  }

  const mapCenter: [number, number] = centerCoords 
    ? [centerCoords.lat, centerCoords.lng] 
    : [currentEstate.lat || 9.93, currentEstate.lng || -84.19];

  return (
    <ModernAppLayout>
      <div className="space-y-4 p-4 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/estates')}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Mountain className="h-6 w-6" />
                {language === 'es' ? 'Topografía y Riesgos' : 'Topography & Risks'}
              </h1>
              <p className="text-muted-foreground text-sm">{currentEstate.name}</p>
            </div>
          </div>
          <Button onClick={exportPDF} disabled={exportingPdf}>
            {exportingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            {language === 'es' ? 'Exportar PDF' : 'Export PDF'}
          </Button>
        </div>

        {/* Main content */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Left panel - Controls */}
          <div className="lg:col-span-1 space-y-4">
            <Tabs defaultValue="import" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="import">
                  {language === 'es' ? 'Importar' : 'Import'}
                </TabsTrigger>
                <TabsTrigger value="layers">
                  {language === 'es' ? 'Capas' : 'Layers'}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="import" className="space-y-4">
                <KMLUploader
                  estateId={currentEstate.id}
                  onUploadComplete={handleUploadComplete}
                />

                {/* Existing references */}
                {references.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {language === 'es' ? 'Referencias Guardadas' : 'Saved References'}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-40">
                        <div className="space-y-2">
                          {references.map(ref => (
                            <button
                              key={ref.id}
                              onClick={() => handleSelectReference(ref)}
                              className={`w-full text-left p-2 rounded-md border transition-colors ${
                                selectedReference?.id === ref.id
                                  ? 'border-primary bg-primary/5'
                                  : 'border-transparent hover:bg-muted'
                              }`}
                            >
                              <p className="font-medium text-sm">{ref.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {ref.geometry_type} • {new Date(ref.created_at).toLocaleDateString()}
                              </p>
                            </button>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="layers">
                <LayerSwitcher
                  activeLayers={activeLayers}
                  onToggleLayer={toggleLayer}
                />
              </TabsContent>
            </Tabs>

            {/* Analysis Panel */}
            <AnalysisPanel
              centerLat={centerCoords?.lat ?? null}
              centerLng={centerCoords?.lng ?? null}
              onAnalysisComplete={handleAnalysisComplete}
            />

            {/* Data Sources */}
            <DataSourcesPanel />
          </div>

          {/* Right panel - Map and Profile */}
          <div className="lg:col-span-2 space-y-4">
            <div className="h-[500px]">
              <TopographyMap
                center={mapCenter}
                activeLayers={activeLayers}
                importedGeoJSON={importedGeoJSON}
                onCenterChange={(lat, lng) => setCenterCoords({ lat, lng })}
                onTransectDraw={handleTransectDraw}
                onPolygonDraw={handlePolygonDraw}
              />
            </div>

            <ElevationProfile data={elevationProfile} loading={profileLoading} />
          </div>
        </div>
      </div>
    </ModernAppLayout>
  );
}
