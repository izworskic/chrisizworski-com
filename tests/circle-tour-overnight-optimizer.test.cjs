'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const test=require('node:test');
const {spawnSync}=require('node:child_process');
const optimizer=require('../public/assets/circle-tour-overnight-optimizer.js');
const trace=JSON.parse(fs.readFileSync('data/circle-tour-road-trace-v1.json','utf8'));
const stays=JSON.parse(fs.readFileSync('data/circle-tour-overnight-options-v1.json','utf8'));
const mapSrc=fs.readFileSync('public/assets/lake-superior-circle-tour-map.js','utf8');
const readVar=(name)=>{
 const open=mapSrc.match(new RegExp('const '+name+' = ([^;]+);'));
 assert.ok(open,'Expected named archived map geometry '+name);
 return JSON.parse(open[1]);
};
const routePoints=readVar('ROUTE_GEOMETRY');
const stopCoordinates=readVar('STOP_COORDINATES');
const rad=v=>v*Math.PI/180;
const hav=(a,b)=>{
 const dlat=rad(b[1]-a[1]),dlon=rad(b[0]-a[0]);
 const z=Math.sin(dlat/2)**2+Math.cos(rad(a[1]))*
 Math.cos(rad(b[1]))*Math.sin(dlon/2)**2;
 return 3958.7613*2*Math.asin(Math.sqrt(z));
};
test('road trace is auditable against the exact existing OSM roadway polyline, without upgrading park evidence',()=>{
 assert.equal(optimizer.validate(trace,stays),true);
 assert.equal(trace.route.length,31);
 assert.equal(routePoints.length,139);
 assert.equal(trace.match[0].geometryIndex,0);
 assert.equal(trace.match.at(-1).geometryIndex,routePoints.length-1);
 assert.equal(trace.legs.length,30);
 let sum=0;
 trace.legs.forEach((leg,i)=>{
  assert.equal(leg.from,trace.route[i]);
  assert.equal(leg.to,trace.route[i+1]);
  assert.equal(leg.fromGeometryIndex,trace.match[i].geometryIndex);
  assert.equal(leg.toGeometryIndex,trace.match[i+1].geometryIndex);
  let measured=0;
  for(let j=leg.fromGeometryIndex+1;j<=leg.toGeometryIndex;j++){
   measured+=hav(routePoints[j-1],routePoints[j]);
  }
  assert.ok(Math.abs(measured-leg.traceMiles)<0.06,
    'Snapshot no longer matches preserved map source at '+leg.from+'→'+leg.to);
  const matched=trace.match[i];
  assert.ok(hav(routePoints[matched.geometryIndex],stopCoordinates[matched.id])<2.5,
    'Route stop drifted away from road centerline');
  sum+=leg.traceMiles;
 });
 assert.ok(Math.abs(sum-trace.traceTotalMiles)<0.5);
 assert.ok(sum>1200&&sum<1400);
 const partial=trace.legs.filter(x=>x.status==='incomplete-park-approach');
 assert.deepEqual(partial.map(x=>[x.from,x.to]),[['20','21']]);
 assert.match(trace.basis,/NOT verified turn-by-turn/);
 assert.match(stays.stopNote,/not hotels/);
 assert.ok(!stays.overnights['21'],'Do not imply Grand Portage State Park is a hotel');
 assert.ok(!stays.overnights['31'],'Do not imply Whitefish Point has overnight accommodation');
 assert.equal(stays.overnights['8'].label,'Copper Harbor, Michigan',
   'The mapped Keweenaw point is not Houghton');
});
test('optimizer creates a contiguous full 31-stop loop in ten days and preserves Pictured Rocks',()=>{
 const result=optimizer.optimize(trace,stays,{days:10,maxDrive:5,month:8,
  interests:['hiking','waterfalls'],pictured:true});
 assert.equal(result.days.length,10);
 assert.equal(result.days[0].from,'1');
 assert.equal(result.days.at(-1).to,'30');
 assert.equal(result.days.filter(x=>x.hasPicturedRocks).length,1);
 assert.equal(result.days.find(x=>x.hasPicturedRocks).to,'11',
  'Pictured Rocks must have protected overnight space in Munising');
 assert.equal(result.allWithinCap,result.days.every(d=>d.withinCap));
 assert.equal(result.days.filter(x=>x.incompleteParkApproach).length,1);
 let prior='1',count=0;
 for(const d of result.days){
  assert.equal(d.from,prior);
  assert.ok(trace.route.indexOf(d.to)>trace.route.indexOf(d.from));
  assert.equal(d.stops[0],d.from);assert.equal(d.stops.at(-1),d.to);
  assert.ok(d.overnight.label.length>5);
  assert.equal(d.basis,'simplified-archived-OSM-trace-with-disclosed-15-percent-planning-cushion');
  assert.equal(d.planningMiles,Math.round(d.traceMiles*1.15*10)/10);
  assert.ok(d.borderReserveHours<=0.75);
  count+=d.stops.length-1;prior=d.to;
 }
 assert.equal(count,30,'Optimizer must never skip a road leg');
 assert.equal(result.incompleteDays.length,1);
 assert.match(result.basis,/not a routed ETA/);
});
test('tight four-hour driver cap never pretends the entire trip fits when it does not',()=>{
 const v=optimizer.optimize(trace,stays,{days:7,maxDrive:4,month:8,pictured:true});
 assert.ok(!v.allWithinCap);
 assert.ok(v.overCap.length>=1);
 assert.ok(v.days.some(d=>d.rawDriveHours>4));
 assert.ok(v.alternate===null||v.alternate.days>7);
 assert.ok(v.days.some(d=>d.stops.includes('16')),'Wawa may be traversed but never skipped');
 assert.ok(v.days.some(d=>d.stops.includes('18')),'Marathon may be traversed but never skipped');
});
test('source allocation tracks month, interests and no-seasonal-availability claims',()=>{
 const m=optimizer.optimize(trace,stays,{days:15,maxDrive:5,month:1,
  interests:['shipwatch'],pictured:false});
 assert.equal(m.days.length,15);
 assert.equal(m.settings.month,1);
 assert.equal(m.settings.pictured,false);
 assert.equal(m.days.at(-1).to,'30');
 assert.ok(m.days.every(x=>!x.overnight.available && !x.overnight.booked));
 assert.ok(m.days.every(x=>!x.verifiedETA));
});
test('map deep-link policy returns exact route geometry slice, not a fabricated straight line',async()=>{
 const module=await import('../public/assets/circle-tour-map-day-focus.mjs');
 const first=module.readDayFocus('?ct_from=16&ct_to=18&ct_night_day=8',trace.route);
 assert.deepEqual([first.from,first.to],['16','18']);
 const feature=module.featureForDay(first,trace.route,stopCoordinates,routePoints);
 assert.equal(feature.geometry.type,'LineString');
 assert.ok(feature.geometry.coordinates.length>=4);
 const match16=trace.match.find(x=>x.id==='16'),match18=trace.match.find(x=>x.id==='18');
 assert.deepEqual(feature.geometry.coordinates[0],routePoints[match16.geometryIndex]);
 assert.deepEqual(feature.geometry.coordinates.at(-1),routePoints[match18.geometryIndex]);
 assert.ok(module.focusBounds(feature)[1][0]>module.focusBounds(feature)[0][0]);
 for(const url of [
 '?ct_from=20&ct_to=20','?ct_from=30&ct_to=20',
 '?ct_from=foo&ct_to=11','?ct_from=11&ct_to=13&ct_night_day=NaN'])
 assert.equal(module.readDayFocus(url,trace.route),null,url);
 const blank=module.readDayFocus('',trace.route);
 assert.equal(blank,null);
});
test('build-generated page embeds immutable source data and the actual overnight UI while leaving legacy guide intact',()=>{
 const run=spawnSync('python3',['scripts/build-circle-tour-trip-intelligence.py'],{encoding:'utf8',timeout:20000});
 assert.equal(run.status,0,run.stderr||run.stdout);
 const check=spawnSync('python3',['scripts/build-circle-tour-trip-intelligence.py','--check'],{encoding:'utf8',timeout:20000});
 assert.equal(check.status,0,check.stderr||check.stdout);
 const html=fs.readFileSync('public/lake-superior-circle-tour/10-day/index.html','utf8');
 assert.match(html,/id="ct-road-trace-data"/);
 assert.match(html,/id="ct-overnight-source"/);
 assert.match(html,/id="ct-opt-nights"/);
 assert.match(html,/circle-tour-overnight-optimizer\.js/);
 assert.match(html,/circle-tour-overnight-ui\.js/);
 assert.equal((html.match(/<figure class="day-photo">/g)||[]).length,10);
 assert.equal((html.match(/class="day-tools"/g)||[]).length,10);
 assert.ok(html.indexOf('id="ct-optimized"')<html.indexOf('id="ten-days"'));
 assert.doesNotMatch(html,/adsbygoogle|pagead2\.googlesyndication/);
});

const experienceCatalog=JSON.parse(fs.readFileSync('data/circle-tour-traveler-stops.json','utf8')).stops;
test('daily experience budget uses explicit time, conservative rounding, source order and unknown veto',()=>{
 const settings={days:10,maxDrive:5,month:8,interests:['hiking','waterfalls'],pictured:true};
 const result=optimizer.optimize(trace,stays,settings);
 const pictured=result.days.find(d=>d.hasPicturedRocks);
 const p=optimizer.experiencePlan(pictured,settings,experienceCatalog,8.5);
 assert.equal(p.primary,'11');assert.equal(p.state,'REVIEW');
 assert.equal(p.remainingMinutes,Math.floor((510-Math.ceil(pictured.rawDriveHours*60)-Math.ceil(pictured.borderReserveHours*60))/15)*15);
 const unresolved=result.days.find(d=>d.incompleteParkApproach);
 for(const hours of optimizer.DAY_WINDOWS){
  const u=optimizer.experiencePlan(unresolved,settings,experienceCatalog,hours);
  assert.equal(u.state,'ROAD_CHECK');assert.equal(u.remainingMinutes,null);assert.equal(u.primary,null);
 }
 const base={stops:['10','11'],rawDriveHours:5.5,borderReserveHours:0.75,withinCap:false,incompleteParkApproach:false};
 assert.equal(optimizer.experiencePlan(base,settings,experienceCatalog,12).state,'DRIVE_LIMIT');
 const short={...base,rawDriveHours:5,borderReserveHours:0.5,withinCap:true};
 assert.equal(optimizer.experiencePlan(short,settings,experienceCatalog,6).state,'TRANSFER');
 const winter=optimizer.experiencePlan(pictured,{...settings,month:1},experienceCatalog,12);
 assert.equal(winter.state,'SEASONAL_CHECK');assert.equal(winter.primary,null);assert.equal(winter.seasonalCandidate,'11');
 assert.equal(optimizer.experiencePlan(pictured,{...settings,interests:[],pictured:false},experienceCatalog,12).state,'NO_MATCH');
 for(const invalid of [null,{}, {...pictured,rawDriveHours:NaN},{...pictured,borderReserveHours:-1},{...pictured,rawDriveHours:Infinity}]){
  assert.equal(optimizer.experiencePlan(invalid,settings,experienceCatalog,8.5),null);
 }
 assert.equal(optimizer.experiencePlan(pictured,settings,experienceCatalog,99),null);
 assert.equal(optimizer.experiencePlan(pictured,settings,null,8.5),null);
 assert.equal(optimizer.experiencePlan(pictured,null,experienceCatalog,8.5),null);
});
test('daily experience properties across 72 source-route configurations and 3072 budgets',()=>{
 let cases=0;
 for(const days of [7,10,15])for(const maxDrive of [4,5,6,8])for(const month of [1,8])for(const prefs of [
  {interests:['hiking','waterfalls'],pictured:true},{interests:['shipwatch'],pictured:false},{interests:[],pictured:false}]){
  const settings={days,maxDrive,month,...prefs};
  const route=optimizer.optimize(trace,stays,settings);
  for(const day of route.days){
   let prior=-1;
   for(const hours of optimizer.DAY_WINDOWS){
    const p=optimizer.experiencePlan(day,settings,experienceCatalog,hours);cases++;
    assert.ok(p);assert.equal(p.dayMinutes,hours*60);
    assert.ok(p.driveMinutes>=day.rawDriveHours*60&&p.borderMinutes>=day.borderReserveHours*60);
    const ids=day.stops.slice(1);
    assert.ok(p.deferred.every(id=>ids.includes(id)&&experienceCatalog[id]));
    if(day.incompleteParkApproach){
     assert.equal(p.remainingMinutes,null);assert.equal(p.state,'ROAD_CHECK');assert.equal(p.primary,null);
    }else{
     assert.ok(p.remainingMinutes>=prior&&p.remainingMinutes%15===0);
     assert.ok(p.remainingMinutes>=0&&p.remainingMinutes<=Math.max(0,p.dayMinutes-p.driveMinutes-p.borderMinutes));
     prior=p.remainingMinutes;
    }
    if(!day.withinCap)assert.equal(p.primary,null);
    if(p.primary){
     assert.equal(p.state,'REVIEW');assert.ok(p.remainingMinutes>=60);
     assert.ok(ids.includes(p.primary)&&!p.deferred.includes(p.primary));
     assert.ok((p.primary==='11'&&settings.pictured)||experienceCatalog[p.primary].interests.some(x=>settings.interests.includes(x)));
    }
   }
  }
 }
 assert.equal(cases,3072);
});
