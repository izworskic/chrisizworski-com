'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {LAKES,sourceUtc,beachConditions}=require('../lib/shorefeel/beach-network.js');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/beaches.json'),'utf8'));
const now=new Date('2026-07-15T12:30:00Z');
const beach={slug:'bay-city-state-park',name:'Bay City State Park',lake:'Lake Huron',lat:43.6714,lng:-83.9068};
const weather=(current={})=>({current:{valid_at_utc:'2026-07-15T12:00:00Z',
 temperature_f:82,apparent_temperature_f:86,wind_mph:14,...current}});
const water=(overrides={})=>({fresh:true,water_temp_f:66,station_id:'45163',distance_miles:23.5,...overrides});

test('all five Great Lakes are explicit but coverage does not pretend Michigan includes Ontario',()=>{
 assert.deepEqual(LAKES,['Lake Superior','Lake Michigan','Lake Huron','Lake Erie','Lake Ontario']);
 assert.equal(catalog.beaches.length,50);
 const perLake=Object.groupBy?Object.groupBy(catalog.beaches,b=>b.lake):null;
 assert.deepEqual([...new Set(catalog.beaches.map(b=>b.lake))].sort(),LAKES.filter(x=>x!=='Lake Ontario').sort());
 assert.ok(!catalog.beaches.some(b=>b.lake==='Lake Ontario'));
});

test('source timezone conversion uses provider UTC offset and never server timezone',()=>{
 assert.equal(sourceUtc('2026-07-15T08:00',-14400),'2026-07-15T12:00:00.000Z');
 assert.equal(sourceUtc('2026-11-21T08:00',-18000),'2026-11-21T13:00:00.000Z');
 assert.equal(sourceUtc('2026-07-15T08:00',null),null);
 assert.equal(sourceUtc('bad',-14400),null);
 assert.equal(sourceUtc('2026-07-15T08:00',86400),null);
});

test('forecast-based beach feels descriptive, never adjusts air with offshore water',()=>{
 const p=beachConditions(beach,weather(),water(),now);
 assert.equal(p.status,'forecast-based');
 assert.equal(p.airF,82);
 assert.equal(p.apparentF,86);
 assert.equal(p.windMph,14);
 assert.equal(p.waterF,66);
 assert.equal(p.waterDistanceMiles,23.5);
 assert.equal(p.waterStation,'45163');
 assert.match(p.narrative,/wind|breeze/i);
 assert.match(p.waterNote,/offshore station|open-water observation/i);
 assert.match(p.limitation,/not a thermometer on the sand/);
 const colder=beachConditions(beach,weather(),water({water_temp_f:40}),now);
 assert.equal(colder.apparentF,86,'water does not invent a beach-air correction');
 assert.equal(p.validAt,'2026-07-15T12:00:00Z');
});

test('breeze, windy and calm regimes produce distinguishable guidance without onshore claims',()=>{
 const windy=beachConditions(beach,weather({wind_mph:20}),water(),now);
 const calm=beachConditions(beach,weather({wind_mph:3}),water(),now);
 assert.match(windy.narrative,/wet|damp/i);
 assert.match(calm.narrative,/lighter|settled/i);
 assert.doesNotMatch(windy.narrative,/onshore|offshore|from the lake/i);
});

test('stale and future forecasts fail closed without a false temperature',()=>{
 const old=beachConditions(beach,weather({valid_at_utc:'2026-07-15T09:00:00Z'}),water(),now);
 const future=beachConditions(beach,weather({valid_at_utc:'2026-07-15T16:00:00Z'}),water(),now);
 for(const p of [old,future,beachConditions(beach,null,water(),now),
   beachConditions(beach,weather({temperature_f:null}),water(),now)]){
   assert.equal(p.status,'unavailable');
   assert.equal(p.apparentF,null);
   assert.equal(p.waterF,null);
 }
});

test('missing and distant NOAA water never becomes a beach-water thermometer',()=>{
 const missing=beachConditions(beach,weather(),water({fresh:false}),now);
 assert.equal(missing.waterF,null);
 assert.match(missing.waterNote,/No recent/);
 const distant=beachConditions(beach,weather(),water({distance_miles:55}),now);
 assert.match(distant.waterNote,/55 miles away/);
 const riverfront=beachConditions({...beach,swimming:false},weather(),water(),now);
 assert.equal(riverfront.waterF,null,'the Wenonah riverfront is not offshore Lake Huron water');
 assert.match(riverfront.waterNote,/riverfront viewpoint/);
 assert.match(distant.limitation,/offshore stations/);
});

test('all 50 generated pages retain original SEO and safety while exposing ShoreFeel',()=>{
 const generator=fs.readFileSync(path.join(root,'scripts/generate-beach-pages.mjs'),'utf8');
 const script=fs.readFileSync(path.join(root,'public/assets/beach-report.js'),'utf8');
 const css=fs.readFileSync(path.join(root,'public/assets/beach-report.css'),'utf8');
 const api=fs.readFileSync(path.join(root,'api/beaches.js'),'utf8');
 assert.match(generator,/shorefeel-field-note/);
 assert.match(generator,/shorefeel-primary/);
 assert.match(script,/renderShoreFeel\(beach\)/);
 assert.match(api,/shore_feel: beachConditions/);
 assert.match(css,/\.shorefeel-field-note/);
 for(const item of catalog.beaches){
   const file=path.join(root,'public/great-lakes-beaches',item.slug,'index.html');
   const html=fs.readFileSync(file,'utf8');
   assert.equal((html.match(/id="at-the-beach"/g)||[]).length,1,item.slug+' must have one beach guide');
   assert.equal((html.match(/class="section shorefeel-field-note shorefeel-primary"/g)||[]).length,1,item.slug+' must expose one primary model panel');
   assert.match(html,new RegExp('rel="canonical" href="https://chrisizworski\\.com/great-lakes-beaches/'+item.slug+'/'));
   assert.match(html,/Check NWS forecast and alerts/);
   assert.match(html,/Michigan BeachGuard/);
   assert.match(html,/not a beach thermometer/i);
   assert.doesNotMatch(html,/quarter.?mile/i,'new beach panels must not claim a measured quarter-mile offset');
 }
});

test('Wenonah is a riverfront stop rather than a swimming beach',()=>{
 const html=fs.readFileSync(path.join(root,'public/great-lakes-beaches/wenonah-park/index.html'),'utf8');
 assert.match(html,/What will it feel like on the waterfront/);
 assert.match(html,/not a designated swim beach/);
 assert.doesNotMatch(html,/What will it feel like at the beach/);
});

test('Saginaw pilot leads with at-the-beach framing but keeps NWS grid science',()=>{
 const html=fs.readFileSync(path.join(root,'public/lake-huron-water-temperature/saginaw-bay/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/assets/shorefeel-saginaw.js'),'utf8');
 assert.match(html,/At the beach · Bay City State Park · Forecast conditions/);
 assert.match(html,/Tobico Marsh/);
 assert.doesNotMatch(js,/\(~0\.25 mile inland\)/);
 assert.match(js,/At the beach · Bay City State Park/);
 assert.match(html,/Both are forecast grids/);
});
