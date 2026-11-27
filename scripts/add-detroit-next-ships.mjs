#!/usr/bin/env node
// Adds (or refreshes) the "Next ships at the RiverWalk and Belle Isle" box on the static
// /detroit-river-freighters/ page. Additive only: it sits directly below the page's existing live
// answer and never edits that answer, its scripts or its 10-minute rule.
//
// The windows come from data/detroit-river-freighters/passage-model.json, built from the same
// NOAA 2025 study as the St. Clair River Ship Watch (docs/ST_CLAIR_DETROIT_PASSAGE_RESEARCH.md).
// The board drops any window whose source report is older than 10 minutes, matching the page.
// Also adds "Detroit River cameras": the USGS Fort Wayne still (via the /api/field-camera allowlist)
// and BoatNerd's Belle Isle live stream (click-to-play, data/river-cameras.json).
// Idempotent: run it again after rebuilding the model or changing a camera id.
import fs from 'node:fs';

const PAGE = 'public/detroit-river-freighters/index.html';
const MODEL = 'data/detroit-river-freighters/passage-model.json';
const START = '<!-- rsw-detroit:start -->', END = '<!-- rsw-detroit:end -->';
const CSS = '<link rel="stylesheet" href="/assets/river-ship-watch.css?v=20261127d">';
const JS = '<script src="/assets/river-passage.js?v=20261127a" defer></script><script src="/assets/river-ship-watch.js?v=20261127c" defer></script><script src="/assets/field-camera.js" defer></script><script src="/assets/river-cams.js?v=20261127a" defer></script>';
const CAMS = JSON.parse(fs.readFileSync('data/river-cameras.json', 'utf8'));

const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const pct = w => Math.round(w.hitRate * 100);
const rw = model.windows['detroit-riverwalk'], bi = model.windows['belle-isle'];
if (!rw || !rw['0-2h'] || !bi || !bi['0-2h']) throw new Error('Detroit model is missing a released 0-2h window');

const evidence = `Tested on held-out 2025 days: RiverWalk ${pct(rw['0-2h'])}% of ${rw['0-2h'].testPassages} passages inside ±${Math.round(rw['0-2h'].halfWidthMin)} min up to 2 hours ahead` +
  (rw['2-6h'] ? ` and ${pct(rw['2-6h'])}% inside ±${Math.round(rw['2-6h'].halfWidthMin)} min at 2 to 6 hours` : '') +
  `; Belle Isle ${pct(bi['0-2h'])}% of ${bi['0-2h'].testPassages} inside ±${Math.round(bi['0-2h'].halfWidthMin)} min up to 2 hours ahead.`;

const attr = v => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const streams = (CAMS.pages['detroit-river-freighters'] || []).map(c => `<article class="rsw-cam" id="cam-${c.id}" data-river-cam data-yt="${attr(c.youtube)}" data-title="${attr(c.label)}"><div class="rsw-cam-stage" data-river-cam-stage><p class="rsw-cam-fallback"><a href="https://www.youtube.com/watch?v=${attr(c.youtube)}" target="_blank" rel="noopener noreferrer" data-track-tool="rsw-cam-${c.id}" data-placement="detroit-cams">Watch the ${attr(c.short)} camera on YouTube ↗</a></p></div><div class="rsw-cam-body"><p class="rsw-kicker">${attr(c.short)} · live video</p><h3>${attr(c.label)}</h3><p>Camera by <a href="${attr(CAMS.operatorUrl)}" target="_blank" rel="noopener noreferrer">${attr(CAMS.operator)}</a>, streamed on YouTube. Nothing loads until you press play. If it says offline, <a href="${attr(CAMS.channelStreamsUrl)}" target="_blank" rel="noopener noreferrer" data-track-tool="rsw-cam-streams" data-placement="detroit-cams">see their current streams ↗</a>.</p></div></article>`).join('');
const camSection = `<section class="rsw-embed-cams" aria-labelledby="rswCamsTitle"><div class="eyebrow">See the river now</div><h2 id="rswCamsTitle">Detroit River cameras</h2><p>Check the water before you go, or watch a ship from the list above pass by.</p><div class="rsw-cams"><article class="rsw-cam" id="cam-fort-wayne"><div class="rsw-cam-still field-camera" data-field-camera="detroit-river-fort-wayne"><p class="camera-out">Loading the camera…</p></div><div class="rsw-cam-body"><p class="rsw-kicker">Fort Wayne · still picture</p><h3>Looking up the shipping channel to the Ambassador Bridge</h3><p>A new picture from USGS about every 15 minutes, with its age shown. Ships heading to or from the RiverWalk pass through this view.</p></div></article>${streams}</div></section>`;
const block = `${START}
<section class="rsw-board rsw-embed" id="rswBoard" aria-labelledby="rswBoardTitle" data-state="loading" data-api="/api/freighter-ais?region=st-clair-detroit" data-max-report-age-min="10">
<p class="rsw-eyebrow">Tested estimate, not a schedule</p>
<div class="rsw-board-head"><h2 id="rswBoardTitle">Next ships at the RiverWalk and Belle Isle</h2>
<div class="rsw-tabs" role="group" aria-label="Choose a viewing spot"><button type="button" data-rsw-view="detroit-riverwalk" aria-pressed="true"><strong>Detroit RiverWalk</strong><span>Downtown, by Hart Plaza</span></button><button type="button" data-rsw-view="belle-isle" aria-pressed="false"><strong>Belle Isle</strong><span>South shore of the island</span></button></div></div>
<p class="rsw-intro">The live answer above says whether a ship is near the riverfront right now. This box looks further ahead: when a moving ship is upriver or downriver, it estimates a window for it to pass each spot, using only reports from the last 10 minutes.</p>
<p class="rsw-status" data-rsw-status role="status" aria-live="polite">Ship windows load with JavaScript. Without it, use the live answer above.</p>
<ol class="rsw-list" data-rsw-list></ol>
<div class="rsw-board-foot"><button type="button" class="rsw-refresh" data-rsw-refresh>Check again</button><p class="fine">${evidence} Times are Eastern. For shore viewing, not navigation. Upriver at Port Huron or Marine City? <a href="/st-clair-river-ships/" data-track-tool="rsw-detroit-st-clair" data-placement="detroit-next-ships">St. Clair River Ship Watch</a>.</p></div>
</section>
${camSection}
<script type="application/json" id="rswModel">${json(model)}</script>
${END}`;

let html = fs.readFileSync(PAGE, 'utf8');
if (html.includes(START)) {
  html = html.slice(0, html.indexOf(START)) + block + html.slice(html.indexOf(END) + END.length);
} else {
  const anchor = '<section class="editorial-read" id="intent-editorial"';
  if (!html.includes(anchor)) throw new Error('Insertion point not found: ' + anchor);
  html = html.replace(anchor, block + '\n' + anchor);
}
html = html.replace(/<link rel="stylesheet" href="\/assets\/river-ship-watch\.css\?v=[^"]*">\n?/, '');
html = html.replace('<link rel="stylesheet" href="/assets/detroit-intent.css?v=20260922a">', m => m + '\n' + CSS);
html = html.replace(/<script src="\/assets\/river-passage\.js\?v=[^"]*" defer><\/script><script src="\/assets\/river-ship-watch\.js\?v=[^"]*" defer><\/script>\n?/, '');
html = html.replace('<script src="/assets/detroit-freighter-relation.js?v=20260924a" defer></script>', m => m + '\n' + JS);
fs.writeFileSync(PAGE, html);
console.log('Detroit next-ships box written:', evidence);
