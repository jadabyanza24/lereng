# LERENG
<!-- impeccable:product-schema 1 -->

## Platform
web

## Stack
Next.js App Router, TypeScript, Tailwind, shadcn/ui, MapLibre, TanStack Query, Recharts, PostgreSQL/PostGIS, Drizzle, Python/FastAPI. Selected explicitly in the product brief.

## Product Purpose
Landslide Early Risk & Event Navigation Geoportal: panduan publik untuk memahami informasi longsor Indonesia. Kerawanan jangka panjang, riwayat kejadian, pengamatan/prakiraan lingkungan, dan penelitian AI dijelaskan sebagai informasi yang berbeda, bukan satu skor bahaya.

## Users
Pengguna utama adalah warga Indonesia, pelajar, komunitas, dan pelancong, termasuk yang tidak memahami GIS. Pengguna profesional tetap dapat memeriksa rincian dan sumber melalui kontrol lanjutan. Tidak ada dukungan atau keterwakilan instansi yang tersirat.

## Capabilities and Constraints
Interactive Indonesia map, source provenance, date/geographic filters, persisted real records, environmental information, and AI readiness. All public UI in Bahasa Indonesia. Never fabricate coordinates, statistics, trained models, probabilities, or warnings. Do not deploy or push.

Peta kerawanan resmi belum tersedia di LERENG dan belum ada model/hasil prediksi AI tervalidasi. Riwayat NASA GLC bukan inventaris resmi BNPB; prakiraan cuaca bukan pengamatan hujan atau peringatan longsor. Ekspor hanya mencakup halaman/tampilan yang sedang dimuat. Redesign publik mengubah presentasi, bukan backend, kontrak API, ingest, atau kesiapan model.

## Brand Commitments
LERENG sebagai merek teks; kepribadian dapat dipercaya, tenang, dan ramah. Hijau hutan, bidang netral hangat, Public Sans lokal regular/bold berlisensi SIL OFL 1.1, hierarki jelas, serta tema terang/gelap mendukung keterbacaan. Oranye menandai laporan/status informasi, bukan kelas bahaya.

Arahan eksplisit terbaru menggantikan dunia sidebar/dashboard: lima tujuan utama pada navigasi atas (Beranda, Jelajahi Peta, Kejadian Longsor, Prediksi AI, Tentang LERENG), tanpa sidebar permanen. Peta menjadi fokus; kontrol lanjutan dapat dibuka, dengan informasi lokasi berupa kartu desktop dan bottom sheet nonmodal di ponsel. Rute/fungsi lama tetap tersedia sebagai tujuan sekunder.

## Evidence on Hand
BMKG public API and CAP documentation verified. geoBoundaries ADM1 metadata verified: 34 provinces representing 2017, ODbL. NASA GLC public ArcGIS mirror query and permission statement verified; uncertain media-based incident locations. BNPB API access and licensed PVMBG/BIG GIS layers remain blocked or unverified.

## Product Principles
1. Availability is visible; missing data never becomes a zero-risk claim.
2. Every fact links to its source and separates retrieval from publication.
3. Research models are not official public warnings.

## Accessibility & Inclusion
Keyboard operability, clear focus, sufficient contrast, responsive layouts, reduced-motion support, and alternatives to map-only incident access.
