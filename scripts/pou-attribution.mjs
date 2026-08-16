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

// The registry is hand-edited, so its shape is validated before any figure derives from it.
function conversionBand(pouAttribution) {
  // Without a finite threshold every `pct < undefined` is false, so every rule entry
  // would merge unconditionally rather than being measured against anything.
  if (!Number.isFinite(pouAttribution.mergeThresholdPct)) {
    throw new TypeError('data/pou-attribution.json must set a numeric mergeThresholdPct');
  }
  // A zero or absent low would multiply every AC filer's capacity to a floor of zero,
  // and the downstream `low <= high` assertion would still pass.
  const { low, high } = pouAttribution.inverterLoadingRatio ?? {};
  if (!Number.isFinite(low) || !Number.isFinite(high) || low < 1 || low > high) {
    throw new TypeError(`data/pou-attribution.json inverterLoadingRatio must be finite with 1 <= low <= high, found ${JSON.stringify({ low, high })}`);
  }
  return { low, high };
}

// A DC filer needs no conversion, so its band collapses to a single value.
function toDcBand(capacityMw, basis, band) {
  const factor = basis.toUpperCase() === 'AC' ? band : { low: 1, high: 1 };
  return {
    low: Number((capacityMw * factor.low).toFixed(3)),
    high: Number((capacityMw * factor.high).toFixed(3))
  };
}

function mergedRecord(entry, reported, pair, band, year) {
  const record = {
    // EIA suffixes its utility names for disambiguation; the exact string stays in
    // data/pou-attribution.json, so trimming it here costs no provenance.
    utility: trimStateSuffix(entry.eiaName),
    basis: reported.basis,
    reportedMw: reported.capacityMw,
    capacityRangeMwDc: toDcBand(reported.capacityMw, reported.basis, band),
    method: entry.decision === 'override' ? 'reviewed-override' : 'territory-contained',
    territoryInCityPct: pair.territoryInCityPct,
    cityCoveredPct: pair.cityCoveredPct,
    year
  };
  if (entry.reason) record.reason = entry.reason;
  if (entry.sourceUrl) record.sourceUrl = entry.sourceUrl;
  return record;
}

// Throws rather than returning a partial answer: every failure here is silent
// under-attribution, which no downstream reconciliation can detect.
function checkDecision(entry, reported, pair, pouAttribution) {
  if (!reported) throw new Error(`${entry.eiaName}: no EIA-861 capacity row; refresh data/pou-inputs.json`);
  if (entry.decision === 'excluded') return;
  if (!pair) throw new Error(`${entry.eiaName}: no measured overlap for ${entry.territoryName} against ${entry.city}`);
  if (entry.decision === 'rule' && pair.territoryInCityPct < pouAttribution.mergeThresholdPct) {
    throw new Error(`${entry.eiaName}: ${pair.territoryInCityPct}% is below the ${pouAttribution.mergeThresholdPct}% merge rule; use an override with a reason`);
  }
  if (entry.decision === 'override' && !entry.reason) throw new Error(`${entry.eiaName}: an override requires a reason`);
}

export function pouByCity(pouInputs, pouAttribution, cityKey) {
  const band = conversionBand(pouAttribution);
  const capacity = new Map(pouInputs.netMetering.utilities.map((utility) => [utility.utility, utility]));
  const overlap = new Map(pouInputs.territoryOverlap.pairs.map((pair) => [overlapKey(pair.utility, pair.city), pair]));
  const merged = new Map();
  const excluded = [];

  for (const entry of pouAttribution.utilities) {
    // No default arm: an unrecognized decision must not fall through into the merge path.
    if (!DECISIONS.has(entry.decision)) {
      throw new Error(`${entry.eiaName}: decision must be one of ${[...DECISIONS].join(', ')}, found ${JSON.stringify(entry.decision)}`);
    }
    const reported = capacity.get(entry.eiaName);
    const pair = overlap.get(overlapKey(entry.territoryName, entry.city));
    checkDecision(entry, reported, pair, pouAttribution);

    if (entry.decision === 'excluded') {
      // Carries the same conversion the merged path uses, or a later sum over these
      // rows silently mixes AC and DC into one unlabelled total.
      excluded.push({ ...entry, basis: reported.basis, capacityMw: reported.capacityMw, capacityRangeMwDc: toDcBand(reported.capacityMw, reported.basis, band) });
      continue;
    }

    const existing = merged.get(cityKey(entry.city));
    if (existing) throw new Error(`${entry.city}: two utilities merge into one city (${existing.utility}, ${entry.eiaName})`);
    merged.set(cityKey(entry.city), mergedRecord(entry, reported, pair, band, pouInputs.netMetering.year));
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
