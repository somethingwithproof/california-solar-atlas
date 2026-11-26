> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Igikoresho kidahinduka gishakishwamo amakuru y'amashanyarazi akomoka ku mirasire y'izuba yatanzweho raporo mu mijyi yose 483 yemewe ya California n'uturere twose 58.

## Ibiranga

- Shakisha buri mujyi wemewe wa California kandi ushakishe mu turere twose 58.
- Reba ubushobozi bwa DC bwatanzweho raporo, ibipimo by'amashanyarazi atangwa buri mwaka bihujwe n'ikirere n'igihe sisitemu yashyiriweho, izamuka mu myaka itanu, ibyiciro by'abakiliya, n'imibare y'ahantu hafite ububiko bw'amashanyarazi.
- Ikarita ya choropleth yo mu rwego rwa leta ikoreshwa mu buryo bwikorana ikoresheje imipaka yemewe y'imijyi.
- Urutonde rw'imijyi rufite muyunguruzo y'abaturage, igipimo cy'amasosiyete atanga amashanyarazi, n'imiterere y'amaposita, hamwe n'igereranya ry'imijyi ine icyarimwe.
- Amahuza y'imijyi n'uturere ashobora gusangizwa, gukuramo dosiye za CSV na SVG, n'imbogamizi z'amakuru zisobanutse neza.
- Indimi 45 z'imigaragarire (indimi 20 z'icyiciro cya 1, 15 zo muri Afurika, na 10 zo muri Aziya) zifite ubugenzuzi bwikora bw'ururimi rwa mushakisha, ihitamo ry'ururimi ku mutwe, n'ubufasha bw'imyandikire ya RTL.

## Ishyirwa mu ndimi

Amagambo y'imigaragarire ari muri `src/locales/` mu ndimi 45. Iyo ifunguye, porogaramu igenzura `?lang=`, `localStorage`, na `navigator.languages` / `navigator.language`, ikabura ikisubirira ku Cyongereza. Indimi za RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) zishyiraho `dir="rtl"` mu buryo bwikora.

## Gukoresha kuri mudasobwa yawe

```bash
npm ci
npm run dev
npm test
npm run build
```

Reba [README yuzuye mu Cyongereza](../../../README.md) kugira ngo ubone uburyo bw'ikoranabuhanga, imiyoboro y'amakuru, n'amakuru arambuye ku isohoka rya Parquet. Ifite uruhushya rwa [MIT](../../../LICENSE).
