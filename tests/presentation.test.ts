import { expect, it } from 'vitest';
import { precisionLabel, provinceLabel } from '../src/lib/presentation';

it('menyajikan nama provinsi dan ketelitian dalam bahasa Indonesia tanpa mengubah data asli', () => {
  expect(provinceLabel('West Java')).toBe('Jawa Barat');
  expect(provinceLabel('Bali')).toBe('Bali');
  expect(precisionLabel('Perkiraan katalog: exact')).toContain('belum diverifikasi');
  expect(precisionLabel('Perkiraan katalog: 10km')).toBe('Perkiraan katalog: 10 km');
});
