#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';
import { pouByCity, applyPouCapacity } from './pou-attribution.mjs';

const projectRoot = resolve(import.meta.dirname, '..');
const unzipCommand = '/usr/bin/unzip';
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
const cecCountyBenchmark = JSON.parse(readFileSync(resolve(projectRoot, 'data/cec-county-solar-2024.json'), 'utf8'));
const pouInputs = JSON.parse(readFileSync(resolve(projectRoot, 'data/pou-inputs.json'), 'utf8'));
const pouAttribution = JSON.parse(readFileSync(resolve(projectRoot, 'data/pou-attribution.json'), 'utf8'));
let dataThrough = process.env.DATA_THROUGH || '';
const currentYear = Number(process.env.DATA_YEAR || 2026);
const countyNames = new Map();

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
  return value.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase().replace(/^(CITY|TOWN) OF /, '').replace(/[^A-Z0-9]/g, '');
}

const cityAliases = new Map([
  ['AMADOR', 'AMADORCITY'], ['ANGELSCITY', 'ANGELS'], ['CALIFORNIACITY', 'CALIFORNIA'],
  ['ELPASODEROBLESPASOROBLES', 'PASOROBLES'], ['SANBUENAVENTURAVENTURA', 'VENTURA']
]);
const cityKey = (value = '') => cityAliases.get(key(value)) || key(value);

function officialCities() {
  const lines = readFileSync(sources.cities, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const header = parseCsv(lines.shift());
  const indexes = requireHeaders(header, ['CDTFA_COPRI', 'CDTFA_CITY', 'CDTFA_COUNTY', 'CENSUS_GEOID'], 'California city identifiers');
  const cities = new Map();
  for (const line of lines) {
    const row = parseCsv(line);
    const name = row[indexes.CDTFA_CITY]?.trim();
    if (!name) continue;
    const cdtfaCode = row[indexes.CDTFA_COPRI]?.trim();
    const geoid = row[indexes.CENSUS_GEOID]?.trim() || null;
    if (!cdtfaCode) throw new Error(`${name}: missing CDTFA city identifier`);
    if (geoid && !/^06\d{5}$/.test(geoid)) throw new Error(`${name}: invalid California place GEOID`);
    const id = key(name);
    const displayName = ({ ANGELS: 'Angels Camp', CALIFORNIA: 'California City' })[id] || name;
    if (!cities.has(id)) cities.set(id, {
      id: geoid || `cdtfa-${cdtfaCode}`,
      name: displayName,
      county: (row[indexes.CDTFA_COUNTY] || '').replace(/ County$/, ''),
      geoid,
      capacityKw: 0,
      projects: 0,
      storageProjects: 0,
      storageInvalidValues: 0,
      undatedKw: 0,
      undatedProjects: 0,
      utilities: new Set(),
      byYear: new Map(),
      sectors: { residential: { kw: 0, projects: 0 }, commercial: { kw: 0, projects: 0 }, agricultural: { kw: 0, projects: 0 }, public: { kw: 0, projects: 0 }, other: { kw: 0, projects: 0 } }
    });
  }
  if (cities.has('ANGELS')) cities.set('ANGELSCAMP', cities.get('ANGELS'));
  if (cities.has('CALIFORNIA')) cities.set('CALIFORNIACITY', cities.get('CALIFORNIA'));
  return cities;
}

function addGazetteer(cities) {
  const rows = readFileSync(sources.gazetteer, 'utf8').trim().split(/\r?\n/);
  const header = rows.shift().trim().split(/\t/).map((value) => value.trim());
  const indexes = requireHeaders(header, ['GEOID', 'INTPTLAT', 'INTPTLONG'], 'Census Gazetteer');
  const byGeoid = new Map([...new Set(cities.values())].filter((city) => city.geoid).map((city) => [city.geoid, city]));
  for (const line of rows) {
    const row = line.split(/\t/).map((value) => value.trim());
    const city = byGeoid.get(row[indexes.GEOID]);
    if (!city) continue;
    const longitude = Number(row[indexes.INTPTLONG]);
    const latitude = Number(row[indexes.INTPTLAT]);
    if (!Number.isFinite(longitude) || !Number.isFinite(latitude) || longitude < -125 || longitude > -113 || latitude < 32 || latitude > 43) throw new Error(`${city.name}: invalid or out-of-state Gazetteer coordinate`);
    city.coordinates = [longitude, latitude];
  }
}

function addPopulation(cities) {
  const stringsXml = execFileSync(unzipCommand, ['-p', sources.population, 'xl/sharedStrings.xml'], { encoding: 'utf8', maxBuffer: 20_000_000 });
  const strings = (stringsXml.match(/<si[\s>][\s\S]*?<\/si>/g) || []).map(decodeXml);
  const countyKeys = new Set([...new Set(cities.values())].map((city) => key(city.county)));
  const addSheetValues = (sheetPath, property) => {
    const sheet = execFileSync(unzipCommand, ['-p', sources.population, sheetPath], { encoding: 'utf8', maxBuffer: 20_000_000 });
    const rows = sheet.match(/<row[\s>][\s\S]*?<\/row>/g) || [];
    let currentCounty = '';
    let titleVerified = false;
    let columnVerified = false;
    for (const xml of rows) {
      const values = {};
      for (const cell of xml.match(/<c[\s>][\s\S]*?<\/c>/g) || []) {
        const column = cell.match(/ r="([A-Z]+)\d+"/)?.[1];
        const raw = cell.match(/<v>(.*?)<\/v>/)?.[1];
        values[column] = cell.includes(' t="s"') ? strings[Number(raw)] : raw;
      }
      const nameKey = key(values.A);
      if (String(values.A || '').startsWith(property === 'housingUnits' ? 'E-1H:' : 'E-1:')) titleVerified = true;
      if (nameKey === 'STATECOUNTYCITY') {
        if (!String(values.C || '').includes('1/1/2026')) throw new Error(`${sheetPath}: expected 2026 value in column C`);
        columnVerified = true;
        continue;
      }
      if (!nameKey || nameKey === 'CALIFORNIA') continue;
      const city = cities.get(cityKey(values.A));
      if (city && (key(city.county) === currentCounty || key(city.county) === nameKey)) {
        if (key(city.county) === nameKey) currentCounty = nameKey;
        if (Number(values.C) > 0) city[property] = Number(values.C);
        continue;
      }
      if (countyKeys.has(nameKey) && nameKey !== currentCounty) { currentCounty = nameKey; countyNames.set(nameKey, values.A); continue; }
    }
    if (!titleVerified || !columnVerified) throw new Error(`${sheetPath}: workbook title or column layout changed`);
  };
  addSheetValues('xl/worksheets/sheet2.xml', 'population');
  addSheetValues('xl/worksheets/sheet4.xml', 'housingUnits');
  const countySheet = execFileSync(unzipCommand, ['-p', sources.population, 'xl/worksheets/sheet3.xml'], { encoding: 'utf8', maxBuffer: 20_000_000 });
  let readingCounties = false;
  for (const xml of countySheet.match(/<row[\s>][\s\S]*?<\/row>/g) || []) {
    const cell = (xml.match(/<c[\s>][\s\S]*?<\/c>/g) || []).find((value) => / r="A\d+"/.test(value));
    const raw = cell?.match(/<v>(.*?)<\/v>/)?.[1];
    const name = cell?.includes(' t="s"') ? strings[Number(raw)] : raw;
    if (name === 'Alameda') readingCounties = true;
    if (readingCounties && name) countyNames.set(key(name), name);
    if (name === 'Yuba') break;
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
    if (!city.coordinates && key(city.name) === 'MOUNTAINHOUSE') {
      city.climateZone = 12;
      city.climateZoneMethod = 'reviewed-override';
      continue;
    }
    if (!city.coordinates) { city.climateZone = null; city.climateZoneMethod = 'unassigned'; continue; }
    const feature = zones.find(({ geometry }) => {
      const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
      return polygons.some((polygon) => pointInPolygon(city.coordinates, polygon));
    });
    if (feature) {
      city.climateZone = Number(feature.properties.BZone);
      city.climateZoneMethod = 'representative-point';
      continue;
    }
    let nearest = null;
    for (const candidate of zones) {
      const polygons = candidate.geometry.type === 'Polygon' ? [candidate.geometry.coordinates] : candidate.geometry.coordinates;
      for (const polygon of polygons) {
        for (const [longitude, latitude] of polygon[0]) {
          const distance = (longitude - city.coordinates[0]) ** 2 + (latitude - city.coordinates[1]) ** 2;
          if (!nearest || distance < nearest.distance) nearest = { distance, zone: Number(candidate.properties.BZone) };
        }
      }
    }
    city.climateZone = nearest?.zone || null;
    city.climateZoneMethod = nearest ? 'nearest-polygon' : 'unassigned';
  }
}

// Fleet-average DC yields by CEC climate zone. These deliberately span mixed
// orientations and shading rather than representing an optimally tilted array.
const statewideYield = [1250, 1750];
const climateYields = {
  1: [1250, 1350], 2: [1350, 1450], 3: [1350, 1450], 4: [1400, 1500],
  5: [1400, 1500], 6: [1450, 1550], 7: [1500, 1600], 8: [1500, 1600],
  9: [1500, 1600], 10: [1550, 1650], 11: [1450, 1550], 12: [1450, 1550],
  13: [1550, 1650], 14: [1600, 1700], 15: [1650, 1750], 16: [1400, 1500]
};

function sectorKey(value = '') {
  if (/residential/i.test(value)) return 'residential';
  if (/agricultural/i.test(value)) return 'agricultural';
  if (/commercial|industrial/i.test(value)) return 'commercial';
  if (/government|non-profit|school|public/i.test(value)) return 'public';
  return 'other';
}

function emptyAggregate(name = '') {
  return {
    name, capacityKw: 0, projects: 0, storageProjects: 0, storageInvalidValues: 0,
    undatedKw: 0, undatedProjects: 0, utilities: new Set(), byYear: new Map(),
    sectors: { residential: { kw: 0, projects: 0 }, commercial: { kw: 0, projects: 0 }, agricultural: { kw: 0, projects: 0 }, public: { kw: 0, projects: 0 }, other: { kw: 0, projects: 0 } }
  };
}

function addProject(target, { capacityKw, sector, storageRaw, utility, year }) {
  const parsedStorageKwh = storageRaw ? Number(storageRaw) : 0;
  const storageIsValid = Number.isFinite(parsedStorageKwh) && parsedStorageKwh >= 0;
  if (!storageIsValid) target.storageInvalidValues += 1;
  target.capacityKw += capacityKw;
  target.projects += 1;
  target.utilities.add(utility || 'Unknown');
  target.sectors[sector].kw += capacityKw;
  target.sectors[sector].projects += 1;
  if (storageIsValid && parsedStorageKwh > 0) target.storageProjects += 1;
  if (year == null) {
    target.undatedKw += capacityKw;
    target.undatedProjects += 1;
    return;
  }
  const annual = target.byYear.get(year) || { kw: 0, projects: 0 };
  annual.kw += capacityKw;
  annual.projects += 1;
  target.byYear.set(year, annual);
}

async function zipEntries() {
  const text = execFileSync(unzipCommand, ['-Z1', sources.projects], { encoding: 'utf8' });
  return text.trim().split(/\r?\n/).filter((name) => name.endsWith('.csv'));
}

function inferDataThrough(entries) {
  const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
  const dates = entries.flatMap((entry) => [...entry.matchAll(/-([A-Z][a-z]{2})(20\d{2})/g)].map((match) => new Date(Date.UTC(Number(match[2]), months[match[1]] + 1, 0))));
  const latest = new Date(Math.max(...dates.map(Number)));
  return Number.isFinite(Number(latest)) ? new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(latest) : 'Unknown release';
}

async function aggregateEntry(entry, cities, counties, dropped) {
  const child = spawn(unzipCommand, ['-p', sources.projects, entry]);
  const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
  let indexes;
  for await (const line of lines) {
    if (!indexes) {
      const header = parseCsv(line.replace(/^\uFEFF/, ''));
      const fields = [
        ['city', 'Service City'], ['county', 'Service County'], ['technology', 'Technology Type'], ['capacity', 'System Size DC'], ['approved', 'App Approved Date'],
        ['utility', 'Utility'], ['sector', 'Customer Sector'], ['storage', 'Storage Capacity (kWh)']
      ];
      requireHeaders(header, fields.map(([, name]) => name), entry);
      indexes = Object.fromEntries(fields.map(([field, name]) => [field, header.indexOf(name)]));
      continue;
    }
    if (!line.trim() || /^Generated \d{4}-\d{2}-\d{2}T/.test(line)) continue;
    const row = parseCsv(line);
    if (row.length <= Math.max(...Object.values(indexes))) throw new Error(`${entry}: incomplete CSV row`);
    if (!/photovoltaic/i.test(row[indexes.technology] || '')) continue;
    const capacityKw = Number(row[indexes.capacity]);
    if (!Number.isFinite(capacityKw) || capacityKw <= 0) continue;
    const sector = sectorKey(row[indexes.sector]);
    const storageRaw = (row[indexes.storage] || '').trim();
    const match = (row[indexes.approved] || '').match(/(19|20)\d{2}/);
    const parsedYear = match ? Number(match[0]) : null;
    const year = parsedYear == null || parsedYear > currentYear ? null : Math.max(2001, parsedYear);
    const project = { capacityKw, sector, storageRaw, utility: row[indexes.utility], year };
    const county = counties.get(key(row[indexes.county]));
    if (!county) {
      // Drop the row from both aggregates so county and city subtotals stay reconcilable.
      dropped.countyProjects += 1;
      dropped.countyCapacityKw += capacityKw;
      dropped.serviceCounties.add((row[indexes.county] || 'blank').trim() || 'blank');
      continue;
    }
    addProject(county, project);
    const city = cities.get(cityKey(row[indexes.city]));
    if (city) addProject(city, project);
    else {
      dropped.projects += 1;
      dropped.capacityKw += capacityKw;
      dropped.serviceCities.add((row[indexes.city] || 'blank').trim() || 'blank');
    }
  }
  const status = await new Promise((done) => child.on('close', done));
  if (status !== 0) throw new Error(`Could not read ${entry}`);
}

const cities = officialCities();
addGazetteer(cities);
addPopulation(cities);
// Separates "one bad source row" from "the DOF sheet layout moved and no county parsed".
if (countyNames.size !== 58) throw new Error(`Parsed ${countyNames.size} of 58 counties from the population workbook`);
addClimateZones(cities);
const countyAggregates = new Map([...countyNames].map(([countyKey, name]) => [countyKey, emptyAggregate(name)]));
const uniqueCities = new Map([...cities.values()].map((city) => [city.id, city]));
const entries = await zipEntries();
if (!dataThrough) dataThrough = inferDataThrough(entries);
const UNRESOLVED_COUNTY_CEILING = 0.005;
const dropped = { projects: 0, capacityKw: 0, serviceCities: new Set(), countyProjects: 0, countyCapacityKw: 0, serviceCounties: new Set() };
for (const entry of entries) {
  process.stdout.write(`Aggregating ${entry}\n`);
  await aggregateEntry(entry, cities, countyAggregates, dropped);
}

// Publicly owned utility capacity is kept in its own field rather than folded into
// capacityMw. capacityMw stays the DG Stats IOU inventory, so every county and
// statewide reconciliation keeps comparing like with like.
// NUL cannot appear in a utility or city name, so it cannot forge a composite key.
const { merged: pouMerged, excluded: pouExcluded } = pouByCity(pouInputs, pouAttribution, key);
const countedCountyKw = [...countyAggregates.values()].reduce((sum, county) => sum + county.capacityKw, 0);
const unresolvedShare = dropped.countyCapacityKw / (countedCountyKw + dropped.countyCapacityKw || 1);
if (unresolvedShare > UNRESOLVED_COUNTY_CEILING) {
  throw new Error(`Unresolved Service County rows carry ${(unresolvedShare * 100).toFixed(2)}% of capacity, above the ${(UNRESOLVED_COUNTY_CEILING * 100).toFixed(2)}% ceiling: ${[...dropped.serviceCounties].join(', ')}`);
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
  // A city the Gazetteer has not published yet (newly incorporated, usually) gets the
  // statewide band instead of failing the refresh. climateZoneMethod discloses the fallback.
  const yieldRange = climateYields[climateZone] || statewideYield;
  const undatedLowEffectiveKw = city.undatedKw * (0.995 ** Math.max(0, currentYear - 2001));
  const effectiveLowKw = effectiveKw + undatedLowEffectiveKw;
  const effectiveHighKw = effectiveKw + city.undatedKw;
  const generationGwh = {
    low: Number((effectiveLowKw * yieldRange[0] / 1_000_000).toFixed(1)),
    high: Number((effectiveHighKw * yieldRange[1] / 1_000_000).toFixed(1))
  };
  const population = city.population || null;
  const fiveYearsAgo = timeline.find((point) => point.year === currentYear - 5)?.mw || 0;
  const growth5yPct = fiveYearsAgo > 0 ? Number(((timeline.at(-1).mw / fiveYearsAgo - 1) * 100).toFixed(1)) : null;
  const sectors = Object.fromEntries(Object.entries(city.sectors).map(([name, value]) => [name, { mw: Number((value.kw / 1000).toFixed(3)), projects: value.projects }]));
  const housingUnits = city.housingUnits || null;
  const residentialSiteHousingPct = housingUnits ? Number((sectors.residential.projects / housingUnits * 100).toFixed(1)) : null;
  const geographyRisk = residentialSiteHousingPct == null ? 'unknown' : residentialSiteHousingPct > 35 ? 'likely-mailing-inflation' : 'not-flagged';
  const record = {
    name: city.name,
    county: city.county,
    id: city.id,
    geoid: city.geoid,
    coordinates: city.coordinates || null,
    population,
    populationYear: population ? 2026 : null,
    housingUnits,
    housingYear: housingUnits ? 2026 : null,
    residentialSiteHousingPct,
    geographyRisk,
    capacityMw,
    effectiveCapacityMw: Number(((effectiveLowKw + effectiveHighKw) / 2000).toFixed(3)),
    effectiveCapacityRangeMw: { low: Number((effectiveLowKw / 1000).toFixed(3)), high: Number((effectiveHighKw / 1000).toFixed(3)) },
    degradationRatePct: 0.5,
    climateZone,
    climateZoneMethod: city.climateZoneMethod,
    yieldRange,
    generationGwh,
    projects: city.projects,
    undatedProjects: city.undatedProjects,
    undatedCapacityMw: Number((city.undatedKw / 1000).toFixed(3)),
    averageSystemKw: city.projects ? Number((city.capacityKw / city.projects).toFixed(1)) : 0,
    storageProjects: city.storageProjects,
    storageInvalidValues: city.storageInvalidValues,
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
  const pou = pouMerged.get(key(city.name));
  if (pou) applyPouCapacity(record, pou, { capacityMw, effectiveLowKw, effectiveHighKw, yieldRange, currentYear });
  return record;
}).sort((a, b) => a.name.localeCompare(b.name));

const appliedUtilities = new Set(records.filter((city) => city.pouCapacity).map((city) => city.pouCapacity.utility));
if (appliedUtilities.size !== pouMerged.size) {
  const applied = new Set([...pouMerged.values()].filter((pou) => appliedUtilities.has(pou.utility)).map((pou) => pou.utility));
  const stranded = [...pouMerged.values()].map((pou) => pou.utility).filter((name) => !applied.has(name));
  throw new Error(`Municipal capacity was never applied to a city record for: ${stranded.join(', ')}`);
}

const counties = [...countyAggregates.values()].sort((a, b) => a.name.localeCompare(b.name)).map((county) => {
  const name = county.name;
  const members = records.filter((city) => key(city.county) === key(name));
  let cumulativeKw = 0;
  let effectiveKw = 0;
  const timeline = [];
  for (let year = 2001; year <= currentYear; year += 1) {
    const annual = county.byYear.get(year) || { kw: 0, projects: 0 };
    cumulativeKw += annual.kw;
    effectiveKw += annual.kw * (0.995 ** Math.max(0, currentYear - year));
    timeline.push({ year, mw: Number((cumulativeKw / 1000).toFixed(3)) });
  }
  const capacityMw = Number((county.capacityKw / 1000).toFixed(3));
  const matchedCityCapacityMw = Number(members.reduce((total, city) => total + city.capacityMw, 0).toFixed(3));
  const effectiveLowKw = effectiveKw + county.undatedKw * (0.995 ** Math.max(0, currentYear - 2001));
  const effectiveHighKw = effectiveKw + county.undatedKw;
  const cecCapacityKwAc = cecCountyBenchmark.countiesKwAc[name];
  if (!Number.isInteger(cecCapacityKwAc) || cecCapacityKwAc < 0) throw new Error(`${name}: missing CEC all-utility county benchmark`);
  return {
    name,
    slug: key(name).toLowerCase(),
    cityCount: members.length,
    capacityMw,
    matchedCityCapacityMw,
    outsideMatchedCitiesMw: Number(Math.max(0, capacityMw - matchedCityCapacityMw).toFixed(3)),
    generationGwh: {
      low: Number((effectiveLowKw * 1250 / 1_000_000).toFixed(1)),
      high: Number((effectiveHighKw * 1750 / 1_000_000).toFixed(1))
    },
    projects: county.projects,
    undatedProjects: county.undatedProjects,
    undatedCapacityMw: Number((county.undatedKw / 1000).toFixed(3)),
    storageProjects: county.storageProjects,
    allUtilityBenchmark: {
      year: cecCountyBenchmark.year,
      capacityMwAc: Number((cecCapacityKwAc / 1000).toFixed(3)),
      basis: cecCountyBenchmark.basis,
      sourceUrl: cecCountyBenchmark.sourceUrl
    },
    geographyRiskCities: members.filter((city) => city.geographyRisk === 'likely-mailing-inflation').length,
    partialCities: members.filter((city) => city.coverage.status === 'partial').length,
    sectors: Object.fromEntries(Object.entries(county.sectors).map(([sector, value]) => [sector, { mw: Number((value.kw / 1000).toFixed(3)), projects: value.projects }])),
    timeline
  };
});

const payload = {
  meta: {
    schemaVersion: 8,
    cityCount: records.length,
    totalCapacityMw: Number(records.reduce((sum, city) => sum + city.capacityMw, 0).toFixed(3)),
    sourceCapacityMw: Number(counties.reduce((sum, county) => sum + county.capacityMw, 0).toFixed(3)),
    sourceProjects: counties.reduce((sum, county) => sum + county.projects, 0),
    allUtilityBenchmark: {
      year: cecCountyBenchmark.year,
      statewideCapacityMwAc: Number((cecCountyBenchmark.statewideKwAc / 1000).toFixed(3)),
      basis: cecCountyBenchmark.basis,
      sourceUrl: cecCountyBenchmark.sourceUrl
    },
    populationCoverage: records.filter((city) => city.population).length,
    housingCoverage: records.filter((city) => city.housingUnits).length,
    geographyRiskCities: records.filter((city) => city.geographyRisk === 'likely-mailing-inflation').length,
    geographyUnknownCities: records.filter((city) => city.geographyRisk === 'unknown').length,
    coordinateCoverage: records.filter((city) => city.coordinates).length,
    dataThrough,
    generatedAt: new Date().toISOString(),
    capacityBasis: 'System Size DC (kW), positive values only',
    storageCapacityStatus: 'withheld-source-units-inconsistent',
    storageInvalidValues: records.reduce((sum, city) => sum + city.storageInvalidValues, 0),
    unmatchedProjects: dropped.projects,
    unmatchedCapacityMw: Number((dropped.capacityKw / 1000).toFixed(3)),
    unmatchedServiceCities: dropped.serviceCities.size,
    unresolvedCountyProjects: dropped.countyProjects,
    unresolvedCountyCapacityMw: Number((dropped.countyCapacityKw / 1000).toFixed(3)),
    unresolvedServiceCounties: dropped.serviceCounties.size,
    publicUtilityCoverage: {
      year: pouInputs.netMetering.year,
      mergedCities: records.filter((city) => city.pouCapacity).length,
      mergedRangeMwDc: {
        low: Number(records.reduce((sum, city) => sum + (city.pouCapacity?.capacityRangeMwDc.low || 0), 0).toFixed(3)),
        high: Number(records.reduce((sum, city) => sum + (city.pouCapacity?.capacityRangeMwDc.high || 0), 0).toFixed(3))
      },
      unattributedUtilities: pouExcluded.length,
      unattributedReportedMw: Number(pouExcluded.reduce((sum, utility) => sum + utility.capacityMw, 0).toFixed(3)),
      basis: 'Reported net-metered capacity; AC values converted to DC across an inverter-loading-ratio band.',
      inverterLoadingRatio: pouAttribution.inverterLoadingRatio,
      mergeThresholdPct: pouAttribution.mergeThresholdPct,
      sourceName: pouInputs.netMetering.sourceName,
      sourceUrl: pouInputs.netMetering.sourceUrl,
      territorySourceName: pouInputs.territoryOverlap.sourceName,
      territorySourceUrl: pouInputs.territoryOverlap.sourceUrl
    },
    generationYield: { method: 'CEC climate-zone fleet bands', low: statewideYield[0], high: statewideYield[1], degradationPctPerYear: 0.5, unit: 'kWh/kW-DC-year' },
    sources: [
      { name: 'California Distributed Generation Statistics', role: 'Interconnected project sites', url: 'https://www.californiadgstats.ca.gov/downloads/' },
      { name: 'California Department of Finance E-1/E-1H', role: '2026 city population and housing estimates', url: 'https://dof.ca.gov/forecasting/demographics/estimates-e1/' },
      { name: 'U.S. Census Gazetteer', role: 'City representative coordinates', url: 'https://www.census.gov/geographies/reference-files/time-series/geo/gazetteer-files.2024.html' },
      { name: 'California Energy Commission', role: 'Building climate-zone polygons', url: 'https://www.energy.ca.gov/files/building-climate-zones-map' },
      { name: 'California Energy Commission CEC-1304B', role: '2024 all-utility county solar benchmark', url: cecCountyBenchmark.sourceUrl },
      { name: pouInputs.netMetering.sourceName, role: `${pouInputs.netMetering.year} municipal utility net-metered capacity`, url: pouInputs.netMetering.sourceUrl },
      { name: pouInputs.territoryOverlap.sourceName, role: 'Utility service territory polygons for city attribution', url: pouInputs.territoryOverlap.sourceUrl }
    ]
  },
  cities: records,
  counties
};

mkdirSync(resolve(projectRoot, 'public/data'), { recursive: true });
writeFileSync(output, `${JSON.stringify(payload)}\n`);
process.stdout.write(`Wrote ${records.length} cities to ${output}\n`);
