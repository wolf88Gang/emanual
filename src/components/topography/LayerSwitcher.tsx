import React from 'react';
import { Layers, Mountain, Droplets, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { MAP_LAYERS, MapLayer } from '@/lib/topographyLayers';

interface LayerSwitcherProps {
  activeLayers: string[];
  onToggleLayer: (layerId: string) => void;
}

export function LayerSwitcher({ activeLayers, onToggleLayer }: LayerSwitcherProps) {
  const { language } = useLanguage();

  const categoryIcons: Record<string, React.ReactNode> = {
    terrain: <Mountain className="h-4 w-4" />,
    hydrology: <Droplets className="h-4 w-4" />,
    risk: <AlertTriangle className="h-4 w-4" />,
  };

  const categoryLabels: Record<string, { en: string; es: string }> = {
    terrain: { en: 'Terrain', es: 'Terreno' },
    hydrology: { en: 'Hydrology', es: 'Hidrografía' },
    risk: { en: 'Risk', es: 'Riesgos' },
  };

  // Group layers by category
  const groupedLayers = MAP_LAYERS.reduce((acc, layer) => {
    if (!acc[layer.category]) acc[layer.category] = [];
    acc[layer.category].push(layer);
    return acc;
  }, {} as Record<string, MapLayer[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4" />
          {language === 'es' ? 'Capas del Mapa' : 'Map Layers'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(groupedLayers).map(([category, layers]) => (
          <div key={category} className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {categoryIcons[category]}
              <span>{categoryLabels[category]?.[language] || category}</span>
            </div>
            <div className="space-y-2 pl-6">
              {layers.map((layer) => (
                <div
                  key={layer.id}
                  className="flex items-center justify-between py-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{layer.icon}</span>
                    <Label
                      htmlFor={`layer-${layer.id}`}
                      className={`text-sm cursor-pointer ${!layer.available ? 'text-muted-foreground' : ''}`}
                    >
                      {language === 'es' ? layer.nameEs : layer.name}
                    </Label>
                    {!layer.available && (
                      <Badge variant="outline" className="text-xs">
                        {language === 'es' ? 'No disponible' : 'Unavailable'}
                      </Badge>
                    )}
                  </div>
                  <Switch
                    id={`layer-${layer.id}`}
                    checked={activeLayers.includes(layer.id)}
                    onCheckedChange={() => onToggleLayer(layer.id)}
                    disabled={!layer.available}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
