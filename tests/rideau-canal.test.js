'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const raw=read('data/rideau-canal/locations.json');
const d=JSON.parse(raw),html=read('public/rideau-canal/index.html');
const js=read('public/assets/rideau-canal.js'),css=read('public/assets/rideau-canal.css');

test('source inventory and public mirror are identical',()=>{
  assert.equal(read('public/assets/rideau-locations.json'),raw);
  assert.equal(d.schemaVersion,1);
  assert.match(d.sourcePortal,/^https:\/\/parks\.canada\.ca\//);
});
test('the 24 staffed station groups are not the 26 operational lock locations',()=>{
  assert.equal(d.statedParksCanadaStationCount,24);
  assert.equal(d.lockLocations.length,26);
  assert.equal(new Set(d.lockLocations.map(x=>x.groupId)).size,24);
  assert.equal(d.lockLocations.reduce((n,x)=>n+x.chambers,0),47);
  assert.equal(d.bridges.length,15);
  assert.equal(d.visitorOnly.length,1);
  assert.equal(d.visitorOnly[0].name,'Colonel By Island');
  assert.equal(d.visitorOnly[0].kind,'visitor-only');
  assert.deepEqual(d.lockLocations.filter(x=>x.groupId==='nicholsons').map(x=>x.id),['lower-nicholsons','upper-nicholsons']);
  assert.deepEqual(d.lockLocations.filter(x=>x.groupId==='beveridges').map(x=>x.id),['lower-beveridges','upper-beveridges']);
  assert.equal(d.lockLocations.filter(x=>x.branch==='tay').length,2);
  assert.equal(d.lockLocations.filter(x=>x.branch==='main').length,24);
  assert.equal(d.lockLocations.find(x=>x.id==='hogs-back').guardChamberIncluded,true);
});
test('each index row has stable identity, source and no unsourced map point',()=>{
  const ids=new Set();
  d.lockLocations.forEach((x,i)=>{
    assert.ok(!ids.has(x.id),x.id);ids.add(x.id);
    assert.equal(x.portalOrder,i+1);
    assert.ok(Number.isInteger(x.chambers)&&x.chambers>=1);
    assert.match(x.sourceUrl,/^https:\/\/parks\.canada\.ca\/lhn-nhs\/on\/rideau\//);
    if(!x.profileVerified)assert.equal(x.visit,undefined,x.id);
  });
  for(const x of [...d.bridges,...d.visitorOnly]){
    assert.equal(x.coordinates,null);
    assert.match(x.sourceUrl,/^https:\/\/parks\.canada\.ca\//);
  }
});
test('seven audited destinations have exact official places, channel reference and narrative',()=>{
  const visited=d.lockLocations.filter(x=>x.visit);
  assert.equal(visited.length,7);
  assert.deepEqual(visited.map(x=>x.id).sort(),['ottawa','merrickville','smiths-falls-combined','newboro','chaffeys','jones-falls','kingston-mills'].sort());
  for(const p of visited){
    assert.notEqual(p.sourceUrl,d.sourcePortal);
    assert.match(p.visit.address,/, Ontario, Canada$/);
    assert.match(p.visit.gps,/^\d+°\d+'\d+"N \d+°\d+'\d+"W$/);
    assert.ok(p.visit.coordinates.lat>44&&p.visit.coordinates.lat<46);
    assert.ok(p.visit.coordinates.lon< -75&&p.visit.coordinates.lon> -77);
    assert.ok(p.visit.distanceOttawaKm>=0&&p.visit.distanceOttawaKm<=202.1);
    assert.ok(p.visit.summary.length>=65&&p.visit.interpretiveTip.length>=40);
    assert.ok(p.visit.timeBudgets.length&&p.visit.interests.length);
  }
});
test('place photography is exact or clearly context-labelled, and licensed',()=>{
  const photos=d.lockLocations.filter(x=>x.visit?.photo);
  assert.ok(photos.length>=3);
  for(const p of photos){
    const x=p.visit.photo;
    assert.match(x.source,/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    assert.match(x.licenseUrl,/^https:\/\//);
    assert.ok(x.caption.length>20&&x.credit.length>5&&x.file.endsWith('.jpg'));
  }
  assert.match(d.lockLocations.find(x=>x.id==='jones-falls').visit.photo.caption,/1952/);
  assert.match(d.lockLocations.find(x=>x.id==='merrickville').visit.photo.caption,/not a view of the lock chambers/);
  assert.match(js,/token!==photoToken/);
  assert.match(js,/probe\.onerror/);
});
test('launch candidate has canonical metadata and no-script source directory',()=>{
  assert.doesNotMatch(html,/<meta name="robots" content="noindex/);
  assert.ok(html.includes('rideau-canal/#app'));
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/rideau-canal\//);
  assert.ok(/<title>([^<]+)<\/title>/.exec(html)[1].length<=60);
  assert.ok(/<meta name="description" content="([^"]+)"/.exec(html)[1].length<=158);
  assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
  assert.match(html,/October 12, 2026/);
  assert.match(html,/2027 hours have not been verified/);
  assert.match(html,/id="static-stops"/);
  for(const name of ['Ottawa Locks','Merrickville','Smiths Falls Combined','Newboro','Chaffeys','Jones Falls','Kingston Mills'])assert.ok(html.includes(name),name);
  assert.match(html,/https:\/\/www\.google\.com\/maps\/search\/\?api=1/);
  assert.ok(![raw,html,js,css].some(s=>s.includes(String.fromCharCode(8212))),'no em dashes');
});
test('three journeys are distinct and route assumptions fail safely',()=>{
  for(const mode of ['visit','cruise','paddle'])assert.ok(html.includes('data-mode="'+mode+'"'));
  for(const id of ['time-budget','interest','cruise-from','cruise-to','paddle-context','feature-name','map-fallback','directory-body'])assert.ok(html.includes('id="'+id+'"'));
  assert.match(js,/window\.VisitorMapLinks\.placeSearch/);
  assert.doesNotMatch(js,/verifiedDirections\(/);
  assert.ok(js.includes('Engine.planCruise(journeyGraph,model'));
  assert.ok(js.includes('Engine.planPaddle(journeyGraph,state.paddleRoute)'));
  assert.match(js,/readUrl\(\)/);assert.match(js,/syncUrl\(\)/);
  assert.match(js,/tileerror/);
  assert.match(js,/disableMap\(\)/);
  assert.doesNotMatch(js,/L\.polyline\(|L\.routing|drawRoute\(/);
  assert.match(css,/@media\(max-width:600px\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});

test('client JS parses in a real JavaScript compiler',()=>{const vm=require('node:vm');assert.doesNotThrow(()=>new vm.Script(js,{filename:'rideau-canal.js'}));});

test('all 26 named lock locations lead to exact official profile pages',()=>{
  assert.equal(d.lockLocations.filter(x=>x.profileUrlVerified).length,26);
  assert.equal(new Set(d.lockLocations.map(x=>x.sourceUrl)).size,26);
  for(const item of d.lockLocations){
    assert.notEqual(item.sourceUrl,d.sourcePortal);
    assert.match(item.sourceUrl,/^https:\/\/parks\.canada\.ca\/lhn-nhs\/on\/rideau\/visit\/posteeclusage-lockstation\/ecluse-lock-/);
  }
  assert.match(d.visitorOnly[0].sourceUrl,/\/ile-colonel-by-island$/);
  assert.match(d.bridges.find(x=>x.id==='bridge-brass-point').sourceUrl,/\/pont-brass-point-bridge$/);
  assert.match(d.lockLocations.find(x=>x.id==='smiths-falls-detached').sourceUrl,/detached-detache$/);
});
