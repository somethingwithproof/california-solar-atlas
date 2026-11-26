> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Mpikaroka tranonkala tsy miovaova sy azo karohina ho an'ny angovo avy amin'ny masoandro voalaza manerana ny tanàna miisa 483 manana sata ara-dalàna ao California sy ny faritra miisa 58 rehetra.

## Endri-javatra

- Mikaroka ny tanàna manana sata ara-dalàna tsirairay ao California ary mijery ireo faritra miisa 58 rehetra.
- Mijery ny tanjaka DC voalaza, ny elanelam-pamokarana isan-taona namboarina araka ny faritra toetr'andro sy ny taona nametrahana, ny fitomboana tao anatin'ny dimy taona, ny sehatry ny mpanjifa, ary ny isan'ny toerana mifandray amin'ny fitahirizana angovo.
- Sarintany choropleth ifandrimbonana manerana ny fanjakana mampiasa ny endri-javatra ofisialin'ireo tanàna manana sata ara-dalàna.
- Filaharan'ny tanàna miaraka amin'ny sivana araka ny mponina, ny fandrakofan'ny orinasa mpamatsy herinaratra, ary ny jeografia fandefasana paositra, miampy fampitahana mifanatrika tanàna efatra.
- Rohy URL azo zaraina ho an'ny tanàna sy faritra, fanondranana CSV sy SVG, ary famerana mangarahara momba ny angon-drakitra.
- Fiteny eo an-toerana ho an'ny sary famantarana miisa 45 (fiteny sokajy 1 miisa 20, fiteny afrikanina miisa 15, ary fiteny aziatika miisa 10) miaraka amin'ny famantarana mandeha ho azy ny fitenin'ny mpitety tranonkala, fisafidianana fiteny eo amin'ny lohan'ny pejy, ary fanohanana ny fisehoana RTL.

## Fampifanarahana amin'ny fiteny

Ireo lahatsoratra eo amin'ny sary famantarana dia mipetraka ao amin'ny `src/locales/` ho an'ny fiteny eo an-toerana miisa 45. Rehefa misokatra ny rindranasa dia manamarina ny `?lang=`, `localStorage`, ary `navigator.languages` / `navigator.language` izy, ary miverina amin'ny teny anglisy raha tsy misy mifanaraka. Ireo fiteny RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) dia mametraka mandeha ho azy ny `dir="rtl"`.

## Fampandehanana eo an-toerana

```bash
npm ci
npm run dev
npm test
npm run build
```

Jereo ny [README amin'ny teny anglisy](../../../README.md) feno ho an'ny fomba fiasa, ny lalan'ny angon-drakitra, ary ny antsipiriany momba ny famoahana Parquet. Navoaka teo ambany lisansa [MIT](../../../LICENSE).
