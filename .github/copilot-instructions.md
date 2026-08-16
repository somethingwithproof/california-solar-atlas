# California Solar Atlas review instructions

Review this repository as a static, public-data visualization whose primary risk is publishing a plausible but incorrect number.

- Treat `scripts/build-data.mjs`, `scripts/build-boundaries.mjs`, and `scripts/validate-data.mjs` as a fail-closed data pipeline. Flag missing schema checks, silent coercion, non-finite values, geographic mismatches, or arithmetic that does not reconcile.
- Capacity must use only positive California DG Stats `System Size DC` values for photovoltaic records. Never substitute PTC, CEC-AC, inverter AC, or storage power.
- Generation is modeled, not metered: vintage-degraded DC capacity multiplied by the city climate-zone yield band. Preserve the explicit uncertainty range and 0.5% annual degradation assumption.
- Do not publish per-resident rankings while the numerator is grouped by utility `Service City` and the population denominator follows legal municipal boundaries.
- Do not publish aggregate storage MWh until the source `Storage Capacity (kWh)` field passes unit and plausibility checks against storage kW.
- A city solar share requires a documented city-level grid-delivery source and must equal gross modeled generation divided by grid deliveries plus gross modeled generation. Never substitute county load.
- Preserve the mailing-geography, utility-coverage, approval-date/PTO, and modeled-generation disclosures.
- Treat all JSON content as untrusted at the rendering boundary. Escape text, restrict URLs to HTTPS, validate SVG path syntax, and avoid introducing executable HTML.
- Require `npm test`, `npm run build`, and a clean `npm audit` for dependency or application changes.
- In GitHub Actions, minimize permissions, keep checkout credentials disabled until a push is required, and pin third-party actions to full commit SHAs with a version comment for Dependabot.
