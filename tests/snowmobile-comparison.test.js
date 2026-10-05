import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {evaluate,compare,bundleFresh,detailUrl}=require('../public/assets/snowmobile-comparison.js');
const context={active:true,fresh:true,closuresVerified:true};
const good={key:'good',route:{score:84,band:'GOOD',confidence:80,legalVerification:'CURRENT_LAYER_CHECKED'}};
test('comparison refuses a recommendation from stale data or missing closure verification',()=>{
  for(const ctx of [{...context,fresh:false},{...context,closuresVerified:false}])assert.equal(evaluate(good,ctx,{driveMinutes:90}).tripCandidate,false);
  assert.equal(evaluate({...good,route:{...good.route,legalVerification:'UNVERIFIED'}},context,{driveMinutes:90}).tripCandidate,false);
});
test('closure overrides a positive score and off-season planning never recommends riding',()=>{
  assert.equal(evaluate({...good,route:{...good.route,routeState:'ROUTE_BROKEN'}},context,{driveMinutes:90}).state,'CLOSED');
  assert.equal(evaluate(good,{...context,active:false},{driveMinutes:90}).state,'OFF_SEASON');
});
test('unknown surface, low confidence and missing drive time cannot qualify as a trip candidate',()=>{
  assert.equal(evaluate({...good,route:{...good.route,score:null}},context,{driveMinutes:90}).state,'UNKNOWN');
  assert.equal(evaluate({...good,route:{...good.route,confidence:45}},context,{driveMinutes:90}).tripCandidate,false);
  assert.equal(evaluate(good,context,{driveMinutes:null}).minutes,null);
  assert.equal(evaluate(good,context,null).tripCandidate,false);
  assert.equal(evaluate(good,context,{driveMinutes:181},3).tripCandidate,false);
  assert.equal(evaluate(good,context,{driveMinutes:180},3).tripCandidate,true);
});
test('short drive and fresh snow cannot promote an unknown region above a verified candidate',()=>{
  const unknown={key:'near',route:{score:null,band:'UNKNOWN',legalVerification:'CURRENT_LAYER_CHECKED'},surfaceEvidence:{observedSnow:{largest48hInches:12}}};
  const rows=compare([unknown,good],context,{near:{driveMinutes:20},good:{driveMinutes:120}},3);
  assert.equal(rows[0].region.key,'good');
  assert.equal(rows[1].decision.state,'UNKNOWN');
  assert.equal(compare([unknown,good],context,{near:{driveMinutes:20},good:{driveMinutes:120}},3,'nearest')[0].decision.state,'UNKNOWN');
});
test('last-known bundles and expired timestamps cannot borrow freshness from page load',()=>{
  const now=Date.parse('2026-12-05T12:00:00Z');
  assert.equal(bundleFresh({generatedAt:'2026-12-05T11:55:00Z'},now),true);
  assert.equal(bundleFresh({generatedAt:'2026-12-05T10:00:00Z'},now),false);
  assert.equal(bundleFresh({generatedAt:'2026-12-05T11:55:00Z',operational:{dataState:'stale-last-known'}},now),false);
});
test('named origin survives the region handoff without exposing browser coordinates',()=>{
  assert.equal(detailUrl('grayling-gaylord','detroit',4),'/snowmobile/regions/grayling-gaylord.html?origin=detroit&maxDrive=4');
  assert.equal(detailUrl('grayling-gaylord','43.5,-84.1',4),'/snowmobile/regions/grayling-gaylord.html');
});
test('a failed DNR geometry feed retains independent weather context without verifying a route',async()=>{
  const {buildRegion,regionSummary}=await import('../lib/snowmobile/build-region.mjs');
  const engine=await import('../lib/snowmobile/engine.mjs');
  const region={key:'eastern-up',label:'Eastern U.P.',shortLabel:'Eastern U.P.',hubTown:'Sault Ste. Marie',hubLat:46.4953,hubLon:-84.3453,counties:['Chippewa']};
  const weather={maxTempF:25,minTempF:10,generatedAt:new Date().toISOString(),periods:[]};
  const built=await buildRegion(region,{season:true,closures:[],closuresOk:true,lib:{engine,sources:{fetchDnrTrailsByCounty:async()=>{throw new Error('DNR outage');},fetchWeatherFor:async()=>weather},surface:{fetchSurfaceEvidenceFor:async()=>({observedSnow:{available:true,largest48hInches:8},recentWeather:{available:true,thawRisk:'LOW'}})}}});
  const summary=regionSummary(built);
  assert.equal(summary.weather.maxTempF,25);
  assert.equal(summary.surfaceEvidence.observedSnow.largest48hInches,8);
  assert.equal(summary.route.score,null);
  assert.equal(summary.route.legalVerification,'UNVERIFIED');
  assert.equal(summary.route.confidence,0);
  assert.equal(evaluate(summary,context,{driveMinutes:90}).tripCandidate,false);
  assert.ok(summary.planning.reports.length>0);
});
