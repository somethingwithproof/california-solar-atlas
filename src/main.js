import './styles.css';

const DATA_URL = `${import.meta.env.BASE_URL}data/cities.json`;
const app = document.querySelector('#app');

const number = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat('en-US');

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function confidenceLabel(city) {
  if (city.load?.kind === 'measured') return ['Measured', 'good'];
  if (city.load?.kind === 'modeled') return ['Modeled', 'modeled'];
  return ['Capacity only', 'limited'];
}

function generationRange(city) {
  return [city.capacityMw * 1.4, city.capacityMw * 1.5];
}

function renderShell(meta) {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="${import.meta.env.BASE_URL}" aria-label="California Solar Atlas home">
        <span class="brand-mark" aria-hidden="true"><span></span></span>
        <span>California Solar Atlas</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#explore">Explore</a><a href="#methodology">Methodology</a><a href="#about">About</a>
      </nav>
      <button class="limits-button" type="button" data-open-limits aria-haspopup="dialog"><span aria-hidden="true">?</span> Data limits</button>
      <a class="source-link" href="https://www.californiadgstats.ca.gov/downloads/" target="_blank" rel="noreferrer">View source ↗</a>
    </header>
    <main id="main">
      <section class="hero" id="explore">
        <div class="eyebrow"><span></span> Distributed solar across California</div>
        <h1>How solar is growing,<br><em>city by city.</em></h1>
        <p class="hero-copy">Search every incorporated California city to see installed capacity, estimated annual generation, and—where defensible load data exists—the share of local electricity use met by distributed solar.</p>
        <div class="search-wrap">
          <label for="city-search">Find a California city</label>
          <div class="search-control">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.15A7.5 7.5 0 1 1 4 11.5a7.5 7.5 0 0 1 15 0Z"/></svg>
            <input id="city-search" type="search" autocomplete="off" placeholder="Try Pleasanton, Fresno, or San Diego" aria-controls="search-results" aria-expanded="false" />
            <kbd>⌘ K</kbd>
          </div>
          <div id="search-results" class="search-results" role="listbox" hidden></div>
        </div>
        <div class="hero-meta">
          <span><strong>${whole.format(meta.cityCount)}</strong> incorporated cities</span>
          <span><strong>${number.format(meta.totalCapacityMw / 1000)} GW</strong> tracked statewide</span>
          <span>Data through <strong>${escapeHtml(meta.dataThrough)}</strong></span>
        </div>
      </section>
      <section id="city-view" class="city-view" aria-live="polite"></section>
      <section class="method" id="methodology">
        <div>
          <div class="eyebrow"><span></span> Transparent by design</div>
          <h2>One number,<br>three layers of evidence.</h2>
        </div>
        <div class="method-grid">
          <article><span>01</span><h3>Installed capacity</h3><p>Real interconnected project sites, grouped by utility service city. This is the strongest statewide measure.</p></article>
          <article><span>02</span><h3>Solar generation</h3><p>A clearly labeled estimate from DC capacity using a fleet yield of 1,400–1,500 kWh per kW-year.</p></article>
          <article><span>03</span><h3>Share of use</h3><p>Shown only when city-level load is available. Gross use equals grid deliveries plus behind-the-meter generation.</p></article>
        </div>
        <p class="formula"><span>Solar share</span> = gross distributed generation ÷ (grid deliveries + gross distributed generation)</p>
      </section>
      <section class="about" id="about">
        <p>Built for public understanding, not false precision.</p>
        <p>Capacity is observable. Generation is estimated. City electricity use is often unavailable publicly. Every result says which is which.</p>
      </section>
    </main>
    <footer><span>California Solar Atlas</span><span>Open data · Open methodology</span></footer>
    <dialog class="limits-dialog" aria-labelledby="limits-title">
      <form method="dialog"><button class="dialog-close" aria-label="Close data limitations">×</button></form>
      <div class="eyebrow"><span></span> Before you use these numbers</div>
      <h2 id="limits-title">What this data can—and cannot—tell you.</h2>
      <div class="limits-list">
        <article><b>Capacity is reported, not production.</b><p>Project sites provide interconnected nameplate capacity. Annual generation is a modeled range of 1,400–1,500 kWh per kW-DC, not meter data.</p></article>
        <article><b>Service city is not a boundary overlay.</b><p>Projects are grouped by the utility-reported service-city field. Mailing conventions and municipal borders can differ, so totals may not align perfectly with legal city boundaries.</p></article>
        <article><b>City electricity use is the missing half.</b><p>California does not publish a complete city-level consumption series. A solar-share percentage appears only where a defensible local load source has been onboarded and documented.</p></article>
        <article><b>Gross use needs an add-back.</b><p>Behind-the-meter solar reduces grid deliveries. Where a share is shown, modeled self-generation is added back before calculating the percentage.</p></article>
        <article><b>Utility coverage is incomplete.</b><p>The source files cover PG&amp;E, SCE, and SDG&amp;E Rule 21 projects. Municipal utilities—including LADWP and SMUD—are not represented, so affected city totals are lower bounds.</p></article>
        <article><b>Records change over time.</b><p>Pending and decommissioned projects are excluded. Applications can be corrected or superseded in later releases, which can revise historical-looking trends.</p></article>
      </div>
      <p class="dialog-note">Use these results for community-scale exploration and comparison—not billing, engineering, financial, or regulatory decisions.</p>
      <form method="dialog"><button class="dialog-action">I understand</button></form>
    </dialog>
  `;
  const dialog = document.querySelector('.limits-dialog');
  document.querySelector('[data-open-limits]').addEventListener('click', () => dialog.showModal());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
}

function sparkline(city) {
  const points = city.timeline || [];
  if (!points.length || city.capacityMw === 0) return '<div class="empty-chart">No photovoltaic capacity reported</div>';
  const width = 720, height = 190, pad = 8;
  const max = Math.max(...points.map((point) => point.mw), 1);
  const coords = points.map((point, index) => {
    const x = pad + (index / Math.max(points.length - 1, 1)) * (width - pad * 2);
    const y = height - pad - (point.mw / max) * (height - pad * 2);
    return [x, y];
  });
  const line = coords.map(([x, y], index) => `${index ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords.at(-1)[0]},${height} L${coords[0][0]},${height} Z`;
  return `<svg class="chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Cumulative installed solar capacity from ${points[0].year} to ${points.at(-1).year}">
    <defs><linearGradient id="sun-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eaa72c" stop-opacity=".32"/><stop offset="1" stop-color="#eaa72c" stop-opacity="0"/></linearGradient></defs>
    <path class="area" d="${area}"/><path class="line" d="${line}"/>
  </svg><div class="chart-axis"><span>${points[0].year}</span><span>${points.at(-1).year}</span></div>`;
}

function renderCity(city, meta, shouldScroll = true) {
  const [low, high] = generationRange(city);
  const [label, tone] = confidenceLabel(city);
  const hasShare = city.load && Number.isFinite(city.load.deliveriesGwh);
  const midpoint = (low + high) / 2;
  const share = hasShare ? midpoint / (city.load.deliveriesGwh + midpoint) * 100 : null;
  document.querySelector('#city-view').innerHTML = `
    <div class="city-heading">
      <div><div class="eyebrow"><span></span> ${escapeHtml(city.county)} County</div><h2>${escapeHtml(city.name)}</h2></div>
      <span class="status ${tone}"><i></i>${label}</span>
    </div>
    <div class="metrics">
      <article><span>Reported capacity</span><strong>${number.format(city.capacityMw)} <small>MW-DC</small></strong><p>${whole.format(city.projects)} interconnected PV project sites</p></article>
      <article><span>Estimated generation</span><strong>${number.format(low)}–${number.format(high)} <small>GWh/yr</small></strong><p>Modeled fleet production range</p></article>
      <article class="share-card"><span>Share of city electricity use</span>${hasShare ? `<strong>≈ ${number.format(share)}<small>%</small></strong><p>${escapeHtml(city.load.year)} ${escapeHtml(city.load.kind)} load basis</p>` : `<strong class="not-available">Not available</strong><p>Public city-level load has not been verified</p>`}</article>
    </div>
    <div class="detail-grid">
      <article class="trend-panel"><div class="panel-head"><div><span>Capacity growth</span><h3>Cumulative MW-DC</h3></div><strong>${number.format(city.capacityMw)} MW</strong></div>${sparkline(city)}</article>
      <aside class="read-panel"><span>How to read this</span><h3>${hasShare ? 'A defensible estimate, not a meter reading.' : 'Reported capacity is known. Consumption is not.'}</h3><p>${hasShare ? `The percentage restores modeled behind-the-meter generation to delivered electricity before calculating the share. ${escapeHtml(city.load.note || '')}` : `The project-site dataset reports installed solar in ${escapeHtml(city.name)}, but California does not publish comprehensive electricity use for every city. We do not substitute county data.`}</p><a href="#methodology">Read the methodology <b>→</b></a></aside>
    </div>
    <div class="provenance"><span>Source</span><p>California Distributed Generation Statistics · Interconnected Project Sites · ${escapeHtml(meta.dataThrough)}</p><span>Coverage</span><p>Rule 21 interconnected photovoltaic projects; pending and decommissioned projects excluded.</p></div>
  `;
  if (shouldScroll) document.querySelector('#city-view').scrollIntoView({ behavior: 'smooth', block: 'start' });
  history.replaceState(null, '', `#city=${slugify(city.name)}`);
}

function initSearch(data) {
  const input = document.querySelector('#city-search');
  const results = document.querySelector('#search-results');
  let active = -1;
  const show = () => {
    const query = input.value.trim().toLowerCase();
    const matches = data.cities.filter((city) => `${city.name} ${city.county}`.toLowerCase().includes(query)).slice(0, 8);
    results.innerHTML = matches.map((city, index) => `<button type="button" role="option" data-index="${data.cities.indexOf(city)}" aria-selected="${index === active}"><span><strong>${escapeHtml(city.name)}</strong><small>${escapeHtml(city.county)} County</small></span><span class="result-value">${number.format(city.capacityMw)} MW</span></button>`).join('');
    results.hidden = !matches.length;
    input.setAttribute('aria-expanded', String(matches.length > 0));
    results.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => select(Number(button.dataset.index))));
  };
  const select = (index) => {
    const city = data.cities[index];
    if (!city) return;
    input.value = city.name;
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    renderCity(city, data.meta);
  };
  input.addEventListener('input', () => { active = -1; show(); });
  input.addEventListener('focus', show);
  input.addEventListener('keydown', (event) => {
    const buttons = [...results.querySelectorAll('button')];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); active = Math.max(0, Math.min(buttons.length - 1, active + (event.key === 'ArrowDown' ? 1 : -1))); show();
    } else if (event.key === 'Enter' && buttons.length) { event.preventDefault(); (buttons[active < 0 ? 0 : active]).click(); }
    else if (event.key === 'Escape') { results.hidden = true; input.setAttribute('aria-expanded', 'false'); }
  });
  document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'k') { event.preventDefault(); input.focus(); } });
  document.addEventListener('click', (event) => { if (!event.target.closest('.search-wrap')) results.hidden = true; });
  const requested = location.hash.startsWith('#city=') ? location.hash.slice(6) : 'pleasanton';
  const city = data.cities.find((item) => slugify(item.name) === requested) || data.cities.find((item) => item.name === 'Pleasanton');
  if (city) renderCity(city, data.meta, location.hash.startsWith('#city='));
}

async function start() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Data request failed (${response.status})`);
    const data = await response.json();
    renderShell(data.meta);
    initSearch(data);
  } catch (error) {
    app.innerHTML = `<main class="error"><p class="eyebrow">California Solar Atlas</p><h1>The data could not be loaded.</h1><p>${escapeHtml(error.message)}</p><button onclick="location.reload()">Try again</button></main>`;
  }
}

start();
