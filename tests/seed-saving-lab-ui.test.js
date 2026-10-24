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
  assert.match(a.live, /Zucchini and Jack-o’-lantern pumpkin: Yes, these can cross\./);
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
  p.pick('b', 'Slicing cucumber');
  assert.equal(p.answer().heading, 'No, these do not normally cross.');
  assert.equal(p.$('q-overlap').classList.contains('hidden'), true, 'irrelevant questions hidden');
  p.pick('b', 'Jack-o’-lantern pumpkin');
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
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'Jack-o’-lantern pumpkin');
  assert.match(p.answer().options[1], /Cover a few jack-o’-lantern pumpkin flowers/i);
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
  assert.equal(p.answer().badge, 'Same variety');
});

test('whole garden: crossing pairs first, open one in the checker, remove plants', () => {
  const p = loadSeedLab(FILE);
  p.click('garden-demo');
  const groups = p.garden();
  assert.match(groups[0].cls, /yes/);
  assert.match(groups[0].text, /European kale \+ Broccoli/);
  assert.match(groups.at(-1).text, /Won’t normally cross/);
  const open = groups[0].buttons.find(b => /Open in checker/.test(b.textContent));
  open.dispatch('click');
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'European kale');
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
  const target = hits.find(h => /European kale \+ Broccoli/.test(h.attrs['aria-label']));
  target.dispatch('click');
  assert.equal(p.$('plant-a').selectedOptions[0].textContent, 'European kale');
  const kale = nodes.find(n => /European kale/.test(n.attrs['aria-label']));
  kale.dispatch('click');
  assert.match(p.$('pollen-web').children.find(n => n.attrs && /European kale/.test(n.attrs['aria-label'] || '') && /web-node/.test(n.attrs.class)).attrs.class, /active/);
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
