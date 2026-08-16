import './styles.css';
// Editorial reference list, not pipeline provenance. Bundled rather than published in
// cities.json so the release payload keeps describing only what produced its figures.
import referenceSources from '../data/reference-sources.json';

const DATA_URL = `${import.meta.env.BASE_URL}data/cities.json`;
const BOUNDARIES_URL = `${import.meta.env.BASE_URL}data/boundaries.json`;
const app = document.querySelector('#app');
const state = { data: null, boundaries: {}, city: null, county: null, compare: [], mapMetric: 'capacityMw', rankMetric: 'capacityMw' };
const format = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en-US');

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);
const safeUrl = (value = '') => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : '#'; } catch { return '#'; } };
const slugify = (value) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const cityUrl = (city) => { const url = new URL(location.href); url.searchParams.set('city', slugify(city.name)); url.searchParams.delete('county'); return url; };
const countyUrl = (county) => { const url = new URL(location.href); url.searchParams.set('county', county.slug); url.searchParams.delete('city'); return url; };
const uniqueCities = (cities) => [...new Map(cities.filter(Boolean).map((city) => [city.id, city])).values()];
const generationMid = (city) => (city.generationGwh.low + city.generationGwh.high) / 2;
const solarShare = (city, deliveries = city.load?.deliveriesGwh) => deliveries ? generationMid(city) / (deliveries + generationMid(city)) * 100 : null;
const coverageStatus = (city) => ['reported', 'partial', 'unverified'].includes(city.coverage?.status) ? city.coverage.status : 'unverified';
const zoneLabel = (city) => city.climateZone == null ? 'unassigned' : escapeHtml(city.climateZone);
const yieldValue = (city, index) => escapeHtml(city.yieldRange?.[index] ?? '');
const coverageCopy = { reported: 'IOU records found', partial: 'Partial utility coverage', unverified: 'Coverage unverified' };
const coverageLabel = (status) => coverageCopy[status] || 'Coverage unknown';
const coverageTerm = (status) => ({ reported: 'coverageReported', partial: 'coveragePartial', unverified: 'coverageUnverified' })[status];
// Plain-English glossary. Every phrase here is jargon a first-time reader would not
// guess; the tooltip explains it without sending them to the methodology section.
const glossary = {
  iou: 'Investor-owned utility. In California that means PG&E, Southern California Edison, and San Diego Gas & Electric. City-owned utilities like LADWP are not IOUs and report separately.',
  municipal: 'A utility owned by a city or district rather than by shareholders, such as LADWP or SMUD. They do not report to the same interconnection database as the IOUs.',
  distributed: 'Solar mounted on a roof or on the customer’s own property, feeding that building first. It excludes utility-scale solar farms, which this atlas does not cover.',
  mwdc: 'Megawatts measured at the panels, before the inverter converts the power for the grid. A DC rating runs roughly 8 to 25 percent above the matching AC rating.',
  mwac: 'Megawatts measured after the inverter, which is the power that actually reaches the grid. Lower than the DC rating for the same system.',
  gwh: 'Gigawatt-hours: the energy produced over a year, not the size of the system. A megawatt is size; a gigawatt-hour is output.',
  geographyRisk: 'The utility files record a mailing city, not a mapped location. When solar sites outnumber what the city’s housing stock can plausibly hold, the total is likely picking up addresses outside the city limits.',
  climateZone: 'One of the 16 California building climate zones. It sets how much electricity a panel produces in that location over a year.',
  approvalProxy: 'Each project is dated by when its application was approved, which normally comes months before the system actually switched on. The curve therefore leads reality slightly.',
  effectiveCapacity: 'Installed capacity after subtracting an assumed half a percent of output lost per year since installation, so older systems count for less.',
  yieldBand: 'Kilowatt-hours produced per year for each kilowatt installed. The range covers mixed roof angles and shading rather than a perfectly tilted array.',
  netMetering: 'A billing arrangement that credits a customer for solar sent back to the grid. Utilities report the total capacity enrolled in it.',
  coverageReported: 'Project records for this city were found in the PG&E, SCE, or SDG&E files.',
  coveragePartial: 'Some of this city’s solar is served by a utility that does not report to this source, so the total is a floor rather than a full count.',
  coverageUnverified: 'No project records matched this city, which may mean no solar or may mean its utility does not report here.',
  storageLinked: 'Project sites that also registered a battery. The battery’s energy capacity is withheld because the source reports it inconsistently.',
  undated: 'Projects with no readable approval year. They count toward total capacity but cannot be placed on the growth curve.',
  serviceCity: 'The city name the utility has on file for the account, which is postal geography and not the legal city boundary.'
};

const term = (label, key) => `<span class="term" tabindex="0" role="note" aria-label="${escapeHtml(label)}. ${escapeHtml(glossary[key])}">${escapeHtml(label)}<i class="tip" aria-hidden="true">${escapeHtml(glossary[key])}</i></span>`;

const metricConfig = {
  capacityMw: { label: 'Reported capacity', short: 'MW-DC', value: (city) => city.capacityMw, display: (value) => `${format.format(value)} MW` },
  generation: { label: 'Estimated generation', short: 'GWh/year', value: generationMid, display: (value) => `${format.format(value)} GWh` },
  growth5yPct: { label: 'Five-year growth', short: '5-year growth', value: (city) => city.growth5yPct, display: (value) => `${format.format(value)}%` }
};

function shell(meta) {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="California Solar Atlas home"><span class="brand-mark" aria-hidden="true"><span></span></span><span>California Solar Atlas</span></a>
      <nav aria-label="Primary"><a href="#explore">Explore</a><a href="#counties">Counties</a><a href="#map">Map</a><a href="#rankings">Rankings</a><a href="#compare">Compare</a><a href="#methodology">Methodology</a></nav>
      <div class="header-links"><a href="https://github.com/somethingwithproof/california-solar-atlas" target="_blank" rel="noreferrer" aria-label="View California Solar Atlas on GitHub"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 2.3a9.9 9.9 0 0 0-3.1 19.3c.5.1.7-.2.7-.5v-1.9c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 0 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.9.1-.6.3-1.1.6-1.4-2.3-.3-4.6-1.1-4.6-4.9 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.7 1a9.2 9.2 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.8-2.3 4.6-4.6 4.9.4.3.7 1 .7 2v3c0 .3.2.6.7.5A9.9 9.9 0 0 0 12 2.3Z"/></svg><span>GitHub</span></a><a href="https://github.com/somethingwithproof/california-solar-atlas/issues/new" target="_blank" rel="noreferrer" aria-label="Report an issue on GitHub"><svg class="issue-icon" aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7.5v6M12 17h.01"/></svg><span>Report an issue</span><b aria-hidden="true">↗</b></a></div>
      <button class="limits-button" type="button" data-action="limits"><span aria-hidden="true">?</span> Data limitations</button>
    </header>
    <main id="main">
      <section class="hero" id="explore">
        <div class="eyebrow"><span></span> Reported distributed solar across California</div>
        <h1>Distributed solar growth,<br><em>city by city.</em></h1>
        <p class="hero-copy">Search every incorporated California city. Compare reported capacity, climate-adjusted generation, growth, storage, and data confidence without filling gaps with county estimates. This atlas covers ${term('distributed solar', 'distributed')} only: rooftop and onsite systems. Utility-scale solar farms, which are roughly half of California's solar, are not counted here.</p>
        <div class="search-wrap" data-search="primary">
          <label for="city-search">Find a California city</label>
          <div class="search-control"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.15A7.5 7.5 0 1 1 4 11.5a7.5 7.5 0 0 1 15 0Z"/></svg><input id="city-search" type="search" role="combobox" aria-autocomplete="list" autocomplete="off" placeholder="Try Chula Vista, Fresno, or Eureka" aria-controls="search-results" aria-expanded="false"><kbd>⌘ K</kbd></div>
          <div id="search-results" class="search-results" role="listbox" hidden></div>
        </div>
        <div class="hero-meta"><span><strong>${integer.format(meta.cityCount)}</strong> incorporated cities</span><span><strong>${format.format(meta.totalCapacityMw / 1000)} GW</strong> distributed, matched to cities</span><span>Data through <strong>${escapeHtml(meta.dataThrough)}</strong></span></div>
      </section>
      <section id="city-view" class="city-view" aria-live="polite"></section>
      <section id="counties" class="county-section section-pad">
        <div class="section-heading"><div><div class="eyebrow"><span></span> County totals</div><h2>Explore by county.</h2></div><p>Current county totals use DG Stats' Service County field directly, so they include incorporated and unincorporated IOU service locations. A separate CEC benchmark provides older all-utility context.</p></div>
        <div class="map-toolbar"><label for="county-select">Choose a county</label><select id="county-select">${state.data.counties.map((county) => `<option value="${escapeHtml(county.slug)}">${escapeHtml(county.name)} County</option>`).join('')}</select></div>
        <div id="county-view" aria-live="polite"></div>
      </section>
      <section id="map" class="map-section section-pad">
        <div class="section-heading"><div><div class="eyebrow"><span></span> Statewide view</div><h2>See the pattern.</h2></div><p>Official incorporated-city polygons are shaded by the selected metric. Values still use utility service-city strings, so the map visualizes—but does not repair—the mailing-boundary mismatch.</p></div>
        <div class="map-toolbar"><label for="map-metric">Shade cities by</label><select id="map-metric">${metricOptions(state.mapMetric)}</select><span class="map-legend"><i></i> Lower <i></i> Higher</span></div>
        <div class="map-layout"><div id="solar-map" class="solar-map"></div><aside id="map-summary" class="map-summary"></aside></div>
      </section>
      <section id="rankings" class="rankings section-pad">
        <div class="section-heading"><div><div class="eyebrow"><span></span> Comparable measures</div><h2>City rankings.</h2></div><p>Rank reported totals and approval-date growth. Per-resident ranking is intentionally withheld because service-city capacity and legal-boundary population are incompatible geographies.</p></div>
        <div class="rank-toolbar"><label for="rank-metric">Rank by</label><select id="rank-metric">${metricOptions(state.rankMetric)}</select><label class="toggle"><input id="minimum-population" type="checkbox" checked><span></span> Population 10,000+</label><label class="toggle"><input id="exclude-geography-risk" type="checkbox" checked><span></span> Exclude geography risk or unknown</label><label class="toggle"><input id="exclude-partial" type="checkbox" checked><span></span> Exclude partial coverage</label></div>
        <div id="ranking-table" class="ranking-table"></div>
      </section>
      <section id="compare" class="compare section-pad">
        <div class="section-heading"><div><div class="eyebrow"><span></span> Side by side</div><h2>Compare cities.</h2></div><p>Add up to four cities. Every comparison keeps the same capacity basis, degradation assumption, and location-specific yield method.</p></div>
        <div class="compare-search search-wrap" data-search="compare"><label for="compare-search">Add a city</label><div class="search-control"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.15A7.5 7.5 0 1 1 4 11.5a7.5 7.5 0 0 1 15 0Z"/></svg><input id="compare-search" type="search" role="combobox" aria-autocomplete="list" autocomplete="off" placeholder="Search to add a city" aria-controls="compare-results" aria-expanded="false"><span class="compare-count">0 / 4</span></div><div id="compare-results" class="search-results" role="listbox" hidden></div></div>
        <div id="compare-view"></div>
      </section>
      <section class="method section-pad" id="methodology">
        <div><div class="eyebrow"><span></span> Transparent by design</div><h2>One result,<br>four evidence layers.</h2></div>
        <div class="method-grid">
          <article><span>01</span><h3>Reported capacity</h3><p>Positive System Size DC values from PG&amp;E, SCE, and SDG&amp;E project-site files. PTC and AC values are not substituted or mixed into the total.</p></article>
          <article><span>02</span><h3>Location-specific generation</h3><p>CEC climate-zone fleet yields span 1,250–1,750 kWh/kW-DC-year. Each vintage loses 0.5% of output per year.</p></article>
          <article><span>03</span><h3>Gross electricity use</h3><p>Shown only with a documented city load source. Modeled self-generation is restored to net grid deliveries.</p></article>
          <article><span>04</span><h3>Quality and coverage</h3><p>Mailing geography, municipal-utility gaps, and approval-date history are surfaced alongside every result.</p></article>
        </div>
        <p class="formula"><span>Solar share</span> = degradation-adjusted gross generation ÷ (grid deliveries + degradation-adjusted gross generation)</p>
      </section>
      <section class="sources section-pad"><div><div class="eyebrow"><span></span> Provenance</div><h2>Sources you can inspect.</h2></div><div>${sourceLinks(meta.sources)}<div class="sources-reference"><h3>Coverage this build does not include</h3><p>Nothing above or below this line is mixed together. These are published so the gaps are checkable; no figure on this page is derived from them.</p></div>${sourceLinks(referenceSources.sources)}</div></section>
    </main>
    <footer><div><strong>California Solar Atlas</strong><span>Open data · Open methodology · MIT licensed</span></div><div class="footer-links"><a href="https://github.com/somethingwithproof/california-solar-atlas" target="_blank" rel="noreferrer">GitHub <b aria-hidden="true">↗</b></a><a href="https://github.com/somethingwithproof/california-solar-atlas/releases" target="_blank" rel="noreferrer">Data releases <b aria-hidden="true">↗</b></a><a href="https://github.com/somethingwithproof/california-solar-atlas/issues/new" target="_blank" rel="noreferrer">Report an issue <b aria-hidden="true">↗</b></a><button type="button" data-action="limits">Data limitations</button></div></footer>
    ${limitsDialog(meta)}
    <div id="toast" class="toast" role="status" aria-live="polite"></div>`;
}

function sourceLinks(sources) {
  return sources.map((source) => `<a href="${safeUrl(source.url)}" target="_blank" rel="noreferrer"><span>${escapeHtml(source.role)}</span><strong>${escapeHtml(source.name)}</strong><b>↗</b></a>`).join('');
}

function metricOptions(selected) {
  return Object.entries(metricConfig).map(([value, config]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${config.label}</option>`).join('');
}

function limitsDialog(meta) {
  return `<dialog class="limits-dialog" aria-labelledby="limits-title"><form method="dialog"><button class="dialog-close" aria-label="Close data limitations">×</button></form><div class="eyebrow"><span></span> Data limitations</div><h2 id="limits-title">What this data can—and cannot—tell you.</h2><div class="limits-list">
    <article><b>Reported capacity is not production.</b><p>DC nameplate comes from interconnected project records. Generation uses a CEC climate-zone fleet range and 0.5% annual degradation, not production meters.</p></article>
    <article><b>Service city is mailing geography.</b><p>The May 2026 public Project Sites files contain city and ZIP but no project coordinates or street addresses. Totals cannot yet be spatially joined to municipal polygons. Cities where residential project sites exceed 35% of legal-boundary housing units are flagged as likely mailing inflation and excluded from rankings by default; this is a screening heuristic, not a corrected boundary total.</p></article>
    <article><b>County geography is source-reported.</b><p>County views aggregate the source's Service County field and include unincorporated records. Their current totals still cover only PG&amp;E, SCE, and SDG&amp;E. A separate CEC 2024 all-utility, MW-AC benchmark covers systems 1 MW and smaller; it is not additive to the newer MW-DC inventory. County generation uses only the current IOU inventory and a statewide 1,250–1,750 kWh/kW-DC yield envelope. City views omit ${integer.format(meta.unmatchedProjects)} project rows (${format.format(meta.unmatchedCapacityMw)} MW-DC) whose service-city strings do not match an incorporated city.</p></article>
    <article><b>Per-resident rankings are withheld.</b><p>Dividing service-city capacity by legal-boundary population can turn a mailing shadow into a false adoption result. Population remains descriptive only and is not used to rank cities.</p></article>
    <article><b>Utility coverage varies.</b><p>Source files cover PG&amp;E, SCE, and SDG&amp;E. LADWP, SMUD, and other public utilities are absent, so affected city totals are explicitly marked as partial lower bounds.</p></article>
    <article><b>Historical growth is a proxy.</b><p>The chart groups currently listed projects by application approval date, which generally precedes permission to operate. A superseding application can also inherit a later date, so the series is not a frozen historical inventory.</p></article>
    <article><b>Storage energy is withheld.</b><p>The source's Storage Capacity (kWh) field contains internally inconsistent scales when compared with storage kW. Linked-site counts are shown, but aggregate MWh is not published; this build also excludes ${integer.format(meta.storageInvalidValues)} negative or nonnumeric storage values.</p></article>
    <article><b>City electricity use is scarce.</b><p>A solar-share percentage appears only where a documented local load source is onboarded. County consumption is never substituted.</p></article>
    <article><b>The inventory has opposing errors.</b><p>Behind-the-fence systems can be absent while incomplete decommissioning can leave retired systems listed. Treat capacity as a reported inventory, not an audited physical census.</p></article>
  </div><p class="dialog-note">Use these results for community exploration—not billing, engineering, financial, or regulatory decisions.</p><form method="dialog"><button class="dialog-action">I understand</button></form></dialog>`;
}

function setupSearch(root, mode) {
  const input = root.querySelector('input');
  const results = root.querySelector('.search-results');
  let active = -1;
  const show = () => {
    const query = input.value.trim().toLowerCase();
    const matches = state.data.cities.filter((city) => `${city.name} ${city.county}`.toLowerCase().includes(query) && (mode !== 'compare' || !state.compare.includes(city))).slice(0, 8);
    results.innerHTML = matches.map((city, index) => `<button id="${results.id}-option-${index}" type="button" role="option" data-city-id="${escapeHtml(city.id)}" aria-selected="${index === active}"><span><strong>${escapeHtml(city.name)}</strong><small>${escapeHtml(city.county)} County · ${coverageLabel(coverageStatus(city))}</small></span><span class="result-value">${format.format(city.capacityMw)} MW</span></button>`).join('');
    results.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(matches.length > 0));
    if (active >= 0 && matches[active]) input.setAttribute('aria-activedescendant', `${results.id}-option-${active}`); else input.removeAttribute('aria-activedescendant');
  };
  input.addEventListener('input', () => { active = -1; show(); });
  input.addEventListener('focus', show);
  input.addEventListener('keydown', (event) => {
    const buttons = [...results.querySelectorAll('button')];
    if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); active = Math.max(0, Math.min(buttons.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); show(); }
    else if (event.key === 'Enter' && buttons.length) { event.preventDefault(); buttons[active < 0 ? 0 : active].click(); }
    else if (event.key === 'Escape') { active = -1; results.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
  });
  results.addEventListener('click', (event) => {
    const button = event.target.closest('[data-city-id]');
    if (!button) return;
    const city = state.data.cities.find((item) => item.id === button.dataset.cityId);
    input.value = mode === 'primary' ? city.name : '';
    results.hidden = true;
    if (mode === 'primary') selectCity(city);
    else addCompare(city);
  });
}

function generationHeadline(city) {
  const range = city.totalGenerationRangeGwh || city.generationGwh;
  const note = city.pouCapacity
    ? `${yieldValue(city, 0)}\u2013${yieldValue(city, 1)} kWh/kW \u00b7 municipal capacity has no vintage, so it is treated as undated`
    : `${yieldValue(city, 0)}\u2013${yieldValue(city, 1)} kWh/kW \u00b7 degradation applied`;
  return `<strong>${format.format(range.low)}\u2013${format.format(range.high)} <small>${term('GWh/yr', 'gwh')}</small></strong><p>${note}</p>`;
}

function capacityHeadline(city) {
  const pou = city.pouCapacity;
  if (!pou) return `<strong>${format.format(city.capacityMw)} <small>${term('MW-DC', 'mwdc')}</small></strong><p>${integer.format(city.projects)} current project sites</p>`;
  const range = city.totalCapacityRangeMwDc;
  // A DC-reported municipal figure needs no conversion, so it prints as one number.
  const value = range.low === range.high ? format.format(range.low) : `${format.format(range.low)}–${format.format(range.high)}`;
  return `<strong>${value} <small>${term('MW-DC', 'mwdc')}</small></strong><p>${format.format(city.capacityMw)} MW from IOU records plus ${format.format(pou.reportedMw)} MW-${escapeHtml(pou.basis)} from ${escapeHtml(pou.utility)}</p>`;
}

function municipalNote(city) {
  const pou = city.pouCapacity;
  if (!pou) return '';
  const converted = pou.basis === 'AC'
    ? ` Its capacity is reported in AC and converted to DC across an inverter-loading-ratio band, which is why the total is a range.`
    : ` Its capacity is already reported in DC, so no conversion is applied.`;
  const basisNote = pou.method === 'reviewed-override'
    ? `Reviewed override: ${escapeHtml(pou.reason)}`
    : `${format.format(pou.territoryInCityPct)}% of this utility's service territory lies inside the city, so its reported capacity is treated as capacity in the city.`;
  return `<div class="municipal-note"><strong>${escapeHtml(pou.utility)} is included.</strong> <span>${basisNote}${converted} Source: ${escapeHtml(pou.year)} Form EIA-861 net metering.${pou.sourceUrl ? ` <a href="${safeUrl(pou.sourceUrl)}" target="_blank" rel="noreferrer">Territory reference ↗</a>` : ''}</span></div>`;
}

function qualityBadge(city) {
  const status = coverageStatus(city);
  return `<span class="status ${status}"><i></i>${term(coverageLabel(status), coverageTerm(status))}</span>`;
}

function geographyBadge(city) {
  if (city.geographyRisk === 'likely-mailing-inflation') return `<span class="status partial"><i></i>${term('Geography risk', 'geographyRisk')}</span>`;
  if (city.geographyRisk === 'unknown') return '<span class="status unverified"><i></i>Geography unknown</span>';
  return '';
}

let chartCount = 0;

function sparkline(city) {
  const points = city.timeline;
  const width = 720, height = 180, pad = 8;
  const max = Math.max(city.capacityMw, 1);
  const coords = points.map((point, index) => [pad + index / (points.length - 1) * (width - pad * 2), height - pad - point.mw / max * (height - pad * 2)]);
  const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  // Every chart carries its own gradient so two panels never share an id and the
  // downloaded SVG resolves its own fill.
  const gradient = `sun-fill-${chartCount += 1}`;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Approval-date proxy for cumulative capacity from 2001 to 2026"><defs><linearGradient id="${gradient}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaa72c" stop-opacity=".35"/><stop offset="1" stop-color="#eaa72c" stop-opacity="0"/></linearGradient></defs><path class="area" fill="url(#${gradient})" d="${line} L${coords.at(-1)[0]},${height} L${coords[0][0]},${height} Z"/><path class="line" d="${line}"/></svg><div class="chart-axis"><span>2001</span><span>${term('Approval-date proxy', 'approvalProxy')}</span><span>2026</span></div>`;
}

function sectorRows(city) {
  const max = Math.max(...Object.values(city.sectors).map((sector) => sector.mw), 1);
  return Object.entries(city.sectors).map(([name, sector]) => `<div class="sector-row"><span>${escapeHtml(name)}</span><progress max="100" value="${sector.mw / max * 100}" aria-label="${escapeHtml(name)} share of city capacity"></progress><strong>${format.format(sector.mw)} MW</strong><small>${integer.format(sector.projects)} sites</small></div>`).join('');
}

function loadSource(city) {
  if (!city.load) return '';
  return `<span>Load source</span><p><a href="${safeUrl(city.load.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(city.load.sourceName)} ↗</a> — ${escapeHtml(city.load.note)}</p>`;
}

function storageSiteSummary(city) {
  const excluded = city.storageInvalidValues ? ` · ${integer.format(city.storageInvalidValues)} invalid source ${city.storageInvalidValues === 1 ? 'value' : 'values'} excluded` : '';
  return `${integer.format(city.storageProjects)}${excluded}`;
}

function cityCsv(city) {
  const rows = [['field', 'value'], ['city', city.name], ['county', city.county], ['capacity_basis', 'System Size DC'], ['reported_capacity_mw_dc', city.capacityMw], ['effective_capacity_low_mw_dc', city.effectiveCapacityRangeMw.low], ['effective_capacity_high_mw_dc', city.effectiveCapacityRangeMw.high], ['undated_capacity_mw_dc', city.undatedCapacityMw], ['generation_low_gwh', city.generationGwh.low], ['generation_high_gwh', city.generationGwh.high], ['climate_zone', city.climateZone], ['climate_zone_method', city.climateZoneMethod], ['yield_low_kwh_per_kw', city.yieldRange[0]], ['yield_high_kwh_per_kw', city.yieldRange[1]], ['population_descriptive_only', city.population || ''], ['housing_units', city.housingUnits || ''], ['residential_sites_per_housing_units_pct', city.residentialSiteHousingPct ?? ''], ['geography_risk', city.geographyRisk], ['projects', city.projects], ['storage_linked_projects', city.storageProjects], ['storage_capacity', 'withheld: source units inconsistent'], ['coverage', city.coverage.status], ['municipal_utility', city.pouCapacity?.utility || ''], ['municipal_reported_capacity', city.pouCapacity ? `${city.pouCapacity.reportedMw} MW-${city.pouCapacity.basis}` : ''], ['municipal_attribution_method', city.pouCapacity?.method || ''], ['total_capacity_low_mw_dc', city.totalCapacityRangeMwDc?.low ?? city.capacityMw], ['total_capacity_high_mw_dc', city.totalCapacityRangeMwDc?.high ?? city.capacityMw]];
  return rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
}

function selectCity(city, { scroll = true, historyMode = 'push' } = {}) {
  state.city = city;
  const status = coverageStatus(city);
  const share = solarShare(city);
  const shareLow = city.load ? city.generationGwh.low / (city.load.highDeliveriesGwh + city.generationGwh.low) * 100 : null;
  const shareHigh = city.load ? city.generationGwh.high / (city.load.lowDeliveriesGwh + city.generationGwh.high) * 100 : null;
  const view = document.querySelector('#city-view');
  view.innerHTML = `<div class="city-heading"><div><div class="eyebrow"><span></span>${escapeHtml(city.county)} County · ${term('CEC climate zone', 'climateZone')} ${zoneLabel(city)}</div><h2>${escapeHtml(city.name)}</h2></div><div class="city-actions">${qualityBadge(city)}${geographyBadge(city)}<button data-action="share">Share</button><button data-action="csv">Download CSV</button></div></div>
    <div class="coverage-note ${status}"><strong>${status === 'partial' ? 'Treat this capacity as a lower bound.' : 'Coverage note'}</strong><span>${escapeHtml(city.coverage.note)}</span><button data-action="limits" aria-label="Read all data limitations">?</button></div>
    ${municipalNote(city)}
    <div class="metrics four"><article><span>Reported capacity</span>${capacityHeadline(city)}</article><article><span>Climate-adjusted generation</span>${generationHeadline(city)}</article><article><span>Average reported system</span><strong>${format.format(city.averageSystemKw)} <small>kW-DC</small></strong><p>Service-city aggregate; not a household adoption rate</p></article><article><span>Share of city electricity use</span>${share == null ? '<strong class="not-available">Not available</strong><p>No verified city load denominator</p>' : `<strong>≈ ${format.format(share)}<small>%</small></strong><p>Range ${format.format(shareLow)}–${format.format(shareHigh)}% · ${city.load.kind}</p>`}</article></div>
    <div class="detail-grid"><article class="trend-panel"><div class="panel-head"><div><span>Capacity growth</span><h3>Cumulative dated MW-DC by approval date</h3></div><div class="panel-actions"><strong>${city.growth5yPct == null ? '—' : `+${format.format(city.growth5yPct)}%`} <small>5 yr</small></strong><button data-action="chart">Download SVG</button></div></div>${sparkline(city)}${city.undatedProjects ? `<p>${integer.format(city.undatedProjects)} projects (${format.format(city.undatedCapacityMw)} MW-DC) lack a parseable approval year and are excluded from this chart and growth rate.</p>` : ''}</article><aside class="read-panel"><span>Generation uncertainty</span><h3>Location and vintage now matter.</h3><div class="range-visual"><i></i><b>${format.format((city.totalGenerationRangeGwh || city.generationGwh).low)}</b><b>${format.format((city.totalGenerationRangeGwh || city.generationGwh).high)} GWh</b></div><p>Zone ${zoneLabel(city)} uses ${yieldValue(city, 0)}–${yieldValue(city, 1)} kWh/kW-DC-year. Effective capacity spans ${format.format((city.totalEffectiveCapacityRangeMw || city.effectiveCapacityRangeMw).low)}–${format.format((city.totalEffectiveCapacityRangeMw || city.effectiveCapacityRangeMw).high)} MW after degradation${city.undatedProjects ? ' and unknown-date sensitivity' : ''}. Zone assignment: ${escapeHtml(city.climateZoneMethod.replaceAll('-', ' '))}.</p></aside></div>
    <div class="attributes"><article><div class="panel-head"><div><span>Customer mix</span><h3>Capacity by sector</h3></div></div>${sectorRows(city)}</article><article><div class="panel-head"><div><span>System profile</span><h3>What is connected</h3></div></div><dl><div><dt>Average system</dt><dd>${format.format(city.averageSystemKw)} kW-DC</dd></div><div><dt>${term('Storage-linked sites', 'storageLinked')}</dt><dd>${storageSiteSummary(city)}</dd></div><div><dt>Storage energy</dt><dd>Withheld · source units inconsistent</dd></div><div><dt>Housing diagnostic</dt><dd>${city.residentialSiteHousingPct == null ? 'Unavailable' : `${format.format(city.residentialSiteHousingPct)}% residential sites / housing units`}</dd></div><div><dt>Source utilities</dt><dd>${city.utilities.length ? city.utilities.map(escapeHtml).join(', ') : 'None matched'}</dd></div></dl></article></div>
    <div class="provenance"><span>Geography</span><p>Utility service-city string (mailing geography), not a municipal polygon join.</p><span>Capacity basis</span><p>Positive System Size DC values only; PTC and CEC-AC values are not substituted or mixed into totals.</p><span>History quality</span><p>Application-approval-date proxy; PTO generally occurs later. Missing dates are kept out of the timeline and widen the generation range.</p>${loadSource(city)}</div>`;
  document.querySelector('#city-search').value = city.name;
  const url = cityUrl(city);
  if (historyMode === 'push') history.pushState({ city: city.id }, '', url);
  else if (historyMode === 'replace') history.replaceState({ city: city.id }, '', url);
  const county = state.data.counties.find((item) => item.name === city.county);
  if (county && document.querySelector('#county-select')) renderCounty(county);
  if (scroll) view.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderCounty(county, { historyMode = 'none' } = {}) {
  state.county = county;
  const select = document.querySelector('#county-select');
  if (select) select.value = county.slug;
  const members = state.data.cities.filter((city) => city.county === county.name).sort((a, b) => b.capacityMw - a.capacityMw);
  const memberRows = members.length ? members.map((city) => `<button data-city-id="${escapeHtml(city.id)}"><span>${escapeHtml(city.name)}</span><strong>${format.format(city.capacityMw)} MW-DC</strong>${geographyBadge(city) || qualityBadge(city)}</button>`).join('') : '<p class="compare-empty">No incorporated cities in this county.</p>';
  document.querySelector('#county-view').innerHTML = `<div class="county-title"><h3>${escapeHtml(county.name)} County</h3><button type="button" data-action="share-county">Share county</button></div><div class="metrics four county-metrics"><article><span>${term('IOU', 'iou')} reported capacity</span><strong>${format.format(county.capacityMw)} <small>MW-DC</small></strong><p>${integer.format(county.projects)} project sites · incorporated and unincorporated</p></article><article><span>All-utility benchmark</span><strong>${format.format(county.allUtilityBenchmark.capacityMwAc)} <small>${term('MW-AC', 'mwac')}</small></strong><p>CEC 2024 · systems 1 MW and smaller · not additive</p></article><article><span>Broad generation estimate</span><strong>${format.format(county.generationGwh.low)}–${format.format(county.generationGwh.high)} <small>GWh/yr</small></strong><p>IOU inventory only; statewide yield envelope</p></article><article><span>Outside matched cities</span><strong>${format.format(county.outsideMatchedCitiesMw)} <small>MW-DC</small></strong><p>Unincorporated or unmatched service-city strings</p></article></div><div class="county-benchmark-note"><strong>Two different inventories.</strong> The ${format.format(county.capacityMw)} MW-DC value is the current PG&amp;E/SCE/SDG&amp;E project inventory. The <a href="${safeUrl(county.allUtilityBenchmark.sourceUrl)}" target="_blank" rel="noreferrer">CEC benchmark</a> is an older, AC-rated all-utility total. It improves coverage context but is never added to or substituted for the IOU total.${county.partialCities ? ` ${integer.format(county.partialCities)} incorporated ${county.partialCities === 1 ? 'city is' : 'cities are'} marked for partial utility coverage.` : ''}</div><div class="detail-grid county-detail"><article class="trend-panel"><div class="panel-head"><div><span>Dated IOU capacity</span><h3>County MW-DC by approval year</h3></div></div>${sparkline({ capacityMw: county.capacityMw, timeline: county.timeline })}${county.undatedProjects ? `<p>${integer.format(county.undatedProjects)} projects (${format.format(county.undatedCapacityMw)} MW-DC) have no parseable approval year.</p>` : ''}<p>${integer.format(county.storageProjects)} storage-linked project sites; aggregate energy capacity is withheld.</p></article><aside class="county-cities"><span>Incorporated-city subset</span><div>${memberRows}</div></aside></div>`;
  if (historyMode !== 'none') history[`${historyMode}State`]({ county: county.slug }, '', countyUrl(county));
}

function renderMap() {
  const config = metricConfig[state.mapMetric];
  const cities = state.data.cities.filter((city) => city.coordinates && Number.isFinite(config.value(city)) && config.value(city) > 0);
  const values = cities.map(config.value);
  const sorted = [...values].sort((a, b) => a - b);
  const cap = sorted[Math.floor(sorted.length * .95)] || 1;
  const paths = cities.map((city) => {
    const path = state.boundaries[city.geoid]; if (!path || !/^[MLZ0-9 .-]+$/.test(path)) return '';
    const heat = Math.round(Math.min(config.value(city) / cap, 1) * 10);
    const status = coverageStatus(city);
    return `<path class="map-city heat-${heat} ${status}" d="${path}" data-city-id="${escapeHtml(city.id)}" tabindex="0" role="button" aria-label="${escapeHtml(city.name)}: ${config.display(config.value(city))}"><title>${escapeHtml(city.name)} · ${config.display(config.value(city))} · ${coverageLabel(status)}</title></path>`;
  }).join('');
  document.querySelector('#solar-map').innerHTML = `<svg viewBox="0 0 520 650" role="img" aria-label="California incorporated cities shaded by ${config.label}"><path class="state-outline" d="M28 13L236 13L236 204L490 459L486 603L372 615L307 522L213 494L118 325Z"/>${paths}</svg>`;
  const top = cities.filter((city) => city.geographyRisk === 'not-flagged').sort((a, b) => config.value(b) - config.value(a)).slice(0, 5);
  const summaryRows = top.map((city, index) => `<button data-city-id="${escapeHtml(city.id)}"><i>${index + 1}</i><span>${escapeHtml(city.name)}<small>${escapeHtml(city.county)} County</small></span><strong>${config.display(config.value(city))}</strong></button>`).join('');
  document.querySelector('#map-summary').innerHTML = `<span>Highest ${config.label.toLowerCase()}</span>${summaryRows}<p>Official polygons; shading uses service-city aggregates. Empty municipal polygons have no comparable value.</p>`;
}

function renderRankings() {
  const config = metricConfig[state.rankMetric];
  const excludePartial = document.querySelector('#exclude-partial')?.checked;
  const excludeGeographyRisk = document.querySelector('#exclude-geography-risk')?.checked;
  const minimumPopulation = document.querySelector('#minimum-population')?.checked;
  const ranked = state.data.cities.filter((city) => Number.isFinite(config.value(city)) && (!excludePartial || city.coverage.status !== 'partial') && (!excludeGeographyRisk || city.geographyRisk === 'not-flagged') && (!minimumPopulation || city.population >= 10_000)).sort((a, b) => config.value(b) - config.value(a)).slice(0, 20);
  if (!ranked.length) {
    document.querySelector('#ranking-table').innerHTML = '<div class="compare-empty">No cities match these filters.</div>';
    return;
  }
  const max = config.value(ranked[0]) || 1;
  const rows = ranked.map((city, index) => `<button data-city-id="${escapeHtml(city.id)}"><span>${String(index + 1).padStart(2, '0')}</span><span><strong>${escapeHtml(city.name)}</strong><small>${escapeHtml(city.county)} County</small></span><span><progress max="100" value="${config.value(city) / max * 100}" aria-label="Relative ${escapeHtml(config.label)}"></progress><b>${config.display(config.value(city))}</b></span>${qualityBadge(city)}</button>`).join('');
  document.querySelector('#ranking-table').innerHTML = `<div class="rank-head"><span>Rank</span><span>City</span><span>${config.label}</span><span>Coverage</span></div>${rows}`;
}

function addCompare(city) {
  if (state.compare.length >= 4 || state.compare.some((item) => item.id === city.id)) return;
  state.compare.push(city); renderCompare();
}

function renderCompare() {
  document.querySelector('.compare-count').textContent = `${state.compare.length} / 4`;
  if (!state.compare.length) { document.querySelector('#compare-view').innerHTML = '<div class="compare-empty">Search above to add cities to this comparison.</div>'; return; }
  const metrics = [['capacityMw', 'Reported capacity', 'MW'], ['projects', 'Project sites', 'sites'], ['generation', 'Generation midpoint', 'GWh'], ['growth5yPct', 'Five-year growth', '%']];
  const metricRow = (city, [metric, label, unit]) => {
    const getValue = (item) => metric === 'generation' ? generationMid(item) : item[metric];
    const value = getValue(city);
    const max = Math.max(...state.compare.map((item) => getValue(item) || 0), 1);
    const display = value == null ? '—' : `${format.format(value)} ${unit}`;
    return `<div class="compare-metric"><span>${label}</span><strong>${display}</strong><progress max="100" value="${(value || 0) / max * 100}" aria-label="Relative ${escapeHtml(label)}"></progress></div>`;
  };
  const chips = state.compare.map((city) => `<button data-remove="${escapeHtml(city.id)}">${escapeHtml(city.name)} <span aria-hidden="true">×</span><span class="sr-only">Remove</span></button>`).join('');
  const cards = state.compare.map((city) => `<article><div>${qualityBadge(city)}<button class="icon-button" data-remove="${escapeHtml(city.id)}" aria-label="Remove ${escapeHtml(city.name)}">×</button></div><h3>${escapeHtml(city.name)}</h3><p>${escapeHtml(city.county)} County · Zone ${zoneLabel(city)}</p>${metrics.map((metric) => metricRow(city, metric)).join('')}<button class="text-button" data-city-id="${escapeHtml(city.id)}">View city →</button></article>`).join('');
  document.querySelector('#compare-view').innerHTML = `<div class="compare-chips">${chips}</div><div class="compare-grid">${cards}</div>`;
}

function download(name, content, type = 'text/csv') {
  const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob([content], { type })); anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(anchor.href), 0);
}

function toast(message) {
  const element = document.querySelector('#toast'); element.textContent = message; element.classList.add('show'); clearTimeout(toast.timer); toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
}

function bindEvents() {
  setupSearch(document.querySelector('[data-search="primary"]'), 'primary');
  setupSearch(document.querySelector('[data-search="compare"]'), 'compare');
  document.addEventListener('click', async (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'limits') document.querySelector('.limits-dialog').showModal();
    if (action === 'csv') download(`${slugify(state.city.name)}-solar-data.csv`, cityCsv(state.city));
    if (action === 'chart') {
      const chart = document.querySelector('.trend-panel .chart').cloneNode(true);
      chart.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      chart.insertAdjacentHTML('afterbegin', `<title>${escapeHtml(state.city.name)} reported solar capacity by approval year</title><rect width="100%" height="100%" fill="#17372f"/>`);
      download(`${slugify(state.city.name)}-capacity-history.svg`, new XMLSerializer().serializeToString(chart), 'image/svg+xml');
    }
    if (action === 'share') {
      const url = cityUrl(state.city).href;
      const payload = { title: `${state.city.name} solar data`, text: `Explore reported distributed solar in ${state.city.name}, California.`, url };
      if (navigator.share) await navigator.share(payload).catch(() => {});
      else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => toast('City link copied')).catch(() => toast('Copy the city URL from your browser'));
      else toast('Copy the city URL from your browser');
    }
    if (action === 'share-county') {
      const url = countyUrl(state.county).href;
      const payload = { title: `${state.county.name} County solar data`, text: `Explore reported distributed solar in ${state.county.name} County, California.`, url };
      if (navigator.share) await navigator.share(payload).catch(() => {});
      else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(url).then(() => toast('County link copied')).catch(() => toast('Copy the county URL from your browser'));
      else toast('Copy the county URL from your browser');
    }
    const target = event.target.closest('[data-city-id]');
    if (target && !target.closest('.search-results')) { const city = state.data.cities.find((item) => item.id === target.dataset.cityId); if (city) selectCity(city); }
    const remove = event.target.closest('[data-remove]');
    if (remove) { state.compare = state.compare.filter((city) => city.id !== remove.dataset.remove); renderCompare(); }
  });
  document.querySelector('.limits-dialog').addEventListener('click', (event) => { if (event.target.matches('dialog')) event.target.close(); });
  document.querySelector('#map-metric').addEventListener('change', (event) => { state.mapMetric = event.target.value; renderMap(); });
  document.querySelector('#rank-metric').addEventListener('change', (event) => { state.rankMetric = event.target.value; renderRankings(); });
  document.querySelector('#exclude-partial').addEventListener('change', renderRankings);
  document.querySelector('#exclude-geography-risk').addEventListener('change', renderRankings);
  document.querySelector('#minimum-population').addEventListener('change', renderRankings);
  document.querySelector('#county-select').addEventListener('change', (event) => { const county = state.data.counties.find((item) => item.slug === event.target.value); if (county) renderCounty(county, { historyMode: 'push' }); });
  document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); document.querySelector('#city-search').focus(); } });
  document.addEventListener('keydown', (event) => { if (['Enter', ' '].includes(event.key) && event.target.matches('[data-city-id][role="button"]')) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('click', (event) => { if (!event.target.closest('.search-wrap')) document.querySelectorAll('.search-results').forEach((result) => { result.hidden = true; }); });
  addEventListener('popstate', () => { const url = new URL(location.href); const city = state.data.cities.find((item) => slugify(item.name) === url.searchParams.get('city')); if (city) selectCity(city, { scroll: false, historyMode: 'replace' }); const county = state.data.counties.find((item) => item.slug === url.searchParams.get('county')); if (county) renderCounty(county); });
}

async function start() {
  try {
    const [dataResponse, boundaryResponse] = await Promise.all([fetch(DATA_URL), fetch(BOUNDARIES_URL)]); if (!dataResponse.ok) throw new Error(`Data request failed (${dataResponse.status})`);
    state.data = await dataResponse.json(); state.boundaries = boundaryResponse.ok ? await boundaryResponse.json() : {};
    const initialUrl = new URL(location.href);
    const requested = initialUrl.searchParams.get('city');
    const requestedCounty = initialUrl.searchParams.get('county');
    const city = state.data.cities.find((item) => slugify(item.name) === requested) || state.data.cities.find((item) => item.name === 'Chula Vista');
    const county = state.data.counties.find((item) => item.slug === requestedCounty);
    shell(state.data.meta);
    // Only a county that actually resolved should keep the city out of the URL.
    selectCity(city, { scroll: false, historyMode: county ? 'none' : 'replace' });
    if (county) renderCounty(county, { historyMode: 'replace' });
    state.compare = uniqueCities([city, state.data.cities.find((item) => item.name === 'Pleasanton')]);
    bindEvents(); renderMap(); renderRankings(); renderCompare();
  } catch (error) { app.innerHTML = `<main class="error"><p class="eyebrow">California Solar Atlas</p><h1>The data could not be loaded.</h1><p>${escapeHtml(error.message)}</p><button type="button" data-reload>Try again</button></main>`; document.querySelector('[data-reload]').addEventListener('click', () => location.reload()); }
}

start();
