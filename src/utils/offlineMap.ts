/**
 * Offline Map Utilities for Kolhapur, Kodoli, and Talsande region.
 * Handles precaching OpenStreetMap tiles into CacheStorage ('osm-tiles')
 * and generates SVG fallback tiles when network is off.
 */

import { OfflineMapStatus } from '../types';

// Geographical bounds covering Kolhapur City, Kodoli, Talsande, and Highway corridors
export const KOLHAPUR_REGION_BOUNDS = {
  north: 16.93, // Above Kodoli
  south: 16.65, // Below Shivaji University / Rankala
  west: 74.17,  // West of Kodoli / Rankala
  east: 74.31   // East of Talsande / MIDC
};

export const OFFLINE_ZOOM_LEVELS = [11, 12, 13, 14];

export function lon2tile(lon: number, zoom: number): number {
  return Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
}

export function lat2tile(lat: number, zoom: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, zoom)
  );
}

export interface TileCoordinate {
  z: number;
  x: number;
  y: number;
  url: string;
}

/**
 * Returns all tile URLs for the Kolhapur-Kodoli-Talsande region across specified zoom levels.
 */
export function getRegionTileList(): TileCoordinate[] {
  const tiles: TileCoordinate[] = [];

  for (const z of OFFLINE_ZOOM_LEVELS) {
    const minX = lon2tile(KOLHAPUR_REGION_BOUNDS.west, z);
    const maxX = lon2tile(KOLHAPUR_REGION_BOUNDS.east, z);
    const minY = lat2tile(KOLHAPUR_REGION_BOUNDS.north, z);
    const maxY = lat2tile(KOLHAPUR_REGION_BOUNDS.south, z);

    for (let x = Math.min(minX, maxX); x <= Math.max(minX, maxX); x++) {
      for (let y = Math.min(minY, maxY); y <= Math.max(minY, maxY); y++) {
        // Use standard tile URL pattern
        tiles.push({
          z,
          x,
          y,
          url: `https://tile.openstreetmap.org/${z}/${x}/${y}.png`
        });
      }
    }
  }

  return tiles;
}

/**
 * Inspect CacheStorage to check how many region tiles are already saved
 */
export async function checkOfflineMapStatus(): Promise<OfflineMapStatus> {
  const allTiles = getRegionTileList();
  const totalTiles = allTiles.length;

  if (!('caches' in window)) {
    return {
      isCached: false,
      cachedCount: 0,
      totalTiles,
      isDownloading: false,
      downloadProgress: 0
    };
  }

  try {
    const cache = await caches.open('osm-tiles');
    let cachedCount = 0;

    // Sample checks or full check
    const checkPromises = allTiles.map(async (tile) => {
      const match = await cache.match(tile.url);
      if (match) cachedCount++;
    });

    await Promise.all(checkPromises);

    return {
      isCached: cachedCount >= Math.floor(totalTiles * 0.75), // considered cached if >75%
      cachedCount,
      totalTiles,
      isDownloading: false,
      downloadProgress: Math.round((cachedCount / totalTiles) * 100),
      lastUpdated: localStorage.getItem('kolhapur_map_cached_at') || undefined
    };
  } catch (err) {
    console.warn('Error checking offline cache status:', err);
    return {
      isCached: false,
      cachedCount: 0,
      totalTiles,
      isDownloading: false,
      downloadProgress: 0
    };
  }
}

/**
 * Downloads and caches all region map tiles into CacheStorage with progress reporting.
 */
export async function downloadRegionMapTiles(
  onProgress: (progress: number, cached: number, total: number) => void
): Promise<boolean> {
  if (!('caches' in window)) return false;

  const allTiles = getRegionTileList();
  const total = allTiles.length;
  let completed = 0;

  try {
    const cache = await caches.open('osm-tiles');
    const batchSize = 6; // polite batching for OpenStreetMap tile servers

    for (let i = 0; i < allTiles.length; i += batchSize) {
      const batch = allTiles.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (tile) => {
          try {
            // Check if already in cache first
            const existing = await cache.match(tile.url);
            if (!existing) {
              const res = await fetch(tile.url, { mode: 'cors' });
              if (res.ok) {
                await cache.put(tile.url, res.clone());
                // Also store under a/b/c subdomains for Leaflet compatibility
                await cache.put(tile.url.replace('tile.openstreetmap.org', 'a.tile.openstreetmap.org'), res.clone());
                await cache.put(tile.url.replace('tile.openstreetmap.org', 'b.tile.openstreetmap.org'), res.clone());
                await cache.put(tile.url.replace('tile.openstreetmap.org', 'c.tile.openstreetmap.org'), res);
              }
            }
          } catch (e) {
            // Silently ignore individual tile fetch failures (e.g. rate limit/offline)
          } finally {
            completed++;
            const pct = Math.min(100, Math.round((completed / total) * 100));
            onProgress(pct, completed, total);
          }
        })
      );
    }

    localStorage.setItem('kolhapur_map_cached_at', new Date().toLocaleDateString());
    return true;
  } catch (err) {
    console.error('Failed to download offline tiles:', err);
    return false;
  }
}

/**
 * Generates an SVG Data URI for an offline fallback tile so no gray voids or broken icons appear.
 */
export function createOfflineFallbackTileSvg(z: number, x: number, y: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">
    <rect width="256" height="256" fill="#f8fafc"/>
    <defs>
      <pattern id="grid_${z}_${x}_${y}" width="32" height="32" patternUnits="userSpaceOnUse">
        <path d="M 32 0 L 0 0 0 32" fill="none" stroke="#e2e8f0" stroke-width="1"/>
      </pattern>
      <pattern id="road_${z}_${x}_${y}" width="128" height="128" patternUnits="userSpaceOnUse">
        <path d="M 0 64 L 128 64 M 64 0 L 64 128" fill="none" stroke="#cbd5e1" stroke-width="2"/>
      </pattern>
    </defs>
    <rect width="256" height="256" fill="url(#grid_${z}_${x}_${y})"/>
    <rect width="256" height="256" fill="url(#road_${z}_${x}_${y})" opacity="0.6"/>
    <!-- Subtle Topographic & Compass Lines -->
    <circle cx="128" cy="128" r="48" fill="none" stroke="#94a3b8" stroke-width="0.75" stroke-dasharray="3,3" opacity="0.4"/>
    <circle cx="128" cy="128" r="80" fill="none" stroke="#94a3b8" stroke-width="0.5" stroke-dasharray="2,4" opacity="0.3"/>
    <line x1="128" y1="20" x2="128" y2="236" stroke="#94a3b8" stroke-width="0.75" stroke-dasharray="4,4" opacity="0.3"/>
    <line x1="20" y1="128" x2="236" y2="128" stroke="#94a3b8" stroke-width="0.75" stroke-dasharray="4,4" opacity="0.3"/>
    
    <!-- Watermark text -->
    <text x="128" y="125" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="10" font-weight="600" fill="#64748b" text-anchor="middle" letter-spacing="0.5">KOLHAPUR EV GRID</text>
    <text x="128" y="140" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="8.5" fill="#94a3b8" text-anchor="middle">Offline Mode (Z${z})</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
