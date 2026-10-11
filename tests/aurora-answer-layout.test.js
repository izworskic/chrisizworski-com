const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/northern-lights-michigan/index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const LOCATIONS ='));
function page() {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent:'', innerHTML:''});
    return nodes.get(id);
  };
  node('regionSelect').options = [{text:'Bay City / Saginaw Bay'}];
  node('regionSelect').selectedIndex = 0;
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-11T16:00:00Z'])); }
    static now() { return Date.parse('2026-10-11T16:00:00Z'); }
  }
  const context = vm.createContext({Date:FixedDate, document:{getElementById:node}, window:{addEventListener(){}}, localStorage:{getItem(){return null;}}});
  vm.runInContext(script, context);
  return {context, node, run:s => vm.runInContext(s, context)};
}
const region = threshold => ({label:'Bay City', latitude:43.59, longitude:-83.89, planning_kp:threshold, sky_cover:{periods:[{start_time:'2026-10-12T02:00:00Z',end_time:'2026-10-12T08:00:00Z',percent:20}]}});

test('first regional answer uses the nighttime choice rather than an elevated daytime peak', () => {
  const p = page();
  p.context.region = region(7);
  p.context.periods = [{time_tag:'2026-10-11T21:00:00Z',kp:5.7},{time_tag:'2026-10-12T03:00:00Z',kp:3.3}];
  p.run('renderTonightWindow(periods, region)');
  assert.match(p.node('localHeadline').textContent, /Low/);
  assert.match(p.node('localDetail').textContent, /Kp 3\.3/);
  assert.doesNotMatch(p.node('localDetail').textContent, /5\.7/);
  assert.equal(p.node('tonightBestTime').textContent, '11:00 PM');
  assert.match(p.node('selectedCloud').textContent, /20%/);
  assert.match(p.node('localRegion').textContent, /Bay City/);
});

test('changing region thresholds updates the answer, with unknown clouds preserved', () => {
  const p = page();
  p.context.periods = [{time_tag:'2026-10-12T03:00:00Z',kp:5}];
  for (const [threshold, expected] of [[7,'Low'],[6,'Borderline'],[4,'worth monitoring']]) {
    p.context.region = {...region(threshold), sky_cover:{periods:[]}};
    p.run('renderTonightWindow(periods, region)');
    assert.match(p.node('localHeadline').textContent, new RegExp(expected));
    assert.equal(p.node('selectedCloud').textContent, 'NWS data unavailable');
  }
});

test('a missing forecast clears the previous regional answer and planning time', () => {
  const p = page();
  p.context.region = region(4);
  p.context.periods = [{time_tag:'2026-10-12T03:00:00Z',kp:5}];
  p.run('renderTonightWindow(periods, region)');
  assert.match(p.node('localHeadline').textContent, /worth monitoring/);
  p.run('renderTonightWindow(null, null)');
  assert.equal(p.node('localHeadline').textContent, 'Nighttime signal unavailable');
  assert.equal(p.node('tonightBestTime').textContent, 'Time unavailable');
  assert.match(p.node('localRegion').textContent, /Bay City \/ Saginaw Bay/);
  assert.doesNotMatch(p.node('localDetail').textContent, /Kp 5/);
});
