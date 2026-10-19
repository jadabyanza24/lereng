# Masukan layanan AI

Adaptor operasional berada di `src/server/ingestion.ts` dan menulis ke PostGIS. Ekspor dataset penelitian harus mencatat versi sumber, CRS, resolusi, waktu pengamatan, waktu ketersediaan, dan bukti label. Tidak ada dataset pelatihan atau bobot model yang disertakan. Jangan menggunakan koordinat perkiraan katalog sebagai titik kejadian pasti.
