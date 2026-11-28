import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {threeDayOutlook} from '../lib/snowmobile/outlook.mjs';
const require=createRequire(import.meta.url);
const {currentOutlook,evaluate}=require('../public/assets/snowmobile-comparison.js');
const H=3600000,now=Date.parse('2026-11-24T12:00:00Z');
const iso=t=>new Date(t).toISOString();
function series(unit,value,hours=6,count=12){
 return {uom:unit,values:Array.from({length:count},(_,i)=>({validTime:iso(now+i*hours*H)+'/PT'+hours+'H',value:typeof value==='function'?value(i):value}))};
}
const grid=()=>({properties:{updateTime:iso(now-H),snowfallAmount:series('wmoUnit:mm',25.4),temperature:series('wmoUnit:degC',i=>i%2?2:-4)}});
test('72h snow totals and temperature exposure have three exact contiguous 24h windows',()=>{
 const o=threeDayOutlook(grid(),now);
 assert.equal(o.status,'AVAILABLE');assert.equal(o.snowTotalInches,12);
 for(const d of o.days){assert.equal(d.snowInches,4);assert.equal(d.temperature.aboveFreezingHours,12);assert.equal(d.temperature.signal,'FREEZE_THAW_POSSIBLE');assert.equal(d.temperature.lowF,25);assert.equal(d.temperature.highF,36);assert.equal(Date.parse(d.endAt)-Date.parse(d.startAt),24*H);}
 assert.equal(Date.parse(o.endAt)-Date.parse(o.startAt),72*H);
 assert.equal(currentOutlook({outlook:o},now),o);
});
test('unknown, null, unit mismatch, missing and overlapping snow intervals never become zero',()=>{
 for(const change of [p=>p.snowfallAmount.values.shift(),p=>p.snowfallAmount.values[0].value=null,p=>p.snowfallAmount.values[0].value=-1,p=>p.snowfallAmount.uom='wmoUnit:inch',p=>p.snowfallAmount.values.push(p.snowfallAmount.values[0]),p=>delete p.snowfallAmount]){
  const g=grid();change(g.properties);const o=threeDayOutlook(g,now);
  assert.equal(o.status,'PARTIAL');assert.equal(o.days[0].snowInches,null);assert.equal(o.snowTotalInches,null);
  assert.equal(o.days[0].temperature.aboveFreezingHours,12);
 }
 const g=grid();g.properties.snowfallAmount=series('wmoUnit:mm',0);assert.equal(threeDayOutlook(g,now).snowTotalInches,0);
});
test('boundary allocation is proportional, and missing last period withholds total',()=>{
 const g=grid(),issued=now+H;
 const o=threeDayOutlook(g,issued);
 assert.equal(o.startAt,iso(issued));assert.ok(Math.abs(o.days[0].snowInches-4)<1e-9);assert.equal(o.days[2].snowInches,null);assert.equal(o.snowTotalInches,null);
});
test('cold, warm, missing and stale grids cannot manufacture current riding evidence',()=>{
 const g=grid();g.properties.temperature=series('wmoUnit:degC',-1);
 assert.equal(threeDayOutlook(g,now).days[0].temperature.signal,'AT_OR_BELOW_FREEZING');
 g.properties.temperature=series('wmoUnit:degC',2);assert.equal(threeDayOutlook(g,now).days[0].temperature.aboveFreezingHours,24);
 g.properties.temperature.values[0].value=null;assert.equal(threeDayOutlook(g,now).days[0].temperature,null);
 g.properties.updateTime=iso(now+H);assert.equal(threeDayOutlook(g,now),null);
 g.properties.updateTime=iso(now-7*H);assert.equal(threeDayOutlook(g,now),null);
 const o=threeDayOutlook(grid(),now);
 assert.equal(currentOutlook({outlook:o},now+H),null);
 assert.equal(evaluate({key:'x',route:{score:null,band:'UNKNOWN',legalVerification:'CURRENT_LAYER_CHECKED'},weather:{outlook:o}},{active:true,fresh:true,closuresVerified:true},{driveMinutes:30}).tripCandidate,false);
});
test('source and display use existing API, no new route, and precise hub scope',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 assert.match(read('lib/snowmobile/sources.mjs'),/forecastGridData/);
 assert.match(read('lib/snowmobile/build-region.mjs'),/outlook:w.outlook/);
 const js=read('public/assets/snowmobile-index.js');
 assert.match(js,/threeDayForecast/);assert.match(js,/All times Eastern/);assert.match(js,/not measured thaw or trail base/);
 assert.match(read('public/snowmobile/index.html'),/snowmobile-comparison\.js\?v=20261127-freshness/);
});
