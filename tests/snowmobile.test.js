import test from 'node:test';
import assert from 'node:assert/strict';
import {isSnowmobileSeason,freshness,scoreSegment,routeDecision,confidence,closureForSegment,corridorSection,rankRideWindows} from '../lib/snowmobile/engine.mjs';

test('season boundary prevents September ride scoring',()=>{
  assert.equal(isSnowmobileSeason(new Date('2026-09-19T12:00:00-04:00')),false);
  assert.equal(scoreSegment({},{season:false}).score,null);
});

test('official matched closure hard-vetoes a required segment',()=>{
  const closure={properties:{PublicComm:'Bridge out'}};
  const s={id:'7',trailNetwork:'Trail 7'};
  const scored={...s,...scoreSegment(s,{season:true,verifiedClosure:closure})};
  assert.equal(scored.band,'CLOSED');
  assert.equal(routeDecision([scored],{season:true,closureLayerVerified:true}).routeState,'ROUTE_BROKEN');
});

test('general trail Status field does not set legal closure state',()=>{
  const scored=scoreSegment({sourceStatusField:'Closed'},{season:true,verifiedClosure:null});
  assert.notEqual(scored.band,'CLOSED');
  assert.equal(scored.legalState,'NO_MATCH_IN_CURRENT_CLOSURE_LAYER');
});

test('closure matching requires official closure semantics and trail identity',()=>{
  const closures=[{properties:{DNRTrail:'7',TrailNameP:'Trail 7',OpenClosed:'Closed',Snowmobile:'Yes'}}];
  assert.ok(closureForSegment({id:'7',trailNetwork:'Trail 7'},closures));
  assert.equal(closureForSegment({id:'8',trailNetwork:'Trail 8'},closures),null);
});

test('stale grooming stays stale independently of page freshness',()=>{
  const f=freshness('2023-03-06T12:00:00Z','grooming',new Date('2026-01-15T12:00:00Z').getTime());
  assert.equal(f.state,'STALE');
  const scored=scoreSegment({},{season:true,clubReport:{condition:'Fair',freshness:{state:'RECENT'},groomingFreshness:f}});
  assert.ok(scored.reasons.some(x=>/not used as current grooming evidence/i.test(x)));
});

test('route score is bottleneck aware instead of a simple mean',()=>{
  const route=routeDecision([{score:87,band:'EXCELLENT'},{score:84,band:'GOOD'},{score:81,band:'GOOD'},{score:31,band:'POOR'}],{season:true,closureLayerVerified:true});
  assert.ok(route.score<70);
  assert.equal(route.routeState,'DETOUR_OR_AVOID');
});

test('confidence remains separate from condition',()=>{
  const score=scoreSegment({},{season:true,clubReport:{condition:'Good',freshness:{state:'STALE'}}}).score;
  const c=confidence({officialFresh:true,closureLayerVerified:true,clubReports:[{freshness:{state:'STALE'}}],weatherFresh:true,segmentCoverage:1});
  assert.ok(Number.isFinite(score));
  assert.ok(Number.isFinite(c));
  assert.notEqual(score,c);
});

test('corridor segmentation is spatial, not array-order based',()=>{
  assert.equal(corridorSection(44.66),'grayling');
  assert.equal(corridorSection(44.78),'frederic');
  assert.equal(corridorSection(44.90),'waters');
  assert.equal(corridorSection(45.03),'gaylord');
});

test('forecast-period ranking does not upgrade trail state and prefers colder dry period',()=>{
  const weather={
    grayling:{periods:[
      {name:'Saturday',startTime:'2026-01-10T08:00:00-05:00',isDaytime:true,temperature:24,windSpeed:'10 mph',shortForecast:'Mostly Sunny',detailedForecast:'Cold and dry.'},
      {name:'Sunday',startTime:'2026-01-11T08:00:00-05:00',isDaytime:true,temperature:41,windSpeed:'12 mph',shortForecast:'Rain Showers',detailedForecast:'Rain likely.'}
    ]},
    gaylord:{periods:[
      {name:'Saturday',startTime:'2026-01-10T08:00:00-05:00',isDaytime:true,temperature:22,windSpeed:'12 mph',shortForecast:'Partly Cloudy',detailedForecast:'Cold.'},
      {name:'Sunday',startTime:'2026-01-11T08:00:00-05:00',isDaytime:true,temperature:39,windSpeed:'15 mph',shortForecast:'Rain',detailedForecast:'Rain.'}
    ]}
  };
  const ranked=rankRideWindows(weather,true);
  assert.equal(ranked.best.name,'Saturday');
  assert.match(ranked.boundary,/does not upgrade trail condition/i);
});

test('forecast timing is disabled off season',()=>{
  const ranked=rankRideWindows({grayling:{periods:[{name:'Today',startTime:'2026-09-19T08:00:00-04:00',temperature:30}]}},false);
  assert.equal(ranked.best,null);
});
