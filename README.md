# California Solar Atlas

[![CI](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/somethingwithproof/california-solar-atlas/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/somethingwithproof/california-solar-atlas/badge)](https://scorecard.dev/viewer/?uri=github.com/somethingwithproof/california-solar-atlas)

**Languages:** **English** · [Deutsch](docs/i18n/de/README.md) · [Español](docs/i18n/es/README.md) · [Français](docs/i18n/fr/README.md) · [Português (BR)](docs/i18n/pt-BR/README.md) · [日本語](docs/i18n/ja/README.md) · [한국어](docs/i18n/ko/README.md) · [简体中文](docs/i18n/zh-CN/README.md) · [العربية](docs/i18n/ar/README.md) · [हिन्दी](docs/i18n/hi/README.md)

<details>
<summary>All 45 languages</summary>

**Tier 1:** **English** · [Deutsch](docs/i18n/de/README.md) · [Español](docs/i18n/es/README.md) · [Français](docs/i18n/fr/README.md) · [Italiano](docs/i18n/it/README.md) · [Português (BR)](docs/i18n/pt-BR/README.md) · [Nederlands](docs/i18n/nl/README.md) · [Русский](docs/i18n/ru/README.md) · [Українська](docs/i18n/uk/README.md) · [日本語](docs/i18n/ja/README.md) · [한국어](docs/i18n/ko/README.md) · [简体中文](docs/i18n/zh-CN/README.md) · [繁體中文](docs/i18n/zh-TW/README.md) · [العربية](docs/i18n/ar/README.md) · [हिन्दी](docs/i18n/hi/README.md) · [Polski](docs/i18n/pl/README.md) · [Türkçe](docs/i18n/tr/README.md) · [Svenska](docs/i18n/sv/README.md) · [Tiếng Việt](docs/i18n/vi/README.md) · [Bahasa Indonesia](docs/i18n/id/README.md)

**African:** [Afrikaans (ZA)](docs/i18n/af-ZA/README.md) · [አማርኛ (ET)](docs/i18n/am-ET/README.md) · [العربية (مصر)](docs/i18n/ar-EG/README.md) · [العربية (المغرب)](docs/i18n/ar-MA/README.md) · [Français (MA)](docs/i18n/fr-MA/README.md) · [Français (SN)](docs/i18n/fr-SN/README.md) · [Hausa (NG)](docs/i18n/ha-NG/README.md) · [Igbo (NG)](docs/i18n/ig-NG/README.md) · [Malagasy (MG)](docs/i18n/mg-MG/README.md) · [Kinyarwanda (RW)](docs/i18n/rw-RW/README.md) · [Soomaali (SO)](docs/i18n/so-SO/README.md) · [Kiswahili (KE)](docs/i18n/sw-KE/README.md) · [isiXhosa (ZA)](docs/i18n/xh-ZA/README.md) · [Yorùbá (NG)](docs/i18n/yo-NG/README.md) · [isiZulu (ZA)](docs/i18n/zu-ZA/README.md)

**Asian:** [বাংলা](docs/i18n/bn/README.md) · [فارسی](docs/i18n/fa/README.md) · [עברית](docs/i18n/he/README.md) · [मराठी](docs/i18n/mr/README.md) · [தமிழ்](docs/i18n/ta/README.md) · [తెలుగు](docs/i18n/te/README.md) · [ไทย](docs/i18n/th/README.md) · [اردو](docs/i18n/ur/README.md) · [Bahasa Melayu](docs/i18n/ms/README.md) · [Filipino](docs/i18n/fil/README.md)

</details>

A static, searchable explorer for distributed solar in every incorporated California city and all 58 counties. It uses real interconnected project-site capacity and never invents a city electricity denominator where one has not been verified.

The interface is designed for GitHub Pages: no server, database, API keys, or runtime data pipeline is required. The compact city aggregate is committed; the 1.2 GB raw source remains outside the repository.

## Features

- Search all 483 incorporated California cities
- Browse all 58 counties, including source-reported unincorporated records, with a separate 2024 CEC all-utility benchmark
- Climate-zone and vintage-adjusted annual generation ranges
- Reported capacity, five-year growth, project counts, customer sectors, and storage-linked site counts
- Interactive statewide choropleth using official incorporated-city polygons
- Rankings with population, utility-coverage, and mailing-geography controls; per-resident ranking is withheld because the numerator and denominator use incompatible geographies
- Four-city comparison
- Shareable city and county URLs plus city CSV and SVG downloads
- Explicit measured, modeled, partial-coverage, and unavailable states
- Keyboard navigation, reduced-motion support, and responsive layouts
- 45 interface locales (20 Tier 1, 15 African, and 10 Asian) with browser language auto-detection, header language selector, and RTL layout for Arabic, Persian, Hebrew, and Urdu

## Localization

The interface includes translations in `src/locales/` for 45 locales: 20 Tier 1 (`en`, `de`, `es`, `fr`, `it`, `pt-BR`, `nl`, `ru`, `uk`, `ja`, `ko`, `zh-CN`, `zh-TW`, `ar`, `hi`, `pl`, `tr`, `sv`, `vi`, `id`), 15 African (`af-ZA`, `am-ET`, `ar-EG`, `ar-MA`, `fr-MA`, `fr-SN`, `ha-NG`, `ig-NG`, `mg-MG`, `rw-RW`, `so-SO`, `sw-KE`, `xh-ZA`, `yo-NG`, `zu-ZA`), and 10 Asian (`bn`, `fa`, `he`, `mr`, `ta`, `te`, `th`, `ur`, `ms`, `fil`). On initial load, the app checks `?lang=`, saved `localStorage`, and `navigator.languages` / `navigator.language`, falling back to English. Selecting an RTL locale (`ar`, `ar-EG`, `ar-MA`, `fa`, `he`, `ur`) sets `<html lang="..." dir="rtl">`. Localized READMEs for all 44 non-English locales live under `docs/i18n/<locale>/README.md`.

## Run locally

See [CI and selective Sonar analysis](docs/ci.md) for workflow ownership,
data/security checks, coverage, and Sonar setup during modernization.

```bash
npm ci
npm run dev
```

## Rebuild the statewide data

Download the official California city identifiers CSV, DG Stats “Interconnected Project Sites” ZIP, Department of Finance population workbook, Census Gazetteer, and CEC climate-zone GeoJSON, then run:

```bash
CA_CITY_CSV=/path/to/cities.csv \
CA_DG_ZIP=/path/to/projects.zip \
CA_POPULATION_XLSX=/path/to/population.xlsx \
CA_GAZETTEER=/path/to/gazetteer.txt \
CA_CLIMATE_ZONES=/path/to/climate-zones.geojson \
npm run data:build

CA_CITY_GEOJSON=/path/to/city-boundaries.geojson npm run data:boundaries
```

The scripts keep the large raw files outside the repository and emit compact city and boundary files suitable for GitHub Pages.

Each source path must be supplied explicitly; the scripts fail when a required
variable is missing. The refresh workflow downloads into a private directory for
each run and permits HTTPS redirects only.

Build the Parquet release assets from the browser JSON with:

```bash
python scripts/export-parquet.py            # writes dist-data/
python scripts/export-parquet.py --replace  # overwrites a previous release
```

`--replace` only removes a `dist-data/` that carries a `metadata.json` from an earlier export.

## Methodology

- Capacity is the sum of positive `System Size DC` values for records whose technology includes photovoltaic, grouped by the utility-reported `Service City`.
- Annual generation uses fleet-average bands of 1,250–1,750 kWh/kW-DC-year assigned through official CEC climate-zone polygons.
- Each installation vintage receives 0.5% annual degradation before the generation range is calculated.
- Solar share is shown only for cities with an explicitly onboarded load record and equals degradation-adjusted gross generation divided by grid deliveries plus degradation-adjusted gross generation.
- Service-city strings are not a parcel-level spatial join. The interface discloses this and other limitations prominently.
- Population follows legal city boundaries and is descriptive only. The application does not divide it into service-city capacity or publish a per-resident ranking.
- The 2026 Department of Finance E-1H housing estimate provides a screening diagnostic: cities where residential project sites exceed 35% of legal-boundary housing units are flagged as likely mailing inflation and excluded from rankings by default. The flag does not correct or replace the service-city total.
- Storage-linked sites are counted, but aggregate MWh is withheld because the source `Storage Capacity (kWh)` field contains inconsistent scales relative to storage kW. Negative and nonnumeric source values are excluded and counted in the published data-quality fields.
- The source ZIP contains PG&E, SCE, and SDG&E files. Municipal utility systems such as LADWP and SMUD are outside its coverage, so affected city totals are lower bounds.
- County views aggregate the exact DG Stats `Service County` field before city matching, so they retain unincorporated and unmatched service-city records. They remain an IOU-only, MW-DC inventory.
- Each county also shows a separate CEC-1304B 2024 all-utility benchmark for solar systems 1 MW and smaller. It is AC-rated and is never added to or substituted for the newer DG Stats DC total.
- Historical charts group currently listed projects by approval date. They are labeled as a proxy because superseding applications can change the apparent vintage.

Run `npm test` to validate schema, city coverage, capacity, generation arithmetic, climate zones, population matches, and known utility warnings.

See [the data correctness audit](docs/data-audit.md) for the capacity-column verification, San Jose storage spot check, mailing-geography diagnostic, and reconciliation checks. See [the utility data audit](docs/utility-data-audit.md) for municipal-utility and CCA coverage.

## Security and dependency maintenance

Rendered HTML and SVG pass through DOMPurify before reaching the document.
The rendering tests cover active-content removal and preservation of map paths,
accessible controls, and source links.

GitHub CodeQL, secret scanning with push protection, private vulnerability reporting, dependency review, and Dependabot security updates protect the public repository. `.github/dependabot.yml` also schedules weekly npm and GitHub Actions version updates. See [SECURITY.md](SECURITY.md) for private reporting.

## Deployment

The included workflow builds and deploys the site to GitHub Pages. In repository settings, select **GitHub Actions** as the Pages source.

A second monthly workflow downloads the authoritative sources, rebuilds and validates the aggregate, and opens a pull request when the data changes. Raw files are never committed. The browser-ready JSON remains in Git history.

When a reviewed data payload reaches `main`, a separate workflow exports flat city, county, and timeline Parquet tables with Zstandard compression. It publishes them as immutable GitHub Release snapshots with metadata, SHA-256 checksums, and GitHub build-provenance attestations. Parquet is intended for DuckDB, Polars, pandas, and other analytical clients; the browser continues to use the smaller static JSON without contacting an upstream API.

The public Parquet wire types are pinned to the PyArrow version in `requirements-data-release.txt`. A deliberate schema change must update both `scripts/parquet_schema.py` and the independent fingerprints in `scripts/validate-parquet.py`; CI rejects one-sided drift. Run `python scripts/parquet_schema.py` to print the canonical replacement fingerprint block for review.

## License

MIT
