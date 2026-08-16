# Utility data coverage audit

Last reviewed: August 16, 2026.

## What the application can combine safely

California DG Stats supplies project-level `System Size DC`, `Service City`, and `Service County` records for PG&E, SCE, and SDG&E. The app uses those records for its current city and county inventory. The county aggregation happens before city matching, so unincorporated and unmatched city-name records remain in the county total.

California Energy Commission Form 1304(b) requires California utility distribution companies, including publicly owned utilities, to report generating systems with address, county, technology, AC nameplate, interconnection date, and disconnection information. The raw utility submissions are not offered as a statewide public project download comparable to DG Stats. The CEC does publish county tables derived from them. The app therefore presents the CEC's 2024 county capacity table as a distinct all-utility benchmark rather than mixing it into the 2026 DC project inventory.

- [CEC electricity data and county maps](https://www.energy.ca.gov/data-reports/energy-almanac/california-electricity-data)
- [CEC-1304B reporting instructions](https://www.energy.ca.gov/sites/default/files/2025-07/1304B_Instructions_01242025_ada.pdf)
- [CEC reporting forms](https://www.energy.ca.gov/node/1045)

## Utility findings

| Utility or provider | Finding | Safe application use |
|---|---|---|
| PG&E | Current project-site records are in DG Stats. Rocklin and Pleasanton are PG&E distribution cities. | Current city and county numerator. |
| SCE | Current project-site records are in DG Stats. | Current city and county numerator. |
| SDG&E | Current project-site records are in DG Stats. | Current city and county numerator. |
| Ava Community Energy (formerly East Bay Community Energy) | Ava is a community choice aggregator; PG&E remains the distribution and interconnection utility. | Potential jurisdiction load denominator, never an additional solar numerator. |
| Alameda Municipal Power | Current project-level inventory comparable to DG Stats was not found publicly. | Mark Alameda partial; use the CEC county benchmark only as context. |
| Redding Electric Utility | Its 2024 IRP reports 18.076 MW of behind-the-meter solar at calendar-year 2022. | Supplementary dated city evidence, not merged into the current DC project series without a compatible rating basis. |
| Roseville Electric | Solar and interconnection program pages are public, but a current project inventory or citywide installed total was not found. | Mark Roseville partial. |
| SMUD | SMUD reports more than 65,000 rooftop systems and nearly 430 MW across its service territory. Territory geography is not Sacramento city or county. | Coverage context only; do not assign the territory aggregate to Sacramento city. |
| Imperial Irrigation District | IID reports 4,212 NEM systems/63.62 MW and 880 net-billing systems/12.48 MW. Its territory crosses city and county boundaries. | Coverage context only; do not assign the territory aggregate to a single city. |
| LADWP and other public utilities | No common current public project-site feed was verified. A common utility-level feed does exist: Form EIA-861 reports cumulative net-metered capacity for at least 24 California POUs annually. See `power-mix-and-pou-sources.md`. | Mark affected cities partial. EIA-861 can support a coverage benchmark; it has no city field and cannot feed the city inventory. |

Primary utility references:

- [SMUD rooftop solar statistics](https://www.smud.org/Corporate/Environmental-Leadership/2030-Clean-Energy-Vision/Emission-and-zero-carbon-program-information)
- [Redding 2024 integrated resource plan](https://files.cityofredding.gov/Document%20Center/Departments/Redding%20Electric%20Utility/About%20REU/Integrated%20Resource%20Plan/City%20of%20Redding%20IRP%20Report%202024.pdf)
- [IID net-metering totals](https://www.iid.com/power/rooftop-solar/interconnection/net-metering)
- [Roseville Solar 2.0](https://www.roseville.ca.us/government/departments/electric_utility/about_us/rates-1/roseville_solar_2_0)

## Decision rule

Do not add a public-utility territory total to a city or county DG Stats result. It can differ in geography, vintage, size threshold, rating basis, and retirement handling. A value enters the main numerator only when those dimensions are compatible and the source geography can be matched. Until then it is labeled as a benchmark or coverage note.
