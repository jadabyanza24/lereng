# Kesiapan AI dan urutan aktivasi

## Sudah diimplementasikan

- FastAPI `/health`, `/models/status`, `/models/metadata`, `/predict` dengan respons fail-closed.
- Validasi CRS/geometri vektor dan resampling raster ke grid referensi (nearest untuk kategori, bilinear untuk kontinu; nodata tetap NaN).
- Dataset manifest SHA-256 berisi hash file, konfigurasi dan provenance.
- Fitur curah hujan 24/72/168 jam hanya dengan interval pengamatan lengkap yang tersedia saat issuance. Missing tidak diisi sebagai nol hujan. Antecedent precipitation 7 hari menggunakan peluruhan harian 0,9 sebagai kandidat penelitian yang wajib dituning/diuji, bukan parameter fisik tervalidasi.
- Dataset checks: evidence label, horizon, identitas, timestamp, feature availability, target-feature exclusion, duplikat unit/waktu.
- Split joint spatial-block/future-time dengan embargo. Imputer/scaler fit hanya pada training.
- Pipeline pilihan Logistic Regression / Random Forest / XGBoost dengan imbalance handling, seed tetap, baseline prior, evaluasi dan artefak versi penelitian.
- MLflow opt-in jika MLFLOW_TRACKING_URI dikonfigurasi.
- Skema dataset/model/training/prediction registry PostGIS, belum ada model registry yang dipromosikan.
- UI Prediksi AI yang tidak menampilkan heatmap/probabilitas rekaan.

## Menyiapkan dataset yang layak

1. Definisikan unit spasial yang defensibel, horizon 24/72 jam dan cakupan. Toleransi lokasi katalog bisa lebih besar dari cell; keluarkan atau agregasikan sesuai ketidakpastian, jangan paksa ke grid kecil.
2. Dapatkan observasi dan prakiraan hujan beserta waktu benar-benar tersedia (bukan sekadar waktu observed), DEM, slope, geologi/tanah/tutupan lahan dengan izin dan resolusi.
3. Simpan per fitur source id, source version, resolution, CRS, observation time, availability time dan transform. Satu `feature_available_at` pada dataset pelatihan adalah maksimum ketersediaan semua fiturnya; pemeriksa eksternal harus membuktikan agregasi ini.
4. Bangun label kejadian sesuai horizon. Non-event memerlukan bukti pengamatan; pipeline konservatif menolak negatif yang hanya berdasar tidak ada laporan. Positive-unlabeled/occupancy modeling belum diimplementasikan.
5. Validasi manifest dan simpan snapshot immutable sebelum training.

## Menjalankan penelitian

Konfigurasi `ai/experiments/baseline.json` adalah template yang **harus** diganti cutoff, fitur, blok dan provenance-nya; tidak ada dataset pelatihan disertakan.

```sh
.venv/bin/python -m ai.training.train path/dataset.csv path/config.json --output ai/models/research-v1
```

Kolom: `unit, spatial_block, issued_at, feature_available_at, label_end, label, label_evidence` dan fitur numerik terpilih. Fitur kategori memerlukan encoding yang dikaji terlebih dahulu; baseline ini tidak menganggap kode kelas geologi numerik kontinu. Pipeline tidak mengaktifkan model. Tidak ada tuning grid otomatis atau kalibrator saat ini; tambahkan nested spatial-temporal tuning dan calibration split terpisah sesuai MODEL_EVALUATION.md sebelum klaim validasi.

## Gate berikutnya

Independent geographic/temporal holdouts, buffered blocks sesuai skala autokorelasi, nested tuning, feature importance/SHAP dengan kajian kausalitas, calibration, threshold biaya, uncertainty/missingness/drift monitoring, tinjauan peneliti dan pemilik operasi. Registry harus menyimpan model card, hash artefak, dataset version, evaluation protocol dan approval. `research` tidak boleh diubah menjadi warning operasional hanya dengan environment flag.

Next.js dan FastAPI saat ini sama-sama fail-closed. `AI_SERVICE_URL` disiapkan sebagai alamat integrasi internal; proxy inferensi operasional dan promosi registry belum diaktifkan. Rancang integrasi terautentikasi dengan timeout, kesegaran input, versi, coverage dan horizon checks. Kegagalan harus mempertahankan structured unavailable, bukan fallback probabilitas.
