const test=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=rel=>readFileSync(path.join(root,rel),'utf8');

test('decision-network release keeps its explicit loss and market-test boundaries',()=>{
  const doc=read('docs/decision-network-growth.md');
  assert.match(doc,/thin\/cannibalizing URLs/);
  assert.match(doc,/protected active-experiment search surfaces/);
  assert.match(doc,/not observations at a particular ramp/);
  assert.match(doc,/not navigation, dive or exact wreck coordinates/);
  assert.match(doc,/build-quality merge gate, not a traffic forecast/i);
  assert.match(doc,/should not be churned mid-window/i);
});
