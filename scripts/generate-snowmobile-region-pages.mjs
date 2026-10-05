import fs from 'node:fs';
import path from 'node:path';
import { REGIONS } from '../lib/snowmobile/regions.mjs';
import { planningFor } from '../lib/snowmobile/planning.mjs';

const root = process.cwd();
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function pageFor(region) {
  const canonical = `https://chrisizworski.com/snowmobile/regions/${region.key}.html`;
  const title = [`${region.shortLabel} Snowmobile Conditions | Chris Izworski`, `${region.shortLabel} Snowmobile | Chris Izworski`].find(t=>t.length<=60);
  const description = `Check ${region.shortLabel} snowmobile trails: DNR closures, local report links, snow and thaw context, maps and road time to ${region.hubTown}.`;
  if(!title||description.length>158)throw new Error(`Snowmobile search metadata too long: ${region.key}`);
  const planning=planningFor(region.key);
  const reportBlock=`<section class="panel" aria-labelledby="local-planning-title"><h2 id="local-planning-title">Plan the local ride</h2><p>${esc(planning.note)}</p><h3>Check the local report before leaving</h3>${planning.reports.map(r=>`<p><a href="${esc(r.url)}" target="_blank" rel="noopener" data-source-name="${esc(r.name)}">${esc(r.name)}</a><br><span class="small">${esc(r.scope)}</span></p>`).join('')}<p class="small">Check each source’s report date and exact coverage. These links are for manual verification; they are not automated surface evidence for the entire region. <a href="https://misorva.org/trail-report/" target="_blank" rel="noopener">Find other club reports in the MISORVA directory</a>.</p></section>`;
  const corridorBlock = region.legacyCorridor ? `
  <section id="corridor-sections-wrap" class="panel corridor-strip"><div class="section-headline"><div><div class="eyebrow">Required corridor</div><h2>Where the route gets weaker</h2></div><span class="small">Grayling → Frederic → Waters → Gaylord</span></div><div id="corridorSections" class="corridor-sections"><div class="corridor-section">Loading corridor segments…</div></div></section>` : '';
  const cameraBlock = region.cameraId ? `
  <section class="panel visual-check" id="visual-check"><div><div class="eyebrow">Visual context</div><h2>What does the ${esc(region.shortLabel)} snowbelt look like?</h2><p>An MDOT road-weather camera near ${esc(region.hubTown)} can confirm whether the regional landscape is snow-covered. It does <strong>not</strong> show a snowmobile trail, prove grooming, or measure trail base.</p></div><div class="field-camera" data-field-camera="${esc(region.cameraId)}"><p class="camera-out">Loading the current MDOT camera image…</p></div></section>` : '';
  const cameraScript = region.cameraId ? `<script defer src="/assets/field-camera.js"></script>` : '';
  const cameraCss = region.cameraId ? `<link rel="stylesheet" href="/assets/field-camera.css">` : '';
  return `<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><meta name="description" content="${esc(description)}"><link rel="canonical" href="${canonical}"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1"><meta name="google-adsense-account" content="ca-pub-8222782620788075"><meta name="theme-color" content="#123246"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="https://chrisizworski.com/og-image.png"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="https://chrisizworski.com/og-image.png"><link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"><link rel="stylesheet" href="/assets/snowmobile.css?v=20261005-route-toolbar-4">${cameraCss}<script async src="https://www.googletagmanager.com/gtag/js?id=G-Y5D2V2W7HN"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-Y5D2V2W7HN');</script><script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075"></script><script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Person', '@id': 'https://chrisizworski.com/#person', name: 'Chris Izworski', url: 'https://chrisizworski.com/' },
      { '@type': 'WebPage', '@id': `${canonical}#page`, url: canonical, name: `${region.label} Snowmobile Trail Conditions`, dateModified: '2026-10-05', author: {'@id':'https://chrisizworski.com/#person'}, publisher: {'@id':'https://chrisizworski.com/#person'} },
      { '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chrisizworski.com/' },
        { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://chrisizworski.com/tools/' },
        { '@type': 'ListItem', position: 3, name: 'Michigan Snowmobile Trail Conditions', item: 'https://chrisizworski.com/snowmobile/' },
        { '@type': 'ListItem', position: 4, name: region.label, item: canonical }
      ] }
    ]
  })}</script></head>
<body>
<script>window.SNOWMOBILE_REGION=${JSON.stringify(region.key)};</script>
<header class="top"><div class="topin"><a class="brand" href="/">Chris Izworski</a></div></header>
<main class="shell">
  <div class="crumb"><a href="/">Home</a> › <a href="/tools/">Tools</a> › <a href="/snowmobile/">Michigan Snowmobile Trail Conditions</a> › ${esc(region.shortLabel)}</div>
  <div class="eyebrow">Is it worth making the drive?</div>
  <h1>${esc(region.label)} Snowmobile Trail Conditions</h1>
  <p class="lede">${esc(region.description)} This page reconciles official DNR trail geometry and temporary closures, observed snowfall, recent thaw/rain evidence and the NWS forecast${region.legacyCorridor ? ', plus two local club condition reports' : ''}. It will not call a trail GOOD from snow depth, an open status or a cold forecast alone.</p>

  <article class="decision">
    <div class="status-row"><span id="status" class="status">CHECKING…</span><span id="score" class="score-of"></span></div>
    <div class="verdict-line"><div class="eyebrow">Worth loading the sleds?</div><div id="drive">Checking route evidence…</div></div>
    <div class="key-stats">
      <div class="stat"><span>Evidence confidence</span><strong id="confidence">—</strong></div>
      <div class="stat"><span>Best riding window</span><strong id="best">Loading</strong></div>
      <div class="stat"><span>Route status</span><strong id="routeStatus">Loading</strong></div>
    </div>
    <details class="why-decision" id="whyDecision"><summary>Why this result? (surface evidence, recent snow, thaw/rain, grooming, forecast)</summary><ul id="whyList">
      <li>Main risk: <span id="risk">Loading</span></li>
      <li>Grooming: <span id="grooming">Loading</span></li>
      <li>Forecast snow: <span id="forecastSnow">Loading</span></li>
    </ul></details>
    <div class="source-strip"><span id="sourceLine">Checking evidence feeds…</span><span>Page updated <strong id="sourceAge">—</strong></span></div>
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
        <label><span>My max drive</span><select id="maxDrive"><option value="2">2 hours</option><option value="3" selected>3 hours</option><option value="4">4 hours</option><option value="6">6 hours</option><option value="10">10 hours</option></select></label>
        <button type="button" id="checkDrive">Check trip</button>
        <button type="button" id="useMyLocation" class="secondary-btn">Use my location</button>
      </div>
      <div id="personalDrive" class="personal-drive">Choose an origin or use your location to compare the drive with current region evidence.</div><p class="location-note">“Use my location” only runs after you choose it. Your coordinates are used for this route request; the snowmobile page does not save an origin profile.</p>
    </div>
  </article>
${corridorBlock}
${reportBlock}
  <section id="seasonNote" class="panel" hidden><strong>Pre-season mode.</strong> Michigan state-designated snowmobile trails are generally open Dec. 1–Mar. 31. The product remains indexable and source-connected now, but it will not manufacture an in-season ride score outside the riding season.</section>
  <section class="panel outlook-panel" id="outlook72"><div class="section-headline"><div><div class="eyebrow">Next 72 hours</div><h2>When the weather window is most favorable</h2></div><span class="small">Weather timing only — it can downgrade or time a verified trail, but cannot create a trail-condition verdict</span></div><div id="outlookCards" class="outlook-cards"><div class="outlook-card">Loading NWS forecast periods…</div></div></section>
  <section class="grid">
    <div class="panel route-planner" id="routePlanner"><h2>Plan your trail route</h2><p class="small">Official Michigan DNR designated snowmobile trail geometry for ${esc(region.shortLabel)}. In season, line color follows verified/reconciled segment condition where surface evidence supports one; unverified segments remain neutral. Official temporary closure geometry is overlaid separately.</p><div class="map-tools"><div class="map-legend-inline"><span><i class="lg excellent"></i>good/excellent</span><span><i class="lg fair"></i>fair</span><span><i class="lg marginal"></i>marginal/poor</span><span><i class="lg closure"></i>official closure</span></div><button type="button" id="toggleSnowDepth" class="map-layer-button" aria-pressed="false">Show NOAA snow depth</button></div><p class="small">Tap your start, stops and finish in order (up to 12 points), then choose <strong>Build route</strong>. Each leg follows the shortest connected mapped trail, excluding known closures. To make a loop, tap your starting point again as the final stop.</p><div class="route-toolbar"><div class="route-controls"><button type="button" id="routeModeToggle" aria-pressed="false" disabled>Plan a route</button><button type="button" id="buildRoute" disabled>Build route</button><button type="button" id="undoRoute" class="secondary-btn" disabled>Undo last stop</button><button type="button" id="editRoute" class="secondary-btn" hidden>Edit stops</button><button type="button" id="clearRoute" class="secondary-btn" hidden>Clear route</button></div><p class="small ui" id="mapRouteHint" role="status" aria-live="polite">Loading trail map…</p></div><ol id="routeStops" class="route-stops" aria-label="Selected route stops" hidden></ol><div id="map" tabindex="0" aria-label="Snowmobile trail map"></div><div id="routeResult" class="route-result" role="status" aria-live="polite" hidden></div><p class="small route-truth">Stops snap to mapped trail junctions, not necessarily the exact spot tapped. Ride time uses an assumed average speed. This is distance planning, not turn-by-turn GPS navigation or confirmation of good trail conditions.</p><p class="small snow-note">NOAA NOHRSC snow depth is an analyzed regional snowpack layer built from observations and a snow model. It is useful context, but <strong>it is not trail base and does not prove a groomed surface.</strong></p><p class="small" id="closureVerify">Checking the official DNR closure feed…</p></div>
    <aside class="panel"><h2>Weakest / unverified route segments</h2><div id="segments">Loading official trail segments…</div></aside>
  </section>
${cameraBlock}
  <section class="grid">
    <div class="panel"><h2>Local condition evidence</h2><div id="conflictNotice" class="conflict-notice" hidden></div><p class="small">A ride-quality score requires current local trail-surface evidence. Club/operator reports can describe surface condition and grooming, but they do not override an official closure. Old reports and old “last groomed” fields are visibly discounted instead of borrowing freshness from this page.</p><div id="reports"></div></div>
    <aside class="panel sources"><h2>Source contract</h2><ul id="sources"></ul><p class="small"><strong>Semantic rule:</strong> observed snowfall ≠ trail base; NOAA snow depth ≠ trail base; forecast snow ≠ accumulated snow; groomer nearby ≠ whole trail groomed; open ≠ good; missing closure data ≠ confirmed open.</p></aside>
  </section>
  <section class="panel"><h2>How the decision model works</h2><p>The model is bottleneck-aware. A weak required segment can pull a verified route down, and an official closure breaks the route instead of being averaged away. But a positive trail-quality score is issued only when there is current local trail-surface evidence. DNR legal status, snowfall, NOHRSC snow depth and favorable weather can provide context; they cannot manufacture a FAIR or GOOD trail when the surface itself is unverified. Aging positive reports are capped, stale reports become UNKNOWN, and rain/thaw observations or forecasts can downgrade otherwise favorable evidence.${region.legacyCorridor ? ' JEV is used only behind the server-side shared harness for bounded interpretation of unstructured club text. It cannot create trail facts, determine legal status, alter DNR geometry, invent grooming, or convert snow into trail base. If the harness is unavailable, deterministic parsing and scoring continue.' : ''}</p></section>
  <section class="panel companion"><div><div class="eyebrow">Winter network</div><h2>Check the evidence around the ride</h2><p>Snowfall, road-trip weather, evening aurora potential and other winter conditions can matter to the same weekend without being mixed into the trail score.</p></div><div class="companion-links"><a href="/snowmobile/">← All Michigan regions</a><a href="/mackinac-bridge-live/">Mackinac Bridge crossing conditions →</a><a href="https://www.michigan.gov/dnr/things-to-do/snowmobiling/where" target="_blank" rel="noopener">Official DNR trail maps →</a><a href="/michigan-snow-totals/">Michigan Snow Totals →</a><a href="/michigan-cross-country-skiing/">Michigan XC skiing →</a><a href="/michigan-ice/">Michigan ice conditions →</a><a href="/northern-lights-michigan/">Northern Lights →</a><a href="/tools/#winter-task-router">All winter tools →</a></div></section>
</main>
<footer class="footer">Built by <a href="/about/">Chris Izworski</a> · Michigan Snowmobile Trail Conditions · © 2026 Chris Izworski</footer>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="/assets/snowmobile-comparison.js?v=20261005-trip-compare-1"></script>
<script src="/assets/snowmobile-region.js?v=20261005-multi-stop-4"></script>
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

// The statewide directory remains crawlable and usable when its API is unavailable.
const indexPath=path.join(root,'public/snowmobile/index.html');
let index=fs.readFileSync(indexPath,'utf8');
index=index.replace(/(<div class="companion-links" id="region-directory">)[\s\S]*?(<\/div>)/,(_,start,end)=>start+REGIONS.map(r=>`<a href="/snowmobile/regions/${r.key}.html">${esc(r.shortLabel)} — ${esc(r.hubTown)} hub</a>`).join('')+end);
fs.writeFileSync(indexPath,index);
