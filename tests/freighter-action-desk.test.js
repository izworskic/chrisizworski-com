const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const js=fs.readFileSync('public/assets/freighter-tracker.js','utf8');
const html=fs.readFileSync('public/great-lakes-freighter-tracking/index.html','utf8');

test('Python reference validates corridor counts and report-age boundaries',()=>{
  const views=js.slice(js.indexOf('  var views ='),js.indexOf('\n\n  var mapFrame'));
  const pick=name=>js.match(new RegExp('  function '+name+'\\([^\\n]+\\n(?:.*\\n)*?  }'))?.[0];
  const line=name=>js.match(new RegExp('  function '+name+'\\([^\\n]+'))?.[0];
  const context={};
  vm.runInNewContext(views+'\n'+line('recent')+'\n'+line('corridorRadius')+'\n'+line('inCorridor')+'\n'+pick('toRad')+'\n'+pick('distanceMiles'),context);
  const centers={};for(const key of ['soo','mackinac','duluth','port-huron','detroit','saginaw'])centers[key]=context.views[key];
  const oracle=spawnSync('python3',['scripts/freighter-desk-validation.py'],{input:JSON.stringify(centers),encoding:'utf8'});
  assert.equal(oracle.status,0,oracle.stderr);const data=JSON.parse(oracle.stdout);
  for(const key of Object.keys(centers))assert.equal(data.points.filter(v=>context.recent(v,data.now)&&context.inCorridor(v,key)).length,data.counts[key],key);
  assert.equal(context.recent({seen:'bad'},data.now),false);
});

test('desk communicates coverage, ages, and selected-vessel uncertainty',()=>{
  assert.match(html,/coverage can be incomplete and areas can overlap/i);
  assert.match(html,/id="ship-inspector"[^>]*hidden/);
  assert.match(html,/Destination and vessel dimensions may be missing or outdated/);
  assert.match(js,/Refresh failed; showing retained reports/);
  assert.match(js,/selectedMmsi=String\(v.mmsi\)/);
  assert.match(js,/if\(selected\)showShip\(selected,now\);else clearShip\(\)/);
  assert.match(js,/if\(!activityGrid\)return/);
});
