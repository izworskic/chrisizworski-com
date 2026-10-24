// Behaviour of the Michigan garden tools as a visitor sees them, on fixed dates.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTool } from '../scripts/lib/garden-tool-harness.mjs';

const f = r => `public/${r}/index.html`;

test('planting calendar: this week, crop lookup and old links', () => {
  const p = loadTool(f('zone-6a-planting-calendar'), { today: '2026-03-10' });
  assert.equal(p.text('weekBadge'), 'In season now');
  assert.match(p.text('weekTitle'), /near Bay City/);
  assert.match(p.text('weekNow'), /Start tomatoes indoors/);
  assert.match(p.text('cropTitle'), /Tomatoes near Bay City/);
  const old = loadTool(f('zone-6a-planting-calendar'), { search: '?city=grayling&safe=1' });
  assert.equal(old.$('citySel').value, 'grayling');
  assert.ok(old.$('timeline').children.length > 20);
  assert.match(old.text('frostFacts'), /Cautious date/);
  const quiet = loadTool(f('zone-6a-planting-calendar'), { today: '2026-01-05' });
  assert.equal(quiet.text('weekBadge'), 'A quiet week');
  assert.match(quiet.text('weekWhy'), /Next up: start onions from seed indoors/);
});

test('frost dates: plain odds for a planting day, past-frost and fall answers', () => {
  const p = loadTool(f('michigan-frost-dates'), { today: '2026-04-20' });
  assert.match(p.text('frostTitle'), /^In Bay City, plant tender crops after May 9\./);
  assert.equal(p.text('riskBadge'), 'Too early for tender plants');
  p.set('plantDate', '2026-05-12');
  assert.match(p.text('riskTitle'), /May 12: a frost still comes later in about 1 spring in 5/);
  p.set('plantDate', '2026-06-10');
  assert.equal(p.text('riskBadge'), 'Past spring frost');
  const fall = loadTool(f('michigan-frost-dates'), { today: '2026-10-24' });
  assert.equal(fall.text('riskBadge'), 'Past first fall frost');
  assert.equal((p.html.match(/<tr data-n=/g) || []).length, 78, 'the full station table stays');
});

test('tomato check: windows in order, readings decide go or wait', () => {
  const p = loadTool(f('when-to-plant-tomatoes-michigan'), { today: '2026-05-20' });
  assert.match(p.text('tTitle'), /tomato planting time near Bay City/);
  p.set('tSoil', '56', 'input');
  assert.equal(p.text('tBadge'), 'Wait for warmer soil');
  p.set('tSoil', '62', 'input'); p.set('tLow', '55', 'input');
  assert.equal(p.text('tBadge'), 'Plant today');
  assert.match(p.html, /id="tomato-quick-answer"/);
});

test('seed starting guide: zone answer, own frost date, fixed zone 6a data', () => {
  const p = loadTool(f('seed-starting-guide'), { today: '2026-04-20' });
  assert.match(p.text('ssTitle'), /^Zone 6a:/);
  assert.match(p.text('ssFacts'), /Apr 18/);
  p.set('ssLF', '2026-05-20');
  assert.match(p.text('ssTitle'), /^With a last frost of May 20:/);
  assert.doesNotMatch(p.$('tableArea').textContent, />, </);
});

test('matchmaker: instant picks in the browser, link restores answers', () => {
  const p = loadTool(f('heirloom-variety-matchmaker'));
  assert.equal(p.texts('.mm-card').length, 3);
  p.choose('space', 'balcony');
  const q = loadTool(f('heirloom-variety-matchmaker'), { search: p.doc.replaced.at(-1) });
  assert.equal(q.text('mmTitle'), p.text('mmTitle'));
  assert.doesNotMatch(p.html, /fetch\('\/api\/matchmaker'/);
});
