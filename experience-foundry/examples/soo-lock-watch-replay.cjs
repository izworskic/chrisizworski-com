'use strict';
// Bounded Foundry replay for the Soo Locks Lock Watch planner. It loads the
// planner core and page HTML only from --source-root and runs the same dated
// fixture against baseline and candidate. Real-browser behaviour (chips, rows,
// map focus, no-JS, failure) is covered by tests/soo-lock-watch-browser.cjs.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const i = process.argv.indexOf('--source-root');
if (i < 0 || !process.argv[i + 1]) throw Error('Expected --source-root');
const root = process.argv[i + 1];
const read = f => { try { return fs.readFileSync(path.join(root, f), 'utf8'); } catch { return null; } };
const html = read('public/soo-locks/index.html');
const ais = read('public/assets/soo-ais.js');
const engine = read('lib/soo-locks-next.js');
if (!html || !ais || !engine) throw Error('Missing scoped Soo Locks source');
const cases = [];
const add = (id, passed, observed) => cases.push({ id, passed: Boolean(passed), observed: String(observed).slice(0, 600) });

// Fixed fixture: 9:45 a.m. EST, Saturday November 21, 2026.
const NOW = Date.parse('2026-11-21T14:45:00Z');
const iso = m => new Date(NOW + m * 60000).toISOString();
const data = {
  ok: true, checkedAt: iso(0), vessels: [],
  nextShip: {
    ok: true,
    inLock: [{ id: '366971370', mmsi: '366971370', name: 'EDWIN H. GOTT', state: 'in-lock', chamberName: 'Poe Lock', direction: 'downbound', seen: iso(-1), ageMinutes: 1 }],
    candidates: [
      { id: '366972000', mmsi: '366972000', name: 'BURNS HARBOR', state: 'approaching', direction: 'upbound', lockCertain: true, ageMinutes: 2, window: { start: iso(105), midpoint: iso(160), end: iso(235) } },
      { id: '316001234', mmsi: '316001234', name: 'ALGOMA EQUINOX', state: 'approaching', direction: 'downbound', lockCertain: false, ageMinutes: 2, window: { start: iso(510), midpoint: iso(560), end: iso(610) } }
    ],
    pick: { id: '366972000' }
  }
};

// Load the planner core exactly as the browser would, without a DOM.
let core = null;
const src = read('public/assets/soo-lock-watch.js');
if (src) {
  const sandbox = { module: { exports: {} }, Intl, Date, Math, Number, String, Array, Object, JSON };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(src, sandbox, { filename: 'soo-lock-watch.js', timeout: 5000 });
  core = sandbox.module.exports && sandbox.module.exports.plan ? sandbox.module.exports : null;
}
const wired = html.includes('id="soo-lock-watch"') && html.includes('/assets/soo-lock-watch.js');

if (!core || !wired) {
  const why = !src ? 'Baseline has no visit planner: the page offers one next-ship pick and a run-on "Also heading in" sentence.' : 'Planner script is not wired into the page.';
  add('visit-time-changes-answer', false, why);
  add('after-hours-and-dark-flagged', false, why + ' Arrival windows are never compared with posted park hours or daylight.');
  add('a-b-a-selection-identity', false, why + ' Only the single pick has a detail; other ships cannot be selected.');
  add('missed-visit-offers-cover', false, why);
} else {
  const plan = (o, s, now = NOW) => core.plan({ data, now, startOffset: o, stay: s });
  const a = plan(0, 90), b = plan(120, 90);
  add('visit-time-changes-answer', a.status === 'in-lock-now' && /EDWIN H\. GOTT/.test(a.headline) && b.status === 'match' && /BURNS HARBOR/.test(b.headline),
    `Now/90: ${a.status} "${a.headline}"; +2h/90: ${b.status} "${b.headline}"`);
  const late = b.ships.find(s => s.id === '316001234'), burns = b.ships.find(s => s.id === '366972000');
  add('after-hours-and-dark-flagged', late && late.afterClose && late.dark && burns && !burns.afterClose && !burns.dark && burns.parkLabel === '9 a.m. to 6 p.m.',
    `ALGOMA afterClose=${late && late.afterClose} dark=${late && late.dark}; BURNS afterClose=${burns && burns.afterClose} dark=${burns && burns.dark} hours=${burns && burns.parkLabel}`);
  // The same stable IDs survive a visit change and back; the verdict for A is identical after B.
  const a2 = plan(0, 90);
  const ids = p => p.ships.map(s => s.id).join(',');
  add('a-b-a-selection-identity', ids(a) === ids(b) && ids(a) === ids(a2) && a2.headline === a.headline && a.ships.every(s => /^\d{9}$/.test(s.id)),
    `IDs A=${ids(a)} B=${ids(b)} A'=${ids(a2)}; verdict restored=${a2.headline === a.headline}`);
  const miss = plan(30, 45);
  add('missed-visit-offers-cover', miss.status === 'none' && miss.suggestion && miss.suggestion.id === '366972000' && /beyond this view/.test(miss.detail.join(' ')),
    `+30/45: ${miss.status}; suggestion=${miss.suggestion && miss.suggestion.id}; ${miss.detail.join(' ')}`);
}

// Preservation: search identity, the next-ship engine and the existing answer order.
add('preserve-search-identity',
  html.includes('<title>Soo Locks Schedule Today: Ships &amp; Map | Chris Izworski</title>') &&
  html.includes('<link rel="canonical" href="https://chrisizworski.com/soo-locks/">') &&
  html.includes('"@id": "https://chrisizworski.com/#person"') &&
  (html.match(/data-in-article-ad-break/g) || []).length === 1 &&
  html.indexOf('id="soo-next-ship"') < html.indexOf('id="soo-schedule-answer"') &&
  html.includes('id="sooVesselMap"'),
  'Title, canonical, Person node, single ad-break marker, next-ship-before-schedule order and live map container checked.');
{
  const m = { exports: {} };
  new Function('module', 'exports', 'require', engine)(m, m.exports, () => { throw Error('unexpected require'); });
  const w = m.exports.minutesToLock(10, 10);
  add('preserve-arrival-engine', m.exports.buildCandidates && Math.round(w) === 78 && ais.includes('/api/soo-ais'),
    `Engine minutesToLock(10 nm, 10 kn)=${Math.round(w)} min; client still reads /api/soo-ais.`);
}
console.log(JSON.stringify({ cases }));
