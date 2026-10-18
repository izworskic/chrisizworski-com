'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const snow=require('../lib/waterfowl-snow-surveys.js');
const {habitatShift}=require('../lib/waterfowl-habitat.js');
const NOW=Date.parse('2026-10-18T17:00:00Z');
const meta={idp_validtime:'10/18/2026 6:00:00 AM'};
function nohrsc(raw,attrs=meta){
 return {results:[{layerId:2,layerName:'Footprint',attributes:attrs},
 {layerId:3,layerName:'Image',attributes:{'Classify.Pixel Value':String(raw)}}]};
}
test('NOHRSC point query uses the actual depth product, never SWE layer',()=>{
 const url=new URL(snow.snowURL(43.55,-83.87));
 assert.equal(url.hostname,'mapservices.weather.noaa.gov');
 assert.match(url.pathname,/snow\/NOHRSC_Snow_Analysis\/MapServer\/identify$/);
 assert.equal(url.searchParams.get('layers'),'all:0');
 assert.equal(url.searchParams.get('returnGeometry'),'false');
});
test('NOHRSC model snow-depth ranges use official inch-bounded legend, not observed field depth',()=>{
 const none=snow.parseSnow(nohrsc(0),NOW);
 assert.equal(none.status,'modeled');
 assert.equal(none.approximateDepthInches,0);
 assert.equal(none.inchesRange.min,0);
 assert.equal(none.inchesRange.max,0.39);
 assert.match(none.referenceType,/modelled/);
 const deeper=snow.parseSnow(nohrsc(7),NOW);
 assert.equal(deeper.status,'modeled');
 assert.deepEqual(deeper.inchesRange,{min:3.9,max:9.8});
 assert.equal(deeper.approximateDepthInches,7);
});
test('NOHRSC missing pixels, future analysis, stale analysis are never snow-free',()=>{
 for(const invalid of [null,'',undefined,-1,'NoData',900]){
  const body=nohrsc(invalid);
  if(invalid===undefined)delete body.results[1].attributes['Classify.Pixel Value'];
  const obj=snow.parseSnow(body,NOW);
  assert.notEqual(obj.status,'modeled',String(invalid));
  assert.equal(obj.approximateDepthInches,null);
 }
 assert.equal(snow.parseSnow(nohrsc(1,{idp_validtime:'10/10/2026 6:00:00 AM'}),NOW).status,'stale');
 assert.equal(snow.parseSnow(nohrsc(1,{}),NOW).status,'unavailable');
});
const row=(date,val)=>'<tr><td>'+date+'</td><td>'+val+'</td><td>0</td></tr>';
const table=(name,rows)=>'<table class="data-table"><thead><tr><th>Week Ending:&nbsp;</th><th>Total '+name+':</th><th>Other species</th></tr></thead><tbody>'+rows.join('')+'</tbody></table>';
const fixture='<h2>Ducks</h2>'+table('ducks',[row('10/04/2026','3,610'),row('10/11/2026','4,525'),row('10/18/2026','NA'),row('10/25/2026','NA')])+
 '<h2>Geese</h2>'+table('geese',[row('10/04/2026','400'),row('10/11/2026','650'),row('10/18/2026','NA')]);
test('Michigan DNR survey reports parse two independently dated tables and ignore NA/future rows',()=>{
 const v=snow.parseDNR(fixture,NOW);
 assert.equal(v.status,'reported');
 assert.equal(v.ducks.date,'2026-10-11');
 assert.equal(v.ducks.count,4525);
 assert.equal(v.ducks.change,915);
 assert.equal(v.geese.count,650);
 assert.equal(v.geese.change,250);
 assert.equal(v.ducks.previous.date,'2026-10-04');
});
test('Official Michigan surveys retain separately reported dabbling and diving ducks',()=>{
 const table='<table><thead><tr><th>Week Ending:</th><th>Total ducks:</th><th>Total dabblers:</th><th>Total divers:</th></tr></thead>'+
 '<tbody><tr><td>10/11/2026</td><td>4,525</td><td>4,400</td><td>125</td></tr></tbody></table>';
 const r=snow.parseDNR(table,NOW);
 assert.equal(r.status,'reported');
 assert.equal(r.ducks.count,4525);
 assert.equal(r.ducks.dabblers,4400);
 assert.equal(r.ducks.divers,125);
 assert.equal(r.geese,null);
});
test('A negative survey change is not treated as observed lakeward migration',()=>{
 const surveys={sites:[{status:'reported',ducks:{change:-100,count:1000}}]};
 const weather={status:'forecast',longestFreezingRunHours:35,forecastColdDegreeHours:260};
 const open={status:'observed_chart',code:'00'};
 const v=habitatShift({weather,lakeIce:open,surveys});
 assert.equal(v.status,'lake_refuge_possible');
 assert.equal(v.marshIceStatus,'not_verified_for_region');
 assert.equal(v.surveySitesWithCurrentCount,1);
 assert.equal(v.decliningSiteCounts,1);
 assert.match(v.evidenceNote,/does not show where/);
 assert.match(v.caveat,/Ducks may use large lakes/);
 const iced=habitatShift({weather,lakeIce:{status:'observed_chart',code:'92'}});
 assert.equal(iced.status,'big_water_icing');
 const unknown=habitatShift({weather,lakeIce:{status:'stale',code:'00'}});
 assert.equal(unknown.status,'marsh_freeze_watch');
 const weak=habitatShift({weather:{status:'forecast',longestFreezingRunHours:2,forecastColdDegreeHours:5}});
 assert.equal(weak.status,'limited_freezing');
});
test('The seven official DNR survey site identities are preserved and no survey is mis-geolocated',()=>{
 assert.equal(snow.SITES.length,7);
 assert.deepEqual(snow.SURVEY_REGIONS['saginaw-bay'],['fish-point','nayanquing','shiawassee']);
 assert.equal(snow.SITES.find(s=>s.id==='fennville').region,'southwest-michigan');
 assert.equal(snow.SITES.find(s=>s.id==='muskegon').region,'west-michigan');
});
test('UI and API expose source-separated habitat, NOHRSC and DNR, not invented lake census',()=>{
 const root=path.resolve(__dirname,'..');
 const api=fs.readFileSync(path.join(root,'api/waterfowl-freeze-line.js'),'utf8');
 const app=fs.readFileSync(path.join(root,'public/waterfowl-freeze-line/app.js'),'utf8');
 const html=fs.readFileSync(path.join(root,'public/waterfowl-freeze-line/index.html'),'utf8');
 assert.match(api,/surveysFor/);assert.match(api,/snowFor/);assert.match(api,/habitatShift/);
 for(const id of ['habitat-headline','snow-depth','survey-list','map-layer'])assert.ok(html.includes('id="'+id+'"'));
 assert.match(app,/renderSurveys/);assert.match(app,/renderSnowDepth/);assert.match(app,/renderHabitat/);
 assert.match(html,/marsh-to-big-water/);
});
