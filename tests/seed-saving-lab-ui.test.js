// Behaviour of the Seed Saving Lab page as a visitor sees it, run against a small DOM stand-in.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadSeedLab } from '../scripts/lib/seed-lab-harness.mjs';

const FILE = 'public/seed-saving-lab/index.html';

test('opens with a plain answer for a real pair, before any input', () => {
  const p = loadSeedLab(FILE);
  const a = p.answer();
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'Zucchini');
  assert.equal(a.badge, 'Can cross');
  assert.equal(a.heading, 'Yes, these can cross.');
  assert.match(a.why, /Cucurbita pepo/);
  assert.equal(a.options.length, 3, 'three ways to keep the seed true');
  assert.match(a.options[0], /1,600 ft/);
  assert.match(a.options[1], /Do the bee’s work yourself/);
  assert.ok(a.also.some(s => /10–20 plants/.test(s)), 'population guidance');
  assert.match(a.live, /Zucchini and Pumpkin: Yes, these can cross\./);
  assert.doesNotMatch(JSON.stringify(a), /\[object|undefined|NaN/);
});

test('one picker per plant, alphabetical within each category', () => {
  const p = loadSeedLab(FILE);
  for (const id of ['plant-a', 'plant-b', 'garden-pick']) assert.ok(p.$(id), id);
  assert.equal(p.$('search-plant-a'), undefined, 'no second search box per plant');
  const groups = p.$('plant-a').children;
  assert.deepEqual(groups.map(g => g.label), ['Vegetables', 'Flowers', 'Herbs']);
  for (const g of groups) {
    const names = g.children.map(o => o.textContent);
    assert.deepEqual(names, [...names].sort((x, y) => x.localeCompare(y)));
  }
  assert.equal(p.$('plant-a').options.length, p.data.plants.length);
});

test('every change updates the answer immediately (no stale verdicts)', () => {
  const p = loadSeedLab(FILE);
  p.pick('b', 'Cucumber');
  assert.equal(p.answer().heading, 'No, these do not normally cross.');
  assert.equal(p.$('q-overlap').classList.contains('hidden'), true, 'irrelevant questions hidden');
  p.pick('b', 'Pumpkin');
  assert.equal(p.answer().heading, 'Yes, these can cross.');
  assert.equal(p.$('q-overlap').classList.contains('hidden'), false);
  p.type('distance', '2000');
  assert.equal(p.answer().badge, 'Lower risk');
  assert.match(p.text('distance-copy'), /yours meets it/);
  p.type('distance', '');
  p.choose('protection', 'controlled');
  assert.equal(p.answer().badge, 'Protected');
  p.choose('protection', 'open');
  p.choose('overlap', 'no');
  assert.match(p.answer().heading, /never bloom together/);
  p.choose('overlap', 'unknown');
  assert.match(p.answer().heading, /if they bloom at the same time/);
  p.choose('overlap', 'yes');
  p.choose('goal', 'explore');
  assert.match(p.answer().heading, /happy to see what happens/);
  p.choose('goal', 'preserve');
  p.click('swap');
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'Pumpkin');
  assert.match(p.answer().options[1], /Cover a few pumpkin flowers/i);
});

test('examples and documented exceptions read plainly', () => {
  const p = loadSeedLab(FILE);
  p.example('melon');
  assert.equal(p.answer().badge, 'No');
  p.example('brassicas');
  assert.equal(p.answer().heading, 'Yes, these can cross.');
  p.pick('a', 'French marigold'); p.pick('b', 'African marigold');
  assert.equal(p.answer().badge, 'Rarely');
  p.pick('a', 'Zucchini'); p.pick('b', 'Zucchini');
  assert.equal(p.answer().badge, 'Can cross', 'the same crop twice means two varieties of it');
  assert.match(p.answer().why, /Two varieties of zucchini/);
  p.pick('a', 'Tomato'); p.pick('b', 'Tomato');
  assert.equal(p.answer().heading, 'Yes, but not often.', 'mostly self-pollinating crops say so');
});

test('whole garden: crossing pairs first, open one in the checker, remove plants', () => {
  const p = loadSeedLab(FILE);
  p.click('garden-demo');
  const groups = p.garden();
  assert.match(groups[0].cls, /yes/);
  assert.match(groups[0].text, /Kale \(curly \/ European\) \+ Broccoli/);
  assert.match(groups.at(-1).text, /Won’t normally cross/);
  const open = groups[0].buttons.find(b => /Open in checker/.test(b.textContent));
  open.dispatch('click');
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'Kale (curly / European)');
  assert.equal(p.$('plant-b').selectedOptions[0].textContent, 'Broccoli');
  assert.equal(p.doc.lastScroll, 'explorer');
  const before = p.gardenPlants().length;
  p.gardenPlants()[0].remove.dispatch('click');
  assert.equal(p.gardenPlants().length, before - 1);
  p.$('garden-pick').value = p.plantId('Basil');
  p.$('garden-pick').dispatch('change');
  assert.ok(p.gardenPlants().some(x => x.name === 'Basil'), 'choosing a plant adds it');
  assert.ok(!p.$('garden-pick').options.some(o => o.textContent === 'Basil'), 'added plants leave the picker');
});

test('shared links restore the answer and the garden; junk is ignored', () => {
  const p = loadSeedLab(FILE, { search: '?a=plant-broccoli&b=plant-european-kale&overlap=no&distance=50&g=plant-zucchini:y,plant-butternut-squash:u,nope:y' });
  assert.match(p.answer().heading, /never bloom together/);
  assert.deepEqual(p.gardenPlants().map(x => x.name), ['Zucchini', 'Butternut squash']);
  const junk = loadSeedLab(FILE, { search: '?a=<script>&b=x&distance=abc' });
  assert.equal(junk.answer().heading, 'Yes, these can cross.');
});

test('charts: distance slider and number stay in step, and the distance chart marks guideline and you', () => {
  const p = loadSeedLab(FILE);
  const kids = () => p.$('distance-chart').descendants().map(n => n.textContent).join(' | ');
  assert.match(kids(), /Guideline 1,600 ft/);
  p.$('distance-range').value = '600';
  p.$('distance-range').dispatch('input');
  const ft = Number(p.$('distance').value);
  assert.ok(ft > 500 && ft < 700, 'log scale: slider 60% ≈ 630 ft, got ' + ft);
  assert.match(kids(), new RegExp('You ' + ft.toLocaleString('en-US') + ' ft'));
  p.type('distance', '3000');
  assert.ok(Number(p.$('distance-range').value) > 800, 'typing moves the slider');
  assert.equal(p.answer().badge, 'Lower risk');
  assert.match(p.text('pair-viz'), /Separation guideline1,600 ft/);
});

test('charts: pollen web draws a line for each crossing pair and a line opens that pair', () => {
  const p = loadSeedLab(FILE);
  p.click('garden-demo');
  const web = p.$('pollen-web');
  const edges = web.children.filter(n => n.attrs && /web-edge/.test(n.attrs.class || ''));
  const nodes = web.children.filter(n => n.attrs && /web-node/.test(n.attrs.class || ''));
  assert.equal(nodes.length, 9);
  assert.equal(edges.length, 5, '3 can-cross + 2 worth-checking pairs in the example garden');
  assert.equal(edges.filter(e => e.attrs['stroke-dasharray'] === 'none').length, 3, 'can-cross lines are solid');
  const hits = web.children.filter(n => n.attrs && n.attrs.class === 'web-hit');
  const target = hits.find(h => /Kale \(curly \/ European\) \+ Broccoli/.test(h.attrs['aria-label']));
  target.dispatch('click');
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'Kale (curly / European)');
  const kale = nodes.find(n => /Kale \(curly/.test(n.attrs['aria-label']));
  kale.dispatch('click');
  assert.match(p.$('pollen-web').children.find(n => n.attrs && /Kale \(curly/.test(n.attrs['aria-label'] || '') && /web-node/.test(n.attrs.class)).attrs.class, /active/);
});

test('charts: room chart has one bar per species with a guideline, plus a table view', () => {
  const p = loadSeedLab(FILE);
  p.click('garden-demo');
  const bars = p.$('room-chart').children.filter(n => n.attrs && /bar-row/.test(n.attrs.class || ''));
  assert.equal(bars.length, 6, '6 species in the example garden');
  assert.match(bars[0].attrs['aria-label'], /2,640 feet/, 'sorted largest first (zinnias)');
  assert.equal(bars.filter(b => /cross/.test(b.attrs.class)).length, 3, 'darker bars for species with a crossing partner');
  assert.equal(p.$('room-rows').children.length, 6);
});

test('pickers list crops, not varieties; links made with old variety names still open', () => {
  const p = loadSeedLab(FILE);
  const names = p.$('plant-a').options.map(o => o.textContent);
  assert.ok(names.includes('Tomato') && names.includes('Zinnia') && names.includes('Pepper (sweet or hot)'));
  assert.ok(!names.some(n => /Brandywine|Cherokee|Red Robin|Queen Lime|Shishito/.test(n)), 'no variety names in the picker');
  const old = loadSeedLab(FILE, { search: '?a=plant-cherokee-purple-tomato&b=plant-brandywine-tomato&g=plant-queen-lime-zinnia:y,plant-oklahoma-white-zinnia:u,plant-zucchini:u' });
  assert.equal(old.$('plant-a').selectedOptions[0].textContent, 'Tomato');
  assert.equal(old.answer().heading, 'Yes, but not often.');
  assert.deepEqual(old.gardenPlants().map(x => x.name), ['Zinnia', 'Zinnia (2nd variety)', 'Zucchini']);
  assert.match(old.garden()[0].text, /Zinnia \+ Zinnia \(2nd variety\)/);
});

test('garden: mark plants you only eat; pairs with no seed at stake step aside and links keep the marks', () => {
  const p = loadSeedLab(FILE, { search: '?g=plant-zucchini:s,plant-pumpkin:e,plant-cucumber:e,plant-cantaloupe-muskmelon:e' });
  assert.deepEqual(p.gardenPlants().map(x => x.saving), [true, false, false, false]);
  assert.match(p.garden()[0].text, /Zucchini \+ Pumpkin/);
  assert.match(p.garden()[0].text, /keep seed from the zucchini true: 1,600 ft/);
  p.gardenPlants()[0].toggle.dispatch('click');
  assert.equal(p.gardenPlants()[0].saving, false);
  assert.ok(p.garden().some(g => /No seed at stake/.test(g.text) && /Zucchini \+ Pumpkin/.test(g.text)));
  assert.equal(p.$('pollen-web').children.filter(n => /web-edge/.test(n.attrs?.class || '')).length, 0, 'no lines when nothing is at stake');
});

test('answers name the season for biennials and warn plainly about hybrid seed', () => {
  const p = loadSeedLab(FILE);
  p.pick('a', 'Carrot'); p.pick('b', 'Queen Anne’s lace (wild carrot)');
  assert.match(p.answer().also[0], /Carrot flowers in its second year/);
  p.choose('seedType', 'f1');
  assert.match(p.answer().also[0], /hybrid \(F1\) seed/);
  assert.match(p.text('next-year'), /mix of its parents/);
  assert.doesNotMatch(p.text('next-year') + p.answer().also.join(' '), /embryo|segregat|F2\b/);
});
