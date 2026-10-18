'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const handler=require('../api/waterfowl-freeze-line.js');
const {REGIONS,summarizeWeather,cleanReport}=handler._test;
function res(){return {statusCode:200,headers:{},body:null,setHeader(k,v){this.headers[k]=v;return this},status(n){this.statusCode=n;return this},json(x){this.body=x;return this}};}
test('regional locations are unique and have safe reference coordinates',()=>{
 assert.equal(REGIONS.length,14);
 assert.equal(new Set(REGIONS.map(r=>r.id)).size,REGIONS.length);
 for(const r of REGIONS){assert.ok(r.lat>=33.5&&r.lat<=50);assert.ok(r.lon>=-101&&r.lon<=-77);}
});
test('forecast categories use real sub-freezing hours, not invented wetland ice',()=>{
 const now=Date.now();
 const rows=(n,tempFn)=>Array.from({length:n},(_,i)=>({startTime:new Date(now+i*3600000).toISOString(),temperature:tempFn(i),temperatureUnit:'F'}));
 let w=summarizeWeather(rows(72,i=>i<12?38:22),now);
 assert.equal(w.status,'forecast');assert.equal(w.freezingHours24,12);assert.equal(w.freezingHours72,60);
 assert.equal(w.pressure,'strong');assert.equal(w.wetlandIce,'not measured');assert.equal(w.snowCover,'not measured');assert.equal(w.birdMovement,'not predicted');
 w=summarizeWeather(rows(72,()=>43),now);
 assert.equal(w.pressure,'limited');assert.equal(w.freezingHours72,0);
 w=summarizeWeather(rows(9,()=>20),now);
 assert.equal(w.status,'unavailable');
});
test('air temperature unit C converts correctly and no precip is smuggled in',()=>{
 const now=Date.now();
 const rows=Array.from({length:24},(_,i)=>({startTime:new Date(now+i*3600000).toISOString(),temperature:-2,temperatureUnit:'C'}));
 const w=summarizeWeather(rows,now);
 assert.equal(w.freezingHours24,24);assert.equal(w.firstTemperatureF,28);assert.equal(w.pressure,'building');
});
test('public observation projection omits coordinates and non-numeric IDs',()=>{
 const o=cleanReport({id:22345,observed_on:'2026-10-16',quality_grade:'research',latitude:42.1,longitude:-84.1,geoprivacy:'obscured',taxon:{preferred_common_name:'Mallard'}});
 assert.equal(o.species,'Mallard');assert.equal(o.date,'2026-10-16');
 assert.equal(o.latitude,undefined);assert.equal(o.longitude,undefined);assert.equal(o.geoprivacy,undefined);
 assert.equal(o.sourceUrl,'https://www.inaturalist.org/observations/22345');
});
test('unknown region cannot be turned into upstream fetch',async()=>{
 const r=res();await handler({method:'GET',query:{mode:'region',region:'https://example.com/'}},r);
 assert.equal(r.statusCode,400);assert.match(r.headers['X-Robots-Tag'],/noindex/);
});
test('non-GET requests rejected',async()=>{
 const r=res();await handler({method:'POST',query:{}},r);assert.equal(r.statusCode,405);
});
test('page, map, API and tool discovery remain source-honest',()=>{
 const base=path.join(__dirname,'..','public','waterfowl-freeze-line');
 const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
 const js=fs.readFileSync(path.join(base,'app.js'),'utf8');
 const css=fs.readFileSync(path.join(base,'style.css'),'utf8');
 const tool=fs.readFileSync(path.join(__dirname,'..','public','tools','index.html'),'utf8');
 const sitemap=fs.readFileSync(path.join(__dirname,'..','public','sitemap.xml'),'utf8');
 assert.match(html,/https:\/\/chrisizworski.com\/waterfowl-freeze-line\//);
 assert.match(html,/Mallard_drake_flight\.jpg/);
 assert.match(js,/api\/waterfowl-freeze-line/);
 assert.match(html,/NOAA snow-depth analysis/);
 assert.match(html,/ca-pub-8222782620788075/);
 assert.equal((html.match(/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js/g)||[]).length,1);
 assert.match(html,/midwest-vector-map\.svg/);
 assert.doesNotMatch(js,/cartocdn|mapbox|tile\.openstreetmap|demonstration flock/i);
 assert.match(css,/map-pin\.selected/);
 assert.match(html,/id="map-layer"/);
 assert.match(html,/id="noaa-surface"/);
 assert.match(html,/id="noaa-lake-ice"/);
 assert.match(html,/id="cold-hours"/);
 assert.match(html,/id="north-wind"/);
 assert.match(js,/renderNOAA/);
 assert.match(js,/updateMapLegend/);
 for(const r of REGIONS)assert.ok(js.includes("'"+r.id+"'"),r.id+' must be mapped');
 assert.match(tool,/data-tool-id="waterfowl-freeze-line"/);
 assert.match(sitemap,/https:\/\/chrisizworski.com\/waterfowl-freeze-line\//);
});
