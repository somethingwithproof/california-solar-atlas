> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licentie](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Een statische, doorzoekbare verkenner voor gerapporteerde gedistribueerde zonne-energie in alle 483 geïncorporeerde steden en alle 58 county's van Californië.

## Functies

- Doorzoek elke geïncorporeerde stad in Californië en blader door alle 58 county's.
- Bekijk gerapporteerde DC-capaciteit, voor klimaatzone en bouwjaar gecorrigeerde jaarlijkse opwekkingsbereiken, vijfjarige groei, klantsectoren en aantallen locaties gekoppeld aan energieopslag.
- Interactieve choropletenkaart voor de hele staat met officiële polygonen van geïncorporeerde steden.
- Stadsranglijsten met filters voor bevolking, nutsbedrijfsdekking en postgeografie, plus een directe vergelijking van vier steden naast elkaar.
- Deelbare stads- en county-URL's, CSV- en SVG-exports en transparante databeperkingen.
- 45 interface-locales (20 Tier 1-, 15 Afrikaanse en 10 Aziatische locales) met automatische taaldetectie in de browser, een taalkiezer in de koptekst en ondersteuning voor RTL-lay-out.

## Lokalisatie

Interfaceteksten staan in `src/locales/` verdeeld over 45 locales. Bij het laden controleert de app `?lang=`, `localStorage` en `navigator.languages` / `navigator.language`, met Engels als terugvaloptie. RTL-locales (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) stellen automatisch `dir="rtl"` in.

## Lokaal uitvoeren

```bash
npm ci
npm run dev
npm test
npm run build
```

Zie de volledige [Engelse README](../../../README.md) voor methodologie, datapijplijnen en details over Parquet-releases. Gelicentieerd onder [MIT](../../../LICENSE).
