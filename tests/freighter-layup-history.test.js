'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const archive = JSON.parse(read('public/assets/freighter-layup-registry.json'));
const history = JSON.parse(read('public/assets/freighter-layup-history.json'));
const html = read('public/great-lakes-freighter-winter-layup/index.html');
const script = read('public/assets/freighter-layup-history.js');
const css = read('public/assets/freighter-winter-home.css');

test('Python historical artifact is a source-only subset, not a winter forecast', () => {
  assert.equal(history.schemaVersion, 1);
  assert.equal(history.status, 'PARTIAL');
  assert.equal(history.notFleetCensus, true);
  assert.match(history.coverageNote, /not a full fleet census/i);
  assert.equal(history.recordCount, history.seasons.reduce((n, s) => n + s.vessels.length, 0));
  assert.equal(history.uniqueVesselCount, new Set(history.seasons.flatMap(s => s.vessels.map(v => v.key))).size);
  assert.ok(history.seasons.every(s => s.vessels.length >= 0 &&
    s.recordCount === archive.seasons.find(a => a.id === s.id)?.records.length &&
    archive.seasons.find(a => a.id === s.id)?.state === 'historical_snapshot'));
  assert.equal(history.seasons.find(x => x.id === '2026-27'), undefined);
  for (const season of history.seasons) for (const v of season.vessels) {
    const record = archive.seasons.find(s => s.id === season.id).records.find(r => r.identity?.key === v.key);
    assert.equal(v.status, record.status);
    assert.equal(v.asOf, record.statusAsOf);
    assert.equal(v.harborId, record.harborId);
    assert.equal(v.source.url, record.evidence.url);
    assert.deepEqual(v.events.map(e => e.date), record.events.map(e => e.date).sort());
  }
});

test('history is crawlable source-linked HTML, with no speculative last-winter carryover', () => {
  assert.equal((html.match(/<!-- WINTER_FLEET_HISTORY:START -->/g) || []).length, 1);
  assert.equal((html.match(/<!-- WINTER_FLEET_HISTORY:END -->/g) || []).length, 1);
  assert.equal((html.match(/class="history-vessel" /g) || []).length, history.recordCount);
  assert.equal((html.match(/class="history-season-panel"/g) || []).length, history.seasons.length);
  for (const season of history.seasons) for (const v of season.vessels) {
    assert.ok(html.includes('data-history-vessel="' + v.key + '"'));
    assert.ok(html.includes('href="' + v.source.url.replaceAll('&', '&amp;') + '"'));
  }
  assert.ok(html.includes('id="winter-fleet-history"'));
  assert.ok(html.includes('Record as of'));
  assert.ok(html.includes('not a full fleet census'));
  assert.ok(html.includes('data-history-enhanced="false"'));
  assert.ok(!html.includes('predicted berth'));
  assert.equal(history.seasons.length, archive.seasons.filter(s=>s.state==='historical_snapshot').length);
});

test('season and harbor changes use one accessible, reversible selection state', () => {
  assert.ok(script.includes('activeSeason = button.dataset.historyPick'));
  assert.ok(script.includes("harbor.value = 'all'"));
  assert.ok(script.includes("harbor.addEventListener('change', update)"));
  assert.ok(script.includes("button.setAttribute('aria-pressed'"));
  assert.ok(script.includes('v.hidden = !show'));
  assert.match(css, /data-history-enhanced="true"/);
  assert.match(css, /\.history-vessel-list/);
  assert.match(css, /@media\(max-width:620px\)/);
  assert.match(html,/\/assets\/freighter-layup-history\.js\?v=[a-zA-Z0-9-]+/);
});

test('existing canonical, author, H1 and the sole winter sitemap entry remain intact', () => {
  const canonical = 'https://chrisizworski.com/great-lakes-freighter-winter-layup/';
  assert.ok(html.includes('<link rel="canonical" href="' + canonical + '">'));
  assert.match(html, /<h1 id="page-title">When the giants<br><em>come in from the cold\.<\/em><\/h1>/);
  assert.ok(html.includes('Built by <a href="/chris-izworski/">Chris Izworski</a>.'));
  const winter = read('public/sitemap-winter.xml');
  assert.equal((winter.match(new RegExp('<loc>' + canonical + '</loc>', 'g')) || []).length, 1);
  const modified=html.match(/"dateModified":"(\d{4}-\d{2}-\d{2})"/)?.[1];
  assert.ok(modified,'valid existing page modification date');
  assert.ok(winter.includes('<loc>'+canonical+'</loc><lastmod>'+modified+'</lastmod>'),
    'the single winter sitemap entry must match page dateModified');
});
