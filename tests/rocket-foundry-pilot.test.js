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
 assert.equal(d.href,'/national-tools/space-coast-launch/');
 assert.match(d.headline,/viewing arrangements/i);
 assert.match(d.detail,/not admission/i);
 assert.doesNotMatch(JSON.stringify(d),/go for launch|safe to travel|ticket available/i);
});
test('date/month/approximate hour -> official timing check; do not invent a launch hour',()=>{
 for(const precision of ['day','month','hour','year']){
  const d=model.nextCheck(data('california',precision));
  assert.equal(d.gate,'schedule');
  assert.equal(d.href,'https://www.vandenberg.spaceforce.mil/');
  assert.match(d.headline,/Confirm an exact launch hour/i);
  assert.match(d.detail,/not enough to plan/i);
 }
});
test('stale or unavailable regional feed never offers GO and prioritizes source verification',()=>{
 const stale=model.nextCheck(data('florida','minute',{scheduleFreshness:'stale'}));
 assert.equal(stale.gate,'schedule');assert.match(stale.headline,/Reconfirm/);
 const d=data();
 d.regions[0].feedState='unavailable';
 const unavailable=model.nextCheck(d);
 assert.equal(unavailable.gate,'schedule');
 assert.match(unavailable.detail,/stale|unavailable/i);
 const noSource=model.nextCheck(null);
 assert.equal(noSource.gate,'source');
 assert.match(noSource.href,/nasa.gov/);
 assert.match(noSource.detail,/not include every/i);
});
test('hold, scrub and actual Starbase city closure take precedence over a routine viewing recommendation',()=>{
 const hold=data('virginia');
 hold.selectedLaunch.status='Hold';
 assert.match(model.nextCheck(hold).headline,/updated launch attempt/i);
 hold.selectedLaunch.status='Scrub';
 assert.match(model.nextCheck(hold).detail,/prior arrival plan/i);
 const closed=data('texas');closed.access={liveOfficialNotice:{state:'closed'}};
 assert.equal(model.nextCheck(closed).gate,'access');
 assert.match(model.nextCheck(closed).headline,/closure/i);
 assert.equal(model.nextCheck(closed).href,'/starbase-rocket-launch-viewing/');
});
test('restricted Pacific ranges never imply legal viewing at the military pad',()=>{
 for(const region of ['alaska','hawaii']){
  const d=model.nextCheck(data(region));
  assert.equal(d.gate,'access');
  assert.equal(d.source,'specialist');
  assert.match(d.headline,/public viewing is allowed/i);
  assert.match(d.detail,/Do not route to the pad/i);
 }
});
test('a missing mission does not imply the range has stopped flying',()=>{
 const d=data('california');
 d.selectedLaunch=null;d.selectedLaunchId=null;d.regions[0].launches=[];
 const n=model.nextCheck(d);
 assert.equal(n.gate,'schedule');
 assert.match(n.detail,/not confirmation the range is inactive/i);
});
test('Foundry handoff is visible, linked, versioned and tracked without identity collection',()=>{
 const html=read('public/synced-national-tools/rocket-launch-live/index.html');
 const css=read('public/assets/rocket-flight-desk.css');
 const js=read('public/assets/rocket-engagement-funnel.js');
 assert.match(html,/id="rl-flight-next"/);
 assert.match(html,/id="rl-flight-next-link"/);
 assert.match(html,/rocket-flight-desk\.js\?v=20261108-foundry-v1/);
 assert.match(html,/rocket-flight-desk\.css\?v=20261108-foundry-v1/);
 assert.match(html,/rocket-engagement-funnel\.js\?v=20261108-foundry-v1/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/id="rl-coast-map"/);
 assert.match(css,/@media\(max-width:700px\)/);
 assert.match(js,/rl-flight-next-link/);
 assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie/);
 assert.equal((html.match(/src="\/_vercel\/insights\/script.js"/g)||[]).length,1);
});