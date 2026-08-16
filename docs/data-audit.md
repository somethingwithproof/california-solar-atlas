# Data correctness audit

Last reviewed: August 16, 2026. Source release: May 31, 2026.

## Capacity basis

The ingest pipeline requires the California DG Stats header `System Size DC` and reads that column for photovoltaic rows only. Values must be finite and positive. PTC, CEC-AC, inverter AC, and storage power fields are not substituted or included. City, sector, timeline, and statewide totals are reconciled in `npm test`.

## San Jose storage spot check

The 4,315 otherwise-eligible San Jose rows with positive reported storage sum to 327,839.926 kWh, but their median is 13.5 kWh. Only 33 rows exceed 100 kWh and 25 exceed 1,000 kWh. The largest values are residential records reporting 90,000, 9,800, 9,700, 8,936, and 6,953 kWh alongside roughly 4–13 kW photovoltaic systems. Commercial records contribute only 412.2 kWh, so commercial batteries do not explain the aggregate.

Those values are consistent with localized decimal or unit corruption in the source field. The application therefore publishes storage-linked site counts but withholds aggregate storage energy statewide.

## Mailing-geography diagnostic

DG Stats project files expose a service-city string but no project coordinates or street address. The application cannot spatially join projects to incorporated-city boundaries. It compares residential project-site count with 2026 California Department of Finance E-1H legal-boundary housing units as a screening test.

Cities above 35 residential project sites per 100 housing units receive a `likely-mailing-inflation` flag and are excluded from rankings by default. This flags 67 of 483 cities in the current build, including Auburn (81.5%), Placerville (72.3%), and Grass Valley (48.7%). Pleasanton (22.1%) and San Jose (13.7%) are not flagged. The threshold is a diagnostic, not a corrected project total or an adoption-rate estimate.

## Remaining limitations

- Location-specific generation uses a city representative coordinate and a CEC climate-zone band, not project-level coordinates.
- Currently listed projects are grouped by approval year; this is not a historical snapshot and approval generally precedes permission to operate.
- Municipal utilities are absent from the three investor-owned-utility files, and affected cities are marked partial.
- Generation is modeled from DC nameplate and vintage degradation, not read from production meters.

