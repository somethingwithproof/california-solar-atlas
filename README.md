# California Solar Atlas

A static, searchable explorer for distributed solar in every incorporated California city. It uses real interconnected project-site capacity and never invents a city electricity denominator where one has not been verified.

The interface is designed for GitHub Pages: no server, database, API keys, or runtime data pipeline is required. The compact city aggregate is committed; the 1.2 GB raw source remains outside the repository.

## Features

- Search all 483 incorporated California cities
- Climate-zone and vintage-adjusted annual generation ranges
- Reported capacity, watts per resident, five-year growth, project counts, customer sectors, and storage
- Interactive statewide choropleth using official incorporated-city polygons
- Rankings with population and utility-coverage controls
- Four-city comparison
- Shareable city URLs plus CSV and SVG downloads
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

## Methodology

- Capacity is the sum of positive `System Size DC` values for records whose technology includes photovoltaic, grouped by the utility-reported `Service City`.
- Annual generation uses fleet-average bands of 1,250–1,750 kWh/kW-DC-year assigned through official CEC climate-zone polygons.
- Each installation vintage receives 0.5% annual degradation before the generation range is calculated.
- Solar share is shown only for cities with an explicitly onboarded load record and equals degradation-adjusted gross generation divided by grid deliveries plus degradation-adjusted gross generation.
- Service-city strings are not a parcel-level spatial join. The interface discloses this and other limitations prominently.
- The source ZIP contains PG&E, SCE, and SDG&E files. Municipal utility systems such as LADWP and SMUD are outside its coverage, so affected city totals are lower bounds.
- Coverage follows the **distribution wires**, not the retail bill. The utility that owns the wires files the interconnection record, so that is what determines whether a project appears here. A community choice aggregator (Ava, MCE, and similar) sells the electricity but owns no wires, so cities it serves sit on the incumbent investor-owned distribution system and are represented in full. Only a publicly owned utility that owns its own distribution system creates a gap. `data/utility-coverage.json` records the excluded wires utility per city.
- `independentBounds` in `data/utility-coverage.json` is the slot for a second, independently sourced capacity figure for those cities — EIA Form 861 Schedule 4 (net metering, resolved to a utility service territory) and CEC SB 379 / SolarAPP+ permit reporting (resolved to a city) are the candidate sources. It ships empty on purpose: an entry requires `capacityMw`, `year`, `sourceName`, `sourceUrl`, and an explicit `scope`, and the build fails rather than publish a bare number. A `service-territory` figure is labeled as such in the interface so it is never read as a city total.
- Historical charts group currently listed projects by approval date. They are labeled as a proxy because superseding applications can change the apparent vintage.

Run `npm test` to validate schema, city coverage, capacity, generation arithmetic, climate zones, population matches, and known utility warnings.

## Deployment

The included workflow builds and deploys the site to GitHub Pages. In repository settings, select **GitHub Actions** as the Pages source.

A second monthly workflow downloads the authoritative sources, rebuilds and validates the aggregate, and opens a pull request when the data changes. Raw files are never committed. Merged aggregates remain recoverable through Git history, creating a forward-looking snapshot archive.

## License

MIT
