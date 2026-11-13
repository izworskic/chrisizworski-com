#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const alaska=JSON.parse(load('public/kodiak-rocket-launch-viewing/places.json')).places;
const pmrf=JSON.parse(load('public/barking-sands-rocket-launch-viewing/atlas.json')).points;
assert.deepEqual(alaska.map(x=>x.id),['pasagshak','range']);
assert.deepEqual(pmrf.map(x=>x.id),['pmrf-range','polihale-park']);
const arg=process.argv.find(x=>x.startsWith('--wasm='));
const bin=arg?fs.readFileSync(arg.slice(7)):
 Buffer.from(load('public/assets/rocket-range-access.wasm.b64').trim(),'base64');
async function main(){
 assert.equal(bin.toString('hex',0,4),'0061736d','Module must be real WebAssembly');
 const e=(await WebAssembly.instantiate(bin,{})).instance.exports;
 for(const name of ['ra_version','ra_region_count','ra_place_count','ra_place_class',
   'ra_mode_state','ra_state_park_closure','ra_launch_viewing_authorized'])
   assert.equal(typeof e[name],'function','Missing Rust export '+name);
 assert.equal(e.ra_version(),1);
 assert.equal(e.ra_region_count(),2);
 assert.equal(e.ra_place_count(1),alaska.length);
 assert.equal(e.ra_place_count(2),pmrf.length);
 assert.deepEqual([0,1].map(i=>e.ra_place_class(1,i)),[1,2]);
 assert.deepEqual([0,1].map(i=>e.ra_place_class(2,i)),[2,3]);
 assert.equal(e.ra_place_class(1,3),0);
 assert.equal(e.ra_place_class(9,0),0);
 assert.equal(e.ra_mode_state(0,1),1);
 assert.equal(e.ra_mode_state(0,0),0);
 assert.equal(e.ra_mode_state(1,1),2);
 assert.equal(e.ra_mode_state(1,0),0);
 assert.equal(e.ra_mode_state(2,0),3);
 assert.equal(e.ra_mode_state(2,1),3);
 assert.equal(e.ra_mode_state(55,1),0);
 assert.equal(e.ra_state_park_closure(1),1);
 assert.equal(e.ra_state_park_closure(0),0);
 for(const region of [0,1,2,99])assert.equal(e.ra_launch_viewing_authorized(region),0);
 const asset='public/assets/rocket-range-access.wasm.b64';
 if(arg&&fs.existsSync(path.join(root,asset)))
   assert.deepEqual(bin,Buffer.from(load(asset).trim(),'base64'),'Pinned Rust rebuild changed binary');
 console.log('PASS: real Rust access engine, Kodiak and PMRF manifest parity, archive/unknown safeguards, zero launch permission · '+bin.length+' bytes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
