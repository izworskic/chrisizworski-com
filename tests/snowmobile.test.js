import test from 'node:test';
import assert from 'node:assert/strict';
import {isSnowmobileSeason,freshness,scoreSegment,routeDecision,confidence,closureForSegment,corridorSection,rankRideWindows} from '../lib/snowmobile/engine.mjs';

const currentGood={condition:'Good',freshness:{state:'RECENT'},groomingFreshness:{state:'RECENT'}};
const safeSurface={observedSnow:{available:true,largest48hInches:5,largest168hInches:8},recentWeather:{available:true,thawRisk:'LOW',rainObserved:false,maxTempF:26}};

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
  assert.match(scored.legalState,/NO_MATCH_IN_CURRENT_CLOSURE_LAYER/);
});

test('closure matching requires official closure semantics and trail identity',()=>{
  const closures=[{properties:{DNRTrail:'7',TrailNameP:'Trail 7',OpenClosed:'Closed',Snowmobile:'Yes'}}];
  assert.ok(closureForSegment({id:'7',trailNetwork:'Trail 7'},closures));
  assert.equal(closureForSegment({id:'8',trailNetwork:'Trail 8'},closures),null);
});

test('closure matching is exact, not substring',()=>{
  const closures=[{properties:{DNRTrail:'DNR Trail',TrailNameP:'LP 4',OpenClosed:'Temporarily Closed',Snowmobile:'Yes'}}];
  assert.ok(closureForSegment({id:'seg-1',trailNetwork:'LP 4'},closures));
  for(const name of ['LP 47','LP 487','LP 482','LP 404','LP 4 Spur'])assert.equal(closureForSegment({id:`seg-${name}`,trailNetwork:name},closures),null);
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

test('confidence remains separate from condition and no surface report caps confidence',()=>{
  const scored=scoreSegment({},{season:true,clubReport:currentGood,surfaceEvidence:safeSurface});
  const direct=confidence({officialFresh:true,closureLayerVerified:true,clubReports:[currentGood],weatherFresh:true,segmentCoverage:1,surfaceEvidence:safeSurface});
  const sparse=confidence({officialFresh:true,closureLayerVerified:true,clubReports:[],weatherFresh:true,segmentCoverage:1,surfaceEvidence:safeSurface});
  assert.ok(Number.isFinite(scored.score));
  assert.ok(direct>50);
  assert.ok(sparse<=45);
  assert.notEqual(scored.score,direct);
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
  assert.match(ranked.boundary,/do(?:es)? not upgrade trail condition/i);
});

test('forecast timing is disabled off season',()=>{
  const ranked=rankRideWindows({grayling:{periods:[{name:'Today',startTime:'2026-09-19T08:00:00-04:00',temperature:30}]}},false);
  assert.equal(ranked.best,null);
});

test('hourly five-hour windows support precise timing without changing trail truth',()=>{
  const make=(temp,rain=false)=>Array.from({length:6},(_,i)=>({startTime:`2026-01-10T${String(8+i).padStart(2,'0')}:00:00-05:00`,endTime:`2026-01-10T${String(9+i).padStart(2,'0')}:00:00-05:00`,isDaytime:true,temperature:temp+i,windSpeed:'10 mph',shortForecast:rain?'Rain':'Mostly Sunny'}));
  const ranked=rankRideWindows({grayling:{hourly:make(20)},gaylord:{hourly:make(18)}},true);
  assert.equal(ranked.mode,'nws-hourly-5h');
  assert.match(ranked.best.name,/Saturday 8 AM.*1 PM/);
  assert.match(ranked.boundary,/do(?:es)? not upgrade trail condition/i);
});

test('explicit DNR snowmobile closed status is a hard veto',()=>{
  const s={id:'x',officialStatus:'Closed Permanent'};
  const scored={...s,...scoreSegment(s,{season:true,verifiedClosure:null})};
  assert.equal(scored.band,'CLOSED');
  assert.equal(scored.legalState,'CLOSED_DNR_TRAIL_STATUS');
  assert.equal(routeDecision([scored],{season:true,closureLayerVerified:true}).routeState,'ROUTE_BROKEN');
});

test('DNR grooming type is not current grooming evidence',()=>{
  const s={groomType:'Groomed',groomingSponsor:'Example Sponsor'};
  const scored=scoreSegment(s,{season:true,clubReport:null,weather:null});
  assert.equal(scored.score,null);
  assert.equal(scored.band,'UNKNOWN');
});

// High-cost trip-decision failure cases.
test('fresh 10 inch snowfall without a surface report stays UNKNOWN',()=>{
  const surface={observedSnow:{available:true,largest48hInches:10,largest168hInches:10},recentWeather:{available:true,thawRisk:'LOW',rainObserved:false}};
  const scored=scoreSegment({officialStatus:'Open'},{season:true,clubReport:null,weather:{snowIn:0,maxTempF:24},surfaceEvidence:surface});
  assert.equal(scored.score,null);
  assert.equal(scored.band,'UNKNOWN');
  assert.match(scored.reasons.join(' '),/does not prove trail base/i);
});

test('forecast snow never upgrades the current trail score before it falls',()=>{
  const dry=scoreSegment({},{season:true,clubReport:currentGood,weather:{maxTempF:25,snowIn:0},surfaceEvidence:safeSurface});
  const snow=scoreSegment({},{season:true,clubReport:currentGood,weather:{maxTempF:25,snowIn:6},surfaceEvidence:safeSurface});
  assert.ok(snow.score<=dry.score);
  assert.match(snow.reasons.join(' '),/does not improve the current score/i);
});

test('recent rain and thaw downgrade an otherwise current good report',()=>{
  const cold=scoreSegment({},{season:true,clubReport:currentGood,weather:{maxTempF:28},surfaceEvidence:safeSurface});
  const damaged=scoreSegment({},{season:true,clubReport:currentGood,weather:{maxTempF:28},surfaceEvidence:{observedSnow:{available:true,largest48hInches:12,largest168hInches:18},recentWeather:{available:true,thawRisk:'HIGH',rainObserved:true,maxTempF:45}}});
  assert.ok(damaged.score<cold.score);
  assert.match(damaged.reasons.join(' '),/rain\/icing|thaw\/softening/i);
});

test('aging positive report is capped at FAIR',()=>{
  const aging={condition:'Excellent',freshness:{state:'AGING'},groomingFreshness:{state:'RECENT'}};
  const scored=scoreSegment({},{season:true,clubReport:aging,weather:{maxTempF:24},surfaceEvidence:safeSurface});
  assert.ok(scored.score<=59);
  assert.equal(scored.band,'FAIR');
});

test('fresh grooming timestamp cannot rescue a poor surface report',()=>{
  const poor={condition:'Poor',freshness:{state:'RECENT'},groomingFreshness:{state:'LIVE'}};
  const scored=scoreSegment({},{season:true,clubReport:poor,weather:{maxTempF:24},surfaceEvidence:safeSurface});
  assert.ok(scored.score<58);
  assert.notEqual(scored.band,'GOOD');
});

test('major thaw forecast lowers an otherwise identical current report',()=>{
  const cold=scoreSegment({},{season:true,clubReport:currentGood,weather:{maxTempF:25,rainSignal:false},surfaceEvidence:safeSurface});
  const thaw=scoreSegment({},{season:true,clubReport:currentGood,weather:{maxTempF:43,rainSignal:false},surfaceEvidence:safeSurface});
  assert.ok(thaw.score<cold.score);
});

test('stale surface report is treated as missing, not as current condition',()=>{
  const stale={condition:'Excellent',freshness:{state:'STALE'},groomingFreshness:{state:'STALE'}};
  const scored=scoreSegment({officialStatus:'Open'},{season:true,clubReport:stale,weather:{maxTempF:20},surfaceEvidence:safeSurface});
  assert.equal(scored.score,null);
  assert.equal(scored.band,'UNKNOWN');
});
