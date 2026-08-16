#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const sources = {
  cities: resolve(process.env.CA_CITY_CSV || '/tmp/ca-cities.csv'),
  projects: resolve(process.env.CA_DG_ZIP || '/tmp/ca-dg-projects.zip'),
  population: resolve(process.env.CA_POPULATION_XLSX || '/tmp/ca-population-2026.xlsx'),
  gazetteer: resolve(process.env.CA_GAZETTEER || '/tmp/ca-place-gazetteer.txt'),
  climateZones: resolve(process.env.CA_CLIMATE_ZONES || '/tmp/ca-climate-zones.geojson')
};
const output = resolve(projectRoot, 'public/data/cities.json');
const loadRegistry = JSON.parse(readFileSync(resolve(projectRoot, 'data/load-sources.json'), 'utf8'));
const coverageRegistry = JSON.parse(readFileSync(resolve(projectRoot, 'data/utility-coverage.json'), 'utf8'));
let dataThrough = process.env.DATA_THROUGH || '';
const currentYear = Number(process.env.DATA_YEAR || 2026);
const populationYear = Number(process.env.POPULATION_YEAR || currentYear);
const timelineStartYear = Number(process.env.TIMELINE_START_YEAR || 2001);

function decodeXml(value = '') {
  // &amp; must be decoded last, otherwise "&amp;lt;" collapses to "<".
  return value.replace(/<[^>]+>/g, '').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
}

function parseCsv(line) {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') { value += '"'; index += 1; }
      else quoted = !quoted;
    } else if (character === ',' && !quoted) { values.push(value); value = ''; }
    else value += character;
  }
  values.push(value);
  return values;
}

function key(value = '') {
  return value.toUpperCase().replace(/^CITY OF /, '').replace(/^TOWN OF /, '').replace(/[^A-Z0-9]/g, '');
}

function officialCities() {
  const lines = readFileSync(sources.cities, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const header = parseCsv(lines.shift());
  const indexes = Object.fromEntries(['CDTFA_CITY', 'CDTFA_COUNTY', 'CENSUS_GEOID'].map((name) => [name, header.indexOf(name)]));
  const cities = new Map();
  for (const line of lines) {
    const row = parseCsv(line);
    const name = row[indexes.CDTFA_CITY]?.trim();
    if (!name) continue;
    const id = key(name);
    if (!cities.has(id)) cities.set(id, {
      name,
      county: (row[indexes.CDTFA_COUNTY] || '').replace(/ County$/, ''),
      geoid: row[indexes.CENSUS_GEOID] || null,
      capacityKw: 0,
      projects: 0,
      storageProjects: 0,
      storageKwh: 0,
      utilities: new Set(),
      byYear: new Map(),
      sectors: { residential: { kw: 0, projects: 0 }, commercial: { kw: 0, projects: 0 }, public: { kw: 0, projects: 0 }, other: { kw: 0, projects: 0 } }
    });
  }
  if (cities.has('ANGELS')) cities.set('ANGELSCAMP', cities.get('ANGELS'));
  return cities;
}

function addGazetteer(cities) {
  const rows = readFileSync(sources.gazetteer, 'utf8').trim().split(/\r?\n/);
  const header = rows.shift().trim().split(/\t/).map((value) => value.trim());
  const indexes = Object.fromEntries(['GEOID', 'INTPTLAT', 'INTPTLONG'].map((name) => [name, header.indexOf(name)]));
  const byGeoid = new Map([...new Set(cities.values())].map((city) => [city.geoid, city]));
  for (const line of rows) {
    const row = line.split(/\t/).map((value) => value.trim());
    const city = byGeoid.get(row[indexes.GEOID]);
    if (city) city.coordinates = [Number(row[indexes.INTPTLONG]), Number(row[indexes.INTPTLAT])];
  }
}

// Department of Finance E-1 publishes a handful of cities under their full legal
// name while CDTFA uses the common one. Left side is the E-1 spelling.
const populationAliases = {
  SANBUENAVENTURAVENTURA: 'VENTURA',
  ELPASODEROBLESPASOROBLES: 'PASOROBLES',
  CALIFORNIACITY: 'CALIFORNIA',
  ANGELSCAMP: 'ANGELS'
};
// San Francisco is California's only consolidated city-county: E-1 gives it a
// single row that serves as both the county header and the city.
const consolidatedCityCounties = new Set(['SANFRANCISCO']);

function addPopulation(cities) {
  const stringsXml = execFileSync('unzip', ['-p', sources.population, 'xl/sharedStrings.xml'], { encoding: 'utf8', maxBuffer: 20_000_000 });
  const strings = (stringsXml.match(/<si[\s>][\s\S]*?<\/si>/g) || []).map(decodeXml);
  const sheet = execFileSync('unzip', ['-p', sources.population, 'xl/worksheets/sheet2.xml'], { encoding: 'utf8', maxBuffer: 20_000_000 });
  const rows = sheet.match(/<row[\s>][\s\S]*?<\/row>/g) || [];
  const uniqueCities = [...new Set(cities.values())];
  const countyKeys = new Set(uniqueCities.map((city) => key(city.county)));
  // Indexed by county so a row whose name matches a county can still be read as
  // a city of the section being scanned. "San Joaquin" is a city in Fresno
  // County; treating it as a county header dropped its own population and every
  // Fresno city listed after it.
  const cityKeysByCounty = new Map();
  for (const city of uniqueCities) {
    const countyKey = key(city.county);
    if (!cityKeysByCounty.has(countyKey)) cityKeysByCounty.set(countyKey, new Set());
    cityKeysByCounty.get(countyKey).add(key(city.name));
  }
  const lookupCity = (nameKey) => cities.get(populationAliases[nameKey] || nameKey);
  let currentCounty = '';
  for (const xml of rows) {
    const values = {};
    for (const cell of xml.match(/<c[\s>][\s\S]*?<\/c>/g) || []) {
      const column = cell.match(/ r="([A-Z]+)\d+"/)?.[1];
      const raw = cell.match(/<v>(.*?)<\/v>/)?.[1];
      values[column] = cell.includes(' t="s"') ? strings[Number(raw)] : raw;
    }
    const nameKey = key(values.A);
    if (!nameKey || nameKey === 'STATECOUNTYCITY') continue;
    // The statewide total precedes every county section. Once a county is open,
    // "California" is California City in Kern County.
    if (nameKey === 'CALIFORNIA' && !currentCounty) continue;
    const population = Number(values.C);
    const cityOfOpenCounty = cityKeysByCounty.get(currentCounty)?.has(populationAliases[nameKey] || nameKey);
    if (countyKeys.has(nameKey) && !cityOfOpenCounty) {
      currentCounty = nameKey;
      if (consolidatedCityCounties.has(nameKey) && population > 0) {
        const consolidated = lookupCity(nameKey);
        if (consolidated) consolidated.population = population;
      }
      continue;
    }
    const city = lookupCity(nameKey);
    if (city && key(city.county) === currentCounty && population > 0) city.population = population;
  }
  const unmatched = uniqueCities.filter((city) => !city.population);
  if (unmatched.length) process.stdout.write(`Population unmatched for ${unmatched.length} cities: ${unmatched.map((city) => `${city.name} (${city.county})`).join(', ')}\n`);
}

function pointInRing([x, y], ring) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
    const [xi, yi] = ring[index];
    const [xj, yj] = ring[previous];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false;
  return !polygon.slice(1).some((hole) => pointInRing(point, hole));
}

function addClimateZones(cities) {
  const zones = JSON.parse(readFileSync(sources.climateZones, 'utf8')).features;
  for (const city of new Set(cities.values())) {
    if (!city.coordinates) continue;
    const feature = zones.find(({ geometry }) => {
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      return polygons.some((polygon) => pointInPolygon(city.coordinates, polygon));
    });
    city.climateZone = feature ? Number(feature.properties.BZone) : null;
  }
}

// Fleet-average DC yields by CEC climate zone. These deliberately span mixed
// orientations and shading rather than representing an optimally tilted array.
const climateYields = {
  1: [1250, 1350], 2: [1350, 1450], 3: [1350, 1450], 4: [1400, 1500],
  5: [1400, 1500], 6: [1450, 1550], 7: [1500, 1600], 8: [1500, 1600],
  9: [1500, 1600], 10: [1550, 1650], 11: [1450, 1550], 12: [1450, 1550],
  13: [1550, 1650], 14: [1600, 1700], 15: [1650, 1750], 16: [1400, 1500]
};

function sectorKey(value = '') {
  if (/residential/i.test(value)) return 'residential';
  if (/commercial|industrial|agricultural/i.test(value)) return 'commercial';
  if (/government|non-profit|school|public/i.test(value)) return 'public';
  return 'other';
}

async function zipEntries() {
  const text = execFileSync('unzip', ['-Z1', sources.projects], { encoding: 'utf8' });
  return text.trim().split(/\r?\n/).filter((name) => name.endsWith('.csv'));
}

function inferDataThrough(entries) {
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  // A three-letter token that is not a month yields NaN, and one NaN in the set
  // makes Math.max NaN — discarding every valid date. Filter before reducing.
  const dates = entries
    .flatMap((entry) => [...entry.matchAll(/-([A-Z][a-z]{2})(20\d{2})/g)])
    .filter((match) => match[1] in months)
    .map((match) => Date.UTC(Number(match[2]), months[match[1]] + 1, 0))
    .filter(Number.isFinite);
  if (!dates.length) return 'Unknown release';
  return new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(Math.max(...dates)));
}

async function aggregateEntry(entry, cities) {
  // Named `child` rather than `process` so the Node global stays reachable.
  const child = spawn('unzip', ['-p', sources.projects, entry]);
  let spawnError = null;
  child.once('error', (error) => { spawnError = error; });
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let indexes;
  for await (const line of lines) {
    if (!indexes) {
      const header = parseCsv(line.replace(/^\uFEFF/, ''));
      indexes = Object.fromEntries([
        ['city', 'Service City'], ['technology', 'Technology Type'], ['capacity', 'System Size DC'], ['approved', 'App Approved Date'],
        ['utility', 'Utility'], ['sector', 'Customer Sector'], ['storage', 'Storage Capacity (kWh)']
      ].map(([field, name]) => [field, header.indexOf(name)]));
      continue;
    }
    const row = parseCsv(line);
    if (!/photovoltaic/i.test(row[indexes.technology] || '')) continue;
    const capacityKw = Number(row[indexes.capacity]);
    if (!Number.isFinite(capacityKw) || capacityKw <= 0) continue;
    const city = cities.get(key(row[indexes.city]));
    if (!city) continue;
    const sector = sectorKey(row[indexes.sector]);
    const storageKwh = Number(row[indexes.storage]) || 0;
    city.capacityKw += capacityKw;
    city.projects += 1;
    city.utilities.add(row[indexes.utility] || 'Unknown');
    city.sectors[sector].kw += capacityKw;
    city.sectors[sector].projects += 1;
    if (storageKwh > 0) { city.storageProjects += 1; city.storageKwh += storageKwh; }
    const match = (row[indexes.approved] || '').match(/(19|20)\d{2}/);
    const year = match ? Number(match[0]) : currentYear;
    const annual = city.byYear.get(year) || { kw: 0, projects: 0 };
    annual.kw += capacityKw;
    annual.projects += 1;
    city.byYear.set(year, annual);
  }
  const status = await new Promise((done) => child.on('close', done));
  if (spawnError) throw new Error(`Could not run unzip for ${entry}: ${spawnError.message}`);
  if (status !== 0) throw new Error(`Could not read ${entry}`);
}

const cities = officialCities();
addGazetteer(cities);
addPopulation(cities);
addClimateZones(cities);
const uniqueCities = new Map([...cities.values()].map((city) => [city.geoid || city.name, city]));
const entries = await zipEntries();
if (!dataThrough) dataThrough = inferDataThrough(entries);
for (const entry of entries) {
  process.stdout.write(`Aggregating ${entry}\n`);
  await aggregateEntry(entry, cities);
}

const municipalKeys = new Set(coverageRegistry.partialCities.map(key));

// Coverage is a property of the wires, not of the retail generation provider.
// A city served by a community choice aggregator still sits on the incumbent
// investor-owned distribution system, so its projects are fully reported here;
// only a publicly owned utility that owns its own wires creates a gap.
function buildCoverage(city) {
  const cityKey = key(city.name);
  if (!municipalKeys.has(cityKey)) {
    return {
      status: city.projects ? 'reported' : 'unverified',
      note: city.projects ? coverageRegistry.defaultReportedNote : coverageRegistry.defaultUnverifiedNote
    };
  }
  const coverage = { status: 'partial', note: coverageRegistry.notes[cityKey] || coverageRegistry.defaultPartialNote };
  const utilityCode = coverageRegistry.wiresUtility?.[cityKey];
  const utility = utilityCode ? coverageRegistry.utilities?.[utilityCode] : null;
  if (utility) {
    coverage.wiresUtility = utilityCode;
    coverage.excludedUtility = { name: utility.name, kind: utility.kind, hostingCapacityUrl: utility.hostingCapacityUrl };
  }
  const bound = coverageRegistry.independentBounds?.[cityKey];
  // Refuse an unsourced bound outright rather than publishing a bare number.
  if (bound && Number.isFinite(bound.capacityMw) && bound.sourceUrl && bound.sourceName && bound.scope) coverage.bound = bound;
  else if (bound) throw new Error(`independentBounds.${cityKey} needs capacityMw, scope, sourceName, and sourceUrl`);
  return coverage;
}
const records = [...uniqueCities.values()].map((city) => {
  let cumulativeKw = 0;
  let effectiveKw = 0;
  const timeline = [];
  for (let year = timelineStartYear; year <= currentYear; year += 1) {
    const annual = city.byYear.get(year) || { kw: 0, projects: 0 };
    cumulativeKw += annual.kw;
    effectiveKw += annual.kw * (0.995 ** Math.max(0, currentYear - year));
    timeline.push({ year, mw: Number((cumulativeKw / 1000).toFixed(3)), addedMw: Number((annual.kw / 1000).toFixed(3)), projects: annual.projects });
  }
  const capacityMw = Number((city.capacityKw / 1000).toFixed(3));
  const climateZone = city.climateZone || null;
  const yieldRange = climateYields[climateZone] || [1400, 1550];
  const generationGwh = {
    low: Number((effectiveKw * yieldRange[0] / 1_000_000).toFixed(1)),
    high: Number((effectiveKw * yieldRange[1] / 1_000_000).toFixed(1))
  };
  const population = city.population || null;
  const fiveYearsAgo = timeline.find((point) => point.year === currentYear - 5)?.mw || 0;
  const growth5yPct = fiveYearsAgo > 0 ? Number(((capacityMw / fiveYearsAgo - 1) * 100).toFixed(1)) : null;
  const sectors = Object.fromEntries(Object.entries(city.sectors).map(([name, value]) => [name, { mw: Number((value.kw / 1000).toFixed(3)), projects: value.projects }]));
  const record = {
    name: city.name,
    county: city.county,
    geoid: city.geoid,
    coordinates: city.coordinates || null,
    population,
    populationYear: population ? populationYear : null,
    capacityMw,
    effectiveCapacityMw: Number((effectiveKw / 1000).toFixed(3)),
    degradationRatePct: 0.5,
    climateZone,
    yieldRange,
    generationGwh,
    wattsPerPerson: population ? Number((capacityMw * 1_000_000 / population).toFixed(1)) : null,
    projects: city.projects,
    averageSystemKw: city.projects ? Number((city.capacityKw / city.projects).toFixed(1)) : 0,
    storageProjects: city.storageProjects,
    storageMwh: Number((city.storageKwh / 1000).toFixed(2)),
    growth5yPct,
    utilities: [...city.utilities].sort(),
    sectors,
    timeline,
    timelineQuality: 'approval-date proxy',
    coverage: buildCoverage(city)
  };
  if (loadRegistry[key(city.name)]) record.load = loadRegistry[key(city.name)];
  return record;
}).sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  meta: {
    schemaVersion: 2,
    cityCount: records.length,
    timelineStartYear,
    timelineEndYear: currentYear,
    populationYear,
    totalCapacityMw: Number(records.reduce((sum, city) => sum + city.capacityMw, 0).toFixed(3)),
    populationCoverage: records.filter((city) => city.population).length,
    coordinateCoverage: records.filter((city) => city.coordinates).length,
    dataThrough,
    generatedAt: new Date().toISOString(),
    capacityBasis: 'PTC kW-DC',
    generationYield: { method: 'CEC climate-zone fleet bands', low: 1250, high: 1750, degradationPctPerYear: 0.5, unit: 'kWh/kW-DC-year' },
    sources: [
      { name: 'California Distributed Generation Statistics', role: 'Interconnected project sites', url: 'https://www.californiadgstats.ca.gov/downloads/' },
      { name: 'California Department of Finance E-1', role: `${populationYear} city population estimates`, url: 'https://dof.ca.gov/forecasting/demographics/estimates-e1/' },
      { name: 'U.S. Census Gazetteer', role: 'City representative coordinates', url: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2024.html' },
      { name: 'California Energy Commission', role: 'Building climate-zone polygons', url: 'https://www.energy.ca.gov/files/building-climate-zones-map' }
    ]
  },
  cities: records
};

mkdirSync(resolve(projectRoot, 'public/data'), { recursive: true });
writeFileSync(output, `${JSON.stringify(payload)}\n`);
process.stdout.write(`Wrote ${records.length} cities to ${output}\n`);
