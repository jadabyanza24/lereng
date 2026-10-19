---
name: LERENG
description: Panduan tempat untuk memahami informasi longsor Indonesia beserta sumber dan keterbatasannya.
colors:
  background: "#f8f9f5"
  surface: "#fff"
  ink: "#20382d"
  muted: "#536259"
  line: "#dce3da"
  line-control: "#819286"
  accent: "#19583e"
  accent-soft: "#e9f0e6"
  orange: "#a34a22"
  orange-soft: "#fbede3"
  warm: "#f1f2e9"
  report-point: "#b34a1b"
  dark-background: "#15251e"
  dark-surface: "#203329"
  dark-ink: "#f0f5ee"
  dark-muted: "#bbc9bd"
  dark-line: "#42594a"
  dark-line-control: "#92a896"
  dark-accent: "#b1ddbb"
  dark-accent-soft: "#2b4835"
  dark-orange: "#ffc49e"
  dark-orange-soft: "#4a3427"
  dark-warm: "#1d3025"
typography:
  display:
    fontFamily: '"Public Sans", Arial, sans-serif'
    fontSize: "clamp(2.1rem,4.1vw,3.7rem)"
    fontWeight: 700
    lineHeight: 1.12
    letterSpacing: "-.035em"
  headline:
    fontFamily: '"Public Sans", Arial, sans-serif'
    fontSize: "clamp(1.5rem,2.5vw,2rem)"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-.025em"
  title:
    fontFamily: '"Public Sans", Arial, sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-.015em"
  body:
    fontFamily: '"Public Sans", Arial, sans-serif'
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: '"Public Sans", Arial, sans-serif'
    fontSize: "14px"
    fontWeight: 700
    lineHeight: 1.5
rounded:
  status: "5px"
  control: "8px"
  search: "10px"
  card: "14px"
  sheet-mobile: "16px"
  map-preview: "20px"
spacing:
  control-gap: "10px"
  field-gap: "12px"
  group: "24px"
  section-gap: "32px"
  desktop-gutter: "40px"
  hero-gap: "48px"
  section-block: "64px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-outline:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "11px 18px"
  field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  status-report:
    backgroundColor: "{colors.orange-soft}"
    textColor: "{colors.orange}"
    rounded: "{rounded.status}"
    padding: "4px 8px"
  incident-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "24px"
---

# Design System: LERENG

## Overview

**Creative North Star: "Panduan Tempat"**

LERENG terasa dapat dipercaya, tenang, dan ramah. Warga Indonesia, pelajar, komunitas, dan pelancong dapat memulai dari lokasi tanpa harus memahami GIS. Peta nyata dan bahasa sehari-hari menjadi pusat orientasi, bukan panel pemantauan profesional.

Hijau hutan menuntun tindakan; bidang hangat memberi ruang membaca. Kepadatan meningkat hanya saat pengunjung membuka pengaturan, detail, atau metode. Dunia visual ini menggantikan sidebar/dashboard lama atas arahan eksplisit pengguna. Seed `dae8a14a`; ENERGY 1 / RHYTHM 2 / MOTION 1.

**Key Characteristics:**
- Peta dan pencarian lokasi menjadi fokus.
- Navigasi atas lima tujuan, tanpa sidebar permanen.
- Informasi lanjutan dibuka sesuai kebutuhan.
- Sumber, waktu, dan ketidakpastian menyertai informasi.

## Colors

Palet hijau hutan dan netral hangat mengutamakan orientasi serta keterbacaan; nilai normatif ada di frontmatter, bersumber dari `src/app/globals.css`. Ramp delapan langkah OKLCH dalam sidecar merupakan turunan ilustratif untuk panel dokumentasi, bukan token baru atau warna tambahan yang dipakai aplikasi.

### Primary
- **Hijau hutan** (`accent`): tindakan utama, tautan, navigasi aktif, dan fokus. `accent-soft` memberi konteks pada panduan dan penjelasan.

### Secondary
- **Oranye laporan** (`orange`, `orange-soft`): laporan media, status belum terverifikasi/kedaluwarsa/tidak tersedia, dan pesan kendala. `report-point` adalah warna titik riwayat pada legenda, bukan skala bahaya.

### Neutral
- **Kertas hangat** (`background`, `surface`, `warm`): halaman, kartu, dan konteks ketersediaan.
- **Tinta hutan** (`ink`, `muted`): teks utama dan pendamping; teks pendamping tetap terbaca, bukan sekadar dekorasi.
- **Garis pembagi dan kontrol** (`line`, `line-control`): pembatas konten dibedakan dari batas input yang lebih tegas.
- Tema gelap memakai pasangan `dark-*` melalui `data-theme=dark`, bukan membalik warna secara otomatis. Pilihan tema mengikuti preferensi tersimpan atau sistem, lalu dapat diubah pengunjung.

**The Laporan Bukan Bahaya Rule.** Oranye menandai laporan atau status informasi, bukan kelas kerawanan. Tanpa data tidak berarti aman atau risiko rendah.

Kontras pasangan teks utama, sekunder, tindakan, dan status pada kedua tema tercatat minimum 5,15:1 di `UI_REDESIGN.md`. Itu hasil pasangan yang diperiksa, bukan sertifikasi WCAG menyeluruh atau jaminan keterbacaan semua label tile pihak ketiga.

## Typography

**Display Font:** Public Sans, dengan Arial lalu sans-serif sebagai fallback saja.
**Body Font:** Public Sans dengan stack yang sama. Tidak ada font display Arial tersendiri.

Public Sans lokal dipilih untuk bahasa layanan publik yang jelas dan bersahabat. Berkas regular/bold ada di `public/fonts/`, berasal dari Google Fonts, berlisensi SIL OFL 1.1 (`public/fonts/OFL.txt`); font tidak diminta ke pihak ketiga saat halaman dibuka. Regular melayani bobot 400–500; bold melayani 600–800.

Hierarki display/headline/title/body/label mengikuti frontmatter. Judul seimbang, tebal, dengan tracking rapat; teks paragraf dibatasi hingga 73ch. Judul halaman memakai varian `clamp(2rem,3.5vw,2.9rem)`. Hero menyesuaikan breakpoint: 46px pada ≤1100px, 48px pada ≤850px, 40px pada ≤700px, 36px pada ≤370px, dan 64px pada ≥1600px. Koordinat serta ringkasan angka memakai angka tabular, bukan monospace dekoratif.

## Layout

- Header desktop setinggi 80px; menjadi 72px pada ≤850px. Kontainer navigasi/hero maksimum 1320px, halaman 1200px, bagian konten 1240px. Gutter desktop 40px; diperkecil menurut breakpoint, bukan satu skala seragam yang dipaksakan.
- Beranda memasangkan judul/pencarian di kiri dan preview peta nyata di kanan (`1fr 1.08fr`, gap 48px). Pada ≤850px menjadi satu kolom. Ritme berganti antara panduan, kartu laporan, edukasi, dan sumber sesuai isi.
- Halaman peta mengutamakan kanvas: tinggi `calc(100svh - var(--header-height))`, minimum desktop 620px, ≤850px 680px, ≤700px 560px. Pencarian mengambang, pengaturan tertutup di awal; grafik dan tabel di bawah peta berada dalam disclosure.
- Breakpoint aktual: ≥1600px, ≤1100px, ≤850px, ≤700px, ≤370px. Pada ≤700px navigasi menjadi menu berlabel dan informasi lokasi menjadi bottom sheet nonmodal. Pada ≤370px gutter utama 16px.
- Bottom sheet ponsel memiliki tinggi maksimum 46%, jarak bawah `calc(34px + env(safe-area-inset-bottom))`, dan konten bergulir sendiri. Saat sheet hadir, legenda berpindah ke atas agar tidak tertutup. Peta tetap dapat digunakan.

## Elevation & Depth

Halaman dan kartu umumnya datar dengan batas tipis. Bayangan memberi pemisahan struktural hanya untuk pencarian mengambang, pengaturan, informasi lokasi, petunjuk, dan pesan di atas peta. Tidak ada lapisan kaca atau blur sebagai identitas.

Bayangan overlay memakai `--shadow`: terang `0 8px 30px #1b352d1a`, gelap `0 8px 30px #0004`. Pencarian beranda lebih ringan (`0 3px 12px #17392c06`); kontrol peta memakai `0 3px 12px #16332416`. Nilai lengkap dan menu seluler disimpan dalam sidecar.

## Shapes

Sudut lembut mengikuti tugas: status kecil, kontrol ringkas, kartu lebih lapang, preview peta paling terbuka. Radius normatif ada di frontmatter. Batas kartu menggunakan `line`; input dan tombol outline menggunakan `line-control`. Penanda riwayat berbentuk titik untuk lokasi laporan, tidak menyerupai area kelas bahaya. Logo tetap teks `LERENG.` tanpa lambang instansi rekaan.

## Components

- **Buttons:** tindakan spesifik seperti “Cek Lokasi di Peta”, “Baca detail”, dan “Muat ulang”. Tinggi dasar minimum 48px; kontrol utama peta seluler 44px. Primary memakai accent/surface, hover `brightness(.92)`; outline/ghost memakai accent-soft saat hover. Disabled beropasitas `.55` dan tidak dapat diaktifkan.
- **Inputs / pencarian:** field minimum 48px, batas tegas dan label aksesibel. Pencarian mendukung provinsi atau koordinat, belum alamat jalan. Input pencarian berada dalam kelompok dengan focus-within `2px` dan offset `2px`; outline input internal digantikan indikator kelompok, bukan dihapus tanpa pengganti.
- **Fokus:** indikator global `3px solid var(--accent)`, offset `4px`; skip link tersedia. Menu dan pengaturan dapat ditutup dengan Escape lalu fokus kembali ke pemicunya. Detail kejadian di halaman daftar/beranda menerima fokus saat dibuka dan mengembalikannya saat ditutup.
- **Navigation:** Beranda, Jelajahi Peta, Kejadian Longsor, Prediksi AI, Tentang LERENG. Aktif ditandai `aria-current=page` dan garis bawah desktop atau bidang berwarna seluler. Tujuan sekunder berada di footer dan tautan kontekstual.
- **Status / kartu laporan:** status selalu memiliki teks. Kartu menyandingkan wilayah, tanggal, ketelitian lokasi, detail, dan tautan peta bila koordinat tersedia. Detail memisahkan tanggal kejadian, publikasi, pengambilan, serta nilai belum diketahui.
- **Location sheet:** kartu kontekstual desktop berubah menjadi bottom sheet nonmodal seluler. Tombol judul mengembangkan/menciutkan isi dengan `aria-expanded` dan `aria-controls`; tombol tutup terpisah. Bukan dialog, tanpa backdrop atau focus trap.
- **Disclosure / data states:** filter lanjutan, metadata, analitik, dan metodologi memakai bagian yang dapat dibuka. Loading, kosong, dan gagal dijelaskan dengan teks; riwayat dapat dibaca tanpa peta. Prediksi AI belum tersedia dan peta kerawanan resmi belum tersedia; tidak ada skor, probabilitas, atau klasifikasi tervalidasi yang dapat ditampilkan.
- **Motion:** transisi latar tombol `.16s`, warna pilihan awal `.15s`; grafik tidak dianimasikan. Scroll dan kamera membantu orientasi, bukan pertunjukan. `prefers-reduced-motion: reduce` menonaktifkan transisi/animasi CSS dan smooth scroll; kamera serta perpindahan detail juga menghormatinya.

## Do's and Don'ts

### Do:
- **Do** gunakan Public Sans lokal untuk judul maupun isi.
- **Do** pertahankan peta sebagai fokus dan buka kontrol lanjutan sesuai kebutuhan.
- **Do** tampilkan sumber, status, ketelitian lokasi, serta waktu dengan arti yang jelas.
- **Do** pertahankan fokus terlihat, kedua tema, reduced motion, dan akses riwayat tanpa peta.

### Don't:
- **Don't** kembalikan sidebar admin permanen atau dashboard profesional sebagai pengalaman utama.
- **Don't** samakan oranye laporan dengan kelas bahaya atau data kosong dengan kondisi aman.
- **Don't** tampilkan skor AI, peta kerawanan, angka, atau klaim keselamatan tanpa data tervalidasi.
- **Don't** ubah bottom sheet lokasi menjadi modal yang mengunci peta.
