#!/usr/bin/env node
// Adds (or refreshes) the "Next ships at the RiverWalk and Belle Isle" box on the static
// /detroit-river-freighters/ page. Additive only: it sits directly below the page's existing live
// answer and never edits that answer, its scripts or its 10-minute rule.
//
// The windows come from data/detroit-river-freighters/passage-model.json, built from the same
// NOAA 2025 study as the St. Clair River Ship Watch (docs/ST_CLAIR_DETROIT_PASSAGE_RESEARCH.md).
// The board drops any window whose source report is older than 10 minutes, matching the page.
// Idempotent: run it again after rebuilding the model.
import fs from 'node:fs';

const PAGE = 'public/detroit-river-freighters/index.html';
const MODEL = 'data/detroit-river-freighters/passage-model.json';
const START = '<!-- rsw-detroit:start -->', END = '<!-- rsw-detroit:end -->';
const CSS = '<link rel="stylesheet" href="/assets/river-ship-watch.css?v=20261127b">';
const JS = '<script src="/assets/river-passage.js?v=20261127a" defer></script><script src="/assets/river-ship-watch.js?v=20261127b" defer></script>';

const model = JSON.parse(fs.readFileSync(MODEL, 'utf8'));
const json = v => JSON.stringify(v).replace(/</g, '\\u003c');
const pct = w => Math.round(w.hitRate * 100);
const rw = model.windows['detroit-riverwalk'], bi = model.windows['belle-isle'];
if (!rw || !rw['0-2h'] || !bi || !bi['0-2h']) throw new Error('Detroit model is missing a released 0-2h window');

const evidence = `Tested on held-out 2025 days: RiverWalk ${pct(rw['0-2h'])}% of ${rw['0-2h'].testPassages} passages inside ±${Math.round(rw['0-2h'].halfWidthMin)} min up to 2 hours ahead` +
  (rw['2-6h'] ? ` and ${pct(rw['2-6h'])}% inside ±${Math.round(rw['2-6h'].halfWidthMin)} min at 2 to 6 hours` : '') +
  `; Belle Isle ${pct(bi['0-2h'])}% of ${bi['0-2h'].testPassages} inside ±${Math.round(bi['0-2h'].halfWidthMin)} min up to 2 hours ahead.`;

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
