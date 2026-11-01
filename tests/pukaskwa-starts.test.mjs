import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EIGHT_DAY_HIKE_IDS, startAdvice, OFFICIAL_HIKES, OFFICIAL_VISITOR_CENTRE} from '../public/assets/pukaskwa-starts.mjs';
import {DAY_HIKES} from '../lib/pukaskwa/trail-registry.mjs';

test('all eight official trails have Visitor Centre start evidence without invented trailhead coordinates',()=>{
  assert.equal(EIGHT_DAY_HIKE_IDS.length,8);
  assert.deepEqual(new Set(EIGHT_DAY_HIKE_IDS),new Set(DAY_HIKES.map(t=>t.id)));
  for(const t of DAY_HIKES){
    const a=startAdvice(t.id,{hasApprovedGeometry:true});
    assert.equal(a.start,'Pukaskwa Hattie Cove Visitor Centre');
    assert.equal(a.signedCoordinatesVerified,false);
    assert.equal(a.routeNavigationCertified,false);
    assert.ok(a.sequence[0].includes('Visitor Centre'));
    assert.ok(a.guidance.length>=80);
    assert.deepEqual(a.evidence,[OFFICIAL_HIKES,OFFICIAL_VISITOR_CENTRE]);
    assert.ok(a.geometryNote.includes('incomplete'));
    assert.ok(!('lat' in a)||!('lng' in a));
    assert.ok(!JSON.stringify(a).includes('48.59'));
  }
});
test('combination hike reproduces official published order, not fabricated connector coordinates',()=>{
  const steps=startAdvice('combination-hike').sequence;
  assert.deepEqual(steps,['Visitor Centre','Southern Headland','Horseshoe Beach','Beach Trail','North Loop Campground','Halfway Lake','Road return to Visitor Centre']);
  assert.match(startAdvice('combination-hike').guidance,/connecting paths have not been verified/);
});
test('bridge closure disables navigational implication and route without approved geometry remains unknown',()=>{
  const closed=startAdvice('white-river-bridge',{closed:true,hasApprovedGeometry:false});
  assert.match(closed.closureNote,/Closure takes precedence/);
  assert.match(closed.geometryNote,/No approved coordinate centerline/);
  assert.equal(startAdvice('unknown'),null);
});
test('published HTML starts with a source-based orientation and map module updates route-specific details',()=>{
  const html=readFileSync('public/pukaskwa-national-park/index.html','utf8');
  const js=readFileSync('public/assets/pukaskwa-map.js','utf8');
  assert.match(html,/id="pk-map-start-sequence"/);
  assert.match(html,/id="pk-map-start-text"/);
  assert.match(html,/id="pk-map-start-warning"/);
  assert.match(html,/pukaskwa-map\.js\?v=4/);
  assert.match(html,/Day-use parking is documented at the centre/);
  assert.match(js,/import \{startAdvice\} from '\.\/pukaskwa-starts\.mjs'/);
  assert.match(js,/startSequence\.replaceChildren/);
  assert.match(js,/closed:blocked/);
  assert.doesNotMatch(js,/calculateParkingRoute|routeToParking|routeToStart/);
});