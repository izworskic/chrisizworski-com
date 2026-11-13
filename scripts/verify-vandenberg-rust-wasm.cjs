#!/usr/bin/env node
'use strict';
// Verifies an actual Rust-compiled WebAssembly binary, never a JS mock.
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {SITES}=require('../lib/vandenberg-viewing');
const root=path.resolve(__dirname,'..');
const binaryFlag=process.argv.find(x=>x.startsWith('--wasm='));
const compiled=binaryFlag?fs.readFileSync(binaryFlag.slice(7)):null;
const asset=path.join(root,'public/vandenberg-rocket-launch-viewing/viewpoint-engine.wasm.b64');
const binary=compiled||Buffer.from(fs.readFileSync(asset,'utf8').trim(),'base64');
const assertWasm=async()=>{
 assert.equal(binary.toString('hex',0,4),'0061736d','Not real WebAssembly bytes');
 const {instance}=await WebAssembly.instantiate(binary,{});
 const engine=instance.exports;
 for(const name of ['vg_engine_version','vg_site_count','vg_group','vg_visible','vg_caution','vg_rank']){
   assert.equal(typeof engine[name],'function',name+' is a missing Rust export');
 }
 assert.equal(engine.vg_engine_version(),1);
 assert.equal(engine.vg_site_count(),SITES.length);
 assert.deepEqual(SITES.map((site,i)=>engine.vg_group(i)),
   SITES.map(s=>['park-sunset','surf-hours'].includes(s.kind)?1:2));
 const caution=[1,2,3,4,4,4];
 assert.deepEqual(SITES.map((_,i)=>engine.vg_caution(i)),caution);
 const keys=['family','photo','close'];
 for(let goal=0;goal<3;goal++){
   const ranks=SITES.map((s,i)=>engine.vg_rank(i,goal,0));
   assert.equal(new Set(ranks).size,6,'Ranking must be deterministic with stable tie breaks');
   for(let i=0;i<SITES.length;i++){
     assert.equal(ranks[i],SITES[i].affinities[keys[goal]]*10-i,
       'The Rust scoring input must match the authoritative JS venue affinities');
   }
 }
 assert.equal(engine.vg_rank(0,2,0)>engine.vg_rank(2,2,0),true,'Coastal preference');
 assert.equal(engine.vg_rank(0,2,1)<engine.vg_rank(2,2,1),true,'Coastal fog concern should change ranking');
 assert.equal(engine.vg_visible(1,1),1);
 assert.equal(engine.vg_visible(2,1),0);
 assert.equal(engine.vg_visible(2,2),1);
 assert.equal(engine.vg_visible(99,0),0);
 assert.equal(engine.vg_rank(99,0,0),-1);
 assert.equal(engine.vg_rank(0,99,0),-1);
 if(compiled&&fs.existsSync(asset)){
   assert.equal(Buffer.compare(compiled,Buffer.from(fs.readFileSync(asset,'utf8').trim(),'base64')),0,
     'Committed WebAssembly does not match Rust source + pinned toolchain; rebuild and commit');
 }
 console.log('PASS: real Vandenberg Rust WebAssembly · six venue source parity · filtering, priority, fog and unknown-input guards · '+binary.length+' bytes');
};
assertWasm().catch(err=>{console.error(err);process.exitCode=1;});
