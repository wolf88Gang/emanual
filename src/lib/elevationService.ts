// Elevation data service using Open-Elevation API (free, no API key required)
// Fallback to Open-Meteo elevation API

export interface ElevationPoint {
  lat: number;
  lng: number;
  elevation: number | null;
}

export interface ElevationStats {
  min: number;
  max: number;
  avg: number;
  range: number;
  samples: number;
}

export interface SlopeStats {
  avgSlope: number;
  maxSlope: number;
  steepAreaPercent: number; // % of area above threshold
}

export interface TopographyAnalysis {
  elevation: ElevationStats;
  slope: SlopeStats;
  nearestWaterDistance: number | null; // km
  floodRiskLevel: 'none' | 'low' | 'medium' | 'high' | 'unknown';
  bufferRadius: number; // meters
}

// Open-Elevation API (free, self-hosted option available)
const OPEN_ELEVATION_URL = 'https://api.open-elevation.com/api/v1/lookup';

// Open-Meteo API (free, no key needed)
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/elevation';

// Fetch elevation for a single point using Open-Meteo
async function getElevationOpenMeteo(lat: number, lng: number): Promise<number | null> {
  try {
    const response = await fetch(
      `${OPEN_METEO_URL}?latitude=${lat}&longitude=${lng}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.elevation?.[0] ?? null;
  } catch {
    return null;
  }
}

// Fetch elevations for multiple points using Open-Elevation
async function getElevationsOpenElevation(points: { lat: number; lng: number }[]): Promise<ElevationPoint[]> {
  try {
    const response = await fetch(OPEN_ELEVATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: points.map(p => ({ latitude: p.lat, longitude: p.lng })),
      }),
    });

    if (!response.ok) {
      throw new Error('Open-Elevation API failed');
    }

    const data = await response.json();
    return data.results.map((r: { latitude: number; longitude: number; elevation: number }) => ({
      lat: r.latitude,
      lng: r.longitude,
      elevation: r.elevation,
    }));
  } catch {
    // Fallback to Open-Meteo (one by one, slower)
    const results: ElevationPoint[] = [];
    for (const point of points.slice(0, 10)) { // Limit to avoid rate limits
      const elev = await getElevationOpenMeteo(point.lat, point.lng);
      results.push({ ...point, elevation: elev });
    }
    return results;
  }
}

// Generate sample points within a bounding box
function generateSamplePoints(
  centerLat: number,
  centerLng: number,
  radiusMeters: number,
  numSamples: number = 9
): { lat: number; lng: number }[] {
  const points: { lat: number; lng: number }[] = [];
  
  // Convert radius to degrees (approximate)
  const latDelta = radiusMeters / 111320; // 1 degree lat ≈ 111.32 km
  const lngDelta = radiusMeters / (111320 * Math.cos(centerLat * Math.PI / 180));

  // Generate grid of points
  const gridSize = Math.ceil(Math.sqrt(numSamples));
  const step = 2 / (gridSize - 1);

  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j < gridSize; j++) {
      const lat = centerLat + latDelta * (-1 + i * step);
      const lng = centerLng + lngDelta * (-1 + j * step);
      points.push({ lat, lng });
      if (points.length >= numSamples) break;
    }
    if (points.length >= numSamples) break;
  }

  return points;
}

// Calculate slope between two elevation points
function calculateSlope(
  elev1: number,
  elev2: number,
  distanceMeters: number
): number {
  if (distanceMeters === 0) return 0;
  const rise = Math.abs(elev2 - elev1);
  return Math.atan(rise / distanceMeters) * (180 / Math.PI); // degrees
}

// Main analysis function
export async function analyzeTopography(
  centerLat: number,
  centerLng: number,
  bufferRadiusMeters: number = 500
): Promise<TopographyAnalysis> {
  // Generate sample points
  const samplePoints = generateSamplePoints(centerLat, centerLng, bufferRadiusMeters, 16);
  
  // Get elevations
  const elevations = await getElevationsOpenElevation(samplePoints);
  const validElevations = elevations.filter(e => e.elevation !== null);

  if (validElevations.length === 0) {
    return {
      elevation: { min: 0, max: 0, avg: 0, range: 0, samples: 0 },
      slope: { avgSlope: 0, maxSlope: 0, steepAreaPercent: 0 },
      nearestWaterDistance: null,
      floodRiskLevel: 'unknown',
      bufferRadius: bufferRadiusMeters,
    };
  }

  // Calculate elevation stats
  const elevValues = validElevations.map(e => e.elevation!);
  const minElev = Math.min(...elevValues);
  const maxElev = Math.max(...elevValues);
  const avgElev = elevValues.reduce((a, b) => a + b, 0) / elevValues.length;

  // Calculate slope stats
  const slopes: number[] = [];
  const distanceBetweenPoints = (bufferRadiusMeters * 2) / Math.sqrt(validElevations.length);
  
  for (let i = 0; i < validElevations.length - 1; i++) {
    const slope = calculateSlope(
      validElevations[i].elevation!,
      validElevations[i + 1].elevation!,
      distanceBetweenPoints
    );
    slopes.push(slope);
  }

  const avgSlope = slopes.length > 0 
    ? slopes.reduce((a, b) => a + b, 0) / slopes.length 
    : 0;
  const maxSlope = slopes.length > 0 ? Math.max(...slopes) : 0;
  const steepThreshold = 15; // degrees
  const steepCount = slopes.filter(s => s > steepThreshold).length;
  const steepAreaPercent = slopes.length > 0 
    ? (steepCount / slopes.length) * 100 
    : 0;

  // Determine flood risk based on elevation and slope (simplified heuristic)
  let floodRiskLevel: TopographyAnalysis['floodRiskLevel'] = 'unknown';
  if (avgElev < 10 && avgSlope < 5) {
    floodRiskLevel = 'high';
  } else if (avgElev < 50 && avgSlope < 10) {
    floodRiskLevel = 'medium';
  } else if (avgElev < 100) {
    floodRiskLevel = 'low';
  } else {
    floodRiskLevel = 'none';
  }

  return {
    elevation: {
      min: Math.round(minElev),
      max: Math.round(maxElev),
      avg: Math.round(avgElev),
      range: Math.round(maxElev - minElev),
      samples: validElevations.length,
    },
    slope: {
      avgSlope: Math.round(avgSlope * 10) / 10,
      maxSlope: Math.round(maxSlope * 10) / 10,
      steepAreaPercent: Math.round(steepAreaPercent),
    },
    nearestWaterDistance: null, // Would require OSM query
    floodRiskLevel,
    bufferRadius: bufferRadiusMeters,
  };
}

// Generate elevation profile along a line
export async function generateElevationProfile(
  lineCoords: [number, number][], // Array of [lat, lng]
  numSamples: number = 20
): Promise<{ distance: number; elevation: number }[]> {
  if (lineCoords.length < 2) return [];

  // Calculate total line length
  function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in meters
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // Interpolate points along line
  const samplePoints: { lat: number; lng: number; distance: number }[] = [];
  let totalDistance = 0;

  for (let i = 0; i < lineCoords.length - 1; i++) {
    const segmentDist = haversineDistance(
      lineCoords[i][0], lineCoords[i][1],
      lineCoords[i + 1][0], lineCoords[i + 1][1]
    );
    totalDistance += segmentDist;
  }

  const stepDistance = totalDistance / (numSamples - 1);
  let accumulatedDistance = 0;
  let currentSegment = 0;
  let segmentProgress = 0;

  for (let i = 0; i < numSamples; i++) {
    const targetDistance = i * stepDistance;
    
    // Find the segment containing this distance
    while (currentSegment < lineCoords.length - 1) {
      const segmentDist = haversineDistance(
        lineCoords[currentSegment][0], lineCoords[currentSegment][1],
        lineCoords[currentSegment + 1][0], lineCoords[currentSegment + 1][1]
      );
      
      if (accumulatedDistance + segmentDist >= targetDistance) {
        segmentProgress = (targetDistance - accumulatedDistance) / segmentDist;
        break;
      }
      accumulatedDistance += segmentDist;
      currentSegment++;
    }

    // Interpolate position
    const lat = lineCoords[currentSegment][0] + 
      segmentProgress * (lineCoords[currentSegment + 1]?.[0] ?? lineCoords[currentSegment][0] - lineCoords[currentSegment][0]);
    const lng = lineCoords[currentSegment][1] + 
      segmentProgress * (lineCoords[currentSegment + 1]?.[1] ?? lineCoords[currentSegment][1] - lineCoords[currentSegment][1]);

    samplePoints.push({ lat, lng, distance: targetDistance });
  }

  // Get elevations
  const elevations = await getElevationsOpenElevation(samplePoints);

  return elevations.map((e, i) => ({
    distance: Math.round(samplePoints[i].distance),
    elevation: e.elevation ?? 0,
  }));
}
