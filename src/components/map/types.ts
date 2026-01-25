// Shared types for map components

export interface MapZone {
  id: string;
  name: string;
  purpose_tags: string[] | null;
  color: string | null;
  notes?: string | null;
  geometry_geojson?: any;
}

export interface MapAsset {
  id: string;
  name: string;
  asset_type: string;
  zone_id: string | null;
  zone?: MapZone;
  lat: number | null;
  lng: number | null;
  critical_care_note: string | null;
  purpose_tags: string[] | null;
  risk_flags: string[] | null;
  last_service_date?: string | null;
}
