import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {EIGHT_DAY_HIKE_IDS, startAdvice, OFFICIAL_HIKES, OFFICIAL_VISITOR_CENTRE, OFFICIAL_PARK_RULES, OFFICIAL_RESPONSIBLE_VISIT, OFFICIAL_CAMPGROUND_MAP, OFFICIAL_CAMPGROUND_PAGE, OFFICIAL_MAP_LABELS, officialMapOrientation} from '../public/assets/pukaskwa-starts.mjs';
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
  assert.match(js,/import \{startAdvice,officialMapOrientation\} from '\.\/pukaskwa-starts\.mjs'/);
  assert.match(js,/startSequence\.replaceChildren/);
  assert.match(js,/closed:blocked/);
  assert.doesNotMatch(js,/calculateParkingRoute|routeToParking|routeToStart/);
});
test('Parks Canada walking-rule gate never promotes OSM junctions or destination pins to signed entrances',()=>{
  for(const id of EIGHT_DAY_HIKE_IDS){
    const a=startAdvice(id,{hasApprovedGeometry:true});
    assert.equal(a.parkingToSignedEntranceVerified,false,id);
    assert.equal(a.routeNavigationCertified,false,id);
    assert.match(a.pedestrianAccessEvidence,/Visitor Centre|bridge closure/i);
    assert.match(a.establishedPathRule,/established hiking or walking trails and park roadways/);
    assert.match(a.establishedPathRule,/do not cut across campsites/i);
    assert.deepEqual(a.pathRuleSources,[OFFICIAL_PARK_RULES,OFFICIAL_RESPONSIBLE_VISIT]);
    assert.ok(!('gps' in a)&&!('geometry' in a));
  }
  assert.equal(startAdvice('combination-hike').accessEvidenceClass,'official-named-circuit-no-gps');
  assert.match(startAdvice('combination-hike').pedestrianAccessEvidence,/road return/);
  assert.equal(startAdvice('southern-headland').accessEvidenceClass,'official-origin-no-gps');
  assert.equal(startAdvice('white-river-bridge',{closed:true}).accessEvidenceClass,'closed-no-route');
  const html=readFileSync('public/pukaskwa-national-park/index.html','utf8');
  const js=readFileSync('public/assets/pukaskwa-map.js','utf8');
  assert.match(html,/id="pk-access-proof-heading"/);
  assert.match(html,/id="pk-access-proof-detail"/);
  assert.match(html,/reglement-rules-and-regulations/);
  assert.match(html,/Do not cut through campsites/);
  assert.match(js,/accessProofDetail.textContent=orientation.pedestrianAccessEvidence/);
  assert.match(js,/last-known-closed/);
  assert.doesNotMatch(js,/routing\.control|GPXDownload|routeToParking/);
});

test('official published campground trail labels are image positions, never GPS starts',()=>{
  assert.match(OFFICIAL_CAMPGROUND_MAP,/Campground_Map_FOR_PRINT_OTENTIKS-ADDITION\.jpg/);
  assert.match(OFFICIAL_CAMPGROUND_PAGE,/parks\.canada\.ca/);
  for(const id of EIGHT_DAY_HIKE_IDS){
    const result=officialMapOrientation(id);
    assert.equal(result.imageSource,OFFICIAL_CAMPGROUND_MAP);
    assert.equal(result.signedTrailheadCoordinatesVerified,false,id);
    assert.equal(result.gpsNavigation,false,id);
    assert.match(result.mappingMeaning,/printed trail NAME/i);
    assert.ok(!('latitude' in result)&&!('longitude' in result),id);
    if(result.label){
      assert.ok(Number.isInteger(result.label.x)&&result.label.x>=0&&result.label.x<=1000);
      assert.ok(Number.isInteger(result.label.y)&&result.label.y>=0&&result.label.y<=761);
      assert.match(result.label.caption,/park campground map/);
    }
  }
  assert.equal(officialMapOrientation('manito-miikana').label,null);
  assert.equal(officialMapOrientation('white-river-bridge',{blocked:true}).label,null);
  assert.equal(officialMapOrientation('southern-headland',{blocked:true}).label,null);
  assert.equal(Object.keys(OFFICIAL_MAP_LABELS).length,6);
  assert.match(officialMapOrientation('combination-hike').description,/North Loop Campground/);
  assert.equal(officialMapOrientation('unknown'),null);
});
test('the printed-park-map visitor experience is responsive, change-aware and never routes from image pixels',()=>{
 const html=readFileSync('public/pukaskwa-national-park/index.html','utf8');
 const js=readFileSync('public/assets/pukaskwa-map.js','utf8');
 const css=readFileSync('public/assets/pukaskwa-map.css','utf8');
 assert.match(html,/id="pk-campground-detail"/);
 assert.match(html,/id="pk-campground-orientation-image"/);
 assert.match(html,/id="pk-official-label-ring"/);
 assert.match(html,/id="pk-official-wayfinding-text"/);
 assert.match(html,/id="pk-find-park-map-label"/);
 assert.match(html,/solid black lines are campground roads/);
 assert.match(html,/black dotted lines are walking trails/);
 assert.match(js,/officialMapOrientation\(selectedTrail,\{blocked\}\)/);
 assert.match(js,/parkDiagramRing\.setAttribute\('cx'/);
 assert.match(js,/parkDiagramRing\.toggleAttribute\('hidden',!parkEvidence\.label\)/);
 assert.match(css,/aspect-ratio:1000 \/ 761/);
 assert.doesNotMatch(js,/coordinatesFromImage|navigateFromParkImage|createRouteFromImage/);
});
