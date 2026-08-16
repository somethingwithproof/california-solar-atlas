#!/usr/bin/env node
import { createReadStream, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolve } from 'node:path';

const projectRoot = resolve(import.meta.dirname, '..');
const cityCsv = resolve(process.env.CA_CITY_CSV || '/tmp/ca-cities.csv');
const projectZip = resolve(process.env.CA_DG_ZIP || '/tmp/ca-dg-projects.zip');
const output = resolve(projectRoot, 'public/data/cities.json');
const dataThrough = process.env.DATA_THROUGH || 'May 31, 2026';

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
  const lines = readFileSync(cityCsv, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/);
  const header = parseCsv(lines.shift());
  const cityIndex = header.indexOf('CDTFA_CITY');
  const countyIndex = header.indexOf('CDTFA_COUNTY');
  const geoidIndex = header.indexOf('CENSUS_GEOID');
  const cities = new Map();
  for (const line of lines) {
    const row = parseCsv(line);
    const name = row[cityIndex]?.trim();
    if (!name) continue;
    const id = key(name);
    if (!cities.has(id)) cities.set(id, {
      name,
      county: (row[countyIndex] || '').replace(/ County$/, ''),
      geoid: row[geoidIndex] || null,
      capacityKw: 0,
      projects: 0,
      byYear: new Map()
    });
  }
  // Utility reporting commonly uses the legal name “Angels Camp.”
  if (cities.has('ANGELS')) cities.set('ANGELSCAMP', cities.get('ANGELS'));
  return cities;
}

async function zipEntries() {
  const process = spawn('unzip', ['-Z1', projectZip]);
  let text = '';
  for await (const chunk of process.stdout) text += chunk;
  const status = await new Promise((done) => process.on('close', done));
  if (status !== 0) throw new Error(`Could not list ${projectZip}`);
  return text.trim().split(/\r?\n/).filter((name) => name.endsWith('.csv'));
}

async function aggregateEntry(entry, cities) {
  const process = spawn('unzip', ['-p', projectZip, entry]);
  const lines = createInterface({ input: process.stdout, crlfDelay: Infinity });
  let indexes;
  for await (const line of lines) {
    if (!indexes) {
      const header = parseCsv(line.replace(/^\uFEFF/, ''));
      indexes = {
        city: header.indexOf('Service City'),
        technology: header.indexOf('Technology Type'),
        capacity: header.indexOf('System Size DC'),
        approved: header.indexOf('App Approved Date')
      };
      continue;
    }
    const row = parseCsv(line);
    if (!/photovoltaic/i.test(row[indexes.technology] || '')) continue;
    const capacityKw = Number(row[indexes.capacity]);
    if (!Number.isFinite(capacityKw) || capacityKw <= 0) continue;
    const city = cities.get(key(row[indexes.city]));
    if (!city) continue;
    city.capacityKw += capacityKw;
    city.projects += 1;
    const match = (row[indexes.approved] || '').match(/(19|20)\d{2}/);
    const year = match ? Number(match[0]) : 2026;
    city.byYear.set(year, (city.byYear.get(year) || 0) + capacityKw);
  }
  const status = await new Promise((done) => process.on('close', done));
  if (status !== 0) throw new Error(`Could not read ${entry}`);
}

const cities = officialCities();
const uniqueCities = new Map([...cities.values()].map((city) => [city.geoid || city.name, city]));
for (const entry of await zipEntries()) {
  process.stdout.write(`Aggregating ${entry}\n`);
  await aggregateEntry(entry, cities);
}

const records = [...uniqueCities.values()].map((city) => {
  let cumulativeKw = 0;
  const firstYear = Math.min(...city.byYear.keys(), 2010);
  const timeline = [];
  for (let year = Math.max(2001, firstYear); year <= 2026; year += 1) {
    cumulativeKw += city.byYear.get(year) || 0;
    timeline.push({ year, mw: Number((cumulativeKw / 1000).toFixed(3)) });
  }
  const record = {
    name: city.name,
    county: city.county,
    geoid: city.geoid,
    capacityMw: Number((city.capacityKw / 1000).toFixed(3)),
    projects: city.projects,
    timeline
  };
  if (city.name === 'Pleasanton') {
    record.load = { kind: 'modeled', year: '2026', deliveriesGwh: 543, note: '2017 municipal baseline adjusted for load growth' };
  }
  return record;
}).sort((a, b) => a.name.localeCompare(b.name));

const payload = {
  meta: {
    cityCount: records.length,
    totalCapacityMw: Number(records.reduce((sum, city) => sum + city.capacityMw, 0).toFixed(3)),
    dataThrough,
    generatedAt: new Date().toISOString(),
    capacityBasis: 'PTC kW-DC',
    sourceUrl: 'https://www.californiadgstats.ca.gov/downloads/'
  },
  cities: records
};

mkdirSync(resolve(projectRoot, 'public/data'), { recursive: true });
writeFileSync(output, `${JSON.stringify(payload)}\n`);
process.stdout.write(`Wrote ${records.length} cities to ${output}\n`);
