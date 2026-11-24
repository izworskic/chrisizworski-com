import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('public/assets/up-waterfalls-river-conditions.js','utf8');
const sandbox={module:{exports:{}},URLSearchParams,Intl,Date};
vm.runInNewContext(code,sandbox);
const {classify,query,localDay}=sandbox.module.exports;
const id='USGS-04045500',today='2026-11-24';
const row=(time,value,extra={})=>({properties:{monitoring_location_id:id,parameter_code:'00060',statistic_id:'00003',unit_of_measure:'ft^3/s',time,value,approval_status:'Provisional',qualifier:[],...extra}});
const read=(...features)=>classify({features},id,today);
test('source scoped daily mean, zero retained, seven-day comparison',()=>{
 const r=read(row('2026-11-23','0'),row('2026-11-16','100'));
 assert.equal(r.status,'AVAILABLE');assert.equal(r.value,0);assert.equal(r.prior.percent,-100);
});
test('future, incomplete current day, invalid unit, missing and negative rejected',()=>{
 assert.equal(read(row(today,99),row('2026-11-25',10),row('2026-11-23',null),row('2026-11-23',-9999),row('2026-11-23',20,{unit_of_measure:'m3/s'}),row('2026-11-23',20,{monitoring_location_id:'USGS-99999999'})).status,'UNAVAILABLE');
});
test('staleness, duplicate conflicts, invalid date, missing baseline, ice',()=>{
 assert.equal(read(row('2026-11-20',100)).status,'STALE');
 assert.equal(read(row('2026-11-23',10),row('2026-11-23',20)).status,'UNAVAILABLE');
 assert.equal(read(row('2026-11-31',10)).status,'UNAVAILABLE');
 assert.equal(read(row('2026-11-23',50)).prior,null);
 assert.equal(read(row('2026-11-23',50,{qualifier:['Ice']}),row('2026-11-16',20)).prior,null);
 assert.equal(read(row('2026-11-23',50),row('2026-11-16',0)).prior,null);
});
test('query bounded to completed days and date rollover',()=>{
 const u=new URL(query(id,'2026-01-02'));assert.equal(u.searchParams.get('datetime'),'2025-12-19/2026-01-01');
 assert.equal(u.searchParams.get('parameter_code'),'00060');
 assert.equal(localDay(new Date('2026-01-02T02:00:00Z')),'2026-01-01');
});
test('map first, existing access desk and all 80 cards retained',()=>{
 const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
 assert.ok(html.indexOf('id="falls-map"')<html.indexOf('id="river-conditions"'));
 assert.ok(html.indexOf('id="river-conditions"')<html.indexOf('id="arrival-desk"'));
 assert.equal((html.match(/<article class="waterfall-card" data-fall /g)||[]).length,80);
 assert.match(html,/not the amount going over a particular falls/);
 assert.match(html,/up-waterfalls-river-conditions.js/);
});
