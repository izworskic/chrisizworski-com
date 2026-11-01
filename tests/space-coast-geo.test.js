'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  REFERENCE_POINTS, validFlorida, groundGeometry, safePad, buildGeographicViewing
} = require('../lib/space-coast-geo');
const { VIEWPOINTS, viewAccess, normalizeLaunch } = require('../lib/space-coast-decision');

const launch = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  name: 'Falcon 9 | Example Payload',
  pad: 'Space Launch Complex 40', padId: 80,
  lat: 28.56194122, lon: -80.57735736,
  net: '2026-11-03T17:00:00Z', netPrecision: 'minute',
  status: 'Go',
};
const NOW = Date.parse('2026-11-01T15:00:00Z');
const access = {
  verified: true, checkedAt: '2026-11-01T14:30:00Z',
  alerts: []
};
const views = VIEWPOINTS.map(v => viewAccess(v,launch,[],true,{now:NOW}));
const geo = (l=launch,v=views,n=access) => buildGeographicViewing(l,v,n,NOW);

test('curated park map references, official entrances, and restricted pad remain distinct', () => {
  assert.equal(REFERENCE_POINTS.length,6);
  assert.equal(REFERENCE_POINTS.filter(p=>p.category==='public-viewpoint').length,4);
  assert.equal(REFERENCE_POINTS.filter(p=>p.coordinateRole==='verified-public-entrance').length,2);
  const ids = REFERENCE_POINTS.map(x=>x.id);
  assert.equal(new Set(ids).size,ids.length);
  for (const p of REFERENCE_POINTS) {
    assert.ok(validFlorida(p.lat,p.lon),p.id);
    assert.match(p.geographicSource,/^https:\/\//);
    assert.match(p.accessSource,/^https:\/\//);
    assert.ok(p.geographyCaveat.length>25);
    assert.ok(['site-reference','verified-public-entrance'].includes(p.coordinateRole));
    assert.ok(['address','coordinates'].includes(p.navigation.type));
    assert.notEqual(p.navigation.value.length,0);
  }
  const gate=REFERENCE_POINTS.find(x=>x.id==='playalinda-gate');
  assert.equal(gate.coordinateRole,'verified-public-entrance');
  assert.match(gate.geographicSource,/nps\.gov/);
  assert.match(gate.geographyCaveat,/NOT a beach viewing point/);
  assert.equal(gate.lat,28.645);
  assert.equal(gate.lon,-80.6834);
  const ksc=REFERENCE_POINTS.find(x=>x.id==='ksc-visitor');
  assert.equal(ksc.coordinateRole,'verified-public-entrance');
  assert.equal(ksc.navigation.value,'28.515556,-80.681667');
  assert.match(ksc.geographicSource,/kennedyspacecenter\.com/);
});

test('geometry calculates ground distance and toward-pad bearing, never a trajectory', () => {
  const spaceView=REFERENCE_POINTS.find(x=>x.id==='space-view');
  const g=groundGeometry(spaceView,launch);
  assert.ok(g.miles>10 && g.miles<20);
  assert.ok(g.bearingDegrees >= 40 && g.bearingDegrees <= 130);
  assert.ok(['E','NE','SE'].includes(g.bearingCardinal));
  assert.equal(g.method,'approximate-ground-arc');
  assert.match(g.not,/trajectory/);
  const zero=groundGeometry(spaceView,spaceView);
  assert.equal(zero.miles,0);
  assert.equal(groundGeometry({lat:0,lon:0},launch),null);
  assert.equal(groundGeometry(spaceView,{lat:null,lon:0}),null);
});

test('mission pad coordinates must be finite in Florida and explicitly present', () => {
  assert.equal(safePad(launch).padId,80);
  for(const p of [
    {...launch,lat:null},{...launch,lon:null},
    {...launch,lat:0,lon:0},{...launch,lat:28.2,lon:0},
    {...launch,lat:40,lon:-80.5},{...launch,pad:''},
    {...launch,lat:Infinity}
  ]) assert.equal(safePad(p),null);
  const ll2=normalizeLaunch({
    id:launch.id,name:launch.name,net:launch.net,
    pad:{id:80,name:'Space Launch Complex 40',latitude:null,longitude:null},
    rocket:{configuration:{name:'Falcon 9'}}
  });
  assert.equal(ll2.lat,null,'missing LL2 latitude must never silently become zero');
  assert.equal(ll2.lon,null,'missing LL2 longitude must never silently become zero');
});

test('GIS result joins only a selected mission’s already evaluated access', () => {
  const result=geo();
  assert.equal(result.coordinateSystem,'WGS84');
  assert.equal(result.version,1);
  assert.equal(result.pad.name,launch.pad);
  assert.equal(result.points.filter(x=>x.geometry).length,4);
  assert.equal(result.unlocated.length, VIEWPOINTS.length-5);
  assert.ok(result.unlocated.some(x=>x.id==='playalinda-first'));
  assert.ok(result.unlocated.some(x=>x.id==='ksc-gantry'));
  assert.equal(result.points.find(x=>x.id==='space-view').level,'candidate');
  assert.equal(result.points.find(x=>x.id==='rotary').level,'candidate');
  assert.equal(result.points.find(x=>x.id==='parrish').level,'verify');
  assert.equal(result.points.find(x=>x.id==='ksc-visitor').geometry,null);
  assert.equal(result.points.find(x=>x.id==='playalinda-gate').geometry,null);
  assert.equal(result.npsAlertsVerified,true);
  assert.equal(result.policy.kind,'published-policy-not-geofenced-closure');
  assert.match(result.safety.join(' '),/No dynamic closure geometry/);
});

test('source outages and pad-unknown records withhold access inference and geometry', () => {
  const unknown=geo({...launch,lat:null,lon:null},views,
    {verified:false,checkedAt:null});
  assert.equal(unknown.pad,null);
  assert.ok(unknown.points.every(p=>p.geometry===null));
  assert.equal(unknown.npsAlertsVerified,false);
  assert.equal(unknown.points.find(x=>x.id==='playalinda-gate').level,'unknown');
  const closureViews=views.map(v=>v.id==='space-view'?{...v,level:'closed',label:'County closure'}:v);
  const closed=geo(launch,closureViews,access);
  assert.equal(closed.points.find(x=>x.id==='space-view').level,'closed');
});

test('county Rotary launch site and Jetty after-hours controls are independently sourced', () => {
  const rotary=VIEWPOINTS.find(x=>x.id==='rotary');
  assert.match(rotary.source,/brevardfl\.gov/);
  assert.equal(viewAccess(rotary,launch,[],true,{now:NOW}).level,'candidate');
  const jetty=VIEWPOINTS.find(x=>x.id==='jetty');
  assert.equal(jetty.class,'port-hours');
  const afterHours=viewAccess(jetty,{...launch,net:'2026-11-03T04:00:00Z'},[],true,{now:NOW});
  assert.equal(afterHours.level,'unknown');
  assert.match(afterHours.reason,/7 a\.m.–9 p\.m/);
  const day=viewAccess(jetty,{...launch,net:'2026-11-03T17:00:00Z'},[],true,{now:NOW});
  assert.equal(day.level,'verify');
  assert.match(day.reason,/park pass/);
});

test('visitor page wires matching selected mission to safe CARTO map, but never creates route polygons', () => {
  const root=path.join(__dirname,'../public/synced-national-tools/space-coast-launch');
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
  const map=fs.readFileSync(path.join(root,'geo-map.js'),'utf8');
  const css=fs.readFileSync(path.join(root,'viewing.css'),'utf8');
  assert.match(html,/id="launch-geo-map"/);
  assert.match(html,/id="geo-choice-list"/);
  assert.match(html,/name="geo-intent" value="photo"/);
  assert.match(html,/geo-map\.js\?v=20261101-geo1/);
  assert.match(app,/space-coast:launch-loaded/);
  assert.match(app,/geographicViewing: d\.geographicViewing/);
  assert.match(map,/addEventListener\('space-coast:launch-loaded'/);
  assert.match(map,/fetch\('\/api\/carto-basemap-config'/);
  assert.match(map,/basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.match(map,/tile\.openstreetmap\.org/);
  assert.match(map,/not a line-of-sight or launch trajectory/);
  assert.match(map,/const directionsUrl/);
  assert.match(css,/\.geo-layout/);
  assert.doesNotMatch(map,/L\.polygon\(/);
  assert.doesNotMatch(map,/L\.geoJSON\(/);
});
