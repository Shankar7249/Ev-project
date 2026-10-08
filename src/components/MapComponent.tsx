import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, Route, LocationPreset } from '../types';
import { createOfflineFallbackTileSvg } from '../utils/offlineMap';
import { Locate, Navigation, Layers, Compass, Zap } from 'lucide-react';

// Pure inline SVG marker icons (100% offline safe, zero CDN/unpkg dependencies)
const createSvgIcon = (svgString: string, size: [number, number], anchor: [number, number]) => {
  return new L.Icon({
    iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`,
    iconSize: size,
    iconAnchor: anchor,
    popupAnchor: [0, -anchor[1]],
  });
};

// Fast Charger (CCS2 / DC Fast) - Emerald with lightning
const fastChargerIcon = createSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <path d="M18 2 C8.6 2 1 9.6 1 19 C1 29 18 42 18 42 C18 42 35 29 35 19 C35 9.6 27.4 2 18 2 Z" fill="#059669" filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
    <circle cx="18" cy="18" r="11" fill="#ffffff"/>
    <path d="M19 10 L13 19 L17 19 L16 26 L23 17 L19 17 Z" fill="#059669"/>
  </svg>`,
  [36, 44],
  [18, 42]
);

// Home Charger (Kodoli & Talsande residential) - Indigo with Home & Plug
const homeChargerIcon = createSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <path d="M18 2 C8.6 2 1 9.6 1 19 C1 29 18 42 18 42 C18 42 35 29 35 19 C35 9.6 27.4 2 18 2 Z" fill="#4f46e5" filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
    <circle cx="18" cy="18" r="11" fill="#ffffff"/>
    <path d="M18 11 L12 16 L14 16 L14 24 L22 24 L22 16 L24 16 Z" fill="#4f46e5"/>
    <path d="M16 19 L20 19 M17 21 L19 21" stroke="#ffffff" stroke-width="1.5"/>
  </svg>`,
  [36, 44],
  [18, 42]
);

// Standard Public Charger (Type 2 AC) - Teal
const standardChargerIcon = createSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <path d="M18 2 C8.6 2 1 9.6 1 19 C1 29 18 42 18 42 C18 42 35 29 35 19 C35 9.6 27.4 2 18 2 Z" fill="#0d9488" filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
    <circle cx="18" cy="18" r="11" fill="#ffffff"/>
    <path d="M15 12 L15 15 M21 12 L21 15 M14 15 L22 15 C22 19 20 22 18 22 C16 22 14 19 14 15 Z M18 22 L18 25" stroke="#0d9488" stroke-width="2" stroke-linecap="round" fill="none"/>
  </svg>`,
  [36, 44],
  [18, 42]
);

// Selected / Active Station Highlight Icon
const selectedChargerIcon = createSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 42 50" width="42" height="50">
    <filter id="glow" x="-30%" y="-20%" width="160%" height="150%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#f59e0b" flood-opacity="0.8"/>
    </filter>
    <path d="M21 2 C9.9 2 1 10.9 1 22 C1 34 21 48 21 48 C21 48 41 34 41 22 C41 10.9 32.1 2 21 2 Z" fill="#f59e0b" filter="url(#glow)" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="21" cy="21" r="13" fill="#ffffff"/>
    <path d="M22 12 L15 22 L20 22 L18 30 L27 19 L22 19 Z" fill="#d97706"/>
  </svg>`,
  [42, 50],
  [21, 48]
);

// GPS Live User Location Icon (Pulsing Radar Dot)
const userLocationGpsIcon = createSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" width="36" height="36">
    <circle cx="18" cy="18" r="16" fill="#3b82f6" fill-opacity="0.25"/>
    <circle cx="18" cy="18" r="9" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
    <circle cx="18" cy="18" r="3" fill="#ffffff"/>
  </svg>`,
  [36, 36],
  [18, 18]
);

// Manual/Preset Start Point Icon (Amber Navigation Arrow Pin)
const manualStartIcon = createSvgIcon(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 44" width="36" height="44">
    <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
      <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
    </filter>
    <path d="M18 2 C8.6 2 1 9.6 1 19 C1 29 18 42 18 42 C18 42 35 29 35 19 C35 9.6 27.4 2 18 2 Z" fill="#ea580c" filter="url(#shadow)" stroke="#ffffff" stroke-width="2"/>
    <circle cx="18" cy="18" r="11" fill="#ffffff"/>
    <circle cx="18" cy="18" r="5" fill="#ea580c"/>
    <circle cx="18" cy="18" r="2" fill="#ffffff"/>
  </svg>`,
  [36, 44],
  [18, 42]
);

interface MapProps {
  stations: Station[];
  userLocation: [number, number];
  isLiveGps: boolean;
  selectedStation: Station | null;
  route: Route | null;
  onSelectStation: (station: Station) => void;
  onMapClick?: (lat: number, lng: number) => void;
  isPinDropMode: boolean;
  activePresetLabel?: string;
  onRecenter: () => void;
  onRequestGps: () => void;
}

// Controller component to handle flyTo and bounds fitting
const MapViewController: React.FC<{
  center: [number, number];
  selectedStation: Station | null;
  route: Route | null;
  onMapClick?: (lat: number, lng: number) => void;
}> = ({ center, selectedStation, route, onMapClick }) => {
  const map = useMap();

  useEffect(() => {
    if (route && route.path.length > 1) {
      const bounds = L.latLngBounds(route.path);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    } else if (selectedStation) {
      map.flyTo([selectedStation.lat, selectedStation.lng], 15, { duration: 0.8 });
    } else {
      map.flyTo(center, 13, { duration: 0.8 });
    }
  }, [center, selectedStation, route, map]);

  useEffect(() => {
    if (onMapClick) {
      const handleClick = (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      };
      map.on('click', handleClick);
      return () => {
        map.off('click', handleClick);
      };
    }
  }, [onMapClick, map]);

  return null;
};

// Tile error interceptor component to replace missing tiles with vector SVG grid
const OfflineTileInterceptor: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const handleTileError = (e: any) => {
      const tile = e.tile as HTMLImageElement;
      if (tile && !tile.dataset.offlineReplaced) {
        tile.dataset.offlineReplaced = 'true';
        const coords = e.coords;
        if (coords) {
          tile.src = createOfflineFallbackTileSvg(coords.z, coords.x, coords.y);
        }
      }
    };

    map.on('tileerror', handleTileError);
    return () => {
      map.off('tileerror', handleTileError);
    };
  }, [map]);

  return null;
};

export const MapComponent: React.FC<MapProps> = ({
  stations,
  userLocation,
  isLiveGps,
  selectedStation,
  route,
  onSelectStation,
  onMapClick,
  isPinDropMode,
  activePresetLabel,
  onRecenter,
  onRequestGps
}) => {
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={userLocation}
        zoom={13}
        style={{ height: '100%', width: '100%', backgroundColor: '#f1f5f9' }}
        zoomControl={false}
      >
        {/* Offline Tile Fallback Interceptor */}
        <OfflineTileInterceptor />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={18}
          minZoom={10}
        />

        {/* User / Origin Marker */}
        <Marker
          position={userLocation}
          icon={isLiveGps ? userLocationGpsIcon : manualStartIcon}
          zIndexOffset={1000}
        >
          <Popup>
            <div className="p-1 text-xs">
              <div className="font-bold text-gray-800 flex items-center gap-1">
                {isLiveGps ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping"></span>
                    Live GPS Location
                  </>
                ) : (
                  <>📍 Starting Point</>
                )}
              </div>
              <p className="text-gray-600 mt-0.5">
                {activePresetLabel || `${userLocation[0].toFixed(4)}, ${userLocation[1].toFixed(4)}`}
              </p>
              {!isLiveGps && (
                <button
                  onClick={onRequestGps}
                  className="mt-2 text-blue-600 hover:text-blue-700 font-semibold text-[11px] underline block"
                >
                  Switch to Live GPS
                </button>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Stations Markers */}
        {stations.map((station) => {
          const isSelected = selectedStation?.id === station.id;
          let markerIcon = standardChargerIcon;

          if (isSelected) {
            markerIcon = selectedChargerIcon;
          } else if (station.category === 'home') {
            markerIcon = homeChargerIcon;
          } else if (station.chargerType.toUpperCase().includes('CCS') || station.powerOutput >= 30) {
            markerIcon = fastChargerIcon;
          }

          return (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => onSelectStation(station),
              }}
            >
              <Popup>
                <div className="p-1 min-w-[160px]">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${
                        station.category === 'home'
                          ? 'bg-indigo-600'
                          : station.powerOutput >= 30
                          ? 'bg-emerald-600'
                          : 'bg-teal-600'
                      }`}
                    >
                      {station.category === 'home' ? 'Home Charger' : `${station.powerOutput} kW Fast`}
                    </span>
                    <span className="text-[11px] text-gray-500 font-medium">{station.chargerType}</span>
                  </div>
                  <h3 className="font-bold text-gray-800 text-sm leading-snug">{station.name}</h3>
                  <p className="text-xs text-gray-600 mt-1">{station.address}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Route Polyline */}
        {route && (
          <Polyline
            positions={route.path}
            color={route.isOfflineFallback ? '#059669' : '#2563eb'}
            weight={6}
            opacity={0.85}
            dashArray={route.isOfflineFallback ? '8, 8' : undefined}
          />
        )}

        <MapViewController
          center={userLocation}
          selectedStation={selectedStation}
          route={route}
          onMapClick={onMapClick}
        />
      </MapContainer>

      {/* Floating Map Controls & Overlays */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        {/* Recenter Button */}
        <button
          onClick={onRecenter}
          className="bg-white/95 backdrop-blur-sm shadow-md hover:bg-gray-50 text-gray-700 p-2.5 rounded-xl border border-gray-200/80 transition-all flex items-center justify-center active:scale-95"
          title="Recenter to Starting Point"
        >
          <Locate size={18} className="text-emerald-600" />
        </button>

        {/* Live GPS Activation Button */}
        <button
          onClick={onRequestGps}
          className={`p-2.5 rounded-xl border shadow-md transition-all flex items-center justify-center active:scale-95 ${
            isLiveGps
              ? 'bg-blue-600 text-white border-blue-700 shadow-blue-200'
              : 'bg-white/95 backdrop-blur-sm text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
          title={isLiveGps ? 'GPS Location Active' : 'Acquire Live GPS'}
        >
          <Navigation size={18} className={isLiveGps ? 'text-white animate-pulse' : 'text-blue-600'} />
        </button>
      </div>

      {/* Pin Drop Notice when active */}
      {isPinDropMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500 text-white px-4 py-2 rounded-full shadow-lg text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span>📌 Tap anywhere on the map to set your starting location</span>
        </div>
      )}

      {/* Offline Route Banner on Map if route is active */}
      {route?.isOfflineFallback && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700/60">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Offline Corridor Navigation Active</span>
        </div>
      )}
    </div>
  );
};
