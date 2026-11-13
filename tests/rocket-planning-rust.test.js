'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const asset='public/assets/rocket-planning-core.wasm.b64';

test('shipped Rust WASM exactly matches the national ten-day window and precision contract',async()=>{
  const bytes=Buffer.from(read(asset).trim(),'base64');
  assert.equal(bytes.toString('hex',0,4),'0061736d');
  assert.ok(bytes.length>100&&bytes.length<10000);
  const e=(await WebAssembly.instantiate(bytes,{})).instance.exports;
  assert.equal(e.rp_engine_version(),1);
  for(let precision=0;precision<=5;precision++){
    const valid=[1,2,3,4].includes(precision);
    assert.equal(e.rp_time_precise(precision),[1,2].includes(precision)?1:0);
    for(const delta of [-Infinity,-86400001,-60001,-60000,-59999,0,60000,864000000,864000001,Infinity,NaN]){
      const legacy=valid&&Number.isFinite(delta)&&delta>=-60000&&delta<=864000000;
      assert.equal(e.rp_national_window(1,precision,delta),legacy?1:0);
      assert.equal(e.rp_national_window(0,precision,delta),1);
    }
  }
  assert.equal(e.rp_national_window(9,1,0),0);
  assert.equal(e.rp_access_verified(),0);
});

test('Florida gate warnings cannot turn a public policy estimate into an admission guarantee',async()=>{
  const bytes=Buffer.from(read(asset).trim(),'base64');
  const e=(await WebAssembly.instantiate(bytes,{})).instance.exports;
  assert.equal(e.rp_florida_cutoff_state(1,1,1,3600001),1);
  assert.equal(e.rp_florida_cutoff_state(1,1,1,3600000),2);
  assert.equal(e.rp_florida_cutoff_state(2,1,1,0),2);
  assert.equal(e.rp_florida_cutoff_state(1,1,1,-1),3);
  for(const precision of [0,3,4,5])
    assert.equal(e.rp_florida_cutoff_state(precision,1,1,1000),0);
  assert.equal(e.rp_florida_cutoff_state(1,0,1,1000),0);
  assert.equal(e.rp_florida_cutoff_state(1,1,0,1000),0);
  assert.equal(e.rp_florida_cutoff_state(1,1,1,NaN),0);
  assert.equal(e.rp_access_verified(),0);
});

test('national and Florida HTML load Rust before the existing operational scripts with full fallback',()=>{
  const module=read('public/assets/rocket-planning-rust.js');
  assert.match(module,/WebAssembly\.instantiate\(bytes,\{\}\)/);
  assert.match(module,/rp_access_verified\(\)!==0/);
  const national=read('public/synced-national-tools/rocket-launch-live/index.html');
  const northJs=read('public/synced-national-tools/rocket-launch-live/app.js');
  assert.match(national,/rocket-planning-rust\.js\?v=20261113-network-v1/);
  assert.ok(national.indexOf('rocket-planning-rust.js')<national.indexOf('rocket-launch-live/app.js'));
  assert.match(northJs,/rustPlanning\.tenDayVisible/);
  assert.match(northJs,/rustPlanning\.timePrecise/);
  assert.match(northJs,/Number\.isFinite\(net\)/);
  assert.match(northJs,/decisionEngine='rust-wasm'/);
  const florida=read('public/synced-national-tools/space-coast-launch/index.html');
  const floridaJs=read('public/synced-national-tools/space-coast-launch/app.js');
  assert.ok(florida.indexOf('rocket-planning-rust.js')<florida.indexOf('space-coast-launch/app.js'));
  assert.match(florida,/id="fl-rust-gate-reference"/);
  assert.match(floridaJs,/rustPlanning\.floridaCutoffState/);
  assert.match(floridaJs,/NPS before attempting entry/);
  assert.match(floridaJs,/renderRustCutoff\(null\)/);
  for(const html of [national,florida]){
    assert.match(html,/rel="canonical"/);
    assert.match(html,/index,follow,max-image-preview:large/);
  }
});
