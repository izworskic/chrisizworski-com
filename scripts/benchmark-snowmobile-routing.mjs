#!/usr/bin/env node
// Repeatable workload to measure endpoint bucketing and real Rust/WASM
// route runtime. Timings are diagnostic, never CI pass/fail thresholds.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {nearbyEndpointPairs} from '../lib/snowmobile/spatial-index.mjs';
import {buildTrailGraph} from '../lib/snowmobile/routing.mjs';
import {getRustEngine,shortestPathRust} from '../lib/snowmobile/rust-route.mjs';

const feat=(id,a,b)=>({type:'Feature',geometry:{type:'LineString',coordinates:[a,b]},properties:{id,trailNetwork:id,band:'UNKNOWN',score:null,legalState:'NOT_IN_SEASON'}});
const fc=features=>({type:'FeatureCollection',features});
const miles=(a,b)=>{
 const [lo1,la1]=a,[lo2,la2]=b,r=Math.PI/180;
 const h=Math.sin((la2-la1)*r/2)**2+Math.cos(la1*r)*Math.cos(la2*r)*Math.sin((lo2-lo1)*r/2)**2;
 return 3958.7613*2*Math.asin(Math.min(1,Math.sqrt(h)));
};
function referenceShortest(graph,start,goal){
 const d=new Map([[start,0]]),visited=new Set();
 while(true){
  let best=Infinity,current=null;
  for(const [key,cost] of d)if(!visited.has(key)&&cost<best){best=cost;current=key;}
  if(current===null)return null;
  if(current===goal)return best;
  visited.add(current);
  for(const link of graph.adjacency.get(current)||[]){
   const alt=best+link.edge.miles;
   if(alt<(d.get(link.to)??Infinity))d.set(link.to,alt);
  }
 }
}
const t0=performance.now();
const spread=Array.from({length:1000},(_,i)=>{
 const lat=44.1+Math.floor(i/40)*0.011;
 const lon=-86.0+(i%40)*0.012;
 return feat('s'+i,[lon,lat],[lon+0.00006,lat+0.00003]);
});
const endpoints=spread.flatMap(f=>[f.geometry.coordinates[0],f.geometry.coordinates[1]]);
const candidate=nearbyEndpointPairs(endpoints,20);
let checks=0;
for(let i=0;i<endpoints.length;i++)checks+=candidate(i).length;
const naivePairs=endpoints.length*(endpoints.length-1)/2;
const graph=buildTrailGraph(fc(spread));
const buildMs=performance.now()-t0;
assert.equal(graph.edges.length,1000);
assert.equal(graph.nodes.size,1000);
assert.ok(checks<naivePairs/20,'endpoint shortlist should eliminate >95% of irrelevant pairs');

const links=[];
let prior=[-85.9,44.4];
for(let i=1;i<=280;i++){
 const next=[-85.9,44.4+i*0.003];
 links.push(feat('link'+i,prior,next));prior=next;
}
const connected=buildTrailGraph(fc(links)),keys=[...connected.nodes.keys()];
assert.equal(keys.length,281);
const pairs=[[keys[0],keys[280]],[keys[12],keys[200]],[keys[279],keys[3]],[keys[51],keys[241]]];
assert.ok(getRustEngine(),'the benchmark requires actual compiled Rust/WASM');
for(const [start,end] of pairs){
 const rust=shortestPathRust(connected,start,end);
 const js=referenceShortest(connected,start,end);
 assert.ok(rust&&Number.isFinite(js),'both solvers must find the same route');
 assert.ok(Math.abs(rust.miles-js)<1e-8,'Rust path mileage must match independent JS path');
}
const iterations=48;
let now=performance.now();
for(let i=0;i<iterations;i++){
 const [a,b]=pairs[i%pairs.length];
 assert.ok(shortestPathRust(connected,a,b));
}
const rustMs=performance.now()-now;
now=performance.now();
for(let i=0;i<iterations;i++){
 const [a,b]=pairs[i%pairs.length];
 assert.ok(Number.isFinite(referenceShortest(connected,a,b)));
}
const jsMs=performance.now()-now;
console.log(JSON.stringify({
 metric:'snowmobile-routing',
 indexedEndpointCount:endpoints.length,
 exactCandidatePairs:checks,
 naivePairwiseComparisons:naivePairs,
 comparisonReductionPercent:Math.round((1-checks/naivePairs)*10000)/100,
 spatialGraphBuildMs:Math.round(buildMs*100)/100,
 rustWasm48RoutesMs:Math.round(rustMs*100)/100,
 referenceJs48RoutesMs:Math.round(jsMs*100)/100,
 note:'Fixture timings depend on runner hardware and are not production speed guarantees.'
},null,2));
