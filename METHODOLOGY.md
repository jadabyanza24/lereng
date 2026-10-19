# Metodologi dan batas interpretasi

## Konsep yang dipisahkan

1. **Kerentanan longsor** adalah karakteristik spasial jangka panjang. Belum ada peta resmi PVMBG yang diimpor. Sistem tidak mengubah titik kejadian, warna basemap, kemiringan, atau prakiraan hujan menjadi kelas kerentanan.
2. **Catatan kejadian** adalah kejadian dalam inventaris dengan sumber yang dapat ditelusuri. GLC bersifat katalog laporan media, bukan daftar resmi lengkap. Waktu disimpan UTC; tanggal tanpa jam bukan klaim waktu kejadian yang presisi.
3. **Cuaca** memiliki observasi, prakiraan dan peringatan yang berbeda. Integrasi awal memuat prakiraan desa dan peringatan CAP, bukan pengamatan hujan.
4. **Prediksi AI** belum tersedia. Tujuan penelitian terdefinisi tetapi bukan kemampuan yang sudah divalidasi.

## Koordinat dan normalisasi

Semua geometri aplikasi EPSG:4326 (urutan bujur, lintang). Endpoint pencarian koordinat UI menggunakan format lintang, bujur dengan label eksplisit. Validasi rentang envelope Indonesia 94–142 BT, 12 LS–7 LU adalah sanity check, bukan pengujian keanggotaan batas hukum. Titik katalog yang lolos rentang tetap **perkiraan** sesuai location accuracy sumber. Titik yang invalid disimpan tanpa geometri, tetap dapat muncul dalam daftar non-spasial. Tidak memakai centroid administratif sebagai titik kejadian.

Jumlah korban negatif/tidak diketahui menjadi null, bukan 0. Tanggal submitted katalog bukan publikasi artikel. Deskripsi bahasa sumber tetap dipertahankan di API/raw; UI Bahasa Indonesia memakai label dan judul normalisasi yang tidak menambah klaim geografis.

Identitas `(source_id, external_id)` memastikan idempotensi. Fingerprint tanggal, posisi dibulatkan, dan judul normalisasi mendukung kandidat duplikat. Tidak otomatis menggabungkan kejadian berbeda hanya karena berdekatan. News duplicate_group mengelompokkan judul identik ternormalisasi, belum deduplikasi semantik.

## Analitik

Hitungan diambil dari PostGIS, bukan hardcoded. Filter tanggal/provinsi/verifikasi/teks digunakan bersama pada endpoint kejadian dan analitik. Bbox hanya untuk peta viewport; ringkasan nasional tidak berubah hanya karena pan kecuali parameter bbox dipasok ke API analitik. Data null korban tidak diasumsikan nol; jumlah korban dilaporkan hanya menjumlahkan yang diketahui dan bukan estimasi total sebenarnya. Tidak ada persentase peningkatan atau tren bahaya yang diturunkan dari kelengkapan katalog yang tidak konsisten.

## Menambahkan peta kerentanan resmi

Periksa penerbit, tanggal, lisensi, CRS, cakupan, skala, metode dan legenda. Simpan metadata dataset dan klasifikasi sumber tanpa mengubah jenjang. Daftar produk dapat mendukung Sangat Rendah, Rendah, Sedang, Tinggi, Sangat Tinggi **hanya jika** dataset tersebut memakai kelas itu. Jangan memaksakan lima kelas pada legenda resmi yang berbeda. Import/publikasi peta baru memerlukan adaptor dan pengujian; schema saja bukan klaim integrasi.

## Rujukan penelitian untuk rancangan, bukan model yang sudah dibuat

- Kirschbaum et al. (2010), *A global landslide catalog for hazard applications: method, results, and limitations*, Natural Hazards 52, 561–575. https://doi.org/10.1007/s11069-009-9401-4
- Kirschbaum et al. (2015), *Spatial and temporal analysis of a global landslide catalog*, Geomorphology 249, 4–15. https://doi.org/10.1016/j.geomorph.2015.03.016
- Roberts et al. (2017), *Cross-validation strategies for data with temporal, spatial, hierarchical, or phylogenetic structure*, Ecography 40, 913–929. https://doi.org/10.1111/ecog.02881
- Saito & Rehmsmeier (2015), PR plots for imbalanced binary classifiers, PLOS ONE. https://doi.org/10.1371/journal.pone.0118432

Belum ada derived susceptibility model yang ditampilkan; rujukan tidak dipakai untuk memberi legitimasi pada skor yang belum dihitung/divalidasi.
