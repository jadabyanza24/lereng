# LERENG: catatan kritik overhaul

Arahan dipilih pengguna: A, Ruang orientasi. Kritik independen oleh satu sesi reviewer yang sama. Bukan penilaian penulis kode sendiri.

## Skor per ronde (1–5)

| Kriteria | R1 | R2 | R3 |
|---|---:|---:|---:|
| Konsep terlihat | 4 | 4 | 4 |
| Bukan rata-rata kategori | 4 | 4 | 4 |
| Tidak menyerupai slop | 4 | 4 | 4 |
| Layar pertama | 3 | 4 | 4 |
| Tipografi | 4 | 4 | 4 |
| Warna | 3 | 4 | 4 |
| Kekayaan visual | 3 | 4 | 3* |
| Struktur dan ritme | 2 | 3 | 4 |
| Craft | 3 | 3 | 3* |
| Responsif | 3 | 3 | 4 |
| Lintas lingkungan | 3 | 3 | 3 |
| Signature | 2 | 3 | 2* |
| Screenshot test | 3 | 3 | 3 |
| Fidelitas fitur | 3 | 4 | 4 |

\* Reviewer menarik temuan geografis R3 setelah membuka ulang gambar. Pilihan Jawa Tengah memang berada pada Jawa bagian tengah, bukan Kalimantan. Skor terkait ditahan untuk penilaian R4; geometri tidak diubah untuk mengikuti temuan yang keliru.

## R1

- Turunkan judul ponsel, persingkat pengantar, pertahankan pencarian dan indeks dalam layar pertama. Diterapkan R2.
- Tempatkan direktori sebelum riwayat; tiga preview alih-alih enam. Diterapkan R2; katalog lengkap tetap ada.
- Hilangkan provinsi contoh permanen. Indeks mengikuti pencarian, hover, dan fokus keyboard. Diterapkan R2.
- Sederhanakan banner peta, petunjuk bisa ditutup, legenda bisa dibuka. Diterapkan R2.
- Ikon edukasi kembali memakai tinta; penjelasan proses dibuat kompak. Diterapkan R2.

## R2

- Tampilan nasional ponsel terpotong oleh batas minimum zoom dan `maxBounds` lintang. Pembatas dihapus; permintaan bbox di luar cakupan tidak dikirim. Diterapkan R3.
- Atribusi asli mengulang gambar latar 24 px pada summary 48 px dan terbuka saat awal. Diganti satu disclosure 44 px dengan atribusi semua lapisan yang sedang ditampilkan. Diterapkan R3.
- Preview riwayat menjadi tiga baris editorial selebar halaman, dengan judul wilayah; judul laporan asli tetap di detail dan nama aksesibel tombol. Diterapkan R3.
- Penjelasan proses, faktor, dan sumber dipersingkat tanpa menghilangkan perbedaan kerentanan, riwayat, cuaca, dan batas keselamatan. Diterapkan R3.
- Label cek cepat tablet dihilangkan agar tiga tombol tetap satu baris. Diterapkan R3.

## R3 menuju R4

- Temuan geometri salah ditarik reviewer. Tambahkan regresi batas geografis lima pilihan provinsi, tanpa mengubah pemetaan yang sudah benar.
- Padding awal/reset peta mempertimbangkan area kontrol; diameter visual cluster maksimum dikurangi dari 50 menjadi 36 px.
- Filter cepat katalog dipindah ke disclosure filter yang sudah ada; placeholder pencarian dipersingkat. Seluruh pilihan tetap tersedia.
- Pengantar katalog tidak lagi menyebut jumlah statis. Penjelasan AI menjadi 20 px, tidak seperti judul tampilan.
- Ditemukan race nyata: pilihan cepat beranda sebelumnya menunggu unduhan daftar provinsi. Tautan pilihan yang sudah diketahui sekarang dapat membuka peta langsung; regresi menahan respons daftar provinsi untuk membuktikannya.

## Peringatan scanner yang dijawab

- Teks pendamping 12–14 px sengaja dipakai untuk atribusi, tanggal, ketelitian, dan petunjuk. Teks utama memakai 16 px, input 16 px, kontrol minimal 44 px. Tidak ada teks di bawah 12 px pada layar utama yang diubah.
- Scanner menyebut preview riwayat sebagai grid ikon/judul/paragraf. Tampilan aktual adalah daftar editorial tanpa kotak, bukan kartu fitur marketing; data, sumber, tanggal dan detail dipertahankan.
- Lima ikon berbingkai pada peta adalah kontrol pan/zoom, lokasi, reset dan fullscreen yang benar-benar berfungsi, bukan dekorasi fitur.
- Matrix awal R3 menangkap loading lalu hasil API saat membandingkan forced colours. Pengulangan dengan `--wait 3000` menstabilkan keadaan data dan lolos; bukan pengecualian untuk kegagalan tampilan.

## Enam pemeriksaan visual

- Swap: bentuk kepulauan dan istilah kerentanan/riwayat menambatkan identitas pada portal geografis Indonesia.
- Squint: satu bidang geografis besar dan satu tindakan jingga, bukan deretan angka penting.
- Face: tidak ada badge promosi, KPI cards, mockup, testimonial, gradient text, atau terminal dekoratif.
- Specificity: warna, font, ruang, ukuran dan motion dijelaskan dalam `DIRECTION.md`.
- Screenshot: cukup khas dan jelas untuk tugas publik; bukan klaim visual layak portofolio studio. Skor reviewer tetap jujur.
- Subtraction: pengulangan kartu dan paragraf dipotong; direktori, riwayat, proses, faktor dan sumber masing-masing menjawab pertanyaan berbeda.

## Batas verifikasi

Profil Linux/macOS/Android pada matrix merupakan emulasi di Edge, bukan perangkat fisik. Firefox, WebKit/Safari, screen reader, ClearType perangkat lain dan performa lapangan belum diverifikasi. Tidak ada klaim seluruh bencana Indonesia tercakup atau prediksi AI sudah tersedia.

## R4 final

Skor berurutan kriteria 1–14: **4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 4**. Sepuluh dari 13 kriteria desain mencapai 4; tidak ada di bawah 3. Fidelitas fitur 4. Reviewer menyatakan selesai menurut stop rule, pada batas empat ronde.

Keterbatasan visual yang tersisa: petunjuk desktop yang bisa ditutup masih menutupi sebagian Jawa/Bali; beranda ponsel masih panjang. Signature sengaja sederhana, bukan efek sinematik. Bukti final di `shots/r4/`: home, dark, map, incidents, ai, matrix, map-matrix, film. Scan semua layar tersebut 0 FAIL; kedua matrix 0 FAIL/0 warn pada sepuluh profil yang tersedia. Tiga profil Firefox/WebKit tidak diuji.

## Koreksi setelah pengguna menolak hasil

Kelulusan rubric R4 tidak cukup: pengguna menyatakan UI masih jelek dan menunjukkan select, titik tanpa hover, serta banner yang menghalangi. Revisi berikutnya tidak mengklaim skor reviewer sebagai bukti kepuasan pengguna.

Banner kini dihapus dan konteks dipindah di bawah peta; hover titik/cluster memiliki pointer, sorot dan ringkasan; select, toolbar dan tombol lapisan diperjelas; motion kontrol, konten dan panel diterapkan dengan reduced motion. Screenshot aktual dibuka ulang pada ponsel/desktop dan kedua tema. Scan 0 FAIL; matrix beranda/peta 0 FAIL/0 warn pada profil tersedia. Peringatan teks pendamping dan daftar riwayat tetap mengikuti alasan di atas. Persetujuan visual tetap milik pengguna.
