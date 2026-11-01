import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {APPROVED_WAYS,metreDistance,verifyCommunityCenterlines} from '../public/assets/pukaskwa-trail-geometry.mjs';
import {EIGHT_DAY_HIKE_IDS} from '../public/assets/pukaskwa-starts.mjs';
import {MAPPED_JUNCTIONS,OSM_JUNCTION_AUDIT,mappedJunctionEvidence,osmNodeUrl,osmWayUrl} from '../public/assets/pukaskwa-junction-evidence.mjs';

const geo=JSON.parse(readFileSync('public/pukaskwa-national-park/trail-centerlines.geojson','utf8'));
const html=readFileSync('public/pukaskwa-national-park/index.html','utf8');
const js=readFileSync('public/assets/pukaskwa-map.js','utf8');

// These values were independently checked against OSM API 0.6 /way/ID/full
// and /node/ID/ways on Nov 1, 2026; NONE are marked signed trail entrances.
const EXPECTED_NODES=Object.freeze({
  4411571772:[-86.2941699,48.5906373],
  6949726638:[-86.2959745,48.5901038],
  6949507750:[-86.2920471,48.5898725],
  4411571777:[-86.2969663,48.5900235],
  10200596433:[-86.2936930,48.5921053],
  10200614934:[-86.2961194,48.5936418],
  6954921565:[-86.2971741,48.5933166],
  6954949495:[-86.2992155,48.5902289],
});
const EXACT_PAIRS=Object.freeze({
  4411571772:[1307756994,443602401],
  6949726638:[742332531,1434966490],
  6949507750:[742973686,742318982],
  4411571777:[769800690,1434966490],
  10200596433:[1115333798,443605468],
  10200614934:[1115333798,72003674],
  6954921565:[1434966491,72003674],
  6954949495:[742973685,1434966489],
});
const OSM_SERVICE_IDS=new Set([443602401,742318982,443605468,72003674]);
const canonicalKeys=[...Object.keys(MAPPED_JUNCTIONS)].sort();
const allowedNames=['beach','bimose-kinoomagewnan','boardwalk-beach','manito-miikana','southern-headland'].sort();

test('only five already-reviewed named day hikes can have community node evidence',()=>{
  assert.deepEqual(canonicalKeys,allowedNames);
  assert.equal(verifyCommunityCenterlines(geo),geo);
  assert.equal(EIGHT_DAY_HIKE_IDS.length,8);
  assert.equal(OSM_JUNCTION_AUDIT.checkedOn,'2026-11-01');
  assert.equal(OSM_JUNCTION_AUDIT.parkSurveyedStartCoordinates,false);
  assert.equal(OSM_JUNCTION_AUDIT.fromParkingRoutingAuthorized,false);
  assert.equal(OSM_JUNCTION_AUDIT.canOpenRoute,false);
  assert.equal(OSM_JUNCTION_AUDIT.licence,'https://opendatacommons.org/licenses/odbl/1-0/');
  assert.equal(osmNodeUrl(6949507750),'https://www.openstreetmap.org/node/6949507750');
  assert.equal(osmWayUrl(742973686),'https://www.openstreetmap.org/way/742973686');
});

test('all eight OSM shared nodes are exact member vertices of the approved named trail geometry',()=>{
  const records=Object.values(MAPPED_JUNCTIONS).flat();
  assert.equal(records.length,8);
  assert.equal(new Set(records.map(r=>r.nodeId)).size,8);
  for(const r of records){
    assert.equal(r.signedTrailheadVerified,false);
    assert.ok(EXPECTED_NODES[r.nodeId],'no new node IDs without source review');
    assert.deepEqual([r.trailWay,r.adjoiningWay],EXACT_PAIRS[r.nodeId],'unreviewed source way pair');
    assert.ok(Object.values(APPROVED_WAYS).flat().includes(r.trailWay),'first way must be approved named day hike');
    if(r.adjoiningClass==='service-road')assert.ok(OSM_SERVICE_IDS.has(r.adjoiningWay));
    else assert.ok(Object.values(APPROVED_WAYS).flat().includes(r.adjoiningWay));
    assert.equal('lat' in r||'lon' in r||'navigation' in r,false,'no coordinate/route UI model');
    const feature=geo.features.find(f=>f.properties.osmWayId===r.trailWay);
    assert.ok(feature,'original named OSM way must already be approved');
    assert.ok(feature.geometry.coordinates.some(p=>metreDistance(p,EXPECTED_NODES[r.nodeId])<.12),
      'community map node is not an exact member of the approved named way: '+r.nodeId);
    if(r.adjoiningClass==='named-footway'){
      const other=geo.features.find(f=>f.properties.osmWayId===r.adjoiningWay);
      assert.ok(other.geometry.coordinates.some(p=>metreDistance(p,EXPECTED_NODES[r.nodeId])<.12),
        'assert both named ways share the same OSM coordinate');
    }
  }
});

test('source classification has no signed, complete or permitted trailhead assertions',()=>{
  for(const id of EIGHT_DAY_HIKE_IDS){
    const audit=mappedJunctionEvidence(id);
    assert.equal(audit.id,id);
    assert.match(audit.safety,/not|None/i);
    assert.ok(audit.heading.length>15);
    assert.ok(audit.summary.length>35);
    assert.equal(audit.checkedOn,'2026-11-01');
    assert.ok(!JSON.stringify(audit).includes('lat'));
    if(['hattie-cove-fire-walk','combination-hike','white-river-bridge'].includes(id)){
      assert.equal(audit.items.length,0,id);
      assert.match(audit.heading,/No reviewed/);
    }
  }
  assert.equal(mappedJunctionEvidence('white-river-bridge',{blocked:true}).items.length,0);
  assert.match(mappedJunctionEvidence('white-river-bridge',{blocked:true}).heading,/Closed route/);
  assert.equal(mappedJunctionEvidence('other',{blocked:true}).items.length,0);
});

test('visitor interface keeps original official map, source links and no-JS answer without fabricated path drawing',()=>{
  assert.match(html,/id="pk-junction-heading"/);
  assert.match(html,/id="pk-junction-summary"/);
  assert.match(html,/id="pk-junction-sources"/);
  assert.match(html,/id="pk-junction-list"/);
  assert.match(html,/id="pk-junction-warning"/);
  assert.match(html,/openstreetmap\.org\/node\/6949507750/);
  assert.match(html,/pukaskwa-map\.js\?v=4/);
  assert.match(html,/pukaskwa-map\.css\?v=4/);
  assert.match(html,/id="pk-official-map-image"/);
  assert.match(js,/import \{mappedJunctionEvidence,osmNodeUrl,osmWayUrl\}/);
  assert.match(js,/renderJunctionEvidence\(selectedTrail,selectedStatus\)/);
  assert.match(js,/junctionList\.replaceChildren/);
  assert.match(js,/original\.href=osmNodeUrl/);
  assert.doesNotMatch(js,/L\.marker\([^)]*junction|L\.polyline\([^)]*junction/);
});
