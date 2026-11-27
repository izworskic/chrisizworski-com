#!/usr/bin/env node
// Lays out the static /detroit-river-freighters/ page around the tested passage windows, using
// what the other freighter tools taught (Soo Locks, St. Clair River, Seaway, Cuyahoga):
//
//   1. Season band, then "Next ships at the RiverWalk and Belle Isle" right under the H1
//      (the answer first, as on the Soo Locks page).
//   2. "The river right now": every ship on one map with the two spots and the cameras
//      (river-ship-map.js, drawn from the board's own request).
//   3. Detroit River cameras (USGS Fort Wayne still + BoatNerd Belle Isle live).
//   4. "Right now near the riverfront": the existing Detroit Outdoors live signal, unchanged,
//      followed by its user-relative map (detroit-freighter-relation.js inserts that itself).
//   5. Where to stand, then the engine's read, evidence and caveats.
//   6. The method panels kept in full but folded under "How the live signal decides".
//
// The shared Detroit Outdoors client (detroit-intent.js) and the relation map are not edited.
// Windows come from data/detroit-river-freighters/passage-model.json; the board drops any window
// whose report is older than 10 minutes, matching the page. Idempotent.
import fs from 'node:fs';

const PAGE = 'public/detroit-river-freighters/index.html';
const MODEL = 'data/detroit-river-freighters/passage-model.json';
const A0 = '<!-- rsw-detroit:start -->', A1 = '<!-- rsw-detroit:end -->';
const B0 = '<!-- rsw-detroit-where:start -->', B1 = '<!-- rsw-detroit-where:end -->';
const M0 = '<!-- rsw-detroit-method:start -->', M1 = '<!-- rsw-detroit-method:end -->';
const CSS = '<link rel="stylesheet" href="/assets/river-ship-watch.css?v=20261127f">';
const JS = ['<script src="/assets/river-passage.js?v=20261127a" defer></script>',
  '<script src="/assets/river-ship-watch.js?v=20261127c" defer></script>',
  '<script src="/assets/river-ship-map.js?v=20261127c" defer></script>',
  '<script src="/assets/field-camera.js" defer></script>',
  '<script src="/assets/river-cams.js?v=20261127a" defer></script>',
  '<script src="/assets/detroit-river-page.js?v=20261127a" defer></script>'].join('');
const OLD_LEDE = '<p class="lede">This page watches the safety-gated Detroit Outdoors engine for fresh named commercial-vessel AIS reports with active movement close enough to create a short-lived riverfront viewing opportunity.</p>';
const LEDE = '<p class="lede">When will the next freighter pass the Detroit RiverWalk or Belle Isle? Tested arrival windows from live ship reports, a map of every ship on the river, and live cameras, so you can time the trip to the water.</p>';

const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
const CAMS = JSON.parse(fs.readFileSync('data/river-cameras.json', 'utf8'));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const attr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const pct = w => Math.round(w.hitRate * 100);
const rw = model.windows['detroit-riverwalk'], bi = model.windows['belle-isle'];
if (!rw || !rw['0-2h'] || !bi || !bi['0-2h']) throw new Error('Detroit model is missing a released 0-2h window');

const evidence = `Tested on held-out 2025 days: RiverWalk ${pct(rw['0-2h'])}% of ${rw['0-2h'].testPassages} passages inside ±${Math.round(rw['0-2h'].halfWidthMin)} min up to 2 hours ahead` +
  (rw['2-6h'] ? ` and ${pct(rw['2-6h'])}% inside ±${Math.round(rw['2-6h'].halfWidthMin)} min at 2 to 6 hours` : '') +
  `; Belle Isle ${pct(bi['0-2h'])}% of ${bi['0-2h'].testPassages} inside ±${Math.round(bi['0-2h'].halfWidthMin)} min up to 2 hours ahead.`;

const streamCams = CAMS.pages['detroit-river-freighters'] || [];
const mapCams = [{ id: 'fort-wayne', short: 'Fort Wayne', lat: 42.2981, lon: -83.0927 }, ...streamCams.map(c => ({ id: c.id, short: c.short, lat: c.lat, lon: c.lon }))];
const streams = streamCams.map(c => `<article class="rsw-cam" id="cam-${c.id}" data-river-cam data-yt="${attr(c.youtube)}" data-title="${attr(c.label)}"><div class="rsw-cam-stage" data-river-cam-stage><p class="rsw-cam-fallback"><a href="https://www.youtube.com/watch?v=${attr(c.youtube)}" target="_blank" rel="noopener noreferrer" data-track-tool="rsw-cam-${c.id}" data-placement="detroit-cams">Watch the ${attr(c.short)} camera on YouTube ↗</a></p></div><div class="rsw-cam-body"><p class="rsw-kicker">${attr(c.short)} · live video</p><h3>${attr(c.label)}</h3><p>Camera by <a href="${attr(CAMS.operatorUrl)}" target="_blank" rel="noopener noreferrer">${attr(CAMS.operator)}</a>, streamed on YouTube. Nothing loads until you press play. If it says offline, <a href="${attr(CAMS.channelStreamsUrl)}" target="_blank" rel="noopener noreferrer" data-track-tool="rsw-cam-streams" data-placement="detroit-cams">see their current streams ↗</a>.</p></div></article>`).join('');

const season = `<div class="dr-season" data-detroit-season data-state="unknown" role="note"><span class="dr-season-kicker" data-season-kicker>Shipping season</span> <span data-season-text>The Soo Locks run from March 25 to January 15. Outside that, fewer freighters pass Detroit, but winter tug-barges and salt and coal runs keep moving.</span> <a href="/great-lakes-winter-freighter-guide/" data-track-tool="detroit-season-winter" data-placement="detroit-season">Winter guide</a></div>`;

const board = `<section class="rsw-board rsw-embed" id="rswBoard" aria-labelledby="rswBoardTitle" data-state="loading" data-api="/api/freighter-ais?region=st-clair-detroit" data-max-report-age-min="10">
<p class="rsw-eyebrow">Tested estimate, not a schedule</p>
<div class="rsw-board-head"><h2 id="rswBoardTitle">Next ships at the RiverWalk and Belle Isle</h2>
<div class="rsw-tabs" role="group" aria-label="Choose a viewing spot"><button type="button" data-rsw-view="detroit-riverwalk" aria-pressed="true"><strong>Detroit RiverWalk</strong><span>Cullen Plaza, east of the RenCen</span></button><button type="button" data-rsw-view="belle-isle" aria-pressed="false"><strong>Belle Isle</strong><span>The Strand, by the Dossin museum</span></button></div></div>
<p class="rsw-status" data-rsw-status role="status" aria-live="polite">Ship windows load with JavaScript. Without it, see the live signal and viewing spots below.</p>
<ol class="rsw-list" data-rsw-list></ol>
<div class="rsw-board-foot"><button type="button" class="rsw-refresh" data-rsw-refresh>Check again</button><p class="fine">A window appears when a moving ship upriver or downriver reported in the last 10 minutes. ${evidence} Times are Eastern. For shore viewing, not navigation. Upriver at Port Huron or Marine City? <a href="/st-clair-river-ships/" data-track-tool="rsw-detroit-st-clair" data-placement="detroit-next-ships">St. Clair River Ship Watch</a>.</p></div>
</section>`;

const map = `<section class="rsw-map dr-block" data-rsw-map aria-labelledby="rswMapTitle"><div class="eyebrow">Where the ships are</div><h2 id="rswMapTitle">The river right now</h2><p class="dr-sub">Every commercial ship from the reports the board just checked, with the two viewing spots and the cameras. Tap a spot to see its next ships. Positions are each ship's latest report, not a prediction.</p><div class="rsw-map-canvas" data-rsw-map-canvas role="region" aria-label="Map of ships, viewing spots and cameras on the Detroit River"></div><ul class="rsw-legend" aria-label="Map key"><li><span class="rsw-key spot"></span>Viewing spot</li><li><span class="rsw-key forecast"></span>Ship with a window at the chosen spot</li><li><span class="rsw-key ship"></span>Other moving ship</li><li><span class="rsw-key stopped"></span>Stopped or anchored</li><li><span class="rsw-key cam"></span>Camera</li></ul><p class="rsw-map-summary" data-rsw-map-summary role="status" aria-live="polite">The map loads with JavaScript. The viewing spots are listed below.</p></section>`;

const cams = `<section class="rsw-embed-cams dr-block" aria-labelledby="rswCamsTitle"><div class="eyebrow">See the river now</div><h2 id="rswCamsTitle">Detroit River cameras</h2><p class="dr-sub">Check the water before you go, or watch a ship from the list pass by.</p><div class="rsw-cams"><article class="rsw-cam" id="cam-fort-wayne"><div class="rsw-cam-still field-camera" data-field-camera="detroit-river-fort-wayne"><p class="camera-out">Loading the camera…</p></div><div class="rsw-cam-body"><p class="rsw-kicker">Fort Wayne · still picture</p><h3>Looking up the shipping channel to the Ambassador Bridge</h3><p>A new picture from USGS about every 15 minutes, with its age shown. Ships heading to or from the RiverWalk pass through this view.</p></div></article>${streams}</div></section>`;

const nowLabel = `<div class="dr-block dr-now" id="right-now"><div class="eyebrow">Right now near the riverfront</div><h2 class="dr-now-title">Is a moving ship already close?</h2><p class="dr-sub">The Detroit Outdoors live check looks within about 12 miles of the riverfront for a named commercial ship with active reported movement and a report no older than 10 minutes. It also checks which way each ship is heading: a ship still coming toward the RiverWalk wins over a nearer one that has already passed, and a ship heading away is labelled that way.</p></div>`;

const blockA = `${A0}
${season}
${board}
${map}
${cams}
<script type="application/json" id="rswModel">${json(model)}</script><script type="application/json" id="rswCams">${json(mapCams)}</script>
${nowLabel}
${A1}`;

const blockB = `${B0}
<section class="dr-block dr-where" aria-labelledby="drWhereTitle"><div class="eyebrow">Where to stand</div><h2 id="drWhereTitle">Two public spots on the shipping channel</h2><div class="dr-places">
<article class="dr-place"><p class="rsw-kicker">Detroit RiverWalk</p><h3>Cullen Plaza</h3><p>The RiverWalk plaza with the carousel, café and restrooms, a short walk east of the Renaissance Center. Ships pass close along the U.S. side of the channel.</p><p class="rsw-address">1340 Atwater St., Detroit</p><p class="rsw-links"><a href="https://www.openstreetmap.org/?mlat=42.3297&amp;mlon=-83.0337#map=17/42.3297/-83.0337" target="_blank" rel="noopener noreferrer" data-track-tool="detroit-where-riverwalk-map" data-placement="detroit-where">Map ↗</a> <span>·</span> <a href="https://detroitriverfront.org/" target="_blank" rel="noopener noreferrer" data-track-tool="detroit-where-riverwalk-source" data-placement="detroit-where">Detroit Riverfront Conservancy ↗</a></p></article>
<article class="dr-place"><p class="rsw-kicker">Belle Isle</p><h3>The Strand, by the Dossin museum</h3><p>The island's south shore faces the channel and Windsor, beside the Dossin Great Lakes Museum. Cars need a Michigan Recreation Passport, sold at the park; arriving on foot, by bike or by transit needs none.</p><p class="rsw-address">100 Strand Dr., Belle Isle, Detroit</p><p class="rsw-links"><a href="https://www.openstreetmap.org/?mlat=42.3365&amp;mlon=-82.9858#map=17/42.3365/-82.9858" target="_blank" rel="noopener noreferrer" data-track-tool="detroit-where-belle-isle-map" data-placement="detroit-where">Map ↗</a> <span>·</span> <a href="https://www.michigan.gov/recsearch/parks/belleisle" target="_blank" rel="noopener noreferrer" data-track-tool="detroit-where-belle-isle-source" data-placement="detroit-where">Belle Isle Park ↗</a></p></article>
</div></section>
${B1}`;

let html = fs.readFileSync(PAGE, 'utf8');
const cut = (h, a, b) => h.includes(a) ? h.slice(0, h.indexOf(a)).replace(/\n$/, '') + h.slice(h.indexOf(b) + b.length) : h;
html = cut(html, A0, A1);
html = cut(html, B0, B1);

html = html.replace(OLD_LEDE, LEDE);
if (!html.includes(LEDE)) throw new Error('Lede not found');
html = html.replace(LEDE, LEDE + '\n' + blockA);

const editorial = '<section class="editorial-read" id="intent-editorial"';
if (!html.includes(editorial)) throw new Error('Insertion point not found: ' + editorial);
html = html.replace(editorial, blockB + '\n' + editorial);

// Fold the method panels; every word stays in the page.
if (!html.includes(M0)) {
  const g0 = html.indexOf('<section class="content-grid">'), g1 = html.indexOf('</section>', g0) + '</section>'.length;
  if (g0 < 0) throw new Error('content-grid not found');
  html = html.slice(0, g0) + `${M0}<details class="dr-method"><summary>How the live signal decides</summary>` + html.slice(g0, g1) + `</details>${M1}` + html.slice(g1);
}

// This page in the shared Detroit nav: mark it current instead of linking to itself as a peer.
html = html.replace('<a class="intent-link" data-detroit-growth href="/detroit-river-freighters/">', '<a class="intent-link" data-detroit-growth href="/detroit-river-freighters/" aria-current="page">');

html = html.replace(/<link rel="stylesheet" href="\/assets\/river-ship-watch\.css\?v=[^"]*">\n?/g, '');
html = html.replace('<link rel="stylesheet" href="/assets/detroit-intent.css?v=20260922a">', m => m + '\n' + CSS);
html = html.replace(/<script src="\/assets\/(river-passage|river-ship-watch|river-ship-map|field-camera|river-cams|detroit-river-page)\.js(\?v=[^"]*)?" defer><\/script>/g, '');
html = html.replace(/(<script src="\/assets\/detroit-freighter-relation\.js\?v=20260924a" defer><\/script>)\n(\s*\n)*/, '$1\n' + JS + '\n');
fs.writeFileSync(PAGE, html);
console.log('Detroit page laid out:', evidence);
