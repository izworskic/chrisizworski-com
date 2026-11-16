import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { buildTrailGraph, nearestNode, planRoute } from '../lib/snowmobile/routing.mjs';
import { findLoops, loopWalksJs, indexGraph, validateWalk, MAX_LOOPS } from '../lib/snowmobile/loops.mjs';
import { loopWalksRust } from '../lib/snowmobile/rust-route.mjs';
const require = createRequire(import.meta.url);
const routeApi = require('../api/snowmobile-route.js');
const ui = require('../public/assets/snowmobile-loop-finder.js');

// A small real-coordinate network near Gaylord. S is the start.
// Square S-A-B-C-S, a spur B-D, and a far triangle D-E-F-D.
const S=[-84.70,45.00],A=[-84.60,45.00],B=[-84.60,45.07],C=[-84.70,45.07],D=[-84.50,45.07],E=[-84.40,45.07],F=[-84.45,45.14];
const make=(id,coords,properties={})=>({type:'Feature',properties:{id,trailNetwork:id,band:'GOOD',score:80,...properties},geometry:{type:'LineString',coordinates:coords}});
const geo=features=>({type:'FeatureCollection',features});
const network=(overrides={})=>geo([
  make('sa',[S,A],overrides.sa),make('ab',[A,B],overrides.ab),make('bc',[B,C],overrides.bc),make('cs',[C,S],overrides.cs),
  make('bd',[B,D]),make('de',[D,E]),make('ef',[E,F]),make('fd',[F,D])
]);
const at=p=>({lat:p[1],lon:p[0]});

test('finds the square as a true loop from its corner and returns to the start',()=>{
  const fc=network();
  const result=findLoops(fc,{...at(S),targetMiles:20});
  assert.equal(result.routable,true);
  const best=result.options[0];
  assert.equal(best.kind,'LOOP');
  assert.equal(best.repeatedMiles,0);
  assert.deepEqual([...best.segmentIds].sort(),['ab','bc','cs','sa']);
  const coords=best.geometry.coordinates;
  assert.deepEqual(coords[0],coords[coords.length-1],'loop geometry must end where it starts');
  const sides=['sa','ab','bc','cs'].reduce((n,id)=>n+best.segments.find(s=>s.segmentId===id).miles,0);
  assert.ok(Math.abs(best.distanceMiles-sides)<0.01,'distance is the measured sum of the official parts');
  assert.equal(best.offTargetMiles,Math.round((best.distanceMiles-20)*100)/100);
  assert.equal(best.stopCount,3);
});

test('a longer target rides past the square and counts the trail it repeats',()=>{
  const result=findLoops(network(),{...at(S),targetMiles:45});
  assert.equal(result.routable,true);
  const beyond=result.options.find(o=>o.kind!=='OUT_AND_BACK'&&o.segmentIds.includes('bd'));
  assert.ok(beyond,'a ride beyond the square should be offered near 45 miles');
  assert.equal(beyond.kind,'LOLLIPOP');
  assert.ok(beyond.repeatedMiles>0,'the spur is ridden twice and must be counted');
  assert.ok(beyond.repeatedMiles<=0.3*beyond.distanceMiles+0.01,'a ride that mostly repeats itself is not called a loop');
  const total=beyond.segments.reduce((n,s)=>n+s.miles,0);
  assert.ok(Math.abs(total-beyond.distanceMiles)<0.01,'repeated parts count every time they are ridden');
});

test('always offers an honest out-and-back and labels it',()=>{
  const result=findLoops(network(),{...at(S),targetMiles:20});
  const outAndBack=result.options.at(-1);
  assert.equal(outAndBack.kind,'OUT_AND_BACK');
  assert.ok(Math.abs(outAndBack.repeatedMiles*2-outAndBack.distanceMiles)<0.02);
});

test('a tree-shaped network offers only an out-and-back and explains why',()=>{
  const fc=geo([make('one',[S,A]),make('two',[A,B]),make('three',[B,D])]);
  const result=findLoops(fc,{...at(S),targetMiles:12});
  assert.equal(result.routable,true);
  assert.equal(result.loopsFound,0);
  assert.equal(result.options.length,1);
  assert.equal(result.options[0].kind,'OUT_AND_BACK');
  assert.match(result.note,/No loop was found/);
});

test('never rides a closed segment, in season or off season, in either engine',()=>{
  for(const closed of [{band:'CLOSED'},{band:'OFF_SEASON',legalState:'CLOSED'},{officialStatus:'Closed for season'}]){
    const fc=network({bc:closed});
    for(const engine of ['auto','js']){
      const result=findLoops(fc,{...at(S),targetMiles:20,engine});
      assert.equal(result.routable,true);
      for(const option of result.options)assert.ok(!option.segmentIds.includes('bc'),`closed segment used (${engine})`);
      assert.equal(result.loopsFound,0,'closing one side of the only square leaves no loop near 20 miles');
      assert.equal(result.closedSegmentsExcludedFromRegion,1);
    }
  }
});

test('rejects bad input without guessing',()=>{
  const fc=network();
  assert.equal(findLoops(fc,{lat:45,lon:-84.7,targetMiles:2}).routable,false);
  assert.equal(findLoops(fc,{lat:45,lon:-84.7,targetMiles:900}).routable,false);
  assert.equal(findLoops(fc,{lat:NaN,lon:-84.7,targetMiles:60}).routable,false);
  assert.match(findLoops(fc,{lat:46.5,lon:-87,targetMiles:60}).reason,/nearest mapped trail junction/);
  assert.equal(findLoops(geo([]),{...at(S),targetMiles:60}).routable,false);
  const lone=findLoops(geo([make('island',[S,A],{band:'CLOSED'}),make('far',[E,F])]),{...at(E),targetMiles:60});
  assert.equal(lone.routable,true,'an isolated open piece still yields its out-and-back');
});

test('Rust/WASM and JavaScript searches return identical walks on real-shaped and random graphs',()=>{
  const graph=buildTrailGraph(network());
  const {edges,index}=indexGraph(graph);
  const start=index.get(nearestNode(graph,S[1],S[0]).nodeKey);
  for(const target of [8,20,33,45,80]){
    const rust=loopWalksRust(graph.nodes.size,edges,start,target,MAX_LOOPS);
    assert.ok(rust,'compiled loop engine must be present and ABI-valid');
    assert.deepEqual(rust,loopWalksJs(graph.nodes.size,edges,start,target,MAX_LOOPS));
  }
  let seed=20261115;
  const rnd=()=>{seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};
  for(let t=0;t<150;t++){
    const n=2+Math.floor(rnd()*50),random=[];
    for(let i=0;i<Math.floor(rnd()*n*1.6);i++)random.push({a:Math.floor(rnd()*n),b:Math.floor(rnd()*n),w:Math.round(rnd()*2000)/100});
    const s=Math.floor(rnd()*n),target=5+rnd()*150;
    assert.deepEqual(loopWalksRust(n,random,s,target,MAX_LOOPS),loopWalksJs(n,random,s,target,MAX_LOOPS),`graph ${t}`);
  }
});

test('every proposed walk is re-proved against the graph before it is described',()=>{
  const graph=buildTrailGraph(network());
  const start=nearestNode(graph,S[1],S[0]).nodeKey;
  const edgeIndex=id=>graph.edges.findIndex(e=>e.props.id===id);
  const R=0x80000000;
  const codeFrom=(id,fromKey)=>graph.edges[edgeIndex(id)].fromKey===fromKey?edgeIndex(id):(edgeIndex(id)|R)>>>0;
  const good=[];let here=start;
  for(const id of ['sa','ab','bc','cs']){const code=codeFrom(id,here);good.push(code);const e=graph.edges[code&0x7fffffff];here=(code&R)?e.fromKey:e.toKey;}
  assert.equal(validateWalk(graph,start,good).length,4);
  assert.equal(validateWalk(graph,start,good.slice(0,3)),null,'a walk that does not come home is rejected');
  assert.equal(validateWalk(graph,start,[good[1],good[0]]),null,'a walk that jumps between junctions is rejected');
  assert.equal(validateWalk(graph,start,[99999]),null,'an unknown edge is rejected');
  assert.equal(validateWalk(graph,start,[]),null);
  graph.edges[edgeIndex('bc')].props.legalState='CLOSED';
  assert.equal(validateWalk(graph,start,good),null,'a walk over a closed part is rejected even if an engine proposed it');
});

test('point-to-point routing is unchanged by the shared path helper',()=>{
  const route=planRoute(network(),{fromLat:S[1],fromLon:S[0],toLat:B[1],toLon:B[0]});
  assert.equal(route.routable,true);
  assert.equal(route.segmentsTraversed,2);
  assert.equal(route.geometry.coordinates.length,3);
});

function mockRes(){const r={headers:{}};r.status=s=>{r._status=s;return r;};r.setHeader=(k,v)=>{r.headers[k]=v;};r.json=p=>{r._json=p;};return r;}
test('route API validates loop requests before doing any work and keeps X-Robots-Tag',async()=>{
  for(const query of [{region:'grayling-gaylord',loop:'Gaylord',miles:'60'},{region:'grayling-gaylord',loop:'45.0,-84.7'},{region:'grayling-gaylord',loop:'45.0,-84.7',miles:'4'},{region:'grayling-gaylord',loop:'45.0,-84.7',miles:'301'},{region:'grayling-gaylord',loop:'45.0,-84.7',miles:'60abc'},{region:'grayling-gaylord',loop:'45.0,-84.7',miles:'1e2'}]){
    const res=mockRes();
    await routeApi({method:'GET',query},res);
    assert.equal(res._status,400,JSON.stringify(query));
    assert.equal(res.headers['X-Robots-Tag'],'noindex, nofollow');
    assert.equal(res.headers['Cache-Control'],'no-store');
  }
  const res=mockRes();
  await routeApi({method:'GET',query:{loop:'45.0,-84.7',miles:'60'}},res);
  assert.match(res._json.error,/region/i);
});

test('browser helpers show only verifiable closed rides and word them plainly',()=>{
  assert.equal(ui.parseMiles('60'),60);
  for(const bad of ['4','301','60.5','sixty','',' ',null,'1e2'])assert.equal(ui.parseMiles(bad),null,String(bad));
  assert.equal(ui.requestUrl('grayling-gaylord',{lat:45.027512,lon:-84.674801},60),'/api/snowmobile-route?region=grayling-gaylord&loop=45.02751%2C-84.67480&miles=60');
  const result=findLoops(network(),{...at(S),targetMiles:20});
  const payload={loops:JSON.parse(JSON.stringify(result))};
  const checked=ui.validateResponse(payload);
  assert.equal(checked.ok,true);
  assert.equal(checked.options.length,result.options.length);
  const summary=ui.optionSummary(checked.options[0],20);
  assert.match(summary.title,/^Loop · \d+\.\d mi$/);
  assert.equal(summary.repeat,'No trail ridden twice');
  assert.match(summary.time,/assumed 30 mph/);
  assert.equal(ui.optionSummary(checked.options.at(-1),20).repeat,'Same trail out and back');
  const stops=ui.exportStops(checked.options[0],{lat:S[1],lon:S[0],label:'LP 7'},'LP 79');
  assert.equal(stops.length,3);
  assert.deepEqual([stops[0].lat,stops[0].lng],[stops[2].lat,stops[2].lng]);
  // Fail closed: one bad option hides everything.
  const broken=JSON.parse(JSON.stringify(payload));
  broken.loops.options[0].segments[0].band='CLOSED';
  assert.equal(ui.validateResponse(broken).ok,false);
  const open=JSON.parse(JSON.stringify(payload));
  open.loops.options[0].geometry.coordinates.pop();
  assert.equal(ui.validateResponse(open).ok,false,'a line that does not return to the start is not a loop');
  const outside=JSON.parse(JSON.stringify(payload));
  outside.loops.options[0].geometry.coordinates[1]=[-70,45];
  assert.equal(ui.validateResponse(outside).ok,false);
  assert.equal(ui.validateResponse({loops:{routable:false,reason:'No open, mapped trail leaves this junction.'}}).reason,'No open, mapped trail leaves this junction.');
  assert.equal(ui.validateResponse(null).ok,false);
});

test('loop options export through the existing GPX validator with start, halfway and finish',()=>{
  const exporter=require('../public/assets/snowmobile-route-export.js');
  const option=findLoops(network(),{...at(S),targetMiles:20}).options[0];
  const stops=ui.exportStops(option,{lat:S[1],lon:S[0],label:'LP 7'},null);
  assert.equal(exporter.validate(option,stops).ok,true);
  const gpx=exporter.createGpx({route:option,stops,region:'grayling-gaylord',generatedAt:'2026-11-15T20:00:00Z'});
  assert.equal(gpx.stopCount,3);
  assert.match(gpx.xml,/Loop start: LP 7/);
});

test('region pages ship the loop panel, its script before the page script, and no em dash in new code',()=>{
  for(const file of fs.readdirSync('public/snowmobile/regions').filter(f=>f.endsWith('.html'))){
    const html=fs.readFileSync('public/snowmobile/regions/'+file,'utf8');
    for(const needle of ['id="loopFinder"','id="loopStartSearch"','id="loopMiles"','id="findLoops"','id="loopOptions"','role="radiogroup"','<noscript>'])assert.ok(html.includes(needle),`${file} missing ${needle}`);
    assert.ok(html.indexOf('/assets/snowmobile-loop-finder.js')<html.indexOf('/assets/snowmobile-region.js?v='),`${file}: loop script must load first`);
    assert.ok(html.indexOf('id="loopFinder"')<html.indexOf('id="map"'),`${file}: loop controls sit above the map they draw on`);
  }
  for(const file of ['public/assets/snowmobile-loop-finder.js','lib/snowmobile/loops.mjs','tests/snowmobile-loops.test.js'])assert.ok(!fs.readFileSync(file,'utf8').includes(String.fromCharCode(0x2014)),`${file} contains an em dash`);
  const region=fs.readFileSync('public/assets/snowmobile-region.js','utf8');
  assert.ok(region.includes('LOOPS?.planCleared()')&&region.includes('showPlan:showLoopPlan'));
});
