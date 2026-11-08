'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const js=fs.readFileSync('public/assets/seaway.js','utf8');
const helper=js.match(/^\s*const displayFeet=meters=>[^\n;]+;/m);
test('AIS length conversion uses real meters-to-feet factor with sensible whole-foot rounding',()=>{
  assert.ok(helper,'displayFeet helper must remain available');
  const format=vm.runInNewContext(helper[0].replace('const displayFeet','var displayFeet')+'\ndisplayFeet;');
  assert.equal(format(200),'656 ft');
  assert.equal(format(304.8),'1,000 ft');
  assert.equal(format(24),'79 ft');
  assert.equal(format(0),null);
  assert.equal(format(-1),null);
  assert.equal(format(null),null);
  assert.equal(format(undefined),null);
  assert.equal(format(NaN),null);
});
test('the vessel list and map popup display feet; lock clearance retains original meters',()=>{
  const popup=js.slice(js.indexOf('function shipDetail(v)'),js.indexOf('function updateReportLine()'));
  const list=js.slice(js.indexOf('function updateList()'),js.indexOf('function updateRegionReports()'));
  assert.match(popup,/Reported length '\+displayFeet\(v\.lengthMeters\)/);
  assert.match(popup,/beam '\+displayFeet\(v\.beamMeters\)/);
  assert.match(list,/displayFeet\(v\.lengthMeters\)/);
  assert.doesNotMatch(list,/v\.lengthMeters\+' m/);
  assert.doesNotMatch(popup,/v\.lengthMeters\+' m/);
  assert.match(js,/\$\('fitLength'\)\.value=v\.lengthMeters/);
  assert.match(js,/\$\('fitBeam'\)\.value=v\.beamMeters/);
});
test('both Seaway routes and their generator use the fresh version of the shared renderer',()=>{
  const files=[
    'scripts/generate-seaway.mjs',
    'scripts/enhance-seaway-journey.mjs',
    'public/st-lawrence-seaway/index.html',
    'public/eisenhower-lock/index.html'
  ];
  for(const file of files){
    const content=fs.readFileSync(file,'utf8');
    assert.ok(content.includes('/assets/seaway.js?v=20261108i'),file+' must load the feet-label renderer');
  }
});
