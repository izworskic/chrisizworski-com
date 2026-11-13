#!/usr/bin/env node
'use strict';
/* Compile-time / runtime parity checks for shared Wallops & Starbase Rust
 * WebAssembly. No live weather, launch or land access claims.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const load=p=>fs.readFileSync(path.join(root,p),'utf8');
const wallops=JSON.parse(load('public/wallops-rocket-launch-viewing/places.json')).sites;
const starbase=JSON.parse(load('public/starbase-rocket-launch-viewing/places.json')).sites;
assert.deepEqual(wallops.map(x=>x.id),['nasa-visitor','reed','harbor']);
assert.deepEqual(starbase.map(x=>x.id),['isla-blanca','zapata','lighthouse']);
const canonicalOrder=[
  [1,0,[0,1,2]], [1,1,[1,2,0]], [1,2,[0,1,2]], [1,3,[2,1,0]],
  [2,0,[0,1,2]], [2,1,[1,2,0]], [2,2,[2,1,0]]
];
async function main(){
  const flag=process.argv.find(x=>x.startsWith('--wasm='));
  const output='public/assets/rocket-rust-viewing-network.wasm.b64';
  const pathToArtifact=path.join(root,output);
  if(!flag&&!fs.existsSync(pathToArtifact))throw Error('Committed Rust WebAssembly asset missing: '+output);
  const binary=flag?fs.readFileSync(flag.slice('--wasm='.length)):
   Buffer.from(load(output).trim(),'base64');
  assert.equal(binary.toString('hex',0,4),'0061736d','Not WebAssembly');
  const {instance}=await WebAssembly.instantiate(binary,{});
  const e=instance.exports;
  for(const name of ['rv_engine_version','rv_region_count','rv_site_count','rv_profile_count','rv_rank','rv_access_verified'])
    assert.equal(typeof e[name],'function','Missing '+name);
  assert.equal(e.rv_engine_version(),1);
  assert.equal(e.rv_region_count(),2);
  assert.equal(e.rv_site_count(1),wallops.length);
  assert.equal(e.rv_site_count(2),starbase.length);
  assert.equal(e.rv_profile_count(1),4);
  assert.equal(e.rv_profile_count(2),3);
  for(const [region,profile,order] of canonicalOrder){
    const scores=order.map(i=>e.rv_rank(region,profile,i));
    assert.deepEqual(scores,[30,20,10]);
  }
  for(const [region,sites] of [[1,wallops],[2,starbase]]){
    for(let i=0;i<sites.length;i++)assert.equal(e.rv_access_verified(region,i),0);
  }
  for(const args of [[3,0,0],[1,8,0],[2,0,3],[2,4294967295,0]])
    assert.equal(e.rv_rank(...args),-1,'Invalid region, priority or site cannot rank');
  if(flag&&fs.existsSync(pathToArtifact))
    assert.deepEqual(binary,Buffer.from(load(output).trim(),'base64'),
      'Shipped binary is not reproducible from pinned Rust source');
  console.log('PASS: shared real Rust WebAssembly; 7 preference paths / 6 places / 0 invented access approvals; '+binary.length+' bytes');
}
main().catch(e=>{console.error(e);process.exitCode=1});
