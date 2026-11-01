'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {
  PLAYALINDA_GIS,RAMP_LOTS,playalindaLotAccess,buildGeographicViewing,
  validFlorida
}=require('../lib/space-coast-geo');
const {VIEWPOINTS,viewAccess,npsLotClosure}=require('../lib/space-coast-decision');
const now=Date.parse('2026-11-01T16:30:00Z');
const launch={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name:'Falcon 9 | Example',pad:'SLC-40',lat:28.56194122,lon:-80.57735736,
  net:'2026-11-03T17:00:00Z',netPrecision:'minute'};
const nps=(alerts=[],verified=true)=>({alerts,verified,checkedAt:new Date(now).toISOString()});
function views(alerts=[],verified=true) {
  return VIEWPOINTS.map(v=>viewAccess(v,launch,alerts,verified,{now}));
}
const parking=()=>PLAYALINDA_GIS.lots;

test('all 13 Playalinda NPS public GIS polygons match independent FHWA facility IDs and mileposts',()=>{
  const ids=['60815','60817','60818','60819','60820','60827','60826',
    '60829','60831','60832','60833','60834','60835'];
  const mileposts=[.26,.43,.61,.75,1.25,1.44,1.65,2.16,2.82,3.04,3.59,3.85,4.18];
  assert.equal(parking().length,13);
  assert.match(PLAYALINDA_GIS.parkingLayer,/mapservices\.nps\.gov/);
  assert.match(PLAYALINDA_GIS.fHwaRouteInventory,/fhwa\.dot\.gov/);
  const identities=new Set();
  for (const lot of parking()) {
    const index=lot.number-1;
    assert.ok(index>=0&&index<13);
    assert.equal(lot.facilityId,ids[index]);
    assert.equal(lot.roadMilepost,mileposts[index]);
    assert.equal(lot.gisOpenStatus,'Unknown','NPS GIS cannot establish live lot access');
    assert.equal(lot.geometryRole,'nps-mapped-parking-footprint');
    assert.ok(validFlorida(lot.lat,lot.lon));
    assert.ok(Array.isArray(lot.polygons)&&lot.polygons.length>=1);
    const vertices=lot.polygons.flat();
    assert.ok(vertices.length>=4);
    for(const [lon,lat] of vertices) assert.ok(validFlorida(lat,lon),'polygon vertex outside Florida');
    const bounds=[Math.min(...vertices.map(v=>v[0])),Math.max(...vertices.map(v=>v[0])),
      Math.min(...vertices.map(v=>v[1])),Math.max(...vertices.map(v=>v[1]))];
    assert.ok(lot.lon>=bounds[0]&&lot.lon<=bounds[1]);
    assert.ok(lot.lat>=bounds[2]&&lot.lat<=bounds[3]);
    assert.ok(Number.isFinite(Date.parse(lot.sourceEditedAt)));
    identities.add(lot.id);
  }
  assert.equal(identities.size,13);
  assert.deepEqual([...RAMP_LOTS].sort((a,b)=>a-b),[2,3,8,10,11,12]);
});

test('official NPS Playalinda road corridor follows road GIS, not invented straight line',()=>{
  const road=PLAYALINDA_GIS.policyCorridor;
  assert.equal(road.type,'LineString');
  assert.ok(road.coordinates.length>=12);
  assert.deepEqual(road.routeFacilityIds,['60798','60814']);
  assert.ok(road.gateSnappedErrorDegrees<.0005);
  assert.ok(road.lot1SnappedErrorDegrees<.0005);
  for(const [lon,lat] of road.coordinates) assert.ok(validFlorida(lat,lon));
  assert.match(road.caveat,/not represent observed traffic, live closure/i);
  assert.match(PLAYALINDA_GIS.npsPolicy,/nps\.gov/);
});

test('Park Service beach south of Lot 4 foot-access rule does not close Lot 4 parking',()=>{
  const alerts=[{category:'Park Closure',title:'Temporary launch restrictions',
    description:'Parking areas 1, 2 and 3 will be closed. The beach south of parking area 4 will be off limits to foot traffic.'}];
  assert.equal(npsLotClosure(alerts,1,1),true);
  assert.equal(npsLotClosure(alerts,2,2),true);
  assert.equal(npsLotClosure(alerts,3,3),true);
  assert.equal(npsLotClosure(alerts,4,4),false);
  const v=views(alerts);
  const geo=buildGeographicViewing(launch,v,nps(alerts),now);
  for(let i=1;i<=3;i++)assert.equal(geo.points.find(p=>p.id==='playalinda-lot-'+i).level,'closed');
  const four=geo.points.find(p=>p.id==='playalinda-lot-4');
  assert.notEqual(four.level,'closed');
  assert.equal(four.navigation,null);
});

test('one closed lot cannot automatically close all other lots in the same broader group',()=>{
  const alert=[{category:'Park Closure',title:'NPS lot #8 closure',
    description:'Parking lot #8 is closed for repair. Other facilities remain subject to security restrictions.'}];
  const geo=buildGeographicViewing(launch,views(alert),nps(alert),now);
  assert.equal(geo.points.find(p=>p.number===8).level,'closed');
  assert.notEqual(geo.points.find(p=>p.number===9).level,'closed');
  assert.equal(geo.points.find(p=>p.number===9).level,'unknown');
  assert.equal(geo.points.find(p=>p.number===9).reason.includes('group'),true);
  const other=buildGeographicViewing(launch,views([],false),nps([],false),now);
  assert.ok(other.points.filter(p=>p.category==='beach-parking').every(p=>p.level==='unknown'));
});

test('every numbered lot has NPS GIS identity, accessibility caveat, pad geometry and correctly typed GeoJSON',()=>{
  const g=buildGeographicViewing(launch,views(),nps(),now);
  assert.equal(g.playalindaInventory.count,13);
  assert.equal(g.playalindaInventory.gisStatus,'official-lot-geometry-but-live-access-unknown');
  const lots=g.points.filter(x=>x.category==='beach-parking');
  assert.equal(lots.length,13);
  assert.ok(lots.every(x=>x.coordinateRole==='nps-verified-parking-footprint'));
  assert.ok(lots.every(x=>x.accessibility.accessOpenVerified===false));
  assert.ok(lots.every(x=>x.accessibility.routeVerified===false));
  assert.ok(lots.every(x=>x.navigation===null));
  assert.ok(lots.every(x=>x.geometry?.miles>0));
  assert.deepEqual(lots.filter(x=>x.accessibility.beachRampInOfficialFaq).map(x=>x.number),[2,3,8,10,11,12]);
  assert.equal(g.geojson.features.filter(x=>x.geometry.type==='Polygon').length,13);
  assert.equal(g.geojson.features.filter(x=>x.geometry.type==='LineString').length,1);
  assert.equal(g.geojson.features.filter(x=>x.geometry.type==='Point').length,20);
  const policy=g.geojson.features.find(x=>x.properties.category==='road-policy-reference');
  assert.equal(policy.properties.liveClosure,false);
  const p=g.geojson.features.find(x=>x.properties.id==='playalinda-lot-8-parking-polygon');
  assert.equal(p.properties.currentOpeningInGis,'Unknown');
  assert.equal(p.geometry.type,'Polygon');
});

test('real viewing-area NWS evidence stays site-scoped and withheld outside verified forecast window',()=>{
  const forecasts=[
    {id:'titusville',name:'Space View Park',status:'ok',cloudStatus:'ok',
      cloudCoverPercent:24,forecastUpdatedAt:new Date(now).toISOString(),
      checkedAt:new Date(now).toISOString(),
      assessment:{level:'good',label:'Surface sky looks favorable'},
      period:{shortForecast:'Mostly Sunny'},sourceUrl:'https://api.weather.gov/gridpoints/MLB/42,72'},
    {id:'playalinda',name:'Lot 8 area',status:'ok',cloudStatus:'ok',
      cloudCoverPercent:56,checkedAt:new Date(now).toISOString(),
      assessment:{level:'mixed',label:'Cloudy'},period:{shortForecast:'Mostly Cloudy'},
      sourceUrl:'https://api.weather.gov/gridpoints/MLB/44,73'},
    {id:'rotary',name:'Rotary',status:'not-in-forecast-window',
      cloudStatus:'no-exact-window',assessment:{level:'unknown'}}
  ];
  const g=buildGeographicViewing(launch,views(),nps(),now,forecasts);
  assert.equal(g.points.find(x=>x.id==='space-view').weather.cloudCoverPercent,24);
  assert.equal(g.points.find(x=>x.id==='rotary').weather.cloudCoverPercent,null);
  assert.equal(g.points.find(x=>x.id==='playalinda-lot-1').weather.cloudCoverPercent,56);
  assert.equal(g.points.find(x=>x.id==='playalinda-lot-13').weather.cloudCoverPercent,56);
  assert.match(g.points.find(x=>x.id==='playalinda-lot-8').weather.evidenceNote,/represents the beach district/);
  assert.ok(g.points.find(x=>x.id==='ksc-visitor').weather==null);
  assert.match(g.weatherComparisonSource,/not launch approval/);
});

test('site map actually includes NPS parking footprints and policy controls, never live closure claim',()=>{
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const map=fs.readFileSync(path.join(root,'geo-map.js'),'utf8');
  assert.match(html,/id="geo-playalinda"/);
  assert.match(html,/id="geo-lot-grid"/);
  assert.match(html,/name="geo-lot-filter" value="ramps"/);
  assert.match(html,/id="geo-road-toggle"/);
  assert.match(map,/L\.polygon\(paths/);
  assert.match(map,/road\.coordinates\.map/);
  assert.match(map,/accessible beach ramps specifically named in the NPS FAQ/i);
  assert.match(map,/policyLine\.bindPopup/);
  assert.match(map,/NOT live gate status/i);
  assert.doesNotMatch(map,/window\.navigator\.geolocation\.watchPosition/);
});
