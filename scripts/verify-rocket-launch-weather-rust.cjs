#!/usr/bin/env node
'use strict';
// Verifies the shipped launch-day sky trend WASM: exports, the 20-point
// threshold, "missing is never clear", and (with --wasm=) that the committed
// binary is byte-identical to a fresh pinned rustc 1.90.0 build.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const asset=path.join(root,'public/assets/rocket-launch-weather.wasm.b64');
const compiled=process.argv.find(x=>x.startsWith('--wasm='));
const binary=compiled?fs.readFileSync(compiled.slice(7)):
  Buffer.from(fs.readFileSync(asset,'utf8').trim(),'base64');
async function main(){
  assert.equal(binary.toString('hex',0,4),'0061736d');
  const e=(await WebAssembly.instantiate(binary,{})).instance.exports;
  for(const name of ['lw_engine_version','lw_meaningful_points','lw_spot_trend',
    'lw_window_trend','lw_slip_verdict','lw_first_window'])
    assert.equal(typeof e[name],'function','Missing Rust export: '+name);
  assert.equal(e.lw_engine_version(),1);
  assert.equal(e.lw_meaningful_points(),20);
  for(const [a,b,ha,hb,expected] of [
    [12,31,0,0,3],[12,32,0,0,2],[32,12,0,0,1],[255,12,0,0,0],[12,255,0,0,0],
    [12,12,0,1,2],[60,50,1,0,1],[40,60,1,0,2],[12,12,2,0,0]
  ])assert.equal(e.lw_spot_trend(a,b,ha,hb),expected,[a,b,ha,hb].join(','));
  assert.equal(e.lw_window_trend(2,2),2);
  assert.equal(e.lw_window_trend(2,3),4);
  assert.equal(e.lw_window_trend(0,3),0);
  assert.equal(e.lw_slip_verdict(3,2,1),2);
  assert.equal(e.lw_slip_verdict(0,0,0),0);
  assert.equal(e.lw_first_window(3,2,2,2),3);
  if(compiled&&fs.existsSync(asset))
    assert.deepEqual(binary,Buffer.from(fs.readFileSync(asset,'utf8').trim(),'base64'),
      'Committed WASM differs from pinned Rust build');
  console.log('PASS: Rust launch-day sky trend, 20-point threshold, unknown guards, real compiled module '+binary.length+' bytes');
}
main().catch(err=>{console.error(err);process.exitCode=1});
