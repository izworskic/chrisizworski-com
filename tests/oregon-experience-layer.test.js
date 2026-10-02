import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => readFileSync(path.join(root, rel), 'utf8');
const app = read('public/national-tools/coastal/oregon/app.js');
const css = read('public/national-tools/coastal/oregon/styles.css');
const pages = [
  'public/national-tools/coastal/oregon/index.html',
  'public/national-tools/coastal/oregon/yaquina-head/index.html',
  'public/national-tools/coastal/oregon/haystack-rock/index.html',
  'public/national-tools/coastal/oregon/hug-point/index.html',
  'public/national-tools/coastal/oregon/thors-well/index.html'
].map(read);

function lossTerms() {
  const decisionIndex = app.indexOf('class=\"panel decision-panel\"');
  const experienceIndex = app.indexOf('${experiencePanel(site,data.date)}');
  const D = Number(decisionIndex < 0 || experienceIndex < 0 || decisionIndex > experienceIndex);
  const T = Number(![
    'blm.gov/visit/yaquina-head-outstanding-natural-area',
    'haystackrockawareness.com/planning-your-visit',
    'stateparks.oregon.gov/index.cfm?do=park.profile&parkId=137',
    'yachatsoregon.org/295/Thors-Well'
  ].every(source => app.includes(source)));
  const S = Number(app.includes('safe_until') || app.includes('safeUntil') || /safe until\s+\d/i.test(app) || /Thor.{0,40}(guaranteed|exact) spectacle window/i.test(app));
  const O = Number(!app.includes('What this becomes when you arrive') || !app.includes('Use today’s signal') || !app.includes('What to notice'));
  const G = Number(pages.some(html => /\b(must-see|hidden gem|perfect day|bucket list)\b/i.test(html)));
  const M = Number(!css.includes('.experience-grid{grid-template-columns:1fr}') || !css.includes('@media(max-width:430px)'));
  const P = Number(!app.includes('Experience context explains the outing. It does not alter the decision status above.'));
  const F = Number(!app.includes('If it doesn’t line up') || !app.includes('fallback'));
  const B = Number((app.match(/experience-scene/g) || []).length < 2);
  return { D, T, S, O, G, M, P, F, B };
}

test('experience-layer hard gates and weighted loss are zero', () => {
  const t = lossTerms();
  const hardLoss = t.D + t.T + t.S;
  const weightedLoss = 6*t.D + 6*t.T + 6*t.S + 5*t.O + 4*t.G + 3*t.M + 2*t.P + 2*t.F + t.B;
  assert.equal(hardLoss, 0, `hard experience-layer loss must be zero: ${JSON.stringify(t)}`);
  assert.equal(weightedLoss, 0, `weighted experience-layer loss must be zero: ${JSON.stringify(t)}`);
});

test('decision remains before experience on detail pages', () => {
  const decisionIndex = app.indexOf('class=\"panel decision-panel\"');
  const experienceIndex = app.indexOf('${experiencePanel(site,data.date)}');
  assert.ok(decisionIndex >= 0 && experienceIndex > decisionIndex);
});

test('Yaquina preserves authority semantics and supports multiple official windows', () => {
  assert.match(app, /officialWindowsText/);
  assert.match(app, /windows\.map\(windowText\)/);
  assert.match(app, /will not replace missing, stale or conflicting BLM guidance with a generic tide formula/);
});

test('Haystack experience uses HRAP visitor guidance without changing the threshold', () => {
  assert.match(app, /60–90 minutes before predicted low tide/);
  assert.match(app, /published 1\.0 ft threshold/);
  assert.match(app, /beach interpreters may be present/);
});

test('Hug Point remains conservative while explaining why lower tide matters', () => {
  assert.match(app, /seasonal waterfall, sandstone caves, tidepools and the old stagecoach wheel ruts/);
  assert.match(app, /not as a deadline/);
  assert.match(app, /no exact safe-until time is claimed/);
  assert.doesNotMatch(app, /safe_until|safeUntil/);
});

test("Thor's Well stays research-only and sequence-oriented", () => {
  assert.match(app, /fill → surge → drain/);
  assert.match(app, /does not turn high tide alone into a viewing promise/);
  assert.match(app, /does not convert those inputs into an exact spectacle time/);
  assert.match(app, /No spectacle window is published until calibration evidence supports one/);
});

test('all five pages load the experience-layer asset version', () => {
  for (const html of pages) {
    assert.match(html, /styles\.css\?v=20261002c/);
    assert.match(html, /app\.js\?v=20261002c/);
  }
});
