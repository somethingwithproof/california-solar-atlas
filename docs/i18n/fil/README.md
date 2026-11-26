> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lisensya](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Isang static at nahahanap na explorer para sa naiulat na distributed solar sa lahat ng 483 incorporated na lungsod at lahat ng 58 county ng California.

## Mga Tampok

- Hanapin ang bawat incorporated na lungsod sa California at i-browse ang lahat ng 58 county.
- Tingnan ang naiulat na DC capacity, mga saklaw ng taunang produksyon na inangkop sa climate zone at vintage, limang-taong paglago, mga sektor ng customer, at bilang ng mga site na nakakonekta sa storage.
- Interactive na choropleth map sa buong estado gamit ang mga opisyal na polygon ng incorporated na lungsod.
- Mga ranggo ng lungsod na may mga filter para sa populasyon, sakop ng utility, at heograpiya ng pagpapadala, kasama ang magkatabing paghahambing ng apat na lungsod.
- Mga naibabahaging URL ng lungsod at county, pag-export ng CSV at SVG, at malinaw na mga limitasyon sa datos.
- 45 locale ng interface (20 Tier 1, 15 African, at 10 Asian na locale) na may awtomatikong pagtukoy ng wika ng browser, tagapili ng wika sa header, at suporta para sa RTL na layout.

## Lokalisasyon

Matatagpuan ang mga string ng interface sa `src/locales/` sa 45 locale. Sa pag-load, tinitingnan ng app ang `?lang=`, `localStorage`, at `navigator.languages` / `navigator.language`, at nagfa-fallback sa Ingles. Awtomatikong itinatakda ng mga RTL na locale (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) ang `dir="rtl"`.

## Patakbuhin nang lokal

```bash
npm ci
npm run dev
npm test
npm run build
```

Tingnan ang buong [README sa Ingles](../../../README.md) para sa metodolohiya, mga data pipeline, at mga detalye ng Parquet release. Lisensyado sa ilalim ng [MIT](../../../LICENSE).
