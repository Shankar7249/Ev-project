import React, { useState } from 'react';
import { Station, Route, LocationPreset, OfflineMapStatus } from '../types';
import {
  BatteryCharging,
  Heart,
  Search,
  Navigation,
  X,
  Clock,
  MapPin,
  Phone,
  HardDrive,
  Home,
  Zap,
  Locate,
  Compass,
  CheckCircle2,
  ChevronRight
} from 'lucide-react';
import { calculateDistance, formatDistance, formatTime } from '../utils/routing';
import { LOCATION_PRESETS } from '../data/stations';

interface SidebarProps {
  stations: Station[];
  selectedStation: Station | null;
  onSelectStation: (station: Station | null) => void;
  onToggleFavorite: (id: string) => void;
  route: Route | null;
  onNavigate: (station: Station) => void;
  onCancelNavigation: () => void;
  userLocation: [number, number];
  isLiveGps: boolean;
  activePresetId: string | null;
  onSelectPreset: (preset: LocationPreset) => void;
  onRequestGps: () => void;
  onTogglePinDropMode: () => void;
  isPinDropMode: boolean;
  onOpenOfflineMapManager: () => void;
  offlineStatus: OfflineMapStatus;
}

export const Sidebar: React.FC<SidebarProps> = ({
  stations,
  selectedStation,
  onSelectStation,
  onToggleFavorite,
  route,
  onNavigate,
  onCancelNavigation,
  userLocation,
  isLiveGps,
  activePresetId,
  onSelectPreset,
  onRequestGps,
  onTogglePinDropMode,
  isPinDropMode,
  onOpenOfflineMapManager,
  offlineStatus
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // 'all' | 'fast' | 'home' | 'favorite'
  const [sortByDistance, setSortByDistance] = useState(true);

  // Calculate distance for all stations relative to active starting location
  const stationsWithDistance = stations.map(s => {
    const dist = calculateDistance(userLocation[0], userLocation[1], s.lat, s.lng);
    return { ...s, calculatedDistance: dist };
  });

  const filteredStations = stationsWithDistance.filter(s => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(query) ||
      s.address.toLowerCase().includes(query) ||
      s.chargerType.toLowerCase().includes(query);

    let matchesCategory = true;
    if (filterType === 'fast') {
      matchesCategory = s.powerOutput >= 30 || s.chargerType.toUpperCase().includes('CCS');
    } else if (filterType === 'home') {
      matchesCategory = s.category === 'home';
    } else if (filterType === 'favorite') {
      matchesCategory = !!s.isFavorite;
    }

    return matchesSearch && matchesCategory;
  });

  // Sort stations: nearest to active location first
  if (sortByDistance) {
    filteredStations.sort((a, b) => a.calculatedDistance - b.calculatedDistance);
  }

  // Get active location human-readable label
  const activePreset = LOCATION_PRESETS.find(p => p.id === activePresetId);
  const activeLocationLabel = isLiveGps
    ? 'Live GPS (Device)'
    : isPinDropMode
    ? 'Custom Pin on Map'
    : activePreset
    ? activePreset.label
    : 'Kolhapur Region';

  return (
    <div className="w-full md:w-[410px] bg-white shadow-2xl h-full flex flex-col z-20 absolute md:relative top-0 left-0 transition-transform overflow-hidden border-r border-gray-200">
      
      {/* Brand Header */}
      <div className="p-4 bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700 text-white flex justify-between items-center shrink-0 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
            <BatteryCharging size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight flex items-center gap-1.5">
              EV Navigator
              <span className="text-[10px] font-semibold bg-emerald-500/80 px-1.5 py-0.5 rounded text-white uppercase tracking-wider">
                Kolhapur
              </span>
            </h1>
            <p className="text-[11px] text-emerald-100">Kodoli • Talsande • City</p>
          </div>
        </div>

        {/* Offline Map Status / Manager Button */}
        <button
          onClick={onOpenOfflineMapManager}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-white/15 hover:bg-white/25 backdrop-blur-sm border border-white/20 transition-all active:scale-95 text-white"
          title="Open Offline Map Manager"
        >
          <HardDrive size={14} className={offlineStatus.isCached ? "text-emerald-300" : "text-amber-200"} />
          <span>{offlineStatus.isCached ? 'Offline Ready' : 'Save Map'}</span>
        </button>
      </div>

      {/* Origin / Starting Point Selector Bar */}
      <div className="bg-slate-50 border-b border-slate-200/90 p-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900 flex items-center gap-1">
              <Compass size={14} className="text-emerald-600" />
              Starting Point:
            </span>
            <span className="font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md text-[11px]">
              {activeLocationLabel}
            </span>
          </div>

          <button
            onClick={onRequestGps}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors ${
              isLiveGps
                ? 'bg-blue-600 text-white'
                : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'
            }`}
          >
            <Locate size={12} />
            {isLiveGps ? 'GPS On' : 'Use GPS'}
          </button>
        </div>

        {/* Quick Location Preset Chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
          {LOCATION_PRESETS.map(preset => {
            const isSelected = !isLiveGps && !isPinDropMode && activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => onSelectPreset(preset)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100/70'
                }`}
              >
                {preset.label}
              </button>
            );
          })}

          {/* Pin drop button */}
          <button
            onClick={onTogglePinDropMode}
            className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition-all border flex items-center gap-1 ${
              isPinDropMode
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm animate-pulse'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <span>📌 Tap Map</span>
          </button>
        </div>
      </div>

      {/* Main Body: Navigation View OR Station Search List */}
      {route && selectedStation ? (
        <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          {/* Nav Header */}
          <div className="mb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-1.5">
                <Navigation size={18} className="text-emerald-600" />
                Route Overview
              </h2>
              <p className="text-xs text-gray-500">
                From <span className="font-semibold text-gray-700">{activeLocationLabel}</span>
              </p>
            </div>
            <button
              onClick={onCancelNavigation}
              className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="Close navigation"
            >
              <X size={18} />
            </button>
          </div>

          {/* Route Mode Status Badge */}
          <div className="mb-3">
            {route.isOfflineFallback ? (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <div>
                  <span className="font-bold">Offline Route Guidance</span>
                  <p className="text-[11px] text-emerald-700 leading-tight">
                    Calculated using regional highway corridor road interpolation (Zero internet required).
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl p-2.5 text-xs flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <div>
                  <span className="font-bold">Live Road Network Route</span>
                  <p className="text-[11px] text-blue-700 leading-tight">
                    Turn-by-turn road network geometry active.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Destination Card */}
          <div className="bg-white rounded-xl p-3.5 mb-3 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                    selectedStation.category === 'home'
                      ? 'bg-indigo-600'
                      : selectedStation.powerOutput >= 30
                      ? 'bg-emerald-600'
                      : 'bg-teal-600'
                  }`}
                >
                  {selectedStation.category === 'home' ? 'Home Charger' : `${selectedStation.powerOutput} kW Fast`}
                </span>
                <h3 className="font-bold text-gray-900 text-base mt-1.5">{selectedStation.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{selectedStation.address}</p>
              </div>

              {selectedStation.contact && (
                <a
                  href={`tel:${selectedStation.contact}`}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-2.5 rounded-xl border border-emerald-200 flex items-center gap-1 text-xs font-semibold transition-colors"
                  title="Call station or homeowner"
                >
                  <Phone size={14} />
                  <span>Call</span>
                </a>
              )}
            </div>
          </div>

          {/* Distance and Estimated Time Metrics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center">
              <MapPin size={18} className="text-blue-600 mb-1" />
              <span className="text-[11px] font-medium text-gray-500">Distance</span>
              <span className="text-base font-bold text-gray-900">{formatDistance(route.distance)}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col items-center">
              <Clock size={18} className="text-amber-600 mb-1" />
              <span className="text-[11px] font-medium text-gray-500">Est. Driving Time</span>
              <span className="text-base font-bold text-gray-900">{formatTime(route.time)}</span>
            </div>
          </div>

          {/* Turn-by-Turn Steps */}
          {route.steps && route.steps.length > 0 && (
            <div className="flex-1 overflow-y-auto pr-1 mb-4">
              <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 mb-2.5">
                Driving Directions
              </h3>
              <div className="space-y-2.5">
                {route.steps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs bg-gray-50/70 p-2.5 rounded-xl border border-gray-100">
                    <div className="bg-emerald-600 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-gray-800 font-semibold leading-snug">{step.instruction}</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">{formatDistance(step.distance)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Actions */}
          <div className="mt-auto pt-2 border-t border-gray-100 flex gap-2">
            <button
              onClick={() => alert(`Starting guidance to ${selectedStation.name}. Stay on main roads.`)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-colors active:scale-98"
            >
              <Navigation size={16} /> Start Navigation
            </button>
            <button
              onClick={onCancelNavigation}
              className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      ) : (
        /* Stations Directory & Filters */
        <div className="flex flex-col h-full overflow-hidden">
          {/* Search & Filter Header */}
          <div className="p-3.5 border-b border-gray-200 shrink-0 space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="Search stations, Kodoli, Talsande, CCS2..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-gray-400"
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none text-xs">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  filterType === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All Stations ({stations.length})
              </button>
              <button
                onClick={() => setFilterType('fast')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                  filterType === 'fast'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                <Zap size={12} /> DC Fast
              </button>
              <button
                onClick={() => setFilterType('home')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                  filterType === 'home'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                <Home size={12} /> Home Chargers
              </button>
              <button
                onClick={() => setFilterType('favorite')}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap flex items-center gap-1 transition-colors ${
                  filterType === 'favorite'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-800 hover:bg-rose-100'
                }`}
              >
                <Heart size={12} /> Favorites
              </button>
            </div>
          </div>

          {/* Stations List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredStations.length === 0 ? (
              <div className="text-center py-12 px-4 text-gray-500">
                <BatteryCharging size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="font-semibold text-sm">No charging stations found</p>
                <p className="text-xs text-gray-400 mt-1">
                  Try clearing the search query or changing your filters.
                </p>
              </div>
            ) : (
              filteredStations.map(station => {
                const isSelected = selectedStation?.id === station.id;
                return (
                  <div
                    key={station.id}
                    onClick={() => onSelectStation(station)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-500'
                        : 'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${
                              station.category === 'home'
                                ? 'bg-indigo-600'
                                : station.powerOutput >= 30
                                ? 'bg-emerald-600'
                                : 'bg-teal-600'
                            }`}
                          >
                            {station.category === 'home'
                              ? 'Home Charger'
                              : `${station.powerOutput} kW Fast`}
                          </span>
                          <span className="text-[11px] font-semibold text-gray-500">
                            {station.chargerType}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-sm mt-1 leading-snug">
                          {station.name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">{station.address}</p>
                      </div>

                      {/* Favorite Button */}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleFavorite(station.id);
                        }}
                        className="text-gray-300 hover:text-rose-500 p-1 rounded-lg transition-colors"
                        title="Save to favorites"
                      >
                        <Heart
                          size={18}
                          fill={station.isFavorite ? '#f43f5e' : 'none'}
                          className={station.isFavorite ? 'text-rose-500' : ''}
                        />
                      </button>
                    </div>

                    {/* Distance from current origin & Action */}
                    <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-slate-700 font-semibold">
                        <MapPin size={13} className="text-emerald-600" />
                        <span>{formatDistance(station.calculatedDistance)}</span>
                        <span className="text-[10px] text-gray-400 font-normal">
                          from {activeLocationLabel}
                        </span>
                      </div>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onNavigate(station);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm active:scale-95"
                      >
                        <Navigation size={13} />
                        <span>Navigate</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
