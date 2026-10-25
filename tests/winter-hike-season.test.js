'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const Season=require('../lib/winter-hike-season.cjs');
const API=require('../api/winter-hike-lab.js');
const HERE=path.join(__dirname,'../public/winter-hike-snowshoe-lab');
const NOW=Date.parse('2026-10-25T16:00:00Z');
const POINT={lat:44.750594,lon:-85.493329};
const STATION='USC00200002';
const route='vasa-snowshoe-orange';
const fixture=(date,snow='7',extra={})=>({
 DATE:date,STATION,NAME:'OFFICIAL NOAA TEST STATION',
 LATITUDE:POINT.lat,LONGITUDE:POINT.lon,
 SNWD:String(snow),SNWD_ATTRIBUTES:',,N,0800',...extra
});
const result=(year,vals={},status='partial-or-complete')=>{
 const days=Array(Season.TARGET_DAYS).fill(null);
 for(const [i,v] of Object.entries(vals))days[Number(i)]=v;
 return {year,days,status,sourceUrl:Season.fullUrl(STATION,year),conflictingDays:0};
};
const response=(code=200)=>{const headers={};return {
 setHeader(k,v){headers[k]=v},
 status(x){code=x;return this},json(body){return {code,headers,body}}
}};
test('Nov-Apr daily comparison uses 181 consistent calendar days across leap years',()=>{
 assert.equal(Season.TARGET_DAYS,181);
 assert.deepEqual(Season.seasonRange(2026),{start:'2025-11-01',end:'2026-04-30'});
 assert.equal(Season.dayIndex('2024-02-28',2024),119);
 assert.equal(Season.dayIndex('2024-02-29',2024),null);
 assert.equal(Season.dayIndex('2024-03-01',2024),120);
 assert.equal(Season.dayIndex('2025-03-01',2025),120);
 assert.equal(Season.dayIndex('2025-11-01',2026),0);
 assert.equal(Season.dayIndex('2026-04-30',2026),180);
 assert.equal(Season.dayIndex('2026-05-01',2026),null);
 assert.equal(Season.dayForIndex(0,2026),'2025-11-01');
 assert.equal(Season.dayForIndex(180,2026),'2026-04-30');
 assert.equal(Season.weekWindow(0,2026).start,'2025-11-01');
 assert.equal(Season.weekWindow(25,2026).days,6);
 assert.equal(Season.weekWindow(26,2026),null);
});
test('full-year NOAA NCEI request is station bounded and has no user coordinate or auth requirements',()=>{
 const url=new URL(Season.fullUrl(STATION,2026));
 assert.equal(url.origin,'https://www.ncei.noaa.gov');
 assert.equal(url.searchParams.get('dataset'),'daily-summaries');
 assert.equal(url.searchParams.get('stations'),STATION);
 assert.equal(url.searchParams.get('dataTypes'),'SNWD');
 assert.equal(url.searchParams.get('startDate'),'2025-11-01');
 assert.equal(url.searchParams.get('endDate'),'2026-04-30');
 assert.equal(url.searchParams.get('units'),'standard');
 assert.equal(url.searchParams.get('includeStationLocation'),'true');
 assert.ok(!url.searchParams.has('bbox'));
 assert.throws(()=>Season.fullUrl('BAD;INJECTION',2026));
 assert.throws(()=>Season.fullUrl(STATION,2200));
});
test('station sample validation rejects spoofed station, bad QA, off-season, far away and invalid snow',()=>{
 const valid=Season.validRow(fixture('2026-02-15','0'),STATION,2026,POINT);
 assert.deepEqual(valid,{idx:106,date:'2026-02-15',inches:0});
 const negatives=[
  fixture('2026-02-29','8'),
  fixture('2026-05-01','8'),
  fixture('2026-02-15','9',{STATION:'USC99999999'}),
  fixture('2026-02-15','9',{SNWD_ATTRIBUTES:'X,Q,,'}),
  fixture('2026-02-15','9999'),
  fixture('2026-02-15','-2'),
  fixture('2026-02-15','foo'),
  fixture('2026-02-15','8',{LATITUDE:47.4,LONGITUDE:-89.2}),
  fixture('2026-02-15','8',{LONGITUDE:null}),
 ];
 assert.ok(negatives.every(row=>Season.validRow(row,STATION,2026,POINT)===null));
});
test('whole winter fetch handles duplicate report conflicts and does not replace gaps with zero',async()=>{
 const fetcher=async()=>({ok:true,text:async()=>JSON.stringify([
  fixture('2026-01-15',0),fixture('2026-01-16',8),
  fixture('2026-01-16',11),fixture('2026-01-17',7)
 ])});
 const data=await Season.fetchWinter(POINT,STATION,2026,{fetcher});
 const ix=Season.dayIndex('2026-01-15',2026);
 assert.equal(data.days[ix],0);
 assert.equal(data.days[ix+1],null);
 assert.equal(data.days[ix+2],7);
 assert.equal(data.conflictingDays,1);
 assert.equal(data.days.filter(v=>v!==null).length,2);
});
test('fake or failed NOAA API never fabricates a season full of zeros',async()=>{
 for(const fetcher of [
  async()=>({ok:false,status:503}),
  async()=>({ok:true,text:async()=>'<html>maintenance</html>'}),
  async()=>({ok:true,text:async()=> 'X'.repeat(700001)})
 ]){
  const result=await Season.fetchWinter(POINT,STATION,2025,{fetcher});
  assert.equal(result.status,'source-unavailable');
  assert.equal(result.days.length,181);
  assert.ok(result.days.every(x=>x===null));
 }
});
test('weekly repeat-pattern requires >=5 reported days in >=3 winters, with 4 days >=6 inches',()=>{
 const four=[2026,2025,2024,2023];
 let responses=four.map((y,i)=>result(y,Object.fromEntries(Array.from({length:7},(_,k)=>[k,i<3?8:0]))));
 let data=Season.analyze(responses,{id:STATION,miles:2,name:'example'},NOW);
 assert.equal(data.weeks.length,26);
 assert.equal(data.weeks[0].status,'historically-frequent-6in-station-snow');
 assert.equal(data.weeks[0].qualifyingWinters,3);
 assert.equal(data.weeks[0].reportWinters,4);
 assert.equal(data.topHistoricallyCoveredWeeks[0].week,1);
 assert.equal(data.weeks[1].status,'insufficient-history');
 assert.equal(data.parkingVerified,false);
 assert.equal(data.noGuaranteedSnowshoeWeeks,true);
 assert.equal(data.totalObservedDays,28);
 responses=four.map((y,i)=>result(y,Object.fromEntries(Array.from({length:i<2?7:4},(_,k)=>[k,9]))));
 data=Season.analyze(responses,{id:STATION,miles:2,name:'example'},NOW);
 assert.equal(data.weeks[0].reportWinters,2);
 assert.equal(data.weeks[0].qualifyingWinters,2);
 assert.equal(data.weeks[0].status,'insufficient-history');
 assert.equal(data.topHistoricallyCoveredWeeks.length,0);
});
test('six inches of station snow does not count as certainty, and real zero remains measured no cover',()=>{
 const winters=[2026,2025,2024,2023].map(y=>result(y,Object.fromEntries(
  Array.from({length:7},(_,k)=>[k,k===0?0:k<4?6:3]))));
 const data=Season.analyze(winters,{id:STATION,miles:2,name:'example'},NOW);
 assert.equal(data.weeks[0].status,'variable-or-lower-station-snow');
 assert.equal(data.weeks[0].reportWinters,4);
 assert.equal(data.weeks[0].qualifyingWinters,0);
 assert.equal(data.weeks[0].totalReportedDays,28);
 assert.equal(data.confidenceInterpretation.includes('not probability'),true);
});
test('full-season endpoint combines same-station discovery and only four station-restricted full-winter downloads',async()=>{
 const calls=[],fetcher=async(u)=>{
  const url=new URL(u),year=Number(url.searchParams.get('endDate').slice(0,4));
  const full=url.searchParams.has('stations');calls.push(url);
  if(url.pathname.includes('/search/v1/data'))return {ok:true,text:async()=>JSON.stringify({
   results:[{boundingPoints:[{coordinates:[POINT.lon,POINT.lat]}],
    stations:[{id:STATION,name:'Nearby GHCN station',dataTypes:[{id:'SNWD',coverage:98}]}]}]
  })};
  const winter=full&&url.searchParams.get('startDate')?.endsWith('-11-01');
  const rows=winter?
   Array.from({length:10},(_,i)=>fixture((year-1)+'-11-'+String(1+i).padStart(2,'0'),i<8?8:0)):
   [fixture(year+'-02-15',8)];
  return {ok:true,text:async()=>JSON.stringify(rows)};
 };
 const data=await Season.fullSeasonForRoute(route,{fetcher,now:NOW});
 assert.equal(calls.length,9);
 assert.equal(calls.filter(c=>c.searchParams.has('stations')).length,8);
 assert.equal(calls.filter(c=>c.pathname.includes('/search/v1/data')).length,1);
 assert.equal(data.routeId,route);
 assert.equal(data.station.id,STATION);
 assert.deepEqual(data.winterYears.map(y=>y.year),[2026,2025,2024,2023]);
 assert.equal(data.weeks[0].status,'historically-frequent-6in-station-snow');
 assert.ok(calls.every(x=>x.hostname==='www.ncei.noaa.gov'));
 assert.ok(data.weeks.every(x=>!('probability' in x)));
});
test('no Feb station response means no full-season false assertion',async()=>{
 const fetcher=async()=>({ok:true,text:async()=> '{"results":[]}'});
 const data=await Season.fullSeasonForRoute(route,{fetcher,now:NOW});
 assert.equal(data.status,'no-nearby-qualified-station');
 assert.deepEqual(data.weeks,[]);
 assert.equal(data.parkingVerified,false);
});
test('read-only season endpoint rejects uncurated routes and non-GET without fetching',async()=>{
 const invalid=await API({method:'GET',query:{mode:'season',route:'hacker'}},response());
 assert.equal(invalid.code,400);
 assert.equal(invalid.headers['X-Robots-Tag'],'noindex, nofollow');
 const post=await API({method:'POST',query:{mode:'season',route}},response());
 assert.equal(post.code,405);
});
test('full season UI is explicit-load only, accessible and links to dated NASA images',()=>{
 const app=readFileSync(path.join(HERE,'app.js'),'utf8'),
  src=readFileSync(path.join(HERE,'season-ui.js'),'utf8'),
  html=readFileSync(path.join(HERE,'index.html'),'utf8');
 assert.ok(src.includes("mode:'season'"));
 assert.ok(src.includes('data-season-week'));
 assert.ok(src.includes('data-season-modis'));
 assert.ok(src.includes('aria-pressed'));
 assert.ok(src.includes('Math.max(1,w.reportWinters)'));
 assert.ok(src.includes('out.innerHTML=markup(data)'));
 assert.ok(html.includes('/season-ui.js?v=1'));
 assert.ok(app.includes("WinterHikeSeason?.render($('season-zone'),route)"));
 assert.ok(!src.includes('parkingVerified:true'));
 for(const name of ['season-ui.js','history-ui.js','app.js']){
  const r=spawnSync(process.execPath,['--check',path.join(HERE,name)],{encoding:'utf8',timeout:8000});
  assert.equal(r.status,0,name+': '+r.stderr);
 }
});

test('distant NOAA stations provide historical context but not local snowshoe week classification',()=>{
 const winters=[2026,2025,2024,2023].map(year=>result(year,
  Object.fromEntries(Array.from({length:7},(_,i)=>[i,8]))));
 const data=Season.analyze(winters,{id:STATION,miles:38.9,name:'Far snowbelt station'},NOW);
 assert.equal(data.stationSpatialInterpretation,'distant-station-context-only');
 assert.equal(data.topHistoricallyCoveredWeeks.length,0);
 assert.equal(data.weeks[0].status,'station-too-distant-for-route-pattern');
 assert.ok(data.weeks.every(w=>w.status!=='historically-frequent-6in-station-snow'));
 assert.equal(data.parkingVerified,false);
});

test('NOAA search outage is distinct from a valid search with no nearby station',async()=>{
 const down=await Season.fullSeasonForRoute(route,{fetcher:async()=>({ok:false,status:503}),now:NOW});
 assert.equal(down.status,'source-unavailable');
 assert.equal(down.station,null);
 assert.deepEqual(down.weeks,[]);
 assert.equal(down.parkingVerified,false);
 const empty=await Season.fullSeasonForRoute(route,{
  fetcher:async()=>({ok:true,text:async()=>JSON.stringify({results:[]})}),now:NOW});
 assert.equal(empty.status,'no-nearby-qualified-station');
});
