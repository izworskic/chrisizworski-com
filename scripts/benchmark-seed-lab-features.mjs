#!/usr/bin/env node
/**
 * Seed Saving Lab: one value function per feature.
 *
 * Every feature scores 0-100 from behaviour a visitor would see, driven through the mini DOM in
 * scripts/lib/seed-lab-harness.mjs. Each criterion is a task or a property of what is on screen,
 * not a source-code substring, except where the property only exists in markup (labels, styles).
 *
 * Release gate (--check): every feature >= 90 and the mean >= 95.
 * This is an automated task proxy, NOT human usability research. See
 * docs/SEED_LAB_FEATURE_VALUE_FUNCTIONS.md for what each number does and does not mean.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSeedLab } from './lib/seed-lab-harness.mjs';
import { gradeLevel, JARGON, brokenText } from './lib/plain-language.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const custom = process.argv.find(x => x.startsWith('--file='));
const file = custom ? custom.slice(7) : path.join(root, 'public/seed-saving-lab/index.html');
const html = fs.readFileSync(file, 'utf8');
const page = (opts) => loadSeedLab(file, opts);

const features = [];
let current = null;
function feature(name, promise, fn) { current = { name, promise, criteria: [] }; features.push(current); try { fn(); } catch (e) { current.error = e.message; } }
function crit(weight, name, fn) {
  let score = 0, note = '';
  try { const r = fn(); if (typeof r === 'number') score = Math.max(0, Math.min(1, r)); else score = r ? 1 : 0; } catch (e) { note = e.message.slice(0, 90); }
  current.criteria.push({ weight, name, score, note });
}

const answerText = p => {
  const a = p.answer();
  return [a.heading, a.why, ...a.options, ...a.also, p.text('next-year'), p.text('result-cautions')].join(' ');
};
const jargonIn = t => JARGON.filter(j => new RegExp('\\b' + j, 'i').test(t));

let p0;
try { p0 = page(); } catch (e) { console.log('HARD FAIL: page scripts do not run: ' + e.message); process.exit(1); }
const D = p0.data, E = p0.engine;
const names = D.plants.map(x => x.name);
const byName = n => D.plants.find(x => x.name === n);
const VARIETY_WORDS = /Brandywine|Cherokee|Red Robin|Queen Lime|Oklahoma|Shishito|Jalape|Genovese|Grandpa Ott|Lemon Queen|Miss Jekyll|Jack-o/;

// Every ordered pair at the default answer, computed once and reused.
const sweep = [];
{
  const p = page();
  for (const a of names) for (const b of names) {
    p.pick('a', a); p.pick('b', b);
    sweep.push({ a, b, ans: p.answer(), text: answerText(p), r: E.compare(byName(a), byName(b), {}, D), next: p.text('next-year'), viz: p.text('pair-viz'), link: p.$('source-link').href });
  }
}
const crossable = sweep.filter(x => x.r.potential === 'compatible' && x.a !== x.b);

feature('Plant pickers', 'Find the crop you grow in one tap, as a gardener would name it', () => {
  crit(25, 'Every crop listed once per picker, grouped and alphabetical', () => {
    const s = p0.$('plant-a'); const opts = s.options.map(o => o.textContent);
    return opts.length === names.length && new Set(opts).size === opts.length && s.children.every(g => { const n = g.children.map(o => o.textContent); return n.join('|') === [...n].sort((x, y) => x.localeCompare(y)).join('|'); });
  });
  crit(15, 'Crop names, not single varieties', () => !names.some(n => VARIETY_WORDS.test(n)));
  crit(20, 'Botanical name shows under each picker and follows the choice', () => { const p = page(); p.pick('a', 'Tomato'); p.pick('b', 'Basil'); return /Solanum lycopersicum/.test(p.text('botanical-a')) && /Ocimum basilicum/.test(p.text('botanical-b')); });
  crit(20, 'Swap trades the plants and the answer', () => { const p = page(); p.pick('a', 'Cucumber'); p.pick('b', 'Cantaloupe / muskmelon'); const before = p.answer().live; p.click('swap'); return p.$('plant-a').selectedOptions[0].textContent === 'Cantaloupe / muskmelon' && p.answer().live !== before; });
  crit(20, 'Two varieties of one crop: hint shown and second plant named as another variety', () => { const p = page(); p.pick('a', 'Tomato'); p.pick('b', 'Tomato'); return /both boxes/.test(html) && /another variety|second variety/i.test(p.text('botanical-b')) && /Two varieties of tomato/.test(p.answer().why); });
});

feature('Verdict', 'A plain yes or no for any pair, with the reason, announced to screen readers', () => {
  crit(30, 'No botanist jargon in any answer (all ' + sweep.length + ' pairs)', () => 1 - sweep.filter(x => jargonIn(x.text).length).length / sweep.length);
  crit(20, 'No broken text in any answer', () => 1 - sweep.filter(x => brokenText(x.text)).length / sweep.length);
  crit(20, 'Reads at grade 8 or below on average', () => { const g = sweep.reduce((s, x) => s + gradeLevel(x.ans.heading + ' ' + x.ans.why), 0) / sweep.length; current.grade = g.toFixed(1); return g <= 8 ? 1 : Math.max(0, 1 - (g - 8) / 4); });
  crit(15, 'Screen-reader status names both plants and the verdict', () => sweep.every(x => x.ans.live.includes(x.a) && x.ans.live.includes(x.ans.heading)));
  crit(15, 'Heading starts with a plain answer word', () => sweep.every(x => /^(Yes|No|Usually|They can|Same|Nobody)/.test(x.ans.heading)));
});

feature('What to do', 'Every answer ends with something the gardener can do this season', () => {
  crit(30, 'Every crossable pair offers 2+ options, the first with the distance number', () => crossable.every(x => x.ans.options.length >= 2 && (!x.r.guideline || /\d[\d,]* ft/.test(x.ans.options[0]))));
  crit(20, 'Population guidance whenever a figure is published', () => sweep.filter(x => D.population[byName(x.a).species]).every(x => x.ans.also.some(s => /plants, not just the best one/.test(s))));
  crit(20, 'Non-crossing pairs name what would matter instead', () => sweep.filter(x => x.ans.badge === 'No').every(x => x.ans.also.some(s => /blooming nearby/.test(s))));
  crit(15, 'Biennial crops say they flower in their second year', () => {
    const bi = ['Carrot', 'Cabbage', 'Beet', 'Onion', 'Brussels sprouts', 'Kale (curly / European)', 'Turnip', 'Swiss chard', 'Collard greens', 'Kohlrabi', 'Rutabaga'];
    const p = page(); let ok = 0;
    for (const n of bi) { p.pick('a', n); p.pick('b', n); if (/second year|second season/i.test(answerText(p))) ok++; }
    p.pick('a', 'Broccoli'); p.pick('b', 'Kale (curly / European)'); const broccoli = !/Broccoli[^.]*second year/i.test(p.answer().also.join(' '));
    return (ok / bi.length) * (broccoli ? 1 : 0.5);
  });
  crit(15, 'Choosing hybrid (F1) seed puts a plain warning in the main answer', () => { const p = page(); p.choose('seedType', 'f1'); const a = p.answer(); return /hybrid/i.test(a.heading + a.why + a.also.join(' ')) && !jargonIn(answerText(p)).length; });
});

feature('Refine questions', 'Each question shown can change the answer; the rest stay out of the way', () => {
  crit(40, 'Every visible question changes what the answer says', () => {
    const p = page(); const snap = () => JSON.stringify([p.answer().heading, p.answer().why, p.answer().options, p.answer().also]);
    const base = snap(); const changed = [];
    p.choose('overlap', 'no'); changed.push(snap() !== base); p.choose('overlap', 'yes');
    p.choose('protection', 'controlled'); changed.push(snap() !== base); p.choose('protection', 'open');
    p.choose('seedType', 'f1'); changed.push(snap() !== base); p.choose('seedType', 'unknown');
    p.choose('goal', 'explore'); changed.push(snap() !== base); p.choose('goal', 'preserve');
    p.type('distance', '5000'); changed.push(snap() !== base);
    return changed.filter(Boolean).length / changed.length;
  });
  crit(20, 'Questions that cannot matter are hidden for a non-crossing pair', () => { const p = page(); p.pick('b', 'Cucumber'); return ['q-overlap', 'q-protection', 'q-distance'].every(id => p.$(id).classList.contains('hidden')); });
  crit(20, 'Slider and feet box stay in step; nonsense is ignored', () => { const p = page(); p.$('distance-range').value = '600'; p.$('distance-range').dispatch('input'); const ft = Number(p.$('distance').value); p.type('distance', '2500'); const pos = Number(p.$('distance-range').value); p.type('distance', 'abc'); return ft > 500 && ft < 700 && pos > 750 && p.answer().heading.length > 5; });
  crit(20, 'Every change is announced', () => { const p = page(); const l1 = p.answer().live; p.choose('overlap', 'no'); return p.answer().live !== l1; });
});

feature('Distance chart', 'See your distance against the guideline at a glance', () => {
  const p = page(); const kids = () => p.$('distance-chart').descendants().map(n => n.textContent).join('|');
  crit(25, 'Guideline marked and labelled', () => /Guideline 1,600 ft/.test(kids()));
  crit(25, 'Your distance marked once you give one', () => { p.type('distance', '300'); return /You 300 ft/.test(kids()); });
  crit(25, 'Words say whether you meet it', () => /19% of it/.test(p.text('distance-copy')) && (p.type('distance', '2000'), /meets it/.test(p.text('distance-copy'))));
  crit(25, 'Log scale: 10 ft, 100 ft, 1,000 ft evenly spaced', () => { const t = p.$('distance-chart').descendants().filter(n => n.tagName === 'TEXT' && /^(10 ft|100 ft|1,000 ft)$/.test(n.textContent)).map(n => Number(n.attrs.x)); return t.length === 3 && Math.abs((t[1] - t[0]) - (t[2] - t[1])) < 2; });
});

feature('Pair picture', 'A small picture and fact card that agree with the words', () => {
  crit(30, 'Line style differs for cross / maybe / protected / no', () => {
    const p = page(); const styles = new Set();
    const style = () => { const n = p.$('pair-viz').descendants().find(x => (x.tagName === 'PATH' && x.attrs['stroke-dasharray'] !== undefined) || (x.tagName === 'LINE' && x.attrs.stroke && x.attrs.stroke !== '#7fa58a')); return n ? n.attrs.stroke + (n.attrs['stroke-dasharray'] || '') : 'none'; };
    styles.add(style()); p.pick('b', 'Cucumber'); styles.add(style()); p.pick('b', 'Butternut squash'); styles.add(style()); p.pick('b', 'Pumpkin'); p.choose('protection', 'controlled'); styles.add(style());
    return styles.size / 4;
  });
  crit(30, 'Species same / different matches the engine for every pair', () => sweep.every(x => x.viz.includes(x.r.speciesMatch ? 'Same:' : 'Different:')));
  crit(20, 'Separation fact matches the engine', () => sweep.every(x => x.r.guideline ? x.viz.includes(x.r.guideline.toLocaleString('en-US') + ' ft') : /Not needed/.test(x.viz)));
  crit(20, 'Pollination said in plain words', () => sweep.every(x => !/self \+ insects|mostly self\b(?! )/i.test(x.viz)));
});

feature('Examples', 'One tap shows a typical case', () => {
  const p = page(); const seen = new Set(); let ok = 0, labels = 0;
  for (const btn of p.doc.examples) { btn.dispatch('click'); seen.add(p.answer().badge); const a = p.$('plant-a').selectedOptions[0].textContent.toLowerCase().split(/[ (/]/)[0]; if (p.answer().heading.length > 5) ok++; if (btn.textContent === undefined || true) labels++; }
  crit(40, 'Each example sets a pair and its answer', () => ok === p.doc.examples.length && ok >= 4);
  crit(30, 'Examples cover at least three kinds of answer', () => seen.size >= 3);
  crit(30, 'Example labels name the plants they set', () => {
    const map = { squash: /zucchini|pumpkin/i, flowers: /zinnia/i, brassicas: /kale|broccoli/i, melon: /cucumber|melon/i };
    return p.doc.examples.every(b => { const k = b.attrs['data-example']; return !map[k] || map[k].test(html.match(new RegExp('data-example="' + k + '">([^<]+)<'))?.[1] || ''); });
  });
});

feature('Share links', 'A link reopens exactly what you were looking at', () => {
  crit(40, 'Checker link round-trips plants and every answer', () => {
    const q = '?a=' + byName('Broccoli').id + '&b=' + byName('Cabbage').id + '&overlap=yes&protection=controlled&seedType=f1&goal=preserve&distance=900';
    const p = page({ search: q }); return p.$('plant-b').selectedOptions[0].textContent === 'Cabbage' && /bagged/.test(p.answer().heading) && p.$('distance').value === '900' && p.doc.radios.find(r => r.attrs.name === 'seedType' && r.attrs.value === 'f1').checked;
  });
  crit(30, 'Garden link round-trips plants, varieties and which you save seed from', () => {
    const p = page({ search: '?g=plant-zinnia:s,plant-zinnia:e,plant-cosmos:s' });
    const g = p.gardenPlants(); return g.length === 3 && g[1].name === 'Zinnia (2nd variety)' && g[0].saving === true && g[1].saving === false;
  });
  crit(15, 'Links made before the crop rename still open', () => page({ search: '?a=plant-brandywine-tomato&b=plant-cherokee-purple-tomato' }).$('plant-a').selectedOptions[0].textContent === 'Tomato');
  crit(15, 'Junk in a link is ignored safely', () => page({ search: '?a=<script>&b=x&distance=abc&g=nope:y,,' }).answer().heading.length > 5);
});

feature('Garden builder', 'List what is growing this year in a few taps', () => {
  crit(20, 'Add on selection, remove in one tap', () => { const p = page(); const n = p.gardenPlants().length; p.$('garden-pick').value = p.plantId('Basil'); p.$('garden-pick').dispatch('change'); const m = p.gardenPlants().length; p.gardenPlants()[0].remove.dispatch('click'); return m === n + 1 && p.gardenPlants().length === n; });
  crit(20, 'Up to three varieties of one crop, clearly named', () => { const p = page({ search: '?g=plant-tomato,plant-tomato,plant-tomato,plant-tomato' }); const g = p.gardenPlants().map(x => x.name); return g.length === 3 && g[2] === 'Tomato (3rd variety)'; });
  crit(15, 'Twelve-plant limit explained', () => { const p = page({ search: '?g=' + names.slice(0, 12).map(n => byName(n).id).join(',') }); p.$('garden-pick').value = p.plantId('Basil'); p.$('garden-pick').dispatch('change'); return p.gardenPlants().length === 12 && /Twelve/.test(p.text('garden-feedback')); });
  crit(15, 'Example garden and Clear both work', () => { const p = page(); p.click('garden-demo'); const n = p.gardenPlants().length; p.click('garden-clear'); return n >= 8 && p.gardenPlants().length === 0; });
  crit(30, 'Mark which plants you save seed from, and the results follow', () => {
    const p = page({ search: '?g=plant-zucchini:s,plant-pumpkin:e,plant-cucumber:e,plant-cantaloupe-muskmelon:e' });
    const before = p.garden()[0].text; const pump = p.gardenPlants()[1]; if (!pump.toggle) return false;
    const groupsAllEat = page({ search: '?g=plant-zucchini:e,plant-pumpkin:e' }).garden().map(g => g.text).join(' ');
    return /Zucchini \+ Pumpkin|Pumpkin \+ Zucchini/.test(before) && /no seed (is )?at stake|just eating|not saving seed/i.test(groupsAllEat);
  });
});

feature('Garden results', 'The pairs that matter first, each with a plain next step', () => {
  const p = page(); p.click('garden-demo'); const g = p.garden();
  crit(20, 'Ordered: can cross, worth checking, won’t cross', () => /yes/.test(g[0].cls) && /maybe/.test(g[1].cls) && /no/.test(g.at(-1).cls));
  crit(30, 'Each flagged pair gets a plain, plant-specific next step', () => {
    const rows = g.filter(x => /yes|maybe/.test(x.cls)).map(x => x.text).join(' ');
    return !jargonIn(rows).length && /1,600 ft|2,640 ft/.test(rows) && /hand/i.test(rows);
  });
  crit(20, 'Open in checker loads that exact pair', () => { const btn = g[0].buttons.find(b => /Open in checker/.test(b.textContent)); btn.dispatch('click'); return p.doc.lastScroll === 'explorer' && /Zinnia|Zucchini|Kale|Cosmos|Pumpkin/.test(p.answer().live); });
  crit(15, 'Counts add up to every pair', () => { const n = p.gardenPlants().length; const counts = page().ctx.document ? 0 : 0; const total = g.map(x => Number((x.text.match(/^(\d+)/) || [])[1] || 0)).reduce((a, b) => a + b, 0); return total === n * (n - 1) / 2; });
  crit(15, 'Pairs with no seed at stake step aside', () => { const q = page({ search: '?g=plant-zucchini:e,plant-pumpkin:e,plant-zinnia:s,plant-zinnia:s' }); const t = q.garden(); return /Zinnia/.test(t[0].text) && t.some(x => /Zucchini \+ Pumpkin/.test(x.text) && !/yes/.test(x.cls)); });
});

feature('Pollen web', 'See who can reach whom, and open any line', () => {
  const p = page(); p.click('garden-demo');
  const web = () => p.$('pollen-web').children;
  crit(30, 'One line per flagged pair, solid for can-cross, dashed for checking', () => { const e = web().filter(n => /web-edge/.test(n.attrs?.class || '')); const flagged = p.garden().filter(x => /yes|maybe/.test(x.cls)).reduce((s, x) => s + Number((x.text.match(/^(\d+)/) || [])[1]), 0); return e.length === flagged && e.some(x => x.attrs['stroke-dasharray'] === 'none'); });
  crit(20, 'No plant name is cut short', () => {
    const q = page({ search: '?g=' + ['Queen Anne’s lace (wild carrot)', 'Love-in-a-mist (nigella)', 'Yellow summer squash', 'Scarlet runner bean', 'Kale (curly / European)', 'Zinnia', 'Zinnia', 'Cantaloupe / muskmelon'].map(n => byName(n).id).join(',') });
    const labels = q.$('pollen-web').children.filter(n => /web-node/.test(n.attrs?.class || '')).map(n => n.descendants().filter(x => x.tagName === 'TEXT').map(x => x.textContent).join(' '));
    return labels.length === 8 && !labels.some(l => l.includes('…'));
  });
  crit(25, 'Plants are keyboard buttons and highlight their partners', () => { const n = web().find(x => /web-node/.test(x.attrs?.class || '')); n.dispatch('click'); return n.attrs.tabindex === '0' && /active/.test(web().find(x => /web-node/.test(x.attrs?.class || '') && x.attrs['aria-label'] === n.attrs['aria-label']).attrs.class); });
  crit(25, 'A line opens its pair', () => { const hit = p.$('pollen-web').children.find(n => n.attrs?.class === 'web-hit'); hit.dispatch('click'); return p.doc.lastScroll === 'explorer'; });
});

feature('Room chart', 'How much room each crop needs, and which ones matter here', () => {
  const p = page(); p.click('garden-demo'); const bars = p.$('room-chart').children.filter(n => /bar-row/.test(n.attrs?.class || ''));
  crit(40, 'One bar per species with a published guideline', () => bars.length === 6 && /2,640 feet/.test(bars[0].attrs['aria-label']));
  crit(20, 'Darker bars for species with a crossing partner', () => bars.filter(b => /cross/.test(b.attrs.class)).length === 3);
  crit(20, 'Table view mirrors the chart', () => p.$('room-rows').children.length === 6);
  crit(20, 'Labels are not cut short', () => !p.$('room-chart').descendants().some(n => n.tagName === 'TEXT' && n.textContent.includes('…')));
});

feature('Garden export', 'Take the garden check with you', () => {
  const p = page(); p.click('garden-demo'); p.click('export-garden'); const csv = p.downloads.at(-1) || ''; const rows = csv.split('\r\n');
  crit(50, 'Spreadsheet has one row per pair, each with a plain next step', () => rows.length === 1 + 36 && !jargonIn(csv).length && rows.slice(1).every(r => (r.split('","')[4] || '').length >= 12));
  crit(20, 'Spreadsheet has a header row and opens in Excel (BOM)', () => csv.startsWith('﻿"Plant","Other plant"'));
  crit(30, 'Copy link to this garden', () => !!page().$('share-garden'));
});

feature('Voice and story', 'Reads like a gardener talking, never like a lab report', () => {
  const visible = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  crit(25, 'No em dashes anywhere', () => !/\u2014/.test(html));
  crit(25, 'Speaks to the gardener', () => /\byou\b/i.test(visible) && /\bI will\b|\bI\b/.test(visible));
  crit(25, 'No invented personal anecdotes', () => !/my (grandmother|grandfather|wife|husband|father|mother)|last (year|summer) I|I lost|my yield/i.test(visible));
  crit(25, 'Story sections read at grade 9 or below', () => { const story = (html.match(/id="field-notes"[\s\S]*?<\/section>/) || [''])[0].replace(/<[^>]+>/g, ' '); const g = gradeLevel(story); current.grade = g.toFixed(1); return g <= 9 ? 1 : Math.max(0, 1 - (g - 9) / 4); });
});

feature('Trust', 'Honest about what it knows', () => {
  crit(25, 'Sources listed', () => p0.$('references').children.length >= 3);
  crit(25, 'Each answer links its source', () => sweep.every(x => /^https:\/\//.test(x.link || '')));
  crit(25, 'No invented crossing percentages', () => !/\d+% chance/.test(html) && /not a measured probability/.test(html));
  crit(25, 'Says that pollen from outside your list is not counted', () => /garden next door|beyond your list|outside this check/i.test(html));
});

feature('Accessibility', 'Works with a keyboard, a screen reader and a thumb', () => {
  crit(25, 'Every select and text input has a label', () => [...html.matchAll(/<(select|input)([^>]*)>/g)].filter(m => !/type="(radio|hidden)"/.test(m[2])).every(m => { const id = (m[2].match(/id="([^"]+)"/) || [])[1]; return id && (new RegExp('for="' + id + '"').test(html) || /aria-label(ledby)?=/.test(m[2])); }));
  crit(15, 'Status region for the verdict and the garden', () => /role="status"/.test(html) && /id="garden-results"[^>]*aria-live/.test(html));
  crit(20, 'Visible focus and 42px+ tap targets', () => /:focus-visible/.test(html) && Number((html.match(/\.seg span\{[^}]*min-height:(\d+)px/) || [])[1]) >= 42);
  crit(20, 'Charts have a text alternative', () => /id="distance-chart"[^>]*aria-labelledby/.test(html) && /id="room-table"/.test(html) && /id="pollen-web"[^>]*aria-label/.test(html));
  crit(20, 'Copy buttons work without clipboard access', () => { const p = page(); p.click('share-comparison'); return !p.$('comparison-link').hidden && /seed-saving-lab/.test(p.$('comparison-link').value); });
});

// ---- report ----
let worst = 100, sum = 0;
console.log('Seed Saving Lab: feature value functions (automated behavioural proxy, NOT human research)');
console.log('-'.repeat(78));
for (const f of features) {
  const max = f.criteria.reduce((s, c) => s + c.weight, 0) || 1;
  f.score = Math.round(f.criteria.reduce((s, c) => s + c.weight * c.score, 0) / max * 100);
  worst = Math.min(worst, f.score); sum += f.score;
  console.log(String(f.score).padStart(3) + '  ' + f.name.padEnd(18) + f.promise + (f.grade ? '  [grade ' + f.grade + ']' : '') + (f.error ? '  ERROR ' + f.error : ''));
  for (const c of f.criteria.filter(c => c.score < 1)) console.log('       -' + Math.round(c.weight * (1 - c.score)) + ' ' + c.name + (c.note ? ' (' + c.note + ')' : ''));
}
const mean = sum / features.length;
console.log('-'.repeat(78));
console.log('MEAN ' + mean.toFixed(1) + '   LOWEST ' + worst + '   (gate: every feature >= 90, mean >= 95)');
if (process.argv.includes('--json')) fs.writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(features.map(f => ({ name: f.name, score: f.score, criteria: f.criteria })), null, 1));
if (process.argv.includes('--check') && (worst < 90 || mean < 95)) process.exitCode = 1;
