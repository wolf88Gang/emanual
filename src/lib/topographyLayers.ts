// Topography layer definitions and data sources

export interface LayerSource {
  id: string;
  name: string;
  nameEs: string;
  description: string;
  descriptionEs: string;
  url: string;
  resolution: string;
  limitations: string;
  limitationsEs: string;
  attribution: string;
}

export interface MapLayer {
  id: string;
  name: string;
  nameEs: string;
  icon: string;
  category: 'terrain' | 'hydrology' | 'risk';
  tileUrl: string;
  attribution: string;
  opacity: number;
  available: boolean;
  source?: LayerSource;
  fallbackUrl?: string;
}

// Data sources information
export const DATA_SOURCES: LayerSource[] = [
  {
    id: 'opentopomap',
    name: 'OpenTopoMap',
    nameEs: 'OpenTopoMap',
    description: 'Topographic map with contour lines derived from SRTM and viewshed shading',
    descriptionEs: 'Mapa topográfico con curvas de nivel derivadas de SRTM y sombreado',
    url: 'https://opentopomap.org/',
    resolution: '~30m (SRTM)',
    limitations: 'Lower resolution in areas without SRTM coverage. May not show micro-topography.',
    limitationsEs: 'Menor resolución en áreas sin cobertura SRTM. Puede no mostrar micro-topografía.',
    attribution: '© OpenTopoMap (CC-BY-SA)',
  },
  {
    id: 'esri-hillshade',
    name: 'Esri World Hillshade',
    nameEs: 'Sombreado Esri',
    description: 'Multi-directional hillshade from Esri, based on multiple DEM sources',
    descriptionEs: 'Sombreado multidireccional de Esri, basado en múltiples fuentes DEM',
    url: 'https://www.arcgis.com/home/item.html?id=1b243539f4514b6ba35e7d995890db1d',
    resolution: '~10-30m varies by location',
    limitations: 'Best for visualization, not for precise elevation analysis.',
    limitationsEs: 'Mejor para visualización, no para análisis preciso de elevación.',
    attribution: '© Esri',
  },
  {
    id: 'copernicus-dem',
    name: 'Copernicus DEM GLO-30',
    nameEs: 'Copernicus DEM GLO-30',
    description: 'Global 30m Digital Elevation Model from ESA Copernicus programme',
    descriptionEs: 'Modelo Digital de Elevación global de 30m del programa Copernicus de ESA',
    url: 'https://spacedata.copernicus.eu/collections/copernicus-digital-elevation-model',
    resolution: '30m',
    limitations: 'Vertical accuracy ±4m. May include vegetation/building heights in some areas.',
    limitationsEs: 'Precisión vertical ±4m. Puede incluir alturas de vegetación/edificios en algunas áreas.',
    attribution: '© ESA Copernicus',
  },
  {
    id: 'osm-waterways',
    name: 'OpenStreetMap Waterways',
    nameEs: 'Ríos OpenStreetMap',
    description: 'Rivers, streams, and water bodies from OpenStreetMap contributors',
    descriptionEs: 'Ríos, quebradas y cuerpos de agua de contribuidores de OpenStreetMap',
    url: 'https://www.openstreetmap.org/',
    resolution: 'Vector data',
    limitations: 'Completeness varies by region. Volunteer-contributed data.',
    limitationsEs: 'Completitud varía por región. Datos aportados por voluntarios.',
    attribution: '© OpenStreetMap contributors',
  },
  {
    id: 'cne-costa-rica',
    name: 'CNE Costa Rica Flood Zones',
    nameEs: 'Zonas de Inundación CNE',
    description: 'Official flood risk zones from Costa Rica National Emergency Commission',
    descriptionEs: 'Zonas oficiales de riesgo de inundación de la Comisión Nacional de Emergencias',
    url: 'https://www.cne.go.cr/',
    resolution: 'Variable',
    limitations: 'Only available for Costa Rica. May not be current.',
    limitationsEs: 'Solo disponible para Costa Rica. Puede no estar actualizado.',
    attribution: '© CNE Costa Rica',
  },
  {
    id: 'gfdrr-flood',
    name: 'GFDRR Global Flood Hazard',
    nameEs: 'Riesgo de Inundación Global GFDRR',
    description: 'Global river flood hazard maps from World Bank GFDRR',
    descriptionEs: 'Mapas globales de amenaza de inundación fluvial del Banco Mundial GFDRR',
    url: 'https://www.gfdrr.org/en/aqueduct-floods',
    resolution: '~1km',
    limitations: 'Coarse resolution. Shows general flood-prone areas, not precise boundaries.',
    limitationsEs: 'Resolución gruesa. Muestra áreas propensas a inundación en general, no límites precisos.',
    attribution: '© World Bank / GFDRR',
  },
];

// Available map layers
export const MAP_LAYERS: MapLayer[] = [
  {
    id: 'contours',
    name: 'Contour Lines',
    nameEs: 'Curvas de Nivel',
    icon: '〰️',
    category: 'terrain',
    tileUrl: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
    opacity: 1,
    available: true,
    source: DATA_SOURCES.find(s => s.id === 'opentopomap'),
  },
  {
    id: 'hillshade',
    name: 'Hillshade',
    nameEs: 'Sombreado',
    icon: '🌄',
    category: 'terrain',
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    opacity: 0.6,
    available: true,
    source: DATA_SOURCES.find(s => s.id === 'esri-hillshade'),
  },
  {
    id: 'elevation',
    name: 'Elevation Colormap',
    nameEs: 'Colormap de Elevación',
    icon: '📊',
    category: 'terrain',
    // Using a terrain-aware tile layer
    tileUrl: 'https://tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenTopoMap',
    opacity: 0.7,
    available: true,
    source: DATA_SOURCES.find(s => s.id === 'opentopomap'),
  },
  {
    id: 'slope',
    name: 'Slope',
    nameEs: 'Pendiente',
    icon: '📐',
    category: 'terrain',
    // Slope visualization would require DEM processing - using hillshade as visual proxy
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    opacity: 0.5,
    available: true,
    source: DATA_SOURCES.find(s => s.id === 'esri-hillshade'),
  },
  {
    id: 'aspect',
    name: 'Aspect (Orientation)',
    nameEs: 'Orientación',
    icon: '🧭',
    category: 'terrain',
    // Aspect would require DEM processing
    tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/Elevation/World_Hillshade/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri',
    opacity: 0.5,
    available: true,
    source: DATA_SOURCES.find(s => s.id === 'esri-hillshade'),
  },
  {
    id: 'waterways',
    name: 'Rivers & Streams',
    nameEs: 'Ríos y Quebradas',
    icon: '🌊',
    category: 'hydrology',
    // This would be an overlay, using a water-focused style
    tileUrl: 'https://tile.waymarkedtrails.org/water/{z}/{x}/{y}.png',
    fallbackUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap',
    opacity: 0.7,
    available: true,
    source: DATA_SOURCES.find(s => s.id === 'osm-waterways'),
  },
  {
    id: 'flood-risk',
    name: 'Flood Risk Zones',
    nameEs: 'Zonas de Riesgo de Inundación',
    icon: '⚠️',
    category: 'risk',
    // Global flood hazard layer placeholder
    tileUrl: '',
    attribution: '© GFDRR / World Bank',
    opacity: 0.5,
    available: false, // Would need API integration
    source: DATA_SOURCES.find(s => s.id === 'gfdrr-flood'),
  },
];

// Get layer by ID
export function getLayerById(id: string): MapLayer | undefined {
  return MAP_LAYERS.find(l => l.id === id);
}

// Get layers by category
export function getLayersByCategory(category: 'terrain' | 'hydrology' | 'risk'): MapLayer[] {
  return MAP_LAYERS.filter(l => l.category === category);
}

// Get all available sources for citation
export function getAllSources(): LayerSource[] {
  return DATA_SOURCES;
}
