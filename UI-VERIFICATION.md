# Verifikasi UI Ruang orientasi

## Terbaru: pencarian kabupaten/kota, legenda pill, logo pengguna

- `npm run build`, `npm run typecheck`, `npm run lint`: lolos. `npm test`: **20 tes** lolos. `BASE_URL=http://localhost:3002 npm run test:e2e`: **16 tes** lolos pada build produksi.
- Pencarian Bandung menampilkan Kabupaten Bandung, Kota Bandung dan Kabupaten Bandung Barat secara terpisah. Panah/Enter memilih Kota Bandung dari beranda, membuka peta lewat ID dan bertahan setelah reload; klik Kabupaten Sleman memperbarui lokasi.
- Keadaan rekomendasi kosong dan HTTP 503 diuji; Escape menutup daftar. Logo terang/gelap berganti bersama tema. Hover, fullscreen, layer, ekspor, geolokasi dan regresi sebelumnya tetap lolos.
- Legenda selalu terbuka tanpa summary, terpusat pada ponsel, tidak bertabrakan dengan panel lokasi. Jika seluruh layer mati, pill menjelaskan keadaan tersebut.
- Scan produksi 320/390/768/1440 px: **0 FAIL**. Hasil dibuka dan diperiksa: `shots/places/final/map/sheet.png`. Bukti rekomendasi desktop, gelap, ponsel dan hasil pilihan: `shots/places/final/`. Sesi screenshot mencatat `pageErrors []`.
- Delivery Gate perubahan ini: PASS untuk kontrol/keyboard dan keadaan data (16 E2E), reflow dan tema (scan serta screenshot), konten bersumber (snapshot 2017/2020 dan metadata), aset atas permintaan pengguna (logo asli), serta alasan komposisi di `DIRECTION.md`. Pill adalah permintaan pengguna; elevasi rekomendasi memisahkan daftar pilihan dari canvas, bukan dekorasi. Ikon pin menandai wilayah; chevron menunjukkan aksi memilih lokasi.
- Batas klaim tetap: referensi administrasi bukan daftar pemekaran terkini; Firefox/Safari dan screen reader belum diverifikasi. Kelulusan teknis tidak menggantikan persetujuan visual pengguna. Preview terbaru: **http://localhost:3002/peta**.

## Revisi terbaru setelah feedback visual

- Build dan lint lolos; 18 tes unit/integrasi serta **14 tes browser** lolos pada build produksi port 3002.
- Regresi baru membuktikan hover titik dan cluster mengubah cursor, menampilkan popup, menutup saat Escape/keluar, dan tidak menafsirkan judul laporan sebagai HTML.
- Regresi motion membuktikan animasi panel aktif, select tetap berfungsi dan preferensinya tersimpan, lalu reduced motion menghentikan animasi CSS dan Web Animations.
- Banner petunjuk sudah dihapus. Instruksi dan konteks sumber sekarang berada di bawah peta, bukan overlay.
- Scan peta terang/gelap, beranda dan pengaturan: 0 FAIL. Matrix beranda dan peta: 0 FAIL/0 warn pada sepuluh profil tersedia. Firefox/WebKit tetap belum diverifikasi.
- Screenshot aktual: `shots/revision/hover.png`, `shots/revision/map/sheet.png`, `shots/revision/map-dark/sheet.png`, `shots/revision/home/sheet.png`, `shots/revision/settings/sheet.png`.
- Saat scan dev dijalankan bersamaan dengan tes, beberapa API sempat mengembalikan 503. Scan produksi diulang terpisah tanpa masalah tersebut; tidak ada perubahan backend untuk menyembunyikannya. Pemeriksaan hover data nyata tidak mencatat page error.
- Delivery Gate revisi: PASS untuk kontrol responsif, data aktual, keamanan isi popup, loading/kosong/gagal, keyboard/select, kedua tema, motion/reduced motion, build dan regresi fitur. Alasan visual/motion tercatat dalam `DIRECTION.md`. Ini bukti teknis, bukan klaim pengguna sudah menyukai tampilannya.

Hasil di bawah adalah catatan tahap pertama; jumlah tes dan perilaku banner digantikan oleh revisi ini.

## Hasil

- `npm run build`: lolos, tanpa warning build.
- `npm run typecheck`: lolos.
- `npm run lint`: lolos.
- `npm test`: 18 tes unit/integrasi lolos, termasuk PostGIS dan batas geografis lima pilihan indeks.
- `BASE_URL=http://localhost:3001 npm run test:e2e`: 12 tes lolos pada build produksi, bukan hanya dev server.
- Sepuluh rute utama merespons 200; pemeriksaan runtime tidak mencatat console error.
- Sebelum: scan beranda 6 FAIL, peta 4 FAIL, matrix beranda 6 FAIL. Sesudah: scan beranda, tema gelap, peta, katalog dan AI 0 FAIL; matrix beranda dan peta 0 FAIL/0 warn pada sepuluh profil yang tersedia.

## Bukti interaksi

`tests/e2e/workspace.spec.ts` mencatat pengujian berikut:

| Interaksi | Hasil |
|---|---|
| Cari koordinat beranda | Membuka deep link peta dan koordinat lokasi |
| Cari provinsi / koordinat salah | Lokasi provinsi tampil / validasi terlihat |
| Fokus pilihan cepat | Geometri provinsi dan label pilihan mengikuti fokus |
| Wilayah lain | Disclosure membuka pilihan; pilihan membuka peta bahkan saat daftar provinsi tertunda |
| Jumlah katalog nol | Tetap nol, tidak diganti angka fallback |
| Pengaturan peta | Panel terbuka, kontrol lapisan tersedia, panel bisa ditutup |
| Tema dan preferensi | Tema berubah; preferensi bertahan setelah navigasi dan reload |
| Fullscreen | Membuka dan keluar dari layar penuh |
| Legenda | Membuka keterangan sumber/lapisan |
| Atribusi | Membuka tautan OpenStreetMap dan rincian sumber |
| Petunjuk peta | Tombol tutup menghilangkan petunjuk |
| Geolokasi | Hanya setelah izin; titik lokasi tampil |
| Daftar kejadian | Filter, pagination, detail dan tautan peta berfungsi |
| Ekspor | Mengunduh GeoJSON halaman yang dimuat |
| Menu telepon / lembar lokasi | Menu membuka navigasi; lembar lokasi bisa diperluas dan ditutup |
| API gagal / loading | Pesan keadaan tampil, tanpa catatan pengganti |
| AI | Tidak ada skor rekaan; API prediksi mengembalikan unavailable |
| Filter cuaca | Memakai identitas provinsi sumber tanpa bbox titik pusat |
| Rute lainnya | Semua rute tersedia; tidak overflow pada 390/768/1280 px |

## Delivery Gate antislop

- R-02 PASS: copy baru memakai titik, koma, tanda kurung; tidak menambahkan em dash.
- R-03 PASS: scan dan matrix reflow 320 px tanpa overflow; target kontrol utama minimal 44 px.
- R-17/R-18/R-36/R-38 PASS: jumlah berasal dari API, geometri dari sumber lokal; tidak ada testimoni, skor AI, atau klaim keselamatan rekaan.
- R-23/R-37 PASS: pengguna memilih eksplorasi A; identitas gunung yang sudah ada dipertahankan, bukan merek instansi baru. Arah dan dials tercatat dalam `DIRECTION.md`.
- R-24 PASS: sepuluh rute merespons 200; navigasi tidak menuju halaman fiktif.
- R-25 PASS: scan contrast beranda terang/gelap dan layar yang diubah tidak melaporkan FAIL; bukan audit seluruh kombinasi warna data peta.
- R-26/R-35 PASS: build dijalankan; interaksi tercatat pada tabel di atas dan 12 tes browser lolos. Kontrol di luar cakupan tes diperiksa melalui kode, bukan diklaim telah diklik semuanya.
- R-27 PASS: tes loading/gagal dan jumlah nol lolos; DataState tetap menyediakan keadaan kosong.
- R-28 PASS: tidak menambahkan FAQ generik.
- R-32 PASS: fokus keyboard indeks diuji, scanner melakukan focus walk, canvas memiliki indikator fokus. Screen reader belum diuji.
- R-33 PASS: perubahan antarmuka ditulis langsung di sumber; script overview hanya mengubah data geometri turunan, bukan mem-patch CSS/kode fitur.
- R-34 PASS: tema terang/gelap dirender dan dipindai; persistensi tema diuji.
- Purpose-Gate PASS: warna, font, radius, ruang, geometri dan motion mempunyai alasan di `DIRECTION.md`; peringatan scan dijawab di `CRITIQUE.md`.
- Liveliness PASS: ENERGY 2 / RHYTHM 2 / MOTION 2; indeks geografis menghubungkan pilihan dengan lokasi tanpa menyiratkan bahaya aktif.
- Craftsmanship/Quality Locks PASS: komposisi mengikuti pencarian lokasi, sumber dapat ditelusuri, keadaan data dan fitur lama dipertahankan; kritik final memenuhi stop rule.

## Batas klaim

Firefox dan WebKit/Safari belum tersedia. Profil Linux/macOS/Android adalah emulasi di Edge, bukan tes perangkat fisik. Belum ada pengujian screen reader, jaringan lapangan, Core Web Vitals, atau ClearType lintas mesin. Pipeline manual tidak diubah untuk redesign. Perubahan belum di-commit atau di-push.
