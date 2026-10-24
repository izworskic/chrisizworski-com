#!/usr/bin/env node
/**
 * Garden tools: one shared value function, held to the Seed Saving Lab bar.
 *
 * Every garden tool scores 0-100 on eight behaviours a gardener would notice, each driven through
 * scripts/lib/garden-tool-harness.mjs (the page's own scripts against a small DOM, on fixed dates):
 *
 *   Answer first (15)      a specific answer on load, placed before the refinements
 *   Personal (15)          your place, zone or garden changes the answer
 *   Refine (10)            a second input (date, readings, crop) changes it again
 *   Plain answer (15)      dates or a clear action, no jargon, grade 9 or below
 *   Picture (15)           a chart that follows the answer, with a text alternative
 *   Correct (10)           tool-specific invariants against the source data
 *   Share (10)             a link that reopens the same answer; calendar or print to take away
 *   Access and trust (10)  labelled controls, a status region, sources, no em dashes
 *
 * Gate (--check): every tool >= 90. Automated task proxy, NOT human usability research.
 * Phone layout (answer in the first 844 px, no sideways scroll) needs a real browser and is
 * recorded in docs/GARDEN_TOOLS_VALUE_FUNCTION.md, not scored here.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadTool } from './lib/garden-tool-harness.mjs';
import { gradeLevel, JARGON } from './lib/plain-language.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = r => path.join(root, 'public', r, 'index.html');
const jargon = t => JARGON.filter(j => new RegExp('\\b' + j, 'i').test(t));
const DATE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d{1,2}\b/;

function shared(route, spec) {
  const f = file(route), html = fs.readFileSync(f, 'utf8');
  const load = (o = {}) => loadTool(f, { today: '2026-04-20', ...o });
  const crit = [];
  const add = (dim, w, name, fn) => { let s = 0, note = ''; try { const r = fn(); s = typeof r === 'number' ? Math.max(0, Math.min(1, r)) : r ? 1 : 0; } catch (e) { note = e.message.slice(0, 80); } crit.push({ dim, w, name, s, note }); };
  const p = load(); const a = () => spec.answer(p);
  add('Answer first', 8, 'A specific answer on load', () => { const x = a(); return x.title.length > 12 && x.badge.length > 1 && !/loading|enable JavaScript/i.test(x.title); });
  add('Answer first', 7, 'Answer card sits before the refinements', () => { const i = html.indexOf('id="' + spec.card + '"'); return i > 0 && i < html.indexOf('id="' + spec.refineFirst + '"') && html.indexOf('<h1') < i; });
  add('Personal', 15, 'Your place, zone or garden changes the answer', () => { const before = JSON.stringify(a()); spec.personalize(p); return JSON.stringify(a()) !== before; });
  add('Refine', 10, 'A second input changes it again', () => { const q = load(); const before = JSON.stringify(spec.answer(q)); spec.refine(q); return JSON.stringify(spec.answer(q)) !== before; });
  const texts = spec.samples(load);
  add('Plain answer', 6, 'Answers carry a date or a concrete action', () => texts.filter(t => DATE.test(t) || spec.action.test(t)).length / texts.length);
  add('Plain answer', 5, 'No botanist jargon', () => 1 - texts.filter(t => jargon(t).length).length / texts.length);
  add('Plain answer', 4, 'Reads at grade 9 or below', () => { const g = texts.reduce((s, t) => s + gradeLevel(t), 0) / texts.length; return g <= 9 ? 1 : Math.max(0, 1 - (g - 9) / 4); });
  add('Picture', 8, 'A chart is drawn and follows the answer', () => { const q = load(); const before = q.svgText(spec.chart); spec.personalize(q); const after = q.svgText(spec.chart); return before.length > 20 && after !== before; });
  add('Picture', 7, 'The chart has a text alternative', () => new RegExp('id="' + spec.chart + '"[^>]*aria-(label|labelledby)=').test(html));
  add('Correct', 10, spec.correctName, () => spec.correct(load));
  add('Share', 6, 'A copied link reopens the same answer', () => {
    const q = load(); spec.personalize(q); spec.refine(q); const want = JSON.stringify(spec.answer(q));
    q.click(spec.share); const url = q.$(spec.shareOut).value; if (!url) return false;
    const r = load({ search: new URL(url).search }); return JSON.stringify(spec.answer(r)) === want;
  });
  add('Share', 4, 'Something to take away (calendar file or print)', () => { if (!spec.takeaway) return /window\.print\(\)/.test(html); const q = load(); q.click(spec.takeaway); const d = q.doc.downloads.at(-1) || ''; return /BEGIN:VCALENDAR/.test(d) && (d.match(/BEGIN:VEVENT/g) || []).length >= 3 && !/NaN|undefined/.test(d); });
  add('Access and trust', 3, 'Every select and text input has a label', () => [...html.matchAll(/<(select|input)\b([^>]*)>/g)].filter(m => !/type="(radio|checkbox|hidden)"/.test(m[2])).every(m => { const id = (m[2].match(/id="([^"]+)"/) || [])[1]; return /aria-label/.test(m[2]) || (id && new RegExp('for="' + id + '"').test(html)); }));
  add('Access and trust', 2, 'A status region announces the answer', () => { const q = load(); const id = (html.match(/id="([^"]+)" role="status"/) || [])[1]; return id && q.text(id).length > 10; });
  add('Access and trust', 2, 'Sources named and linked', () => spec.sources.test(html));
  add('Access and trust', 2, 'No em dashes', () => !/—/.test(html));
  add('Access and trust', 1, 'No inline onclick handlers in the tool', () => !/onclick="/.test(html.slice(html.indexOf('id="' + spec.card + '"') - 3000, html.indexOf('id="' + spec.card + '"') + 6000)));
  const max = crit.reduce((s, c) => s + c.w, 0);
  return { route, crit, score: Math.round(crit.reduce((s, c) => s + c.w * c.s, 0) / max * 100) };
}

const dates = ['2026-02-15', '2026-03-20', '2026-04-20', '2026-05-12', '2026-05-25', '2026-07-10', '2026-09-25', '2026-10-24', '2026-12-10'];
const card = (p, b, t, w) => ({ badge: p.text(b), title: p.text(t), why: p.text(w) });

const tools = [
  shared('zone-6a-planting-calendar', {
    card: 'weekCard', refineFirst: 'customLF', chart: 'timeline', share: 'shareBtn', shareOut: 'shareOut', takeaway: 'icsBtn', action: /\b(Start|Plant|Sow|tend|order)\b/,
    sources: /canr\.msu\.edu/,
    answer: p => ({ ...card(p, 'weekBadge', 'weekTitle', 'weekWhy'), crop: p.text('cropTitle') + p.text('cropSteps') }),
    personalize: p => p.set('citySel', 'vanderbilt'),
    refine: p => p.choose('mode', 'cautious'),
    samples: load => dates.flatMap(d => { const p = load({ today: d }); return [p.text('weekTitle') + ' ' + p.text('weekWhy'), p.text('cropTitle') + '. ' + p.text('cropNow')]; }),
    correctName: 'Every window equals frost date plus the published offset, for every station and crop',
    correct: load => {
      const p = load(); const F = p.ctx.MIFrost, K = p.ctx.GardenKit; let bad = 0;
      for (const st of F.STATIONS) { const a = F.anchors(st, 'typical'); for (const c of F.CROPS) for (const w of F.windows(c, a)) { const off = { indoor: c.i, transplant: c.t, sow: c.d, fall: c.f }[w.kind]; const base = w.kind === 'fall' ? K.parse(st.ff) : K.parse(st.p50); if (K.wrapDay(base + off[0]) !== w.from || K.wrapDay(base + off[1]) !== w.to) bad++; } }
      p.set('citySel', 'alpena-wso'); const row = p.$('tb-veg').children[0].children.map(n => n.textContent);
      const a = F.anchors(F.station('alpena-wso'), 'typical'); const tom = F.windows(F.crop('Tomatoes'), a);
      return bad === 0 && row[1] === K.range(tom[0].from, tom[0].to) && F.STATIONS.length === 78 && F.CROPS.length === 47;
    }
  }),
  shared('michigan-frost-dates', {
    card: 'frostCard', refineFirst: 'plantDate', chart: 'riskChart', share: 'shareBtn', shareOut: 'shareOut', takeaway: 'icsBtn', action: /\b(plant|wait|cover|Plant)\b/,
    sources: /canr\.msu\.edu/,
    answer: p => ({ ...card(p, 'frostBadge', 'frostTitle', 'frostWhy'), risk: card(p, 'riskBadge', 'riskTitle', 'riskWhy') }),
    personalize: p => p.set('stationSel', 'grayling'),
    refine: p => p.set('plantDate', '2026-05-20'),
    samples: load => dates.flatMap(d => { const p = load({ today: d }); return [p.text('frostTitle') + ' ' + p.text('frostWhy'), p.text('riskTitle') + ' ' + p.text('riskWhy')]; }),
    correctName: 'Risk matches the published 75/50/25 percent dates and never rises through spring, at every station',
    correct: load => {
      const p = load(); const F = p.ctx.MIFrost, K = p.ctx.GardenKit;
      return F.STATIONS.every(st => { const at = (d, v) => Math.abs(F.risk(st, K.parse(d)) - v) < 0.005; let prev = 1, mono = true; for (let d = K.parse(st.p75) - 30; d < K.parse(st.lx) + 5; d++) { const r = F.risk(st, d); if (r > prev + 1e-9) mono = false; prev = r; } return at(st.p75, .75) && at(st.p50, .5) && at(st.p25, .25) && mono; })
        && /Jun 20/.test(p.html) && p.$('springTable') && (p.html.match(/<tr data-n=/g) || []).length === 78;
    }
  }),
  shared('when-to-plant-tomatoes-michigan', {
    card: 'tCard', refineFirst: 'tDate', chart: 'tTimeline', share: 'tShare', shareOut: 'tShareOut', takeaway: 'tIcs', action: /\b(plant|wait|start|harden|keep|Plant)\b/i,
    sources: /Source|MSU Extension|Extension/,
    answer: p => card(p, 'tBadge', 'tTitle', 'tWhy'),
    personalize: p => p.set('tStation', 'houghton-lake'),
    refine: p => { p.set('tDate', '2026-05-24'); p.set('tSoil', '55', 'input'); },
    samples: load => dates.flatMap(d => { const p = load({ today: d }); return [p.text('tTitle') + ' ' + p.text('tWhy')]; }),
    correctName: 'Seed start, harden off and plant out come in order, and readings flip the answer correctly',
    correct: load => {
      const p = load({ today: '2026-05-22' }); const ok = [];
      const st = p.ctx.MIFrost.STATIONS; let ordered = true;
      for (const s of st) { p.set('tStation', s.s); const t = p.texts('#tSteps li').slice(0, 3).join(' '); if (!/Start seeds.*Harden off.*Plant out/.test(t)) ordered = false; }
      p.set('tStation', 'bay-city');
      p.set('tSoil', '55', 'input'); ok.push(/Wait/i.test(p.text('tBadge')));
      p.set('tSoil', '64', 'input'); p.set('tLow', '30', 'input'); ok.push(p.text('tBadge') === 'Wait');
      p.set('tLow', '55', 'input'); ok.push(p.text('tBadge') === 'Plant today');
      return ordered && ok.every(Boolean) && /id="tomato-quick-answer"/.test(p.html);
    }
  }),
  shared('seed-starting-guide', {
    card: 'ssCard', refineFirst: 'ssLF', chart: 'ssTimeline', share: 'ssShare', shareOut: 'ssShareOut', takeaway: 'ssIcs', action: /\b(Start|Plant|Sow|start|sow)\b/,
    sources: /planthardiness\.ars\.usda\.gov/,
    answer: p => ({ ...card(p, 'ssBadge', 'ssTitle', 'ssWhy'), facts: p.text('ssFacts') }),
    personalize: p => p.$('zoneBtns').children.find(b => b.attrs['data-zone'] === '4b').dispatch('click'),
    refine: p => p.set('ssLF', '2026-05-12'),
    samples: load => dates.flatMap(d => { const p = load({ today: d }); return [p.text('ssTitle') + ' ' + p.text('ssWhy')]; }),
    correctName: 'Zone frost dates run in order (colder zones later), and the intro sits below the site header',
    correct: load => {
      const p = load(); const Z = vm.runInContext('ZONES', p.ctx), K = p.ctx.GardenKit; const keys = Object.keys(Z);
      let mono = true; for (let i = 1; i < keys.length; i++) if (K.parse(Z[keys[i]].last) > K.parse(Z[keys[i - 1]].last) || K.parse(Z[keys[i]].first) < K.parse(Z[keys[i - 1]].first)) mono = false;
      const head = p.html.slice(p.html.indexOf('<header'), p.html.indexOf('</header>'));
      return mono && !/<h2|<p>Starting seeds/.test(head) && !/>, </.test(p.$('tableArea').textContent);
    }
  }),
  shared('heirloom-variety-matchmaker', {
    card: 'mmCard', refineFirst: 'mmForm', chart: 'mmChart', share: 'mmShare', shareOut: 'mmShareOut', takeaway: null, action: /\b(tomato|kale|bean|lettuce|carrot|pepper|cucumber|melon|pumpkin|cherry)\b/i,
    sources: /seedsavers\.org/,
    answer: p => ({ title: p.text('mmTitle'), badge: p.text('mmBadge'), why: p.text('mmAssume') }),
    personalize: p => p.choose('zone', '3-4'),
    refine: p => p.choose('space', 'balcony'),
    samples: load => { const out = []; for (const z of ['3-4', '5', '6a', '6b-7']) for (const sp of ['large', 'balcony']) { const p = load(); p.choose('zone', z); p.choose('space', sp); out.push(p.text('mmTitle') + ' ' + p.texts('.mm-why li').slice(0, 3).join(' ')); } return out; },
    correctName: 'Three different picks for every answer combination, matching the API, with no server call',
    correct: load => {
      const p = load(); const M = p.ctx.HeirloomMatch;
      const api = JSON.parse(JSON.stringify(M.chooseVarieties({ zone: 'Zone 6a', sun: 'Full sun', space: 'Medium in-ground garden', experience: 'Beginner', goal: 'Best flavor' })));
      let ok = true;
      for (const z of ['3-4', '5', '6a', '6b-7']) for (const s of ['full', 'mostly', 'partial', 'shade']) for (const sp of ['large', 'medium', 'raised', 'balcony']) for (const g of ['flavor', 'seed', 'yield', 'rare']) {
        const v = M.match({ zone: z, sun: s, space: sp, experience: 'beginner', goal: g }).varieties; if (v.length !== 3 || new Set(v.map(x => x.name)).size !== 3) ok = false;
      }
      return ok && api.length === 3 && !/fetch\('\/api\/matchmaker'/.test(p.html);
    }
  })
];

let worst = 100;
console.log('Garden tools: shared value function (automated behavioural proxy, NOT human research)');
console.log('-'.repeat(78));
for (const t of tools) {
  worst = Math.min(worst, t.score);
  const dims = {}; for (const c of t.crit) { dims[c.dim] ??= [0, 0]; dims[c.dim][0] += c.w * c.s; dims[c.dim][1] += c.w; }
  console.log(String(t.score).padStart(3) + '  ' + t.route.padEnd(34) + Object.entries(dims).map(([k, v]) => k.split(' ')[0] + ' ' + Math.round(v[0]) + '/' + v[1]).join('  '));
  for (const c of t.crit.filter(c => c.s < 1)) console.log('       -' + Math.round(c.w * (1 - c.s) * 10) / 10 + ' ' + c.dim + ': ' + c.name + (c.note ? ' (' + c.note + ')' : ''));
}
console.log('-'.repeat(78));
console.log('LOWEST ' + worst + '   (gate: every tool >= 90)');
if (process.argv.includes('--check') && worst < 90) process.exitCode = 1;
