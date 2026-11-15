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

function vulcanFixture(net='2026-11-15T17:11:30Z'){
  const n=national(12);
  Object.assign(n.selectedLaunch,{
    name:'Vulcan VC6L | Amazon Leo (LV-01)',mission:'Amazon Leo (LV-01)',
    rocket:'Vulcan VC6L',pad:'Space Launch Complex 41',net,
    netPrecision:'second',status:'Go for Launch'
  });
  const d=detail();
  d.next={...n.selectedLaunch};
  d.floridaViewingDeck.facility='cape';
  d.accessSource.checkedAt='2026-11-15T01:52:30Z';
  // No affirmative opening notice exists; the verdict must not require one.
  d.viewpoints=d.viewpoints.map(v=>v.id==='playalinda-south'?
    {...v,level:'unknown',label:'No NPS opening notice published'}:v);
  d.viewpoints.push({id:'playalinda-north',level:'closed',label:'Closed by NPS'});
  return {n,d};
}
const verdict=cutoff=>'Yes, Playalinda Beach lots 4-7 are open for viewing this launch. Park only in a beach parking lot. Vistas are closed during the launch, and the beach at parking area #1 is closed 1/4 mile south to the KSC boundary. Arrive before '+cutoff+': Playalinda closes to inbound traffic 30 minutes before launch.';
const HEDGES=/security access not yet confirmed|opening not confirmed|do not assume entry|cutoff is not confirmed|not confirmed launch-day entry|no launch-specific gate opening/i;
function assertVerdict(a,cutoff){
  const v=verdict(cutoff);
  assert.equal(a.playalinda.state,'open');
  assert.equal(a.playalinda.cutoffLabel,cutoff);
  assert.equal(a.playalinda.headline,v);
  assert.ok(a.answer.startsWith(v),'section 02 verdict differs');
  const card=a.cards.find(c=>c.id==='playalinda-south');
  assert.equal(card.label,v,'section 04 verdict differs');
  assert.equal(card.state,'candidate');
  assert.equal(card.directionsAllowed,false);
  assert.deepEqual(a.cards.slice(0,2).map(c=>c.id),['playalinda-south','jetty']);
  assert.match(a.cards[1].role,/Alternate/);
  assert.match(a.answer,/Jetty Park is the alternate/);
  assert.match(a.playalinda.note,/Jetty Park is the alternate/);
  for(const text of [a.answer,a.note,a.status,card.label,card.reason])
    assert.doesNotMatch(text,HEDGES);
  assert.match(a.playalinda.source,/nps\.gov\/cana\/learn\/management\/superintendent-s-compendium/);
}
test('Vulcan LV-01 Sun Nov 15 12:11 PM EST: fixed NPS verdict with an 11:41 AM EST cutoff',()=>{
  const {n,d}=vulcanFixture(),a=model.assess(n,d);
  assertVerdict(a,'11:41 AM EST');
  assert.equal(a.playalinda.cutoffAt,'2026-11-15T16:41:30.000Z');
  assert.equal(a.status,'Playalinda lots 4-7 open · arrive before 11:41 AM EST');
  assert.equal(a.npsClosed,false);
});
test('the cutoff follows a slip or scrub with no other change',()=>{
  for(const [net,cutoff] of [['2026-11-14T17:32:30Z','12:02 PM EST'],
    ['2026-11-16T17:00:00Z','11:30 AM EST'],['2026-11-17T00:15:00Z','6:45 PM EST'],
    ['2026-07-01T14:00:00Z','9:30 AM EDT']]){
    const {n,d}=vulcanFixture(net);
    assertVerdict(model.assess(n,d),cutoff);
  }
});
test('the verdict is fixed text: no live NPS check, notice or regional match can change it',()=>{
  const {n,d}=vulcanFixture();
  const closed={...d,viewpoints:d.viewpoints.map(v=>v.id==='playalinda-south'?
    {...v,level:'closed',label:'Closed by NPS'}:v)};
  for(const regional of [null,d,{...d,accessSource:{verified:false,checkedAt:null}},
    {...d,selectedLaunchId:OTHER},{ok:false},closed])
    assertVerdict(model.assess(n,regional),'11:41 AM EST');
});
test('every SLC-41 and LC-39A launch gets the verdict; other pads do not',()=>{
  for(const [pad,loc] of [['Space Launch Complex 41',12],['SLC-41',12],
    ['Launch Complex 39A',27],['LC-39A',27]]){
    const n=national(loc);
    Object.assign(n.selectedLaunch,{pad,net:'2026-11-20T03:05:00Z',netPrecision:'minute'});
    assertVerdict(model.assess(n,null),'9:35 PM EST');
  }
  for(const pad of ['Space Launch Complex 40','Launch Complex 39B','Space Launch Complex 37B','SLC-410']){
    const n=national(12);n.selectedLaunch.pad=pad;
    assert.equal(model.assess(n,null).playalinda,null,pad);
  }
});
test('an approximate launch time does not invent an exact cutoff',()=>{
  const {n,d}=vulcanFixture();
  n.selectedLaunch.netPrecision='hour';
  const a=model.assess(n,d);
  assert.equal(a.playalinda.cutoffLabel,null);
  assert.match(a.playalinda.headline,/Arrive before the inbound cutoff: Playalinda closes to inbound traffic 30 minutes before launch\.$/);
  assert.doesNotMatch(a.answer,HEDGES);
});
test('Sections 02 and 04 render the shared Playalinda verdict with no live-check wording and unchanged ads',()=>{
  const js=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
  const html=fs.readFileSync(path.join(root,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
  const modelJs=fs.readFileSync(path.join(root,'public/assets/rocket-florida-access.js'),'utf8');
  assert.match(js,/florida\.playalinda\?\.headline/);
  assert.match(js,/s\.id==='playalinda-south'/);
  assert.match(js,/NPS 2026 Superintendent’s Compendium, §1\.5\(a\)\(n\)/);
  assert.doesNotMatch(js,/florida\.playalinda\.checkedAt/);
  assert.doesNotMatch(modelJs,/VULCAN|LV-01|12:02|vulcanPlayalinda/);
  assert.match(html,/rocket-florida-access\.js\?v=20261115-playalinda-rule-v1/);
  assert.match(html,/rocket-launch-live\/app\.js\?v=20261113-rust-national-v1-map-tiles-v2-playalinda-fixed-20261114-weather-link-sky-trend-glance-operator-plain-hero-liftoff-just-playalinda-rule/);
  assert.doesNotMatch(modelJs,/security access not yet confirmed|opening not confirmed|do not assume entry|cutoff is not confirmed/i);
  assert.doesNotMatch(js,/do not assume entry/i);
});
