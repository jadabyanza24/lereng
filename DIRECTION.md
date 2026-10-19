# LERENG: overhaul antarmuka publik

## Brief

- Arahan pengguna: publik yang ingin mencari lokasi; jelas, tenang, mudah.
- Tugas pertama: mencari provinsi atau koordinat, kemudian membaca kerentanan, riwayat, dan sumbernya.
- Cakupan: overhaul UI/UX dalam Next.js yang sudah ada, bukan penggantian backend atau pipeline data.
- Filter antislop diterapkan selama pengerjaan. Tidak menggunakan kredit gambar atau membuat identitas instansi.
- Nama, logo yang sudah ada, tujuan navigasi, dataset, dan fitur dipertahankan. Aset utama adalah geometri Indonesia, data katalog, dan informasi sumber yang benar-benar tersedia.
- Pengguna memilih A, Ruang orientasi. `DESIGN.md` lama tidak ditimpa.
- Dials eksplorasi: ENERGY 2 / RHYTHM 2 / MOTION 2. Motion menjelaskan orientasi atau lapisan; tidak menyimulasikan bencana aktif.

## Current

### Analisis ulang perubahan manual

Perubahan manual sudah mencakup sumber BNPB GIS, tanggapan/penyelidikan/MAGMA PVMBG, lapisan kerentanan, API lokasi, tombol lapisan cepat, pencarian cepat, kartu dampak, dan pengujian. Perubahan tersebut adalah pekerjaan pengguna dan tidak boleh dihapus atau dikembalikan ke versi lama.

Katalog pada pemeriksaan 19 Oktober 2026 berisi 4.143 catatan dan 4.083 catatan berkoordinat (`/api/analytics`). Ini jumlah catatan katalog, bukan jumlah seluruh bencana nasional, bukan jumlah kejadian unik yang telah dideduplikasi lintas sumber, dan bukan ukuran bahaya.

### Temuan baseline

- Beranda ponsel menghabiskan layar pertama untuk badge, judul besar, paragraf, dan banyak pilihan. Peta tidak terlihat pada layar pertama.
- Terdapat tiga kelompok kartu seragam, beberapa tindakan menuju tujuan serupa, dan terlalu banyak ukuran teks kecil.
- Legenda, skala, serta atribusi peta bertumpuk pada ponsel. Keyboard canvas tidak memiliki indikator fokus yang lolos scanner.
- Label `Aktif`, angka fallback `4.147`, serta klaim `38 Provinsi` tidak mengikuti status respons. Overhaul harus mengambil angka dari API dan membedakan cakupan sumber.
- Kerentanan regional perlu dibedakan dari risiko tapak dan prediksi waktu kejadian. Sumber resmi tidak otomatis berarti titik presisi atau data lengkap.
- Scan awal beranda: 6 FAIL; peta: 4 FAIL. Matrix beranda: 6 FAIL, 1 warn; Firefox/WebKit belum dipasang dan tidak diuji. Bukti: `shots/before/`.

### Kontrak fitur yang dipertahankan

- [x] Semua rute: beranda, peta, kerawanan, analisis, kejadian, lingkungan, prediksi AI, sumber, pengaturan, tentang.
- [x] Pencarian provinsi/koordinat, pilihan cepat, deep link kejadian, geolokasi atas izin.
- [x] Peta pan/zoom, reset Indonesia, layar penuh, peta dasar, batas, titik/cluster, kerentanan, opasitas.
- [x] Informasi lokasi nonmodal: kelas kerentanan, cuaca, riwayat radius 50 km, sumber, waktu.
- [x] Daftar/detail kejadian, sumber, filter, rentang tanggal, pagination, ekspor GeoJSON, grafik/tabel.
- [x] Cuaca dan peringatan dengan masa berlaku, registri sumber dan kendala akses.
- [x] Kejujuran status AI yang belum tersedia, metodologi dan horizon penelitian.
- [x] Kedua tema, preferensi tersimpan, keyboard/fokus, menu ponsel, reduced motion, loading/kosong/gagal.
- [x] Pipeline dan data manual terbaru tidak diubah untuk kepentingan tampilan.

Dipertahankan melalui inspeksi kode dan regresi `tests/e2e/workspace.spec.ts`; bukan klaim setiap kontrol sudah diuji pada setiap browser/perangkat.

## Default kategori yang ditolak

Portal peta yang memulai dengan kartu KPI dan sidebar admin; situs kebencanaan dengan semua wilayah tampak darurat; landing page hijau dengan badge, tiga kartu fitur, dan tiga langkah yang menyembunyikan peta di bawah fold. Titik katalog tidak diberi animasi berdenyut yang dapat menyiratkan peringatan langsung.

## Tiga eksplorasi layar pertama

Eksplorasi terpisah dari aplikasi produksi. Data diambil dari snapshot API lokal; geometri dari geoBoundaries yang sudah ada (34 provinsi representasi 2017, bukan batas resmi BIG). Tidak ada titik, skor bahaya, foto kejadian, atau angka rekaan.

### A. Ruang orientasi

LERENG adalah ruang orientasi di pintu masuk kawasan pegunungan. Keluarga: tempat. Ide pertama papan penunjuk jalan ditolak karena mudah menjadi kostum signage.

- Ground putih dingin, tinta biru batu, aksen jingga gelap untuk pencarian.
- Public Sans lokal: suara layanan publik yang sudah dikenal, bukan tipografi marketing.
- Richness: geometri provinsi sebenarnya sebagai peta indeks. Pemilihan melalui pencarian atau tautan menuju peta interaktif, bukan target provinsi kecil pada ponsel.
- Shell topbar, grammar tool-first: pencarian paling atas, peta luas, riwayat terdekat di bawah.
- Motion: batas provinsi terpilih digambar sekali saat pemilihan untuk menjelaskan orientasi; berhenti setelah selesai.
- Risiko: terlalu mirip portal peta konvensional bila peta dibuat kecil.

### B. Atlas terbuka

LERENG adalah atlas lipat yang terbuka di meja warga. Keluarga: objek. Ide pertama kompas ditolak karena mudah menjadi logo/ikon dekoratif.

- Ground grafit gelap, lembar atlas pucat, aksen kuning untuk membuka lokasi.
- Ubuntu lokal: bentuk humanis membedakan pengalaman dari terminal monospaced.
- Richness: objek lembar atlas bertumpuk, bukan dashboard gelap; peta pada lembar berasal dari geometri nyata.
- Shell canvas: kontrol pencarian di bawah atlas, metadata pada tepi lembar.
- Motion: lembar membuka pada sumbu lipatan, lalu diam; bukan parallax terus-menerus.
- Risiko: metafora objek dapat mengambil perhatian dari tugas mencari lokasi, khususnya ponsel.

### C. Lapisan lereng

LERENG adalah penampang lereng yang memperlihatkan informasi satu lapis demi satu lapis. Keluarga: alam. Ide pertama kontur topografi sebagai wallpaper ditolak karena tidak menambah informasi.

- Ground tanah liat pucat, tinta cokelat gelap, aksen plum untuk tindakan.
- Georgia untuk judul: menyampaikan penjelasan lapisan seperti buku geologi, bukan judul sans dashboard. Public Sans untuk kontrol.
- Richness: bidang material berlapis, diagram konseptual yang diberi label bukan peta risiko.
- Shell split: satu jalur mencari lokasi, satu jalur memahami perbedaan kerentanan/riwayat/cuaca.
- Motion: lapisan bergeser pendek saat pilihan penjelasan berubah, lalu diam.
- Risiko: lebih kuat untuk edukasi daripada penggunaan peta sehari-hari.

## Batas tahap ini

Tiga eksplorasi harus ditampilkan ke pengguna sebelum pemilihan dan implementasi antarmuka produksi. Token final, isi layar penuh, signature terpilih, pemeriksaan interaksi, dua ronde kritik, serta laporan before/after dilengkapi setelah arah dipilih. Tidak ada klaim bahwa overhaul produksi selesai pada tahap eksplorasi.

## Arah terpilih

Pengguna memilih A, Ruang orientasi. B ditolak karena metafora atlas mengambil ruang pencarian; C ditolak karena edukasi lebih dominan daripada mencari lokasi. Nama, lambang gunung, rute navigasi, sumber dan kemampuan aplikasi tetap dipertahankan.

### Token dan komposisi

- Putih dingin `#f7f9fc` adalah lantai ruang orientasi; tinta batu `#172e41` memberi kontras untuk informasi geografis. Jingga gelap `#b44318` hanya untuk tindakan utama dan penanda pilihan, bukan alarm.
- Tema gelap memakai batu malam `#14232f`, permukaan `#1e303e`, teks `#edf3f7`, jingga pucat `#ffc09b`; bukan pembalikan warna peta status.
- Public Sans lokal dipertahankan karena keterbacaan layanan publik dan kontinuitas identitas. Skala utama 60/32/24/20/16/14/12 px. Angka memakai tabular figures.
- Gutter 40 px desktop, 20 px ponsel; lebar isi 1240 px. Ruang antarbagian 48–64 px, antarlabel 8 px. Radius 4 px untuk indeks, 6 px kontrol, 10 px panel mengambang.
- Pencarian dan penjelasan dua kolom di desktop, pencarian tepat di bawah judul di ponsel. Peta indeks utuh terlihat sebelum bagian riwayat. Daftar riwayat memakai pemisah horizontal, bukan kisi kartu.
- Indeks geometri berasal dari geoBoundaries lokal. Koordinat dibulatkan hanya untuk ilustrasi orientasi; bukan perubahan sumber atau lapisan peta analisis.
- Signature final: indeks awal netral. Pencarian yang cocok atau fokus/hover pilihan cepat menandai geometri provinsi terkait; batas digambar selama 1,2 detik. Teks menjelaskan pilihan, bukan bahaya. Reduced motion menampilkan batas lengkap tanpa animasi.
- Suara: pemandu warga yang menjelaskan lokasi dan batas informasi, bukan menjual kepastian keselamatan.

## Content implementasi

- Judul: “Kenali lereng di sekitar Anda.” Label: “Informasi longsor Indonesia”. Penjelasan final: “Cari lokasi untuk membaca kerentanan wilayah, riwayat longsor, dan cuaca beserta sumbernya.”
- Pencarian: “Wilayah mana yang ingin Anda periksa?”, “Provinsi atau koordinat”, “Cari lokasi”. Petunjuk: “Contoh: Jawa Barat atau -6.9, 107.6. Belum mendukung alamat jalan.” Pilihan cepat yang sudah ada tetap tersedia.
- Indeks: “Peta Longsor Indonesia”, “Buka peta interaktif untuk memilih wilayah.”, “Buka peta interaktif”. Atribusi geoBoundaries 2017 dan penanda pilihan, bukan kelas bahaya, selalu ditampilkan.
- Ringkasan: jumlah API + “catatan dalam katalog. Bukan seluruh kejadian Indonesia.” Loading menampilkan proses; gagal menampilkan pesan dan muat ulang; nol tetap nol, tanpa fallback angka.
- Riwayat: “Catatan terbaru dalam katalog”, “Tanggal kejadian menurut sumber, bukan peringatan yang sedang berlangsung.” Isi kartu berasal dari API terbaru; detail, dampak, tanggal, status, ketelitian dan tautan sumber tetap ada.
- Panduan: “Mulai dari Mana?” menjadi daftar pintu masuk kerentanan, katalog, dan faktor longsor, tanpa angka katalog statis. “Bagaimana LERENG Bekerja?” tetap tersedia sebagai penjelasan terbuka, bukan tiga kartu bernomor.
- Edukasi, daftar instansi sumber, footer, seluruh layar peta dan rute lain memakai isi aktual yang sudah ada. Tidak ada perubahan klaim model AI, pipeline, atau peringatan cuaca.
- Kondisi pencarian gagal, daftar kosong, API gagal, WebGL gagal, tema, filter dan detail tetap memakai alur yang ada.

## Serah-terima

- Token warna: `src/app/globals.css`; komposisi baru: `src/app/orientation.css`. Gunakan variabel semantik yang sama untuk halaman tambahan, bukan warna literal baru.
- Indeks: `src/components/orientation-map.tsx`, geometri turunan `src/lib/overview.json`. Bangun ulang dengan `node scripts/build-overview.mjs` jika sumber batas berubah; jangan pakai indeks kasar sebagai lapisan analisis.
- Konten dan interaksi tetap di `src/components/workspace.tsx` dan `src/components/public-ui.tsx`; peta interaktif di `src/components/geo-map.tsx`.
- Ikon browser dan social card memakai identitas gunung yang sudah ada. Set `SITE_URL` ke origin publik sebelum build deployment agar URL Open Graph benar.
- Bukti final dan batas verifikasi: `CRITIQUE.md`, `UI-VERIFICATION.md`, `shots/r4/`. Tidak ada commit/push atau penggantian pipeline.

## Revisi setelah feedback pengguna

Pengguna menolak kualitas visual hasil pertama dan meminta motion di seluruh situs, feedback hover titik, kontrol pilihan yang lebih rapi, serta penghapusan petunjuk yang menutupi peta. Penilaian reviewer sebelumnya bukan persetujuan pengguna.

- Kontrol pilihan tetap native untuk keyboard dan perangkat sentuh; chevron, padding, radius, hover dan fokus diseragamkan. Tombol lapisan menjadi satu kelompok dengan status tekan yang jelas; alat peta berada dalam satu toolbar.
- Banner petunjuk di atas peta dihapus sepenuhnya, bukan diperkecil. Instruksi dan batas sumber tersedia di bawah canvas. Search, lapisan dan pengaturan tetap langsung tersedia.
- Hover titik/cluster: cursor pointer, ring sorot, popup judul/tanggal/sumber atau jumlah catatan. Klik mempertahankan detail atau pembesaran cluster. Isi laporan dimasukkan sebagai textContent, bukan HTML.
- Motion: feedback kontrol 180 ms, panel/disclosure 200–240 ms, bagian konten 420 ms saat memasuki viewport sekali. Konten terlihat tanpa JavaScript, tidak ada loop dekoratif, dan canvas tidak diberi animasi layout. Reduced motion mematikan CSS dan Web Animations, termasuk saat preferensi berubah.
- Tipografi heading, panel indeks, jarak form dan pemisah halaman dirapikan tanpa mengganti rute, merek atau sumber data. Dials tetap ENERGY 2 / RHYTHM 2 / MOTION 2.
- Bukti revisi: `shots/revision/`, hasil tes dan batas klaim terbaru di `UI-VERIFICATION.md`. Preview build revisi di port 3002; port 3001 berasal dari build sebelumnya.

## Pencarian wilayah dan identitas yang disediakan pengguna

- Permintaan berikutnya: pencarian kabupaten/kota dengan rekomendasi saat mengetik, legenda selalu terbuka dalam pill tengah bawah, dan logo dari folder Downloads pengguna.
- Pencarian menjadi combobox dengan pilihan yang membedakan Kabupaten dan Kota, menyebut provinsi induk, mendukung panah/Enter/Escape dan sentuhan. Hasil dan kegagalan dimuat di bawah kolom, tanpa menebak posisi dari laporan longsor. Indeks lokal tidak bergantung pada ketersediaan basis data untuk rekomendasi.
- Seleksi wilayah memperbesar batas referensinya dan menamai panel lokasi. Teks panel menjelaskan titik representatif serta batas informasi radius sekitar titik. Deep link berbasis ID wilayah bertahan setelah reload.
- Legenda tidak memakai disclosure lagi: selalu terlihat, ringkas, di tengah bawah. Skala, atribusi dan panel ponsel disisihkan agar tidak menutupinya. Jika semua lapisan mati, pill menyatakan keadaan tersebut.
- Logo pada navigasi/footer dan ikon mengikuti artwork pengguna, bukan lambang gunung sementara. Varian putih digunakan pada permukaan gelap. Perubahan SVG hanya memangkas margin di luar artwork.
- Asal dan batas indeks: `public/geodata/place-metadata.json`, `DATA_SOURCES.md`. Ini referensi 2017/2020, bukan daftar administrasi atau batas hukum terkini.
