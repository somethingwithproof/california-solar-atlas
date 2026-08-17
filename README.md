# California Solar Atlas

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

## Run locally

```bash
npm install
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

GitHub CodeQL, secret scanning with push protection, private vulnerability reporting, dependency review, and Dependabot security updates protect the public repository. `.github/dependabot.yml` also schedules weekly npm and GitHub Actions version updates. See [SECURITY.md](SECURITY.md) for private reporting.

## Deployment

The included workflow builds and deploys the site to GitHub Pages. In repository settings, select **GitHub Actions** as the Pages source.

A second monthly workflow downloads the authoritative sources, rebuilds and validates the aggregate, and opens a pull request when the data changes. Raw files are never committed. The browser-ready JSON remains in Git history.

When a reviewed data payload reaches `main`, a separate workflow exports flat city, county, and timeline Parquet tables with Zstandard compression. It publishes them as immutable GitHub Release snapshots with metadata, SHA-256 checksums, and GitHub build-provenance attestations. Parquet is intended for DuckDB, Polars, pandas, and other analytical clients; the browser continues to use the smaller static JSON without contacting an upstream API.

The public Parquet wire types are pinned to the PyArrow version in `requirements-data-release.txt`. A deliberate schema change must update both `scripts/parquet_schema.py` and the independent fingerprints in `scripts/validate-parquet.py`; CI rejects one-sided drift. Run `python scripts/parquet_schema.py` to print the canonical replacement fingerprint block for review.

## License

MIT
