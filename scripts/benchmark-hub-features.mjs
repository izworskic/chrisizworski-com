#!/usr/bin/env node
/**
 * Michigan gardening hub (/michigan-gardening/): one value function per section.
 *
 * Each section scores 0-100 from what a visitor sees (the page's scripts run in
 * scripts/lib/garden-tool-harness.mjs on fixed dates) or, for static sections, from checks that the
 * words on the page agree with the pages and data they describe.
 * Gate (--check): every section >= 90 and the mean >= 95. Automated proxy, NOT human research.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadTool } from './lib/garden-tool-harness.mjs';
import { gradeLevel, JARGON, brokenText } from './lib/plain-language.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = path.join(root, 'public/michigan-gardening/index.html');
const html = fs.readFileSync(file, 'utf8');
const pub = r => path.join(root, 'public', r);
const load = (o = {}) => loadTool(file, { today: '2026-04-20', ...o });
const text = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const visible = text(html);
const jargon = t => JARGON.filter(j => new RegExp('\\b' + j, 'i').test(t));
const DATES = ['2026-01-10', '2026-03-05', '2026-03-20', '2026-04-20', '2026-05-12', '2026-06-15', '2026-08-20', '2026-10-24', '2026-12-10'];
const PLACES = ['Bay City', '49783', 'Grand Rapids'];

const sections = []; let cur;
function section(name, promise, fn) { cur = { name, promise, crit: [] }; sections.push(cur); try { fn(); } catch (e) { cur.error = e.message; } }
function crit(w, name, fn) { let s = 0, note = ''; try { const r = fn(); s = typeof r === 'number' ? Math.max(0, Math.min(1, r)) : r ? 1 : 0; } catch (e) { note = e.message.slice(0, 90); } cur.crit.push({ w, name, s, note }); }

const p0 = load();
const E = p0.ctx.PlantNow, F = p0.ctx.MIFrost, K = p0.ctx.GardenKit;
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
const graph = ld.flatMap(x => x['@graph'] || [x]);

section('Search surface', 'The page says what it answers, in the title, heading and first lines', () => {
  const title = (html.match(/<title>([^<]+)/) || [])[1].replace(/&amp;/g, '&');
  crit(25, 'Query-first title, 60 characters or fewer, matching the H1', () => title.length <= 60 && /^What to Plant Now in Michigan/.test(title) && /<h1>What to Plant Now in Michigan<\/h1>/.test(html));
  crit(20, 'Description 158 characters or fewer and about this week\'s planting', () => { const d = (html.match(/<meta name="description" content="([^"]+)"/) || [])[1]; return d.length <= 158 && /plant/i.test(d); });
  crit(20, 'Canonical and the Person node', () => /<link rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-gardening\/">/.test(html) && graph.some(n => n['@id'] === 'https://chrisizworski.com/#person' && n['@type'] === 'Person'));
  crit(20, 'The lede says how the answer is made', () => /78 Michigan frost stations/.test(visible) && /MSU Extension/.test(visible));
  crit(15, 'No em dashes', () => !/—/.test(html));
});

section('Location', 'Any Michigan town or ZIP finds its frost station, and the page remembers it', () => {
  crit(25, 'ZIPs and towns resolve to the nearest station', () => { const p = load(); p.set('pnPlace', '49783'); const a = /Sault Ste\. Marie/.test(p.text('pnWhere')); p.set('pnPlace', 'Traverse City'); return a && /Traverse City/.test(p.text('pnWhere')); });
  crit(25, 'An unknown place gets a plain message and keeps the last answer', () => { const p = load(); const t = p.text('pnTitle'); p.set('pnPlace', 'Atlantis'); return /No Michigan town or ZIP called "Atlantis"/.test(p.text('pnWhere')) && p.text('pnTitle') === t; });
  crit(20, 'Distance to the station is stated when it is not in town', () => { const p = load({ search: '?place=48706' }); return /about 3 miles away/.test(p.text('pnWhere')); });
  crit(15, 'The choice is remembered, safely', () => /localStorage\.setItem/.test(html) && /try\{localStorage/.test(html));
  crit(15, 'Labelled field with town suggestions', () => /<label for="pnPlace">/.test(html) && p0.$('pnTowns').children.length > 500);
});

section('This week', 'A plain answer for this week, every week of the year, at any station', () => {
  const runs = []; for (const d of DATES) for (const pl of PLACES) { const p = load({ today: d, search: '?place=' + encodeURIComponent(pl) }); runs.push({ d, pl, badge: p.text('pnBadge'), title: p.text('pnTitle'), why: p.text('pnWhy'), week: p.text('pnWeek'), live: p.text('pnLive') }); }
  const all = r => r.title + ' ' + r.why + ' ' + r.week;
  crit(20, 'An answer naming the station on every date and place', () => runs.every(r => r.title.length > 15 && r.badge && /Bay City|Sault|Grand Rapids/.test(r.title)));
  crit(20, 'Every answer gives a date or a job to do', () => runs.filter(r => /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* \d/.test(all(r)) || /\b(start|plant|sow|harden)\b/i.test(r.title)).length / runs.length);
  crit(20, 'No jargon or broken text', () => runs.every(r => !jargon(all(r)).length && !brokenText(r.title + ' ' + r.why)));
  crit(15, 'Reads at grade 9 or below', () => { const g = runs.reduce((s, r) => s + gradeLevel(r.title + ' ' + r.why), 0) / runs.length; cur.grade = g.toFixed(1); return g <= 9 ? 1 : Math.max(0, 1 - (g - 9) / 4); });
  crit(15, 'The status region speaks the answer', () => runs.every(r => r.live === r.title));
  crit(10, 'Answer card sits right after the place picker', () => html.indexOf('id="pnPlace"') < html.indexOf('id="pnCard"') && html.indexOf('id="pnCard"') < html.indexOf('id="pnSoil"'));
});

section('Make it fit', 'Each question can change the answer', () => {
  crit(35, '"Can you work the soil?" turns hardy crops into plant now', () => { const p = load(); p.choose('pnWork', 'yes'); return /plant onions, peas and spinach|Plant onions/i.test(p.text('pnTitle') + p.text('pnWeek')); });
  crit(35, 'Soil temperature gates the warm-season and root crops', () => { const p = load({ today: '2026-05-12' }); p.set('pnSoil', '55', 'input'); const cold = p.text('pnWeek'); p.set('pnSoil', '62', 'input'); return /Waiting on the soil/i.test(cold) && /Plant now/i.test(p.text('pnWeek')); });
  crit(30, 'Labelled, keyboard reachable controls', () => /<legend>Can you work the soil/.test(html) && /<label for="pnSoil">/.test(html));
});

section('Season chart', 'The dated windows at a glance, for your station', () => {
  const rows = p => p.$('pnTimeline').children.filter(n => /tl-row/.test(n.attrs.class || ''));
  crit(30, 'One row per crop with dated windows', () => rows(p0).length === E.CROPS.filter(c => c.kind === 'transplant' || c.kind === 'warmSow').length);
  crit(30, 'Redraws for another station', () => { const p = load(); const a = p.svgText('pnTimeline'); p.set('pnPlace', '49783'); return a !== p.svgText('pnTimeline'); });
  crit(20, 'Legend and today marker', () => p0.$('pnLegend').children.length > 0 && /Today/.test(p0.svgText('pnTimeline')));
  crit(20, 'Text alternative and the open-ended bars explained', () => /id="pnTimeline"[^>]*aria-label/.test(html) && /display limit, not a deadline/.test(html));
});

section('Crop table', 'Every crop, its status, its dates and the rule behind it', () => {
  const p = load({ today: '2026-05-12' }); const rows = p.$('pnRows').children; const plan = E.plan(F.station('bay-city'), K.fromISO('2026-05-12'), {});
  crit(30, 'One row per crop, status matching the engine', () => rows.length === E.CROPS.length && rows.every((r, i) => r.textContent.includes(plan.crops[i].crop.name) && r.textContent.includes(plan.crops[i].status)));
  crit(30, 'Not reported rows give the reason and no dates', () => rows.filter(r => /Not reported/.test(r.textContent)).every(r => /No Michigan rule found/.test(r.textContent) && !/\b(Mar|Apr|May|Jun) \d/.test(r.textContent)));
  crit(25, 'Every other row cites its MSU rule', () => rows.filter(r => !/Not reported/.test(r.textContent)).every(r => /\(MSU\)/.test(r.textContent)));
  crit(15, 'Readable on a phone (scrolls inside its box)', () => /\.pn-table-wrap\{overflow-x:auto\}/.test(html));
});

section('Station facts', 'The frost dates the answer rests on', () => {
  crit(60, 'Facts equal the station table', () => { const p = load({ search: '?place=Grand Rapids' }); const st = F.station('grand-rapids'); const t = p.text('pnFacts'); return [st.p50, st.p25, st.lx].every(d => t.includes(d)); });
  crit(40, 'An unpublished fall date says not reported', () => /Not reported for this station/.test(load({ search: '?place=Adrian' }).text('pnFacts')));
});

section('Sources and honesty', 'Every rule quoted and linked; every choice of reading disclosed', () => {
  const p = load(); const t = p.text('pnSources');
  crit(35, 'Each rule is quoted with its source', () => Object.keys(E.RULES).length >= 7 && p.$('pnSources').querySelectorAll('blockquote').length === Object.keys(E.RULES).length);
  crit(25, 'MSU sources linked on the page itself', () => (html.match(/href="https:\/\/www\.canr\.msu\.edu\//g) || []).length >= 2);
  crit(25, 'The 1-in-4 reading, the July boundary and no borrowing are disclosed', () => /1 spring in 4/.test(t) && /July/.test(t) && /borrowed from another state/.test(t));
  crit(15, 'Harvest timing said to be not reported', () => /Harvest timing is not reported/.test(t));
});

section('Take it with you', 'Share, save to a calendar, or go national', () => {
  crit(40, 'A copied link reopens the same answer', () => { const p = load({ today: '2026-05-12' }); p.set('pnPlace', '49783'); p.choose('pnWork', 'yes'); p.set('pnSoil', '45', 'input'); const want = p.text('pnTitle') + p.text('pnWeek'); p.click('pnShare'); const u = new URL(p.$('pnShareOut').value); const q = load({ today: '2026-05-12', search: u.search }); return q.text('pnTitle') + q.text('pnWeek') === want; });
  crit(40, 'Calendar file with one event per dated window', () => { const p = load(); p.click('pnIcs'); const d = p.doc.downloads.at(-1) || ''; const n = E.plan(F.station('bay-city'), K.fromISO('2026-04-20'), {}).crops.reduce((a, r) => a + r.windows.filter(w => typeof w.from === 'number').length, 0); return n >= 9 && (d.match(/BEGIN:VEVENT/g) || []).length === n && !/NaN|undefined/.test(d); });
  crit(20, 'Hand-off to the national planting tool', () => /href="\/national-tools\/planting\/"/.test(html));
});

section('Garden jobs by season', 'Seasonal jobs, with the ones that matter now first', () => {
  const links = ['garlic', 'cover-crops', 'cover-plants-tonight', 'soil-temperature-ready', 'harden-off-seedlings', 'spring-bulbs', 'tomato-ripening'];
  crit(30, 'All seven national garden decisions linked', () => links.every(l => html.includes(l + '/"')));
  crit(40, 'Jobs in season now come first and are marked', () => {
    const order = (d) => { const p = load({ today: d }); const items = p.$('pnJobs').children.map(li => li.textContent); return items; };
    const oct = order('2026-10-24'), apr = order('2026-04-20');
    return /garlic|cover crop|bulb/i.test(oct[0]) && /In season/.test(oct[0]) && /soil|harden|cover my plants/i.test(apr[0]) && /In season/.test(apr[0]) && !/garlic|bulb/i.test(apr[0]);
  });
  crit(30, 'Link labels are questions a gardener asks', () => /When to plant garlic|Should I cover my plants tonight\?/.test(html));
});

section('Guide catalogue', 'Every garden page listed, each described accurately', () => {
  const cards = [...html.matchAll(/<article class="guide-card[^"]*">([\s\S]*?)<\/article>/g)].map(m => m[1]);
  const desc = href => text((cards.find(c => c.includes('href="' + href + '"')) || ''));
  crit(25, 'Every garden tool on the site is in the catalogue', () => ['/seed-saving-lab/', '/heirloom-variety-matchmaker/', '/zone-6a-planting-calendar/', '/michigan-frost-dates/', '/michigan-last-spring-freeze/', '/seed-starting-guide/', '/when-to-plant-tomatoes-michigan/'].every(h => cards.some(c => c.includes('href="' + h + '"'))));
  crit(30, 'Descriptions agree with the pages they describe', () => {
    const z = desc('/zone-6a-planting-calendar/'), fr = desc('/michigan-frost-dates/'), ls = desc('/michigan-last-spring-freeze/');
    return /47 crops/.test(z) && /78/.test(z) && !/30\+/.test(z) && !/10%/.test(fr) && /75, 50 and 25 percent/.test(fr) && !/90%|NOAA's full/.test(ls);
  });
  crit(20, 'Every card link points at a page that exists', () => [...html.matchAll(/class="card-link" href="(\/[^"]+)"/g)].every(m => fs.existsSync(pub(m[1].replace(/^\//, '') + 'index.html'))));
  crit(15, 'Section counts match their cards', () => [...html.matchAll(/<section class="category"[\s\S]*?<\/section>/g)].every(m => { const n = Number((m[0].match(/(\d+) guides?</i) || [])[1]); return n === (m[0].match(/<article class="guide-card/g) || []).length; }));
  crit(10, 'Clean link labels (no doubled arrows)', () => !/→<\/a>/.test(html.slice(html.indexOf('<!-- CATEGORY'))));
});

section('About and Freighter View Farms', 'True to the data, and every link visible', () => {
  crit(40, 'No stale season figures', () => !/148-day|140 to 150 day|148 Days/.test(html));
  crit(35, 'Links on the dark block are styled to be seen', () => /\.fvf-block p a\s*\{[^}]*color/.test(html) || /\.fvf-block a\s*\{[^}]*color/.test(html));
  crit(25, 'Freighter View Farms authority page linked', () => html.includes('href="/chris-izworski-freighter-view-farms/"'));
});

section('Structured data', 'Search engines see the same page visitors do', () => {
  const page = graph.find(n => n['@type'] === 'CollectionPage'); const faq = graph.find(n => n['@type'] === 'FAQPage');
  crit(30, 'All JSON-LD parses, with the Person node', () => ld.length > 0 && graph.some(n => n['@id'] === 'https://chrisizworski.com/#person'));
  crit(35, 'hasPart lists every page in the catalogue', () => { const urls = new Set((page.hasPart || []).map(x => x.url)); return [...html.matchAll(/<h3><a href="(\/[^"]+)"/g)].every(m => urls.has('https://chrisizworski.com' + m[1])); });
  crit(35, 'FAQ answers agree with the station table', () => { const t = JSON.stringify(faq); return !/May 4|140 to 150|148/.test(t) && /May 2/.test(t); });
});

section('Freshness and footer', 'The page says when it changed, truthfully', () => {
  const dm = (html.match(/"dateModified":\s*"(\d{4}-\d{2})/) || [])[1];
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  crit(60, 'Footer "Updated" month matches dateModified', () => { const m = (html.match(/Updated (\w+) (\d{4})/) || []); return dm && m[1] === months[Number(dm.slice(5, 7)) - 1] && m[2] === dm.slice(0, 4); });
  crit(40, 'Byline and Built by Chris Izworski', () => /Built by <a href="\/chris-izworski\/">Chris Izworski<\/a>/.test(html) && /class="site-footer"[\s\S]*Chris Izworski/.test(html));
});

section('Access', 'Keyboard, screen reader and a thumb', () => {
  crit(35, 'Every input and select labelled', () => [...html.matchAll(/<(select|input)\b([^>]*)>/g)].filter(m => !/type="(radio|hidden)"/.test(m[2])).every(m => { const id = (m[2].match(/id="([^"]+)"/) || [])[1]; return /aria-label/.test(m[2]) || (id && html.includes('for="' + id + '"')); }));
  crit(25, 'Status region for the answer', () => /id="pnLive" role="status" aria-live="polite"/.test(html));
  crit(20, 'Focus styles and 44px controls from the kit', () => fs.readFileSync(pub('assets/garden-tools/garden-kit.css'), 'utf8').includes(':focus-visible') && /min-height:4[46]px/.test(fs.readFileSync(pub('assets/garden-tools/garden-kit.css'), 'utf8')));
  crit(20, 'No inline click handlers', () => !/onclick="/.test(html));
});

let worst = 100, sum = 0;
console.log('Michigan gardening hub: section value functions (automated proxy, NOT human research)');
console.log('-'.repeat(78));
for (const s of sections) {
  const max = s.crit.reduce((a, c) => a + c.w, 0) || 1; s.score = Math.round(s.crit.reduce((a, c) => a + c.w * c.s, 0) / max * 100);
  worst = Math.min(worst, s.score); sum += s.score;
  console.log(String(s.score).padStart(3) + '  ' + s.name.padEnd(30) + s.promise + (s.grade ? '  [grade ' + s.grade + ']' : '') + (s.error ? '  ERROR ' + s.error : ''));
  for (const c of s.crit.filter(c => c.s < 1)) console.log('       -' + Math.round(c.w * (1 - c.s)) + ' ' + c.name + (c.note ? ' (' + c.note + ')' : ''));
}
const mean = sum / sections.length;
console.log('-'.repeat(78));
console.log('MEAN ' + mean.toFixed(1) + '   LOWEST ' + worst + '   (gate: every section >= 90, mean >= 95)');
if (process.argv.includes('--json')) fs.writeFileSync(process.argv[process.argv.indexOf('--json') + 1], JSON.stringify(sections.map(s => ({ name: s.name, score: s.score, crit: s.crit })), null, 1));
if (process.argv.includes('--check') && (worst < 90 || mean < 95)) process.exitCode = 1;
