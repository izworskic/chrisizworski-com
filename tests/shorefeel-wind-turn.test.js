'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {forecastWindTurn,parseHour,waterContext}=require('../lib/shorefeel/wind-turn.js');
const now=new Date('2026-07-01T14:15:00Z');
const beach={lat:43.6714,lon:-83.9068};
const bay={lat:43.702,lon:-83.858};
const water={kind:'satellite',tempF:62,observedAt:'2026-07-01T06:00:00Z'};
const row=(hour,direction='W',speed=8,air=82)=>({
 startsAt:new Date(Date.UTC(2026,6,1,hour)).toISOString(),
 windDirection:direction,windMph:speed,tempF:air
});
const run=(periods,opts={})=>forecastWindTurn(periods,
 {beach,waterReference:bay,water,...opts},now);

test('NWS area forecast: two consecutive hours from the bay after land wind',()=>{
 const result=run([row(14,'W'),row(15,'W'),row(16,'NE',10),row(17,'E',11),row(18,'NE')]);
 assert.equal(result.status,'available');
 assert.equal(result.phase,'forecast-turn');
 assert.equal(result.at,'2026-07-01T16:00:00.000Z');
 assert.equal(result.current.sector,'offshore');
 assert.equal(result.hours[2].sector,'onshore');
 assert.equal(result.hours[2].areaAirF,82);
 assert.equal(result.water.tempF,62);
 assert.equal(result.forecastAirWaterContrastF,20);
 assert.equal(result.contrastMeaning,'water-cooler-than-air');
 assert.match(result.reason,/not establish the onset/);
 assert.equal(result.confidence,'not-calibrated');
});
test('onshore now is different from a future turning hour',()=>{
 const r=run([row(14,'NE'),row(15,'E'),row(16,'W'),row(17,'NE'),row(18,'E')]);
 assert.equal(r.phase,'onshore-now');
 assert.equal(r.at,'2026-07-01T14:00:00.000Z');
});
test('isolated blips, missing forecast hour and light wind never become a sustained turn',()=>{
 for(const periods of [
  [row(14,'W'),row(15,'NE'),row(16,'W')],
  [row(14,'W'),row(15,'NE'),row(17,'NE')],
  [row(14,'W'),row(15,'NE',2),row(16,'E',2)],
  [row(14,'W'),row(15,null,8),row(16,'NE'),row(17,'E')]
 ]){
  const r=run(periods);
  assert.equal(r.phase,'none');
  assert.equal(r.at,null);
 }
});
test('no current period fails closed even when future data is available',()=>{
 const r=run([row(15,'W'),row(16,'NE'),row(17,'E')]);
 assert.equal(r.status,'unavailable');
 assert.equal(r.hours.length,0);
 assert.match(r.reason,/no current hourly period/);
});
test('conflicting duplicate invalidates hour, exact duplicate is deduplicated',()=>{
 const a=row(14,'W');
 const duplicate=run([a,{...a},row(15,'W'),row(16,'NE'),row(17,'E')]);
 assert.equal(duplicate.rejected.duplicates,1);
 assert.equal(duplicate.phase,'forecast-turn');
 const conflicting=run([a,row(15,'W'),{...row(15,'W'),windDirection:'E'},row(16,'NE'),row(17,'E')]);
 assert.equal(conflicting.status,'partial');
 assert.equal(conflicting.phase,'none');
 assert.equal(conflicting.rejected.conflicts,1);
});
test('source water context expires at forecast hour; offshore buoy cannot be promoted',()=>{
 const hours=[row(14,'W'),row(15,'NE'),row(16,'E')];
 assert.equal(run(hours,{water:{kind:'buoy',tempF:64,observedAt:water.observedAt}}).water,null);
 assert.equal(run(hours,{water:{...water,observedAt:'2026-06-29T01:00:00Z'}}).water,null);
 assert.equal(run(hours,{water:{...water,observedAt:'2026-07-02T01:00:00Z'}}).water,null);
 assert.equal(run(hours,{water:null}).contrastMeaning,'unknown');
 assert.equal(waterContext(water,Date.parse('2026-07-03T02:00:00Z'),now.getTime()),null);
});
test('missing/future clock, absent coordinates and invalid direction do not invent wind',()=>{
 assert.equal(forecastWindTurn([row(14)],{beach,waterReference:bay},new Date('invalid')).status,'unavailable');
 assert.equal(run([row(14)],{beach:null}).status,'unavailable');
 assert.equal(run([row(14,'NORTH'),row(15,'NE'),row(16,'E')]).phase,'none');
});
test('timezone offsets and midnight rollover normalize without inventing an hour',()=>{
 assert.equal(parseHour('2026-11-01T01:00:00-04:00'),Date.parse('2026-11-01T05:00:00Z'));
 assert.equal(parseHour('2026-11-01T01:00:00-05:00'),Date.parse('2026-11-01T06:00:00Z'));
 assert.equal(parseHour('2026-07-01T14:00:00'),null);
 assert.equal(parseHour('garbage'),null);
 const t=new Date('2026-07-01T23:15:00Z');
 const v=forecastWindTurn([row(23,'W'),
  {startsAt:'2026-07-02T00:00:00Z',windDirection:'NE',windMph:8,tempF:79},
  {startsAt:'2026-07-02T01:00:00Z',windDirection:'E',windMph:10,tempF:78}
 ],{beach,waterReference:bay,water},t);
 assert.equal(v.phase,'forecast-turn');
 assert.equal(v.at,'2026-07-02T00:00:00.000Z');
});
test('integration uses only already fetched NWS periods; preserves forecast-first reading',()=>{
 const root=path.join(__dirname,'..');
 const api=fs.readFileSync(path.join(root,'api/shorefeel.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/lake-huron-water-temperature/saginaw-bay/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/assets/shorefeel-saginaw.js'),'utf8');
 assert.match(api,/forecastWindTurn\(periods/);
 assert.match(api,/windTurn:shoreWindTurn/);
 assert.match(html,/id="bay-wind-window"/);
 assert.match(js,/payload\?\.windTurn/);
 assert.ok(html.indexOf('id="lead-temp"')<html.indexOf('id="bay-wind-window"'));
 assert.doesNotThrow(()=>new Function(js));
});
