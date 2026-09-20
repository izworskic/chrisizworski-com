const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=f=>readFileSync(path.join(root,f),'utf8');

test('fall color dispatcher exposes the reusable snapshot view',()=>{
  const api=read('api/fall-color.js');
  const route=read('lib/fall-color/routes/snapshot.js');
  assert.ok(api.includes('snapshot: require("../lib/fall-color/routes/snapshot.js")'));
  assert.ok(route.includes('snapshotFor(region'));
  assert.ok(route.includes('shared-fall-color-regional-snapshot-v1'));
  assert.ok(route.includes('inSeason: inSeason()'));
});

test('Tahquamenon fall color hands visitors into the destination planner through the protected trip stack',()=>{
  const html=read('public/fall-color/tahquamenon-falls-fall-color/index.html');
  const loader=read('public/assets/field-camera.js');
  const stack=read('public/assets/contextual-trip-stack.js');
  assert.ok(html.includes('data-field-camera="m123-tahquamenon"'));
  assert.ok(loader.includes('/assets/contextual-trip-stack.js'));
  assert.ok(stack.includes("tahquamenon:{label:'Tahquamenon visit planner'"));
  assert.ok(stack.includes("href:'/tahquamenon-falls/?intent=fall-color'"));
  assert.ok(stack.includes("eup:{title:'Build the rest of an eastern U.P. trip',keys:['tahquamenon'"));
});


test('fall snapshot preserves regional climatology when live inputs fail',()=>{
  const route=require('../lib/fall-color/routes/snapshot.js');
  const payload=route.serializeSnapshot(null,{degraded:true,error:'weather unavailable'});
  assert.equal(payload.degraded,true);
  assert.equal(payload.sourceHealth.conditions,'degraded');
  assert.equal(payload.sourceHealth.fallback,'regional-climatology');
  assert.ok(Array.isArray(payload.regions));
  assert.ok(payload.regions.length>=8);
  const eup=payload.regions.find(region=>region.id==='eup');
  assert.ok(eup);
  assert.ok(['green','rising','peak','falling','down'].includes(eup.phase));
  assert.equal(typeof eup.pct,'number');
});
