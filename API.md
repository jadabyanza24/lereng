# API LERENG

Base URL lokal `http://localhost:3000/api`. GET publik read-only. Envelope:

```json
{"data": [], "meta": {"availability": "empty", "retrieved_at": "waktu-respons-ISO"}}
```

Contoh `retrieved_at` di atas adalah placeholder. Timestamp envelope adalah waktu respons, **bukan waktu pengambilan sumber**; gunakan field retrieved_at pada record dan last_success_at sumber untuk provenance aktual.

Kesalahan parameter HTTP 400, endpoint tidak ada 404, rate limit 429 + Retry-After, database unavailable 503. Kegagalan DB tidak menyamar sebagai array kosong. GET sukses cache 30 detik, SWR 60 detik. Rate limit memory 180 request/menit/bucket proses; produksi gunakan gateway/Redis.

## Filter bersama

`from`, `to`: ISO YYYY-MM-DD, inklusif menurut UTC; `province`: nama sumber exact match; `q`: maks 150 karakter; `status`: official/media_reported/unverified; `bbox`: west,south,east,north EPSG:4326; `limit`: 1–2000 (default 500); `offset`: 0–100000; `lng`,`lat`: pasangan koordinat dalam envelope Indonesia; `radius`: meter 1–200000, default 50000. Bbox dan nearby filter dapat digabung. Invalid calendar dates ditolak.

| Endpoint | Isi |
|---|---|
| GET /health | Status koneksi PostGIS; 503 jika gagal |
| GET /regions?q=Jawa&limit=100 | Nama, id, level, bbox dan point-on-surface untuk navigasi wilayah; bukan lokasi kejadian |
| GET /regions?format=geojson | FeatureCollection batas tersimpan, di envelope data |
| GET /incidents | Record kejadian paginasi, total, limit, offset, has_more |
| GET /incidents/nearby?lng=107&lat=-7&radius=50000 | Sama dengan filter ST_DWithin geography dalam meter |
| GET /analytics | Total, located, reported fatalities/injuries, province/month/year grouping dengan filter kejadian bersama |
| GET /location?lng=107&lat=-7 | Region yang meliputi titik dan kelas susceptibility resmi yang benar-benar tersimpan |
| GET /weather/observations | Pengamatan tersimpan; kosong bila belum diimpor |
| GET /weather/forecasts | Prakiraan yang masih berlaku, issuance terbaru per desa; filter bbox/nearby |
| GET /weather/warnings | Peringatan CAP yang sedang berlaku; filter bbox/nearby |
| GET /susceptibility | Saat ini array kosong dan penjelasan bahwa peta resmi belum tersedia |
| GET /layers | Metadata semua kandidat layer, source, resolution, last_updated, legend, availability, limitations |
| GET /news | Metadata berita tersimpan, q dan pagination; unverified bukan event resmi |
| GET /sources | Registri, lisensi, limitations, ingestion status dan freshness |
| GET /ai/status | Structured model_unavailable |
| GET /ai/metadata | Kontrak metadata tanpa model rekaan |
| POST /ai/predict | Memvalidasi body, lalu 503 model_unavailable, predicted_value=null |

```sh
curl 'http://localhost:3000/api/incidents?bbox=105,-9,115,-5&from=2010-01-01&to=2018-12-31&limit=25'
curl 'http://localhost:3000/api/analytics?province=Jawa%20Barat'
curl -X POST http://localhost:3000/api/ai/predict -H 'Content-Type: application/json' -d '{"geographic_unit":"unit-penelitian","horizon_hours":24}'
```

`geographic_unit` pada contoh adalah identitas request penelitian, bukan grid resmi yang sudah divalidasi. `/ai/predict` tidak menerima fitur atau probability buatan dari browser.

## FastAPI terpisah

`http://localhost:8000/health`, `/models/status`, `/models/metadata`, `POST /predict`, OpenAPI `/docs`. Body predict sama seperti Next.js. Model tidak tersedia -> 503; request invalid -> 422 sesuai FastAPI. Tidak ada endpoint training publik. Kontrak inference berisi model_version, issued_at, geographic_unit, horizon_hours, predicted_value, uncertainty, input_freshness, limitations; field yang belum dapat dihitung bernilai null.
