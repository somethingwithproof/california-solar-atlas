# Data correctness audit

Last reviewed: August 16, 2026. Source release: May 31, 2026.

## Capacity basis

The ingest pipeline requires the California DG Stats header `System Size DC` and reads that column for photovoltaic rows only. Values must be finite and positive. PTC, CEC-AC, inverter AC, and storage power fields are not substituted or included. City, sector, timeline, and statewide totals are reconciled in `npm test`.

## San Jose storage spot check

The 4,315 otherwise-eligible San Jose rows with positive reported storage sum to 327,839.926 kWh, but their median is 13.5 kWh. Only 33 rows exceed 100 kWh and 25 exceed 1,000 kWh. The largest values are residential records reporting 90,000, 9,800, 9,700, 8,936, and 6,953 kWh alongside roughly 4–13 kW photovoltaic systems. Commercial records contribute only 412.2 kWh, so commercial batteries do not explain the aggregate.

Those values are consistent with localized decimal or unit corruption in the source field. The application therefore publishes storage-linked site counts but withholds aggregate storage energy statewide.

## Mailing-geography diagnostic

DG Stats project files expose a service-city string but no project coordinates or street address. The application cannot spatially join projects to incorporated-city boundaries. It compares residential project-site count with 2026 California Department of Finance E-1H legal-boundary housing units as a screening test.

Cities above 35 residential project sites per 100 housing units receive a `likely-mailing-inflation` flag and are excluded from rankings by default. This flags 69 of 483 cities in the current build. Pleasanton and San Jose are not flagged. The threshold is a diagnostic, not a corrected project total or an adoption-rate estimate. A missing housing match produces `unknown`, never a clean result; the current build resolves population and housing for all 483 cities.

## County and unmatched-row reconciliation

County records aggregate the exact source `Service County` field before any city-name lookup. They therefore include source-reported unincorporated sites and the 253,664 project rows whose service-city strings do not match an incorporated city. County totals reconcile to 20,306.383 MW-DC across 2,060,231 photovoltaic project rows. Incorporated service-city matches account for 17,168.034 MW-DC; the 3,138.341 MW-DC unmatched subtotal closes the difference within published rounding.

The separate CEC-1304B benchmark reconciles all 58 county values to 17,411.637 MW-AC for 2024 solar PV systems 1 MW and smaller. It is an all-utility historical comparison, not an adjustment to the newer DG Stats inventory. The different vintage, AC/DC rating basis, size cutoff, and utility scope prevent addition or direct subtraction.

## Date and generation handling

Unparseable approval dates are kept out of the cumulative timeline and five-year growth calculation. Their capacity remains in the inventory and widens the generation range: the low case assigns the maximum modeled fleet age and the high case treats it as current. The current source build has no undated matching rows, but the invariant remains fail-closed for later releases.

Every city must resolve to a CEC climate zone. Representative coordinates use a polygon lookup; off-polygon points use a disclosed nearest-polygon method, and Mountain House uses a reviewed Zone 12 override. There is no silent default yield.

## Remaining limitations

- Location-specific generation uses a city representative coordinate and a CEC climate-zone band, not project-level coordinates.
- Currently listed projects are grouped by approval year; this is not a historical snapshot and approval generally precedes permission to operate.
- Municipal utilities are absent from the three investor-owned-utility files, and affected cities are marked partial.
- The CEC all-utility county benchmark is AC-rated, limited to systems 1 MW and smaller, and two years older than the current DC project inventory.
- Generation is modeled from DC nameplate and vintage degradation, not read from production meters.
