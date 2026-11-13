import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {nearbyEndpointPairs} from '../lib/snowmobile/spatial-index.mjs';
import {buildTrailGraph,haversineMiles,planRoute,routeJunctions} from '../lib/snowmobile/routing.mjs';
const require=createRequire(import.meta.url);
const picker=require('../public/assets/snowmobile-route-picker.js');
const within=(a,b)=>haversineMiles(a,b)*1609.344<=20;

function findPairs(points){
 const candidate=nearbyEndpointPairs(points,20),result=[];
 for(let i=0;i<points.length;i++){
   const js=candidate(i);
   assert.deepEqual(js,[...new Set(js)].sort((a,b)=>a-b),'candidate IDs must be ordered and unique');
   for(const j of js)assert.ok(j>i);
   const expected=points.map((_,j)=>j).filter(j=>j>i&&within(points[i],points[j]));
   const actual=js.filter(j=>within(points[i],points[j]));
   assert.deepEqual(actual,expected,'shortlist must include every truly-snappable junction and no extras inside tolerance');
   result.push(...actual.map(j=>[i,j]));
 }
 return result;
}

test('spatial shortlist preserves all true 20m matches and stable ID ordering',()=>{
 const pts=[];
 for(let i=0;i<72;i++){
   const lat=44.1+(i%9)*0.002,lon=-85.4+Math.floor(i/9)*0.003;
   pts.push([lon,lat],[lon+0.00005,lat+0.00005],[lon+0.00040,lat]);
 }
 const pairs=findPairs(pts);
 assert.ok(pairs.length>=72);
 const total=pts.length*(pts.length-1)/2;
 const candidates=nearbyEndpointPairs(pts,20);
 const count=pts.reduce((n,_,i)=>n+candidates(i).length,0);
 assert.ok(count<total/10,'grid must eliminate most needless comparisons');
});

test('spatial shortlist keeps boundaries, negative longitudes and high-lat fallback safe',()=>{
 findPairs([
  [-85.0000,44.0000],[-85.0000,44.00017],[-85.0000,44.00020],
  [-85.0003,44.0000],[-85.0001,44.00015],[-86.5,45],
  [179.99,73],[-179.99,73],[179.99001,73],
  [-87.8,47.9],[-87.8001,47.9]
 ]);
});

const feat=(id,a,b,extra={})=>({type:'Feature',properties:{id,trailNetwork:id,band:'GOOD',score:80,...extra},geometry:{type:'LineString',coordinates:[a,b]}});
const A=[-85,44],B=[-85,44.01],C=[-85,44.02];
const fc=features=>({type:'FeatureCollection',features});

test('trail junctions remain exactly map-selectable DNR endpoints; closures and crossings stay excluded',()=>{
 const nearB=[B[0]+0.00006,B[1]+0.00005];
 const geometry=fc([
  feat('one',A,B),feat('two',nearB,C),
  feat('closed',[C,[-85.01,44.03]],{band:'CLOSED'}),
  feat('line-crossing',[-85.01,44.015],[-84.99,44.015])
 ]);
 const graph=buildTrailGraph(geometry);
 assert.equal(graph.closedSegmentsExcluded,1);
 assert.equal(graph.nodes.size,5,'near endpoints merge, unrelated crossings do not');
 const dots=routeJunctions(geometry);
 assert.equal(dots.features.length,5);
 assert.equal(new Set(dots.features.map(f=>f.properties.component)).size,2);
 const result=planRoute(geometry,{fromLat:A[1],fromLon:A[0],toLat:C[1],toLon:C[0]});
 assert.ok(result.routable);
 assert.deepEqual(result.segmentIds,['one','two']);
});

test('search selects only returned mapped junctions on current connected component',()=>{
 const p=(id,label,component,lon=-85,lat=44)=>({type:'Feature',geometry:{type:'Point',coordinates:[lon,lat]},properties:{id,label,component}});
 const features=[p('n1','UP 8 / UP 13',0),p('n2','UP 8',1),p('n3','LP 7',0),p('n4','UP 8',0,-84.7,44.3),p('n5','Unknown',0)];
 assert.deepEqual(picker.findJunctions(features,'UP 8',0).map(f=>f.properties.id),['n4','n1']);
 assert.deepEqual(picker.findJunctions(features,'UP 8',1).map(f=>f.properties.id),['n2']);
 assert.deepEqual(picker.findJunctions(features,'UP',0),picker.findJunctions(features,'up',0));
 assert.deepEqual(picker.findJunctions(features,'U',0),[]);
 assert.deepEqual(picker.findJunctions(features,'UP 8',999),[]);
});

test('route evidence cannot promote mapped mileage to verified surface or open access',()=>{
 const route={routable:true,segments:[{segmentId:'a',score:null},{segmentId:'b',score:80},{segmentId:'c',band:'UNKNOWN'}],legs:[{},{}]};
 const uncertain=picker.routeEvidence(route,{closureVerified:false,seasonActive:false});
 assert.equal(uncertain.unverifiedSegments,2);
 assert.equal(uncertain.scoredSegments,1);
 assert.equal(uncertain.travelVerdict,'DISTANCE PLANNING ONLY');
 assert.equal(uncertain.closureVerified,false);
 assert.equal(uncertain.seasonActive,false);
 assert.equal(picker.routeEvidence({...route,segments:[{band:'CLOSED'}]}).inconsistentClosedSegment,true);
 assert.equal(picker.routeEvidence({routable:false}),null);
});

test('all seven generated region pages load the picker before route UI script',()=>{
 const ids=['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan'];
 for(const id of ids){
  const html=readFileSync(new URL('../public/snowmobile/regions/'+id+'.html',import.meta.url),'utf8');
  assert.match(html,/id="junctionSearch"/);
  assert.match(html,/id="junctionSearchResults"/);
  const pickerAt=html.indexOf('src="/assets/snowmobile-route-picker.js');
  const regionAt=html.indexOf('src="/assets/snowmobile-region.js');
  assert.ok(pickerAt>0&&regionAt>pickerAt,'picker must load first');
 }
 const regionJs=readFileSync(new URL('../public/assets/snowmobile-region.js',import.meta.url),'utf8');
 assert.match(regionJs,/selectSearchedJunction/);
 assert.match(regionJs,/renderJunctionMatches/);
 assert.match(regionJs,/inconsistentClosedSegment/);
});
