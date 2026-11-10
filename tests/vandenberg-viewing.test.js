'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const model=require('../lib/vandenberg-viewing');

const root=path.resolve(__dirname,'..');
const read=name=>fs.readFileSync(path.join(root,name),'utf8');
const PAD={lat:34.632,lon:-120.611,padId:16,name:'Space Launch Complex 4E'};
const NOW=Date.parse('2026-11-03T12:00:00Z');
const LAUNCH={...PAD,id:'54d471e8-695c-4fa7-a3cf-dbd8b389e8ae',
  name:'Falcon 9 Block 5 | USSF-432',net:'2026-11-07T00:46:00Z',
  netPrecision:'minute',status:'Go for Launch',sourceStale:false};
const FORECAST={slip:{scenarios:[0,1,3,6].map(offsetHours=>({
  offsetHours,targetAt:new Date(Date.parse(LAUNCH.net)+offsetHours*3600000).toISOString(),
  status:'assessed',places:[
    {id:'lompoc',cloudCoverPercent:15,cloudStatus:'ok',assessment:{level:'good'}},
    {id:'surf',cloudCoverPercent:75,cloudStatus:'ok',assessment:{level:'mixed'}}
  ]
}))}};

test('six launch-viewing candidates have sourced OSM geometry and no closed hilltop',()=>{
  assert.equal(model.SITES.length,6);
  for(const site of model.SITES){
    assert.equal(typeof site.lat,'number');
    assert.equal(typeof site.lon,'number');
    assert.match(site.osm,/^https:\/\/www\.openstreetmap\.org\/(?:way|node)\/\d+$/);
    assert.match(site.source,/^https:\/\//);
    assert.match(site.address,/Lompoc/i);
  }
  const names=model.SITES.map(s=>s.name).join(' ');
  assert.doesNotMatch(names,/Harris Grade|Hawk.s Nest|Marshallia|Highway 246/i);
  assert.ok(model.CLOSED.some(s=>/Harris Grade/.test(s)));
  assert.ok(model.CLOSED.some(s=>/Hawk/.test(s)));
});

test('geodesic distance and compass bearing are based only on supported pad coordinates',()=>{
  const g=model.distanceBearing({lat:34.6895280,lon:-120.5992314},PAD);
  assert.ok(g.miles>3&&g.miles<5);
  assert.ok(g.bearing>=175&&g.bearing<=205);
  assert.equal(model.compass(g.bearing),'S');
  assert.equal(model.selectedPad({...LAUNCH,lat:null}),null);
  assert.equal(model.selectedPad({...LAUNCH,padId:null}),null);
  assert.equal(model.selectedPad({...LAUNCH,lat:28.6,lon:-80.6}),null);
  assert.ok(model.selectedPad(LAUNCH));
});

test('Surf Beach hours and Ocean Park sunset remove night directions, even if weather looks clear',()=>{
  const data=model.buildVandenbergViewing(LAUNCH,FORECAST,NOW);
  assert.equal(data.status,'candidate-review');
  assert.deepEqual(data.scenarios.map(x=>x.offsetHours),[0,1,3,6]);
  const initial=data.scenarios[0].candidates;
  const late=data.scenarios[2].candidates;
  assert.equal(initial.find(x=>x.id==='surf-station').access.state,'verify');
  assert.equal(late.find(x=>x.id==='surf-station').access.state,'after-hours');
  assert.equal(late.find(x=>x.id==='surf-station').access.directionsAllowed,false);
  assert.equal(late.find(x=>x.id==='ocean-park').access.state,'after-hours');
  assert.equal(late.find(x=>x.id==='ocean-park').access.directionsAllowed,false);
  const surf=data.sites.find(x=>x.id==='surf-station');
  assert.equal(model.accessAt(surf,'2026-11-08T01:45:00Z').state,'boundary',
    'The final 30 minutes before public beach closure cannot support viewing arrival.');
  const ocean=data.sites.find(x=>x.id==='ocean-park');
  assert.equal(model.accessAt(ocean,LAUNCH.net).state,'boundary',
    'Sunset-boundary buffer withholds directions even before actual sunset.');
  assert.equal(late.find(x=>x.id==='hancock').access.state,'verify',
    'College is a candidate requiring campus parking checks, not a verified open event site.');
  assert.equal(data.sites.find(x=>x.id==='surf-station').accessSource,model.BEACH);
  assert.equal(data.sites.find(x=>x.id==='hancock').accessSource,model.COLLEGE);
});

test('weather remains a proximate NWS sample, never a site-level or flight visibility claim',()=>{
  const data=model.buildVandenbergViewing(LAUNCH,FORECAST,NOW);
  const coast=data.sites.find(x=>x.id==='ocean-park');
  const town=data.sites.find(x=>x.id==='beattie');
  assert.equal(coast.reference.id,'surf');
  assert.equal(town.reference.id,'lompoc');
  assert.ok(coast.reference.miles<1);
  assert.equal(data.scenarios[0].candidates.find(x=>x.id==='ocean-park').forecast.cloud,75);
  assert.equal(data.scenarios[0].candidates.find(x=>x.id==='beattie').forecast.cloud,15);
  assert.match(data.weatherNote,/does not establish/);
  assert.match(data.method,/NOT/i);
  const unsafe=model.forecastAt({id:'surf',miles:0.4},{
    places:[{id:'surf',cloudStatus:'ok',cloudCoverPercent:5,assessment:{level:'poor'}}]});
  assert.equal(unsafe.state,'hazard','Hazard signals must veto a low-cloud visibility recommendation');
  assert.equal(model.forecastAt(null,FORECAST.slip.scenarios[0]).state,'unavailable');
});

test('stale targets, coarse precision and held launches cannot provide time-specific recommendations',()=>{
  const a=model.buildVandenbergViewing({...LAUNCH,sourceStale:true},FORECAST,NOW);
  assert.equal(a.status,'schedule-overdue');
  assert.equal(a.scenarios.length,0);
  const b=model.buildVandenbergViewing({...LAUNCH,netPrecision:'day'},FORECAST,NOW);
  assert.equal(b.status,'time-unverified');
  assert.equal(b.scenarios.length,0);
  const held=model.buildVandenbergViewing({...LAUNCH,status:'Hold'},FORECAST,NOW);
  assert.equal(held.scenarios.length,0);
  const missing=model.buildVandenbergViewing(null,FORECAST,NOW);
  assert.equal(missing.status,'no-launch');
  assert.equal(missing.scenarios.length,0);
});

test('Python oracle independently verifies 30 geography, NOAA sun and time-zone scenarios',t=>{
  const r=spawnSync('python3',['scripts/vandenberg_viewing_oracle.py','--cases'],
    {encoding:'utf8',cwd:root,timeout:12000});
  if(r.error?.code==='ENOENT'){t.skip('Python unavailable locally; installed in CI');return;}
  assert.equal(r.status,0,r.stderr);
  const samples=JSON.parse(r.stdout).cases;
  assert.equal(samples.length,30);
  for(const row of samples){
    const site=model.SITES.find(x=>x.id===row.id);
    assert.ok(site);
    assert.deepEqual(model.distanceBearing(site,PAD),row.geometry,
      row.id+' geodesic direction and distance');
    assert.ok(Math.abs(model.solarElevation(row.targetAt,site.lat,site.lon)-
      row.solarElevation)<=0.1,row.id+' solar angle '+row.targetAt);
    assert.equal(model.accessAt(site,row.targetAt).state,row.access);
  }
});

test('release surface includes active controls, GIS map, honest site source and no extra API fetches',()=>{
  const page=read('public/synced-national-tools/rocket-launch-live/index.html');
  const script=read('public/synced-national-tools/rocket-launch-live/vandenberg.js');
  const primary=read('public/synced-national-tools/rocket-launch-live/app.js');
  const css=read('public/synced-national-tools/rocket-launch-live/styles.css');
  const api=read('api/rocket-launch-usa.js');
  assert.match(page,/id="rl-vandenberg"/);
  assert.match(page,/id="rl-vandenberg-map"/);
  assert.ok(page.indexOf('id="rl-vandenberg"')<page.indexOf('id="rocket-visuals"'),
    "The visitor viewing decision must appear before imagery and editorial coverage.");
  assert.match(page,/data-intent="photo"/);
  assert.match(page,/vandenberg\.js\?v=20261110-voice-v1/);
  assert.match(page,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\/"/);
  assert.match(script,/rocket-viewing:data/);
  assert.match(script,/setAttribute\('aria-pressed'/);
  assert.match(script,/data\.vandenbergViewing/);
  assert.match(script,/state\.line=window\.L\.polyline/);
  assert.match(script,/carto-basemap-config/);
  assert.match(script,/tile\.openstreetmap\.org/);
  assert.match(script,/scrollIntoView/);
  assert.match(script,/!DANGER\.has|DANGER\.has/);
  assert.match(primary,/CustomEvent\('rocket-viewing:data'/);
  assert.match(api,/buildVandenbergViewing\(selected,weather,now\)/);
  assert.doesNotMatch(script,/https:\/\/api\.weather\.gov|https:\/\/ll\.thespacedevs\.com/);
  assert.match(css,/\.rl-vandenberg-workspace/);
  assert.match(css,/@media\(max-width:610px\)/);
});

test('all visitor claims remain descriptive and intentionally exclude travel-time and pad-entry estimates',()=>{
  const data=model.buildVandenbergViewing(LAUNCH,FORECAST,NOW);
  assert.match(data.statusDetail,/No real-time site opening/);
  assert.match(data.confidence,/NOT live verified/);
  assert.doesNotMatch(JSON.stringify(data.scenarios),/rocketVisible|probabilityOfSeeing|driveMinutes|flightTrajectory/);
  assert.equal(data.sites.every(s=>s.padGeometry?.miles>0),true);
});
