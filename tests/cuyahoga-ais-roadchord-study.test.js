'use strict';
const {before,test}=require('node:test');
const assert=require('node:assert/strict');
const catalog=require('../data/cuyahoga/noaa-coast-pilot-bridge-references.json');
let analyzeRoadChords,straightChordIntersection;
before(async()=>({analyzeRoadChords,straightChordIntersection}=await import('../scripts/cuyahoga-ais-roadchord-study.mjs')));
const county={type:'FeatureCollection',features:[{
  type:'Feature',properties:{fullname:'Center Street',OBJECTID:379730},
  geometry:{type:'LineString',coordinates:[
   [-81.70339192740286,41.49430608890061],[-81.70317092713304,41.49425708892183]
  ]}
}]};
const channel=(area=[[-81.7036,41.4940],[-81.7030,41.4940],[-81.7030,41.4947],[-81.7036,41.4947],[-81.7036,41.4940]])=>({
 type:'FeatureCollection',features:[{type:'Feature',properties:{sdsfeaturename:'CUYAHOGA RIVER'},
 geometry:{type:'Polygon',coordinates:[area]}}]});
const study=(day,points)=>({schemaVersion:1,observationKind:'historical',source:'NOAA dated broadcast fixes '+day,tracks:[{
 mmsi:'368251670',vesselNames:['MARK W BARKER'],points
}]});
const point=(seen,lat,lon)=>({seen,lat,lon});
test('proper crossing of two finite geometry segments yields candidate, touching endpoints does not',()=>{
 assert.ok(straightChordIntersection({x:-1,y:1},{x:1,y:1},{x:0,y:0},{x:0,y:2}));
 assert.equal(straightChordIntersection({x:-1,y:0},{x:1,y:0},{x:0,y:0},{x:0,y:2}),null);
 assert.equal(straightChordIntersection({x:-1,y:1},{x:1,y:1},{x:-1,y:2},{x:1,y:2}),null);
});
test('August 21 2025 real NOAA Center Street fixes yield only a bounded, non-confirmed line candidate',()=>{
 const report=analyzeRoadChords(study('2025-08-21',[
  point('2025-08-21T15:37:28.000Z',41.49462,-81.70315),
  point('2025-08-21T15:38:39.000Z',41.49418,-81.70339)
 ]),catalog,county,channel());
 const x=report.vessels[0].roadLineIntersectionCandidates.find(x=>x.bridgeReferenceId==='center-st-139');
 assert.equal(x.status,'POTENTIAL_CHORD_INTERSECTION_NOT_SURVEYED_BRIDGE_CROSSING');
 assert.equal(x.episodes.length,1);
 assert.equal(x.episodes[0].firstBracketStart,'2025-08-21T15:37:28.000Z');
 assert.equal(x.episodes[0].lastBracketEnd,'2025-08-21T15:38:39.000Z');
 assert.equal(x.confirmedBridgePassages,0);
 assert.equal(report.futureBridgeEtaEnabled,false);
 assert.equal(report.crossedBridgeAxisValidated,false);
 assert.ok(!JSON.stringify(report).includes('fractionOnAisChord'));
});
test('July 7 2025 separate NOAA Center Street fixes independently reproduce another short chord bracket',()=>{
 const report=analyzeRoadChords(study('2025-07-07',[
  point('2025-07-07T04:01:09.000Z',41.49457,-81.70317),
  point('2025-07-07T04:02:19.000Z',41.4941,-81.70342)
 ]),catalog,county,channel());
 const x=report.vessels[0].roadLineIntersectionCandidates.find(x=>x.bridgeReferenceId==='center-st-139');
 assert.equal(x.episodes.length,1);
 assert.equal(x.episodes[0].representative.bracketSeconds,70);
});
test('long gap, near-stationary jitter and incomplete channel overlap cannot create crossing',()=>{
 const src=[
  point('2025-08-21T15:37:28.000Z',41.49462,-81.70315),
  point('2025-08-21T15:48:39.000Z',41.49418,-81.70339)
 ];
 const gap=analyzeRoadChords(study('2025-08-21',src),catalog,county,channel());
 assert.equal(gap.vessels[0].roadLineIntersectionCandidates[0].episodes.length,0);
 const small=analyzeRoadChords(study('2025-08-21',[
  point('2025-08-21T15:37:28.000Z',41.494295,-81.70329),
  point('2025-08-21T15:38:39.000Z',41.494288,-81.70333)
 ]),catalog,county,channel());
 assert.equal(small.vessels[0].roadLineIntersectionCandidates[0].episodes.length,0);
 const noRoad=analyzeRoadChords(study('2025-08-21',src),catalog,county,channel([
 [-81.7049,41.4948],[-81.7041,41.4948],[-81.7041,41.4952],[-81.7049,41.4952],[-81.7049,41.4948]
 ]));
 assert.equal(noRoad.matchedRoadReferences.length,0);
});
test('only dated historical NOAA records allowed; no new ETA logic',()=>{
 const base=study('2025-08-21',[]);
 assert.throws(()=>analyzeRoadChords({...base,observationKind:'live'},catalog,county,channel()),/historical/);
 assert.equal(analyzeRoadChords(base,catalog,county,channel()).futureBridgeEtaEnabled,false);
});
