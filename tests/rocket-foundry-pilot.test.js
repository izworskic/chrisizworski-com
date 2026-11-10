'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const model=require('../public/assets/rocket-flight-desk');
const uuid='22222222-2222-4222-8222-222222222222';
const REGIONS={
 florida:['America/New_York','https://www.nasa.gov/kennedy/','https://www.kennedyspacecenter.com/launches-and-events/see-a-launch/'],
 california:['America/Los_Angeles','https://www.vandenberg.spaceforce.mil/','https://www.vandenberg.spaceforce.mil/About-Us/Environmental/'],
 texas:['America/Chicago','https://www.starbasetx.gov/','https://www.starbasetx.gov/'],
 virginia:['America/New_York','https://www.nasa.gov/wallops/','https://www.nasa.gov/wallops/visitor-center/'],
 alaska:['America/Anchorage','https://akaerospace.com/','https://akaerospace.com/'],
 hawaii:['Pacific/Honolulu','https://www.navy.mil/','https://cnrh.cnic.navy.mil/']
};
function data(region='florida',precision='minute',opts={}){
 const [timezone,authority,access]=REGIONS[region];
 const mission={id:uuid,region,net:'2026-11-23T15:25:00Z',netPrecision:precision,
   name:'Fixture mission',status:'To Be Confirmed'};
 return {
  ok:true,selectedRegion:region,selectedLaunchId:uuid,selectedLaunch:mission,
  region:{id:region,timezone,authority,access},
  regions:[{id:region,feedState:'ok',launches:[mission]}],
  scheduleFreshness:'recent',scheduleCheckedAt:'2026-11-08T09:00:00Z',
  coverage:{partial:false},weather:{level:'unavailable'},access:{sites:[]},
  ...opts
 };
}
test('Foundry has one canonical national rocket intent owner and six distinct regional specialist owners',()=>{
 const r=JSON.parse(read('benchmarks/tool-network-registry.json'));
 const owners=r.tools.filter(x=>x.cluster==='rocket-launch-viewing');
 assert.equal(owners.length,7);
 assert.equal(new Set(owners.map(x=>x.canonical)).size,7);
 const national=owners.find(x=>x.id==='rocket-launch-usa');
 assert.equal(national.canonical,'https://chrisizworski.com/national-tools/rocket-launch-live/');
 assert.equal(national.networkRole,'bridge');
 const group=r.cannibalizationGroups.find(g=>g.owner===national.id);
 assert.equal(group.supports.length,6);
 for(const id of group.supports){
  const regional=owners.find(x=>x.id===id);
  assert.ok(regional);
  assert.match(regional.primaryIntent,/view|access|range|facility|location/i);
  assert.ok(r.relationships.some(e=>e.from===national.id&&e.to===id&&e.type==='regional-handoff'));
  assert.ok(r.relationships.some(e=>e.from===id&&e.to===national.id&&e.type==='mission-evidence'));
 }
 const html=read('public/synced-national-tools/index.html');
 assert.match(html,/data-tool-id="rocket-launch-usa"/);
 const canon=read('public/synced-national-tools/rocket-launch-live/index.html');
 assert.match(canon,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\//);
});
test('a precise Florida target still requires mission-specific public access confirmation',()=>{
 const d=model.nextCheck(data());
 assert.equal(d.gate,'access');
 assert.equal(d.source,'specialist');
 assert.equal(d.href,'/national-tools/space-coast-launch/?launchId='+uuid+'&via=rocket-foundry&stage=access');
 assert.match(d.headline,/find a public place to watch/i);
 assert.match(d.detail,/park or beach is closed/i);
 assert.doesNotMatch(JSON.stringify(d),/go for launch|safe to travel|ticket available/i);
});
test('date/month/approximate hour -> official timing check; do not invent a launch hour',()=>{
 for(const precision of ['day','month','hour','year']){
  const d=model.nextCheck(data('california',precision));
  assert.equal(d.gate,'schedule');
  assert.equal(d.href,'https://www.vandenberg.spaceforce.mil/');
  assert.match(d.headline,/wait for a more precise liftoff time/i);
  assert.match(d.detail,/look for a published launch window/i);
 }
});
test('stale or unavailable regional feed never offers GO and prioritizes source verification',()=>{
 const stale=model.nextCheck(data('florida','minute',{scheduleFreshness:'stale'}));
 assert.equal(stale.gate,'schedule');assert.match(stale.headline,/check whether the launch time has moved/i);
 const d=data();
 d.regions[0].feedState='unavailable';
 const unavailable=model.nextCheck(d);
 assert.equal(unavailable.gate,'schedule');
 assert.match(unavailable.detail,/calendar update may be old/i);
 const noSource=model.nextCheck(null);
 assert.equal(noSource.gate,'source');
 assert.match(noSource.href,/nasa.gov/);
 assert.match(noSource.detail,/aren.t listed on national calendars/i);
});
test('hold, scrub and actual Starbase city closure take precedence over a routine viewing recommendation',()=>{
 const hold=data('virginia');
 hold.selectedLaunch.status='Hold';
 assert.match(model.nextCheck(hold).headline,/countdown stopped/i);
 hold.selectedLaunch.status='Scrub';
 assert.match(model.nextCheck(hold).detail,/earlier target time/i);
 const closed=data('texas');closed.access={liveOfficialNotice:{state:'closed'}};
 assert.equal(model.nextCheck(closed).gate,'access');
 assert.match(model.nextCheck(closed).headline,/closure/i);
 assert.equal(model.nextCheck(closed).href,'/starbase-rocket-launch-viewing/?launchId='+uuid+'&via=rocket-foundry&stage=access');
});
test('restricted Pacific ranges never imply legal viewing at the military pad',()=>{
 for(const region of ['alaska','hawaii']){
  const d=model.nextCheck(data(region));
  assert.equal(d.gate,'access');
  assert.equal(d.source,'specialist');
  assert.match(d.headline,/watch this launch in person/i);
  assert.match(d.detail,/pad pin onto base property/i);
 }
});
test('a missing mission does not imply the range has stopped flying',()=>{
 const d=data('california');
 d.selectedLaunch=null;d.selectedLaunchId=null;d.regions[0].launches=[];
 const n=model.nextCheck(d);
 assert.equal(n.gate,'schedule');
 assert.match(n.detail,/does not mean the range has stopped launching/i);
});
test('Foundry handoff is visible, linked, versioned and tracked without identity collection',()=>{
 const html=read('public/synced-national-tools/rocket-launch-live/index.html');
 const css=read('public/assets/rocket-flight-desk.css');
 const js=read('public/assets/rocket-engagement-funnel.js');
 assert.match(html,/id="rl-flight-next"/);
 assert.match(html,/id="rl-flight-next-link"/);
 assert.match(html,/rocket-flight-desk\.js\?v=20261110-voice-v1/);
 assert.match(html,/rocket-flight-desk\.css\?v=20261108-foundry-v2/);
 assert.match(html,/rocket-engagement-funnel\.js\?v=20261108-schedule-first-v1/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/id="rl-coast-map"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(js,/rl-flight-next-link/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie/);
 assert.equal((html.match(/src="\/_vercel\/insights\/script.js"/g)||[]).length,1);
});
const publicSite={id:'published-park',name:'Source-linked park',state:'candidate',
  source:'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm',
  directionsAllowed:true};
const currentSky={level:'assessed',places:[{id:'a',status:'ok',cloudStatus:'ok',
  cloudCoverPercent:42,updatedAt:'2026-11-08T08:30:00Z',assessment:{level:'fair'},
  period:{startTime:'2026-11-11T15:00:00Z',endTime:'2026-11-11T16:00:00Z',shortForecast:'Cloudy'}}]};
test('documented public viewpoint advances to viewing options, then mission-time sky',()=>{
 const d=data('virginia');d.selectedLaunch.net='2026-11-11T15:25:00Z';d.access={sites:[publicSite]};
 const first=model.nextCheck(d);
 assert.equal(first.gate,'viewing');
 assert.match(first.detail,/haven.t confirmed they.re open/i);
 assert.match(first.href,new RegExp('launchId='+uuid));
 d.weather=currentSky;
 const second=model.nextCheck(d);
 assert.equal(second.gate,'sky');
 assert.equal(second.href,'#rl-regional-sky');
 assert.equal(second.destination,'spectator_weather');
 assert.match(second.detail,/does not prove that a viewing site is open/i);
 assert.notEqual(first.href,second.href);
});
test('a stale, off-target or unsuitable NWS sample cannot advance to a sky decision',()=>{
 const d=data('california');
 d.selectedLaunch.net='2026-11-11T15:25:00Z';
 d.access={sites:[publicSite]};
 d.weather=currentSky;
 assert.equal(model.nextCheck(d).gate,'sky');
 d.weather={...currentSky,places:[{...currentSky.places[0],
   period:{...currentSky.places[0].period,startTime:'2026-11-12T15:00:00Z',endTime:'2026-11-12T16:00:00Z'}}]};
 assert.equal(model.nextCheck(d).gate,'viewing','a forecast for another target hour is not usable');
 d.weather={...currentSky,places:[{...currentSky.places[0],
   updatedAt:'2026-11-04T08:00:00Z'}]};
 assert.equal(model.nextCheck(d).gate,'viewing','stale issue time cannot justify sky stage');
 d.weather={...currentSky,places:[{...currentSky.places[0],
   assessment:{level:'poor'}}]};
 assert.equal(model.nextCheck(d).gate,'viewing','weak surface evidence is not a supported comparison');
 d.selectedLaunch.net='2026-11-23T15:25:00Z';
 d.weather=currentSky;
 assert.equal(model.nextCheck(d).gate,'viewing','outside the seven-day NWS horizon');
});
test('KSC current exact event listing advances to admission choices, never a ticket claim',()=>{
 const d=data();
 const first=model.nextCheck(d,{kscEvent:'matched',kscLaunchId:uuid});
 assert.equal(first.gate,'viewing');
 assert.match(first.headline,/Kennedy has announced viewing for this launch/i);
 assert.match(first.detail,/Check ticket availability/i);
 const mismatched=model.nextCheck(d,{kscEvent:'matched',kscLaunchId:'33333333-3333-4333-8333-333333333333'});
 assert.equal(mismatched.gate,'access');
 const stale=model.nextCheck({...d,scheduleFreshness:'stale'},{kscEvent:'matched',kscLaunchId:uuid});
 assert.equal(stale.gate,'schedule');
});
test('conflicting mission IDs or missing regional roster cannot silently display another launch',()=>{
 const wrong=data();wrong.selectedLaunchId='11111111-1111-4111-8111-111111111111';
 assert.equal(model.decide(wrong).launchId,null);
 assert.equal(model.nextCheck(wrong).gate,'schedule');
 const missing=data();missing.regions[0].launches=[];
 assert.equal(model.decide(missing).launchId,null);
 const wrongRegion=data('california');
 wrongRegion.selectedLaunch.region='florida';
 assert.equal(model.nextCheck(wrongRegion).gate,'schedule');
});
test('all six regional links preserve the selected mission, including static Vandenberg',()=>{
 const paths=new Set();
 for(const region of Object.keys(REGIONS)){
  const d=model.nextCheck(data(region));
  if(d.source==='specialist'){
   const u=new URL(d.href,'https://chrisizworski.com');
   assert.equal(u.searchParams.get('launchId'),uuid);
   assert.equal(u.searchParams.get('via'),'rocket-foundry');
   assert.equal(u.searchParams.get('stage'),d.gate);
   paths.add(u.pathname);
  }
 }
 assert.equal(paths.size,6,'all six regions have mission-bound specialist handoffs');
 const california=model.regionalHref('california',uuid,'viewing');
 assert.match(california,/vandenberg-rocket-launch-viewing\/\?launchId=/);
 assert.equal(model.regionalHref('california','bad','viewing'),'/vandenberg-rocket-launch-viewing/');
});
test('destination instrumentation is loaded by all regional guides, not inferred from URLs',()=>{
 const guides=[
  'public/vandenberg-rocket-launch-viewing/index.html',
  'public/synced-national-tools/space-coast-launch/index.html',
  'public/starbase-rocket-launch-viewing/index.html',
  'public/wallops-rocket-launch-viewing/index.html',
  'public/kodiak-rocket-launch-viewing/index.html',
  'public/barking-sands-rocket-launch-viewing/index.html'];
 for(const p of guides)assert.match(read(p),/rocket-foundry-handoff\.js/);
 const receipt=read('public/assets/rocket-foundry-handoff.js');
 assert.match(receipt,/selectedLaunchId===requested/);
 assert.match(receipt,/Rocket Foundry Mission Restored/);
 assert.doesNotMatch(receipt,/localStorage|sessionStorage|document\.cookie/);
 const old=read('public/synced-national-tools/rocket-launch-live/app.js');
 assert.match(old,/vandenberg-rocket-launch-viewing\/'\)\?'california'/);
});
