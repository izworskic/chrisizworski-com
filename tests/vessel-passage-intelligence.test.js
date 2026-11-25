'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {trackSegments,analyzePassage,summarize}=require('../lib/vessel-passage-intelligence.cjs');
const stamp=n=>new Date(Date.UTC(2025,6,7,12,0,n)).toISOString();
const fix=(n,lat=41.49,lon=-81.7)=>({seen:stamp(n),lat,lon});
const points=Array.from({length:15},(_,i)=>fix(i*60,41.49+i*.0004));
const event=(id,mile,a,b,c)=>({id,riverMile:mile,status:'OBSERVED_NEAR_CHART_POINT_WITH_BRACKET',bracket:{observedBracketStart:stamp(a),nearestObservedAt:stamp(b),observedBracketEnd:stamp(c)}});
test('observed checkpoint time interval is based on actual fixes and never a crossing',()=>{
 const result=analyzePassage(points,[event('a',1,60,120,180),event('b',2,360,420,480)]);
 assert.equal(result.intervals.length,1);
 const x=result.intervals[0];
 assert.equal(x.observedElapsedSeconds,300);
 assert.equal(x.referenceBracketMinimumSeconds,180);
 assert.equal(x.referenceBracketMaximumSeconds,420);
 assert.equal(result.claims.forecastEnabled,false);
 assert.equal(result.claims.bridgeCrossing,false);
});
test('reverse sequence is labeled separately; no overlapping reference brackets or long gaps',()=>{
 const a=event('a',2,60,120,180),b=event('b',1,360,420,480);
 assert.equal(analyzePassage(points,[b,a]).intervals[0].direction,'decreasing-reference-miles');
 assert.equal(analyzePassage(points,[a,event('c',3,120,180,240)]).withheld.overlapping,1);
 const partial=points.filter(p=>![240,300].includes((Date.parse(p.seen)-Date.parse(stamp(0)))/1000));
 assert.equal(analyzePassage(partial,[a,b]).intervals.length,1,'exactly 3 min remains eligible');
 const broken=partial.filter(p=>p.seen!==stamp(360));
 assert.equal(analyzePassage(broken,[a,event('d',1,420,480,540)]).withheld.discontinuous,1);
});
test('bad timestamps, contradictory duplicates and impossible jumps cannot support a passage',()=>{
 assert.throws(()=>trackSegments([fix(0),fix(0,42)]),/Conflicting/);
 assert.throws(()=>trackSegments([{...fix(0),seen:'2025-02-30T00:00:00Z'}]),/Invalid UTC/);
 assert.equal(trackSegments([fix(0),fix(0)]).duplicates,1);
 assert.equal(trackSegments([fix(0),fix(60,42)]).jumpBreaks,1);
 assert.throws(()=>analyzePassage(points,[event('x',1,60,121,180)]),/actual ordered fixes/);
});
test('stationary-looking sequences are descriptive low-displacement episodes, not stops',()=>{
 const rows=Array.from({length:11},(_,i)=>fix(i*60));
 const a=analyzePassage(rows,[]);
 assert.equal(a.lowDisplacementEpisodes.length,1);
 assert.equal(a.lowDisplacementEpisodes[0].durationSeconds,600);
 assert.equal(a.claims.confirmedStop,false);
 assert.equal(summarize([{date:'2025-07-07',mmsi:'123456789',analysis:a}]).forecastEnabled,false);
});
test('uncertain or collocated reference events do not create intervals',()=>{
 const a=event('a',1,60,120,180),b=event('b',2,360,420,480);
 assert.equal(analyzePassage(points,[a,{...b,useForIndividualBridgeCalibration:false}]).intervals.length,0);
 assert.equal(analyzePassage(points,[a,{...b,status:'OFFICIAL_POSITION_CONFLICT'}]).intervals.length,0);
});
test('committed NOAA research output is reproducible and no passage forecast is authorized',async()=>{
 const {generate}=require('../scripts/vessel-passage-study.cjs');
 const result=await generate(),expected=require('../data/cuyahoga/passage-evidence-2025.json');
 assert.deepEqual(result,expected);
 assert.equal(result.summary.uniqueFixes,1002);
 assert.equal(result.summary.sampledDates,3);
 assert.equal(result.summary.distinctVessels,2);
 assert.equal(result.summary.forecastEnabled,false);
});
