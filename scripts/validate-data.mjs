#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const data = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/cities.json'), 'utf8'));
const boundaries = JSON.parse(readFileSync(resolve(import.meta.dirname, '../public/data/boundaries.json'), 'utf8'));

// Cities whose Department of Finance population row is known not to match. The
// county-collision and legal-name causes are fixed in build-data.mjs; this list
// exists so a NEW gap fails the build instead of quietly lowering a threshold.
// It is expected to shrink to the two remaining unknowns on the next refresh.
const knownPopulationGaps = new Map([
  ['San Joaquin', 'city name collides with San Joaquin County (fixed; awaiting refresh)'],
  ['Selma', 'follows San Joaquin in the E-1 sheet (fixed; awaiting refresh)'],
  ['San Francisco', 'consolidated city-county published as a single row (fixed; awaiting refresh)'],
  ['Ventura', 'E-1 lists San Buenaventura (Ventura) (fixed; awaiting refresh)'],
  ['Paso Robles', 'E-1 lists El Paso de Robles (Paso Robles) (fixed; awaiting refresh)'],
  ['California', 'E-1 lists California City (fixed; awaiting refresh)'],
  ['Amador City', 'cause not yet identified'],
  ['Angels', 'cause not yet identified']
]);

const startYear = data.meta.timelineStartYear ?? 2001;
const endYear = data.meta.timelineEndYear ?? data.cities[0].timeline.at(-1).year;
const expectedTimelineLength = endYear - startYear + 1;

assert.equal(data.meta.schemaVersion, 2, 'Unexpected data schema');
assert.equal(data.cities.length, 483, 'Expected every incorporated California city');
assert.equal(new Set(data.cities.map((city) => city.name)).size, 483, 'City names must be unique');
assert.equal(new Set(data.cities.map((city) => slugify(city.name))).size, 483, 'City URL slugs must be unique');
assert.ok(data.meta.coordinateCoverage >= 480, 'Coordinate coverage regressed');
assert.ok(Object.keys(boundaries).length >= 480, 'Municipal boundary coverage regressed');

const missingPopulation = data.cities.filter((city) => !city.population).map((city) => city.name);
const unexpected = missingPopulation.filter((name) => !knownPopulationGaps.has(name));
assert.deepEqual(unexpected, [], `Unexplained population gap: ${unexpected.join(', ')}`);
assert.ok(data.meta.populationCoverage === data.cities.length - missingPopulation.length, 'populationCoverage disagrees with the city records');

for (const city of data.cities) {
  assert.ok(Number.isFinite(city.capacityMw) && city.capacityMw >= 0, `${city.name}: invalid capacity`);
  assert.ok(Number.isFinite(city.effectiveCapacityMw) && city.effectiveCapacityMw <= city.capacityMw + .001, `${city.name}: invalid degraded capacity`);
  assert.ok(['reported', 'partial', 'unverified'].includes(city.coverage.status), `${city.name}: invalid coverage status`);
  assert.equal(city.timeline.length, expectedTimelineLength, `${city.name}: incomplete timeline`);
  assert.ok(city.generationGwh.low <= city.generationGwh.high, `${city.name}: invalid generation range`);
  if (city.climateZone) assert.ok(city.climateZone >= 1 && city.climateZone <= 16, `${city.name}: invalid climate zone`);
  if (city.population) assert.ok(city.wattsPerPerson >= 0, `${city.name}: invalid per-capita value`);
  const expectedLow = city.effectiveCapacityMw * city.yieldRange[0] / 1000;
  assert.ok(Math.abs(expectedLow - city.generationGwh.low) <= .11, `${city.name}: generation arithmetic drift`);
  // Optional coverage detail must never ship without its provenance.
  if (city.coverage.excludedUtility) {
    assert.equal(city.coverage.status, 'partial', `${city.name}: excluded utility on non-partial coverage`);
    assert.ok(city.coverage.excludedUtility.name, `${city.name}: excluded utility needs a name`);
  }
  if (city.coverage.bound) {
    const bound = city.coverage.bound;
    assert.ok(Number.isFinite(bound.capacityMw) && bound.sourceName && bound.sourceUrl, `${city.name}: independent bound needs a sourced figure`);
    assert.ok(['service-territory', 'city'].includes(bound.scope), `${city.name}: independent bound needs an explicit scope`);
  }
}

const pleasanton = data.cities.find((city) => city.name === 'Pleasanton');
assert.ok(pleasanton.capacityMw > 60 && pleasanton.capacityMw < 70, 'Pleasanton capacity regression');
assert.equal(pleasanton.climateZone, 12, 'Pleasanton climate-zone regression');
assert.equal(pleasanton.load.kind, 'modeled', 'Pleasanton load must remain visibly modeled');

const losAngeles = data.cities.find((city) => city.name === 'Los Angeles');
assert.equal(losAngeles.coverage.status, 'partial', 'LADWP coverage warning missing');

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

console.log(`Validated ${data.cities.length} cities, ${data.meta.totalCapacityMw.toFixed(1)} MW-DC reported, timeline ${startYear}–${endYear}.`);
if (missingPopulation.length) console.log(`Known population gaps (${missingPopulation.length}): ${missingPopulation.map((name) => `${name} — ${knownPopulationGaps.get(name)}`).join('; ')}`);
