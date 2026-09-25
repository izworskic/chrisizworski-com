const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');
const js=fs.readFileSync('public/assets/pictured-rocks-planner-v2.js','utf8');
const css=fs.readFileSync('public/assets/pictured-rocks-planner-v2.css','utf8');

test('preview remains out of index until canonical deployment ownership is resolved',()=>{
  assert.match(html,/name="robots" content="noindex,nofollow"/);
  assert.match(html,/rel="canonical" href="https:\/\/picturedrocks\.chrisizworski\.com\/"/);
});

test('planner asks causal trip-shaping questions',()=>{
  for(const name of ['time','base','walk','party','priority','water'])assert.match(html,new RegExp(`name="${name}"`));
  assert.match(js,/a\.party==='dog'/);
  assert.match(js,/a\.walk==='long'/);
  assert.match(js,/a\.priority==='hike'/);
  assert.match(js,/a\.water==='kayak'/);
  assert.match(js,/a\.base==='grand-marais'/);
});

test('hard constraints prevent fake personalization',()=>{
  assert.match(js,/Pet rules change the route substantially/);
  assert.match(js,/filter\(id=>!\['chapel','sable','sableFalls'\]\.includes\(id\)\)/);
  assert.match(js,/Young kids and a Lake Superior kayak tour/);
  assert.match(js,/Do not stack a scheduled cruise or guided paddle/);
});

test('result includes sequence, explicit tradeoff, fallback, and offline actions',()=>{
  assert.match(html,/Your best-fit plan/);
  assert.match(html,/Do not try to add this/);
  assert.match(html,/If Lake Superior or access changes the day/);
  assert.match(html,/Save the official map/);
  assert.match(html,/Print \/ save plan/);
});

test('mobile layout is intentionally supported',()=>{
  assert.match(css,/@media\(max-width:560px\)/);
  assert.match(css,/grid-template-columns:1fr/);
});