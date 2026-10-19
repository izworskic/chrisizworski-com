import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { FACTS, SOURCES, NOT_COVERED, CHECKED_ON, OPTIONS } from '../lib/snowmobile/rules.mjs';
import { REGIONS } from '../lib/snowmobile/regions.mjs';

const require = createRequire(import.meta.url);
const root = new URL('../', import.meta.url);
const read = (rel) => readFileSync(new URL(rel, root), 'utf8');
const Need = require('../public/assets/snowmobile-need.js');
const PAGE = 'public/snowmobile/what-you-need/index.html';
const URL_ = 'https://chrisizworski.com/snowmobile/what-you-need/';
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/\s+/g, ' ');
const combos = [];
for (const home of OPTIONS.home) for (const age of OPTIONS.age) for (const where of OPTIONS.where) combos.push({ home: home.id, age: age.id, where: where.id });
const byId = (list, id) => list.find((i) => i.id === id);

test('the checker gives a coherent answer for every one of the 24 combinations', () => {
  assert.equal(combos.length, 24);
  for (const c of combos) {
    const list = Need.checklist(c, FACTS);
    for (const id of ['permit', 'registration', 'age', 'helmet', 'lights', 'always']) assert.ok(byId(list, id), `${JSON.stringify(c)} missing ${id}`);
    for (const i of list) { assert.ok(i.title && i.text.length > 30, `${JSON.stringify(c)} ${i.id}`); assert.doesNotMatch(i.text, /undefined|NaN|\[object/); }
    const permit = byId(list, 'permit').status, reg = byId(list, 'registration').status;
    // Independent expectation table, written from the DNR wording rather than from the code.
    const wantPermit = { public: 'need', free: 'waived', ice: 'not-needed', private: 'not-needed' }[c.where];
    assert.equal(permit, wantPermit, `permit ${JSON.stringify(c)}`);
    const wantReg = c.where === 'free' ? 'waived' : c.where === 'private' ? 'not-needed' : 'need';
    assert.equal(reg, wantReg, `registration ${JSON.stringify(c)}`);
  }
});

test('the ice-fishing exemption covers the permit only, never registration', () => {
  for (const home of ['mi', 'out']) {
    const l = Need.checklist({ home, age: 'adult', where: 'ice' }, FACTS);
    assert.equal(byId(l, 'permit').status, 'not-needed');
    assert.equal(byId(l, 'registration').status, 'need');
  }
});

test('residents register with the Secretary of State; visitors show a home registration', () => {
  assert.match(byId(Need.checklist({ home: 'mi', age: 'adult', where: 'public' }, FACTS), 'registration').text, /Secretary of State/);
  const out = byId(Need.checklist({ home: 'out', age: 'adult', where: 'public' }, FACTS), 'registration').text;
  assert.match(out, /home state or province/);
  assert.doesNotMatch(out, /Secretary of State/);
});

test('age rules match the DNR: 12 to 16 certificate, under 12 supervision and no road crossing', () => {
  const teen = byId(Need.checklist({ home: 'mi', age: 'teen', where: 'public' }, FACTS), 'age');
  assert.equal(teen.status, 'limit');
  assert.match(teen.text, /12 to 16/); assert.match(teen.text, /direct adult supervision/); assert.match(teen.text, /may not cross a street or highway/);
  const child = byId(Need.checklist({ home: 'mi', age: 'child', where: 'public' }, FACTS), 'age');
  assert.match(child.text, /under 12/i); assert.match(child.text, /may not cross a street or highway/);
  const adult = byId(Need.checklist({ home: 'mi', age: 'adult', where: 'public' }, FACTS), 'age');
  assert.equal(adult.status, 'info'); assert.match(adult.text, /recommends/);
});

test('free weekend: waived on DNR trails only, everything else still applies', () => {
  const l = Need.checklist({ home: 'out', age: 'teen', where: 'free' }, FACTS);
  assert.match(byId(l, 'permit').text, /DNR trails only/);
  assert.match(byId(l, 'freeRules').text, /All other snowmobile rules/);
  assert.equal(byId(l, 'helmet').status, 'need');
});

test('helmet is required for everyone except on own private property', () => {
  assert.equal(byId(Need.checklist({ home: 'mi', age: 'adult', where: 'public' }, FACTS), 'helmet').status, 'need');
  assert.equal(byId(Need.checklist({ home: 'mi', age: 'adult', where: 'private' }, FACTS), 'helmet').status, 'info');
});

test('bad input falls back to the defaults instead of throwing', () => {
  assert.deepEqual(Need.clean({ home: 'x', age: 9, where: null }), Need.DEFAULTS);
  assert.doesNotThrow(() => Need.checklist(undefined, FACTS));
});

test('the page carries every fact in static HTML, so it reads without JavaScript', () => {
  const t = text(read(PAGE));
  for (const needle of [FACTS.permit.fee, FACTS.permit.previousFee, FACTS.permit.validFrom, FACTS.permit.validTo, FACTS.permit.onSale, FACTS.season.opens, FACTS.season.closes, 'Secretary of State', '12 to 16', 'Free Snowmobiling Weekend', 'crash helmet', 'eLicense', 'MISORVA']) assert.ok(t.includes(needle), `static page missing "${needle}"`);
  assert.ok(t.includes('October 19, 2026'));
});

test('nothing unsourced: no insurance, lug-height or registration-fee claims; gaps are stated', () => {
  const t = text(read(PAGE));
  assert.doesNotMatch(t, /insurance (is|are) required|must (carry|have) insurance|lug height (is|must)|registration (fee|costs?) (is|are) \$/i);
  assert.equal(NOT_COVERED.length, 4);
  for (const g of NOT_COVERED) assert.ok(t.includes(g.slice(0, 40)), g);
});

test('every external source is https, on an expected host, and reachable by a known label', () => {
  const hosts = new Set(['www.michigan.gov', 'www.mdnr-elicense.com', 'misorva.org', 'snowmobile-ed.com']);
  for (const [k, s] of Object.entries(SOURCES)) { const u = new URL(s.url); assert.equal(u.protocol, 'https:', k); assert.ok(hosts.has(u.host), `${k} ${u.host}`); }
  const html = read(PAGE);
  for (const key of ['permits', 'fee', 'age', 'certificate', 'freeWeekend', 'handbook']) assert.ok(html.includes(SOURCES[key].url), key);
});

test('search metadata, schema and discovery are correct', () => {
  const html = read(PAGE);
  const title = html.match(/<title>([^<]+)<\/title>/)[1].replace(/&amp;/g, '&');
  const meta = html.match(/<meta name="description" content="([^"]+)"/)[1].replace(/&amp;/g, '&');
  assert.ok(title.length >= 30 && title.length <= 60 && title.endsWith('Chris Izworski'), title);
  assert.ok(meta.length >= 90 && meta.length <= 158, `description ${meta.length}`);
  assert.ok(html.includes(`<link rel="canonical" href="${URL_}">`));
  assert.match(html, /Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/">Chris Izworski<\/a>/);
  assert.ok(html.includes('google-adsense-account') && html.includes('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'));
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  assert.equal(ld.length, 1);
  const g = ld[0]['@graph'];
  assert.ok(g.some((n) => n['@type'] === 'Person' && n['@id'] === 'https://chrisizworski.com/#person'));
  const page = g.find((n) => n['@type'] === 'WebPage');
  assert.equal(page.url, URL_); assert.equal(page.dateModified, CHECKED_ON);
  const faq = g.find((n) => n['@type'] === 'FAQPage');
  assert.ok(faq.mainEntity.length >= 7);
  for (const q of faq.mainEntity) { assert.ok(html.includes(`>${q.name.replace(/'/g, '&#39;')}</h3>`), q.name); assert.ok(q.acceptedAnswer.text.length >= 300, q.name); }
  const sm = read('public/sitemap-winter.xml');
  assert.ok(sm.includes(`<loc>${URL_}</loc><lastmod>${page.dateModified}</lastmod>`), 'sitemap-winter lastmod matches dateModified');
  assert.ok(read('public/llms.txt').includes(URL_));
});

test('the planner and all seven regions link to the page', () => {
  assert.ok(read('public/snowmobile/index.html').includes('href="/snowmobile/what-you-need/"'));
  for (const r of REGIONS) assert.ok(read(`public/snowmobile/regions/${r.key}.html`).includes('href="/snowmobile/what-you-need/"'), r.key);
  const html = read(PAGE);
  for (const href of ['/snowmobile/', '/michigan-snow-totals/', '/michigan-snow-depth/']) assert.ok(html.includes(`href="${href}"`), href);
});

test('the checker stores and sends nothing', () => {
  const js = read('public/assets/snowmobile-need.js');
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|gtag|localStorage|sessionStorage|geolocation|document\.cookie/);
});

test('the committed page is exactly what the generator produces', () => {
  const before = read(PAGE);
  const r = spawnSync(process.execPath, ['scripts/generate-snowmobile-need-page.mjs'], { cwd: new URL('../', import.meta.url).pathname, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.equal(read(PAGE), before, 'run node scripts/generate-snowmobile-need-page.mjs and commit the result');
});
