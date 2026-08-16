#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import proj4 from 'proj4';

const projectRoot = resolve(import.meta.dirname, '..');
const input = resolve(process.env.CA_CITY_GEOJSON || '/tmp/ca-city-boundaries.geojson');
const output = resolve(projectRoot, 'public/data/boundaries.json');
const source = JSON.parse(readFileSync(input, 'utf8'));
const sourceCrs = source.crs?.properties?.name || 'EPSG:4326';
proj4.defs('EPSG:3310', '+proj=aea +lat_0=0 +lon_0=-120 +lat_1=34 +lat_2=40.5 +x_0=0 +y_0=-4000000 +datum=NAD83 +units=m +no_defs');

function distanceToSegment(point, start, end) {
  const dx = end[0] - start[0]; const dy = end[1] - start[1];
  if (dx === 0 && dy === 0) return Math.hypot(point[0] - start[0], point[1] - start[1]);
  const amount = Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point[0] - (start[0] + amount * dx), point[1] - (start[1] + amount * dy));
}

function simplify(points, tolerance = .03) {
  if (points.length <= 4) return points;
  let maxDistance = 0; let split = 0;
  for (let index = 1; index < points.length - 1; index += 1) {
    const distance = distanceToSegment(points[index], points[0], points.at(-1));
    if (distance > maxDistance) { maxDistance = distance; split = index; }
  }
  if (maxDistance <= tolerance) return [points[0], points.at(-1)];
  return [...simplify(points.slice(0, split + 1), tolerance).slice(0, -1), ...simplify(points.slice(split), tolerance)];
}

function simplifyRing(ring) {
  if (ring.length > 48) {
    const step = Math.ceil((ring.length - 1) / 36);
    const sampled = ring.filter((_, index) => index % step === 0);
    if (sampled.at(-1) !== ring.at(-1)) sampled.push(ring.at(-1));
    ring = sampled;
  }
  const open = ring.slice(0, -1);
  if (open.length <= 4) return ring;
  let split = 1; let distance = 0;
  for (let index = 1; index < open.length; index += 1) {
    const candidate = Math.hypot(open[index][0] - open[0][0], open[index][1] - open[0][1]);
    if (candidate > distance) { distance = candidate; split = index; }
  }
  const first = simplify(open.slice(0, split + 1));
  const second = simplify([...open.slice(split), open[0]]);
  return [...first.slice(0, -1), ...second];
}

function project(coordinate) {
  const [longitude, latitude] = sourceCrs.includes('3310') ? proj4('EPSG:3310', 'EPSG:4326', coordinate) : coordinate;
  return [(longitude + 125) / 11 * 520, (42.2 - latitude) / 10.2 * 650];
}
function ringPath(ring) {
  const points = simplifyRing(ring).map(project);
  if (points.length < 3) return '';
  return `${points.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')}Z`;
}

const grouped = new Map();
for (const feature of source.features) {
  const geoid = feature.properties.CENSUS_GEOID;
  if (!geoid) continue;
  const polygons = feature.geometry.type === 'Polygon' ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  const path = polygons.flatMap((polygon) => polygon.map(ringPath)).join('');
  if (path) grouped.set(geoid, `${grouped.get(geoid) || ''}${path}`);
}

mkdirSync(resolve(projectRoot, 'public/data'), { recursive: true });
writeFileSync(output, `${JSON.stringify(Object.fromEntries(grouped))}\n`);
process.stdout.write(`Wrote ${grouped.size} simplified city boundaries to ${output}\n`);
