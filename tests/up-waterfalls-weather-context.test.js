import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const sandbox={module:{exports:{}},Date,URLSearchParams};
vm.runInNewContext(fs.readFileSync('public/assets/up-waterfalls-weather-context.js','utf8'),sandbox);
const {weatherContext,query}=sandbox.module.exports;
const now=Date.parse('2026-11-24T12:00:00Z'),H=3600000,id='KERY';
const quantity=(value,unitCode,qualityControl='V')=>({value,unitCode,qualityControl});
const row=(hours,c,mm=null,extra={})=>({properties:{station:'https://api.weather.gov/stations/'+id,timestamp:new Date(now-hours*H).toISOString(),temperature:quantity(c,'wmoUnit:degC'),precipitationLast24Hours:quantity(mm,'wmoUnit:mm'),...extra}});
const read=(...features)=>weatherContext({features},id,now);
const full=Array.from({length:12},(_,i)=>row(1+i*2,i%2?-2:4,i===0?0:null));
test('covered point temperatures and observed zero precipitation; no rain or melt inference',()=>{
 const r=read(...full);assert.equal(r.status,'AVAILABLE');assert.equal(r.range.min,-2);assert.equal(r.range.max,4);assert.equal(r.precipitation.mm,0);assert.match(r.cue,/straddled freezing/);
});
test('missing, stale, future, wrong site, bad unit and quality fail closed',()=>{
 assert.equal(read(row(4,1),row(-1,9),row(1,2,3,{station:'https://api.weather.gov/stations/KIWD'})).status,'UNAVAILABLE');
 const r=read(row(1,null,10,{precipitationLast24Hours:quantity(10,'wmoUnit:inch'),temperature:quantity(5,'wmoUnit:degC','X')}));
 assert.equal(r.status,'PARTIAL');assert.equal(r.temp,null);assert.equal(r.precipitation,null);assert.equal(r.cue,null);
 assert.equal(read(row(1,2),row(1,5)).status,'UNAVAILABLE');
 assert.equal(weatherContext({features:full,pagination:{next:'more'}},id,now).status,'UNAVAILABLE');
});
test('sparse temperatures do not become a freeze-thaw claim; rolling precipitation not summed',()=>{
 const r=read(row(1,5,25.4),row(10,-5,20),row(23,3,20));
 assert.equal(r.range,null);assert.equal(r.cue,null);assert.equal(r.precipitation.mm,25.4);
 const m=read(row(1,2,null,{precipitationLast24Hours:quantity(0.01,'wmoUnit:m')}));assert.equal(m.precipitation.mm,10);
});
test('bounded observations query and independent controls',()=>{
 const q=new URL(query(id,now));assert.equal(q.pathname,'/stations/KERY/observations');assert.equal(q.searchParams.get('start'),'2026-11-23T12:00:00.000Z');
 const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');assert.match(html,/id="waterfall-weather-load"/);assert.match(html,/https:\/\/www.nohrsc.noaa.gov\/nsa\//);assert.match(html,/not measurements across a watershed/);assert.equal((html.match(/<article class="waterfall-card" data-fall /g)||[]).length,80);
});
