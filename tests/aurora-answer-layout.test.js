const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync('public/northern-lights-michigan/index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('const LOCATIONS ='));
function page(now = '2026-10-11T16:00:00Z') {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, {textContent:'', innerHTML:''});
    return nodes.get(id);
  };
  node('regionSelect').options = [{value:'bay-city',text:'Bay City / Saginaw Bay'},{value:'detroit',text:'Detroit / southern Michigan'},{value:'mackinaw-city',text:'Mackinaw City / Straits'}];
  node('regionSelect').selectedIndex = 0;
  Object.defineProperty(node('regionSelect'),'value',{
    get(){return this.options[this.selectedIndex].value;},
    set(value){this.selectedIndex=this.options.findIndex(option=>option.value===value);}
  });
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return Date.parse(now); }
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

test('an active NOAA interval remains eligible after its start, with current cloud cover', () => {
  const p = page('2026-10-12T03:30:00Z');
  p.context.region = {...region(7),sky_cover:{periods:[
    {start_time:'2026-10-12T03:00:00Z',end_time:'2026-10-12T03:15:00Z',percent:90},
    {start_time:'2026-10-12T03:15:00Z',end_time:'2026-10-12T09:00:00Z',percent:20}
  ]}};
  p.context.periods = [{time_tag:'2026-10-12T03:00:00Z',kp:7},{time_tag:'2026-10-12T06:00:00Z',kp:2}];
  p.run('renderTonightWindow(periods, region)');
  assert.match(p.node('localHeadline').textContent,/worth monitoring/);
  assert.match(p.node('localDetail').textContent,/Kp 7\.0/);
  assert.equal(p.node('tonightBestTime').textContent,'11:30 PM');
  assert.match(p.node('selectedCloud').textContent,/20%/);
});

test('an interval ending now is excluded and a daytime-starting interval can overlap darkness', () => {
  const p = page('2026-10-12T06:00:00Z');
  p.context.region = region(7);
  p.context.periods = [{time_tag:'2026-10-12T03:00:00Z',kp:7},{time_tag:'2026-10-12T06:00:00Z',kp:2}];
  p.run('renderTonightWindow(periods, region)');
  assert.match(p.node('localDetail').textContent,/Kp 2\.0/);
  const evening = page();
  evening.context.region = region(7);
  evening.context.periods = [{time_tag:'2026-10-12T00:00:00Z',kp:7}];
  evening.run('renderTonightWindow(periods, region)');
  assert.match(evening.node('localHeadline').textContent,/worth monitoring/);
  assert.notEqual(evening.node('tonightBestTime').textContent,'8:00 PM');
});

test('changing regions with no live data updates the degraded label and clears the verdict', () => {
  const p = page();
  p.context.region = region(7);
  p.context.periods = [{time_tag:'2026-10-12T03:00:00Z',kp:7}];
  p.run('renderTonightWindow(periods, region)');
  p.run("setSelectedRegion('detroit', 'selector', false)");
  assert.equal(p.node('regionSelect').value,'detroit');
  assert.match(p.node('localRegion').textContent,/Detroit/);
  assert.equal(p.node('localHeadline').textContent,'Nighttime signal unavailable');
  assert.equal(p.node('tonightBestTime').textContent,'Time unavailable');
});
