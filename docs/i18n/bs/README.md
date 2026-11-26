> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licenca](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Statični, pretraživi preglednik prijavljenih distribuiranih solarnih instalacija za svih 483 inkorporirana grada u Kaliforniji i svih 58 okruga.

## Mogućnosti

- Pretražite svaki inkorporirani grad u Kaliforniji i pregledajte svih 58 okruga.
- Pregledajte prijavljeni DC kapacitet, godišnje raspone proizvodnje prilagođene klimatskoj zoni i godini instalacije, petogodišnji rast, sektore korisnika i broj lokacija sa skladištenjem energije.
- Interaktivna tematska karta cijele savezne države sa službenim granicama inkorporiranih gradova.
- Rang-liste gradova sa filterima za broj stanovnika, pokrivenost elektroprivreda i geografiju poštanskih kodova, uz uporedni prikaz četiri grada.
- URL-ovi za dijeljenje gradova i okruga, preuzimanje CSV i SVG datoteka te jasno naznačena ograničenja podataka.
- 48 jezičkih oznaka interfejsa (20 Tier 1, 15 afričkih, 10 azijskih i 3 južnoslavenske) uz automatsko prepoznavanje jezika preglednika, birač jezika u zaglavlju i RTL raspored.

## Lokalizacija

Tekstovi interfejsa nalaze se u direktoriju `src/locales/` za 48 jezičkih oznaka. Pri učitavanju aplikacija provjerava `?lang=`, `localStorage` te `navigator.languages` / `navigator.language`, uz povratak na engleski jezik. RTL oznake (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) automatski postavljaju `dir="rtl"`.

## Lokalno pokretanje

```bash
npm ci
npm run dev
npm test
npm run build
```

Detalji o metodologiji, obradi podataka i izdanju Parquet datoteka nalaze se u punoj [engleskoj verziji README](../../../README.md). Objavljeno pod licencom [MIT](../../../LICENSE).
