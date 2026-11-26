> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Ngwa nchọgharị kwụ ọtọ a pụrụ ịchọ ihe na ya maka ike anyanwụ e kesara ekesa a kọrọ n'obodo 483 e debanyere aha na California na mpaghara 58 niile.

## Njirimara

- Chọọ obodo ọ bụla e debanyere aha na California ma legharịa anya na mpaghara 58 niile.
- Lee ikike DC a kọrọ, oke mmepụta kwa afọ edoziri maka mpaghara ihu igwe na afọ nrụnye, uto nke afọ ise, ngalaba ndị ahịa, na ọnụọgụ saịtị jikọtara na nchekwa ike.
- Maapụ choropleth nke steeti niile na-emekọrịta ihe nke na-eji polygons gọọmentị nke obodo e debanyere aha.
- Nhazi ọkwa obodo nwere nzacha maka ọnụọgụ mmadụ, mkpuchi ọrụ ọkụ, na mpaghara nzipu ozi, yana ntụnyere obodo anọ n'akụkụ n'akụkụ.
- URL obodo na mpaghara a pụrụ ịkekọrịta, mbupụ CSV na SVG, na oke data doro anya.
- Asụsụ obodo 45 maka ihu njikọ (asụsụ Tier 1 20, asụsụ Afrịka 15, na asụsụ Eshia 10) nwere nchọpụta asụsụ ihe nchọgharị akpaaka, nhọrọ asụsụ n'isi peeji, na nkwado nhazi RTL.

## Nkwado asụsụ obodo

Okwu ihu njikọ dị na `src/locales/` gafee asụsụ obodo 45. Mgbe ọ na-ebudata, ngwa ahụ na-elele `?lang=`, `localStorage`, na `navigator.languages` / `navigator.language`, ma laghachi na Bekee ma ọ bụrụ na ahụghị ya. Asụsụ obodo RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) na-atọ `dir="rtl"` n'onwe ha.

## Gbaa n'ime kọmputa gị

```bash
npm ci
npm run dev
npm test
npm run build
```

Lee [README Bekee](../../../README.md) zuru ezu maka usoro ọrụ, ọkpọkọ data, na nkọwa mwepụta Parquet. E nyere ikikere n'okpuru [MIT](../../../LICENSE).
