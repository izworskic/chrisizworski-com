const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const operators=fs.readFileSync('public/assets/pictured-rocks-operators.js','utf8');
const loader=fs.readFileSync('public/assets/pictured-rocks-visual-layer.js','utf8');

test('Pictured Rocks operator layer loads with the visual experience',()=>{
  assert.match(loader,/pictured-rocks-operators\.js/);
  assert.match(loader,/picturedRocksOperators/);
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

test('operator information appears at choice, planner, and result stages',()=>{
  assert.match(operators,/function waterCards\(\)/);
  assert.match(operators,/function operatorSection\(\)/);
  assert.match(operators,/function plannerHelp\(\)/);
  assert.match(operators,/function resultOperators\(\)/);
  assert.match(operators,/id='water-operators'|section\.id='water-operators'/);
  assert.match(operators,/plannerOperatorHelp/);
  assert.match(operators,/resultOperators/);
});

test('result observer watches the generated timeline instead of its own operator box',()=>{
  assert.match(operators,/observer\.observe\(timeline/);
  assert.doesNotMatch(operators,/observer\.observe\(result,\{subtree:true/);
});
