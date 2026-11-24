import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const code=fs.readFileSync('public/assets/up-waterfalls-river-conditions.js','utf8');
const sandbox={module:{exports:{}},URLSearchParams,Intl,Date};
vm.runInNewContext(code,sandbox);
const {classify,query,localDay,seasonal,seasonalQuery,eligible}=sandbox.module.exports;
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

const current=(value=100,extra={})=>({status:'AVAILABLE',series:'series-A',day:'2026-11-23',value,qualifier:'',approval:'Provisional',...extra});
const stats=(rowExtra={},seriesExtra={},featureExtra={})=>({features:[{properties:{monitoring_location_id:id,data:[{parameter_code:'00060',parent_statistic_id:'00003',parent_time_series_id:'series-A',unit_of_measure:'ft^3/s',values:[{time_of_year:'11-23',time_of_year_type:'day_of_year',computation:'percentile',sample_count:41,percentiles:[10,25,50,75,90],values:['20','40','60','100','150'],...rowExtra}],...seriesExtra}],...featureExtra}}]});
test('historical bands are same series and day, with conservative boundary handling',()=>{
 for(const [v,label] of [[0,'Unusually low for the date'],[20,'Below the typical range'],[40,'Within the typical range'],[100,'Within the typical range'],[101,'Above the typical range'],[150,'Above the typical range'],[151,'Unusually high for the date']]){
  const r=seasonal(stats(),id,current(v));assert.equal(r.label,label);assert.equal(r.count,41);assert.equal(r.p50,60);
 }
});
test('seasonal comparison fails closed for inadequate, mismatched, duplicate and malformed evidence',()=>{
 for(const payload of [stats({sample_count:19}),stats({sample_count:null}),stats({time_of_year:'11-24'}),stats({time_of_year_type:'month_of_year'}),stats({}, {parent_time_series_id:'series-B'}),stats({}, {unit_of_measure:'m3/s'}),stats({}, {parent_statistic_id:'00001'}),stats({}, {}, {monitoring_location_id:'USGS-99999999'}),stats({values:['20','40','60','100','nan']}),stats({values:['20','40','10','100','150']}),stats({percentiles:[10,25,50,75,75]}),stats({values:['0','0','0','0','0']}),{...stats(),next:'more'}, {features:[...stats().features,...stats().features]}]){
  assert.equal(seasonal(payload,id,current()).status,'UNAVAILABLE');
 }
 for(const r of [current(100,{qualifier:'Ice'}),current(100,{series:null}),current(100,{status:'STALE'}),current(100,{approval:'Not supplied'})])assert.equal(eligible(r),false);
});
test('seasonal request uses the observation day, including leap day, and exact parent series',()=>{
 const q=new URL(seasonalQuery(id,current(10,{day:'2024-02-29'})));
 assert.equal(q.pathname,'/statistics/v0/observationNormals');assert.equal(q.searchParams.get('start_date'),'02-29');assert.equal(q.searchParams.get('end_date'),'02-29');assert.equal(q.searchParams.get('parent_time_series_id'),'series-A');assert.equal(q.searchParams.get('normal_type'),'DOY');
});
test('daily duplicates from different series fail closed; seven-day trend cannot mix known series',()=>{
 assert.equal(read(row('2026-11-23',50,{time_series_id:'A'}),row('2026-11-23',50,{time_series_id:'B'})).status,'UNAVAILABLE');
 const r=read(row('2026-11-23',50,{time_series_id:'A'}),row('2026-11-16',20,{time_series_id:'B'}));
 assert.equal(r.series,'A');assert.equal(r.prior,null);
});
