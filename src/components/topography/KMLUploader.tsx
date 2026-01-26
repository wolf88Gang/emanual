import React, { useRef, useState } from 'react';
import { Upload, FileText, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
import { parseKMLFile, ParseResult, ParsedGeoJSON } from '@/lib/kmlParser';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KMLUploaderProps {
  estateId: string;
  onUploadComplete: (data: ParsedGeoJSON, referenceId: string) => void;
}

export function KMLUploader({ estateId, onUploadComplete }: KMLUploaderProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [referenceName, setReferenceName] = useState('');

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setParseResult(null);

    try {
      const result = await parseKMLFile(file);
      setParseResult(result);
      
      if (result.success && result.data) {
        setReferenceName(file.name.replace(/\.(kml|kmz)$/i, ''));
      }
    } catch (error) {
      setParseResult({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse file',
        filename: file.name,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!parseResult?.data || !referenceName.trim()) return;

    setUploading(true);
    try {
      const features = parseResult.data.features;
      const primaryGeometry = features[0]?.geometry;

      const { data, error } = await supabase
        .from('topographic_references')
        .insert([{
          estate_id: estateId,
          name: referenceName.trim(),
          geometry_geojson: JSON.parse(JSON.stringify(parseResult.data)),
          geometry_type: primaryGeometry?.type || 'Unknown',
          source_filename: parseResult.filename,
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: language === 'es' ? 'Referencia guardada' : 'Reference saved',
        description: language === 'es' 
          ? `${features.length} geometría(s) importada(s)` 
          : `${features.length} geometry(ies) imported`,
      });

      onUploadComplete(parseResult.data, data.id);
      setParseResult(null);
      setReferenceName('');
    } catch (error) {
      toast({
        title: language === 'es' ? 'Error al guardar' : 'Save failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {language === 'es' ? 'Importar KML/KMZ' : 'Import KML/KMZ'}
        </CardTitle>
        <CardDescription>
          {language === 'es' 
            ? 'Sube un archivo de Google Earth para visualizar la topografía' 
            : 'Upload a Google Earth file to visualize topography'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".kml,.kmz"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!parseResult && (
          <Button
            variant="outline"
            className="w-full h-24 border-dashed"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {language === 'es' ? 'Seleccionar archivo .kml o .kmz' : 'Select .kml or .kmz file'}
                </span>
              </div>
            )}
          </Button>
        )}

        {parseResult && (
          <div className="space-y-4">
            <div className={`p-4 rounded-lg flex items-start gap-3 ${
              parseResult.success 
                ? 'bg-primary/10 border border-primary/20' 
                : 'bg-destructive/10 border border-destructive/20'
            }`}>
              {parseResult.success ? (
                <Check className="h-5 w-5 text-primary mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-medium">{parseResult.filename}</p>
                {parseResult.success && parseResult.data && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {language === 'es' 
                      ? `${parseResult.data.features.length} geometría(s) encontrada(s)` 
                      : `${parseResult.data.features.length} geometry(ies) found`}
                  </p>
                )}
                {parseResult.error && (
                  <p className="text-sm text-destructive mt-1">{parseResult.error}</p>
                )}
              </div>
            </div>

            {parseResult.success && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ref-name">
                    {language === 'es' ? 'Nombre de referencia' : 'Reference name'}
                  </Label>
                  <Input
                    id="ref-name"
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: Límite de propiedad' : 'E.g., Property boundary'}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setParseResult(null);
                      setReferenceName('');
                    }}
                    className="flex-1"
                  >
                    {language === 'es' ? 'Cancelar' : 'Cancel'}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={!referenceName.trim() || uploading}
                    className="flex-1"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {language === 'es' ? 'Guardar' : 'Save'}
                  </Button>
                </div>
              </>
            )}

            {!parseResult.success && (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                {language === 'es' ? 'Intentar con otro archivo' : 'Try another file'}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
