'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const engine=require('../public/assets/rideau-journey-engine.js');
const nav=require('../data/rideau-canal/navigation-v2.json');
const places=require('../data/rideau-canal/locations.json');

test('published navigation snapshot mirrors the authoritative source input',()=>{
  assert.equal(fs.readFileSync('public/assets/rideau-navigation.json','utf8'),fs.readFileSync('data/rideau-canal/navigation-v2.json','utf8'));
  assert.equal(nav.schemaVersion,2);
  assert.equal(nav.mainline.length,25);
  assert.equal(nav.tay.length,3);
  assert.equal(nav.mainlineKmTotal,202.1);
  assert.equal(nav.status,'historic-planning-evidence-only');
  assert.equal(nav.operationArchive.futureSeasonVerified,false);
});
test('mainline forward and reverse channel references match',()=>{
  const a=engine.planCruise(nav,places,{from:'ottawa',to:'jones-falls',speedKmh:6});
  assert.equal(a.ok,true);
  assert.equal(a.distanceKm,159);
  assert.equal(a.underwayHours,26.5);
  assert.equal(a.interpretation,'official-channel-reference');
  assert.ok(a.lockSites.length>10);
  assert.ok(a.bridges.some(b=>b.id==='pretoria'));
  assert.equal(a.arrivalTime,null);assert.equal(a.lockageMinutes,null);
  assert.equal(a.scheduleState,'unverified-for-future-travel');
  assert.match(a.notices.join(' '),/not a charted route or booked passage/);
  const b=engine.planCruise(nav,places,{from:'jones-falls',to:'ottawa',speedKmh:6});
  assert.equal(b.distanceKm,a.distanceKm);
  assert.equal(b.lockSites[0].id,'jones-falls');
  assert.equal(b.lockSites.at(-1).id,'ottawa');
});
test('Tay Canal junction is explicitly estimated and has independent dimensions',()=>{
  const a=engine.planCruise(nav,places,{from:'ottawa',to:'perth-basin',speedKmh:8});
  assert.equal(a.distanceKm,120.4);
  assert.equal(a.interpretation,'branch-connection-estimate');
  assert.match(a.notices.join(' '),/107.5 km/);
  assert.ok(a.lockSites.some(p=>p.id==='lower-beveridges'));
  const b=engine.planCruise(nav,places,{from:'perth-basin',to:'lower-beveridges',speedKmh:4});
  assert.equal(b.distanceKm,9.7);
  assert.equal(b.interpretation,'official-channel-reference');
});
test('unsupported inputs, vessel checks and historic hours cannot grant passage',()=>{
  assert.equal(engine.planCruise(nav,places,{from:'ottawa',to:'ottawa'}).ok,false);
  assert.equal(engine.planCruise(nav,places,{from:'ottawa',to:'invented'}).ok,false);
  assert.equal(engine.planCruise(null,places,{from:'ottawa',to:'newboro'}).ok,false);
  let p=engine.planCruise(nav,places,{from:'ottawa',to:'newboro',speedKmh:15});
  assert.equal(p.assumedSpeedKmh,null);assert.equal(p.underwayHours,null);
  p=engine.planCruise(nav,places,{from:'ottawa',to:'kingston-causeway',
    vessel:{lengthM:32,widthM:9,draftM:1.6,airDraftM:7}});
  assert.equal(p.vessel.status,'possible-restriction');
  assert.ok(p.vessel.warnings.length>=3);
  assert.equal(p.arrivalTime,null);
  assert.equal(engine.classifyVessel(nav,{lengthM:7,widthM:2,draftM:.5,airDraftM:1}).status,'not-cleared');
  assert.equal(engine.classifyVessel(nav,{lengthM:-4}).status,'invalid-input');
});
test('Parks Canada paddling itineraries cannot be replaced by channel route arithmetic',()=>{
  const tay=engine.planPaddle(nav,'tay-marsh'),lake=engine.planPaddle(nav,'upper-brewers-newboro');
  assert.deepEqual([tay.km,tay.days],[12,1]);
  assert.deepEqual([lake.km,lake.days],[39,2]);
  assert.equal(lake.geometry,null);assert.equal(lake.travelTime,null);
  assert.match(lake.hazards.join(' '),/Jones Falls/);
  assert.equal(tay.putIn.name,'Perth Basin');
  assert.equal(tay.takeOut.name,'Beveridges Lockstation');
  assert.equal(engine.planPaddle(nav,'nonexistent').ok,false);
  assert.notEqual(Math.round((176.5-140.8)*10)/10,lake.km);
});
test('display units never mutate the official source measurements',()=>{
  assert.equal(engine.distance(12,'km'),'12.0 km');
  assert.equal(engine.distance(12,'mi'),'7.5 mi');
  assert.equal(engine.distance(0,'mi'),'0.0 mi');
  assert.equal(engine.distance(-2),'Not verified');
  assert.equal(nav.paddling[0].officialKm,12);
});
test('visitor interface provides route, date, dimensions and photo-safe source contracts',()=>{
  const h=fs.readFileSync('public/rideau-canal/index.html','utf8');
  const s=fs.readFileSync('public/assets/rideau-canal.js','utf8');
  for(const id of ['cruise-from','cruise-to','rideau-speed','rideau-units','rideau-trip-date','rideau-length','rideau-beam','rideau-draft','rideau-air-draft','rideau-paddle-route','paddle-result','channel-stops','channel-bridge-list'])assert.ok(h.includes('id="'+id+'"'),id);
  assert.ok(h.includes('/assets/rideau-journey-engine.js'));
  assert.match(s,/Engine\.planCruise\(journeyGraph,model/);
  assert.match(s,/Engine\.planPaddle\(journeyGraph,state\.paddleRoute\)/);
  assert.match(s,/paddle-official/);
  assert.match(s,/channel-source/);
  assert.doesNotMatch(s,/L\.polyline\(|L\.routing/);
});
