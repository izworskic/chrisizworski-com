'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {BOARDWALK_GIS,PLAYALINDA_GIS,buildBoardwalks,buildGeographicViewing,
  boardwalkSpecificClosure,boardwalkAccessEvidence,validFlorida}=require('../lib/space-coast-geo');
const {VIEWPOINTS,viewAccess}=require('../lib/space-coast-decision');
const now=Date.parse('2026-11-01T16:00:00Z');
const launch={
  id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',name:'Mission Example',
  pad:'Space Launch Complex 40',lat:28.56194122,lon:-80.57735736,
  net:'2026-11-03T17:00:00Z',netPrecision:'minute',
  status:'Go'
};
const source=(alerts=[],verified=true)=>({
  verified,alerts,checkedAt:new Date(now).toISOString()
});
function geo(alerts=[],verified=true){
  const v=VIEWPOINTS.map(x=>viewAccess(x,launch,alerts,verified,{now}));
  return buildGeographicViewing(launch,v,source(alerts,verified),now);
}

test('NPS GIS contains all fourteen Playalinda boardwalk alignments with source identity',()=>{
  assert.equal(BOARDWALK_GIS.boardwalks.length,14);
  assert.match(BOARDWALK_GIS.layer,/NPS_Public_Trails_Geographic/);
  assert.equal(BOARDWALK_GIS.coordinateSystem,'WGS84');
  const ids=new Set(),numbers=new Set(),facilities=new Set();
  for (const b of BOARDWALK_GIS.boardwalks) {
    numbers.add(b.number);ids.add(b.id);facilities.add(b.facilityId);
    assert.equal(b.name,'PD Boardwalk '+b.number);
    assert.equal(b.recordedStatus,'Existing');
    assert.equal(b.openToPublicField,null);
    assert.equal(b.geometry.type,'MultiLineString');
    assert.ok(Number.isInteger(b.objectId));
    assert.ok(b.mappedCenterlineMeters>=20&&b.mappedCenterlineMeters<100);
    assert.ok(Date.parse(b.sourceEditedAt)>=Date.parse('2025-08-01'));
    assert.ok(Date.parse(b.sourceEditedAt)<Date.parse('2026-01-01'));
    for (const line of b.geometry.coordinates) {
      assert.ok(line.length>=2);
      for (const [lon,lat] of line)assert.ok(validFlorida(lat,lon));
    }
    if(b.number<=13){
      assert.equal(b.matchingNumberedParkingLot,b.number);
      assert.ok(Number.isInteger(b.nearestParkingCentroidMeters));
      assert.ok(b.nearestParkingCentroidMeters<=65);
    }else{
      assert.equal(b.matchingNumberedParkingLot,null);
      assert.equal(b.nearestParkingCentroidMeters,null);
    }
  }
  assert.equal(ids.size,14);assert.equal(numbers.size,14);
  assert.equal(facilities.size,14);
  assert.deepEqual([...numbers].sort((a,b)=>a-b),[1,2,3,4,5,6,7,8,9,10,11,12,13,14]);
  assert.equal(PLAYALINDA_GIS.lots.length,13);
});

test('boardwalks are matched to numbered parking areas, never invented as end-to-end accessible walking routes',()=>{
  const g=geo();
  assert.equal(g.boardwalkInventory.count,14);
  assert.equal(g.boardwalkInventory.numberedLotAssociations,13);
  assert.deepEqual(g.boardwalkInventory.unpairedBoardwalks,[14]);
  assert.equal(g.boardwalkInventory.continuityVerified,false);
  assert.equal(g.boardwalks.length,14);
  assert.equal(g.geojson.features.filter(x=>x.geometry.type==='MultiLineString').length,14);
  for(let n=1;n<=13;n++){
    const lot=g.points.find(p=>p.id==='playalinda-lot-'+n);
    const b=g.boardwalks.find(b=>b.number===n);
    assert.equal(lot.boardwalk.id,'playalinda-boardwalk-'+n);
    assert.equal(b.matchingParkingLot,n);
    assert.equal(lot.boardwalk.routeContinuityVerified,false);
    assert.equal(b.beachConnectionVerified,false);
    assert.equal(b.wheelchairPassabilityVerified,false);
    assert.equal(lot.boardwalk.beachConnectionVerified,false);
    assert.equal(b.publicOpeningInGis,'not-reported');
  }
  const standalone=g.boardwalks.find(b=>b.number===14);
  assert.equal(standalone.matchingParkingLot,null);
  assert.equal(standalone.access.status,'no-matched-parking');
  assert.equal(g.points.some(p=>p.id==='playalinda-lot-14'),false);
  assert.ok(g.safety.some(s=>/boardwalk line geometry/.test(s)));
});

test('NPS alert source outage never turns historic boardwalk geometry into open pedestrian access',()=>{
  const g=geo([],false);
  for(const b of g.boardwalks.filter(b=>b.number<=13)){
    assert.equal(b.access.status,'unknown-alerts');
    assert.equal(b.beachConnectionVerified,false);
    assert.equal(b.routeContinuityVerified,false);
  }
});

test('NPS closure of parking lots eight through thirteen blocks their associated parking access, not physical boardwalk condition',()=>{
  const alerts=[{category:'Park Closure',
    title:'Playalinda District: Parking Lot #8-13',
    description:'Due to sand and water, Parking Lots #8-13 are closed to all visitor use.'}];
  const g=geo(alerts);
  for(let n=8;n<=13;n++){
    const b=g.boardwalks.find(b=>b.number===n);
    assert.equal(b.access.status,'parking-restricted',String(n));
    assert.match(b.access.detail,/does not necessarily mean the boardwalk is physically damaged/);
    assert.equal(g.points.find(p=>p.number===n&&p.category==='beach-parking').level,'closed');
  }
  assert.equal(g.boardwalks.find(b=>b.number===7).access.status,'not-currently-verified');
  assert.equal(g.boardwalks.find(b=>b.number===14).access.status,'no-matched-parking');
});

test('specific boardwalk closures are recognized without converting north-of-boardwalk beach boundaries into closures',()=>{
  const closed=[{category:'Park Closure',title:'Boardwalk #10 closed for repairs',
    description:'Boardwalk #10 will be closed to pedestrians until repairs finish.'}];
  assert.equal(boardwalkSpecificClosure(closed,10),true);
  assert.equal(boardwalkSpecificClosure(closed,1),false);
  assert.equal(geo(closed).boardwalks.find(b=>b.number===10).access.status,'official-closure');
  const boundary=[{category:'Park Closure',title:'Beach north of Boardwalk 8 is closed',
    description:'Beach north of boardwalk #8 is closed to public use due to storm damage.'}];
  assert.equal(boardwalkSpecificClosure(boundary,8),false);
  assert.notEqual(geo(boundary).boardwalks.find(b=>b.number===8).access.status,'official-closure');
});

test('published ramp descriptions do not equal currently passable boardwalk or sand access',()=>{
  const g=geo();
  for(const n of [2,3,8,10,11,12]){
    const p=g.points.find(p=>p.id==='playalinda-lot-'+n);
    assert.equal(p.accessibility.beachRampInOfficialFaq,true);
    assert.equal(p.boardwalk.wheelchairPassabilityVerified,false);
  }
  for(const p of g.points.filter(p=>p.category==='beach-parking')){
    assert.equal(p.boardwalk.access.label.includes('unverified')||
      p.boardwalk.access.label.includes('restricted'),true);
  }
});

test('visitor GIS renders verified boardwalk lines as historical evidence, not a fabricated pedestrian connector',()=>{
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const js=fs.readFileSync(path.join(root,'geo-map.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'viewing.css'),'utf8');
  assert.match(html,/id="geo-boardwalk-detail"/);
  assert.match(html,/id="geo-boardwalk-toggle"/);
  assert.match(html,/geo-map\.js\?v=20261101-access1/);
  assert.doesNotThrow(()=>new Function(js),'Interactive GIS script must parse in the browser');
  assert.match(js,/boardwalkSegments/);
  assert.match(js,/NPS mapped boardwalk/);
  assert.match(js,/boardwalkLayer=L\.layerGroup\(\)/);
  assert.match(js,/L\.polyline\(lines/);
  assert.match(js,/boardwalkToggle\?\.checked/);
  assert.match(js,/function renderWalkDetails\(/);
  assert.match(js,/No route or directions are drawn between the parking polygon/);
  assert.match(js,/boardwalks\|\|\[\]/);
  assert.match(css,/\.geo-boardwalk-detail/);
  assert.match(css,/\.geo-walk-stages/);
  assert.doesNotMatch(js,/L\.Routing\.control/);
});
