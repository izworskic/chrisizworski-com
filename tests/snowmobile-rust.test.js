import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrailGraph, nearestNode, shortestPath, planRoute, planItinerary, haversineMiles } from '../lib/snowmobile/routing.mjs';
import { getRustEngine, shortestPathRust } from '../lib/snowmobile/rust-route.mjs';

const A=[-85,44],B=[-85,44.01],C=[-85,44.02],D=[-84.8,44.01];
const make=(id,coords,properties={})=>({type:'Feature',properties:{id,trailNetwork:id,band:'GOOD',score:80,...properties},geometry:{type:'LineString',coordinates:coords}});
const geo=(features)=>({type:'FeatureCollection',features});
const ends=(g,a,b)=>[nearestNode(g,a[1],a[0]).nodeKey,nearestNode(g,b[1],b[0]).nodeKey];

test('actual compiled Rust/WASM module is present and ABI validated',()=>{
  const e=getRustEngine();
  assert.ok(e,'Rust/WASM binary must be compiled and committed before merge');
  assert.equal(e.sm_abi_version(),1);
  assert.equal(e.sm_edge_stride(),16);
});

test('Rust chooses the shortest official geometry, backwards as well as forwards',()=>{
  const g=buildTrailGraph(geo([make('short-a',[A,B]),make('short-b',[B,C]),make('detour-a',[A,D]),make('detour-b',[D,C])]));
  for(const [start,finish] of [[A,C],[C,A]]){
    const [from,to]=ends(g,start,finish);
    const rust=shortestPathRust(g,from,to),live=shortestPath(g,from,to);
    assert.ok(rust,'WASM must calculate this graph');
    assert.ok(Math.abs(rust.miles-(haversineMiles(A,B)+haversineMiles(B,C)))<0.0001);
    assert.deepEqual(rust.edges.map(l=>l.edge.props.id),live.edges.map(l=>l.edge.props.id));
    assert.deepEqual(rust.edges.map(l=>l.forward),live.edges.map(l=>l.forward));
  }
});

test('Rust cannot route through closure excluded by DNR data, including off-season closures',()=>{
  const fc=geo([
    make('closed',[A,B],{band:'OFF_SEASON',legalState:'CLOSED'}),
    make('open',[B,C]),
    make('long-a',[A,D]),
    make('long-b',[D,C]),
  ]);
  const g=buildTrailGraph(fc);
  const [from,to]=ends(g,A,C);
  const answer=shortestPathRust(g,from,to);
  assert.ok(answer);
  assert.ok(!answer.edges.some(x=>x.edge.props.id==='closed'));
  const route=planRoute(fc,{fromLat:A[1],fromLon:A[0],toLat:C[1],toLon:C[0]});
  assert.equal(route.routable,true);
  assert.ok(!route.segmentIds.includes('closed'));
});

test('disconnected graph retains independent JS fail-closed verdict',()=>{
  const fc=geo([make('a',[A,B]),make('island',[[10,10],[10.01,10.01]])]);
  const g=buildTrailGraph(fc),[from,to]=ends(g,A,[10,10]);
  assert.equal(shortestPathRust(g,from,to),undefined,'WASM no-path never asserts a route');
  assert.equal(shortestPath(g,from,to),null);
});

test('multi-stop route totals and geometry remain compatible with the existing API',()=>{
  const fc=geo([make('one',[A,B]),make('two',[B,C])]);
  const points=[A,B,C,A].map(([lon,lat])=>({lat,lon}));
  const route=planItinerary(fc,points);
  assert.equal(route.routable,true);
  assert.equal(route.legs.length,3);
  assert.equal(route.segmentsTraversed,2);
  assert.equal(route.geometry.coordinates.length,5);
  assert.equal(route.estimatedMinutes,Math.round(route.legs.reduce((s,l)=>s+l.distanceMiles,0)*2));
});

test('unknown or invalid JS graph data is never passed through as a Rust route',()=>{
  const g=buildTrailGraph(geo([make('one',[A,B])]));
  const [from,to]=ends(g,A,B);
  g.edges[0].miles=NaN;
  assert.equal(shortestPathRust(g,from,to),undefined);
});
