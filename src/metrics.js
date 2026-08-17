// The metric layer every comparison surface shares: the map, the rankings, and the
// comparison cards. Kept out of main.js so it can be exercised without a DOM, because a
// fault here blanks whole sections rather than showing a wrong number.
//
// A city gains totalCapacityRangeMwDc and totalGenerationRangeGwh only when municipal
// capacity was attributed to it, so every accessor falls back to the IOU-only field.

export const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
export const integer = new Intl.NumberFormat('en-US');

export const generationRange = (city) => city.totalGenerationRangeGwh || city.generationGwh;
export const generationMid = (city) => (generationRange(city).low + generationRange(city).high) / 2;
export const capacityRange = (city) => city.totalCapacityRangeMwDc || { low: city.capacityMw, high: city.capacityMw };
export const capacityFloor = (city) => capacityRange(city).low;

export const rangeText = ({ low, high }, unit) => low === high
  ? `${format.format(low)} ${unit}`
  : `${format.format(low)}–${format.format(high)} ${unit}`;

export const metricConfig = {
  capacityMw: {
    label: 'Reported capacity', short: 'MW-DC',
    // Ranking and shading need one number, and the reported floor is a real figure;
    // the midpoint of the conversion band is not.
    value: capacityFloor,
    display: (value) => `${format.format(value)} MW-DC`,
    displayCity: (city) => rangeText(capacityRange(city), 'MW-DC')
  },
  generation: {
    label: 'Estimated generation', short: 'GWh/year',
    value: generationMid,
    display: (value) => `${format.format(value)} GWh`,
    displayCity: (city) => rangeText(generationRange(city), 'GWh')
  },
  growth5yPct: {
    label: 'Five-year growth', short: '5-year growth',
    value: (city) => city.growth5yPct,
    display: (value) => `${format.format(value)}%`
  }
};

// Falls back to the scalar label for metrics that have no band to show.
export const metricDisplay = (config, city) => config.displayCity
  ? config.displayCity(city)
  : config.display(config.value(city));
