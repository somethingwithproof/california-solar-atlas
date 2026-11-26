> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Ìwé-àṣẹ](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Aṣàwárí aláìyípadà tí a lè ṣe ìwádìí nínú rẹ̀ fún agbára oòrùn tí a pín káàkiri tí a ròyìn ní gbogbo àwọn ìlú California 483 tí a fi sí abẹ́ òfin àti gbogbo àwọn agbègbè (counties) 58.

## Àwọn ẹ̀yà ara

- Ṣe ìwádìí gbogbo ìlú California tí a fi sí abẹ́ òfin kí o sì ṣàyẹ̀wò gbogbo àwọn agbègbè 58.
- Wo agbára DC tí a ròyìn, ìwọ̀n ìpèsè ọdọọdún tí a ṣàtúnṣe fún agbègbè ojú-ọjọ́ àti ọjọ́-orí, ìdàgbàsókè ọdún márùn-ún, àwọn ẹ̀ka oníbàárà, àti iye ibùdó tí ó ní ìsopọ̀ ìpamọ́ agbára.
- Àwòrán ilẹ̀ aláwọ̀-ìwọ̀n gbogbo ìpínlẹ̀ tí ó ń ṣiṣẹ́ pẹ̀lú àwọn ààlà ìlú tí a fi sí abẹ́ òfin.
- Ìtò ipò àwọn ìlú pẹ̀lú àwọn àlẹ̀mọ́ olùgbé, ìkápá ilé-iṣẹ́ agbára, àti ilẹ̀ ìfìwéránṣẹ́, pẹ̀lú ìfiwéra ẹ̀gbẹ́-sí-ẹ̀gbẹ́ ti ìlú mẹ́rin.
- Àwọn URL ìlú àti agbègbè tí a lè pín, ìkójáde CSV àti SVG, àti àwọn ààlà dátà tí ó hàn gbangba.
- Àwọn èdè agbègbè ojú-òpó 45 (20 ti Ìpele 1, 15 ti Áfíríkà, àti 10 ti Éṣíà) pẹ̀lú ìwárí èdè aṣàwárí aládàáni, olùyàn èdè lórí àkọlé, àti àtìlẹ́yìn ìṣètò RTL.

## Ìsọdèdè-agbègbè

Àwọn ọ̀rọ̀ ojú-òpó wà nínú `src/locales/` káàkiri àwọn èdè agbègbè 45. Ní ìbẹ̀rẹ̀ ìṣí, ohun-èlò náà ń ṣàyẹ̀wò `?lang=`, `localStorage`, àti `navigator.languages` / `navigator.language`, ó sì ń padà sí èdè Gẹ̀ẹ́sì bí kò bá sí. Àwọn èdè agbègbè RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) ń ṣètò `dir="rtl"` fúnra wọn.

## Ṣiṣẹ́ lórí ẹ̀rọ rẹ

```bash
npm ci
npm run dev
npm test
npm run build
```

Wo [README èdè Gẹ̀ẹ́sì](../../../README.md) ní kíkún fún ìlànà-iṣẹ́, àwọn ọ̀nà ìṣàn dátà, àti àlàyé ìtújáde Parquet. A fún un ní ìwé-àṣẹ lábẹ́ [MIT](../../../LICENSE).
