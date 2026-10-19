# Protokol evaluasi model

**Belum ada hasil evaluasi model LERENG pada data nyata.** Metrik unit test hanya memverifikasi perhitungan pada fixture sintetis, bukan akurasi sistem prediksi.

## Target dan desain

Target: setidaknya satu **kejadian tercatat** dalam geographic unit dan horizon terdefinisi. Bukan probabilitas semua kejadian geologis yang sebenarnya terjadi. Unit, resolusi, provenance label, toleransi koordinat, cakupan waktu dan reporting mechanism harus dibekukan sebelum evaluasi.

Baseline utama: prior training (`DummyClassifier(strategy=prior)`), kemudian Logistic Regression. RF/XGBoost tidak otomatis lebih baik. Majority no-event dapat terlihat akurat pada kelas langka; accuracy bukan metrik utama.

## Pengendalian leakage

- Tidak random train/test split.
- Split blok spasial dan future-time dengan embargo horizon tersedia di kode. Pemilihan blok harus mempertimbangkan jarak/autokorelasi; kode belum memilih ukuran blok otomatis.
- Evaluasi tambahan terpisah: geographic-only holdout dan temporal-only holdout untuk mendiagnosis generalisasi, selain joint holdout.
- Hyperparameter tuning harus menggunakan nested split dalam training; test final tidak boleh ikut memilih fitur, parameter, threshold atau model.
- Fit imputer/scaler hanya training. Raster/feature alignment tidak boleh membawa informasi pascakejadian (misalnya tutupan lahan setelah longsor).
- Kalibrasi probability pada spatial-temporal calibration holdout yang tidak digunakan fitting atau final evaluation. Kode saat ini **menandai calibrated=false** dan tidak mempromosikan model.

## Metrik dan pelaporan

Precision, recall, F1 pada threshold yang didefinisikan, PR-AUC (average precision dalam implementasi), ROC-AUC hanya dengan kedua kelas, confusion matrix, Brier dan calibration curve. Kurva diagnostik bukan bukti model sudah terkalibrasi. Laporkan event prevalence, sample counts, uncertainty interval dengan spatial block bootstrap bila memenuhi syarat, hasil per wilayah/musim/horizon dan simple baseline pada split identik.

Masalah yang harus dibahas: incomplete reporting, spatial autocorrelation, lokasi tidak pasti, class imbalance, unobserved non-events, selection bias berita dan drift. Nilai null bukan nol, nol laporan bukan aman. Jangan mencampur data training dan data pelaporan untuk menampilkan performa yang tampak terlalu baik.

## Model card dan persetujuan

Dataset version/hash, model version/hash, training timestamp, konfigurasi, cutoff dan blok, fitur/satuan/provenance, metrics lengkap, calibration status, coverage, limitations, reviewer/approval, nonoperational/validated status, last successful inference. Setiap forecast menyertakan issued_at, horizon, geographic unit, input freshness dan uncertainty jika didukung. Jika input hilang/usang atau lokasi di luar coverage, return unavailable, bukan angka.

Promosi publik membutuhkan penilaian independen dan tata kelola peringatan yang sah; dashboard penelitian tidak mengklaim kewenangan pemerintah.
