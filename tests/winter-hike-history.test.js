'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {spawnSync}=require('node:child_process');
const path=require('node:path');
const H=require('../lib/winter-hike-history.cjs');
const API=require('../api/winter-hike-lab.js');
const route='vasa-snowshoe-orange';
const NOW=Date.parse('2026-10-25T13:00:00Z');
const point={lat:44.75,lon:-85.5};
const sample=(year,offset=0,station='USW00014847',snow='5')=>({
 STATION:station,NAME:'TRAVERSE CITY SNOW REPORT',LATITUDE:String(44.75+offset),
 LONGITUDE:'-85.5',DATE:year+'-02-15',SNWD:snow,SNWD_ATTRIBUTES:',,W,0700'
});
const searchResult={results:[{
 boundingPoints:[{coordinates:[-85.5,44.75]}],
 stations:[{id:'USW00014847',name:'TRAVERSE CITY SNOW REPORT',
  dataTypes:[{id:'SNWD',coverage:98}]}]
}]};
const mock=(map)=>async url=>{
 const u=new URL(url),year=u.searchParams.get('startDate').slice(0,4);
 if(u.pathname.includes('/search/'))return {ok:true,text:async()=>JSON.stringify(searchResult)};
 if(Object.hasOwn(map,year)&&map[year]==='fail')return {ok:false,status:503};
 return {ok:true,text:async()=>JSON.stringify(map[year]||[])};
};
test('station search uses NOAA metadata endpoint, and SNWD read requires a valid station',()=>{
 const url=new URL(H.requestUrl(point,2025,'02-15'));
 assert.equal(url.origin,'https://www.ncei.noaa.gov');
 assert.equal(url.pathname,'/access/services/search/v1/data');
 assert.equal(url.searchParams.get('dataset'),'daily-summaries');
 assert.equal(url.searchParams.get('dataTypes'),'SNWD');
 assert.equal(url.searchParams.get('startDate'),'2025-02-12');
 assert.equal(url.searchParams.get('endDate'),'2025-02-18');
 assert.equal(url.searchParams.get('bbox').split(',').length,4);
 assert.equal(url.searchParams.get('stations'),null);
 const stationUrl=new URL(H.stationRequestUrl('USW00014847',2025,'02-15'));
 assert.equal(stationUrl.pathname,'/access/services/data/v1');
 assert.equal(stationUrl.searchParams.get('stations'),'USW00014847');
 assert.equal(stationUrl.searchParams.get('units'),'standard');
 assert.equal(stationUrl.searchParams.get('format'),'json');
 assert.equal(stationUrl.searchParams.get('includeStationLocation'),'true');
 assert.equal(stationUrl.searchParams.get('includeAttributes'),'true');
 assert.throws(()=>H.stationRequestUrl('INJECT;',2025,'02-15'));
 assert.throws(()=>H.requestUrl({lat:0,lon:0},2025,'02-15'));
 assert.throws(()=>H.requestUrl(point,2025,'evil'));
});
test('search metadata filters out wrong-area and no-SNWD station candidates',()=>{
 const results={results:[
  {boundingPoints:[{coordinates:[-85.5,44.75]}],
   stations:[{id:'USW00014847',name:'Valid',dataTypes:[{id:'SNWD',coverage:95}]}]},
  {boundingPoints:[{coordinates:[-89,47.3]}],
   stations:[{id:'USC00200002',name:'Too distant',dataTypes:[{id:'SNWD',coverage:99}]}]},
  {boundingPoints:[{coordinates:[-85.4,44.75]}],
   stations:[{id:'USC00200003',name:'No snow depth',dataTypes:[{id:'PRCP',coverage:99}]}]}
 ]};
 const list=H.candidateStations(results,point);
 assert.equal(list.length,1);assert.equal(list[0].id,'USW00014847');
});
test('one NOAA station is retained across four winters and real zeros are not missing',async()=>{
 const calls=[];
 const fetcher=async(url,args)=>{calls.push({url,args});return mock({
  2026:[sample(2026,0,'USW00014847','0'),{...sample(2026),DATE:'2026-02-16',SNWD:'5'}],
  2025:[sample(2025,0,'USW00014847','7')],
  2024:[sample(2024,0,'USW00014847','9')],
  2023:[sample(2023,0,'USW00014847','3')]
 })(url)};
 const result=await H.historyForRoute(route,'02-15',{fetcher,now:NOW});
 assert.equal(calls.length,5);
 assert.ok(calls[0].url.includes('/search/v1/data'));
 assert.ok(calls.slice(1).every(c=>new URL(c.url).searchParams.get('stations')==='USW00014847'));
 assert.deepEqual(result.years.map(y=>y.year),[2026,2025,2024,2023]);
 assert.equal(result.kind,'NOAA_NCEI_GHCN_DAILY_SNOW_DEPTH_STATION_OBSERVATIONS');
 assert.equal(result.station.id,'USW00014847');
 assert.equal(result.station.coverageWinters,4);
 assert.equal(result.years[0].reportedDays,2);
 assert.deepEqual(result.years[0].days.map(d=>d.inches),[0,5]);
 assert.equal(result.years[0].peakObservedIn,5);
 assert.equal(result.parkingVerified,false);
 assert.equal(result.routeOpenVerified,false);
 assert.ok(result.caveat.includes('not')&&result.caveat.includes('Missing'));
 assert.ok(calls.every(c=>c.args.signal));
});
test('quality flags, bad geometry, missing reports, traces and impossible depth are rejected',()=>{
 const candidates=[
 {...sample(2025),SNWD_ATTRIBUTES:'X,Q,X,0000'},
 {...sample(2025),LATITUDE:'0'},
 {...sample(2025),LONGITUDE:'0'},
 {...sample(2025),SNWD:'-9999'},
 {...sample(2025),SNWD:'trace'},
 {...sample(2025),SNWD:'9999'},
 {...sample(2025),SNWD:null},
 {...sample(2025),STATION:'<script>alert(1)</script>'},
 {...sample(2025),DATE:'2025-03-01'},
 {...sample(2025),LATITUDE:'46'}
 ];
 assert.ok(candidates.every(r=>H.normalizeObservation(r,2025,'02-15',point)===null));
 const valid=H.normalizeObservation(sample(2025,0,'USW00014847','0'),2025,'02-15',point);
 assert.ok(valid&&valid.inches===0);
});
test('single station comparison does not fill missing winters with nearest different station',()=>{
 const rows=[
  {year:2026,status:'ok',points:[H.normalizeObservation(sample(2026),2026,'02-15',point)]},
  {year:2025,status:'ok',points:[H.normalizeObservation(sample(2025),2025,'02-15',point)]},
  {year:2024,status:'ok',points:[H.normalizeObservation(sample(2024,.1,'USC00200002'),2024,'02-15',point)]},
  {year:2023,status:'unavailable',points:[]}
 ];
 const summary=H.summarize(point,rows,'02-15',NOW);
 assert.equal(summary.station.id,'USW00014847');
 assert.equal(summary.years[2].peakObservedIn,null);
 assert.equal(summary.years[2].status,'no-station-samples');
 assert.equal(summary.years[3].status,'source-unavailable');
});
test('upstream outage and malformed JSON never manufacture observed snow depths',async()=>{
 const fetcher=async()=>({ok:true,text:async()=>'{invalid'});
 const r=await H.historyForRoute(route,'01-15',{fetcher,now:NOW});
 assert.equal(r.historyStatus,'no-qualified-station');assert.equal(r.station,null);
 assert.equal(r.years.length,4);
 assert.ok(r.years.every(x=>x.status==='source-unavailable'&&x.days.length===0&&x.peakObservedIn===null));
});
test('winter comparison year rolls over after May; route ID is curated not user coordinate input',()=>{
 assert.equal(H.lastCompletedWinterYear(Date.parse('2026-04-15T00:00:00Z')),2025);
 assert.equal(H.lastCompletedWinterYear(Date.parse('2026-10-25T00:00:00Z')),2026);
 assert.deepEqual(H.windowDates(2024,'03-15'),{
  start:'2024-03-12',end:'2024-03-18',center:'2024-03-15'});
 assert.rejects(()=>H.historyForRoute('not-a-route','02-15',{now:NOW}),/Invalid catalog/);
 assert.rejects(()=>H.historyForRoute(route,'04-01',{now:NOW}),/Invalid catalog/);
});
test('endpoint is read-only, noindex, rejects unsupported history parameters without network',async()=>{
 function response(){let code=200;const headers={};return {headers,setHeader(k,v){headers[k]=v},status(n){code=n;return this},json(data){return {code,headers,data}}}}
 const invalid=await API({method:'GET',query:{mode:'history',route:'not-real',anchor:'02-15'}},response());
 assert.equal(invalid.code,400);assert.equal(invalid.headers['X-Robots-Tag'],'noindex, nofollow');
 const evil=await API({method:'GET',query:{mode:'history',route,anchor:'08-15'}},response());
 assert.equal(evil.code,400);
 const post=await API({method:'POST',query:{mode:'history'}},response());
 assert.equal(post.code,405);
});
test('client chart only displays returned NOAA observations and launches dated NASA imagery explicitly',()=>{
 const base=path.resolve(__dirname,'../public/winter-hike-snowshoe-lab');
 const js=readFileSync(path.join(base,'history-ui.js'),'utf8'),
  html=readFileSync(path.join(base,'index.html'),'utf8'),
  app=readFileSync(path.join(base,'app.js'),'utf8');
 assert.ok(js.includes("mode:'history'"));
 assert.ok(js.includes('historyMarkup'));
 assert.ok(js.includes('data-modis-day'));
 assert.ok(js.includes('Math.max(1,...valid)'));
 assert.ok(js.includes('No report'));
 assert.ok(!js.includes('Math.random('));
 assert.ok(html.includes('history-ui.js?v=1'));
 assert.ok(app.includes("WinterHikeHistory?.render($('history-zone'),route)"));
 assert.ok(!js.includes('parkingVerified:true'));
 for(const script of ['history-ui.js','app.js','satellite-ui.js']){
  const result=spawnSync(process.execPath,['--check',path.join(base,script)],{encoding:'utf8',timeout:8000});
  assert.equal(result.status,0,script+': '+result.stderr);
 }
});
