# California Solar Atlas

A static, searchable explorer for distributed solar in every incorporated California city. It uses real interconnected project-site capacity and never invents a city electricity denominator where one has not been verified.

The interface is designed for GitHub Pages: no server, database, API keys, or runtime data pipeline is required. The committed city aggregate is about 330 KB; the 1.2 GB raw source remains outside the repository.

## Run locally

```bash
npm install
npm run dev
```

## Rebuild the statewide data

Download the official California city identifiers CSV and the current California DG Stats “Interconnected Project Sites” ZIP, then run:

```bash
CA_CITY_CSV=/path/to/cities.csv CA_DG_ZIP=/path/to/projects.zip DATA_THROUGH='May 31, 2026' npm run data:build
```

The build script keeps the large raw files outside the repository and emits a compact `public/data/cities.json` suitable for GitHub Pages.

## Methodology

- Capacity is the sum of positive `System Size DC` values for records whose technology includes photovoltaic, grouped by the utility-reported `Service City`.
- Annual generation is presented as a range using 1,400–1,500 kWh/kW-DC-year.
- Solar share is shown only for cities with an explicitly onboarded load record and is calculated as estimated gross generation divided by grid deliveries plus estimated gross generation.
- Service-city strings are not a parcel-level spatial join. The interface discloses this and other limitations prominently.
- The source ZIP contains PG&E, SCE, and SDG&E files. Municipal utility systems such as LADWP and SMUD are outside its coverage, so affected city totals are lower bounds.

## Deployment

The included workflow builds and deploys the site to GitHub Pages. In repository settings, select **GitHub Actions** as the Pages source.

## License

MIT
