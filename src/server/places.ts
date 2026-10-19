import index from './places.json';
import type { Place } from '../lib/types';

export const normalizePlaceQuery = (value: string) => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\bkab\.?\s/g, 'kabupaten ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const places = index as Place[];

export function searchPlaces(query: string, id?: string | null, limit = 8): Place[] {
  if (id) return places.filter(place => place.id === id);
  const normalized = normalizePlaceQuery(query);
  if (normalized.length < 2) return [];
  const words = normalized.split(' ');
  const score = (place: Place) => {
    const name = normalizePlaceQuery(place.name);
    const short = name.replace(/^(kabupaten|kota) /, '');
    return name === normalized ? 0 : short === normalized ? 1 : short.startsWith(normalized) ? 2 : 3;
  };
  return places.filter(place => {
    const text = normalizePlaceQuery(`${place.name} ${place.province}`);
    return words.every(word => text.includes(word));
  }).sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name, 'id')).slice(0, limit);
}
