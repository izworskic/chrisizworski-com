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

test('Tahquamenon fall color hands visitors into the destination planner',()=>{
  const html=read('public/fall-color/tahquamenon-falls-fall-color/index.html');
  assert.ok(html.includes('data-tahquamenon-planner-cta'));
  assert.ok(html.includes('/tahquamenon-falls/?intent=fall-color'));
  assert.ok(html.includes('Build your Tahquamenon visit'));
});
