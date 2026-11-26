> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lesen](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Peneroka statik yang boleh dicari untuk tenaga suria teragih yang dilaporkan di semua 483 bandar diperbadankan di California dan semua 58 daerah.

## Ciri-ciri

- Cari setiap bandar diperbadankan di California dan semak imbas semua 58 daerah.
- Lihat kapasiti DC yang dilaporkan, julat penjanaan tahunan terlaras mengikut zon iklim dan usia pemasangan, pertumbuhan lima tahun, sektor pelanggan, dan kiraan tapak berkaitan storan.
- Peta koroplet interaktif peringkat negeri menggunakan poligon rasmi bandar diperbadankan.
- Kedudukan bandar dengan penapis populasi, liputan utiliti, dan geografi surat-menyurat, serta perbandingan sebelah-menyebelah empat bandar.
- URL bandar dan daerah yang boleh dikongsi, eksport CSV dan SVG, serta batasan data yang telus.
- 45 lokal antara muka (20 lokal Peringkat 1, 15 lokal Afrika, dan 10 lokal Asia) dengan pengesanan bahasa pelayar automatik, pemilih bahasa pengepala, dan sokongan reka letak RTL.

## Penyetempatan

Rentetan antara muka terletak dalam `src/locales/` merentasi 45 lokal. Semasa dimuatkan, aplikasi menyemak `?lang=`, `localStorage`, dan `navigator.languages` / `navigator.language`, dengan sandaran kepada Bahasa Inggeris. Lokal RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) menetapkan `dir="rtl"` secara automatik.

## Jalankan Secara Setempat

```bash
npm ci
npm run dev
npm test
npm run build
```

Lihat [README Bahasa Inggeris](../../../README.md) penuh untuk metodologi, saluran paip data, dan butiran keluaran Parquet. Dilesenkan di bawah [MIT](../../../LICENSE).
