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
  await expect(page.getByRole('heading', { level: 1, name: 'Kenali lereng di sekitar Anda.' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('link')).toHaveCount(5);
  for (const name of ['Mulai dari Mana?', 'Peta Longsor Indonesia', 'Catatan terbaru dalam katalog', 'Bagaimana LERENG Bekerja?', 'Mengenal Faktor Penyebab Longsor', 'Sumber Informasi Terpercaya']) await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await page.getByLabel('Cari wilayah atau koordinat').fill('-6.9, 107.6');
  await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click();
  await expect(page).toHaveURL(/\/peta\?lat=-6.9&lng=107.6/);
  await expect(page.getByText('-6.90000° , 107.60000°')).toBeVisible();
});

test('peta, lapisan, pencarian, tema dan layar penuh', async ({ page }) => {
  await page.goto('/peta');
  await expect(page.locator('canvas.maplibregl-canvas')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Keterangan peta', exact: true })).toBeVisible();
  await expect(page.locator('.map-legend-items')).toContainText('Resmi');
  await expect(page.locator('.map-legend summary')).toHaveCount(0);
  await page.locator('.map-attribution > summary').click();
  await expect(page.getByRole('link', { name: 'OpenStreetMap contributors' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
  await page.locator('.map-attribution > summary').click();
  await expect(page.locator('.map-first-hint')).toHaveCount(0);
  expect((await page.getByTestId('map').boundingBox())!.height).toBeGreaterThan(500);
  await expect(page.getByLabel('Pengaturan peta', { exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: 'Pengaturan Peta', exact: true }).click();
  for (const name of ['Wilayah Rawan Longsor', 'Riwayat Kejadian', 'Batas Wilayah']) { await page.getByRole('checkbox', { name }).uncheck(); await expect(page.getByRole('checkbox', { name })).not.toBeChecked(); await page.getByRole('checkbox', { name }).check(); }
  await page.getByLabel('Opasitas kejadian').fill('0.5');
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Pengaturan Peta', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Perbesar peta' }).click(); await page.getByRole('button', { name: 'Perkecil peta' }).click(); await page.getByRole('button', { name: 'Kembali ke Indonesia' }).click();
  await page.getByLabel('Cari wilayah atau koordinat').fill('-6.9, 107.6'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click();
  const location = page.getByRole('complementary', { name: 'Informasi lokasi terpilih' });
  await expect(location).toBeVisible(); await expect(page.getByText('-6.90000° , 107.60000°')).toBeVisible(); await expect(location.getByRole('heading', { name: /Zona Kerentanan|Kerawanan belum diketahui/ })).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: 'Aktifkan tema gelap' }).click(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark'); await page.getByRole('button', { name: 'Aktifkan tema terang' }).click();
  await page.getByRole('button', { name: 'Layar penuh peta' }).click(); await expect.poll(() => page.evaluate(() => !!document.fullscreenElement)).toBe(true); await page.getByRole('button', { name: 'Layar penuh peta' }).click();
});

test('pencarian provinsi dan kesalahan koordinat dijelaskan', async ({ page }) => {
  await page.goto('/peta');
  await page.getByLabel('Cari wilayah atau koordinat').fill('0, 0'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click(); await expect(page.getByRole('alert').filter({ hasText: 'Koordinat berada' })).toContainText('di luar cakupan Indonesia');
  await page.getByLabel('Cari wilayah atau koordinat').fill('Jawa Barat'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click(); await expect(page.getByRole('complementary', { name: 'Informasi lokasi terpilih' })).toBeVisible();
  await expect(page.locator('.search-error')).toHaveCount(0); await expect(page.getByRole('complementary', { name: 'Informasi lokasi terpilih' }).getByRole('heading', { name: 'Jawa Barat', exact: true })).toBeVisible({ timeout: 15000 });
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
  await expect(page.locator('.map-main')).toBeVisible();
  await page.getByLabel('Cari wilayah atau koordinat').fill('-6.9, 107.6'); await page.getByRole('button', { name: 'Cari lokasi', exact: true }).click();
  const sheet = page.getByRole('complementary', { name: 'Informasi lokasi terpilih' }); await expect(sheet).toBeVisible(); const map = (await page.getByTestId('map').boundingBox())!; const box = (await sheet.boundingBox())!; expect(box.y).toBeGreaterThan(map.y + map.height / 3);
  await sheet.getByRole('button', { name: 'Informasi Longsor di Lokasi Ini' }).click(); await expect(sheet.getByRole('heading', { name: /Zona Kerentanan|Kerawanan belum diketahui/ })).not.toBeVisible(); await sheet.getByRole('button', { name: 'Informasi Longsor di Lokasi Ini' }).click(); await expect(sheet.getByRole('heading', { name: /Zona Kerentanan|Kerawanan belum diketahui/ })).toBeVisible();
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

test('label daerah mengikuti tema, cursor hanya menggenggam saat drag, dan titik pilihan berpindah lalu hilang saat ditutup', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/incidents?**', route => route.fulfill({ json: { data: [], meta: { total: 0 } } }));
  const labelTiles: string[] = [];
  page.on('request', request => { if (request.url().includes('tiles.openfreemap.org/')) labelTiles.push(request.url()); });
  await page.goto('/peta');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(page.getByTestId('map')).toHaveAttribute('data-map-loaded', 'true', { timeout: 20000 });
  await expect.poll(() => labelTiles.some(url => url.includes('/fonts/'))).toBe(true);
  const box = (await canvas.boundingBox())!;
  const x = box.x + box.width * 0.6, y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await expect(canvas).toHaveCSS('cursor', 'default');
  await page.mouse.down();
  await page.mouse.move(x + 50, y + 30, { steps: 5 });
  await expect(canvas).toHaveCSS('cursor', 'grabbing');
  await page.mouse.up();
  await expect(canvas).toHaveCSS('cursor', 'default');
  await expect(page.locator('.selected-map-point')).toHaveCount(0);
  await page.mouse.click(x, y);
  const marker = page.getByRole('img', { name: /^Titik dipilih:/ });
  await expect(marker).toBeVisible();
  const firstLabel = await marker.getAttribute('aria-label');
  const markerBox = (await marker.boundingBox())!;
  expect(Math.abs(markerBox.x + markerBox.width / 2 - x)).toBeLessThan(2);
  expect(Math.abs(markerBox.y + markerBox.height / 2 - y)).toBeLessThan(2);
  await page.mouse.click(x + 80, y + 60);
  await expect(marker).not.toHaveAttribute('aria-label', firstLabel!);
  await expect(page.locator('.selected-map-point')).toHaveCount(1);
  await page.getByRole('button', { name: 'Aktifkan tema gelap' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(marker).toBeVisible();
  await page.getByRole('button', { name: 'Tutup informasi lokasi' }).click();
  await expect(marker).toHaveCount(0);
});

test('hover titik dan cluster memberi cursor, ringkasan aman, dan hilang saat keluar', async ({ browser, request }) => {
  test.setTimeout(90000);
  const incident = (await (await request.get('/api/incidents?limit=1')).json()).data[0];
  const context = await browser.newContext({ permissions: ['geolocation'], geolocation: { longitude: 120, latitude: -2 }, viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  let clustered = false;
  const title = 'Catatan uji <img src=x onerror=alert(1)>';
  await page.route('**/api/incidents?**', route => route.fulfill({ json: { data: Array.from({ length: clustered ? 3 : 1 }, (_, index) => ({ ...incident, id: `hover-test-${index}`, title, longitude: 120, latitude: -2 })), meta: { total: clustered ? 3 : 1 } } }));
  await page.goto('/peta');
  const canvas = page.locator('canvas.maplibregl-canvas');
  await expect(page.getByTestId('map')).toHaveAttribute('data-map-loaded', 'true', { timeout: 20000 });
  await page.getByRole('button', { name: 'Lokasi saya' }).click();
  await expect(page.getByText('-2.00000° , 120.00000°')).toBeVisible();
  const hoverCenter = async () => {
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2 + 70, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  };
  await expect(async () => { await hoverCenter(); await expect(page.getByRole('tooltip')).toContainText(title); }).toPass({ timeout: 15000 });
  await expect(canvas).toHaveCSS('cursor', 'pointer');
  await expect(page.getByRole('tooltip').locator('img')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(canvas).not.toHaveCSS('cursor', 'pointer');
  clustered = true;
  await page.reload();
  await expect(page.getByTestId('map')).toHaveAttribute('data-map-loaded', 'true', { timeout: 20000 });
  await page.getByRole('button', { name: 'Lokasi saya' }).click();
  await expect(page.getByText('-2.00000° , 120.00000°')).toBeVisible();
  await expect(async () => { await hoverCenter(); await expect(page.getByRole('tooltip')).toContainText('3 catatan di area ini', { timeout: 1000 }); }).toPass({ timeout: 15000 });
  await expect(canvas).toHaveCSS('cursor', 'pointer');
  await page.mouse.move(10, 10);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await expect(page.locator('.map-first-hint')).toHaveCount(0);
  await context.close();
});

test('kontrol konsisten, animasi panel aktif dan reduced motion menghentikannya', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/peta');
  await page.getByRole('button', { name: 'Pengaturan Peta', exact: true }).click();
  await expect(page.getByLabel('Pengaturan peta', { exact: true })).toHaveCSS('animation-name', 'panel-enter');
  const select = page.getByLabel('Pilih peta dasar');
  await expect(select).toHaveCSS('appearance', 'none');
  await select.selectOption('topographic');
  await expect(select).toHaveValue('topographic');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.getByLabel('Pengaturan peta', { exact: true })).toHaveCSS('animation-name', 'none');
  await page.goto('/pengaturan');
  await expect.poll(() => page.evaluate(() => document.getAnimations().filter(animation => animation.playState === 'running').length)).toBe(0);
  await expect(page.getByLabel('Peta dasar pengaturan')).toHaveValue('topographic');
});

test('indeks mengikuti pencarian, pilihan tambahan tersedia dan jumlah nol tidak diganti', async ({ page }) => {
  let releaseRegions!: () => void;
  const regionsReady = new Promise<void>(resolve => { releaseRegions = resolve; });
  await page.route('**/api/regions?**', async route => { await regionsReady; await route.continue(); });
  await page.route('**/api/analytics**', route => route.fulfill({ json: { data: { total: 0, located: 0, fatalities: 0, injuries: 0, provinces: [], years: [] } } }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.orientation-summary')).toContainText('0 catatan dalam katalog');
  await expect(page.locator('.orientation-geography')).toHaveAttribute('aria-label', /Cari atau fokuskan pilihan cepat/);
  await page.getByRole('button', { name: 'Jawa Barat', exact: true }).focus();
  await expect(page.locator('.orientation-geography')).toHaveAttribute('aria-label', /Jawa Barat ditandai sebagai pilihan/);
  await page.getByLabel('Cari wilayah atau koordinat').fill('Jawa Tengah');
  await expect(page.locator('.orientation-geography')).toHaveAttribute('aria-label', /Jawa Tengah ditandai sebagai pilihan, bukan kelas bahaya/);
  const searchButton = await page.getByRole('button', { name: 'Cari lokasi', exact: true }).boundingBox();
  expect(searchButton!.y + searchButton!.height).toBeLessThan(844);
  await page.getByRole('combobox', { name: 'Cari wilayah atau koordinat' }).press('Escape');
  await page.getByText('Wilayah lain', { exact: true }).click();
  await page.getByRole('button', { name: 'Sumatera Barat', exact: true }).click();
  await expect(page).toHaveURL(/\/peta\?q=Sumatera%20Barat/);
  const loaded = page.waitForResponse(response => new URL(response.url()).pathname === '/api/regions');
  releaseRegions();
  await loaded;
  await expect(page.getByRole('complementary', { name: 'Informasi lokasi terpilih' })).toBeVisible({ timeout: 15000 });
});

test('kabupaten dan kota dibedakan, rekomendasi dapat dipilih dengan keyboard dan deep link bertahan', async ({ page, request }) => {
  const response = await request.get('/api/places?q=Bandung&limit=8');
  expect(response.status()).toBe(200);
  const names = (await response.json()).data.map((place: { name: string }) => place.name);
  expect(names).toEqual(expect.arrayContaining(['Kota Bandung', 'Kabupaten Bandung', 'Kabupaten Bandung Barat']));
  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Cari wilayah atau koordinat' });
  await input.fill('Kota Bandung');
  await expect(page.getByRole('option', { name: 'Kota Bandung Jawa Barat' })).toBeVisible();
  await input.press('ArrowDown');
  await expect(input).toHaveAttribute('aria-activedescendant', /option-/);
  await input.press('Enter');
  await expect(page).toHaveURL(/\/peta\?place=adm2/);
  await expect(page.getByRole('heading', { name: 'Kota Bandung', exact: true })).toBeVisible();
  await expect(page.getByText(/Titik representatif untuk orientasi/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Kota Bandung', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'Cari wilayah atau koordinat' }).fill('Kabupaten Sleman');
  await page.getByRole('option', { name: 'Kabupaten Sleman Daerah Istimewa Yogyakarta' }).click();
  await expect(page.getByRole('heading', { name: 'Kabupaten Sleman', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  const legend = page.getByRole('group', { name: 'Keterangan peta', exact: true });
  await expect(legend).toBeVisible();
  const box = (await legend.boundingBox())!;
  expect(Math.abs(box.x + box.width / 2 - 195)).toBeLessThan(2);
  const sheet = (await page.getByRole('complementary', { name: 'Informasi lokasi terpilih' }).boundingBox())!;
  expect(sheet.y + sheet.height).toBeLessThanOrEqual(box.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('rekomendasi memiliki keadaan kosong, gagal, Escape, dan logo mengikuti tema', async ({ page }) => {
  await page.goto('/');
  const input = page.getByRole('combobox', { name: 'Cari wilayah atau koordinat' });
  await input.fill('wilayah-tidak-ada-123');
  await expect(page.getByText('Wilayah tidak ditemukan. Coba nama lain atau koordinat.')).toBeVisible();
  await input.press('Escape');
  await expect(input).toHaveAttribute('aria-expanded', 'false');
  await page.route('**/api/places?**', route => route.fulfill({ status: 503, json: { data: null } }));
  await input.fill('Bogor');
  await expect(page.getByText('Rekomendasi belum bisa dimuat. Coba lagi atau gunakan koordinat.')).toBeVisible({ timeout: 10000 });
  await input.press('Escape');
  const header = page.locator('.public-header');
  await expect(header.locator('.brand-logo-light')).toBeVisible();
  await expect(header.locator('.brand-logo-dark')).toBeHidden();
  await page.getByRole('button', { name: 'Aktifkan tema gelap' }).click();
  await expect(header.locator('.brand-logo-dark')).toBeVisible();
  await expect(header.locator('.brand-logo-light')).toBeHidden();
});
