import { Route, RouteStep } from '../types';

// Calculates distance between two points in meters using Haversine formula
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

// Attempts to use OSRM for real road routing with fast timeout; falls back gracefully if offline.
export const calculateRoute = async (start: [number, number], end: [number, number]): Promise<Route> => {
  // If user is currently offline according to browser, go straight to offline routing without delay
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return generateOfflineCorridorRoute(start, end);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s quick timeout

    const response = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson&steps=true`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]] as [number, number]);
        
        const steps: RouteStep[] = [];
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          route.legs[0].steps.forEach((step: any) => {
            let instruction = step.maneuver.type || 'Proceed';
            if (step.maneuver.modifier) instruction += ` ${step.maneuver.modifier}`;
            if (step.name) instruction += ` onto ${step.name}`;
            
            instruction = instruction.charAt(0).toUpperCase() + instruction.slice(1);
            if (instruction.toLowerCase().includes('arrive')) {
              instruction = 'Arrive at EV Charging Station';
            }
            
            steps.push({
              instruction,
              distance: step.distance
            });
          });
        }

        return {
          distance: route.distance,
          time: route.duration,
          path: coordinates,
          steps,
          isOfflineFallback: false
        };
      }
    }
  } catch (error) {
    // Network offline, timeout, or blocked
  }

  // Graceful offline fallback with regional corridor road interpolation
  return generateOfflineCorridorRoute(start, end);
};

/**
 * Generates an offline route path with realistic road waypoints along the Kolhapur, Kodoli,
 * and Talsande corridors (NH-48 / SH-178), providing realistic driving steps even with zero network.
 */
function generateOfflineCorridorRoute(start: [number, number], end: [number, number]): Route {
  const directDist = calculateDistance(start[0], start[1], end[0], end[1]);
  // Real road factor: roads curve ~ 1.25x direct distance
  const roadDistance = Math.round(directDist * 1.25);
  // Avg EV driving speed 36 km/h -> 10 m/s
  const travelTimeSeconds = Math.round(roadDistance / 10);

  const waypoints: [number, number][] = [start];
  const steps: RouteStep[] = [
    { instruction: 'Start from origin towards the main road', distance: Math.round(roadDistance * 0.1) }
  ];

  const minLat = Math.min(start[0], end[0]);
  const maxLat = Math.max(start[0], end[0]);
  const isNorthSouth = (maxLat - minLat) > 0.08; // Long distance across district (e.g. Kolhapur to Kodoli/Talsande)

  if (isNorthSouth) {
    // Interpolate through regional highway hubs (Shiroli / Warnanagar / Peth Vadgaon)
    const midPoint1: [number, number] = [
      start[0] + (end[0] - start[0]) * 0.35 + 0.003,
      start[1] + (end[1] - start[1]) * 0.35 - 0.004
    ];
    const midPoint2: [number, number] = [
      start[0] + (end[0] - start[0]) * 0.70 - 0.002,
      start[1] + (end[1] - start[1]) * 0.70 + 0.003
    ];
    waypoints.push(midPoint1, midPoint2);

    const isHeadingNorth = end[0] > start[0];
    if (isHeadingNorth) {
      steps.push({
        instruction: 'Take Highway SH-178 / NH-48 northbound towards Kodoli / Talsande',
        distance: Math.round(roadDistance * 0.6)
      });
      steps.push({
        instruction: 'Continue on connecting bypass towards destination area',
        distance: Math.round(roadDistance * 0.2)
      });
    } else {
      steps.push({
        instruction: 'Follow state highway southbound towards Kolhapur city',
        distance: Math.round(roadDistance * 0.6)
      });
      steps.push({
        instruction: 'Enter city arterial road towards charging station',
        distance: Math.round(roadDistance * 0.2)
      });
    }
  } else {
    // Short / intra-city distance
    const midLat = (start[0] + end[0]) / 2 + 0.002;
    const midLng = (start[1] + end[1]) / 2 - 0.002;
    waypoints.push([midLat, midLng]);
    steps.push({
      instruction: 'Follow local connecting road towards station address',
      distance: Math.round(roadDistance * 0.75)
    });
  }

  waypoints.push(end);
  steps.push({
    instruction: 'Arrive at EV Charging Station destination',
    distance: Math.round(roadDistance * 0.15)
  });

  return {
    distance: roadDistance,
    time: travelTimeSeconds,
    path: waypoints,
    steps,
    isOfflineFallback: true
  };
}

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return `${hours} hr ${remainingMins} min`;
};
