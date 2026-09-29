const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const operators=fs.readFileSync('public/assets/pictured-rocks-operators.js','utf8');
const loader=fs.readFileSync('public/assets/pictured-rocks-visual-layer.js','utf8');

test('operator data is retained but not auto-loaded into the critical visual chain',()=>{
  assert.doesNotMatch(loader,/pictured-rocks-operators\.js/);
  assert.doesNotMatch(loader,/picturedRocksOperators/);
});

test('operator layer includes the NPS-authorized cruise concessioner',()=>{
  assert.match(operators,/Pictured Rocks Cruises/);
  assert.match(operators,/https:\/\/picturedrocks\.com\//);
  assert.match(operators,/NPS-authorized concessioner/);
});

test('operator layer includes all four 2026 NPS permitted kayak guides',()=>{
  for(const name of ['Big Water Paddle Co.','Paddling Michigan / Uncle Ducky’s','Pictured Rocks Kayaking','Yooper Yachts']){
    assert.ok(operators.includes(name),name);
  }
  assert.match(operators,/nps\.gov\/piro\/planyourvisit\/kayak-tours\.htm/);
});

test('operator information source remains available for a non-critical static integration',()=>{
  assert.match(operators,/function waterCards\(\)/);
  assert.match(operators,/function operatorSection\(\)/);
  assert.match(operators,/function plannerHelp\(\)/);
  assert.match(operators,/function resultOperators\(\)/);
});

test('result observer does not watch its own operator box',()=>{
  assert.match(operators,/observer\.observe\(timeline/);
  assert.doesNotMatch(operators,/observer\.observe\(result,\{subtree:true/);
});
