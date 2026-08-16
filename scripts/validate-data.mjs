#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const data = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/cities.json'), 'utf8'));
const boundaries = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/boundaries.json'), 'utf8'));
assert.equal(data.meta.schemaVersion, 2, 'Unexpected data schema');
assert.equal(data.cities.length, 483, 'Expected every incorporated California city');
assert.equal(new Set(data.cities.map((city) => city.name)).size, 483, 'City names must be unique');
assert.ok(data.meta.coordinateCoverage >= 480, 'Coordinate coverage regressed');
assert.ok(data.meta.populationCoverage >= 470, 'Population coverage regressed');
assert.ok(Object.keys(boundaries).length >= 480, 'Municipal boundary coverage regressed');

for (const city of data.cities) {
  assert.ok(Number.isFinite(city.capacityMw) && city.capacityMw >= 0, `${city.name}: invalid capacity`);
  assert.ok(Number.isFinite(city.effectiveCapacityMw) && city.effectiveCapacityMw <= city.capacityMw + .001, `${city.name}: invalid degraded capacity`);
  assert.ok(['reported', 'partial', 'unverified'].includes(city.coverage.status), `${city.name}: invalid coverage status`);
  assert.equal(city.timeline.length, 26, `${city.name}: incomplete timeline`);
  assert.ok(city.generationGwh.low <= city.generationGwh.high, `${city.name}: invalid generation range`);
  if (city.climateZone) assert.ok(city.climateZone >= 1 && city.climateZone <= 16, `${city.name}: invalid climate zone`);
  if (city.population) assert.ok(city.wattsPerPerson >= 0, `${city.name}: invalid per-capita value`);
  const expectedLow = city.effectiveCapacityMw * city.yieldRange[0] / 1000;
  assert.ok(Math.abs(expectedLow - city.generationGwh.low) <= .11, `${city.name}: generation arithmetic drift`);
}

const pleasanton = data.cities.find((city) => city.name === 'Pleasanton');
assert.ok(pleasanton.capacityMw > 60 && pleasanton.capacityMw < 70, 'Pleasanton capacity regression');
assert.equal(pleasanton.climateZone, 12, 'Pleasanton climate-zone regression');
assert.equal(pleasanton.load.kind, 'modeled', 'Pleasanton load must remain visibly modeled');

const losAngeles = data.cities.find((city) => city.name === 'Los Angeles');
assert.equal(losAngeles.coverage.status, 'partial', 'LADWP coverage warning missing');

console.log(`Validated ${data.cities.length} cities, ${data.meta.totalCapacityMw.toFixed(1)} MW-DC reported.`);
