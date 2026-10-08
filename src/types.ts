export interface Station {
  id: string;
  name: string;
  lat: number;
  lng: number;
  chargerType: string; // e.g., 'Type 2', 'CCS2', 'CHAdeMO'
  powerOutput: number; // in kW
  contact: string;
  address: string;
  isFavorite?: boolean;
  category?: 'public' | 'home'; // 'home' for residential chargers in Kodoli/Talsande
}

export interface RouteStep {
  instruction: string;
  distance: number;
}

export interface Route {
  distance: number; // in meters
  time: number; // in seconds
  path: [number, number][]; // Array of [lat, lng] tuples
  steps?: RouteStep[];
  isOfflineFallback?: boolean;
}

export interface LocationPreset {
  id: string;
  name: string;
  label: string;
  area: string;
  coords: [number, number];
  description: string;
}

export interface OfflineMapStatus {
  isCached: boolean;
  cachedCount: number;
  totalTiles: number;
  isDownloading: boolean;
  downloadProgress: number; // 0 to 100
  lastUpdated?: string;
}
