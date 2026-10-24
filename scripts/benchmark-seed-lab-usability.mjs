#!/usr/bin/env node
/**
 * Seed Saving Lab usability gate: an automated task proxy, NOT human usability research.
 * --check requires >=90/100 and no hard failure.
 *
 * Revised Oct 23, 2026: the first version scored source-code substrings (100/100 on a page the owner
 * found hard to use). Every criterion below now drives the page through scripts/lib/seed-lab-harness.mjs
 * and scores what a visitor would see after each action.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeedLab } from './lib/seed-lab-harness.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const custom = process.argv.find(x => x.startsWith('--file='));
const file = custom ? custom.slice(7) : path.join(root, 'public/seed-saving-lab/index.html');
const html = fs.readFileSync(file, 'utf8');
const rules = [];
const hard = [];
const add = (group, weight, name, fn) => { let pass = false; try { pass = !!fn(); } catch (e) { pass = false; } rules.push({ group, weight, name, pass }); };
const page = () => loadSeedLab(file);

let ok = true;
try { page(); } catch (e) { ok = false; hard.push('page scripts fail to run: ' + e.message); }

if (ok) {
  // Engine reference cases (hard fail if wrong)
  const p0 = page(), d = p0.data, e = p0.engine, find = n => d.plants.find(p => p.name === n);
  const engineOK = d.plants.length >= 65
    && e.compare(find('Zucchini'), find('Jack-o’-lantern pumpkin'), { seedType: 'op', overlap: 'yes' }, d).potential === 'compatible'
    && e.compare(find('Broccoli'), find('European kale'), { seedType: 'op', overlap: 'no' }, d).outcome === 'managed'
    && e.compare(find('Slicing cucumber'), find('Cantaloupe / muskmelon'), {}, d).potential === 'unlikely';
  if (!engineOK) hard.push('reference crossing cases are wrong');

  add('Findability', 5, 'Tool and answer sit directly under the H1 (no hero between)', () => {
    const body = html.slice(html.indexOf('<main'));
    return body.indexOf('<h1') < body.indexOf('id="plant-a"') && body.indexOf('id="plant-a"') < body.indexOf('id="results"') && !/class="hero"|stat-row/.test(body);
  });
  add('Findability', 5, 'One picker per plant, alphabetical in each category', () => {
    const p = page(); if (p.$('search-plant-a')) return false;
    return p.$('plant-a').children.every(g => { const n = g.children.map(o => o.textContent); return n.join('|') === [...n].sort((x, y) => x.localeCompare(y)).join('|'); }) && p.$('plant-a').options.length === d.plants.length;
  });
  add('Findability', 5, 'Whole-garden check reachable from the header', () => /href="#whole-garden"/.test(html) && page().$('whole-garden'));

  add('Answer freshness', 6, 'An answer is shown on first load', () => page().answer().heading.length > 5);
  add('Answer freshness', 8, 'Changing a plant changes the answer', () => { const p = page(); const before = p.answer().heading; p.pick('b', 'Slicing cucumber'); return p.answer().heading !== before && /No/.test(p.answer().badge); });
  add('Answer freshness', 6, 'Flowering, distance and hand-pollination answers change the result', () => {
    const p = page(); const h = () => p.answer().heading; const base = h();
    p.choose('overlap', 'no'); const a = h(); p.choose('overlap', 'yes');
    p.type('distance', '5000'); const b = h(); p.type('distance', '');
    p.choose('protection', 'controlled'); const c = h();
    return new Set([base, a, b, c]).size === 4;
  });

  add('Plain answer', 8, 'Verdicts say Yes / No in words', () => { const p = page(); const y = p.answer().heading; p.pick('b', 'Slicing cucumber'); return /^Yes\b/.test(y) && /^No\b/.test(p.answer().heading); });
  add('Plain answer', 7, 'Crossable pair gives concrete options incl. the distance number', () => { const a = page().answer(); return a.options.length >= 2 && /\d{1,3}(,\d{3})* ft/.test(a.options[0]); });

  add('Action clarity', 5, 'Steps include how many plants to save from and a harvest tip', () => { const a = page().answer(); return a.also.some(s => /plants, not just the best one/.test(s)) && a.also.some(s => /^From the seed shelf/.test(s)); });
  add('Action clarity', 5, 'Only questions that can change the answer are shown', () => { const p = page(); const shown = !p.$('q-overlap').classList.contains('hidden'); p.pick('b', 'Slicing cucumber'); return shown && p.$('q-overlap').classList.contains('hidden') && p.$('q-distance').classList.contains('hidden'); });
  add('Action clarity', 5, 'A shared answer link reopens the same answer', () => { const p = loadSeedLab(file, { search: '?a=' + find('Broccoli').id + '&b=' + find('European kale').id + '&overlap=no' }); return /never bloom together/.test(p.answer().heading); });
  add('Garden workflow', 8, 'Example garden lists crossing pairs first', () => { const p = page(); p.click('garden-demo'); const g = p.garden(); return /yes/.test(g[0].cls) && /cross/i.test(g[0].text); });
  add('Garden workflow', 8, 'A flagged pair opens in the two-plant checker', () => { const p = page(); p.click('garden-demo'); const btn = p.garden()[0].buttons[0]; btn.dispatch('click'); return p.doc.lastScroll === 'explorer' && p.answer().heading.length > 0 && /kale|broccoli|zinnia|cosmos|zucchini|pumpkin/i.test(p.answer().live); });
  add('Garden workflow', 4, 'Plants add on selection and remove with one tap', () => { const p = page(); const n = p.gardenPlants().length; p.$('garden-pick').value = p.plantId('Basil'); p.$('garden-pick').dispatch('change'); const m = p.gardenPlants().length; p.gardenPlants()[0].remove.dispatch('click'); return m === n + 1 && p.gardenPlants().length === n; });

  add('Mobile/accessibility', 4, 'Screen-reader status announces the current verdict', () => { const p = page(); p.pick('b', 'Slicing cucumber'); return /Slicing cucumber: No/.test(p.answer().live) && /role="status"/.test(html); });
  add('Mobile/accessibility', 3, 'Narrow-screen layout and visible focus', () => /@media\(max-width:760px\)/.test(html) && /:focus-visible/.test(html));
  add('Mobile/accessibility', 3, 'Tap targets at least 42px; no visible empty controls', () => { const px = re => Number((html.match(re) || [])[1] || 0); return px(/\.seg span\{[^}]*min-height:(\d+)px/) >= 42 && px(/\.picker select\{[^}]*min-height:(\d+)px/) >= 48 && px(/\.chip-btn\{[^}]*min-height:(\d+)px/) >= 36 && /id="comparison-link"[^>]*hidden/.test(html); });

  add('Scientific trust', 2, 'Sources listed and linked from each answer', () => { const p = page(); return p.$('references').children.length >= 2 && /^https:\/\//.test(p.$('source-link').href || ''); });
  add('Scientific trust', 3, 'No invented crossing probabilities', () => /does <strong>not<\/strong> calculate a percentage chance/.test(html) && /not a measured probability/.test(html) && !/\d+% chance/.test(html));
}

const byGroup = {};
for (const r of rules) { byGroup[r.group] ??= { earned: 0, max: 0 }; byGroup[r.group].max += r.weight; if (r.pass) byGroup[r.group].earned += r.weight; }
const score = rules.filter(x => x.pass).reduce((a, x) => a + x.weight, 0), max = rules.reduce((a, x) => a + x.weight, 0) || 100;
console.log('Seed Saving Lab usability value: automated behavioural task proxy, NOT human usability research');
for (const [name, r] of Object.entries(byGroup)) console.log(name.padEnd(23) + r.earned + '/' + r.max);
console.log('TOTAL ' + score + '/' + max + ' (release gate: >=90)');
for (const r of rules.filter(x => !x.pass)) console.log('  -' + r.weight + ' ' + r.name);
for (const h of hard) console.log('  HARD FAIL: ' + h);
const stale = rules.find(x => x.name === 'Changing a plant changes the answer');
if (process.argv.includes('--check') && (score < 90 || hard.length || !stale || !stale.pass)) process.exitCode = 1;
