#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const data = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/cities.json'), 'utf8'));
const boundaries = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/boundaries.json'), 'utf8'));
assert.equal(data.meta.schemaVersion, 3, 'Unexpected data schema');
assert.equal(data.meta.capacityBasis, 'System Size DC (kW), positive values only', 'Capacity basis drifted');
assert.equal(data.meta.storageCapacityStatus, 'withheld-source-units-inconsistent', 'Storage uncertainty must stay explicit');
assert.equal(data.cities.length, 483, 'Expected every incorporated California city');
assert.equal(new Set(data.cities.map((city) => city.name)).size, 483, 'City names must be unique');
assert.equal(new Set(data.cities.map((city) => city.geoid)).size, 483, 'City GEOIDs must be unique');
assert.ok(data.meta.coordinateCoverage >= 480, 'Coordinate coverage regressed');
assert.ok(data.meta.populationCoverage >= 470, 'Population coverage regressed');
assert.ok(Object.keys(boundaries).length >= 480, 'Municipal boundary coverage regressed');
for (const [geoid, path] of Object.entries(boundaries)) {
  assert.match(geoid, /^06\d{5}$/, `${geoid}: invalid California place GEOID`);
  assert.match(path, /^[MLZ0-9 .-]+$/, `${geoid}: unsafe SVG path`);
}

for (const source of data.meta.sources) assert.match(source.url, /^https:\/\//, `${source.name}: source URL must use HTTPS`);
const summedStateCapacity = data.cities.reduce((sum, city) => sum + city.capacityMw, 0);
assert.ok(Math.abs(summedStateCapacity - data.meta.totalCapacityMw) <= .001, 'State capacity does not reconcile to city records');

for (const city of data.cities) {
  assert.ok(Number.isFinite(city.capacityMw) && city.capacityMw >= 0, `${city.name}: invalid capacity`);
  assert.ok(Number.isFinite(city.effectiveCapacityMw) && city.effectiveCapacityMw <= city.capacityMw + .001, `${city.name}: invalid degraded capacity`);
  assert.ok(['reported', 'partial', 'unverified'].includes(city.coverage.status), `${city.name}: invalid coverage status`);
  assert.equal(city.timeline.length, 26, `${city.name}: incomplete timeline`);
  assert.ok(city.timeline.every((point, index, timeline) => Number.isFinite(point.mw) && point.mw >= 0 && (!index || point.mw >= timeline[index - 1].mw)), `${city.name}: timeline is not finite and cumulative`);
  assert.ok(Math.abs(city.timeline.at(-1).mw - city.capacityMw) <= .001, `${city.name}: timeline does not reconcile to capacity`);
  const timelineAdditions = city.timeline.reduce((sum, point) => sum + point.addedMw, 0);
  assert.ok(Math.abs(timelineAdditions - city.capacityMw) <= .0051, `${city.name}: annual additions do not reconcile to capacity`);
  assert.ok(city.generationGwh.low <= city.generationGwh.high, `${city.name}: invalid generation range`);
  if (city.climateZone) assert.ok(city.climateZone >= 1 && city.climateZone <= 16, `${city.name}: invalid climate zone`);
  assert.equal(city.wattsPerPerson, undefined, `${city.name}: geography-mismatched per-capita metric must not be published`);
  assert.equal(city.storageMwh, undefined, `${city.name}: unvalidated storage capacity must not be published`);
  assert.equal(city.storageCapacityStatus, 'withheld-source-units-inconsistent', `${city.name}: storage warning missing`);
  assert.ok(Number.isInteger(city.projects) && city.projects >= 0, `${city.name}: invalid project count`);
  assert.ok(Number.isInteger(city.storageProjects) && city.storageProjects >= 0 && city.storageProjects <= city.projects, `${city.name}: invalid storage-linked project count`);
  const sectorCapacity = Object.values(city.sectors).reduce((sum, sector) => sum + sector.mw, 0);
  const sectorProjects = Object.values(city.sectors).reduce((sum, sector) => sum + sector.projects, 0);
  assert.ok(Math.abs(sectorCapacity - city.capacityMw) <= .002, `${city.name}: sector capacity does not reconcile`);
  assert.equal(sectorProjects, city.projects, `${city.name}: sector sites do not reconcile`);
  const expectedAverage = city.projects ? city.capacityMw * 1000 / city.projects : 0;
  assert.ok(Math.abs(expectedAverage - city.averageSystemKw) <= (city.projects ? .5 / city.projects : 0) + .051, `${city.name}: average system arithmetic drift`);
  const expectedEffective = city.timeline.reduce((sum, point) => sum + point.addedMw * (0.995 ** Math.max(0, city.timeline.at(-1).year - point.year)), 0);
  assert.ok(Math.abs(expectedEffective - city.effectiveCapacityMw) <= .005, `${city.name}: degradation arithmetic drift`);
  const expectedLow = city.effectiveCapacityMw * city.yieldRange[0] / 1000;
  assert.ok(Math.abs(expectedLow - city.generationGwh.low) <= .11, `${city.name}: generation arithmetic drift`);
  const expectedHigh = city.effectiveCapacityMw * city.yieldRange[1] / 1000;
  assert.ok(Math.abs(expectedHigh - city.generationGwh.high) <= .11, `${city.name}: generation high arithmetic drift`);
  const fiveYearsAgoPoint = city.timeline.find((point) => point.year === city.timeline.at(-1).year - 5);
  assert.ok(fiveYearsAgoPoint, `${city.name}: five-year comparison point missing`);
  const fiveYearsAgo = fiveYearsAgoPoint.mw;
  const expectedGrowth = fiveYearsAgo > 0 ? (city.capacityMw / fiveYearsAgo - 1) * 100 : null;
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
assert.ok(pleasanton.capacityMw > 60 && pleasanton.capacityMw < 70, 'Pleasanton capacity regression');
assert.equal(pleasanton.climateZone, 12, 'Pleasanton climate-zone regression');
assert.equal(pleasanton.load.kind, 'modeled', 'Pleasanton load must remain visibly modeled');
const pleasantonGenerationMid = (pleasanton.generationGwh.low + pleasanton.generationGwh.high) / 2;
const pleasantonShare = pleasantonGenerationMid / (pleasanton.load.deliveriesGwh + pleasantonGenerationMid) * 100;
assert.ok(pleasantonShare > 14.8 && pleasantonShare < 15.0, 'Pleasanton modeled share regression');

const sanJose = data.cities.find((city) => city.name === 'San Jose');
assert.ok(sanJose.capacityMw > 425 && sanJose.capacityMw < 426, 'San Jose capacity regression');
assert.equal(sanJose.projects, 48874, 'San Jose project-count regression');
assert.ok(sanJose.generationGwh.low > 575 && sanJose.generationGwh.high < 618, 'San Jose generation regression');

const losAngeles = data.cities.find((city) => city.name === 'Los Angeles');
assert.equal(losAngeles.coverage.status, 'partial', 'LADWP coverage warning missing');

console.log(`Validated ${data.cities.length} cities, ${data.meta.totalCapacityMw.toFixed(1)} MW-DC reported.`);
