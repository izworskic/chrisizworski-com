const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const jsPath = path.join(root, 'public/assets/porkies-explorer.js');
const html = fs.readFileSync(path.join(root, 'public/porcupine-mountains/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/assets/porkies-explorer.css'), 'utf8');
const sandbox = { module: { exports: {} }, globalThis: {} };
vm.runInNewContext(fs.readFileSync(jsPath, 'utf8'), sandbox, { filename: jsPath });
const { recommend, seasonFor } = sandbox.module.exports;
function plan(overrides) {
  return recommend(Object.assign({ date:'2026-10-28', arrival:'east', hours:4, ability:'moderate', interest:'mix' }, overrides || {}));
}
test('season labels preserve seasonal access uncertainty', () => {
 assert.equal(seasonFor('2027-01-15'), 'winter');
 assert.equal(seasonFor('2027-05-16'), 'reopening');
 assert.equal(seasonFor('2026-11-14'), 'prewinter');
 assert.equal(seasonFor('2027-08-04'), 'ordinary');
 assert.equal(seasonFor('nonsense'), 'unknown');
 assert.equal(seasonFor('2027-02-30'), 'unknown');
});
test('winter never advertises the summertime M-107 or South Boundary drive', () => {
 const p = plan({date:'2027-01-15', arrival:'west', hours:8});
 assert.equal(p.mode,'winter');
 assert.equal(p.stops.length,1);
 assert.match(p.stops[0].name,/Presque Isle/);
 const east=plan({date:'2027-01-15',arrival:'east'});
 assert.match(east.stops[0].name,/Winter Sports/);
 assert.ok(p.excluded.some(s=>/Lake of the Clouds/.test(s)));
 assert.ok(p.excluded.some(s=>/Summit Peak/.test(s)));
 assert.ok(p.warnings.some(s=>/South Boundary Road/.test(s)));
});
test('May reopening is not assumed open', () => {
 const p=plan({date:'2027-05-02', arrival:'east', hours:16});
 assert.equal(p.mode,'reopening');
 assert.equal(p.stops.length,1);
 assert.match(p.stops[0].name,/Visitor Center Nature Trail/);
 assert.ok(p.excluded.some(s=>/not assumed available/.test(s)));
});
test('two-hour arrival direction selects one district and rejects far detours', () => {
 const west=plan({arrival:'west',hours:2,interest:'views'});
 const east=plan({arrival:'east',hours:2,interest:'falls'});
 assert.equal(west.stops.length,1);
 assert.match(west.stops[0].name,/Presque Isle/);
 assert.ok(west.excluded.some(s=>/Lake of the Clouds/.test(s)));
 assert.equal(east.stops.length,1);
 assert.match(east.stops[0].name,/Lake of the Clouds/);
 assert.ok(east.excluded.some(s=>/Presque Isle/.test(s)));
});
test('low mobility never includes Summit Peak tower on a short visit', () => {
 const p=plan({arrival:'inpark',hours:4,ability:'low',interest:'forest'});
 assert.ok(!p.stops.some(s=>/Summit Peak/.test(s.name)));
});
test('accessible waterfall claim remains specific to Nawadaha, not the whole loop', () => {
 const p=plan({arrival:'west',hours:2,ability:'low',interest:'falls'});
 assert.ok(p.warnings.some(s=>/Only the Nawadaha observation platform/.test(s)));
});
test('full-day and multi-day retain uncertainty and the official map', () => {
 for (const hours of [8,16]) {
  const p=plan({arrival:'west',hours:hours,ability:'high',interest:'forest'});
  assert.ok(p.stops.length>=2);
  assert.ok(p.warnings.some(s=>/No driving ETA/.test(s)));
  assert.ok(p.sources.some(s=>s.url.includes('porcupine_mountains_map.pdf')));
 }
});
test('untrusted invalid inputs cannot generate fictitious access claims', () => {
 const p=plan({date:'invalid',arrival:'wat',hours:-100,ability:'fly',interest:'anything'});
 assert.equal(p.mode,'unknown');
 assert.equal(p.stops.length,0);
});
test('static page remains useful with JavaScript disabled', () => {
 for (const anchor of ['id="decision"','id="lake"','id="presque"','id="summit"','id="sources"']) assert.ok(html.includes(anchor));
 for (const u of ['/lake-superior-circle-tour/','/upper-peninsula-waterfalls/nawadaha-falls/','/upper-peninsula-waterfalls/manido-falls/','/upper-peninsula-waterfalls/manabezho-falls/','/fall-color/porcupine-mountains-fall-color/']) assert.ok(html.includes(u));
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/© 2026/);
 assert.match(html,/Chris Izworski/);
 assert.ok(!html.includes('Dark Sky Preserve'));
 assert.ok(!/live parking|parking available now|currently open trail/i.test(html));
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(css,/:focus-visible/);
});

test('wilderness itineraries explicitly reject unverified crossings and full through routes',()=>{
 const p=plan({arrival:'west',hours:16,ability:'high',interest:'forest'});
 assert.ok(p.stops.some(s=>s.zone==='interior'));
 assert.ok(p.warnings.some(s=>/No crossing-dependent Big Carp/.test(s)));
 assert.ok(p.excluded.some(s=>/Unverified river-to-river/.test(s)));
 assert.ok(p.sources.some(s=>s.url.includes('Porcupine-Mountains-State-Park-Map-GPS.pdf')));
});

test('park interpreter keeps the landscapes ahead of GIS research and maintains real access caveats', () => {
 const hero=html.indexOf('class="hero"');
 const stories=html.indexOf('id="places"');
 const forest=html.indexOf('id="more"');
 const chooser=html.indexOf('id="decision"');
 const atlas=html.indexOf('id="access-atlas"');
 const evidence=html.indexOf('id="park-access-evidence"');
 assert.ok(hero>=0 && hero<stories && stories<forest && forest<chooser && chooser<atlas && atlas<evidence);
 assert.match(html,/hear the Presque Isle before you see it/i);
 assert.match(html,/Lake of the Clouds rests beneath/i);
 assert.match(html,/old-growth groves/i);
 assert.match(html,/The DNR documents an accessible platform for Nawadaha/i);
 assert.match(html,/No automated through-route/i);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.equal((html.match(/class="parking-card"/g)||[]).length,6);
});
