'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const surface=require('../lib/waterfowl-surface.js');
const handler=require('../api/waterfowl-freeze-line.js');
const now=Date.parse('2026-12-10T12:00:00.000Z');
function ims(value,date=now-3600000){
 return {value:String(value),catalogItems:{features:[{attributes:{idp_filedate:date}}]}};
}
function chart(ct,date=now-3600000){
 return {features:[{attributes:{ct,idp_filedate:date}}]};
}
test('NOAA IMS classifies explicit official values with single-point scope',()=>{
 for(const [value,expected] of [[1,'Water class (ice not indicated)'],[2,'Snow-free land'],[3,'Ice-covered surface'],[4,'Snow-covered land']]){
  const o=surface.parseIMS(ims(value),now);
  assert.equal(o.status,'observed_analysis');
  assert.equal(o.classCode,value);
  assert.equal(o.description,expected);
  assert.equal(o.pixelResolutionKm,1);
  assert.match(o.spatialScope,/One reference-grid cell/);
 }
 const ice=surface.parseIMS(ims(3),now);
 assert.equal(ice.iceCoveredSurface,true);
 assert.equal(ice.snowCoveredLand,false);
 const snow=surface.parseIMS(ims(4),now);
 assert.equal(snow.snowCoveredLand,true);
 assert.equal(snow.iceCoveredSurface,false);
});
test('unknown or stale NOAA IMS data cannot be displayed as current zero snow',()=>{
 assert.equal(surface.parseIMS({},now).status,'unavailable');
 assert.equal(surface.parseIMS({value:null,catalogItems:{features:[{attributes:{idp_filedate:now-3600000}}]}},now).status,'unavailable');
 assert.equal(surface.parseIMS(ims(4,now-80*3600000),now).status,'stale');
 assert.equal(surface.parseIMS(ims(2,now+5*3600000),now).status,'stale');
 assert.equal(surface.parseIMS(ims(8),now).status,'unavailable');
});
test('SIGRID concentration codes use official percent-decile semantics without guessing',()=>{
 for(const [ct,label] of [['00','Ice free'],['01','Less than 10% ice'],['10','10% ice'],['90','90% ice'],['91','90–100% ice'],['92','100% ice'],['35','30–50% ice']]){
  const value=surface.parseIceChart(chart(ct),now);
  assert.equal(value.status,'observed_chart');assert.equal(value.description,label);
 }
 assert.equal(surface.parseIceChart(chart('99'),now).status,'unavailable');
 assert.equal(surface.parseIceChart(chart(null),now).status,'unavailable');
 assert.equal(surface.parseIceChart({features:[]},now).status,'unavailable');
 assert.equal(surface.parseIceChart(chart('00',now-110*3600000),now).status,'stale');
});
test('NOAA API adapters only request fixed official hosts and deterministic point coordinates',()=>{
 const a=new URL(surface.imsURL(43.48,-88.62)),b=new URL(surface.iceURL(43.75,-83.78));
 assert.equal(a.hostname,'mapservices.weather.noaa.gov');
 assert.equal(b.hostname,'mapservices.weather.noaa.gov');
 assert.equal(a.pathname.endsWith('/identify'),true);
 assert.equal(b.pathname.endsWith('/query'),true);
 assert.deepEqual(JSON.parse(a.searchParams.get('geometry')),{x:-88.62,y:43.48,spatialReference:{wkid:4326}});
 assert.equal(b.searchParams.get('returnGeometry'),'false');
 assert.ok(Object.keys(surface.LAKE_POINTS).length>=4);
});
test('NWS supports cold-degree hours, longest consecutive freeze and northerly window',()=>{
 const rows=Array.from({length:72},(_,i)=>({
   startTime:new Date(now+i*3600000).toISOString(),temperature:i<8?41:i<20?28:22,temperatureUnit:'F',
   windSpeed:i<12?'4 mph':'15 mph',windDirection:i<12?'S':'NNW'
 }));
 const w=handler._test.summarizeWeather(rows,now);
 assert.equal(w.status,'forecast');
 assert.equal(w.freezingHours72,64);
 assert.equal(w.longestFreezingRunHours,64);
 assert.equal(w.forecastColdDegreeHours,12*4+52*10);
 assert.equal(w.northWindHours,60);
 assert.equal(w.windSignal,'sustained northerly forecast');
 assert.ok(w.northWindStart);
 assert.equal(w.wetlandIce,'not measured');
 assert.equal(w.birdMovement,'not predicted');
});
test('NWS unavailable wind data never masquerades as a north wind',()=>{
 const rows=Array.from({length:22},(_,i)=>({startTime:new Date(now+i*3600000).toISOString(),temperature:30,temperatureUnit:'F'}));
 const w=handler._test.summarizeWeather(rows,now);
 assert.equal(w.northWindHours,0);
 assert.equal(w.windSignal,'no verified northerly window');
});
