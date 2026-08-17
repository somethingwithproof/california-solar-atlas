// The attribution rules decide published city capacity, and every way they can go wrong
// is silent under-attribution rather than a crash. The live data exercises only the happy
// path, so the guards are covered here instead.
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyPouCapacity, overlapKey, pouByCity, trimStateSuffix } from '../scripts/pou-attribution.mjs';

const cityKey = (value = '') => value.toUpperCase().replace(/[^A-Z0-9]/g, '');

function inputs({ utilities = [{ utility: 'City of Testville - (CA)', basis: 'AC', capacityMw: 100 }], pairs = [] } = {}) {
  return { netMetering: { year: 2024, utilities }, territoryOverlap: { pairs, repairedTerritoryAreaPct: {}, repairedCityAreaPct: {} } };
}

function attribution(utilities, mergeThresholdPct = 95) {
  return { mergeThresholdPct, inverterLoadingRatio: { low: 1.08, high: 1.25 }, utilities };
}

const pair = (utility, city, territoryInCityPct, cityCoveredPct = 50) => ({ utility, city, territoryInCityPct, cityCoveredPct });

test('a territory exactly at the threshold merges', () => {
  const { merged } = pouByCity(
    inputs({ pairs: [pair('Testville Electric', 'Testville', 95)] }),
    attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]),
    cityKey
  );
  assert.equal(merged.size, 1, 'exactly 95% must not be rejected by the < comparison');
  assert.equal(merged.get('TESTVILLE').method, 'territory-contained');
});

test('a territory just below the threshold is refused', () => {
  assert.throws(() => pouByCity(
    inputs({ pairs: [pair('Testville Electric', 'Testville', 94.9)] }),
    attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]),
    cityKey
  ), /below the 95% merge rule/);
});

test('an override below the threshold merges only with a reason', () => {
  const entry = { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'override' };
  const data = () => inputs({ pairs: [pair('Testville Electric', 'Testville', 20.7)] });

  assert.throws(() => pouByCity(data(), attribution([entry]), cityKey), /requires a reason/);

  const { merged } = pouByCity(data(), attribution([{ ...entry, reason: 'aqueduct corridor has no retail customers' }]), cityKey);
  assert.equal(merged.get('TESTVILLE').method, 'reviewed-override');
});

test('AC is converted across the ratio band and DC is left alone', () => {
  const decide = (basis) => pouByCity(
    inputs({ utilities: [{ utility: 'City of Testville - (CA)', basis, capacityMw: 100 }], pairs: [pair('Testville Electric', 'Testville', 99)] }),
    attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]),
    cityKey
  ).merged.get('TESTVILLE').capacityRangeMwDc;

  assert.deepEqual(decide('AC'), { low: 108, high: 125 });
  // A DC figure needs no conversion, so its band must not widen.
  assert.deepEqual(decide('DC'), { low: 100, high: 100 });
});

test('two utilities cannot both claim one city', () => {
  const utilities = [
    { utility: 'City of Testville - (CA)', basis: 'AC', capacityMw: 100 },
    { utility: 'Testville Irrigation District', basis: 'AC', capacityMw: 50 }
  ];
  const pairs = [pair('Testville Electric', 'Testville', 99), pair('Testville ID', 'Testville', 99)];
  assert.throws(() => pouByCity(inputs({ utilities, pairs }), attribution([
    { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' },
    { eiaName: 'Testville Irrigation District', territoryName: 'Testville ID', city: 'Testville', decision: 'rule' }
  ]), cityKey), /two utilities merge into one city/);
});

test('an EIA utility with no decision fails the build', () => {
  assert.throws(() => pouByCity(
    inputs({ utilities: [{ utility: 'City of Testville - (CA)', basis: 'AC', capacityMw: 100 }, { utility: 'New Municipal Filer', basis: 'DC', capacityMw: 5 }],
             pairs: [pair('Testville Electric', 'Testville', 99)] }),
    attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]),
    cityKey
  ), /no attribution decision: New Municipal Filer/);
});

test('a decision naming a utility EIA does not report fails the build', () => {
  assert.throws(() => pouByCity(
    inputs({ pairs: [pair('Testville Electric', 'Testville', 99), pair('Ghost Electric', 'Ghostville', 99)] }),
    attribution([
      { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' },
      { eiaName: 'Ghost Utility', territoryName: 'Ghost Electric', city: 'Ghostville', decision: 'rule' }
    ]),
    cityKey
  ), /no EIA-861 capacity row/);
});

test('a decision with no measured overlap fails the build', () => {
  assert.throws(() => pouByCity(
    inputs({ pairs: [] }),
    attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]),
    cityKey
  ), /no measured overlap/);
});

test('excluded utilities are reported rather than dropped', () => {
  const { merged, excluded } = pouByCity(
    inputs({ utilities: [{ utility: 'Sprawling Irrigation District', basis: 'AC', capacityMw: 388 }] }),
    attribution([{ eiaName: 'Sprawling Irrigation District', territoryName: 'Sprawling ID', decision: 'excluded', reason: 'serves many cities' }]),
    cityKey
  );
  assert.equal(merged.size, 0);
  assert.deepEqual(excluded.map((entry) => [entry.eiaName, entry.capacityMw]), [['Sprawling Irrigation District', 388]]);
});

test('excluded utilities carry a DC band so a sum cannot mix AC and DC', () => {
  const { excluded } = pouByCity(
    inputs({ utilities: [
      { utility: 'Sprawling Irrigation District', basis: 'AC', capacityMw: 100 },
      { utility: 'Far Northern Power', basis: 'DC', capacityMw: 100 }
    ] }),
    attribution([
      { eiaName: 'Sprawling Irrigation District', territoryName: 'Sprawling ID', decision: 'excluded', reason: 'many cities' },
      { eiaName: 'Far Northern Power', territoryName: 'Far Northern', decision: 'excluded', reason: 'many counties' }
    ]),
    cityKey
  );
  const byName = Object.fromEntries(excluded.map((entry) => [entry.eiaName, entry]));
  assert.deepEqual(byName['Sprawling Irrigation District'].capacityRangeMwDc, { low: 108, high: 125 });
  // The DC filer is not converted, so summing the bands stays basis-consistent.
  assert.deepEqual(byName['Far Northern Power'].capacityRangeMwDc, { low: 100, high: 100 });
  const low = excluded.reduce((sum, entry) => sum + entry.capacityRangeMwDc.low, 0);
  assert.equal(low, 208);
});

test('applyPouCapacity treats municipal capacity as undated', () => {
  const pou = { utility: 'Testville Electric', year: 2024, capacityRangeMwDc: { low: 100, high: 100 } };
  const record = applyPouCapacity({}, pou, {
    capacityMw: 10, effectiveLowKw: 0, effectiveHighKw: 0, yieldRange: [1000, 2000], currentYear: 2026
  });

  assert.deepEqual(record.totalCapacityRangeMwDc, { low: 110, high: 110 });
  // Low end degrades 25 years from 2001 at 0.5% a year; high end is undegraded.
  const expectedLowKw = 100_000 * (0.995 ** 25);
  assert.ok(Math.abs(record.totalEffectiveCapacityRangeMw.low - expectedLowKw / 1000) <= 0.001);
  assert.equal(record.totalEffectiveCapacityRangeMw.high, 100);
  assert.equal(record.totalGenerationRangeGwh.high, 200);
  assert.ok(record.totalGenerationRangeGwh.low < record.totalGenerationRangeGwh.high);
});

test('applyPouCapacity replaces the coverage note instead of appending', () => {
  const record = applyPouCapacity(
    { coverage: { status: 'partial', note: 'Testville Electric projects are outside the three-IOU source files.' } },
    { utility: 'Testville Electric', year: 2024, capacityRangeMwDc: { low: 1, high: 1 } },
    { capacityMw: 0, effectiveLowKw: 0, effectiveHighKw: 0, yieldRange: [1000, 2000], currentYear: 2026 }
  );
  assert.doesNotMatch(record.coverage.note, /outside the three-IOU source files/, 'the stale note contradicts the merge');
  assert.match(record.coverage.note, /capacity is included from 2024 Form EIA-861/);
  assert.equal(record.coverage.status, 'partial');
});

test('the composite key cannot be forged by a name containing the separator', () => {
  assert.notEqual(overlapKey('A B', 'C'), overlapKey('A', 'B C'));
  assert.equal(overlapKey('A', 'B').charCodeAt(1), 0);
});

test('only the EIA state suffix is trimmed', () => {
  assert.equal(trimStateSuffix('City of Riverside - (CA)'), 'City of Riverside');
  assert.equal(trimStateSuffix('Alameda Municipal Power'), 'Alameda Municipal Power');
  assert.equal(trimStateSuffix('City of Corona - (CA) Annex'), 'City of Corona - (CA) Annex');
});

test('an unrecognized decision value is refused rather than merged', () => {
  for (const decision of ['Rule', 'merge', '', undefined]) {
    assert.throws(() => pouByCity(
      inputs({ pairs: [pair('Testville Electric', 'Testville', 10)] }),
      attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision }]),
      cityKey
    ), /decision must be one of/, `decision ${JSON.stringify(decision)} must not fall through into the merge path`);
  }
});

test('a missing merge threshold is refused rather than merging everything', () => {
  const broken = attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]);
  delete broken.mergeThresholdPct;
  // `pct < undefined` is false, so without this guard every rule entry merges unmeasured.
  assert.throws(() => pouByCity(inputs({ pairs: [pair('Testville Electric', 'Testville', 1)] }), broken, cityKey),
    /must set a numeric mergeThresholdPct/);
});

test('an unusable inverter loading ratio is refused rather than zeroing every AC filer', () => {
  const entry = { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' };
  const data = () => inputs({ pairs: [pair('Testville Electric', 'Testville', 99)] });

  for (const ratio of [{ low: 0, high: 1.25 }, { low: null, high: 1.25 }, { low: 1.3, high: 1.25 }, undefined]) {
    const broken = attribution([entry]);
    broken.inverterLoadingRatio = ratio;
    assert.throws(() => pouByCity(data(), broken, cityKey), /inverterLoadingRatio must be finite/,
      `ratio ${JSON.stringify(ratio)} must not reach the conversion`);
  }
});

test('a non-numeric overlap measurement is refused rather than merging unconditionally', () => {
  const entry = { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' };
  // `undefined < 95` is false, so without a guard this merges instead of being measured.
  for (const pct of [undefined, null, 'high', NaN, -1, 150]) {
    assert.throws(() => pouByCity(
      inputs({ pairs: [{ utility: 'Testville Electric', city: 'Testville', territoryInCityPct: pct, cityCoveredPct: 50 }] }),
      attribution([entry]), cityKey
    ), /territoryInCityPct must be a percentage/, `territoryInCityPct ${JSON.stringify(pct)} must not reach the gate`);
  }
});

const entryFor = (decision, extra = {}) => ({ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision, ...extra });

function repairedInputs(pct, repairs) {
  const base = inputs({ pairs: [pair('Testville Electric', 'Testville', pct)] });
  Object.assign(base.territoryOverlap, repairs);
  return base;
}

test('a repaired territory refuses an automatic merge', () => {
  assert.throws(() => pouByCity(repairedInputs(99.7, { repairedTerritoryAreaPct: { 'Testville Electric': 4.2 } }), attribution([entryFor('rule')]), cityKey),
    /needed a geometry repair/);
});

test('a repaired city refuses an automatic merge too', () => {
  // The city is the ratio's numerator. Converting its area change into points of
  // territoryInCityPct needs A_city / A_territory, so no unscaled tolerance is safe.
  assert.throws(() => pouByCity(repairedInputs(99.7, { repairedCityAreaPct: { Testville: 0.66 } }), attribution([entryFor('rule')]), cityKey),
    /needed a geometry repair/);
});

test('a reviewed override may merge on repaired geometry', () => {
  const { merged } = pouByCity(repairedInputs(96, { repairedTerritoryAreaPct: { 'Testville Electric': 4.2 } }),
    attribution([entryFor('override', { reason: 'reviewed against the utility map' })]), cityKey);
  assert.equal(merged.get('TESTVILLE').method, 'reviewed-override');
});

test('an absent repair ledger fails rather than silently disabling the gate', () => {
  const base = inputs({ pairs: [pair('Testville Electric', 'Testville', 99)] });
  delete base.territoryOverlap.repairedTerritoryAreaPct;
  delete base.territoryOverlap.repairedCityAreaPct;
  assert.throws(() => pouByCity(base, attribution([entryFor('rule')]), cityKey), /must carry repairedTerritoryAreaPct/);
});

test('an unrecognized decision value is refused rather than merged', () => {
  for (const decision of ['Rule', 'merge', '', undefined]) {
    assert.throws(() => pouByCity(
      inputs({ pairs: [pair('Testville Electric', 'Testville', 10)] }),
      attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision }]),
      cityKey
    ), /decision must be one of/, `decision ${JSON.stringify(decision)} must not fall through into the merge path`);
  }
});

test('a missing merge threshold is refused rather than merging everything', () => {
  const broken = attribution([{ eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' }]);
  delete broken.mergeThresholdPct;
  // `pct < undefined` is false, so without this guard every rule entry merges unmeasured.
  assert.throws(() => pouByCity(inputs({ pairs: [pair('Testville Electric', 'Testville', 1)] }), broken, cityKey),
    /must set a numeric mergeThresholdPct/);
});

test('an unusable inverter loading ratio is refused rather than zeroing every AC filer', () => {
  const entry = { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' };
  const data = () => inputs({ pairs: [pair('Testville Electric', 'Testville', 99)] });

  for (const ratio of [{ low: 0, high: 1.25 }, { low: null, high: 1.25 }, { low: 1.3, high: 1.25 }, undefined]) {
    const broken = attribution([entry]);
    broken.inverterLoadingRatio = ratio;
    assert.throws(() => pouByCity(data(), broken, cityKey), /inverterLoadingRatio must be finite/,
      `ratio ${JSON.stringify(ratio)} must not reach the conversion`);
  }
});

test('a non-numeric overlap measurement is refused rather than merging unconditionally', () => {
  const entry = { eiaName: 'City of Testville - (CA)', territoryName: 'Testville Electric', city: 'Testville', decision: 'rule' };
  // `undefined < 95` is false, so without a guard this merges instead of being measured.
  for (const pct of [undefined, null, 'high', NaN, -1, 150]) {
    assert.throws(() => pouByCity(
      inputs({ pairs: [{ utility: 'Testville Electric', city: 'Testville', territoryInCityPct: pct, cityCoveredPct: 50 }] }),
      attribution([entry]), cityKey
    ), /territoryInCityPct must be a percentage/, `territoryInCityPct ${JSON.stringify(pct)} must not reach the gate`);
  }
});
