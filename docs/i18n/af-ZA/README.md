> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Lisensie](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

'n Statiese, soekbare verkenner vir aangemelde verspreide sonkrag oor al 483 geïnkorporeerde Kaliforniese stede en al 58 graafskappe.

## Kenmerke

- Soek elke geïnkorporeerde Kaliforniese stad en blaai deur al 58 graafskappe.
- Bekyk aangemelde GS-kapasiteit, klimaatsone- en jaaroudheid-aangepaste jaarlikse opwekkingsreekse, vyfjaar-groei, kliëntsektore en bergingsgekoppelde terreintellings.
- Interaktiewe staatswye koropleetkaart wat amptelike geïnkorporeerde-stad-poligone gebruik.
- Stadsranglyste met filters vir bevolking, nutsdiensdekking en posgeografie, plus 'n sy-aan-sy-vergelyking van vier stede.
- Deelbare stad- en graafskap-URL's, CSV- en SVG-uitvoere en deursigtige databeperkings.
- 45 koppelvlak-locales (20 Vlak 1-, 15 Afrika- en 10 Asiatiese locales) met outomatiese blaaier-taalbespeuring, taalkieser in die kopstuk en RTL-uitlegondersteuning.

## Lokalisering

Koppelvlakstringe lê in `src/locales/` oor 45 locales. By laai kontroleer die toepassing `?lang=`, `localStorage` en `navigator.languages` / `navigator.language`, en val terug na Engels. RTL-locales (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) stel outomaties `dir="rtl"`.

## Plaaslik uitvoer

```bash
npm ci
npm run dev
npm test
npm run build
```

Sien die volledige [Engelse README](../../../README.md) vir metodologie, datapyplyne en Parquet-vrystellingsbesonderhede. Gelisensieer onder [MIT](../../../LICENSE).
