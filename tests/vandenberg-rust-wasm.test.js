'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const model=require('../lib/vandenberg-viewing');
const html=read('public/vandenberg-rocket-launch-viewing/index.html');
const client=read('public/vandenberg-rocket-launch-viewing/guide-map.js');
const b64=read('public/vandenberg-rocket-launch-viewing/viewpoint-engine.wasm.b64').trim();
const bytes=Buffer.from(b64,'base64');

test('Vandenberg ships real, small Rust WebAssembly, not an unused source-file promise',async()=>{
 assert.equal(bytes.toString('hex',0,4),'0061736d');
 assert.ok(bytes.length>100&&bytes.length<20000);
 const {instance}=await WebAssembly.instantiate(bytes,{});
 const e=instance.exports;
 assert.equal(e.vg_engine_version(),1);
 assert.equal(e.vg_site_count(),6);
 assert.equal(model.SITES.length,6);
 for(const name of ['vg_rank','vg_visible','vg_group','vg_caution'])
   assert.equal(typeof e[name],'function',name);
 for(let i=0;i<model.SITES.length;i++){
   const site=model.SITES[i];
   assert.equal(e.vg_group(i),['park-sunset','surf-hours'].includes(site.kind)?1:2);
   assert.equal(e.vg_visible(i,0),1);
   assert.equal(e.vg_visible(i,1),i<=1?1:0);
   assert.equal(e.vg_visible(i,2),i>1?1:0);
   for(const [goal,key] of ['family','photo','close'].entries())
     assert.equal(e.vg_rank(i,goal,0),site.affinities[key]*10-i,
       'The Rust comparison uses published venue affinities, not another place database');
 }
 assert.ok(e.vg_rank(0,2,0)>e.vg_rank(2,2,0),'Closer-to-coast goal');
 assert.ok(e.vg_rank(0,2,1)<e.vg_rank(2,2,1),'Manual fog concern changes coast comparison');
 assert.equal(e.vg_visible(6,0),0,'Unknown place cannot be shown');
 assert.equal(e.vg_rank(6,0,0),-1,'Unknown place cannot be recommended');
 assert.equal(e.vg_caution(0),1);
 assert.equal(e.vg_caution(1),2);
 assert.equal(e.vg_caution(2),3);
 assert.equal(e.vg_caution(5),4);
});

test('Rust preferences are actually wired to the on-page map and candidate choice',()=>{
 assert.match(html,/id="vg-rust-choices" class="vg-rust-choices" hidden/);
 for(const id of [0,1,2])assert.match(html,new RegExp('data-rust-priority="'+id+'"'));
 assert.match(html,/id="vg-rust-marine" type="checkbox"/);
 assert.match(html,/id="vg-rust-choice-link"/);
 assert.match(html,/guide-map\.js\?v=20261113-rust-v2/);
 assert.match(html,/styles\.css\?v=20261113-rust-v1/);
 assert.match(client,/WebAssembly\.instantiate\(bytes,\{\}\)/);
 assert.match(client,/viewpoint-engine\.wasm\.b64/);
 assert.match(client,/state\.rust\.vg_rank/);
 assert.match(client,/state\.rust\.vg_visible/);
 assert.match(client,/state\.rust\.vg_caution/);
 assert.match(client,/panel\.dataset\.engine='rust-wasm'/);
 assert.match(client,/root\.dataset\.rust='ready'/);
 assert.doesNotThrow(()=>new Function(client));
});

test('Rust is progressive enhancement: no invented public gate, weather or navigation',()=>{
 assert.match(client,/root\.dataset\.rust='unavailable'/);
 assert.match(client,/const ordered=state\.rust\?/);
 assert.match(html,/The interactive map requires JavaScript/);
 assert.match(html,/This is not a live opening report/);
 assert.match(html,/Surf Beach may close for launches/);
 assert.match(client,/land manager/);
 assert.doesNotMatch(client,/navigator\.geolocation|localStorage|sessionStorage|launchTrajectory|routeToPad/);
});
