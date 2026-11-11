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
