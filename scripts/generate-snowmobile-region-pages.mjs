import fs from 'node:fs';
import path from 'node:path';
import { REGIONS } from '../lib/snowmobile/regions.mjs';

const root = process.cwd();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pageFor(region) {
  const canonical = `https://chrisizworski.com/snowmobile/regions/${region.key}.html`;
  const title = `${region.shortLabel} Snowmobile Conditions | Chris Izworski`;
  const description = `${region.shortLabel} snowmobile conditions from Michigan DNR trail data, closures and NWS forecasts${region.legacyCorridor ? ', plus verified Grayling and Gaylord club reports' : ''}.`;
  const corridorBlock = region.legacyCorridor ? `
  <section id="corridor-sections-wrap" class="panel corridor-strip"><div class="section-headline"><div><div class="eyebrow">Required corridor</div><h2>Where the route gets weaker</h2></div><span class="small">Grayling \u2192 Frederic \u2192 Waters \u2192 Gaylord</span></div><div id="corridorSections" class="corridor-sections"><div class="corridor-section">Loading corridor segments\u2026</div></div></section>` : '';
  const cameraBlock = region.cameraId ? `
  <section class="panel visual-check" id="visual-check"><div><div class="eyebrow">Visual context</div><h2>What does the ${esc(region.shortLabel)} snowbelt look like?</h2><p>An MDOT road-weather camera near ${esc(region.hubTown)} can confirm whether the regional landscape is snow-covered. It does <strong>not</strong> show a snowmobile trail, prove grooming, or measure trail base.</p></div><div class="field-camera" data-field-camera="${esc(region.cameraId)}"><p class="camera-out">Loading the current MDOT camera image\u2026</p></div></section>` : '';
  const cameraScript = region.cameraId ? `<script defer src="/assets/field-camera.js"></script>` : '';

  const cameraCss = region.cameraId ? `<link rel="stylesheet" href="/assets/field-camera.css">` : '';
  return `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta name="google-adsense-account" content="ca-pub-8222782620788075"><meta name="theme-color" content="#123246"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><link rel="stylesheet" href="/assets/snowmobile.css">${cameraCss}<script async src="https://www.googletagmanager.com/gtag/js?id=G-Y5D2V2W7HN"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-Y5D2V2W7HN');</script><script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebPage', '@id': `${canonical}#page`, url: canonical, name: `${region.label} Snowmobile Conditions`, dateModified: '2026-09-21' },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chrisizworski.com/' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://chrisizworski.com/tools/' },
        { '@type': 'ListItem', position: 3, name: 'Michigan Snowmobile Conditions', item: 'https://chrisizworski.com/snowmobile/' },
        { '@type': 'ListItem', position: 4, name: region.label, item: canonical }
      ] }
    ]
  })}</script></head>
<body>
<script>window.SNOWMOBILE_REGION=${JSON.stringify(region.key)};</script>
<header class="top"><div class="topin"><a class="brand" href="/">Chris Izworski</a></div></header>
<main class="shell">
  <div class="crumb"><a href="/">Home</a> \u203a <a href="/tools/">Tools</a> \u203a <a href="/snowmobile/">Michigan Snowmobile Conditions</a> \u203a ${esc(region.shortLabel)}</div>
  <div class="eyebrow">Michigan trail decision intelligence</div>
  <h1>${esc(region.label)}</h1>
  <p class="lede">${esc(region.description)} This page reconciles official DNR trail geometry${region.legacyCorridor ? ', two verified local club reports' : ''} and weather without pretending that snow depth means trail base or that an open trail is automatically good.</p>

  <article class="decision">
    <div class="status-row"><span id="status" class="status">CHECKING\u2026</span><span id="score" class="score-of"></span></div>
    <div class="verdict-line"><div class="eyebrow">Region verdict</div><div id="drive">Checking route evidence\u2026</div></div>
    <div class="key-stats">
      <div class="stat"><span>Evidence confidence</span><strong id="confidence">\u2014</strong></div>
      <div class="stat"><span>Best riding window</span><strong id="best">Loading</strong></div>
      <div class="stat"><span>Route status</span><strong id="routeStatus">Loading</strong></div>
    </div>
    <details class="why-decision" id="whyDecision"><summary>Why this result? (main risk, grooming, forecast snow)</summary><ul id="whyList">
      <li>Main risk: <span id="risk">Loading</span></li>
      <li>Grooming: <span id="grooming">Loading</span></li>
      <li>Forecast snow: <span id="forecastSnow">Loading</span></li>
    </ul></details>
    <div class="source-strip"><span id="sourceLine">Checking evidence feeds\u2026</span><span>Page updated <strong id="sourceAge">\u2014</strong></span></div>
    <div class="origin-check">
      <div class="origin-head"><div><span>Personalize the trip</span><strong>Worth the drive from where you are?</strong></div><span class="small ui">Routes to ${esc(region.hubTown)}; trailhead travel is additional.</span></div>
      <div class="origin-controls">
        <label><span>From</span><select id="originPreset">
          <option value="43.5945,-83.8889" selected>Bay City</option>
          <option value="43.4195,-83.9508">Saginaw</option>
          <option value="43.6156,-84.2472">Midland</option>
          <option value="42.7325,-84.5555">Lansing</option>
          <option value="42.9634,-85.6681">Grand Rapids</option>
          <option value="42.3314,-83.0458">Detroit</option>
          <option value="44.7631,-85.6206">Traverse City</option>
        </select></label>
        <label><span>My max drive</span><select id="maxDrive"><option value="2">2 hours</option><option value="3" selected>3 hours</option><option value="4">4 hours</option><option value="6">6 hours</option></select></label>
        <button type="button" id="checkDrive">Check trip</button>
        <button type="button" id="useMyLocation" class="secondary-btn">Use my location</button>
      </div>
      <div id="personalDrive" class="personal-drive">Choose an origin or use your location to compare the drive with current region evidence.</div><p class="location-note">\u201cUse my location\u201d only runs after you choose it. Your coordinates are used for this route request; the snowmobile page does not save an origin profile.</p>
    </div>
  </article>
${corridorBlock}
  <section id="seasonNote" class="panel" hidden><strong>Pre-season mode.</strong> Michigan state-designated snowmobile trails are generally open Dec. 1\u2013Mar. 31. The product remains indexable and source-connected now, but it will not manufacture an in-season ride score in September.</section>
  <section class="panel outlook-panel" id="outlook72"><div class="section-headline"><div><div class="eyebrow">Next 72 hours</div><h2>When conditions are most favorable</h2></div><span class="small">Weather timing only \u2014 trail condition and grooming still control the ride</span></div><div id="outlookCards" class="outlook-cards"><div class="outlook-card">Loading NWS forecast periods\u2026</div></div></section>
  <section class="grid">
    <div class="panel"><h2>Route map</h2><p class="small">Official Michigan DNR designated snowmobile trail geometry for ${esc(region.shortLabel)}. In season, line color follows the reconciled segment condition; official temporary closure/detour geometry is overlaid separately.</p><div class="map-tools"><div class="map-legend-inline"><span><i class="lg excellent"></i>good/excellent</span><span><i class="lg fair"></i>fair</span><span><i class="lg marginal"></i>marginal/poor</span><span><i class="lg closure"></i>official closure</span></div><button type="button" id="toggleSnowDepth" class="map-layer-button" aria-pressed="false">Show NOAA snow depth</button></div><div id="map"></div><p class="small snow-note">NOAA NOHRSC snow depth is an analyzed regional snowpack layer built from observations and a snow model. It is useful context, but <strong>it is not trail base and does not prove a groomed surface.</strong></p><p class="small" id="closureVerify">Checking the official DNR closure feed\u2026</p></div>
    <aside class="panel"><h2>Weakest route segments</h2><div id="segments">Loading official trail segments\u2026</div></aside>
  </section>
  <section class="panel route-planner" id="routePlanner">
    <div class="section-headline"><div><div class="eyebrow">Plan a trip</div><h2>How far is it, trail-following?</h2></div></div>
    <p class="small">Pick a start and an end point on the map above and this traces the shortest path along ${esc(region.shortLabel)}'s official DNR trail geometry between them, the same lines shown on the map, and totals the real distance. It will not route through a segment this data marks legally closed; if the only way there is closed, it says so instead of guessing a detour.</p>
    <div class="route-controls">
      <button type="button" id="routeModeToggle">Plan a route on this map</button>
      <button type="button" id="clearRoute" class="secondary-btn" hidden>Clear route</button>
    </div>
    <p class="small ui" id="routeHint" hidden>Click a start point, then an end point, on the map above.</p>
    <div id="routeResult" class="route-result" hidden></div>
    <p class="small route-truth">Start/end points snap to the nearest mapped trail junction, not necessarily the exact spot clicked. Ride time is a rough estimate from an assumed average trail speed, not a live or personalized prediction. This is not turn-by-turn GPS navigation.</p>
  </section>
${cameraBlock}
  <section class="grid">
    <div class="panel"><h2>Local condition evidence</h2><div id="conflictNotice" class="conflict-notice" hidden></div><p class="small">Club reports can describe surface condition and grooming. They do not override an official closure, and an old \u201clast groomed\u201d field is not treated as current just because the page itself is current.</p><div id="reports"></div></div>
    <aside class="panel sources"><h2>Source contract</h2><ul id="sources"></ul><p class="small"><strong>Semantic rule:</strong> natural snow depth \u2260 trail base; forecast snow \u2260 accumulated snow; groomer nearby \u2260 whole trail groomed; missing closure data \u2260 confirmed open.</p></aside>
  </section>
  <section class="panel"><h2>How the score works</h2><p>This region is bottleneck-aware. A weak required segment can pull the region down, and an official closure breaks the route instead of being averaged away. Condition and confidence are separate: favorable weather with stale or missing local evidence can produce a decent condition score and low confidence.${region.legacyCorridor ? ' JEV is used only behind the server-side shared harness for bounded interpretation of unstructured club text. It cannot create trail facts, determine legal status, alter DNR geometry, invent grooming, or convert snow depth into trail base. If the harness is unavailable, deterministic parsing and scoring continue.' : ''}</p></section>
  <section class="panel companion"><div><div class="eyebrow">Winter network</div><h2>Snowmobile not the only plan?</h2><p>The same northern Michigan snow signal matters differently by activity. Cross-country skiing depends heavily on recent grooming; ice decisions depend on accumulated cold and local verification.</p></div><div class="companion-links"><a href="/snowmobile/">\u2190 All Michigan regions</a><a href="/michigan-cross-country-skiing/">Michigan XC skiing \u2192</a><a href="/michigan-ice/">Michigan ice conditions \u2192</a><a href="/tools/#winter-task-router">All winter tools \u2192</a></div></section>
</main>
<footer class="footer">Michigan Snowmobile Conditions \u00b7 Evidence \u2192 reconciliation \u2192 decision</footer>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/assets/snowmobile-region.js"></script>
${cameraScript}
</body></html>`;
}

const outDir = path.join(root, 'public/snowmobile/regions');
fs.mkdirSync(outDir, { recursive: true });
for (const region of REGIONS) {
  const html = pageFor(region);
  const out = path.join(outDir, `${region.key}.html`);
  fs.writeFileSync(out, html);
  for (const needle of [region.key, region.label, 'SNOWMOBILE_REGION', '/assets/snowmobile-region.js', 'id="routePlanner"', 'id="routeModeToggle"', 'id="routeResult"']) {
    if (!html.includes(needle)) throw new Error(`Snowmobile region page build failed for ${region.key}: missing "${needle}"`);
  }
}
const sitemapUrls = REGIONS.map((r) => `https://chrisizworski.com/snowmobile/regions/${r.key}.html`);
console.log(`Generated and verified ${REGIONS.length} snowmobile region pages.`);
console.log(sitemapUrls.join('\n'));
