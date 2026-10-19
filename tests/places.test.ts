import { expect, test } from 'vitest';
import { searchPlaces } from '../src/server/places';
import places from '../src/server/places.json';

test('indeks lokasi bersumber, lengkap dalam snapshot, dan titik berada dalam bbox', () => {
  expect(places).toHaveLength(553);
  expect(new Set(places.map(place => place.id)).size).toBe(places.length);
  for (const place of places) {
    expect(place.province).not.toBe('');
    const [west, south, east, north] = place.bounds;
    expect(place.lng).toBeGreaterThanOrEqual(west);
    expect(place.lng).toBeLessThanOrEqual(east);
    expect(place.lat).toBeGreaterThanOrEqual(south);
    expect(place.lat).toBeLessThanOrEqual(north);
  }
});

test('pencarian membedakan kabupaten/kota dan mendukung prefiks, gabungan provinsi, serta id', () => {
  const bandung = searchPlaces('bandung');
  expect(bandung.map(place => place.name)).toEqual(expect.arrayContaining(['Kota Bandung', 'Kabupaten Bandung', 'Kabupaten Bandung Barat']));
  expect(searchPlaces('KOTA BANDUNG')[0].name).toBe('Kota Bandung');
  expect(searchPlaces('kab. bogor')[0].name).toBe('Kabupaten Bogor');
  expect(searchPlaces('sleman yogyakarta')[0].name).toBe('Kabupaten Sleman');
  expect(searchPlaces('', bandung[0].id)).toEqual([bandung[0]]);
  expect(searchPlaces('x')).toEqual([]);
  expect(searchPlaces('wilayah-tidak-ada-123')).toEqual([]);
  expect(searchPlaces('jawa', undefined, 3)).toHaveLength(3);
});
