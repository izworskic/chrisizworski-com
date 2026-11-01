'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'public/leafcutter-bees/index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];

function planner(options={}) {
  const nodes = {};
  function element(id) {
    return nodes[id] ||= {
      id, value: '', textContent: '', children: [], attrs: {}, handlers: {},
      addEventListener(type, handler) { this.handlers[type] = handler; },
      appendChild(child) { this.children.push(child); },
      setAttribute(k, v) { this.attrs[k] = v; },
      getAttribute(k) { return this.attrs[k]; },
    };
  }
  for (const k of ['zone','month','flowers','temp','nest','region','result-title','result-text',
    'result-actions','result-caveat','season-label','season-head','season-intro','season-actions','season-foot', 'brood-stage','brood-stage-wrap', 'bee-location', 'bee-check', 'bee-weather-status','bee-day-strip','bee-issued','bee-flower-guide','bee-flower-list','bee-forecast-desk']) element(k);
  Object.assign(nodes.zone, { value: '6a' });
  Object.assign(nodes.flowers, { value: 'unknown' });
  Object.assign(nodes.temp, { value: 'unknown' });
  Object.assign(nodes.nest, { value: 'none' });
  Object.assign(nodes.region, { value: 'michigan' });
  Object.assign(nodes['brood-stage'], {value: 'planning'});
  Object.assign(nodes['bee-location'], {value: 'bay-city'});
  const paths = ['wild','managed'].map(v => ({
    ...element('path-' + v),
    getAttribute(k) { return k === 'data-path' ? v : this.attrs[k]; }
  }));
  const seasons = ['spring','summer','fall','winter'].map(v => ({
    ...element('season-' + v),
    getAttribute(k) { return k === 'data-season' ? v : this.attrs[k]; }
  }));
  const document = {
    getElementById: element,
    querySelectorAll(q) { return q === '[data-path]' ? paths : q === '[data-season]' ? seasons : []; },
    createElement(tag) { return { textContent: '', tag, appendChild() {}, className: '', attrs: {} }; },
    createTextNode(t) { return {textContent:t}; }
  };
  vm.runInNewContext(script, { document, Date: options.Date || Date, fetch: options.fetch });
  function set(k, v) { nodes[k].value = v; nodes[k].handlers.change(); }
  return { nodes, paths, seasons, set,
    title: () => nodes['result-title'].textContent,
    caveat: () => nodes['result-caveat'].textContent };
}

test('leafcutter guide is indexable with valid JSON-LD, primary sources and accessible planner', () => {
  assert.equal((html.match(/<h1\b/g) || []).length, 1);
  assert.match(html, /rel="canonical" href="https:\/\/chrisizworski.com\/leafcutter-bees\/"/);
  assert.ok(script);
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(json['@graph'].some(item => item['@type'] === 'WebApplication'));
  for (const s of ['Michigan State','Xerces','USGS','SARE','Crown Bees','leafcutter-bees/#bee-planner']) {
    if (s === 'leafcutter-bees/#bee-planner') assert.ok(html.includes(s)); else assert.ok(html.includes(s), s);
  }
  assert.match(html, /Five steps to put occupied nesting tubes away safely/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /@media\(max-width:760px\)\{[\s\S]*?\.house-grid\{grid-template-columns:1fr\}/);
  assert.ok((html.match(/<img\b/g) || []).length >= 2);
});

test('leafcutter planner separates winter care and safe summer merchant conditions', () => {
  const p = planner();
  p.set('month', '10'); p.set('nest', 'full');
  assert.match(p.title(), /Occupied nests/);
  p.set('month', '6'); p.set('nest', 'empty'); p.set('flowers', 'yes'); p.set('temp', 'warm');
  p.paths[1].handlers.click();
  assert.match(p.title(), /Conditions match/);
  p.set('temp', 'cool'); assert.match(p.title(), /Do not schedule/);
  p.set('temp', 'warm'); p.set('flowers', 'no'); assert.match(p.title(), /Do not schedule/);
  p.paths[0].handlers.click(); assert.match(p.title(), /flowers are not/);
  p.set('month', '0'); p.set('nest', 'none'); assert.match(p.title(), /Plan your bee habitat/);
  p.set('zone', '3a'); assert.match(p.caveat(), /colder northern zone/);
  p.set('zone', '9b'); assert.match(p.caveat(), /warmer zone/);
  p.seasons[1].handlers.click(); assert.match(p.nodes['season-head'].textContent, /mothers/);
});


test('leafcutter stage control never mislabels dormant prepupae as release-ready', () => {
  const p = planner();
  p.set('month', '6');
  p.set('flowers', 'yes');
  p.set('temp', 'warm');
  p.paths[1].handlers.click();
  assert.equal(p.nodes['brood-stage-wrap'].hidden, false);
  p.set('brood-stage', 'dormant');
  assert.match(p.title(), /Protect dormant prepupae/);
  assert.doesNotMatch(p.title(), /Conditions match/);
  p.set('brood-stage', 'unknown');
  assert.match(p.title(), /confirm what stage/);
  p.set('brood-stage', 'ready');
  p.set('flowers', 'no');
  assert.match(p.title(), /poor for arriving ready-to-emerge/);
  p.set('month', '10');
  assert.match(p.title(), /cannot be put back to sleep/);
  p.paths[0].handlers.click();
  assert.equal(p.nodes['brood-stage-wrap'].hidden, true);
});

test('three-stage winter and incubation guide distinguishes wild nests and managed cocoons', () => {
  assert.match(html, /id="release-and-dormancy"/);
  assert.match(html, /cannot be placed back into winter dormancy/i);
  assert.match(html, /roughly 39–50°F/);
  assert.match(html, /do not mean putting damp wild nesting tubes in a household refrigerator/i);
  assert.match(html, /Do not offer one exact countdown/);
  assert.match(html, /Around 60°F daytime temperatures is a/);
  assert.match(html, /Crown Bees incubation explanation/);
  assert.match(html, /Kemp &amp; Bosch, 2001/);
});

test('release forecast desk keeps blooms and actual observation separate', () => {
  assert.match(html, /id="bee-location"/);
  assert.match(html, /id="bee-check"/);
  assert.match(html, /id="bee-day-strip"/);
  assert.match(html, /id="bee-flowers"/);
  assert.match(html, /climatological reference/);
  assert.match(html, /Forecast does not equal clearance/);
  assert.match(html, /National Weather Service/);
  assert.match(html, /Typical plant seasons/);
});


test('forecasts never override flowers, nest, stage or fail-closed behavior', async () => {
  class SummerDate extends Date {
    constructor(...args) { if (args.length) super(...args); else super('2026-07-14T14:00:00Z'); }
    static now() { return Date.parse('2026-07-14T14:00:00Z'); }
  }
  let unavailable=false;
  const forecast={
    scope:'forecast-planning-only',provider:'National Weather Service',forecastOnly:true,
    issuedAt:'2026-07-14T12:00:00Z',checkedAt:'2026-07-14T14:00:00Z',
    sourceUrl:'https://api.weather.gov/gridpoints/DTX/99,99/forecast/hourly',
    site:{id:'bay-city'},status:'WARM_STRETCH',fresh:true,
    firstWarmStretch:{startDate:'2026-07-15',endDate:'2026-07-16'},
    daily:[{date:'2026-07-15',highF:78,precipPeakPct:20,signal:'WARM_DAY'},
           {date:'2026-07-16',highF:79,precipPeakPct:20,signal:'WARM_DAY'}]
  };
  const fetch=async url=>{
    if (url.includes('mode=locations')) return {ok:true,json:async()=>({locations:[{id:'bay-city',name:'Bay City',region:'Central Lower'}]})};
    if (unavailable) return {ok:false,status:503};
    return {ok:true,json:async()=>forecast};
  };
  const p=planner({Date:SummerDate,fetch});
  p.set('month','6');p.set('nest','empty');p.set('flowers','yes');
  p.paths[1].handlers.click();
  await p.nodes['bee-check'].handlers.click();
  assert.match(p.title(),/possible release-planning window/);
  assert.doesNotMatch(p.title(),/release today/i);
  p.set('flowers','no');assert.match(p.title(),/not release-ready/);
  p.set('flowers','yes');p.set('nest','none');assert.match(p.title(),/not release-ready/);
  p.set('nest','empty');p.set('month','10');assert.match(p.title(),/Plan your bee habitat/);
  p.set('month','6');unavailable=true;
  await p.nodes['bee-check'].handlers.click();
  assert.match(p.title(),/Forecast unavailable/);
  assert.doesNotMatch(p.title(),/possible release-planning window/);
});
