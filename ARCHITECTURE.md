# Arsitektur

```text
MapLibre / daftar / Recharts
  -> TanStack Query -> Next.js /api/* -> Zod -> Drizzle SQL -> PostgreSQL/PostGIS
Worker/CLI -> adaptor sumber -> normalisasi -> upsert + provenance + ingestion_runs
Dataset penelitian -> validasi CRS/waktu -> fitur -> spatial-temporal split -> model research
FastAPI -> status model / kontrak predict (fail closed)
```

## Batas tanggung jawab

- `src/components/`: UI client dan map lazy-loaded. Navigasi tetap menyediakan akses daftar tanpa WebGL.
- `src/lib/`: tipe bersama, parameter permintaan, navigasi.
- `src/server/queries.ts`: invariant filter kejadian dan analitik memakai `incidentWhere` yang sama. Drizzle membangun query terparameterisasi. Identitas tabel tidak diambil dari input pengguna.
- `src/server/ingestion.ts`: adaptor NASA, BMKG, geoBoundaries, pembatasan laju, retry, validasi, penyimpanan sumber asli.
- `src/server/news.ts`: RSS dengan izin operator, metadata saja, tidak ada konfirmasi otomatis.
- `db/001_initial.sql`: skema PostGIS, FK, constraints, indeks GiST, waktu penerbitan dan pengambilan terpisah. `scripts/migrate.ts` menerapkan transaksi idempoten. Perubahan skema berikutnya harus berupa migrasi bernomor baru dan diuji terhadap salinan backup.
- `ai/`: paket Python yang tidak dijalankan di browser. Endpoint inferensi sengaja belum memuat model. Artefak riset tidak otomatis masuk status tervalidasi.

## Ketahanan dan skala

Query kejadian dibatasi hingga 2.000 catatan per viewport dan menyertakan total/has_more. Perbesar peta untuk dataset padat; daftar terpisah menggunakan halaman 25 catatan. Analitik menghitung seluruh himpunan sesuai filter, bukan hanya halaman yang dimuat. Waktu akhir filter inklusif diterapkan sebagai `< tanggal+1 hari` UTC. Indeks GiST mendukung bbox dan `geography ST_DWithin` dalam meter.

Respons GET memakai cache 30 detik dan stale-while-revalidate 60 detik. TanStack Query stale time 60 detik. Batas disederhanakan untuk peta, detail sumber tidak disamakan dengan resolusi resmi. Vector tiles belum diterapkan; tingkatkan ke ST_AsMVT/tile cache bila uji beban menunjukkan kebutuhan.

Setiap sumber memiliki lock advisory di koneksi yang dicadangkan, run log, percobaan terakhir, keberhasilan terakhir dan pesan kesalahan. Upsert katalog per halaman mempertahankan data yang sudah berhasil bila halaman berikutnya gagal; sumber ditandai gagal sehingga data parsial tidak dianggap pembaruan lengkap. Metadata sumber tidak boleh mengklaim publikasi dataset hanya dari waktu pengambilan.

## Keamanan

API publik read-only kecuali kontrak inferensi yang fail-closed. Tidak ada endpoint ingest publik. Zod membatasi bbox, koordinat, tanggal, pagination, teks, status dan horizon. Data sumber masuk UI melalui escaping React; tidak menggunakan `dangerouslySetInnerHTML` atau popup HTML sumber. Tautan hanya HTTP(S). Secret tidak memakai awalan NEXT_PUBLIC. Structured logs tidak mencatat kredensial.

Rate limit memory adalah per-process, bukan global. Default semua request satu bucket 180/menit; hanya aktifkan TRUST_PROXY di belakang proxy yang mengganti X-Forwarded-For. Produksi multi-instance memerlukan gateway/Redis. `AI_SERVICE_URL` hanya menunjuk layanan internal, tidak mengaktifkan model. Tidak ada klaim keamanan atau sertifikasi yang belum diuji.

## Operasi dan rollback

Compose menyimpan PostGIS dan geodata pada volume. Backup dengan `pg_dump -Fc`, verifikasi restore ke database terpisah sebelum perubahan skema. Jangan `docker compose down -v` kecuali memang berniat menghapus volume. Rollback aplikasi cukup menjalankan image sebelumnya; migrasi saat ini aditif. Worker dapat dihentikan tanpa menghentikan pembacaan data tersimpan. Tidak ada jadwal pelatihan otomatis.
