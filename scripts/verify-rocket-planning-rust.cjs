#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const asset=path.join(root,'public/assets/rocket-planning-core.wasm.b64');
const compiled=process.argv.find(x=>x.startsWith('--wasm='));
const binary=compiled?fs.readFileSync(compiled.slice(7)):
  Buffer.from(fs.readFileSync(asset,'utf8').trim(),'base64');
async function main(){
  assert.equal(binary.toString('hex',0,4),'0061736d');
  const e=(await WebAssembly.instantiate(binary,{})).instance.exports;
  for(const name of ['rp_engine_version','rp_time_precise','rp_national_window',
    'rp_florida_cutoff_state','rp_access_verified'])
    assert.equal(typeof e[name],'function','Missing Rust export: '+name);
  assert.equal(e.rp_engine_version(),1);
  assert.equal(e.rp_access_verified(),0);
  for(const [p,near,expected] of [
    [1,-60000,1],[1,-60001,0],[2,864000000,1],[3,864000001,0],[4,0,1],
    [5,0,0],[0,0,0]
  ])assert.equal(e.rp_national_window(1,p,near),expected);
  for(const [a,b,c,delta,expected] of [
    [1,1,1,3600001,1],[1,1,1,3600000,2],[2,1,1,0,2],
    [2,1,1,-1,3],[1,0,1,1000,0],[1,1,0,1000,0],[3,1,1,1000,0]
  ])assert.equal(e.rp_florida_cutoff_state(a,b,c,delta),expected);
  if(compiled&&fs.existsSync(asset))
    assert.deepEqual(binary,Buffer.from(fs.readFileSync(asset,'utf8').trim(),'base64'),
      'Committed WASM differs from pinned Rust build');
  console.log('PASS: Rust national-window and Florida cutoff classification, unknown guards, real compiled module '+binary.length+' bytes');
}
main().catch(err=>{console.error(err);process.exitCode=1});
