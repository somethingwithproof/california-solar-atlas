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

function decodeXml(value = '') {
  return value.replace(/<[^>]+>/g, '').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&#39;', "'").replaceAll('&quot;', '"');
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
  if (quoted) throw new Error('CSV row contains an unterminated quoted field; embedded newlines are not supported');
  values.push(value);
  return values;
}

function requireHeaders(header, names, sourceName) {
  const missing = names.filter((name) => !header.includes(name));
  if (missing.length) throw new Error(`${sourceName}: missing required columns: ${missing.join(', ')}`);
  return Object.fromEntries(names.map((name) => [name, header.indexOf(name)]));
}

function key(value = '') {
  return value.toUpperCase().replace(/^CITY OF /, '').replace(/^TOWN OF /, '').replace(/[^A-Z0-9]/g, '');
}

function officialCities() {
  const lines = readFileSync(sources.cities, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const header = parseCsv(lines.shift());
  const indexes = requireHeaders(header, ['CDTFA_CITY', 'CDTFA_COUNTY', 'CENSUS_GEOID'], 'California city identifiers');
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
  const indexes = requireHeaders(header, ['GEOID', 'INTPTLAT', 'INTPTLONG'], 'Census Gazetteer');
  const byGeoid = new Map([...new Set(cities.values())].map((city) => [city.geoid, city]));
  for (const line of rows) {
    const row = line.split(/\t/).map((value) => value.trim());
    const city = byGeoid.get(row[indexes.GEOID]);
    if (city) city.coordinates = [Number(row[indexes.INTPTLONG]), Number(row[indexes.INTPTLAT])];
  }
}

function addPopulation(cities) {
  const stringsXml = execFileSync('unzip', ['-p', sources.population, 'xl/sharedStrings.xml'], { encoding: 'utf8', maxBuffer: 20_000_000 });
  const strings = (stringsXml.match(/<si[\s>][\s\S]*?<\/si>/g) || []).map(decodeXml);
  const sheet = execFileSync('unzip', ['-p', sources.population, 'xl/worksheets/sheet2.xml'], { encoding: 'utf8', maxBuffer: 20_000_000 });
  const rows = sheet.match(/<row[\s>][\s\S]*?<\/row>/g) || [];
  const countyKeys = new Set([...new Set(cities.values())].map((city) => key(city.county)));
  let currentCounty = '';
  for (const xml of rows) {
    const values = {};
    for (const cell of xml.match(/<c[\s>][\s\S]*?<\/c>/g) || []) {
      const column = cell.match(/ r="([A-Z]+)\d+"/)?.[1];
      const raw = cell.match(/<v>(.*?)<\/v>/)?.[1];
      values[column] = cell.includes(' t="s"') ? strings[Number(raw)] : raw;
    }
    const nameKey = key(values.A);
    if (!nameKey || nameKey === 'CALIFORNIA' || nameKey === 'STATECOUNTYCITY') continue;
    if (countyKeys.has(nameKey) && nameKey !== currentCounty) { currentCounty = nameKey; continue; }
    const city = cities.get(nameKey);
    if (city && key(city.county) === currentCounty && Number(values.C) > 0) city.population = Number(values.C);
  }
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
  const dates = entries.flatMap((entry) => [...entry.matchAll(/-([A-Z][a-z]{2})(20\d{2})/g)].map((match) => new Date(Date.UTC(Number(match[2]), months[match[1]] + 1, 0))));
  const latest = new Date(Math.max(...dates.map(Number)));
  return Number.isFinite(Number(latest)) ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(latest) : 'Unknown release';
}

async function aggregateEntry(entry, cities) {
  const process = spawn('unzip', ['-p', sources.projects, entry]);
  const lines = createInterface({ input: process.stdout, crlfDelay: Infinity });
  let indexes;
  for await (const line of lines) {
    if (!indexes) {
      const header = parseCsv(line.replace(/^\uFEFF/, ''));
      const fields = [
        ['city', 'Service City'], ['technology', 'Technology Type'], ['capacity', 'System Size DC'], ['approved', 'App Approved Date'],
        ['utility', 'Utility'], ['sector', 'Customer Sector'], ['storage', 'Storage Capacity (kWh)']
      ];
      requireHeaders(header, fields.map(([, name]) => name), entry);
      indexes = Object.fromEntries(fields.map(([field, name]) => [field, header.indexOf(name)]));
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
    if (storageKwh > 0) city.storageProjects += 1;
    const match = (row[indexes.approved] || '').match(/(19|20)\d{2}/);
    const parsedYear = match ? Number(match[0]) : currentYear;
    const year = Math.max(2001, Math.min(currentYear, parsedYear));
    const annual = city.byYear.get(year) || { kw: 0, projects: 0 };
    annual.kw += capacityKw;
    annual.projects += 1;
    city.byYear.set(year, annual);
  }
  const status = await new Promise((done) => process.on('close', done));
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
const records = [...uniqueCities.values()].map((city) => {
  let cumulativeKw = 0;
  let effectiveKw = 0;
  const timeline = [];
  for (let year = 2001; year <= currentYear; year += 1) {
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
    populationYear: population ? 2026 : null,
    capacityMw,
    effectiveCapacityMw: Number((effectiveKw / 1000).toFixed(3)),
    degradationRatePct: 0.5,
    climateZone,
    yieldRange,
    generationGwh,
    projects: city.projects,
    averageSystemKw: city.projects ? Number((city.capacityKw / city.projects).toFixed(1)) : 0,
    storageProjects: city.storageProjects,
    storageCapacityStatus: 'withheld-source-units-inconsistent',
    growth5yPct,
    utilities: [...city.utilities].sort(),
    sectors,
    timeline,
    timelineQuality: 'approval-date proxy',
    coverage: municipalKeys.has(key(city.name))
      ? { status: 'partial', note: coverageRegistry.notes[key(city.name)] || coverageRegistry.defaultPartialNote }
      : { status: city.projects ? 'reported' : 'unverified', note: city.projects ? coverageRegistry.defaultReportedNote : coverageRegistry.defaultUnverifiedNote }
  };
  if (loadRegistry[key(city.name)]) record.load = loadRegistry[key(city.name)];
  return record;
}).sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  meta: {
    schemaVersion: 3,
    cityCount: records.length,
    totalCapacityMw: Number(records.reduce((sum, city) => sum + city.capacityMw, 0).toFixed(3)),
    populationCoverage: records.filter((city) => city.population).length,
    coordinateCoverage: records.filter((city) => city.coordinates).length,
    dataThrough,
    generatedAt: new Date().toISOString(),
    capacityBasis: 'System Size DC (kW), positive values only',
    storageCapacityStatus: 'withheld-source-units-inconsistent',
    generationYield: { method: 'CEC climate-zone fleet bands', low: 1250, high: 1750, degradationPctPerYear: 0.5, unit: 'kWh/kW-DC-year' },
    sources: [
      { name: 'California Distributed Generation Statistics', role: 'Interconnected project sites', url: 'https://www.californiadgstats.ca.gov/downloads/' },
      { name: 'California Department of Finance E-1', role: '2026 city population estimates', url: 'https://dof.ca.gov/forecasting/demographics/estimates-e1/' },
      { name: 'U.S. Census Gazetteer', role: 'City representative coordinates', url: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2024.html' },
      { name: 'California Energy Commission', role: 'Building climate-zone polygons', url: 'https://www.energy.ca.gov/files/building-climate-zones-map' }
    ]
  },
  cities: records
};

mkdirSync(resolve(projectRoot, 'public/data'), { recursive: true });
writeFileSync(output, `${JSON.stringify(payload)}\n`);
process.stdout.write(`Wrote ${records.length} cities to ${output}\n`);
