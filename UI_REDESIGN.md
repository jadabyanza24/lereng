# Redesign LERENG untuk publik

19 Oktober 2026. Cakupan: presentasi frontend dan pengujian UI. Tidak mengubah server, skema database, kontrak API, pipeline ingest, atau arsitektur/pelatihan AI. Tidak melakukan push atau deployment.

## Halaman dan arsitektur informasi

| Tujuan | Perubahan |
|---|---|
| `/` | Beranda publik dengan judul yang diminta, pencarian lokasi, peta nyata, panduan mulai, riwayat terbaru dalam katalog, penjelasan cara kerja, faktor longsor, dan sumber |
| `/peta` | Tujuan baru untuk peta utama, pencarian mengambang, pengaturan bertahap, informasi titik dan bottom sheet nonmodal di ponsel |
| `/kejadian` | Kartu laporan, filter yang dapat dibuka, detail, tautan lokasi, pagination, ekspor dan ringkasan opsional |
| `/prediksi-ai` | Penjelasan AI untuk warga, status belum tersedia, pemisahan dari peringatan resmi; periode penelitian dan metode dalam bagian opsional |
| `/tentang` | Tujuan baru untuk pengenalan LERENG, edukasi, perbedaan jenis informasi dan keterbatasan |
| `/lingkungan` | Kartu prakiraan, peringatan resmi yang masih berlaku, waktu penerbitan/pengambilan dan penjelasan data medan yang belum tersedia |
| `/sumber-data` | Sumber dan kesegaran dengan label teks; izin, waktu pembaruan, kendala dan metadata dapat dibuka |
| `/pengaturan` | Preferensi tema/basemap, privasi lokasi dan penjelasan konfigurasi pengelola |
| `/kerawanan`, `/analisis` | Rute lama tetap aktif sebagai pintu ke pengalaman peta, tanpa mengklaim data kerawanan tersedia |

Lima tujuan utama tersedia lewat navigasi atas: Beranda, Jelajahi Peta, Kejadian Longsor, Prediksi AI, Tentang LERENG. Tujuan sekunder dapat ditemukan di footer, pengaturan peta, dan tautan kontekstual. Tidak ada sidebar admin permanen.

## Komponen dan penggunaan ulang

- `src/components/public-ui.tsx`: `PublicNavbar`, `PublicFooter`, `LocationSearch`, `IncidentCard`, `IncidentDetails`, `LocationBottomSheet`, `DataState`, `DataStatus`, `ProvenanceNote`, `StartOptions`, `HowItWorks`, `EducationalSection`, `TrustedSources`.
- `src/components/workspace.tsx`: mempertahankan query TanStack dan state interaksi, dengan susunan presentasi baru per halaman.
- `src/components/geo-map.tsx`: mesin MapLibre yang sama, sumber dan clustering yang sama; perbaikan penerapan target awal, reduced motion, dan fullscreen mencakup kontrol/konteks peta.
- `src/lib/presentation.ts`: padanan nama provinsi sumber menjadi bahasa Indonesia dan penjelasan ketelitian. Payload dan data sumber tidak ditulis ulang.
- `src/app/globals.css`: token, tipografi, navigasi, layout, breakpoint, focus indicator, keadaan data dan kedua tema.

## Fungsi yang dipertahankan

Pan/zoom, kembali ke Indonesia, clustering, pilih titik, pencarian provinsi/koordinat, geolokasi atas izin, fullscreen, basemap OSM/topografi, batas wilayah, riwayat, opasitas, filter tanggal/provinsi/status/teks, pagination, detail dan tautan sumber, ekspor halaman/tampilan GeoJSON, agregasi dan grafik/tabel alternatif, cuaca, metadata sumber/lapisan, kesiapan AI serta preferensi tema/basemap tetap tersedia.

Grafik dipindah ke bagian opsional. Grafik tahunan menggunakan kolom diskret, bukan kurva halus; hanya tahun yang memiliki catatan ditampilkan, dengan penjelasan bahwa jarak kolom bukan jarak waktu. Grafik delapan provinsi terbanyak dan tabel semua provinsi tetap tersedia.

Pilihan provinsi cuaca memakai identitas wilayah yang memang disimpan sumber, sedangkan filter katalog memakai nama yang sesuai katalog. Ini adaptasi parameter frontend terhadap API yang sama, bukan perubahan kontrak. Memilih provinsi cuaca tidak diam-diam menambahkan radius di sekitar titik pusatnya.

## Pengujian aktual

| Pemeriksaan | Hasil |
|---|---|
| `npm run lint` | Lulus |
| `npm run typecheck` | Lulus |
| `npm run build` | Lulus, Next.js 16.4.2 |
| `npm test` | 14 lulus, termasuk integrasi PostGIS nyata dan presentasi nama/ketelitian |
| `BASE_URL=http://localhost:3005 npm run test:e2e` | 11 lulus terhadap build produksi lokal final, termasuk status AI terlihat pada viewport awal ponsel |
| `.venv/bin/python -m pytest ai/tests -q` | 5 lulus, satu peringatan deprecation httpx/Starlette |
| `npm audit --omit=dev` | 0 kerentanan |
| Detector desain pada file frontend berubah | Tidak ada temuan (`[]`) |

Tes browser mencakup navigasi beranda dan pencarian lintas halaman, pencarian provinsi Indonesia, koordinat tidak valid, pan-control/zoom/reset, lapisan/opasitas, tema, fullscreen, geolokasi berbasis izin simulasi Chromium, filter tanggal termasuk invalid/empty, pagination, detail, unduhan GeoJSON, deep link insiden ke peta, status AI, metode opsional, metadata sumber, persistensi basemap, menu/Escape/fokus, collapse/expand bottom sheet, loading dan kegagalan API tanpa catatan pengganti, serta pemetaan filter cuaca.

Sepuluh rute diperiksa pada lebar 390, 768 dan 1280 px untuk satu judul utama dan tanpa overflow. Capture tambahan terhadap delapan halaman utama pada desktop 1440×1050, ponsel 390×844, tablet 768×1000, dan tema gelap 1440×1050 menghasilkan **32 capture tanpa error console/page dan tanpa overflow**. Setiap capture memakai konteks baru. Bukti terstruktur ada di `.impeccable/review/public-browser-evidence.json`; screenshot berawalan `public-` di direktori yang sama.

Capture halaman nonpeta memakai Chromium standar agar halaman kartu panjang dapat ditangkap utuh. Peta memakai Chromium dengan WebGL software. Capture bukan mockup dan tidak menambahkan peristiwa atau skor.

Pasangan token teks utama, sekunder, tindakan dan status terhadap permukaan yang digunakan diuji secara numerik di kedua tema: rasio minimum **5,15:1** pada pasangan yang diperiksa. Tombol utama dan kontrol peta 44–48px atau lebih, label/status tidak mengandalkan warna, fokus terlihat, landmark/heading dan label form tersedia, serta transisi kamera menghormati reduced motion.

## Batas validasi

### Review finish

Review independen awal menyatakan arah publik dan preservasi fitur sesuai brief, dengan dua temuan: status AI perlu terlihat lebih awal pada ponsel dan capture peta tablet belum cukup tajam. Perbaikan dilakukan dengan pemberitahuan langsung di bawah judul AI, disertai tes batas viewport, serta capture ulang tablet setelah tile selesai dimuat. Lima capture AI/tablet terkait diperbarui pada berkas yang sama; bukti JSON ikut diperbarui.

Verdict lanjutan: **SHIP untuk kedua temuan tersebut; keduanya resolved**. Reviewer membaca kode/capture, tidak menjalankan ulang browser secara independen. Ini bukan persetujuan operasional AI atau sertifikasi aksesibilitas. Dokumentasi desain telah diganti agar sesuai UI publik terbangun. Polish nonblocking yang belum diambil: jump link pada daftar kejadian/cuaca yang panjang dan jumlah anggota pada cluster.

### Cakupan pembuktian

Ini bukan sertifikasi WCAG menyeluruh. Belum ada pengujian manual pembaca layar, semua kombinasi keyboard/perangkat nyata, Safari/Firefox, kontras setiap label tile pihak ketiga, geolokasi GPS fisik, kondisi jaringan lapangan, atau pengujian kegunaan dengan warga. Hasil pengujian tidak boleh dinyatakan sebagai penelitian pengguna. Beberapa tanggal, judul, ketelitian dan deskripsi asli tetap mengikuti sumber; ketidakpastian tidak dihilangkan.

Peringatan dan prakiraan mengikuti waktu berlaku saat dibaca, sehingga jumlah kartu bisa berubah. Tidak ada data/ingest baru yang dibuat untuk mempercantik screenshot. Ketiadaan data kerawanan atau catatan tidak disamakan dengan risiko rendah. Prediksi AI tetap belum tersedia; tidak ada angka prediksi.

Audit penuh toolchain development sebelumnya memiliki lima advisori high pada rantai ESLint/fast-glob/micromatch/braces; redesign tidak menambahkan dependensi npm dan tidak mengubah arsitektur layanan. Docker Compose, hardening dan kesiapan model tetap di luar tugas ini. Lihat [VALIDATION.md](VALIDATION.md) untuk baseline implementasi backend dan data sebelum redesign; bukti UI terbaru ada dalam dokumen ini.

## Sumber aset dan edukasi

- Public Sans regular/bold disajikan lokal dari `public/fonts/`; berasal dari Google Fonts, berlisensi SIL OFL 1.1 dengan naskah `public/fonts/OFL.txt`. Tidak ada permintaan font pihak ketiga saat halaman dibuka.
- Edukasi umum mengacu pada USGS *Landslide Types and Processes*, Fact Sheet 2004-3072, https://pubs.usgs.gov/fs/2004/3072/ (halaman diperiksa dan tersedia). Bukan data kerawanan spesifik lokasi Indonesia.
- Peta preview memakai mesin/sumber yang sama dengan peta utama dan atribusi penyedia tetap ditampilkan. Tidak ada gambar terrain generatif atau data demonstrasi tersamar.
