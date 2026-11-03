'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const S=require('../lib/japanese-beetle-controlled-monitoring.cjs');
const API=require('../api/japanese-beetle-monitoring-coverage.js');
function raw(site,date,status,options={}){return {
 observation_id:1000+site*100+Number(date.slice(-2)),site_id:site,latitude:43.5945,longitude:-83.8889,
 state:'MI',species_id:S.SPECIES_ID,phenophase_id:327,phenophase_description:'Adults',
 observation_date:date,phenophase_status:status,...options};}
const dates=[{date:'2026-06-20',status:0},{date:'2026-06-24',status:0},{date:'2026-06-27',status:1}];
function mapped(){return dates.map(x=>({...x}))}
test('only exact dated and state-bounded official USA-NPN filters, no ignored year param',()=>{
 const u=new URL(S.queryURL(2026));assert.equal(u.hostname,'services.usanpn.org');
 for(const [k,v] of Object.entries({start_date:'2026-01-01',end_date:'2026-12-31',
  'species_id[1]':'2392','state[1]':'MI',request_src:'FreighterViewFarms',climate_data:'0'}))
  assert.equal(u.searchParams.get(k),v);
 assert.equal(u.searchParams.has('year'),false);
 assert.throws(()=>S.queryURL(2101));assert.throws(()=>S.queryURL(2026,{state:'FL'}));
});
test('valid day rejects impossible dates, correct leap boundary',()=>{
 assert.equal(S.validDay('2027-02-29'),false);assert.equal(S.validDay('2028-02-29'),true);
 assert.equal(S.diff('2026-07-01','2026-06-29'),2);
});
test('cohort uses only taxon 2392 adult phase 327/552 yes/no in Michigan',()=>{
 const rows=[raw(10,'2026-06-20',0),raw(10,'2026-06-24',0),raw(10,'2026-06-27',1),
 raw(10,'2026-06-28',1,{species_id:3}),raw(10,'2026-06-29',0,{state:'FL'}),
 raw(10,'2026-06-30',1,{phenophase_id:289,phenophase_description:'Dead adults'}),
 raw(10,'2026-07-01',-1),raw(10,'2027-07-01',1),raw(10,'2026-06-18',0,{site_id:'x'}),
 raw(10,'2026-06-26',1,{phenophase_id:552,phenophase_description:'Adults '})];
 const c=S.cohort(rows,2026);assert.equal(c.totalSites,1);
 // Two adult phase variants are acknowledged by the official metadata.
 assert.equal(c.intervalSites,1);assert.equal(c.sites[0].firstPositive,'2026-06-26');
 assert.equal(c.sites[0].lastNegative,'2026-06-24');assert.equal(c.sites[0].intervalDays,2);
 assert.equal(c.filtered.wrongTaxon,1);assert.equal(c.filtered.wrongRegion,1);
 assert.equal(c.filtered.wrongPhenophase,1);assert.equal(c.filtered.uncertain,1);
 assert.equal(c.filtered.invalidRecord,2);
});
test('repeat no > then yes means interval, never exact biological emergence',()=>{
 const d=S.deriveInterval(mapped());assert.equal(d.status,'BOUNDED_DETECTION_INTERVAL');
 assert.equal(d.intervalDays,3);assert.equal(d.lastNegative,'2026-06-24');
 assert.equal(d.firstPositive,'2026-06-27');assert.equal(d.observationEffort,false);
 assert.match(d.certainty,/not direct proof/i);
});
test('single yes, all no, missing second baseline, and long gaps never qualify',()=>{
 assert.equal(S.deriveInterval([{date:'2026-07-05',status:1}]).status,'LEFT_CENSORED');
 assert.equal(S.deriveInterval([{date:'2026-07-01',status:0}]).status,'NO_POSITIVE_RECORDED');
 assert.equal(S.deriveInterval([{date:'2026-07-01',status:0},{date:'2026-07-04',status:1}]).status,'BASELINE_TOO_SHORT');
 assert.equal(S.deriveInterval([{date:'2026-06-01',status:0},{date:'2026-06-20',status:0},{date:'2026-07-01',status:1}]).status,'GAP_TOO_LARGE');
});
test('contradictory same-day yes/no fails closed, unknown is not no',()=>{
 assert.equal(S.deriveInterval([{date:'2026-06-20',status:0},{date:'2026-06-20',status:1}]).status,'CONFLICTING_SAME_DAY_REPORTS');
 assert.equal(S.deriveInterval([{date:'2026-06-20',status:-1},{date:'2026-06-24',status:0},{date:'2026-06-26',status:1}]).status,'BASELINE_TOO_SHORT');
});
test('source row bound and coordinate shifts are vetoes',()=>{
 assert.throws(()=>S.cohort(new Array(5001).fill({}),2026),/NPN_UNBOUNDED/);
 const c=S.cohort([raw(1,'2026-06-20',0),raw(1,'2026-06-24',0,{latitude:46}),raw(1,'2026-06-27',1)],2026);
 assert.equal(c.sites[0].status,'SITE_GEOGRAPHY_UNSTABLE');
});
test('journal validations require real adult status, time effort, host, date and site pseudonym',()=>{
 const d={site:'roses-1',date:'2027-07-05',adults:'no',count:0,minutes:5,method:'leaf-inspection',crop:'roses'};
 assert.deepEqual(S.validateLocalVisit(d,{today:'2027-07-06'}),[]);
 assert.ok(S.validateLocalVisit({...d,date:'2027-07-07'},{today:'2027-07-06'}).includes('DATE_OUTSIDE_SEASON_OR_FUTURE'));
 assert.ok(S.validateLocalVisit({...d,minutes:1},{today:'2027-07-06'}).includes('INVALID_EFFORT'));
 assert.ok(S.validateLocalVisit({...d,count:4},{today:'2027-07-06'}).includes('ZERO_COUNT_REQUIRED_FOR_NO'));
 assert.ok(S.validateLocalVisit({...d,adults:'yes',count:0},{today:'2027-07-06'}).includes('ADULT_COUNT_INVALID'));
});
test('local journal does not certify independent monitoring and rejects mixed effort',()=>{
 const mk=(date,adults)=>({site:'garden-1',date,adults,count:adults==='yes'?1:0,minutes:5,method:'leaf-inspection',crop:'roses'});
 const d=S.localCohort([mk('2027-06-20','no'),mk('2027-06-24','no'),mk('2027-06-27','yes')],{today:'2027-07-01'});
 assert.equal(d.intervals,1);assert.equal(d.ranking,'SELF_REPORTED_UNREVIEWED_NOT_SCIENTIFIC_VALIDATION');
 const mix=S.localCohort([mk('2027-06-20','no'),{...mk('2027-06-24','no'),minutes:10},mk('2027-06-27','yes')],{today:'2027-07-01'});
 assert.equal(mix.intervals,0);
});
test('prospective model vs interval is contextual only; retrospective lookahead rejected',()=>{
 const interval=S.deriveInterval(mapped());
 const good=S.compareModel(interval,{date:'2026-06-26',sourceDate:'2026-06-24',capturedOn:'2026-06-24'});
 assert.equal(good.status,'WITHIN_DETECTION_INTERVAL');assert.equal(good.isSkillEvidence,false);
 assert.equal(S.compareModel(interval,{date:'2026-06-26',sourceDate:'2026-10-15',capturedOn:'2026-10-15'}).status,'RETROSPECTIVE_OR_UNVERIFIED_SNAPSHOT');
 assert.equal(S.compareModel(interval,{date:'2025-06-26',sourceDate:'2025-06-24',capturedOn:'2025-06-24'}).status,'YEAR_MISMATCH');
});
function response(){return {statusCode:200,headers:{},data:null,status(n){this.statusCode=n;return this},setHeader(k,v){this.headers[k]=v},json(x){this.data=x;return this}}}
test('live cohort coverage does not leak site IDs or coordinates and gives NO_COHORT rather than absence',async()=>{
 const date=new Date('2026-11-02T18:00:00Z');
 const e=await API.evaluate(2026,{now:date,fetcher:async()=>({ok:true,text:async()=>JSON.stringify([])})});
 assert.equal(e.status,'NO_NPN_MICHIGAN_ADULT_RECORDS');assert.equal(e.coverage.monitoredSites,0);
 assert.equal(e.accuracyClaimsAllowed,false);assert.equal(e.empiricalSkill,'NOT_ESTABLISHED');
 assert.ok(!JSON.stringify(e).includes('latitude'));
 const f=await API.evaluate(2026,{now:date,fetcher:async()=>({ok:true,text:async()=>JSON.stringify(dates.map(x=>raw(101,x.date,x.status)))})});
 assert.equal(f.coverage.candidateIntervals,1);assert.equal(f.coverage.intervalWidthDays,null);
 assert.ok(!JSON.stringify(f).includes('npn-101'));
});
test('provider failure cannot become zero data',async()=>{
 await assert.rejects(API.evaluate(2026,{now:new Date('2026-11-02T18:00:00Z'),fetcher:async()=>({ok:false,status:500})}),/SOURCE_UNAVAILABLE/);
 const method=response();await API({method:'POST',query:{}},method);assert.equal(method.statusCode,405);
 const bad=response();await API({method:'GET',query:{year:'2028'}},bad);assert.equal(bad.statusCode,400);
});
