import { expect, test } from 'vitest';
import provinces from '../src/lib/overview.json';
import { provinceLabel } from '../src/lib/presentation';

test('pilihan provinsi pada indeks berada di wilayah geografisnya', () => {
  const bounds: Record<string, [number, number, number, number]> = {
    'Jawa Barat': [106, -8, 109, -5],
    'Jawa Tengah': [108, -9, 112, -5],
    'Jawa Timur': [110, -9, 117, -4],
    'Sumatera Barat': [98, -4, 103, 2],
    'Sulawesi Selatan': [117, -9, 124, -1],
  };
  for (const [name, [west, south, east, north]] of Object.entries(bounds)) {
    const province = provinces.find(province => provinceLabel(province.name) === name);
    expect(province, name).toBeDefined();
    const points = [...province!.path.matchAll(/([\d.]+),([\d.]+)/g)];
    expect(points.length, name).toBeGreaterThan(0);
    for (const [, x, y] of points) {
      const longitude = (Number(x) - 10) / 20 + 94;
      const latitude = 7 - (Number(y) - 10) / 20;
      expect(longitude, name).toBeGreaterThanOrEqual(west);
      expect(longitude, name).toBeLessThanOrEqual(east);
      expect(latitude, name).toBeGreaterThanOrEqual(south);
      expect(latitude, name).toBeLessThanOrEqual(north);
    }
  }
});
