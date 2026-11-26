> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lisensi](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Penjelajah statis yang dapat dicari untuk data energi surya terdistribusi yang dilaporkan di seluruh 483 kota berbadan hukum dan seluruh 58 county di California.

## Fitur

- Cari setiap kota berbadan hukum di California dan telusuri seluruh 58 county.
- Lihat kapasitas DC yang dilaporkan, rentang pembangkitan tahunan yang disesuaikan dengan zona iklim dan tahun pemasangan, pertumbuhan lima tahun, sektor pelanggan, dan jumlah lokasi yang terhubung dengan penyimpanan energi.
- Peta koroplet interaktif tingkat negara bagian menggunakan poligon resmi kota berbadan hukum.
- Pemeringkatan kota dengan filter populasi, cakupan utilitas, dan geografi surat-menyurat, serta perbandingan berdampingan hingga empat kota.
- URL kota dan county yang dapat dibagikan, ekspor CSV dan SVG, serta keterbatasan data yang transparan.
- 45 lokal antarmuka (20 lokal Tier 1, 15 lokal Afrika, dan 10 lokal Asia) dengan deteksi bahasa peramban otomatis, pemilih bahasa di header, dan dukungan tata letak RTL.

## Pelokalan

String antarmuka berada di `src/locales/` untuk 45 lokal. Saat dimuat, aplikasi memeriksa `?lang=`, `localStorage`, dan `navigator.languages` / `navigator.language`, lalu beralih ke bahasa Inggris sebagai cadangan. Lokal RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) otomatis mengatur `dir="rtl"`.

## Jalankan secara lokal

```bash
npm ci
npm run dev
npm test
npm run build
```

Lihat [README bahasa Inggris](../../../README.md) lengkap untuk detail metodologi, alur kerja data, dan rilis Parquet. Dilisensikan di bawah [MIT](../../../LICENSE).
