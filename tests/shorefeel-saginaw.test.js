'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {DESTINATIONS,waterEvidence,parseGLSEAGridCsv}=require('../lib/shorefeel/engine.js');
const {BEACHES}=require('../lib/shorefeel/beach-forecast.js');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
test('Saginaw Bay uses Lake Huron, seasonal NOAA buoy 45163 and distinct spatial samples',()=>{
 const p=DESTINATIONS['saginaw-bay'];
 assert.ok(p);assert.equal(p.lake,'huron');assert.equal(p.station,'45163');
 assert.equal(p.primaryCell,'inner-bay');assert.equal(p.cells.length,2);
 assert.ok(p.cells.every(c=>c.maxKm<=4),'satellite pixels must be close to their disclosed reference coordinates');
 assert.match(p.stationCaveat,/seasonal/);
 assert.equal(BEACHES['saginaw-bay'],undefined,'do not present unvalidated Saginaw Bay model as a beach forecast');
});
test('remote buoy cannot be promoted to the Bay City beach reading even when satellite is absent',()=>{
 const p=DESTINATIONS['saginaw-bay'];
 const distant={tempF:60.4,observedAt:'2026-11-07T12:00:00Z',ageHours:0.5};
 assert.equal(waterEvidence(p,distant,null),null);
 assert.equal(waterEvidence(p,distant,{'west-bay':{tempF:61.1,observedAt:'2026-11-07T12:00:00Z'}}),null,
  'a satellite pixel from the other bay sector cannot be silently promoted to the park beach');
 const near={'inner-bay':{tempF:58.5,observedAt:'2026-11-06T12:00:00Z',sampleLat:43.702,sampleLon:-83.858,ageHours:24}};
 const result=waterEvidence(p,distant,near);
 assert.equal(result.kind,'satellite');
 assert.equal(result.cellKey,'inner-bay');
 assert.equal(result.tempF,58.5);
 assert.match(result.caveat,/not a beach thermometer/);
});
test('grid logic drops unavailable land pixels and multi-day stale temperatures',()=>{
 const now=new Date('2026-11-07T15:00:00Z');
 const csv=[
  'time,latitude,longitude,sst',
  'UTC,degrees_north,degrees_east,degree_C',
  '2026-11-06T12:00:00Z,43.702,-83.858,14.3',
  '2026-11-06T12:00:00Z,43.799,-83.861,NaN',
  '2026-11-04T12:00:00Z,43.799,-83.861,17.7'
 ].join('\n');
 const v=parseGLSEAGridCsv(csv,DESTINATIONS['saginaw-bay'].cells,now);
 assert.ok(Number.isFinite(v['inner-bay'].tempF));
 assert.equal(v['west-bay'],null);
 assert.equal(parseGLSEAGridCsv(csv,DESTINATIONS['saginaw-bay'].cells,new Date('2026-11-12T15:00:00Z'))['inner-bay'],null);
});
test('pilot page is canonical, truthful, keyboard accessible, indexed and connected',()=>{
 const html=read('public/lake-huron-water-temperature/saginaw-bay/index.html');
 const js=read('public/assets/shorefeel-saginaw.js');
 const css=read('public/assets/shorefeel-saginaw.css');
 const hub=read('public/great-lakes-water-temperature/index.html');
 const sitemap=read('public/sitemap.xml');
 const url='https://chrisizworski.com/lake-huron-water-temperature/saginaw-bay/';
 assert.ok(html.includes('<link rel="canonical" href="'+url+'">'));
 assert.ok(sitemap.includes('<loc>'+url+'</loc>'));
 assert.ok(hub.includes('href="/lake-huron-water-temperature/saginaw-bay/"'));
 assert.ok(html.includes('data-point="inner-bay"')&&html.includes('data-point="west-bay"')&&html.includes('data-point="buoy"'));
 assert.match(html,/no model estimate is marketed here as a local forecast/i);
 assert.match(html,/not a beach thermometer/i);
 assert.ok(html.includes('id="bay-map"')&&js.includes('basemaps.cartocdn.com'));
 assert.ok(html.includes('aria-pressed="true"')&&js.includes("setAttribute('aria-pressed'"));
 assert.ok(css.includes('@media(max-width:530px)'));
 assert.doesNotThrow(()=>new Function(js));
});
