import React, { useEffect, useState, useRef } from 'react';
import { MapComponent } from './components/MapComponent';
import { Sidebar } from './components/Sidebar';
import { NetworkStatus } from './components/NetworkStatus';
import { OfflineMapManager } from './components/OfflineMapManager';
import { Station, Route, LocationPreset, OfflineMapStatus } from './types';
import { initDB, getStations, toggleFavorite } from './store/database';
import { calculateRoute } from './utils/routing';
import { checkOfflineMapStatus, downloadRegionMapTiles } from './utils/offlineMap';
import { LOCATION_PRESETS } from './data/stations';
import { Menu, X, HardDrive, Compass, Locate } from 'lucide-react';

export default function App() {
  const [stations, setStations] = useState<Station[]>([]);
  // Immediately start with Kolhapur Center so user is never blocked
  const [userLocation, setUserLocation] = useState<[number, number]>([16.7050, 74.2433]);
  const [isLiveGps, setIsLiveGps] = useState<boolean>(false);
  const [activePresetId, setActivePresetId] = useState<string | null>('kolhapur_center');
  const [isPinDropMode, setIsPinDropMode] = useState<boolean>(false);

  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOfflineMapOpen, setIsOfflineMapOpen] = useState(false);

  const [offlineStatus, setOfflineStatus] = useState<OfflineMapStatus>({
    isCached: false,
    cachedCount: 0,
    totalTiles: 168,
    isDownloading: false,
    downloadProgress: 0
  });

  const watchIdRef = useRef<number | null>(null);

  // 1. Initialize station database & offline map status on mount
  useEffect(() => {
    const setup = async () => {
      await initDB();
      const data = await getStations();
      setStations(data);

      const status = await checkOfflineMapStatus();
      setOfflineStatus(status);

      // Auto-precache regional tiles quietly if online and not yet cached
      if (navigator.onLine && !status.isCached) {
        downloadRegionMapTiles((progress, cached, total) => {
          setOfflineStatus(prev => ({
            ...prev,
            cachedCount: cached,
            totalTiles: total,
            downloadProgress: progress,
            isCached: cached >= Math.floor(total * 0.75)
          }));
        });
      }
    };
    setup();

    // 2. Graceful location access on start (non-blocking)
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
          // Check if coordinate is somewhat nearby Maharashtra / India region
          setUserLocation(coords);
          setIsLiveGps(true);
          setActivePresetId(null);
        },
        (_error) => {
          // Gracefully fallback to Kolhapur city center with zero alert/error
          setIsLiveGps(false);
          setActivePresetId('kolhapur_center');
        },
        { enableHighAccuracy: true, timeout: 4000, maximumAge: 30000 }
      );
    }

    return () => {
      if (watchIdRef.current !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Request / toggle device GPS explicitly
  const handleRequestGps = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser. You can select Kolhapur, Kodoli, Talsande, or tap the map to set your location.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(coords);
        setIsLiveGps(true);
        setActivePresetId(null);
        setIsPinDropMode(false);

        // If a route was already displayed, update it to the new GPS position
        if (selectedStation) {
          calculateRoute(coords, [selectedStation.lat, selectedStation.lng]).then(setRoute);
        }

        // Start watching position
        if (watchIdRef.current === null) {
          watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => {
              setUserLocation([pos.coords.latitude, pos.coords.longitude]);
            },
            () => {},
            { enableHighAccuracy: true, maximumAge: 10000 }
          );
        }
      },
      (error) => {
        setIsLiveGps(false);
        if (error.code === error.PERMISSION_DENIED) {
          alert("GPS permission was declined. The app will use your selected starting point (Kolhapur / Kodoli / Talsande) with full navigation capabilities.");
        } else {
          alert("Could not acquire GPS fix. Continuing with preset starting location.");
        }
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  // Switch to a preset starting point (e.g. Kodoli, Talsande, Kolhapur City)
  const handleSelectPreset = async (preset: LocationPreset) => {
    // Stop live GPS watch if active
    if (watchIdRef.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setUserLocation(preset.coords);
    setActivePresetId(preset.id);
    setIsLiveGps(false);
    setIsPinDropMode(false);

    // If route was open, recalculate immediately from new origin
    if (selectedStation) {
      const newRoute = await calculateRoute(preset.coords, [selectedStation.lat, selectedStation.lng]);
      setRoute(newRoute);
    }
  };

  // Toggle map pin-drop mode
  const handleTogglePinDrop = () => {
    setIsPinDropMode(prev => !prev);
    if (!isPinDropMode) {
      setIsLiveGps(false);
      setActivePresetId(null);
    }
  };

  // Handle map click
  const handleMapClick = async (lat: number, lng: number) => {
    if (isPinDropMode) {
      const coords: [number, number] = [lat, lng];
      setUserLocation(coords);
      setIsLiveGps(false);
      setActivePresetId(null);
      setIsPinDropMode(false);

      if (selectedStation) {
        const newRoute = await calculateRoute(coords, [selectedStation.lat, selectedStation.lng]);
        setRoute(newRoute);
      }
    }
  };

  const handleToggleFavorite = async (id: string) => {
    const updated = await toggleFavorite(id);
    setStations(updated);
  };

  // Calculate route and open navigation view (works instantly with or without GPS)
  const handleNavigate = async (station: Station) => {
    setSelectedStation(station);
    const calculatedRoute = await calculateRoute(userLocation, [station.lat, station.lng]);
    setRoute(calculatedRoute);
    setIsSidebarOpen(true);
  };

  const handleRecenter = () => {
    if (userLocation) {
      // triggers MapComponent view reset
      setUserLocation([...userLocation]);
    }
  };

  const activePreset = LOCATION_PRESETS.find(p => p.id === activePresetId);
  const activePresetLabel = isLiveGps ? 'Live GPS' : activePreset ? activePreset.label : 'Custom Location';

  return (
    <div className="h-screen w-full flex flex-col md:flex-row relative overflow-hidden font-sans bg-slate-100">
      
      {/* Mobile Top Navigation Header */}
      <div className="md:hidden bg-emerald-700 text-white p-3 flex justify-between items-center z-30 shadow-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div>
            <h1 className="font-bold text-sm leading-tight">Kolhapur EV Navigator</h1>
            <p className="text-[10px] text-emerald-200">
              Start: {activePresetLabel}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsOfflineMapOpen(true)}
            className="p-1.5 rounded-lg bg-white/10 text-xs flex items-center gap-1 text-emerald-100 font-medium"
            title="Offline Map"
          >
            <HardDrive size={15} className={offlineStatus.isCached ? "text-emerald-300" : "text-amber-200"} />
            <span className="text-[11px]">{offlineStatus.isCached ? 'Offline' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Sidebar Drawer */}
      <div
        className={`
          absolute md:relative z-20 h-[calc(100%-53px)] md:h-full 
          transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          w-full md:w-[410px] shadow-2xl md:shadow-none
        `}
      >
        <Sidebar
          stations={stations}
          selectedStation={selectedStation}
          onSelectStation={(s) => {
            setSelectedStation(s);
            if (!route && window.innerWidth < 768) {
              setIsSidebarOpen(false); // allow user to view the pin on map
            }
          }}
          onToggleFavorite={handleToggleFavorite}
          route={route}
          onNavigate={handleNavigate}
          onCancelNavigation={() => {
            setRoute(null);
            setSelectedStation(null);
          }}
          userLocation={userLocation}
          isLiveGps={isLiveGps}
          activePresetId={activePresetId}
          onSelectPreset={handleSelectPreset}
          onRequestGps={handleRequestGps}
          onTogglePinDropMode={handleTogglePinDrop}
          isPinDropMode={isPinDropMode}
          onOpenOfflineMapManager={() => setIsOfflineMapOpen(true)}
          offlineStatus={offlineStatus}
        />
      </div>

      {/* Leaflet Map Canvas */}
      <div className="flex-1 relative z-0 h-full">
        <MapComponent
          stations={stations}
          userLocation={userLocation}
          isLiveGps={isLiveGps}
          selectedStation={selectedStation}
          route={route}
          onSelectStation={(s) => {
            setSelectedStation(s);
            setIsSidebarOpen(true);
          }}
          onMapClick={handleMapClick}
          isPinDropMode={isPinDropMode}
          activePresetLabel={activePresetLabel}
          onRecenter={handleRecenter}
          onRequestGps={handleRequestGps}
        />
      </div>

      {/* Offline Status Floating Pill */}
      <NetworkStatus />

      {/* Offline Map Manager Modal */}
      <OfflineMapManager
        isOpen={isOfflineMapOpen}
        onClose={() => setIsOfflineMapOpen(false)}
        onStatusChange={setOfflineStatus}
      />
    </div>
  );
}
