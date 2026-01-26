// KML/KMZ Parser - Converts Google Earth files to GeoJSON
import JSZip from 'jszip';

export interface ParsedFeature {
  type: 'Feature';
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon' | 'MultiLineString';
    coordinates: unknown; // GeoJSON coordinates vary by geometry type
  };
  properties: {
    name?: string;
    description?: string;
    styleUrl?: string;
    [key: string]: unknown;
  };
}

export interface ParsedGeoJSON {
  type: 'FeatureCollection';
  features: ParsedFeature[];
}

export interface ParseResult {
  success: boolean;
  data?: ParsedGeoJSON;
  error?: string;
  filename: string;
}

// Parse coordinate string from KML to array of numbers
function parseCoordinates(coordString: string): number[][] {
  return coordString
    .trim()
    .split(/\s+/)
    .filter(c => c.length > 0)
    .map(coord => {
      const parts = coord.split(',').map(Number);
      // KML format is lng,lat,alt - we only need lng,lat for 2D
      return [parts[0], parts[1]];
    })
    .filter(c => !isNaN(c[0]) && !isNaN(c[1]));
}

// Extract text content from XML element
function getTextContent(element: Element, tagName: string): string | undefined {
  const el = element.getElementsByTagName(tagName)[0];
  return el?.textContent?.trim() || undefined;
}

// Parse a single Placemark element
function parsePlacemark(placemark: Element): ParsedFeature | null {
  const name = getTextContent(placemark, 'name');
  const description = getTextContent(placemark, 'description');
  const styleUrl = getTextContent(placemark, 'styleUrl');

  // Try to find geometry
  const point = placemark.getElementsByTagName('Point')[0];
  const lineString = placemark.getElementsByTagName('LineString')[0];
  const polygon = placemark.getElementsByTagName('Polygon')[0];
  const multiGeometry = placemark.getElementsByTagName('MultiGeometry')[0];

  let geometry: ParsedFeature['geometry'] | null = null;

  if (point) {
    const coordsText = getTextContent(point, 'coordinates');
    if (coordsText) {
      const coords = parseCoordinates(coordsText);
      if (coords.length > 0) {
        geometry = {
          type: 'Point',
          coordinates: coords[0],
        };
      }
    }
  } else if (lineString) {
    const coordsText = getTextContent(lineString, 'coordinates');
    if (coordsText) {
      const coords = parseCoordinates(coordsText);
      if (coords.length >= 2) {
        geometry = {
          type: 'LineString',
          coordinates: coords,
        };
      }
    }
  } else if (polygon) {
    const outerBoundary = polygon.getElementsByTagName('outerBoundaryIs')[0];
    if (outerBoundary) {
      const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
      if (linearRing) {
        const coordsText = getTextContent(linearRing, 'coordinates');
        if (coordsText) {
          const coords = parseCoordinates(coordsText);
          if (coords.length >= 4) {
            geometry = {
              type: 'Polygon',
              coordinates: [coords],
            };
          }
        }
      }
    }
  } else if (multiGeometry) {
    // Handle MultiGeometry - collect all sub-geometries
    const polygons = multiGeometry.getElementsByTagName('Polygon');
    const lineStrings = multiGeometry.getElementsByTagName('LineString');
    
    if (polygons.length > 0) {
      const polygonCoords: number[][][] = [];
      for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        const outerBoundary = poly.getElementsByTagName('outerBoundaryIs')[0];
        if (outerBoundary) {
          const linearRing = outerBoundary.getElementsByTagName('LinearRing')[0];
          if (linearRing) {
            const coordsText = getTextContent(linearRing, 'coordinates');
            if (coordsText) {
              const coords = parseCoordinates(coordsText);
              if (coords.length >= 4) {
                polygonCoords.push(coords);
              }
            }
          }
        }
      }
      if (polygonCoords.length > 0) {
        geometry = {
          type: 'MultiPolygon',
          coordinates: polygonCoords.map(c => [c]),
        };
      }
    } else if (lineStrings.length > 0) {
      const lineCoords: number[][] = [];
      for (let i = 0; i < lineStrings.length; i++) {
        const line = lineStrings[i];
        const coordsText = getTextContent(line, 'coordinates');
        if (coordsText) {
          const coords = parseCoordinates(coordsText);
          if (coords.length >= 2) {
            lineCoords.push(...coords);
          }
        }
      }
      if (lineCoords.length >= 2) {
        geometry = {
          type: 'MultiLineString',
          coordinates: [lineCoords],
        };
      }
    }
  }

  if (!geometry) return null;

  return {
    type: 'Feature',
    geometry,
    properties: {
      name,
      description,
      styleUrl,
    },
  };
}

// Parse KML XML string to GeoJSON
function parseKMLString(kmlString: string): ParsedGeoJSON {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, 'text/xml');

  // Check for parse errors
  const parseError = doc.getElementsByTagName('parsererror')[0];
  if (parseError) {
    throw new Error('Invalid KML format: ' + parseError.textContent);
  }

  const placemarks = doc.getElementsByTagName('Placemark');
  const features: ParsedFeature[] = [];

  for (let i = 0; i < placemarks.length; i++) {
    const feature = parsePlacemark(placemarks[i]);
    if (feature) {
      features.push(feature);
    }
  }

  return {
    type: 'FeatureCollection',
    features,
  };
}

// Main parser function - handles both KML and KMZ
export async function parseKMLFile(file: File): Promise<ParseResult> {
  try {
    const filename = file.name.toLowerCase();

    if (filename.endsWith('.kmz')) {
      // KMZ is a ZIP file containing KML
      const zip = await JSZip.loadAsync(file);
      
      // Find the main KML file (usually doc.kml or the first .kml file)
      let kmlContent: string | null = null;
      
      for (const [name, zipEntry] of Object.entries(zip.files)) {
        if (name.toLowerCase().endsWith('.kml') && !zipEntry.dir) {
          kmlContent = await zipEntry.async('string');
          break;
        }
      }

      if (!kmlContent) {
        return {
          success: false,
          error: 'No KML file found inside KMZ archive',
          filename: file.name,
        };
      }

      const geojson = parseKMLString(kmlContent);
      return {
        success: true,
        data: geojson,
        filename: file.name,
      };
    } else if (filename.endsWith('.kml')) {
      const kmlContent = await file.text();
      const geojson = parseKMLString(kmlContent);
      return {
        success: true,
        data: geojson,
        filename: file.name,
      };
    } else {
      return {
        success: false,
        error: 'Unsupported file format. Please upload a .kml or .kmz file.',
        filename: file.name,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to parse file',
      filename: file.name,
    };
  }
}

// Calculate bounding box for a GeoJSON
export function getBoundingBox(geojson: ParsedGeoJSON): [[number, number], [number, number]] | null {
  let minLng = Infinity;
  let maxLng = -Infinity;
  let minLat = Infinity;
  let maxLat = -Infinity;

  function processCoords(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    
    if (typeof coords[0] === 'number') {
      // Single coordinate [lng, lat]
      const [lng, lat] = coords as number[];
      if (typeof lng === 'number' && typeof lat === 'number') {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      }
    } else {
      // Array of coordinates
      (coords as unknown[]).forEach(c => processCoords(c));
    }
  }

  geojson.features.forEach(feature => {
    processCoords(feature.geometry.coordinates as unknown);
  });

  if (minLng === Infinity) return null;

  return [[minLat, minLng], [maxLat, maxLng]];
}

// Calculate centroid of a GeoJSON
export function getCentroid(geojson: ParsedGeoJSON): [number, number] | null {
  const bbox = getBoundingBox(geojson);
  if (!bbox) return null;

  return [
    (bbox[0][0] + bbox[1][0]) / 2, // lat
    (bbox[0][1] + bbox[1][1]) / 2, // lng
  ];
}
