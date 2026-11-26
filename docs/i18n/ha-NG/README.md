> [English](../../../README.md)

# Taswirar Hasken Rana ta California

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lasisi](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Mai bincike na tsaye mai sauƙin nema don bayanan hasken rana da aka rarraba a faɗin dukkan biranen California 483 da aka kafa a hukumance da dukkan gundumomi 58.

## Abubuwan da Ke Ciki

- Nemo kowane birnin California da aka kafa a hukumance kuma duba dukkan gundumomi 58.
- Duba ƙarfin DC da aka ruwaito, kewayon samar da wutar lantarki na shekara da aka daidaita bisa yankin yanayi da shekarar shigarwa, haɓakar shekaru biyar, sassan abokan ciniki, da adadin wuraren da ke da ma'ajiyar batir.
- Taswirar launi mai mu'amala ta faɗin jihar da ke amfani da sifofin biranen hukuma.
- Jerin matsayin birane tare da masu tace yawan jama'a, iyakar kamfanonin wuta, da yankin adireshin gidan waya, tare da kwatancen birane huɗu gefe da gefe.
- Adiresoshin URL na birane da gundumomi masu rabawa, fitar da fayilolin CSV da SVG, da bayyanannun iyakokin bayanai.
- Harsunan fuskar amfani 45 (20 na Mataki na 1, 15 na Afirka, da 10 na Asiya) tare da gano harshen burauza ta atomatik, zaɓin harshe a saman shafi, da tallafin tsarin rubutu na dama-zuwa-hagu (RTL).

## Daidaita Harshe

Jimlolin fuskar amfani suna cikin `src/locales/` a harsuna 45. Lokacin buɗewa, manhajar tana duba `?lang=`, `localStorage`, da `navigator.languages` / `navigator.language`, sannan ta koma Turanci idan ba a samu ba. Harsunan RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) suna saita `dir="rtl"` ta atomatik.

## Gudanarwa a Na'urar Gida

```bash
npm ci
npm run dev
npm test
npm run build
```

Duba cikakken [README na Turanci](../../../README.md) don hanyoyin bincike, bututun bayanai, da cikakkun bayanai na sakin Parquet. An ba da lasisi ƙarƙashin [MIT](../../../LICENSE).
