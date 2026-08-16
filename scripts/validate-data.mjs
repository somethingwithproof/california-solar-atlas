#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const data = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/cities.json'), 'utf8'));
const boundaries = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/boundaries.json'), 'utf8'));
assert.equal(data.meta.schemaVersion, 7, 'Unexpected data schema');
assert.equal(data.meta.capacityBasis, 'System Size DC (kW), positive values only', 'Capacity basis drifted');
assert.equal(data.meta.storageCapacityStatus, 'withheld-source-units-inconsistent', 'Storage uncertainty must stay explicit');
assert.ok(Number.isInteger(data.meta.storageInvalidValues) && data.meta.storageInvalidValues >= 0, 'Invalid storage-value count missing');
assert.equal(data.cities.length, 483, 'Expected every incorporated California city');
assert.equal(new Set(data.cities.map((city) => city.name)).size, 483, 'City names must be unique');
assert.equal(new Set(data.cities.map((city) => city.id)).size, 483, 'City identifiers must be unique');
const censusGeoids = data.cities.flatMap((city) => city.geoid ? [city.geoid] : []);
assert.equal(new Set(censusGeoids).size, censusGeoids.length, 'City GEOIDs must be unique when present');
for (const city of data.cities) {
  assert.match(city.id, /^(?:06\d{5}|cdtfa-\d+)$/, `${city.name}: invalid stable city identifier`);
  if (city.geoid) assert.match(city.geoid, /^06\d{5}$/, `${city.name}: invalid California place GEOID`);
}
assert.ok(data.meta.coordinateCoverage >= 480, 'Coordinate coverage regressed');
assert.ok(data.meta.populationCoverage >= 470, 'Population coverage regressed');
assert.ok(data.meta.housingCoverage >= 470, 'Housing-unit coverage regressed');
assert.ok(data.meta.geographyRiskCities > 0, 'Geography diagnostic failed to flag any cities');
assert.ok(Number.isInteger(data.meta.geographyUnknownCities) && data.meta.geographyUnknownCities >= 0, 'Unknown geography-screen count missing');
assert.ok(data.meta.unmatchedProjects > 0 && data.meta.unmatchedCapacityMw > 0 && data.meta.unmatchedServiceCities > 0, 'Unmatched service-city accounting missing');
assert.equal(data.counties.length, 58, 'Expected all California counties');
assert.ok(Math.abs(data.counties.reduce((sum, county) => sum + county.allUtilityBenchmark.capacityMwAc, 0) - 17411.637) <= .001, 'CEC all-utility county benchmark does not reconcile to statewide total');
assert.equal(data.meta.allUtilityBenchmark.statewideCapacityMwAc, 17411.637, 'CEC statewide benchmark drifted');
assert.equal(data.meta.allUtilityBenchmark.year, 2024, 'CEC statewide benchmark year drifted');
assert.ok(Object.keys(boundaries).length >= 480, 'Municipal boundary coverage regressed');
for (const [geoid, path] of Object.entries(boundaries)) {
  assert.match(geoid, /^06\d{5}$/, `${geoid}: invalid California place GEOID`);
  assert.match(path, /^[MLZ0-9 .-]+$/, `${geoid}: unsafe SVG path`);
}

for (const source of data.meta.sources) assert.match(source.url, /^https:\/\//, `${source.name}: source URL must use HTTPS`);
const summedStateCapacity = data.cities.reduce((sum, city) => sum + city.capacityMw, 0);
assert.ok(Math.abs(summedStateCapacity - data.meta.totalCapacityMw) <= .001, 'State capacity does not reconcile to city records');
const summedCountyCapacity = data.counties.reduce((sum, county) => sum + county.capacityMw, 0);
assert.ok(Math.abs(summedCountyCapacity - data.meta.sourceCapacityMw) <= .001, 'Source capacity does not reconcile to counties');
assert.ok(Math.abs(data.meta.sourceCapacityMw - data.meta.totalCapacityMw - data.meta.unmatchedCapacityMw) <= .02, 'Matched and unmatched capacity do not reconcile to source');
assert.equal(data.counties.reduce((sum, county) => sum + county.projects, 0), data.meta.sourceProjects, 'Source project count does not reconcile to counties');
assert.equal(data.cities.reduce((sum, city) => sum + city.projects, 0) + data.meta.unmatchedProjects, data.meta.sourceProjects, 'Matched and unmatched projects do not reconcile to source');

for (const city of data.cities) {
  assert.ok(Number.isFinite(city.capacityMw) && city.capacityMw >= 0, `${city.name}: invalid capacity`);
  assert.ok(Number.isFinite(city.effectiveCapacityMw) && city.effectiveCapacityMw <= city.capacityMw + .001, `${city.name}: invalid degraded capacity`);
  assert.ok(city.effectiveCapacityRangeMw.low <= city.effectiveCapacityMw && city.effectiveCapacityMw <= city.effectiveCapacityRangeMw.high, `${city.name}: invalid effective-capacity range`);
  assert.ok(['reported', 'partial', 'unverified'].includes(city.coverage.status), `${city.name}: invalid coverage status`);
  assert.equal(city.timeline.length, 26, `${city.name}: incomplete timeline`);
  assert.ok(city.timeline.every((point, index, timeline) => Number.isFinite(point.mw) && point.mw >= 0 && (!index || point.mw >= timeline[index - 1].mw)), `${city.name}: timeline is not finite and cumulative`);
  assert.ok(Math.abs(city.timeline.at(-1).mw + city.undatedCapacityMw - city.capacityMw) <= .001, `${city.name}: dated plus undated capacity does not reconcile`);
  const timelineAdditions = city.timeline.reduce((sum, point) => sum + point.addedMw, 0);
  assert.ok(Math.abs(timelineAdditions + city.undatedCapacityMw - city.capacityMw) <= .0051, `${city.name}: dated additions plus undated capacity do not reconcile`);
  assert.ok(city.generationGwh.low <= city.generationGwh.high, `${city.name}: invalid generation range`);
  if (city.climateZone) assert.ok(city.climateZone >= 1 && city.climateZone <= 16, `${city.name}: invalid climate zone`);
  assert.equal(city.wattsPerPerson, undefined, `${city.name}: geography-mismatched per-capita metric must not be published`);
  assert.ok(['likely-mailing-inflation', 'not-flagged', 'unknown'].includes(city.geographyRisk), `${city.name}: invalid geography diagnostic`);
  if (city.housingUnits) {
    assert.ok(Number.isInteger(city.housingUnits) && city.housingUnits > 0, `${city.name}: invalid housing-unit estimate`);
    const expectedHousingRatio = city.sectors.residential.projects / city.housingUnits * 100;
    assert.ok(Math.abs(expectedHousingRatio - city.residentialSiteHousingPct) <= .051, `${city.name}: housing diagnostic arithmetic drift`);
    assert.equal(city.geographyRisk === 'likely-mailing-inflation', city.residentialSiteHousingPct > 35, `${city.name}: geography flag threshold drift`);
  } else assert.equal(city.geographyRisk, 'unknown', `${city.name}: missing housing estimate must fail closed`);
  assert.equal(city.storageMwh, undefined, `${city.name}: unvalidated storage capacity must not be published`);
  assert.equal(city.storageCapacityStatus, 'withheld-source-units-inconsistent', `${city.name}: storage warning missing`);
  assert.ok(Number.isInteger(city.projects) && city.projects >= 0, `${city.name}: invalid project count`);
  assert.ok(Number.isInteger(city.storageProjects) && city.storageProjects >= 0 && city.storageProjects <= city.projects, `${city.name}: invalid storage-linked project count`);
  assert.ok(Number.isInteger(city.storageInvalidValues) && city.storageInvalidValues >= 0 && city.storageInvalidValues <= city.projects, `${city.name}: invalid storage-value flag count`);
  assert.deepEqual(Object.keys(city.sectors).sort((a, b) => a.localeCompare(b)), ['agricultural', 'commercial', 'other', 'public', 'residential'], `${city.name}: unexpected sector schema`);
  for (const [name, sector] of Object.entries(city.sectors)) {
    assert.ok(Number.isFinite(sector.mw) && sector.mw >= 0, `${city.name}: invalid ${name} capacity`);
    assert.ok(Number.isInteger(sector.projects) && sector.projects >= 0, `${city.name}: invalid ${name} project count`);
  }
  const sectorCapacity = Object.values(city.sectors).reduce((sum, sector) => sum + sector.mw, 0);
  const sectorProjects = Object.values(city.sectors).reduce((sum, sector) => sum + sector.projects, 0);
  assert.ok(Math.abs(sectorCapacity - city.capacityMw) <= .002, `${city.name}: sector capacity does not reconcile`);
  assert.equal(sectorProjects, city.projects, `${city.name}: sector sites do not reconcile`);
  const expectedAverage = city.projects ? city.capacityMw * 1000 / city.projects : 0;
  assert.ok(Math.abs(expectedAverage - city.averageSystemKw) <= (city.projects ? .5 / city.projects : 0) + .051, `${city.name}: average system arithmetic drift`);
  const expectedDatedEffective = city.timeline.reduce((sum, point) => sum + point.addedMw * (0.995 ** Math.max(0, city.timeline.at(-1).year - point.year)), 0);
  const expectedLowEffective = expectedDatedEffective + city.undatedCapacityMw * (0.995 ** (city.timeline.at(-1).year - 2001));
  const expectedHighEffective = expectedDatedEffective + city.undatedCapacityMw;
  assert.ok(Math.abs(expectedLowEffective - city.effectiveCapacityRangeMw.low) <= .005, `${city.name}: low degradation arithmetic drift`);
  assert.ok(Math.abs(expectedHighEffective - city.effectiveCapacityRangeMw.high) <= .005, `${city.name}: high degradation arithmetic drift`);
  const expectedLow = city.effectiveCapacityRangeMw.low * city.yieldRange[0] / 1000;
  assert.ok(Math.abs(expectedLow - city.generationGwh.low) <= .11, `${city.name}: generation arithmetic drift`);
  const expectedHigh = city.effectiveCapacityRangeMw.high * city.yieldRange[1] / 1000;
  assert.ok(Math.abs(expectedHigh - city.generationGwh.high) <= .11, `${city.name}: generation high arithmetic drift`);
  const fiveYearsAgoPoint = city.timeline.find((point) => point.year === city.timeline.at(-1).year - 5);
  assert.ok(fiveYearsAgoPoint, `${city.name}: five-year comparison point missing`);
  const fiveYearsAgo = fiveYearsAgoPoint.mw;
  const expectedGrowth = fiveYearsAgo > 0 ? (city.timeline.at(-1).mw / fiveYearsAgo - 1) * 100 : null;
  if (expectedGrowth == null) assert.equal(city.growth5yPct, null, `${city.name}: growth should be unavailable`);
  else assert.ok(Math.abs(expectedGrowth - city.growth5yPct) <= .051, `${city.name}: growth arithmetic drift`);
  if (city.load) {
    assert.match(city.load.sourceUrl, /^https:\/\//, `${city.name}: load source must use HTTPS`);
    assert.ok(city.load.lowDeliveriesGwh <= city.load.deliveriesGwh && city.load.deliveriesGwh <= city.load.highDeliveriesGwh, `${city.name}: load range does not contain midpoint`);
    const share = ((city.generationGwh.low + city.generationGwh.high) / 2) / (city.load.deliveriesGwh + (city.generationGwh.low + city.generationGwh.high) / 2) * 100;
    assert.ok(share > 0 && share < 100, `${city.name}: invalid gross-load solar share`);
  }
}

const pleasanton = data.cities.find((city) => city.name === 'Pleasanton');
assert.ok(pleasanton && pleasanton.capacityMw > 0 && pleasanton.projects > 0, 'Pleasanton smoke check failed');
assert.equal(pleasanton.climateZone, 12, 'Pleasanton climate-zone regression');
assert.equal(pleasanton.load.kind, 'modeled', 'Pleasanton load must remain visibly modeled');
const sanJose = data.cities.find((city) => city.name === 'San Jose');
assert.ok(sanJose && sanJose.capacityMw > 0 && sanJose.projects > 0, 'San Jose smoke check failed');
const grassValley = data.cities.find((city) => city.name === 'Grass Valley');
assert.equal(grassValley.geographyRisk, 'likely-mailing-inflation', 'Grass Valley mailing-geography warning missing');
const laCanada = data.cities.find((city) => city.name === 'La Cañada Flintridge');
assert.ok(laCanada.capacityMw > 0 && laCanada.projects > 0, 'Unicode city matching regressed');
assert.ok(data.cities.some((city) => city.name === 'Angels Camp'), 'Angels Camp display name regressed');
assert.ok(data.cities.some((city) => city.name === 'California City'), 'California City display name regressed');

const losAngeles = data.cities.find((city) => city.name === 'Los Angeles');
assert.equal(losAngeles.coverage.status, 'partial', 'LADWP coverage warning missing');

for (const county of data.counties) {
  assert.ok(Number.isFinite(county.capacityMw) && county.capacityMw >= 0, `${county.name}: invalid county capacity`);
  assert.ok(county.timeline.length === 26 && Math.abs(county.timeline.at(-1).mw + county.undatedCapacityMw - county.capacityMw) <= .001, `${county.name}: county timeline does not reconcile`);
  assert.ok(county.matchedCityCapacityMw <= county.capacityMw + .001, `${county.name}: city subtotal exceeds county total`);
  assert.ok(Math.abs(county.capacityMw - county.matchedCityCapacityMw - county.outsideMatchedCitiesMw) <= .001, `${county.name}: county outside-city capacity does not reconcile`);
  assert.ok(county.generationGwh.low <= county.generationGwh.high, `${county.name}: invalid county generation range`);
  const countyDatedEffective = county.timeline.reduce((sum, point, index, timeline) => {
    const priorMw = index ? timeline[index - 1].mw : 0;
    return sum + (point.mw - priorMw) * (0.995 ** Math.max(0, timeline.at(-1).year - point.year));
  }, 0);
  const countyLowGeneration = (countyDatedEffective + county.undatedCapacityMw * (0.995 ** (county.timeline.at(-1).year - 2001))) * 1.25;
  const countyHighGeneration = (countyDatedEffective + county.undatedCapacityMw) * 1.75;
  assert.ok(Math.abs(countyLowGeneration - county.generationGwh.low) <= .2, `${county.name}: low county generation arithmetic drift`);
  assert.ok(Math.abs(countyHighGeneration - county.generationGwh.high) <= .2, `${county.name}: high county generation arithmetic drift`);
  const countySectorCapacity = Object.values(county.sectors).reduce((sum, sector) => sum + sector.mw, 0);
  const countySectorProjects = Object.values(county.sectors).reduce((sum, sector) => sum + sector.projects, 0);
  assert.ok(Math.abs(countySectorCapacity - county.capacityMw) <= .002, `${county.name}: sector capacity does not reconcile`);
  assert.equal(countySectorProjects, county.projects, `${county.name}: sector projects do not reconcile`);
  assert.equal(county.allUtilityBenchmark.year, 2024, `${county.name}: unexpected CEC benchmark year`);
  assert.ok(Number.isFinite(county.allUtilityBenchmark.capacityMwAc) && county.allUtilityBenchmark.capacityMwAc >= 0, `${county.name}: invalid CEC benchmark capacity`);
  assert.match(county.allUtilityBenchmark.basis, /kW-AC/, `${county.name}: CEC benchmark basis missing`);
  assert.match(county.allUtilityBenchmark.sourceUrl, /^https:\/\//, `${county.name}: invalid CEC benchmark source`);
}

console.log(`Validated ${data.cities.length} cities, ${data.meta.totalCapacityMw.toFixed(1)} MW-DC reported.`);
