> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licencija](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Statični, pretraživi preglednik prijavljenih distribuiranih solarnih sustava za svih 483 uvrštena grada u Kaliforniji i svih 58 okruga.

## Značajke

- Pretražite svaki uvršteni grad u Kaliforniji i pregledajte svih 58 okruga.
- Pregledajte prijavljeni DC kapacitet, godišnje raspone proizvodnje prilagođene klimatskoj zoni i godini ugradnje, petogodišnji rast, sektore kupaca i broj lokacija s pohranom energije.
- Interaktivna tematska karta cijele savezne države sa službenim granicama uvrštenih gradova.
- Poredak gradova s filtrima za broj stanovnika, pokrivenost opskrbljivača i zemljopisnu distribuciju poštanskih brojeva, uz usporedni prikaz četiriju gradova.
- Poveznice za dijeljenje gradova i okruga, preuzimanje CSV i SVG datoteka te jasno prikazana ograničenja podataka.
- 48 jezičnih oznaka sučelja (20 Tier 1, 15 afričkih, 10 azijskih i 3 južnoslavenske) uz automatsko prepoznavanje jezika preglednika, odabir jezika u zaglavlju i RTL prikaz.

## Lokalizacija

Znakovni nizovi sučelja pohranjeni su u mapi `src/locales/` za 48 jezičnih oznaka. Pri učitavanju aplikacija provjerava `?lang=`, `localStorage` te `navigator.languages` / `navigator.language`, uz povratak na engleski jezik. RTL oznake (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) automatski postavljaju `dir="rtl"`.

## Lokalno pokretanje

```bash
npm ci
npm run dev
npm test
npm run build
```

Pojedinosti o metodologiji, cjevovodima podataka i izdanjima Parquet datoteka nalaze se u cjelovitoj [engleskoj inačici README](../../../README.md). Objavljeno pod licencijom [MIT](../../../LICENSE).
