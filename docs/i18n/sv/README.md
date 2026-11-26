> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licens](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Ett statiskt, sökbart utforskningsverktyg för rapporterad distribuerad solenergi i alla 483 inkorporerade städer och alla 58 countyn i Kalifornien.

## Funktioner

- Sök bland alla inkorporerade städer i Kalifornien och bläddra i alla 58 countyn.
- Visa rapporterad DC-kapacitet, årliga produktionsintervall justerade för klimatzon och anläggningsålder, femårstillväxt, kundsektorer samt antal anläggningar kopplade till energilagring.
- Interaktiv koropletkarta över hela delstaten med officiella polygoner för inkorporerade städer.
- Stadsrankningar med filter för befolkning, elnätstäckning och postgeografi, samt jämförelse av fyra städer sida vid sida.
- Delbara URL:er för städer och countyn, export till CSV och SVG samt transparenta databegränsningar.
- 45 gränssnittsspråk (20 Tier 1-, 15 afrikanska och 10 asiatiska språkområden) med automatisk språkidentifiering i webbläsaren, språkväljare i sidhuvudet och stöd för RTL-layout.

## Lokalisering

Gränssnittssträngarna finns i `src/locales/` för 45 språkområden. Vid inläsning kontrollerar appen `?lang=`, `localStorage` och `navigator.languages` / `navigator.language`, med engelska som reservspråk. RTL-språkområden (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) ställer automatiskt in `dir="rtl"`.

## Kör lokalt

```bash
npm ci
npm run dev
npm test
npm run build
```

Se den fullständiga [engelska README-filen](../../../README.md) för information om metodik, datapipelines och Parquet-utgåvor. Licensierad under [MIT](../../../LICENSE).
