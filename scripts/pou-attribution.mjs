// Municipal utility attribution: decides which publicly owned utility capacity may be
// credited to which city, and converts a reported AC figure to DC.
//
// Kept separate from build-data.mjs so the decision rules can be exercised directly.
// Every failure mode here is silent under-attribution rather than a crash, so each one
// throws instead of returning a partial answer.

const STATE_SUFFIX = ' - (CA)';

export const trimStateSuffix = (name) => name.endsWith(STATE_SUFFIX) ? name.slice(0, -STATE_SUFFIX.length) : name;

// NUL cannot appear in a utility or city name, so it cannot forge a composite key.
export const overlapKey = (utility, city) => `${utility}\u0000${city}`;

const DECISIONS = new Set(['rule', 'override', 'excluded']);

export function pouByCity(pouInputs, pouAttribution, cityKey) {
  // Without a finite threshold every `pct < undefined` is false, so every rule entry
  // would merge unconditionally rather than being measured against anything.
  if (!Number.isFinite(pouAttribution.mergeThresholdPct)) {
    throw new Error('data/pou-attribution.json must set a numeric mergeThresholdPct');
  }
  const capacity = new Map(pouInputs.netMetering.utilities.map((utility) => [utility.utility, utility]));
  const overlap = new Map();
  for (const pair of pouInputs.territoryOverlap.pairs) overlap.set(overlapKey(pair.utility, pair.city), pair);
  // Guarded like mergeThresholdPct above: a zero or absent low would multiply every
  // AC filer's capacity to a floor of zero, and `low <= high` downstream still passes.
  const { low: ilrLow, high: ilrHigh } = pouAttribution.inverterLoadingRatio ?? {};
  if (!Number.isFinite(ilrLow) || !Number.isFinite(ilrHigh) || ilrLow < 1 || ilrLow > ilrHigh) {
    throw new Error(`data/pou-attribution.json inverterLoadingRatio must be finite with 1 <= low <= high, found ${JSON.stringify({ low: ilrLow, high: ilrHigh })}`);
  }
  const merged = new Map();
  const excluded = [];

  for (const entry of pouAttribution.utilities) {
    // No default arm: an unrecognized decision must not fall through into the merge path.
    if (!DECISIONS.has(entry.decision)) {
      throw new Error(`${entry.eiaName}: decision must be one of ${[...DECISIONS].join(', ')}, found ${JSON.stringify(entry.decision)}`);
    }
    const reported = capacity.get(entry.eiaName);
    if (!reported) throw new Error(`${entry.eiaName}: no EIA-861 capacity row; refresh data/pou-inputs.json`);
    if (entry.decision === 'excluded') {
      // Carry the basis and the same conversion the merged path uses, or a later sum
      // over these rows silently mixes AC and DC into one unlabelled total.
      const isAcExcluded = reported.basis.toUpperCase() === 'AC';
      excluded.push({
        ...entry,
        basis: reported.basis,
        capacityMw: reported.capacityMw,
        capacityRangeMwDc: {
          low: Number((reported.capacityMw * (isAcExcluded ? ilrLow : 1)).toFixed(3)),
          high: Number((reported.capacityMw * (isAcExcluded ? ilrHigh : 1)).toFixed(3))
        }
      });
      continue;
    }

    const pair = overlap.get(overlapKey(entry.territoryName, entry.city));
    if (!pair) throw new Error(`${entry.eiaName}: no measured overlap for ${entry.territoryName} against ${entry.city}`);
    if (entry.decision === 'rule' && pair.territoryInCityPct < pouAttribution.mergeThresholdPct) {
      throw new Error(`${entry.eiaName}: ${pair.territoryInCityPct}% is below the ${pouAttribution.mergeThresholdPct}% merge rule; use an override with a reason`);
    }
    if (entry.decision === 'override' && !entry.reason) throw new Error(`${entry.eiaName}: an override requires a reason`);

    // Reported DC needs no conversion, so its band collapses to a single value.
    const isAc = reported.basis.toUpperCase() === 'AC';
    const record = {
      // EIA suffixes its utility names for disambiguation; the exact string stays in
      // data/pou-attribution.json, so trimming it here costs no provenance.
      utility: trimStateSuffix(entry.eiaName),
      basis: reported.basis,
      reportedMw: reported.capacityMw,
      capacityRangeMwDc: {
        low: Number((reported.capacityMw * (isAc ? ilrLow : 1)).toFixed(3)),
        high: Number((reported.capacityMw * (isAc ? ilrHigh : 1)).toFixed(3))
      },
      method: entry.decision === 'override' ? 'reviewed-override' : 'territory-contained',
      territoryInCityPct: pair.territoryInCityPct,
      cityCoveredPct: pair.cityCoveredPct,
      year: pouInputs.netMetering.year
    };
    if (entry.reason) record.reason = entry.reason;
    if (entry.sourceUrl) record.sourceUrl = entry.sourceUrl;
    const existing = merged.get(cityKey(entry.city));
    if (existing) throw new Error(`${entry.city}: two utilities merge into one city (${existing.utility}, ${entry.eiaName})`);
    merged.set(cityKey(entry.city), record);
  }
  // Every utility EIA reports must be a deliberate decision. Without this, next year's
  // new municipal filer is silently absent instead of merged or explicitly excluded.
  const decided = new Set(pouAttribution.utilities.map((entry) => entry.eiaName));
  const undecided = pouInputs.netMetering.utilities.map((utility) => utility.utility).filter((name) => !decided.has(name));
  if (undecided.length) throw new Error(`EIA reports utilities with no attribution decision: ${undecided.join(', ')}`);
  return { merged, excluded };
}

// EIA-861 reports a cumulative total with no vintages, so municipal capacity is treated
// like an undated IOU project: fully degraded from 2001 at the low end, undegraded at
// the high end. Only capacity and generation gain the utility; project counts, sectors,
// and the approval-date timeline stay IOU-only because EIA-861 has no project records.
export function applyPouCapacity(record, pou, { capacityMw, effectiveLowKw, effectiveHighKw, yieldRange, currentYear }) {
  const lowKw = pou.capacityRangeMwDc.low * 1000 * (0.995 ** Math.max(0, currentYear - 2001));
  const highKw = pou.capacityRangeMwDc.high * 1000;
  record.pouCapacity = pou;
  // The registry note is replaced rather than prepended: it says this utility's capacity
  // is missing, which this merge is what makes false. The note below carries the same
  // city-specific fact (which utility) plus the limitation that actually still applies.
  record.coverage = {
    status: 'partial',
    note: `${pou.utility} capacity is included from ${pou.year} Form EIA-861 net metering. Project counts, sector splits, and the growth timeline below still come only from PG&E, SCE, and SDG&E records.`
  };
  record.totalCapacityRangeMwDc = {
    low: Number((capacityMw + pou.capacityRangeMwDc.low).toFixed(3)),
    high: Number((capacityMw + pou.capacityRangeMwDc.high).toFixed(3))
  };
  record.totalEffectiveCapacityRangeMw = {
    low: Number(((effectiveLowKw + lowKw) / 1000).toFixed(3)),
    high: Number(((effectiveHighKw + highKw) / 1000).toFixed(3))
  };
  record.totalGenerationRangeGwh = {
    low: Number(((effectiveLowKw + lowKw) * yieldRange[0] / 1_000_000).toFixed(1)),
    high: Number(((effectiveHighKw + highKw) * yieldRange[1] / 1_000_000).toFixed(1))
  };
  return record;
}
