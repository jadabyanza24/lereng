# LERENG

**Landslide Early Risk & Event Navigation Geoportal**. Situs informasi longsor Indonesia untuk mengenali wilayah, menelusuri riwayat kejadian, dan memahami asal informasinya. Ini fondasi penelitian yang dapat dijalankan, **bukan sistem peringatan dini operasional**.

Antarmuka publik: Beranda, [Jelajahi Peta](http://localhost:3000/peta), Kejadian Longsor, Prediksi AI, dan Tentang LERENG. Sumber, kondisi lingkungan, pengaturan serta metode tetap tersedia sebagai informasi sekunder. Lihat [UI_REDESIGN.md](UI_REDESIGN.md) untuk perubahan frontend, fungsi yang dipertahankan, dan hasil pengujian terbaru.

## Menjalankan secara lokal

Prasyarat: Node.js 24 LTS atau versi kompatibel Next.js 16 (>=20.9), npm, PostgreSQL 17/18 + PostGIS 3.5+, Python 3.12. Docker Compose adalah cara termudah menyediakan PostGIS.

```sh
cp .env.example .env
npm ci
docker compose up -d db
npm run db:migrate
npm run ingest
npm run dev
```

Buka http://localhost:3000. Sesuaikan `DATABASE_URL` jika memakai PostgreSQL yang sudah ada. Migrasi idempoten dan hanya menambah tabel milik LERENG, tidak menghapus data. Untuk produksi lokal: `npm run build && npm start`.

Workspace implementasi ini juga dapat memakai cluster native di `data/postgres`, port 55432, dengan konfigurasi lokal `.env` yang tidak dilacak Git. Cara menghentikan cluster tersebut: `pg_ctl -D data/postgres stop`. Jangan menyalin kredensial lokal ke produksi.

### Layanan AI

```sh
python3.12 -m venv .venv
.venv/bin/pip install -r ai/requirements.lock
.venv/bin/uvicorn ai.inference.app:app --host 127.0.0.1 --port 8000
```

Dokumentasi interaktif: http://localhost:8000/docs. `/predict` mengembalikan HTTP 503 `model_unavailable`; tidak ada bobot atau probabilitas palsu. `requirements.lock` mencatat lingkungan yang diuji, sedangkan `requirements.txt` adalah rentang dependensi untuk pembaruan terkontrol.

### Seluruh layanan dalam Compose

```sh
docker compose up --build
```

Menjalankan PostGIS, migrasi satu kali, web, worker terjadwal, dan FastAPI. Worker mengimpor dataset saat jatuh tempo. Volume `geodata` membagikan geometri batas dari worker ke web. Docker belum tentu tersedia di host pengembangan; periksa [VALIDATION.md](VALIDATION.md) untuk pengujian yang benar-benar dijalankan.

## Data nyata dan pembaruan

```sh
npm run ingest -- geoboundaries
npm run ingest -- nasa-glc
npm run ingest -- bmkg-forecast bmkg-cap
npm run worker
```

- NASA GLC diakses melalui salinan ArcGIS publik, **bukan BNPB**. Catatan berstatus laporan media; koordinat perkiraan dan nilai korban yang tidak diketahui tetap tidak diketahui.
- geoBoundaries ADM1 adalah batas 34 provinsi representasi 2017, **bukan batas resmi BIG saat ini**. Geometri disimpan di PostGIS dan cache `public/geodata/`.
- Prakiraan BMKG hanya untuk kode desa yang ditentukan `BMKG_ADM4`, pisahkan beberapa kode dengan koma. Default Kemayoran berasal dari contoh resmi BMKG; bukan cakupan prakiraan nasional.
- Peringatan CAP BMKG disimpan dengan waktu berlaku dan kedaluwarsa. API hanya mengembalikan peringatan yang masih berlaku. Tidak diubah menjadi peringatan longsor.
- BNPB, PVMBG, dan BIG dicatat di registri bersama kendala akses/lisensi. Tidak ada data pengganti rekaan.

Worker memeriksa kesegaran setiap menit, menggunakan frekuensi berbeda per sumber, backoff dan timeout. Kegagalan tercatat dan tidak menghentikan sumber lain. CLI satu kali mengembalikan exit code gagal jika ada sumber gagal. Lihat [DATA_SOURCES.md](DATA_SOURCES.md).

### Agregasi berita yang diizinkan

Tidak ada pengambilan teks penuh tanpa izin. Setelah operator memverifikasi RSS dan izin metadata penerbit:

```sh
NEWS_FEED_URL='https://penerbit-yang-diizinkan/feed' \
NEWS_LICENSE='Isi izin penggunaan yang telah diverifikasi' \
NEWS_METADATA_PERMISSION=true npm run ingest:news
```

URL di atas adalah **placeholder**, bukan endpoint terverifikasi. Adaptor menyimpan judul, tautan, ringkasan feed, tanggal terbit/pengambilan, kandidat penyebutan provinsi, dan kelompok judul duplikat. Semua artikel tetap `unverified`. Pencocokan kabupaten, deduplikasi semantik, dan pengaitan kejadian memerlukan tinjauan manusia; tidak ada auto-konfirmasi.

## Pengujian

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
# Jalankan web di terminal lain
npm run test:e2e
.venv/bin/python -m pytest ai/tests -q
```

Uji spasial memakai basis data yang ditunjuk `DATABASE_URL` dan membutuhkan data katalog sudah diimpor. Tanpa konfigurasi, uji ini dilaporkan dilewati, bukan diklaim berhasil. Fixture pengujian dibuat hanya dalam tes dan tidak pernah menjadi dataset produk.

## Cakupan dan batasan implementasi

Tersedia: map pan/zoom, pencarian provinsi/koordinat, geolokasi atas izin, dua peta dasar, lapisan batas/kejadian, opasitas, clustering, detail sumber, filter tanggal/provinsi/verifikasi, bounding-box dan nearby queries, daftar paginasi, ekspor halaman GeoJSON, analitik persisten, tema terang/gelap, registri sumber, API dan layanan penelitian AI.

Belum operasional: inventaris BNPB langsung, peta kerentanan resmi PVMBG, batas kabupaten, DEM/lereng/geologi/tutupan lahan, pengamatan hujan, vector tile service, heatmap/prediksi AI, kalibrasi dan validasi model, pencocokan berita-kejadian otomatis, antarmuka moderasi. Peta topografi dasar bukan pengganti analisis medan.

Keamanan produksi masih memerlukan TLS, rate limiter terdistribusi/reverse proxy, observabilitas terpusat, backup dan restore drill, peran basis data least-privilege, lisensi setiap dataset, serta pengujian beban. Tidak ada deployment atau push yang dilakukan.

## Dokumen

[Arsitektur](ARCHITECTURE.md) · [Sumber data](DATA_SOURCES.md) · [Metodologi](METHODOLOGY.md) · [Roadmap AI](AI_ROADMAP.md) · [Evaluasi model](MODEL_EVALUATION.md) · [API](API.md) · [Validasi](VALIDATION.md)
