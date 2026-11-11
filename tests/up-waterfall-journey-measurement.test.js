'use strict';
// B85: analytics is observational, bounded and never a route or publication source.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const modulePath='../public/assets/up-waterfall-journey-metrics.js';
const m=require(modulePath),cluster=require('../public/assets/up-waterfall-cluster-discovery.js');
const hub=fs.readFileSync(path.join(root,'public/upper-peninsula-waterfalls/index.html'),'utf8');
const measurement=fs.readFileSync(path.join(root,'public/assets/up-waterfall-journey-metrics.js'),'utf8');
const guides=cluster.CLUSTERS.flatMap(x=>x.ids);
test('four current source-gated clusters and 15 existing guides match analytics allowlist exactly',()=>{
 assert.deepEqual(Object.keys(m.GROUPS).sort(),['black_river','keweenaw','munising','presque_isle']);
 assert.equal(guides.length,15);
 assert.deepEqual([...new Set(guides)].sort(),[...new Set(Object.values(m.GROUPS).flat())].sort());
 assert.equal(Object.keys(m.PRESETS).length,8);
 assert.equal(m.VERSION,'1');
 const ids=JSON.parse(fs.readFileSync(path.join(root,'data/up-waterfalls.json'),'utf8')).waterfalls;
 const source=new Map(ids.map(x=>[x.id,x]));
 for(const id of guides){
  assert.equal(source.get(id)?.verification?.parking?.verified,true,id);
  const html=fs.readFileSync(path.join(root,'public/upper-peninsula-waterfalls',id,'index.html'),'utf8');
  assert.equal((html.match(/up-waterfall-journey-metrics\.js/g)||[]).length,1,id);
  assert.ok(html.includes('href="/upper-peninsula-waterfalls/#'),id);
  assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/upper-peninsula-waterfalls/'+id+'/"'),id);
 }
 assert.equal((hub.match(/up-waterfall-journey-metrics\.js/g)||[]).length,1);
 assert.ok(hub.indexOf('/assets/up-waterfall-cluster-discovery.js')<hub.indexOf('/assets/up-waterfall-journey-metrics.js'));
});
test('regional and guide navigation can only emit fixed known identifiers',()=>{
 assert.equal(m.classifyLink('regional','#munising-day'),'munising');
 assert.equal(m.classifyLink('regional','/upper-peninsula-waterfalls/#keweenaw-waterfall-day'),'keweenaw');
 assert.equal(m.classifyLink('regional','/upper-peninsula-waterfalls/#black-river-waterfall-day'),'black_river');
 assert.equal(m.classifyLink('regional','#unknown-region'),null);
 assert.equal(m.classifyLink('regional','/some-other-site/#keweenaw-waterfall-day'),null);
 assert.equal(m.classifyLink('guide','/upper-peninsula-waterfalls/eagle-river-falls/'),'keweenaw');
 assert.equal(m.classifyLink('guide','/upper-peninsula-waterfalls/sandstone-falls/'),'black_river');
 assert.equal(m.classifyLink('guide','/upper-peninsula-waterfalls/unreviewed-falls/'),null);
 assert.equal(m.classifyLink('guide','https://example.com/upper-peninsula-waterfalls/eagle-river-falls/'),null);
 assert.equal(m.classifyLink('focus','/upper-peninsula-waterfalls/?focus=manido-falls#falls-map'),'presque_isle');
 assert.equal(m.classifyLink('focus','/upper-peninsula-waterfalls/?focus=../manido-falls#falls-map'),null);
 assert.equal(m.classifyLink('focus','/upper-peninsula-waterfalls/?focus=manido-falls#munising-day'),null);
});
test('GA4 receives only bounded event names/properties and correct plan outcome',()=>{
 const captured=[],original=global.window;
 global.window={gtag:(...args)=>captured.push(args)};
 try {
  assert.equal(m.plan('shoreline','added',3),true);
  assert.equal(m.plan('circuit','blocked',4),true);
  assert.equal(m.plan('keweenaw-parks','already_saved',5),true);
  assert.equal(m.plan('black-river-corridor','added',3),true);
  assert.equal(m.mapFocus('nawadaha-falls',true),true);
  assert.equal(m.mapFocus('sandstone-falls',false),true);
  assert.equal(m.plan('not-real','added',3),false);
  assert.equal(m.plan('circuit','not-confirmed',2),false);
  assert.equal(m.mapFocus('nonexistent',true),false);
  assert.equal(captured.length,6);
  assert.deepEqual(captured.map(x=>x[1]),[
   'waterfall_plan_apply','waterfall_plan_apply','waterfall_plan_apply',
   'waterfall_plan_apply','waterfall_map_focus','waterfall_map_focus']);
  assert.deepEqual(captured[0][2],{wf_region:'munising',wf_version:'1',wf_variant:'shoreline',wf_outcome:'added',wf_stops_added:3,transport_type:'beacon'});
  assert.equal(captured[1][2].wf_stops_added,0,'blocked does not add stops');
  assert.equal(captured[2][2].wf_stops_added,0,'already saved does not add stops');
  assert.equal(captured[3][2].wf_region,'black_river');
  assert.equal(captured[4][2].wf_outcome,'selected');
  assert.equal(captured[5][2].wf_outcome,'unavailable');
  for(const [,name,properties] of captured){
   assert.match(name,/^waterfall_(?:plan_apply|map_focus)$/);
   for(const key of Object.keys(properties))
     assert.ok(['wf_region','wf_version','wf_variant','wf_outcome','wf_stops_added','wf_surface','transport_type'].includes(key),key);
  }
 } finally {if(original===undefined)delete global.window;else global.window=original}
});
test('measurement gracefully no-ops if Analytics is absent or blocked; no new tracking surface',()=>{
 const original=global.window;
 try {
  global.window={};assert.equal(m.plan('forest','added',3),false);
  global.window={gtag:()=>{throw Error('blocked')}};assert.equal(m.plan('forest','added',3),false);
  global.window={gtag:()=>{throw Error('blocked')}};assert.equal(m.mapFocus('wagner-falls',true),false);
 }finally{if(original===undefined)delete global.window;else global.window=original}
 assert.doesNotMatch(measurement,/localStorage|sessionStorage|navigator\.sendBeacon|\bfetch\s*\(|XMLHttpRequest|document\.cookie|geolocation|referrer/);
 assert.doesNotMatch(measurement,/user_id|visitor_id|full_url|postal_code|latitude|longitude/);
 assert.ok(measurement.includes('typeof window.gtag'));
 const ga4=fs.readFileSync(path.join(root,'scripts/inject-ga4.mjs'),'utf8');
 assert.ok(ga4.includes("const MEASUREMENT_ID = "));
 assert.ok(ga4.includes('GA4_TAG'));
});
test('all four existing source-gated plans report result without weakening eligibility',()=>{
 for(const filename of ['up-waterfalls-munising-day.js','up-waterfalls-presque-isle-outing.js','up-waterfalls-regional-clusters.js']){
  const content=fs.readFileSync(path.join(root,'public/assets',filename),'utf8');
  assert.match(content,/UPWaterfallMetrics\?\.plan\([^)]*'blocked',0\)/,filename);
  assert.match(content,/UPWaterfallMetrics\?\.plan\([^)]*'already_saved'/,filename);
  assert.match(content,/arrivalVerified|arrivalVerified/,filename);
 }
 const focus=fs.readFileSync(path.join(root,'public/assets/up-waterfall-cluster-discovery.js'),'utf8');
 assert.match(focus,/UPWaterfallMetrics\?\.mapFocus\(focus,shown\)/);
});
