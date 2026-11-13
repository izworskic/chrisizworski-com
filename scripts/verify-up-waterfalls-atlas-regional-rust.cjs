#!/usr/bin/env node
'use strict';
/* Verify actual compiled Rust WASM against all 640 published source records,
 * known GIS replacement behavior and four existing regional day presets.
 * This is NOT a route authorization, visitor opening or coordinate generator.
 */
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const arg=process.argv.find(x=>x.startsWith('--wasm='));
const pinned='public/assets/up-waterfalls-atlas-regional.wasm.b64';
const bin=arg?fs.readFileSync(arg.slice(7)):Buffer.from(read(pinned).trim(),'base64');
const atlas=JSON.parse(read('public/assets/up-waterfall-evidence-atlas.json'));
const curated=JSON.parse(read('data/up-waterfalls.json')).waterfalls;
const K={guide:1,gis:2,name:3,tourism:4};
const ROLE={
 'natural-waterfall-feature-not-arrival':1,
 'state-natural-feature-point-not-parking-or-trailhead':2,
 'multi-falls-day-use-reference-not-natural-waterfall-feature':3,
 'no-geographic-point':4,
 'tourism-index-no-geographic-point-or-arrival':4
};
const coordinates=r=>r.lat===null&&r.lng===null?0:Number.isFinite(r.lat)&&Number.isFinite(r.lng)?1:2;
const referenceSafe=r=>{
 const role=ROLE[r.mapRole],coord=coordinates(r);
 return (!r.priorityAccess||r.kind==='tourism')&&(
   r.kind==='guide'&&((role===1&&coord===1)||(role===3&&coord===0))||
   r.kind==='gis'&&role===2&&coord===1||
   ['name','tourism'].includes(r.kind)&&role===4&&coord===0
 );
};
const referencePlot=(r,shadow,guideOnly)=>referenceSafe(r)&&
  (r.kind==='gis'||r.kind==='guide'&&ROLE[r.mapRole]===1&&(guideOnly||!shadow));
(async()=>{
 assert.equal(bin.toString('hex',0,4),'0061736d','asset is not real WebAssembly');
 const e=(await WebAssembly.instantiate(bin,{})).instance.exports;
 assert.equal(e.wa_version(),3);
 for(const key of ['wa_record_safe','wa_plot','wa_plan','wa_stop'])
   assert.equal(typeof e[key],'function',key+' missing from Rust');
 assert.equal(atlas.records.length,640);
 assert.equal(curated.length,80);
 const groups={};
 let comparisons=0,pins=0;
 const gisIds=new Set(atlas.records.filter(r=>r.kind==='gis').map(r=>r.gisObjectId));
 for(const r of atlas.records){
   groups[r.kind]=(groups[r.kind]||0)+1;
   const valid=e.wa_record_safe(K[r.kind],ROLE[r.mapRole],coordinates(r),r.priorityAccess?1:0)===1;
   assert.equal(valid,referenceSafe(r),'source integrity '+r.id);
   assert.equal(valid,true,'unsafe published source '+r.id);
   for(const shadow of [0,1])for(const guideOnly of [0,1]){
     assert.equal(e.wa_plot(K[r.kind],ROLE[r.mapRole],coordinates(r),shadow,guideOnly)===1,
       Boolean(referencePlot(r,shadow,guideOnly)),'map pin '+r.id);
     comparisons++;
   }
   const replaced=(r.linkedGisIds||[]).some(x=>gisIds.has(x))?1:0;
   pins+=e.wa_plot(K[r.kind],ROLE[r.mapRole],coordinates(r),replaced,0);
 }
 assert.deepEqual(groups,{guide:80,gis:161,name:291,tourism:108});
 assert.equal(atlas.records.filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)).length,240);
 assert.ok(pins>=161&&pins<=240,'natural-feature dot count must be bounded');
 const tahq=atlas.records.find(r=>r.id==='guide:tahquamenon');
 assert.equal(e.wa_plot(K[tahq.kind],ROLE[tahq.mapRole],coordinates(tahq),0,0),0);
 for(const id of [207,208]){
   const r=atlas.records.find(x=>x.id==='gis:'+id);
   assert.ok(r&&e.wa_plot(K[r.kind],ROLE[r.mapRole],coordinates(r),0,0)===1);
 }
 for(const r of atlas.records.filter(x=>x.priorityAccess)){
   assert.equal(r.kind,'tourism');
   assert.equal(e.wa_plot(K[r.kind],ROLE[r.mapRole],coordinates(r),0,0),0);
 }
 assert.equal(e.wa_plot(4,4,1,0,0),0);
 assert.equal(e.wa_plot(3,4,1,0,0),0);
 assert.equal(e.wa_stop(3,1,0,4),0);
 assert.equal(e.wa_stop(4,1,0,4),0);
 assert.equal(e.wa_stop(2,1,1,4),1);
 assert.equal(e.wa_stop(2,1,1,2),0);
 for(const [args,expected] of [
  [[1,1,0,0,2,1],1],
  [[2,1,0,0,3,1],3],
  [[4,2,1,0,4,1],4],
  [[4,2,5,3,4,1],5],
  [[4,2,5,0,4,0],6],
  [[4,2,5,0,4,1],1],
  [[4,0,0,0,4,1],2],
  [[99,2,5,0,4,1],0]
 ])assert.equal(e.wa_plan(...args),expected,'regional gate '+args);
 const script=read('public/assets/up-waterfalls-evidence-rust.js');
 const atlasJS=read('public/assets/up-waterfall-evidence-atlas.js');
 const regionJS=read('public/assets/up-waterfalls-regional-clusters.js');
 const atlasHtml=read('public/upper-peninsula-waterfalls/atlas/index.html');
 const hubHtml=read('public/upper-peninsula-waterfalls/index.html');
 for(const js of [script,atlasJS,regionJS])assert.doesNotThrow(()=>new Function(js));
 assert.match(script,/records.length!==640/);
 assert.match(script,/640/);
 assert.match(atlasJS,/native\.canPlot/);
 assert.match(regionJS,/native\.decide/);
 assert.match(regionJS,/legacyAssess/);
 assert.ok(atlasHtml.indexOf('up-waterfalls-evidence-rust.js')<atlasHtml.indexOf('up-waterfall-evidence-atlas.js'));
 assert.ok(hubHtml.indexOf('up-waterfalls-evidence-rust.js')<hubHtml.indexOf('up-waterfalls-regional-clusters.js'));
 assert.match(atlasHtml,/name="robots" content="noindex,follow"/);
 assert.ok(!read('public/sitemap-up-waterfalls.xml').includes('upper-peninsula-waterfalls/atlas/'));
 if(arg)assert.deepEqual(bin,Buffer.from(read(pinned).trim(),'base64'),
   'Rust binary differs from pinned 1.90.0 toolchain output');
 console.log('PASS: Rust WebAssembly v3, '+comparisons+' map parity decisions across 640 sources, '+pins+
   ' eligible natural-feature dots before visible filters, 4 region gate and winter/closure safety cases · '+bin.length+' bytes');
})().catch(e=>{console.error(e);process.exitCode=1;});
