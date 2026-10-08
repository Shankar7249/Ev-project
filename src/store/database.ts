import localforage from 'localforage';
import { Station } from '../types';
import { INITIAL_STATIONS } from '../data/stations';

localforage.config({
  name: 'kolhapur-ev-navigator',
  storeName: 'ev_data'
});

export const initDB = async () => {
  const existing = await localforage.getItem<Station[]>('stations');
  if (!existing || existing.length === 0) {
    await localforage.setItem('stations', INITIAL_STATIONS);
  } else {
    const existingMap = new Map(existing.map(s => [s.id, s]));
    const merged = INITIAL_STATIONS.map(s => {
      if (existingMap.has(s.id)) {
        return { ...s, isFavorite: existingMap.get(s.id)?.isFavorite };
      }
      return s;
    });
    await localforage.setItem('stations', merged);
  }
};

export const getStations = async (): Promise<Station[]> => {
  return (await localforage.getItem<Station[]>('stations')) || [];
};

export const saveStations = async (stations: Station[]) => {
  await localforage.setItem('stations', stations);
};

export const toggleFavorite = async (stationId: string) => {
  const stations = await getStations();
  const updated = stations.map(s => 
    s.id === stationId ? { ...s, isFavorite: !s.isFavorite } : s
  );
  await saveStations(updated);
  return updated;
};
