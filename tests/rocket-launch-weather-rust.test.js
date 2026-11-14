'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const B64='public/assets/rocket-launch-weather.wasm.b64';

async function engine(b64=read(B64)){
  const win={};
  const context=vm.createContext({window:win,WebAssembly,atob:s=>Buffer.from(s,'base64').toString('binary'),
    AbortSignal,Uint8Array,Error,Object,Array,Number,String,
    fetch:async()=>({ok:true,text:async()=>b64})});
  vm.runInContext(read('public/assets/rocket-launch-weather-rust.js'),context);
  return win.RocketLaunchWeatherRust.load();
}
const spot=(id,cloud,level='good')=>({id,name:id==='t'?'Space View Park (Titusville)':'Jetty Park (Port Canaveral)',
  cloudStatus:cloud===null?'missing':'ok',cloudCoverPercent:cloud,assessment:{level},status:'forecast-hour'});
const scen=(rows)=>rows.map(([offsetHours,a,b,la,lb])=>({offsetHours,status:'assessed',
  places:[spot('t',a,la),spot('p',b,lb)]}));

test('real Nov 14 Vulcan forecast: delays keep the same sky at both spots',async()=>{
  const e=await engine();
  assert.equal(e.engine,'rust-wasm');
  // Values returned by /api/rocket-launch-usa for Vulcan LV-01 on Nov 14 2026.
  const t=e.trend(scen([[0,12,12],[1,15,16],[3,16,20],[6,12,16]]));
  assert.equal(t.verdict,3);
  assert.deepEqual([1,3,6].map(o=>t.windows[o].code),[3,3,3]);
  assert.equal(t.unknownWindows,0);
});
test('both spots clouding over is the headline, at the first window it happens',async()=>{
  const t=(await engine()).trend(scen([[0,12,15],[1,20,22],[3,58,61],[6,80,85]]));
  assert.equal(t.verdict,2);
  assert.equal(t.firstOffset,3);
  assert.deepEqual(t.windows[3].spots.map(s=>[s.from,s.to]),[[12,58],[15,61]]);
});
test('one spot holding up is reported as a split, not a lost view',async()=>{
  const t=(await engine()).trend(scen([[0,12,15],[1,40,18],[3,45,20],[6,50,22]]));
  assert.equal(t.verdict,4);
  assert.equal(t.firstOffset,1);
  assert.deepEqual(t.windows[1].spots.map(s=>s.code),[2,3]);
});
test('rain or storms arriving counts as worse even with a low cloud number',async()=>{
  const t=(await engine()).trend(scen([[0,12,12],[1,12,12,'poor','poor'],[3,12,12],[6,12,12]]));
  assert.equal(t.verdict,2);
  assert.equal(t.windows[1].spots.every(s=>s.hazard),true);
});
test('missing values and out-of-range windows are never treated as clear',async()=>{
  const e=await engine();
  const t=e.trend(scen([[0,12,12],[1,null,12],[3,12,12],[6,12,12]]).map(s=>
    s.offsetHours===6?{...s,status:'outside-horizon'}:s));
  assert.equal(t.windows[1].code,0);
  assert.equal(t.windows[6].code,0);
  assert.equal(t.verdict,3);
  assert.equal(t.unknownWindows,2);
  assert.equal(e.trend(scen([[0,null,null],[1,null,null],[3,null,null],[6,null,null]])).verdict,0);
  assert.equal(e.trend([]),null);
  assert.equal(e.trend(scen([[1,12,12]])),null);
});
test('a damaged module is refused and the page keeps its original planner',async()=>{
  assert.equal(await engine('not-a-module'),null);
});
test('Rust threshold matches the API meaning of a real cloud difference',()=>{
  assert.match(read('rust/rocket-launch-weather/src/lib.rs'),/MEANINGFUL_POINTS:u32=20;/);
  assert.match(read('api/rocket-launch-usa.js'),/if \(diff < 20\)/);
});
test('page loads the module and has a hidden trend line by default',()=>{
  const html=read('public/synced-national-tools/rocket-launch-live/index.html');
  assert.match(html,/<script src="\/assets\/rocket-launch-weather-rust\.js\?v=[^"]+" defer><\/script>/);
  assert.match(html,/<p id="rl-slip-trend" class="rl-slip-trend" aria-live="polite" hidden><\/p>/);
  const app=read('public/synced-national-tools/rocket-launch-live/app.js');
  assert.match(app,/window\.RocketLaunchWeatherRust\?\.load\(\)/);
  assert.doesNotMatch(read('public/assets/rocket-launch-weather-rust.js'),/\u2014/);
  assert.doesNotMatch(app.slice(app.indexOf('let skyTrendRust'),app.indexOf('function renderSlipForecast')),/\u2014/);
});
