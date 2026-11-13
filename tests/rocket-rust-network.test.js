'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const wal=JSON.parse(read('public/wallops-rocket-launch-viewing/places.json'));
const sta=JSON.parse(read('public/starbase-rocket-launch-viewing/places.json'));
const wasmPath='public/assets/rocket-rust-viewing-network.wasm.b64';

test('Rust browser artifact is a real WASM module with stable access-safe exports',async()=>{
  const buffer=Buffer.from(read(wasmPath).trim(),'base64');
  assert.equal(buffer.toString('hex',0,4),'0061736d');
  assert.ok(buffer.length>100&&buffer.length<10000);
  const {instance}=await WebAssembly.instantiate(buffer,{});
  const e=instance.exports;
  assert.equal(e.rv_engine_version(),1);
  assert.equal(e.rv_region_count(),2);
  assert.deepEqual(wal.sites.map(x=>x.id),['nasa-visitor','reed','harbor']);
  assert.deepEqual(sta.sites.map(x=>x.id),['isla-blanca','zapata','lighthouse']);
  assert.equal(e.rv_site_count(1),wal.sites.length);
  assert.equal(e.rv_site_count(2),sta.sites.length);
  const scenarios=[
    [1,0,[0,1,2]],[1,1,[1,2,0]],[1,2,[0,1,2]],[1,3,[2,1,0]],
    [2,0,[0,1,2]],[2,1,[1,2,0]],[2,2,[2,1,0]]
  ];
  for(const [region,profile,expected] of scenarios){
    const order=[0,1,2].sort((a,b)=>e.rv_rank(region,profile,b)-e.rv_rank(region,profile,a));
    assert.deepEqual(order,expected,`region ${region}, profile ${profile}`);
  }
  for(const region of [1,2])for(const site of [0,1,2]){
    assert.equal(e.rv_access_verified(region,site),0);
    assert.equal(e.rv_rank(region,99,site),-1);
  }
  assert.equal(e.rv_rank(99,0,0),-1);
  assert.equal(e.rv_rank(1,0,99),-1);
});

test('Wallops and Starbase use the shared WASM engine, preserve original fallbacks and stable place IDs',()=>{
  const js=read('public/assets/rocket-rust-viewing.js');
  assert.match(js,/WebAssembly\.instantiate\(bytes,\{\}\)/);
  assert.match(js,/rv_access_verified\(spec\.region,i\)!==0/);
  assert.match(js,/manifestIds\.every\(\(id,i\)=>id===spec\.ids\[i\]\)/);
  for(const [folder,loader,profile,source] of [
    ['wallops-rocket-launch-viewing','wallops','w-profile','w-place-list'],
    ['starbase-rocket-launch-viewing','starbase','sb-profile','sb-place-list']
  ]){
    const app=read('public/'+folder+'/app.js');
    const html=read('public/'+folder+'/index.html');
    assert.ok(app.includes("RocketRustViewing?.load('"+loader+"'"));
    assert.match(app,/state\.rust\?\.order\(/);
    assert.match(app,/profiles\[[^\]]+\]\.order/);
    assert.match(app,/decisionEngine='rust-wasm'/);
    assert.match(html,/rocket-rust-viewing\.js\?v=20261113-network-v1/);
    assert.match(html,/index,follow,max-image-preview:large/);
    assert.match(html,/rel="canonical"/);
    assert.ok(html.includes('name="'+profile+'"'),folder+' preference controls preserved');
    assert.ok(html.includes('id="'+source+'"'),folder+' place cards preserved');
    assert.ok(html.indexOf('rocket-rust-viewing.js')<html.indexOf('/'+folder+'/app.js'),folder+' script ordering');
    assert.doesNotMatch(app,/navigator\.geolocation/);
  }
});

test('no launch status, official open verdict or mission route is moved into the Rust ranking engine',()=>{
  const rs=read('rust/rocket-viewing-network/src/lib.rs');
  assert.doesNotMatch(rs,/http|fetch|rocket[ -]?path|mission[ -]?go|parking[ -]?open/i);
  assert.match(rs,/rv_access_verified/);
  for(const path of ['public/wallops-rocket-launch-viewing/index.html',
    'public/starbase-rocket-launch-viewing/index.html']){
    const html=read(path);
    assert.match(html,/2026-11-13/);
  }
});
