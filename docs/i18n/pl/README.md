> [English](../../../README.md)

# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![Licencja](https://img.shields.io/badge/license-MIT-blue)](../../../LICENSE)

Statyczna przeglądarka z wyszukiwarką prezentująca zgłoszone rozproszone instalacje fotowoltaiczne we wszystkich 483 miastach posiadających prawa miejskie w Kalifornii oraz we wszystkich 58 hrabstwach.

## Funkcje

- Wyszukiwanie każdego miasta z prawami miejskimi w Kalifornii oraz przeglądanie wszystkich 58 hrabstw.
- Przeglądanie zgłoszonej mocy DC, zakresów rocznej produkcji skorygowanych o strefę klimatyczną i rok instalacji, wzrostu pięcioletniego, sektorów odbiorców oraz liczby obiektów z magazynami energii.
- Interaktywna mapa kartogramowa całego stanu wykorzystująca oficjalne granice miast posiadających prawa miejskie.
- Rankingi miast z filtrami liczby ludności, obszaru obsługi zakładów energetycznych i geografii kodów pocztowych, a także porównanie czterech miast obok siebie.
- Udostępnialne adresy URL miast i hrabstw, eksport do CSV i SVG oraz przejrzysty opis ograniczeń danych.
- 45 wersji językowych interfejsu (20 z grupy Tier 1, 15 afrykańskich i 10 azjatyckich) z automatycznym wykrywaniem języka przeglądarki, przełącznikiem języka w nagłówku i obsługą układu RTL.

## Lokalizacja

Ciągi znaków interfejsu znajdują się w katalogu `src/locales/` dla 45 ustawień regionalnych. Podczas ładowania aplikacja sprawdza `?lang=`, `localStorage` oraz `navigator.languages` / `navigator.language`, a w razie braku dopasowania używa języka angielskiego. Ustawienia regionalne RTL (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) automatycznie ustawiają `dir="rtl"`.

## Uruchomienie lokalne

```bash
npm ci
npm run dev
npm test
npm run build
```

Szczegółowe informacje o metodologii, potokach przetwarzania danych i publikacji plików Parquet znajdują się w pełnej [angielskiej wersji README](../../../README.md). Udostępniono na licencji [MIT](../../../LICENSE).
