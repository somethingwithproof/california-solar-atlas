> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Kichunguzi tuli kinachoweza kutafutwa kwa nishati ya jua iliyosambazwa iliyoripotiwa katika miji yote 483 iliyosajiliwa ya California na kaunti zote 58.

## Vipengele

- Tafuta kila mji uliosajiliwa wa California na uvinjari kaunti zote 58.
- Tazama uwezo wa DC ulioripotiwa, viwango vya uzalishaji wa kila mwaka vilivyorekebishwa kulingana na ukanda wa hali ya hewa na umri wa mitambo, ukuaji wa miaka mitano, sekta za wateja, na idadi ya maeneo yaliyounganishwa na hifadhi ya betri.
- Ramani shirikishi ya choropleth ya jimbo zima inayotumia poligoni rasmi za miji iliyosajiliwa.
- Orodha ya viwango vya miji yenye vichujio vya idadi ya watu, ufikiaji wa huduma za umeme, na jiografia ya posta, pamoja na ulinganisho wa miji minne bega kwa bega.
- URL za miji na kaunti zinazoweza kushirikiwa, uhamishaji wa CSV na SVG, na maelezo ya wazi ya mipaka ya data.
- Lugha na maeneo 45 ya kiolesura (maeneo 20 ya Daraja la 1, 15 ya Afrika, na 10 ya Asia) yenye utambuzi wa kiotomatiki wa lugha ya kivinjari, kichagua lugha kwenye kichwa cha ukurasa, na usaidizi wa mpangilio wa RTL.

## Ujanibishaji

Mitungo ya kiolesura iko katika `src/locales/` kwa lugha na maeneo 45. Wakati wa kupakia, programu hukagua `?lang=`, `localStorage`, na `navigator.languages` / `navigator.language`, na kurudi kwenye Kiingereza kama chaguo-msingi. Maeneo ya RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) huweka `dir="rtl"` kiotomatiki.

## Endesha kwenye mashine

```bash
npm ci
npm run dev
npm test
npm run build
```

Tazama [README kamili ya Kiingereza](../../../README.md) kwa mbinu, mifumo ya uchakataji wa data, na maelezo ya toleo la Parquet. Imepewa leseni chini ya [MIT](../../../LICENSE).
