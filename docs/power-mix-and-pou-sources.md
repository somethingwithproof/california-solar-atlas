# Power mix and publicly owned utility sources

Last reviewed: August 16, 2026.

This file catalogues sources for two things the current build does not cover: distributed
solar outside PG&E, SCE, and SDG&E, and retail power mix. Every URL below was fetched and
returned a document on the review date. Capacity figures quoted here were extracted from
the named file, not from a summary of it.

## The gap this addresses

The DG Stats FAQ states the limit directly: "Publicly owned utility (POU) interconnection
solar PV NEM data is not collected by the CPUC," and POUs instead "annually report their
cumulative incentivized capacity to the California Energy Commission per Senate Bill 1."
DG Stats covers three investor-owned utilities and nothing else.

- [California DG Stats FAQ](https://www.californiadgstats.ca.gov/faq/)

## Distributed solar by publicly owned utility

### Form EIA-861, Net Metering file (primary recommendation)

The annual EIA-861 release carries a `Net_Metering_<year>.xlsx` file with cumulative
net-metered capacity by utility, technology, and customer sector, from 2001 to present.
It is a census of United States electric utilities, so California POUs appear alongside
the IOUs in one table on one schedule.

The 2024 file contains 34 California rows across 32 utilities. At least 24 are municipal
or district utilities. Extracted photovoltaic capacity:

| Utility | Basis | Net-metered PV (MW) |
|---|---|---|
| Los Angeles Department of Water & Power | AC | 678.3 |
| Sacramento Municipal Util Dist | AC | 388.0 |
| Imperial Irrigation District | AC | 140.7 |
| Modesto Irrigation District | AC | 87.3 |
| City of Riverside | DC | 70.6 |
| Turlock Irrigation District | AC | 64.9 |
| City of Roseville | AC | 55.3 |
| City of Anaheim | DC | 52.0 |
| City of Glendale | AC | 30.8 |
| City of Pasadena | AC | 26.8 |
| City of Santa Clara | AC | 24.3 |
| City of Redding | DC | 23.6 |
| City of Palo Alto | AC | 20.9 |
| City of Burbank Water and Power | AC | 15.6 |
| Alameda Municipal Power | AC | 6.8 |

Those fifteen sum to about 1,686 MW. Other named California POUs in the same file include
Azusa, Colton, Corona, Lodi, Merced Irrigation District, Moreno Valley, Shasta Lake,
Vernon, and the City and County of San Francisco.

Two properties matter for this application. First, a `Type` column records AC or DC per
utility, so the rating basis is disclosed rather than assumed; the table above mixes both
and must not be summed into a DC inventory without conversion. Second, the same file
reports the IOUs (PG&E 8,533.3 MW-AC, SCE 5,680.5, SDG&E 2,244.2), which gives a
same-methodology denominator for judging how much the current build omits.

The file reports utility totals, not project sites, and carries no city field. City
attribution therefore has to come from service-territory geometry, which is what the
implemented method below does. It can supply a city capacity total; it cannot supply
project counts, sector splits, or install years.

- [Form EIA-861 detailed data](https://www.eia.gov/electricity/data/eia861/)
- 2024 archive: `https://www.eia.gov/electricity/data/eia861/zip/f8612024.zip`
- [Form EIA-861M, monthly](https://www.eia.gov/electricity/data/eia861m/)

### Berkeley Lab, Tracking the Sun

Project-level records for roughly 4.5 million distributed systems installed through the
end of 2024, compiled from utilities, state agencies, permitting agencies, and assessors.
It carries system characteristics, installed price, and customer segmentation. Ground-mount
above 5 MW-AC is excluded and covered by a separate utility-scale release. Some contributing
data arrives under non-disclosure agreements, so utility coverage is uneven and must be
checked per utility rather than assumed statewide.

- [Tracking the Sun](https://emp.lbl.gov/tracking-the-sun) (blocks automated fetches; open in a browser)
- [Data file on OEDI](https://data.openei.org/submissions/3)

### CMUA public power SB 1 status reports

Annual status reports covering roughly 40 POUs, with photovoltaic watts installed, system
counts, applicant counts, and incentives awarded. The published series runs 2011 to 2016
and appears to have ended. Treat as historical baseline only.

- [CMUA SB 1 reports](https://www.cmua.org/sb1-reports)

## Retail power mix

### CEC Power Source Disclosure and the Power Content Label

The authoritative per-supplier power mix. Every retail supplier, including POUs and
community choice aggregators, reports purchases and retail sales annually, and the CEC
publishes a label giving portfolio composition by resource and greenhouse gas intensity.
Annual labels are posted for 2016 through 2024. SB 1158 adds hourly reporting for suppliers
above 60,000 customers and 1,000 GWh, with calendar year 2027 data due June 1, 2028.

This is the correct source for a per-utility power mix panel, and unlike DG Stats it
already covers municipal utilities.

- [Power Source Disclosure Program](https://www.energy.ca.gov/programs-and-topics/programs/power-source-disclosure-program)
- [Annual Power Content Labels](https://www.energy.ca.gov/programs-and-topics/programs/power-source-disclosure-program/power-content-label)

### CEC Total System Electric Generation

Statewide mix by fuel type, separating in-state generation from imports. The CEC reports
278,338 GWh for 2024, down about 1 percent from 2023, with clean resources at 62 percent
against 58 percent in 2023. A 2009 to 2024 spreadsheet is published.

- [2024 Total System Electric Generation](https://www.energy.ca.gov/data-reports/energy-almanac/california-electricity-data/2024-total-system-electric-generation)
- [California electrical energy generation, 2001 to current](https://www.energy.ca.gov/data-reports/energy-almanac/california-electricity-data/california-electrical-energy-generation)

### CEC QFER, form CEC-1304

Plant-level and unit-level generation for plants of 1 MW and above, with gross and net
generation and fuel use. This is the same reporting family as the CEC-1304B county solar
benchmark the build already uses, so definitions are consistent with the existing
`allUtilityBenchmark` field.

- [QFER data tables](https://www.energy.ca.gov/data-reports/energy-almanac/california-electricity-data/quarterly-fuel-and-energy-report-qfer-data)
- [QFER CEC-1304 database on CA Open Data](https://data.ca.gov/dataset/qfer-cec-1304-power-plant-owner-reporting-database)

### CEC Renewables Portfolio Standard, POU verification

The CEC, not the CPUC, verifies RPS compliance for publicly owned utilities. POUs report
procurement claims annually by July 1, and the CEC publishes verification results per
utility per compliance period. Useful for renewable share by POU, distinct from the
Power Content Label's portfolio view.

- [RPS program](https://www.energy.ca.gov/programs-and-topics/programs/renewables-portfolio-standard)
- [RPS verification for publicly owned utilities](https://www.energy.ca.gov/programs-and-topics/programs/renewables-portfolio-standard/renewables-portfolio-standard/renewables)
- [Estimated annual RPS-certified renewable energy](https://www.energy.ca.gov/programs-and-topics/topics/renewable-energy/clean-energy-serving-california/estimated-annual-rps)

### CAISO

Real-time and daily supply mix for the CAISO balancing area. LADWP, IID, SMUD, and
Turlock ID sit outside CAISO, so this is not a statewide mix and cannot be used to
characterize those utilities.

- [CAISO supply](https://www.caiso.com/todays-outlook/supply)

## Cross-checks against the existing audit

EIA-861 2024 disagrees with two figures in `utility-data-audit.md`, which should be
reconciled before either is published.

| Utility | Existing audit | EIA-861 2024 | Note |
|---|---|---|---|
| Imperial Irrigation District | 63.62 MW NEM plus 12.48 MW net billing, about 76.1 MW | 140.7 MW-AC | Roughly a factor of two apart. Vintage and program scope both differ; neither figure is safe to publish until the definitions are matched. |
| SMUD | "nearly 430 MW" rooftop | 388.0 MW-AC net-metered | Consistent if the SMUD figure includes systems that are not net-metered. |
| Redding Electric Utility | 18.076 MW behind-the-meter at CY2022 | 23.6 MW-DC | Consistent with two years of growth. |

The audit's conclusion that "no common current public project-site feed was verified" for
LADWP and other public utilities holds for project-level data. It should be narrowed: a
common current public feed of utility-level net-metered capacity does exist, in EIA-861.

## Implemented: municipal utility attribution

The build now merges publicly owned utility capacity into city records. The rule and its
limits:

A utility merges into a city when at least 95% of its service-territory area lies inside
that city, measured in EPSG:3310 against the same city polygons `build-boundaries.mjs`
uses. The test is deliberately one-directional. Covering a city is not sufficient:
Imperial Irrigation District covers 100% of El Centro, but El Centro is 0.2% of IID, so
attributing IID's total to El Centro would overstate it by roughly 500 times. Containment
is what licenses the merge, because a territory inside a city puts all of its capacity
inside that city.

Two utilities are merged by reviewed override rather than by rule, each with a cited
reason in `data/pou-attribution.json`:

- **LADWP.** The geometric test returns 20.7% because the territory polygon includes the
  Owens Valley aqueduct corridor, which has effectively no retail customers. LADWP is the
  City of Los Angeles municipal utility and covers 97.0% of the city.
- **Colton.** The territory is 88.1% inside the city, below the rule. Up to roughly 12% of
  its capacity may fall outside the boundary.

Nine utilities remain unattributed and disclosed, holding 729.5 MW: SMUD, Imperial ID,
Modesto ID, Turlock ID, Merced ID, PacifiCorp, Bear Valley Electric, Liberty Utilities,
and Surprise Valley Electrification. Each is a multi-city district or a multi-county
utility where no single-city attribution is defensible.

### What the merged number is and is not

`capacityMw` is unchanged and remains the DG Stats IOU inventory, so every county and
statewide reconciliation still compares like with like. Municipal capacity lands in
`pouCapacity`, with `totalCapacityRangeMwDc` carrying the combined figure.

The combined figure is a range for two reasons. Most POUs report AC, so conversion to DC
uses an inverter-loading-ratio band of 1.08 to 1.25, spanning fleet vintage. A
DC-reporting utility is not converted and its band collapses to one value. Separately,
EIA-861 reports a cumulative total with no install years, so municipal capacity receives
the same treatment as undated IOU projects: fully degraded from 2001 at the low end,
undegraded at the high end.

Project counts, sector splits, storage-linked sites, and the approval-date timeline stay
IOU-only for every city, because EIA-861 publishes no project records. Only the capacity
and generation totals include municipal utilities.

Regenerate the inputs when a new annual release lands:

```bash
pip install -r requirements-pou-inputs.txt
python scripts/build-pou-inputs.py   # rewrites data/pou-inputs.json
npm run data:build
```
