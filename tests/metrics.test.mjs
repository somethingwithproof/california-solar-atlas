// A fault in the metric layer blanks the map and the rankings rather than showing a
// wrong number, so every metric is exercised here including the ones with no band.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { capacityFloor, capacityRange, generationMid, generationRange, metricConfig, metricDisplay, rangeText } from '../src/metrics.js';

const iouOnly = { capacityMw: 154.8, generationGwh: { low: 225.1, high: 240.1 }, growth5yPct: 73.1 };
const withMunicipal = {
  capacityMw: 27.8,
  generationGwh: { low: 40.4, high: 43.1 },
  growth5yPct: 62,
  totalCapacityRangeMwDc: { low: 760.4, high: 875.7 },
  totalGenerationRangeGwh: { low: 1009.8, high: 1399.7 }
};

test('every metric renders a non-empty label for every city shape', () => {
  for (const [name, config] of Object.entries(metricConfig)) {
    for (const city of [iouOnly, withMunicipal]) {
      const rendered = metricDisplay(config, city);
      assert.equal(typeof rendered, 'string', `${name} must render a string`);
      assert.ok(rendered.trim(), `${name} must not render empty`);
      assert.doesNotMatch(rendered, /undefined|NaN/, `${name} rendered ${rendered}`);
    }
  }
});

test('a metric without displayCity falls back instead of recursing', () => {
  // growth5yPct defines no displayCity; a self-referential fallback overflows the stack.
  assert.equal(metricConfig.growth5yPct.displayCity, undefined, 'fixture assumes this metric has no band');
  assert.equal(metricDisplay(metricConfig.growth5yPct, iouOnly), '73.1%');
});

test('ranking and shading use the reported floor, never a synthesized midpoint', () => {
  assert.equal(capacityFloor(withMunicipal), 760.4);
  assert.notEqual(capacityFloor(withMunicipal), (760.4 + 875.7) / 2);
  assert.equal(capacityFloor(iouOnly), 154.8);
});

test('a city without municipal capacity collapses to a single value', () => {
  assert.deepEqual(capacityRange(iouOnly), { low: 154.8, high: 154.8 });
  assert.equal(metricDisplay(metricConfig.capacityMw, iouOnly), '154.8 MW');
});

test('a city with municipal capacity shows the band', () => {
  assert.equal(metricDisplay(metricConfig.capacityMw, withMunicipal), '760.4–875.7 MW');
  assert.equal(metricDisplay(metricConfig.generation, withMunicipal), '1,009.8–1,399.7 GWh');
});

test('generation and capacity accessors prefer the combined figure', () => {
  assert.deepEqual(generationRange(withMunicipal), { low: 1009.8, high: 1399.7 });
  assert.equal(generationMid(withMunicipal), (1009.8 + 1399.7) / 2);
  assert.deepEqual(generationRange(iouOnly), { low: 225.1, high: 240.1 });
});

test('rangeText collapses an equal band and joins an unequal one', () => {
  assert.equal(rangeText({ low: 5, high: 5 }, 'MW'), '5 MW');
  assert.equal(rangeText({ low: 5, high: 7 }, 'MW'), '5–7 MW');
});
