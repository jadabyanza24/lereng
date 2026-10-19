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

### Peta dasar

- OpenStreetMap: https://tile.openstreetmap.org/{z}/{x}/{y}.png, ODbL untuk data, kebijakan tile https://operations.osmfoundation.org/policies/tiles/. Jangan bulk download atau prefetch. Atribusi tetap terlihat.
- OpenTopoMap: https://tile.opentopomap.org/{z}/{x}/{y}.png, atribusi OpenStreetMap/SRTM dan OpenTopoMap, CC-BY-SA. https://opentopomap.org/about
- Penyedia publik untuk penggunaan lokal/evaluasi; produksi perlu penyedia tile dengan kapasitas dan syarat yang sesuai. OpenTopoMap adalah basemap, **bukan** raster elevasi/slope analitik.

## Sumber terverifikasi sebagai portal tetapi belum diintegrasikan

| Instansi/sumber | Akses diperiksa | Hasil/kendala | Lisensi dan tindakan |
|---|---|---|---|
| BNPB GIS | https://gis.bnpb.go.id/arcgis/rest/services?f=pjson | HTTP 500 | Izin redistribusi/endpoint layer historis belum terverifikasi; tidak ada ingest data BNPB |
| BNPB RSS | https://bnpb.go.id/berita/rss | HTTP 403 | Tidak melewati blokir; tidak scrape halaman sebagai pengganti |
| MAGMA/PVMBG | https://magma.esdm.go.id/ dan tautan gerakan tanah aktual | Portal publik tersedia | Belum ada WMS/WFS/download susceptibility berlisensi terverifikasi; lapisan dinonaktifkan |
| BIG | https://tanahair.indonesia.go.id/ -> /portal-web/ | Portal ditemukan | Perlu endpoint dan lisensi per dataset batas/DEM; belum ada ingest |
| Pengamatan hujan BMKG | Dokumentasi prakiraan tersedia, pengamatan terpisah belum ditemukan | Tidak terintegrasi | Jangan menamai prakiraan sebagai observasi |
| Geologi, tanah, tutupan lahan, DEM | Tidak ada dataset per-piksel terverifikasi diimpor | Belum tersedia | Metodologi harmonisasi siap, tidak ada fitur dihitung tanpa input |

## Berita

Adaptor RSS metadata tersedia tetapi **tidak ada penerbit otomatis aktif**. Operator wajib menyediakan URL nyata yang diizinkan, identitas lisensi dan konfirmasi izin. Jangan menjadikan `robots.txt` atau akses HTTP 200 sebagai bukti izin redistribusi. Berita tetap unverified, tanggal terbit dan retrieval berbeda. Penyebutan geografis tidak berarti koordinat kejadian; tidak ada geocoding centroid ke titik pasti.

## Bukti ingest dan kesegaran

Jalankan `SELECT source_id,status,record_count,started_at,finished_at,error FROM ingestion_runs ORDER BY id;`. Hanya keberhasilan adaptor mengubah `last_success_at`. Endpoint `/api/sources` memberi last_attempt_at, last_success_at, status dan freshness turunan. HTTP 200 tanpa validasi struktur bukan keberhasilan. `not_ingested` berbeda dari `unavailable`, dan data usang tetap disimpan dengan penandaan kesegaran.
