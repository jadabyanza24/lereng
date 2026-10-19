# Validasi implementasi LERENG

> Dokumen ini mencatat baseline implementasi sebelum redesign publik. Untuk hasil frontend terbaru (14 tes unit/integrasi, 11 tes browser, 32 capture responsif), lihat [UI_REDESIGN.md](UI_REDESIGN.md). Screenshot dan keputusan review di bawah adalah bukti versi dashboard terdahulu, bukan tampilan publik terbaru.

Tanggal pemeriksaan: **19 Oktober 2026**. Status: fondasi WebGIS lokal yang berjalan dengan data persisten, **bukan sistem peringatan dini atau model prediksi operasional**. Tidak ada push atau deployment.

## Lingkungan dan hasil pemeriksaan

Host macOS, Node.js 26.12.0, Python 3.12, PostgreSQL 18/PostGIS 3.6 native pada port 55432. Dockerfile menargetkan Node.js 24; kesetaraan container belum diuji karena Docker tidak tersedia pada host.

| Pemeriksaan | Hasil aktual |
|---|---|
| `npm run lint` | Lulus, tanpa temuan |
| `npm run typecheck` | Lulus |
| `npm test` | 13 lulus: 12 unit dan 1 integrasi PostGIS nyata; tidak ada yang dilewati |
| `npm run build` | Lulus, Next.js 16.4.2; delapan tujuan UI dan route API dihasilkan |
| `.venv/bin/python -m pytest ai/tests -q` | 5 lulus; satu peringatan deprecation Starlette/TestClient terkait httpx |
| `BASE_URL=http://localhost:3001 npm run test:e2e` | 6 lulus di Chromium terhadap server **build produksi** |
| `npm audit --omit=dev` | 0 kerentanan |
| `npm audit` | 5 advisori high pada rantai development `eslint-config-next` → plugin Next → fast-glob → micromatch → braces |
| Docker Compose | Belum dijalankan; Docker tidak tersedia |

Tidak menjalankan `npm audit fix --force`: saran otomatis menurunkan eslint-config-next ke major yang tidak sesuai. Audit penuh tetap merupakan kendala toolchain yang terbuka, bukan hasil lulus. Tidak ada klaim audit keamanan menyeluruh atau kesiapan produksi.

## Data yang benar-benar tersimpan

Hasil query langsung ke PostgreSQL setelah implementasi:

| Tabel | Jumlah | Makna |
|---|---:|---|
| `landslide_incidents` | 431 | Katalog historis NASA GLC melalui mirror ArcGIS; laporan media, bukan konfirmasi BNPB |
| `administrative_regions` | 34 | geoBoundaries ADM1, representasi 2017; bukan batas hukum BIG terkini |
| `weather_forecasts` | 19 | Interval prakiraan BMKG pada desa konfigurasi, bukan sensor hujan |
| `official_warnings` | 15 | Dokumen CAP BMKG tersimpan; bukan berarti 15 peringatan masih aktif |
| `weather_observations` | 0 | Pengamatan hujan belum diimpor |
| `ai_models` | 0 | Tidak ada model terlatih/tervalidasi yang diregistrasikan |

Empat ingestion run tercatat `success`: geoBoundaries selesai 10:01:10.967Z, NASA GLC 10:01:12.560Z, prakiraan BMKG 10:01:13.806Z, CAP BMKG 10:01:32.742Z pada tanggal pemeriksaan. Ini waktu ingest, bukan waktu publikasi sumber. Dataset dapat berubah pada impor berikutnya.

API produksi `/api/health` menghasilkan HTTP 200 dan `database: postgis`; `/api/analytics` menghasilkan total 431 dari basis data. Nilai korban adalah agregasi nilai yang dilaporkan katalog, bukan estimasi seluruh korban Indonesia. Tidak adanya laporan bukan bukti tidak adanya kejadian. Endpoint cuaca menyaring masa berlaku, sehingga dokumen tersimpan dapat lebih banyak daripada hasil aktif.

URL, lisensi, ketelitian lokasi, batas cakupan, dan hasil pemeriksaan akses dicatat di [DATA_SOURCES.md](DATA_SOURCES.md). Izin NASA yang diambil adaptor disimpan di `public/geodata/nasa-glc-permission.txt`. Waktu kejadian, publikasi jika diketahui, penerbitan prakiraan, dan retrieval dipisahkan; waktu publikasi yang tidak diketahui tetap null.

## Bukti pengujian

### Unit dan integrasi

- Normalisasi insiden mempertahankan nilai hilang, ketidakpastian, identitas stabil, provenance dan status `media_reported`; koordinat tidak valid tidak diganti lokasi rekaan.
- Validasi menolak bbox terbalik, tanggal tidak valid, rentang terbalik, pagination berlebihan, koordinat tidak lengkap, horizon tidak didukung dan kunci prediksi tambahan.
- Query spasial terparameterisasi; pengujian PostGIS memakai data nyata dan membandingkan hasil pencarian spasial/agregasi.
- Retry sumber eksternal dibatasi tiga percobaan, tanpa mengembalikan catatan pengganti.
- Metadata berita dibersihkan, kandidat wilayah dan kelompok judul ditentukan tanpa mengonfirmasi kejadian. Berita lain diabaikan; protokol/tanggal tidak valid ditolak. Fixture memakai example.org dan tidak menjadi konten produk.
- Python menguji fitur akumulasi hujan/kelengkapan, larangan data masa depan, pemisahan data dan kontrak inferensi yang tidak tersedia. Tidak ada pelatihan pada data operasional atau metrik validasi model nyata yang diklaim.

### Interaksi browser yang dijalankan

| Kontrol/alur | Hasil |
|---|---|
| Pemuatan dasbor | Canvas MapLibre terlihat; container peta lebih tinggi dari 300px |
| Checkbox kejadian dan batas | Dapat dimatikan dan diaktifkan kembali |
| Opasitas | Slider menerima nilai 0,5 |
| Zoom masuk/keluar dan kembali Indonesia | Tombol dapat dioperasikan |
| Pencarian `-6.9, 107.6` | Konteks menampilkan koordinat terpilih |
| Tema gelap lalu terang | Atribut tema dokumen berubah sesuai pilihan |
| Navigasi AI dan horizon 72 jam | Halaman menampilkan model belum tersedia dan pilihan target penelitian, tanpa prediksi |
| Navigasi sumber | Halaman transparansi sumber terbuka |
| Tanggal awal 2099 | Keadaan kosong muncul; hapus filter memulihkan daftar |
| Pagination | Tombol berikutnya menampilkan halaman 2 |
| Detail insiden | Tombol Lihat membuka detail kejadian |
| Ekspor | Menghasilkan unduhan GeoJSON halaman yang dimuat |
| Menu telepon | Membuka menu lalu navigasi ke halaman AI |
| Navigasi tablet | Kedelapan tautan ditemukan berdasarkan nama aksesibel; fokus memperlihatkan label rail |
| Pengaturan peta dasar | Pilihan topografi bertahan ke dasbor dan setelah reload; perubahan kembali ke OSM terbaca di pengaturan |
| Kegagalan API insiden (intersepsi khusus tes) | Pesan kesalahan terlihat, tidak ada baris pengganti, ekspor nonaktif |
| API prediksi | HTTP 503 `model_unavailable`, `predicted_value: null` |
| Parameter bbox/tanggal tidak valid | HTTP 400 |

Pemeriksaan visual tambahan memakai **konteks browser baru**, bukan hanya resize kamera desktop, pada 1440×1100 terang, 1440×1100 gelap, 390×844 telepon dan 768×1000 tablet. Keempatnya menghasilkan nol error console/page dan `scrollWidth === innerWidth`. Ukuran peta berturut-turut 866×490, 866×490, 356×470 dan 646×520 px.

Screenshot aktual tersedia di `.impeccable/review/desktop.png`, `dark.png`, `mobile.png`, `tablet.png`. Gambar merupakan capture aplikasi dengan data tersimpan dan tile penyedia beratribusi, bukan mockup atau gambar generatif. Review finish independen setelah perbaikan memberi keputusan **Ship** untuk cakupan UI yang ditinjau: dua masalah material, nama navigasi tablet dan persistensi peta dasar, terselesaikan. Reviewer membaca kode dan screenshot; hasil eksekusi browser di atas dijalankan agen implementasi, bukan diulang reviewer.

### Batas pembuktian UI

Tidak mengklaim seluruh kontrol atau WCAG telah diaudit secara menyeluruh. Izin geolokasi perangkat nyata, fullscreen lintas browser, klik seluruh cluster/titik, seluruh tautan penerbit eksternal, pembaca layar, matriks keyboard lengkap, kontras setiap teks di atas tile, dan kondisi jaringan semua penyedia belum diuji menyeluruh. Pengujian Chromium lokal bukan pengganti Safari/Firefox atau perangkat fisik.

Polish nonblocking hasil review: panel lapisan masih terbuka saat awal pada telepon; cluster belum menampilkan angka anggota; grafik tahunan memakai kategori tahun dan garis halus sehingga jarak antartahun bukan skala waktu proporsional. Tabel grafik menyediakan hitungan diskret sebenarnya; grafik tidak boleh ditafsirkan sebagai tren bahaya, cakupan lengkap, atau pengamatan kontinu.

## Kesiapan AI dan pekerjaan yang belum selesai

- FastAPI tersedia untuk kontrak/status dan mengembalikan model unavailable; endpoint Next.js juga fail-closed dan tidak meneruskan inferensi ke artefak tanpa persetujuan.
- Tersedia utilitas harmonisasi raster/CRS, fitur hujan dengan pemeriksaan ketersediaan waktu, manifest dataset, spatial-temporal holdout, pelatihan riset dan evaluasi. Ini kesiapan kode penelitian, bukan bukti model efektif.
- Belum ada pengamatan hujan memadai, label negatif yang dapat dipertanggungjawabkan, model terlatih tervalidasi, kalibrasi, tuning, promosi registry, atau integrasi inferensi operasional. Tidak ada probabilitas atau skor kerawanan buatan.
- BNPB GIS menghasilkan HTTP 500 dan RSS HTTP 403 pada pemeriksaan awal; tidak ada bypass akses. Endpoint unduhan/lisensi PVMBG dan BIG belum terintegrasi.
- Belum tersedia ADM2, kerentanan resmi, DEM/lereng/geologi/tutupan lahan analitik, vector tile service, moderasi berita, atau konfirmasi otomatis berita menjadi kejadian.
- Worker dan adaptor tersedia; ketahanan penjadwalan jangka panjang, skala multi-instance, backup/restore, TLS, observabilitas produksi dan uji beban belum dibuktikan. Rate limiter/cache masih per proses.

## Mengulang pemeriksaan

Ikuti [README.md](README.md) untuk instalasi, migrasi dan ingest. Dengan `.env` terisi dan PostgreSQL/PostGIS berjalan:

```sh
npm run lint
npm run typecheck
npm test
npm run build
# Terminal terpisah:
npm run start -- --port 3001
# Setelah server tersedia:
BASE_URL=http://localhost:3001 npm run test:e2e
.venv/bin/python -m pytest ai/tests -q
npm audit --omit=dev
```

Tanpa `DATABASE_URL`, uji integrasi dapat dilewati; jangan menyebut hasil tersebut sebagai integrasi lulus. Tes daftar dan ekspor mengharuskan katalog telah diimpor. Tes browser tidak melakukan ingest baru dan hasil data aktif mengikuti waktu berlaku sumber. Untuk development gunakan `http://localhost:3000`; resource dev Next.js pada host lain dapat memerlukan konfigurasi allowedDevOrigins.
