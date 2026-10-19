import { test, expect } from '@playwright/test';

test('API memvalidasi filter dan tidak menyimulasikan prediksi', async ({ request }) => {
  expect((await request.get('/api/incidents?bbox=142,-7,94,7')).status()).toBe(400);
  expect((await request.get('/api/incidents?from=2026-13-01')).status()).toBe(400);
  expect((await (await request.get('/api/ai/status')).json()).data.status).toBe('model_unavailable');
  const prediction = await request.post('/api/ai/predict', { data: { geographic_unit: 'test', horizon_hours: 24 } });
  expect(prediction.status()).toBe(503); expect((await prediction.json()).predicted_value).toBeNull();
});

test('beranda publik, pencarian lokasi dan navigasi utama', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Kenali Risiko Longsor di Sekitarmu' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link')).toHaveCount(5);
  for (const name of ['Mulai dari Mana?', 'Peta Longsor Indonesia', 'Informasi Kejadian Terbaru', 'Bagaimana LERENG Bekerja?', 'Mengenal Faktor Penyebab Longsor', 'Sumber Informasi Terpercaya']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByLabel('Cari wilayah atau koordinat').fill('-6.9, 107.6');
  await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click();
  await expect(page).toHaveURL(/\/peta\?lat=-6.9&lng=107.6/);
  await expect(page.getByText('-6.90000° , 107.60000°')).toBeVisible();
});

test('peta, lapisan, pencarian, tema dan layar penuh', async ({ page }) => {
  await page.goto('/peta');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  expect((await page.getByTestId('map').boundingBox())!.height).toBeGreaterThan(500);
  await expect(page.getByLabel('Pengaturan peta', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Pengaturan Peta', exact: true }).click();
  for (const name of ['Riwayat Kejadian', 'Batas Wilayah']) { await page.getByRole('checkbox', { name }).uncheck(); await expect(page.getByRole('checkbox', { name })).not.toBeChecked(); await page.getByRole('checkbox', { name }).check(); }
  await page.getByLabel('Opasitas kejadian').fill('0.5');
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Pengaturan Peta', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Perbesar peta' }).click(); await page.getByRole('button', { name: 'Perkecil peta' }).click(); await page.getByRole('button', { name: 'Kembali ke Indonesia' }).click();
  await page.getByLabel('Cari wilayah atau koordinat').fill('-6.9, 107.6'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click();
  await expect(page.getByRole('complementary', { name: 'Informasi lokasi terpilih' })).toBeVisible(); await expect(page.getByText('-6.90000° , 107.60000°')).toBeVisible(); await expect(page.getByRole('heading', { name: 'Kerawanan belum diketahui' })).toBeVisible();
  await page.getByRole('button', { name: 'Aktifkan tema gelap' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); await page.getByRole('button', { name: 'Aktifkan tema terang' }).click();
  await page.getByRole('button', { name: 'Layar penuh peta' }).click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true); await page.getByRole('button', { name: 'Layar penuh peta' }).click();
});

test('pencarian provinsi dan kesalahan koordinat dijelaskan', async ({ page }) => {
  await page.goto('/peta');
  await page.getByLabel('Cari wilayah atau koordinat').fill('0, 0'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click(); await expect(page.getByRole('alert').filter({ hasText: 'Koordinat berada' })).toContainText('di luar cakupan Indonesia');
  await expect.poll(() => page.locator('datalist option').count()).toBeGreaterThan(0);
  await page.getByLabel('Cari wilayah atau koordinat').fill('Jawa Barat'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click(); await expect(page.getByRole('complementary', { name: 'Informasi lokasi terpilih' })).toBeVisible();
  await expect(page.locator('.search-error')).toHaveCount(0); await expect(page.getByRole('heading', { name: 'Jawa Barat', exact: true })).toBeVisible();
});

test('kartu kejadian, filter, pagination, detail, tautan peta dan ekspor', async ({ page }) => {
  await page.goto('/kejadian'); await expect(page.locator('.incident-results .incident-card').first()).toBeVisible();
  await page.getByText('Saring wilayah & tanggal', { exact: true }).click();
  await page.getByLabel('Tanggal awal', { exact: true }).fill('2099-01-01'); await expect(page.getByText('Belum ada catatan untuk pilihan ini').first()).toBeVisible();
  await page.getByRole('button', { name: 'Hapus filter' }).click(); await expect(page.locator('.incident-results .incident-card').first()).toBeVisible();
  await page.getByLabel('Tanggal awal', { exact: true }).fill('2021-01-01'); await page.getByLabel('Tanggal akhir', { exact: true }).fill('2020-01-01'); await expect(page.getByRole('alert').filter({ hasText: 'Tanggal akhir' })).toBeVisible(); await expect(page.getByRole('button', { name: 'Ekspor GeoJSON' })).toBeDisabled(); await page.getByRole('button', { name: 'Hapus filter' }).click();
  await page.getByRole('button', { name: 'Berikutnya', exact: true }).click(); await expect(page.getByText('Halaman 2')).toBeVisible();
  await page.getByRole('button', { name: 'Baca detail', exact: true }).first().click(); await expect(page.getByRole('heading', { name: 'Detail kejadian', exact: true })).toBeVisible(); await expect(page.getByRole('link', { name: 'Buka laporan sumber' })).toHaveAttribute('href', /^https?:/);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Ekspor GeoJSON' }).click(); expect((await download).suggestedFilename()).toContain('geojson');
  await page.locator('.incident-results').getByRole('link', { name: 'Lihat di peta' }).first().click(); await expect(page).toHaveURL(/\/peta\?.*incident=/); await expect(page.getByRole('region', { name: 'Detail kejadian', exact: true })).toBeVisible();
});

test('AI jujur, metodologi opsional dan sumber tetap tersedia', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/prediksi-ai'); await expect(page.getByRole('heading', { level: 1, name: 'Prediksi Potensi Longsor dengan AI' })).toBeVisible(); await expect(page.getByRole('heading', { name: 'Prediksi AI Belum Tersedia' })).toBeVisible();
  const availability = (await page.locator('.ai-early-status').boundingBox())!; expect(availability.y + availability.height).toBeLessThan(844);
  await expect(page.getByLabel('Horizon penelitian')).not.toBeVisible(); await page.getByText('Pelajari metode & kesiapan penelitian', { exact: true }).click(); await page.getByLabel('Horizon penelitian').selectOption('72'); await expect(page.getByText('Pilihan 72 jam adalah konfigurasi', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Periksa kesiapan sumber data' }).click(); await expect(page.getByRole('heading', { name: 'Kenali sumbernya, pahami batasnya' })).toBeVisible(); await expect(page.locator('.source-row').first()).toBeVisible();
});

test('preferensi peta bertahan antarhalaman dan setelah muat ulang', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 }); await page.goto('/pengaturan');
  await page.getByLabel('Peta dasar pengaturan').selectOption('topographic'); await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: 'Jelajahi Peta' }).click();
  await page.getByRole('button', { name: 'Pengaturan Peta', exact: true }).click(); await expect(page.getByLabel('Pilih peta dasar')).toHaveValue('topographic');
  await page.reload(); await page.getByRole('button', { name: 'Pengaturan Peta', exact: true }).click(); await expect(page.getByLabel('Pilih peta dasar')).toHaveValue('topographic');
  await page.getByLabel('Pilih peta dasar').selectOption('streets'); await page.goto('/pengaturan'); await expect(page.getByLabel('Peta dasar pengaturan')).toHaveValue('streets');
});

test('menu telepon, bottom sheet dan layout tanpa overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/');
  await page.getByRole('button', { name: 'Buka menu' }).click(); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Buka menu' })).toBeFocused();
  await page.getByRole('button', { name: 'Buka menu' }).click(); await page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link', { name: 'Jelajahi Peta' }).click();
  await page.getByLabel('Cari wilayah atau koordinat').fill('-6.9, 107.6'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click();
  const sheet = page.getByRole('complementary', { name: 'Informasi lokasi terpilih' }); await expect(sheet).toBeVisible(); const map = (await page.getByTestId('map').boundingBox())!; const box = (await sheet.boundingBox())!; expect(box.y).toBeGreaterThan(map.y + map.height / 3);
  await sheet.getByRole('button', { name: 'Informasi Longsor di Lokasi Ini' }).click(); await expect(sheet.getByRole('heading', { name: 'Kerawanan belum diketahui' })).not.toBeVisible(); await sheet.getByRole('button', { name: 'Informasi Longsor di Lokasi Ini' }).click(); await expect(sheet.getByRole('heading', { name: 'Kerawanan belum diketahui' })).toBeVisible();
  for (const width of [390, 768, 1280]) { await page.setViewportSize({ width, height: 900 }); for (const route of ['/', '/peta', '/kejadian', '/prediksi-ai', '/tentang', '/lingkungan', '/sumber-data', '/pengaturan', '/kerawanan', '/analisis']) { await page.goto(route); await expect(page.locator('h1')).toHaveCount(1); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${route} at ${width}`).toBe(true); } }
});

test('kegagalan layanan dan loading tidak menghasilkan catatan pengganti', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/incidents?**', async route => { await gate; await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ data: [], meta: { availability: 'unavailable', message: 'Basis data uji tidak tersedia.' } }) }); });
  await page.goto('/kejadian'); await expect(page.getByRole('status').filter({ hasText: 'Sedang menyiapkan informasi' })).toBeVisible(); release();
  await expect(page.getByRole('alert').filter({ hasText: 'Basis data uji tidak tersedia.' })).toBeVisible(); await expect(page.locator('.incident-results .incident-card')).toHaveCount(0); await expect(page.getByRole('button', { name: 'Ekspor GeoJSON' })).toBeDisabled();
});

test('geolokasi atas izin dan informasi yang tidak tersedia', async ({ browser }) => {
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: { longitude: 107.6, latitude: -6.9 } }); const page = await context.newPage();
  await page.goto('/peta'); await expect(page.locator('canvas')).toBeVisible(); await page.getByRole('button', { name: 'Lokasi saya' }).click(); await expect(page.getByText('-6.90000° , 107.60000°')).toBeVisible(); await context.close();
});

test('filter cuaca memakai identitas sumber tanpa membatasi provinsi ke titik pusat', async ({ page }) => {
  await page.goto('/lingkungan'); await page.getByText('Pilih wilayah & waktu', { exact: true }).click();
  await expect(page.getByLabel('Pilih provinsi').locator('option', { hasText: 'Jawa Barat' })).toHaveCount(1);
  const request = page.waitForRequest(request => { const url = new URL(request.url()); return url.pathname === '/api/weather/forecasts' && url.searchParams.get('province') === 'West Java'; });
  await page.getByLabel('Pilih provinsi').selectOption('Jawa Barat'); const url = new URL((await request).url()); expect(url.searchParams.has('lng')).toBe(false); expect(url.searchParams.has('lat')).toBe(false);
});
