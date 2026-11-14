'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const {REGIONS,regionalAccess}=require('../lib/rocket-launch-usa');
const model=require('../public/assets/rocket-florida-access');
const desk=require('../public/assets/rocket-flight-desk');
const ID='11111111-1111-4111-8111-111111111111';
const OTHER='22222222-2222-4222-8222-222222222222';
const region=REGIONS.find(x=>x.id==='florida');
function national(kind=27){
 const launch={id:ID,region:'florida',name:'Fixture Florida mission',locationId:kind,
   net:'2026-11-11T15:25:00Z',netPrecision:'minute',status:'To Be Confirmed'};
 return {
   ok:true,region:{id:'florida',timezone:'America/New_York',authority:region.authority,
     access:region.access},selectedRegion:'florida',selectedLaunchId:ID,selectedLaunch:launch,
   scheduleFreshness:'recent',access:regionalAccess(region,launch),
   regions:[{id:'florida',feedState:'ok',launches:[launch]}],weather:{level:'unknown'}
 };
}
function detail(id=ID,{closed=false,matchedKsc=false}={}){
 return {
   ok:true,selectedLaunchId:id,next:{id},scheduleFreshness:'recent',
   accessSource:{verified:true,checkedAt:'2026-11-08T13:00:00Z'},
   viewpoints:region.sites.map(s=>({...s,level:s.id==='playalinda-south'&&closed?'closed':'candidate',
     label:s.id==='playalinda-south'&&closed?'Closed by NPS':'Public viewing candidate',
     reason:s.id==='playalinda-south'&&closed?'NPS closure affecting the referenced beach area.':s.note})),
   floridaViewingDeck:{
     missionId:id,facility:'kennedy',
     cards:[{id:'space-view',role:'starting-point'},{id:'rotary',role:'public-backup'}],
     playalinda:{npsVerified:true,excluded:closed},
     ksc:{officialEventMatched:matchedKsc}
   },
   kscViewing:{state:matchedKsc?'matched':'unverified',
     sourceUrl:matchedKsc?'https://www.kennedyspacecenter.com/event/fixture-launch/':null}
 };
}
test('Florida uses five real sourced viewing places instead of a self-referential engine placeholder',()=>{
 const ids=region.sites.map(s=>s.id);
 assert.deepEqual(ids,['space-view','rotary','jetty','playalinda-south','ksc-visitor']);
 assert.ok(!JSON.stringify(region.sites).includes('florida-specialist'));
 for(const s of region.sites){
   assert.ok(s.name.length>=8&&s.address&&s.source.startsWith('https://'));
 }
 assert.doesNotMatch(region.context,/verified Florida engine|detail engine|source desk/i);
});
test('national visitor gets a meaningful Florida location answer before expensive source arrives',()=>{
 const n=national();
 const a=model.assess(n,null);
 assert.equal(a.matched,false);
 assert.deepEqual(a.chosen.map(c=>c.id),['space-view','rotary']);
 assert.match(a.answer,/Titusville/i);
 assert.match(a.note,/Playalinda may close for a launch/i);
 assert.match(a.note,/ticket/i);
 assert.equal(a.state,'unknown');
 assert.equal(a.kscMatched,false);
 assert.equal(a.cards.find(c=>c.id==='playalinda-south').directionsAllowed,false);
 assert.equal(a.detailUrl,'/national-tools/space-coast-launch/?launchId='+ID);
 const next=desk.nextCheck(n);
 assert.equal(next.gate,'viewing');
 assert.equal(next.href,'#rl-viewing');
 assert.equal(next.destination,'viewing_options');
 assert.match(next.detail,/Space View Park/);
});
test('Cape Canaveral mission prioritizes Port Canaveral, not a Kennedy pad or private entrance',()=>{
 const n=national(12),a=model.assess(n,null),next=desk.nextCheck(n);
 assert.equal(a.chosen[0].id,'jetty');
 assert.match(a.answer,/Cape Canaveral/i);
 assert.match(next.detail,/Jetty Park/);
 assert.equal(a.cards.find(c=>c.id==='jetty').state,'verify');
 assert.doesNotMatch(a.answer,/confirmed open/i);
});
test('exact Florida source agreement improves answer but never declares public entry guaranteed',()=>{
 const a=model.assess(national(),detail());
 assert.equal(a.matched,true);
 assert.match(a.status,/check access/i);
 assert.equal(a.chosen[0].name,'Space View Park');
 assert.match(a.note,/No launch-specific gate opening has been certified/i);
 assert.equal(a.npsClosed,false);
 assert.equal(a.kscMatched,false);
});
test('matched NPS closure overrides beach possibility without erasing public alternatives',()=>{
 const a=model.assess(national(),detail(ID,{closed:true}));
 assert.equal(a.matched,true);
 assert.equal(a.npsClosed,true);
 assert.equal(a.state,'closed');
 assert.match(a.note,/Do not use it/i);
 assert.equal(a.cards.find(c=>c.id==='playalinda-south').state,'closed');
 assert.equal(a.cards.find(c=>c.id==='playalinda-south').directionsAllowed,false);
 assert.equal(a.chosen[0].id,'space-view');
});
test('conflicting Kennedy-vs-Cape pad identity does not adopt the wrong coast closure',()=>{
 const d=detail(ID,{closed:true});
 const a=model.assess(national(12),d);
 assert.equal(a.matched,false);
 assert.equal(a.npsClosed,false);
 assert.equal(a.chosen[0].id,'jetty');
 assert.match(a.note,/another mission|stale|missing/i);
 const reg=detail();reg.next.locationId=12;
 assert.equal(model.assess(national(27),reg).matched,false);
});
test('a mission-matched KSC event is not ticket availability',()=>{
 const a=model.assess(national(),detail(ID,{matchedKsc:true}));
 assert.equal(a.kscMatched,true);
 assert.match(a.note,/Tickets, venue admission and availability still require confirmation/i);
 assert.match(a.kscUrl,/kennedyspacecenter\.com\/event\//);
});
test('missing/stale or mission-mismatched regional evidence cannot leak the previous selection',()=>{
 for(const bad of [detail(OTHER),{...detail(),next:{id:OTHER}},
   {...detail(),scheduleFreshness:'stale'},{ok:false},
   {...detail(),floridaViewingDeck:{...detail().floridaViewingDeck,missionId:OTHER}}]){
   const a=model.assess(national(),bad);
   assert.equal(a.matched,false);
   assert.equal(a.kscMatched,false);
   assert.equal(a.npsClosed,false);
   assert.match(a.note,/another mission|unverified/i);
 }
 const stale=national();stale.scheduleFreshness='stale';
 assert.equal(model.assess(stale,detail()).matched,false);
 const missing=national();missing.selectedLaunchId=OTHER;
 assert.equal(model.assess(missing,detail()),null);
});
test('the actual page visibly owns Florida answer and uses exact mission checks without new provider',()=>{
 const html=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
 const js=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
 const funnel=fs.readFileSync(path.join(root,'public/assets/rocket-engagement-funnel.js'),'utf8');
 assert.match(html,/id="rl-access-answer"/);
 assert.match(html,/rocket-florida-access\.js/);
 assert.doesNotMatch(html,/Open Florida detail engine/);
 assert.match(js,/\/api\/space-coast-launch\?launchId=/);
 assert.match(js,/state\.data\.selectedLaunchId!==id/);
 assert.match(js,/state\.floridaController\?\.abort\(\)/);
 assert.match(funnel,/viewing_options/);
 assert.doesNotMatch(js,/Redis|Supabase|localStorage/);
});

function vulcanFixture(){
  const n=national(12);
  Object.assign(n.selectedLaunch,{
    name:'Vulcan VC6L | Amazon Leo (LV-01)',mission:'Amazon Leo (LV-01)',
    rocket:'Vulcan VC6L',pad:'SLC-41',net:'2026-11-14T17:32:30Z',
    netPrecision:'minute'
  });
  const d=detail();
  d.next={...n.selectedLaunch};
  d.floridaViewingDeck.facility='cape';
  d.accessSource.checkedAt='2026-11-13T21:00:00Z';
  // No affirmative opening notice exists; the national verdict must not require one.
  d.viewpoints=d.viewpoints.map(v=>v.id==='playalinda-south'?
    {...v,level:'unknown',label:'No NPS opening notice published'}:v);
  d.viewpoints.push({id:'playalinda-north',level:'closed',label:'Closed by NPS'});
  d.parkAlerts=[{
    title:'Playalinda District: Parking Lot #8-13',category:'Closure',
    description:'Main Playalinda road north of Eddy Creek, parking lots 8-13 and beach north of Eddy Creek closed.'
  }];
  return {n,d};
}
const VERDICT='Yes, Playalinda Beach lots 4-7 are open for viewing this launch. Park only in a beach parking lot. Vistas are closed during the launch, and the beach at parking area #1 is closed 1/4 mile south to the KSC boundary. Arrive before 12:02 PM ET: Playalinda closes to inbound traffic 30 minutes before launch.';
test('Nov 14 Vulcan LV-01: sections 02 and 04 use exactly the standing NPS verdict',()=>{
  const {n,d}=vulcanFixture(),a=model.assess(n,d);
  assert.equal(a.matched,true);
  assert.equal(a.playalinda.state,'open');
  assert.equal(a.playalinda.cutoffAt,'2026-11-14T17:02:30.000Z');
  assert.equal(a.playalinda.cutoffLabel,'12:02 PM ET');
  assert.equal(a.playalinda.headline,VERDICT);
  assert.ok(a.answer.includes(VERDICT),'section 02 verdict differs');
  assert.equal(a.cards.find(c=>c.id==='playalinda-south').label,VERDICT,'section 04 verdict differs');
  assert.doesNotMatch(a.playalinda.note,/opening not confirmed|security access not yet confirmed|do not assume entry/i);
  assert.match(a.playalinda.note,/road north of Eddy Creek/i);
  assert.match(a.playalinda.note,/Jetty Park is the alternate/i);
  assert.equal(a.npsClosed,false,'closure of lots 8–13 must not close lots 4–7');
  assert.equal(a.cards.find(c=>c.id==='playalinda-south').state,'candidate');
  assert.equal(a.cards.find(c=>c.id==='playalinda-south').source,a.playalinda.source);
  assert.equal(a.cards.find(c=>c.id==='playalinda-south').directionsAllowed,false);
  assert.deepEqual(a.cards.slice(0,2).map(c=>c.id),['playalinda-south','jetty']);
  assert.match(a.cards[0].role,/NPS viewing choice/);
  assert.match(a.cards[1].role,/Alternate/);
  assert.match(a.answer,/Jetty Park is the alternate/);
  assert.equal(a.playalinda.checkedAt,d.accessSource.checkedAt);
  assert.match(a.playalinda.source,/nps\.gov\/cana\/learn\/management\/superintendent-s-compendium/);
});
test('a missing opening notice or NPS fetch does not overturn the published launch rule',()=>{
  let {n,d}=vulcanFixture(),a=model.assess(n,d);
  assert.equal(a.playalinda.headline,VERDICT);
  d.accessSource.verified=false;
  a=model.assess(n,d);
  assert.equal(a.playalinda.state,'open');
  assert.equal(a.playalinda.checkedAt,null);
  assert.equal(a.playalinda.headline,VERDICT);
  // Regional API unavailable / delayed: the standing rule still renders.
  d.selectedLaunchId=OTHER;
  a=model.assess(n,d);
  assert.equal(a.matched,false);
  assert.equal(a.playalinda.headline,VERDICT);
  assert.equal(a.cards[0].label,VERDICT);
});
test('explicit new NPS closure affecting lots 4–7 overrides the fixed policy verdict',()=>{
  const {n,d}=vulcanFixture();
  d.viewpoints=d.viewpoints.map(v=>v.id==='playalinda-south'?
    {...v,level:'closed',label:'Closed by NPS'}:v);
  const a=model.assess(n,d);
  assert.equal(a.playalinda.state,'closed');
  assert.equal(a.npsClosed,true);
  assert.equal(a.cards.find(c=>c.id==='playalinda-south').state,'closed');
  assert.doesNotMatch(a.answer,/Yes, Playalinda Beach lots 4-7 are open/);
});
test('fixed cutoff is suppressed if Vulcan launch slips or mission changes',()=>{
  const {n,d}=vulcanFixture();
  n.selectedLaunch.net='2026-11-14T17:34:00Z';
  d.next.net=n.selectedLaunch.net;
  let a=model.assess(n,d);
  assert.equal(a.playalinda,null,'rescheduled mission must not show the old 12:02 cutoff');
  n.selectedLaunch.name='Another Vulcan mission';
  n.selectedLaunch.mission='Different mission';
  a=model.assess(n,d);
  assert.equal(a.playalinda,null);
});
test('Sections 02 and 04 render shared Playalinda decision with unchanged ads',()=>{
  const js=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
  const modelJs=fs.readFileSync(path.join(root,'public/assets/rocket-florida-access.js'),'utf8');
  assert.match(js,/florida\.playalinda\?\.headline/);
  assert.match(js,/s\.id==='playalinda-south'/);
  assert.match(js,/florida\.playalinda\.checkedAt/);
  assert.match(js,/NPS 2026 Superintendent’s Compendium, §1\.5\(a\)\(n\)/);
  assert.match(html,/rocket-florida-access\.js\?v=20261114-vulcan-fixed-v1/);
  assert.match(html,/rocket-launch-live\/app\.js\?v=20261114-playalinda-fixed-v1/);
  assert.doesNotMatch(modelJs,/Security access not yet confirmed|opening not confirmed|do not assume entry/i);
  assert.doesNotMatch(js,/do not assume entry/i);
});
