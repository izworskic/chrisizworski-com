'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const bin=Buffer.from(read('public/assets/rocket-range-access.wasm.b64').trim(),'base64');

test('shipped Kodiak and PMRF Rust wasm actually executes real access-scope and unknown-state classification',async()=>{
 assert.equal(bin.toString('hex',0,4),'0061736d');
 const e=(await WebAssembly.instantiate(bin,{})).instance.exports;
 assert.equal(e.ra_version(),1);
 const ak=JSON.parse(read('public/kodiak-rocket-launch-viewing/places.json')).places;
 const hi=JSON.parse(read('public/barking-sands-rocket-launch-viewing/atlas.json')).points;
 assert.deepEqual(ak.map(x=>x.id),['pasagshak','range']);
 assert.deepEqual(hi.map(x=>x.id),['pmrf-range','polihale-park']);
 assert.equal(e.ra_place_count(1),ak.length);
 assert.equal(e.ra_place_count(2),hi.length);
 assert.deepEqual(ak.map((_,i)=>e.ra_place_class(1,i)),[1,2]);
 assert.deepEqual(hi.map((_,i)=>e.ra_place_class(2,i)),[2,3]);
 for(const [mode,evidence,expected] of [
   [0,1,1],[0,0,0],[1,1,2],[1,0,0],[2,1,3],[2,0,3],[3,1,0],
 ]){
   assert.equal(e.ra_mode_state(mode,evidence),expected);
 }
 for(const region of [1,2])assert.equal(e.ra_launch_viewing_authorized(region),0);
 assert.equal(e.ra_state_park_closure(1),1);
 assert.equal(e.ra_state_park_closure(0),0);
});

test('both regional guides use the verified shared Rust adapter without changing official sources or static SEO',()=>{
 const adapter=read('public/assets/rocket-range-rust.js');
 assert.match(adapter,/WebAssembly\.instantiate\(bytes,\{\}\)/);
 assert.match(adapter,/ra_launch_viewing_authorized\(1\)!==0/);
 assert.match(adapter,/identifiers\.every\(\(id,i\)=>id===spec\.ids\[i\]\)/);
 const ak=read('public/kodiak-rocket-launch-viewing/index.html');
 const pmrf=read('public/barking-sands-rocket-launch-viewing/index.html');
 const akJs=read('public/kodiak-rocket-launch-viewing/app.js');
 const pmrfJs=read('public/barking-sands-rocket-launch-viewing/app.js');
 assert.match(ak,/id="k-rust-place-status"/);
 assert.match(pmrf,/id="pmrf-rust-access"/);
 for(const [html,slug] of [[ak,'kodiak-rocket-launch-viewing'],[pmrf,'barking-sands-rocket-launch-viewing']]){
   assert.match(html,/rocket-range-rust\.js\?v=20261113-range-v1/);
   assert.ok(html.indexOf('rocket-range-rust.js')<html.indexOf(slug+'/app.js'));
   assert.match(html,/rel="canonical"/);
   assert.match(html,/2026-11-13/);
 }
 assert.match(akJs,/RocketRangeRust\?\.load\('kodiak'/);
 assert.match(pmrfJs,/RocketRangeRust\?\.load\('pmrf'/);
 assert.match(akJs,/renderRustPlace\(id\)/);
 assert.match(pmrfJs,/state\.agencyEvidence=d\.evidence/);
 assert.match(pmrfJs,/state\.agencyEvidence=null/);
 assert.match(pmrfJs,/renderRustAccess\(\)/);
 assert.match(pmrfJs,/Coast Guard broadcast/);
 assert.match(akJs,/not an approved launch-viewing spot/);
 assert.match(pmrf,/No public launch-day spectator location has been independently verified/);
 for(const js of [akJs,pmrfJs])assert.doesNotThrow(()=>new Function(js));
});
