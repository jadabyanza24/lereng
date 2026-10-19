# Registri dan verifikasi sumber data

Diperiksa langsung pada **19 Oktober 2026**. Waktu pemeriksaan endpoint bukan waktu publikasi data. Tidak ada akses kontrol yang dilewati. Ketersediaan berikut menggambarkan pemeriksaan implementasi, bukan SLA.

## Sumber yang diintegrasikan

### BMKG: prakiraan cuaca desa (resmi)

- Dokumentasi: https://data.bmkg.go.id/prakiraan-cuaca/
- API terverifikasi HTTP 200: `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.03.1001`
- JSON, 3 hari, interval 3 jam, pembaruan 2 kali/hari; maksimum 60 request/menit/IP. Atribusi BMKG wajib.
- Data disimpan sebagai **forecast**, bukan weather observation. `analysis_date` waktu penerbitan UTC, `datetime` waktu berlaku, `retrieved_at` waktu pengambilan lokal sistem.
- Hanya desa dalam BMKG_ADM4 diambil. Koordinat mewakili desa, bukan titik sensor. Tidak mengisi akumulasi hujan dari `tp` karena satuan/interval tidak didokumentasikan pada halaman API; suhu/kelembapan/kondisi cuaca digunakan sesuai dokumentasi.

### BMKG: peringatan dini cuaca CAP (resmi)

- Dokumentasi: https://data.bmkg.go.id/peringatan-dini-cuaca/
- RSS terverifikasi HTTP 200: https://www.bmkg.go.id/alerts/nowcast/id
- Tautan detail CAP hanya diambil dari feed, host/path BMKG dibatasi. Tidak mengarang kode detail.
- Feed menyatakan `public domain`; atribusi BMKG tetap wajib menurut dokumentasi. CAP menggunakan effective/expires/sent, geometri polygon format lat,lon diubah menjadi lon,lat EPSG:4326.
- Update setiap saat, pemeriksaan worker tiap 15 menit, detail dilajukan >=1,1 detik/request. Peringatan kedaluwarsa disimpan untuk provenance tetapi tidak ditampilkan sebagai aktif. Bukan peringatan longsor.

### NASA Global Landslide Catalog, salinan ArcGIS publik (laporan media)

- Item metadata dan izin: https://www.arcgis.com/sharing/rest/content/items/31f8fca315a5458a9800cfd102504257?f=json
- Layer terverifikasi HTTP 200: https://services1.arcgis.com/yFGHRCyBneULM8ci/arcgis/rest/services/nasa_global_landslide_catalog_point/FeatureServer/0
- Query terverifikasi: `/query?f=json&where=country_na%3D%27Indonesia%27&outFields=*&resultRecordCount=1000&orderByFields=FID&returnGeometry=false`
- Kolom pada salinan menggunakan nama terpotong (`country_na`, `event_titl`, `location_a`, `fatality_c`). Adaptor mengikuti skema yang benar-benar diperiksa, bukan endpoint Socrata lama.
- Metadata menyertakan **NASA GLC Permission to Use, Reproduce, and Distribute**. Izinnya perpetual/non-exclusive/no-charge dengan kewajiban menyertakan naskah izin, mempertahankan atribusi dan menandai modifikasi. Salinan izin disimpan di `public/geodata/nasa-glc-permission.txt` setelah ingest. Peta/ekspor memuat atribusi. Ini **salinan pihak ketiga**, bukan jaminan endpoint operasional NASA atau BNPB.
- Tidak menjamin pembaruan rutin; periksa mingguan. Catatan historis berbasis media, bias wilayah/bahasa/pelaporan dan duplikat lintas liputan mungkin ada. `location_a` dipertahankan; bukan koordinat terverifikasi lapangan.
- `event_date` dipertahankan sebagai tanggal kejadian; jam kejadian umumnya tidak tersedia. Tanggal submitted bukan tanggal terbit artikel, sehingga `published_at` tetap null. Original description/title/source URL tetap di raw JSON.
- Endpoint lama `https://data.nasa.gov/resource/dd9e-wu2v.json` mengembalikan 404; tidak dipakai. Host lama maps.nccs.nasa.gov tidak dapat dijangkau; tidak dipakai.

### geoBoundaries gbOpen ADM1 Indonesia (observasional, bukan BIG)

- Metadata API terverifikasi HTTP 200: https://www.geoboundaries.org/api/current/gbOpen/IDN/ADM1/
- File GeoJSON simplified diambil dari URL download aktual metadata, bukan URL dibentuk berdasarkan asumsi.
- Metadata: boundaryYearRepresented **2017**, **34** unit, boundarySource **OpenStreetMap, Wambacher**, ODbL 1.0; build 12 Desember 2023. Atribusi geoBoundaries / William & Mary dan OSM.
- https://www.openstreetmap.org/copyright dan https://www.geoboundaries.org/
- Cek bulanan; bukan batas hukum, tidak mencakup pemekaran provinsi terbaru. ADM2 belum diimpor. Metadata sumber disertakan pada setiap region dan `public/geodata/metadata.json`.

### PVMBG / Badan Geologi Kementerian ESDM: Zona Kerentanan Gerakan Tanah (ZKGT), tanggapan darurat, penyelidikan lapangan, SIGAB & MAGMA (resmi)

- **Zona Kerentanan Gerakan Tanah (ZKGT)**: Layanan WMS & GeoServer `GetFeatureInfo` resmi Portal Mitigasi Bencana Geologi (`https://vsi.esdm.go.id/data/api/public/geohazard/map-layer/wms`, layer `pmbgi:zkgt_indonesia`, kode sumber `pvmbg`) serta koridor kerentanan regional dari titik penyelidikan lapangan PVMBG. Menampilkan klasifikasi resmi (`Zona Kerentanan Tinggi`, `Zona Kerentanan Menengah`, `Zona Kerentanan Rendah`, `Zona Kerentanan Sangat Rendah`) beserta penjelasan geologi sumber.
- Tanggapan Kejadian Gerakan Tanah Terkini (2023–2026): `https://vsi.esdm.go.id/tanggapan-kejadian/apis/get` dan halaman detail `https://vsi.esdm.go.id/tanggapan-kejadian/{route}` (`pvmbg-tanggapan`).
- Katalog Penyelidikan Lapangan Gerakan Tanah & SIGAB (2008–2025): `https://vsi.esdm.go.id/portalmbg/api/get-field-reports` dan `https://vsi.esdm.go.id/portalmbg/api/sigab` (`pvmbg-penyelidikan`).
- Laporan Singkat Tanggapan Gerakan Tanah MAGMA Indonesia (2015–2023): `https://magma.esdm.go.id/v1/gerakan-tanah/tanggapan` (`pvmbg-magma`).
- Atribusi PVMBG / Badan Geologi Kementerian ESDM dan tautan sumber dipertahankan. Koordinat diekstrak dari atribut geospasial atau teks laporan penyelidikan resmi dan divalidasi dalam batas Indonesia (`[94..142, -12..7]`); laporan tanpa koordinat eksplisit tetap disimpan tanpa titik geometri (`geom = NULL`).

### BNPB: ringkasan rilis resmi & layanan GIS BNPB (resmi)

- Ringkasan fakta rilis resmi BNPB (2025–2026): `https://www.bnpb.go.id/berita` yang dikurasi pada `db/reviewed-releases.json` (`bnpb-releases`) dengan pemisahan ketat `occurred_on`, `published_at`, dan `reviewed_at` tanpa mengarang koordinat.
- Layanan ArcGIS REST GIS BNPB: `https://gis.bnpb.go.id/server/rest/services` (`Hosted/Join_Data_Harian_New/FeatureServer/8` dan `MV_Bansor_Sumatera_v4/MapServer/0`, `bnpb`).

### Peta dasar

- OpenStreetMap: https://tile.openstreetmap.org/{z}/{x}/{y}.png, ODbL untuk data, kebijakan tile https://operations.osmfoundation.org/policies/tiles/. Jangan bulk download atau prefetch. Atribusi tetap terlihat.
- OpenTopoMap: https://tile.opentopomap.org/{z}/{x}/{y}.png, atribusi OpenStreetMap/SRTM dan OpenTopoMap, CC-BY-SA. https://opentopomap.org/about
- Penyedia publik untuk penggunaan lokal/evaluasi; produksi perlu penyedia tile dengan kapasitas dan syarat yang sesuai. OpenTopoMap adalah basemap, **bukan** raster elevasi/slope analitik.

## Sumber terverifikasi sebagai portal tetapi belum diintegrasikan

| Instansi/sumber | Akses diperiksa | Hasil/kendala | Lisensi dan tindakan |
|---|---|---|---|
| BNPB RSS | https://bnpb.go.id/berita/rss | HTTP 403 | Tidak melewati blokir; kurasi rilis resmi dilakukan melalui `bnpb-releases` |
| BIG | https://tanahair.indonesia.go.id/ -> /portal-web/ | Portal ditemukan | Perlu endpoint dan lisensi per dataset batas/DEM; belum ada ingest |
| Pengamatan hujan BMKG | Dokumentasi prakiraan tersedia, pengamatan terpisah belum ditemukan | Tidak terintegrasi | Jangan menamai prakiraan sebagai observasi |
| Geologi, tanah, tutupan lahan, DEM | Tidak ada dataset per-piksel terverifikasi diimpor | Belum tersedia | Metodologi harmonisasi siap, tidak ada fitur dihitung tanpa input |

## Berita

Adaptor RSS metadata tersedia tetapi **tidak ada penerbit otomatis aktif**. Operator wajib menyediakan URL nyata yang diizinkan, identitas lisensi dan konfirmasi izin. Jangan menjadikan `robots.txt` atau akses HTTP 200 sebagai bukti izin redistribusi. Berita tetap unverified, tanggal terbit dan retrieval berbeda. Penyebutan geografis tidak berarti koordinat kejadian; tidak ada geocoding centroid ke titik pasti.

## Bukti ingest dan kesegaran

Jalankan `SELECT source_id,status,record_count,started_at,finished_at,error FROM ingestion_runs ORDER BY id;`. Hanya keberhasilan adaptor mengubah `last_success_at`. Endpoint `/api/sources` memberi last_attempt_at, last_success_at, status dan freshness turunan. HTTP 200 tanpa validasi struktur bukan keberhasilan. `not_ingested` berbeda dari `unavailable`, dan data usang tetap disimpan dengan penandaan kesegaran.
# Indeks pencarian kabupaten/kota

Pencarian `/api/places` memakai indeks lokal `src/server/places.json`: 34 provinsi dari referensi ADM1 yang sudah tersedia (2017), ditambah 519 unit ADM2 dari snapshot geoBoundaries IDN 2020. Ini bukan klaim jumlah kabupaten/kota terkini.

- ADM2: BPS, World Food Programme, OCHA ROAP melalui geoBoundaries gbOpen, boundary ID `IDN-ADM2-22746128`.
- Lisensi ADM2: **CC BY 3.0 IGO**. Sumber: https://data.humdata.org/dataset/indonesia-administrative-boundary-polygons-lines-and-places-levels-0-4b.
- Geometri versi tetap: https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09/releaseData/gbOpen/IDN/ADM2/geoBoundaries-IDN-ADM2_simplified.geojson.
- URL, hash SHA-256 dan keterbatasan tercatat di `public/geodata/place-metadata.json`.
- Bangun ulang: `npx tsx scripts/build-places.ts [file-geojson]`. Memerlukan PostGIS dan referensi ADM1 yang sudah diimpor; proses hanya membaca database. Hash sumber diverifikasi sebelum membuat indeks.
- Titik representatif memakai `ST_PointOnSurface`, bukan koordinat peristiwa. Pemilihan wilayah memperbesar bounding box; prakiraan/riwayat/kerentanan sekitar titik tidak mewakili seluruh wilayah. Provinsi induk mengikuti batas referensi 2017 terdekat, bukan pemekaran terbaru.
- Layanan tidak mengirim teks pencarian ke penyedia geocoding eksternal. Alamat jalan dan pencarian kecamatan/desa belum didukung.
