import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {closureForSegment,closureCoversSegment,statusSaysClosed,scoreSegment} from '../lib/snowmobile/engine.mjs';
import {buildTrailGraph,planRoute} from '../lib/snowmobile/routing.mjs';
import {findLoops} from '../lib/snowmobile/loops.mjs';

// One trail, "UP 2", published by DNR as separate segments. Each is about a
// mile long and they meet end to end, west to east.
const line=(x0,x1,y=46.10)=>({type:'LineString',coordinates:Array.from({length:9},(_,i)=>[x0+(x1-x0)*i/8,y])});
const seg=(id,x0,x1,extra={})=>({id,trailNetwork:'UP 2',officialStatus:'Open',geometry:line(x0,x1),...extra});
const west=seg('{AAA}',-88.60,-88.58),middle=seg('{BBB}',-88.58,-88.56),east=seg('{CCC}',-88.56,-88.54);
const farAway=seg('{ZZZ}',-86.20,-86.18); // same trail number, 110 miles east
const closure=(properties,geometry)=>({properties:{Snowmobile:'Snowmobile',OpenClosed:'Temporarily Closed Due To Trail Maintenance Or Repair',TrailNameP:'UP 2',DNRTrail:'DNR Trail',...properties},geometry});

test('a closure closes the one segment it copies, not every segment with that trail number',()=>{
  // The real DNR shape: the closure record carries the closed segment's GlobalID and geometry.
  const closures=[closure({GlobalID:'{BBB}',County:'Iron'},middle.geometry)];
  assert.ok(closureForSegment(middle,closures));
  assert.equal(closureForSegment(west,closures),null,'the neighbor that only shares a junction stays open');
  assert.equal(closureForSegment(east,closures),null);
  assert.equal(closureForSegment(farAway,closures),null,'a closure in another county must not close the same trail number elsewhere');
});

test('ids are compared without regard to case or stray spaces',()=>{
  assert.ok(closureForSegment({...middle,id:'{bbb}'},[closure({GlobalID:' {BBB} '},middle.geometry)]));
});

test('if DNR republishes a closure under a new id, its line still closes the segment it lies on',()=>{
  const closures=[closure({GlobalID:'{NEW-ID}'},middle.geometry)];
  assert.ok(closureForSegment(middle,closures));
  assert.equal(closureForSegment(west,closures),null);
  assert.equal(closureForSegment(farAway,closures),null);
  // A closure line drawn a few metres off the trail centerline still counts.
  const offset={type:'LineString',coordinates:middle.geometry.coordinates.map(([x,y])=>[x,y+0.00008])};
  assert.ok(closureForSegment(middle,[closure({GlobalID:'{NEW-ID}'},offset)]));
  // The two DNR layers sometimes name one trail differently. Same ground is still closed.
  assert.ok(closureForSegment({...middle,trailNetwork:'Great Lake To Lake Trail 4'},closures));
  assert.equal(closureForSegment({...west,trailNetwork:'Great Lake To Lake Trail 4'},closures),null);
});

test('closure coverage is judged by the share of the segment on the closure line',()=>{
  assert.equal(closureCoversSegment(middle.geometry,middle.geometry),true);
  assert.equal(closureCoversSegment(west.geometry,middle.geometry),false,'end-to-end neighbors share one point only');
  const long=line(-88.60,-88.54); // three miles; one mile of it closed
  assert.equal(closureCoversSegment(long,middle.geometry),false,'one third covered is not a closed segment');
  const tiny={type:'LineString',coordinates:[[-88.5800,46.10],[-88.5795,46.10]]}; // about 40 m, touching the closure
  assert.equal(closureCoversSegment(tiny,east.geometry),false);
  assert.equal(closureCoversSegment(tiny,middle.geometry),true,'a short segment lying on the closed mile is closed');
  assert.equal(closureCoversSegment(null,middle.geometry),false);
  assert.equal(closureCoversSegment(middle.geometry,{type:'LineString',coordinates:[]}),false);
  const multi={type:'MultiLineString',coordinates:[west.geometry.coordinates,middle.geometry.coordinates]};
  assert.equal(closureCoversSegment(middle.geometry,multi),true);
});

test('a closure record that cannot be located still closes the named trail',()=>{
  // No id and no line: nothing says which part is closed, so err toward closed.
  const unlocated=[closure({},null)];
  assert.ok(closureForSegment(middle,unlocated));
  assert.ok(closureForSegment(farAway,unlocated));
  // A segment with no geometry cannot be shown open against a same-name closure line.
  assert.ok(closureForSegment({...middle,id:'{QQQ}',geometry:null},[closure({GlobalID:'{BBB}'},middle.geometry)]));
  // An id with no line points at one specific other segment.
  assert.equal(closureForSegment(west,[closure({GlobalID:'{BBB}'},null)]),null);
});

test('non-snowmobile and open records in the closure layer close nothing',()=>{
  assert.equal(closureForSegment(middle,[closure({GlobalID:'{BBB}',Snowmobile:'No',TrailUseCa:'Nonmotorized'},middle.geometry)]),null);
  assert.equal(closureForSegment(middle,[closure({GlobalID:'{BBB}',OpenClosed:'Open'},middle.geometry)]),null);
});

test('DNR "Temporarily Closed ..." trail status is a closure; a reroute that is open is not',()=>{
  for(const status of ['Closed','Temporarily Closed','Temporarily Closed Due To Bridge Maintenance Or Repair',' temporarily closed due to water on trail '])assert.equal(statusSaysClosed(status),true,status);
  for(const status of ['Open','Temporarily Open Reroute','-1','',null,undefined,'Not closed'])assert.equal(statusSaysClosed(status),false,String(status));
  const closedSeg={...middle,officialStatus:'Temporarily Closed Due To Timber Harvest'};
  const inSeason=scoreSegment(closedSeg,{season:true});
  assert.equal(inSeason.band,'CLOSED');
  assert.equal(inSeason.veto,true);
  assert.equal(scoreSegment(closedSeg,{season:false}).legalState,'CLOSED','off-season plans must not route through it either');
  assert.equal(scoreSegment(middle,{season:false}).legalState,'NOT_IN_SEASON');
  assert.equal(scoreSegment({...middle,officialStatus:'Temporarily Open Reroute'},{season:false}).legalState,'NOT_IN_SEASON');
});

test('routes and loops avoid a segment whose DNR status says temporarily closed, and use the open ones around it',()=>{
  const feature=(s,props={})=>({type:'Feature',properties:{id:s.id,trailNetwork:s.trailNetwork,band:'OFF_SEASON',legalState:'NOT_IN_SEASON',officialStatus:'Open',...props},geometry:s.geometry});
  const closedMiddle={type:'FeatureCollection',features:[feature(west),feature(middle,{officialStatus:'Temporarily Closed Due To Bridge Maintenance Or Repair'}),feature(east)]};
  assert.equal(buildTrailGraph(closedMiddle).closedSegmentsExcluded,1);
  const blocked=planRoute(closedMiddle,{fromLat:46.10,fromLon:-88.60,toLat:46.10,toLon:-88.54});
  assert.equal(blocked.routable,false,'the only way east is closed');
  const loops=findLoops(closedMiddle,{lat:46.10,lon:-88.60,targetMiles:6});
  for(const option of loops.options||[])assert.ok(!option.segmentIds.includes('{BBB}'));
  const allOpen={type:'FeatureCollection',features:[feature(west),feature(middle),feature(east)]};
  assert.equal(planRoute(allOpen,{fromLat:46.10,fromLon:-88.60,toLat:46.10,toLon:-88.54}).routable,true);
});

test('the matcher documents why trail-name matching alone is not used',()=>{
  const engine=fs.readFileSync('lib/snowmobile/engine.mjs','utf8');
  assert.match(engine,/matched to a segment, never to a whole trail/);
  assert.ok(engine.includes('p.GlobalID'));
});
