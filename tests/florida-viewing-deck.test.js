'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {buildFloridaViewingDeck}=require('../lib/florida-viewing-deck');
const {buildGeographicViewing}=require('../lib/space-coast-geo');
const {padRule}=require('../lib/rocket-launch-florida-facilities');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
const KSC='22222222-2222-4222-8222-222222222222',CAPE='11111111-1111-4111-8111-111111111111';
function input({id=KSC,locationId=27,pad='LC-39A',npsVerified=false,changes={}}={}){
 const launch={id,locationId,name:'Fixture Florida mission',net:'2026-11-15T18:00:00Z',
   netPrecision:'minute',pad,lat:locationId===27?28.608:28.56,lon:-80.6};
 const nps={verified:npsVerified,checkedAt:'2026-11-03T18:30:00Z',alerts:[]};
 const access=Object.assign({
   'space-view':'candidate','rotary':'candidate','parrish':'verify',
   'jetty':'unknown','ksc-visitor':'unknown','playalinda-first':'unknown',
   'playalinda-south':'unknown','playalinda-north':'unknown'
 },changes);
 const vps=Object.keys(access).map(id=>({id,level:access[id],label:'Entry not independently confirmed',
   reason:'Land manager and launch range controls may change.'}));
 const geo=buildGeographicViewing(launch,vps,nps,Date.parse('2026-11-03T18:35:00Z'),[]);
 return {launch,geographicViewing:geo,viewpoints:vps,
   accessSource:nps,kscViewing:{state:'unverified'},
   scheduleFreshness:'recent',arrivalGuidance:{level:'verify'}};
}
test('Kennedy mission orients first-time visitor to source-backed Titusville park',()=>{
 const result=buildFloridaViewingDeck(input());
 assert.equal(result.facility,'kennedy');
 assert.equal(result.cards[0].id,'space-view');
 assert.equal(result.cards[1].id,'rotary');
 assert.equal(result.locationStatus,'source-identified');
 assert.equal(result.ksc.ruleCode,'gantry-excluded');
 assert.equal(result.ksc.padExcludedAtGantry,true);
 assert.match(result.decisionNote,/never a verified parking stall/);
 assert.equal(result.playalinda.npsVerified,false);
 assert.match(result.playalinda.accessLabel,/unavailable/);
});
test('Cape mission orients to Port Canaveral while protecting ticket rules',()=>{
 const result=buildFloridaViewingDeck(input({id:CAPE,locationId:12,pad:'SLC-40'}));
 assert.equal(result.facility,'cape');
 assert.equal(result.cards[0].id,'jetty');
 assert.equal(result.cards[1].id,'rotary');
 assert.equal(result.ksc.padExcludedAtGantry,false);
 assert.equal(result.ksc.officialEventMatched,false);
 assert.match(result.ksc.admission,/Daily admission is not/);
 assert.match(result.cards[0].parking,/pass/);
});
test('closed park is excluded from primary and backup and cannot be navigated',()=>{
 const v=input({changes:{'space-view':'closed','rotary':'closed'}});
 const d=buildFloridaViewingDeck(v);
 assert.ok(d.cards.every(c=>c.id!=='space-view'&&c.id!=='rotary'));
 assert.equal(d.cards[0].id,'parrish');
 assert.equal(d.cards[0].excluded,false);
 assert.ok(d.cards.length<=2);
 assert.match(d.cards[0].accessReason,/Land manager/);
});
test('absence of available public sites creates a truthful unknown, not a winner',()=>{
 const v=input({changes:{'space-view':'closed','rotary':'closed','parrish':'closed','jetty':'closed'}});
 const d=buildFloridaViewingDeck(v);
 assert.equal(d.locationStatus,'unverified');
 assert.equal(d.cards.length,0);
 assert.match(d.reason,/unavailable or currently restricted/);
 assert.equal(d.ksc.officialEventMatched,false);
});
test('Playalinda never counts as confirmed open just because NPS feed returned no alerts',()=>{
 const d=buildFloridaViewingDeck(input({npsVerified:true}));
 assert.equal(d.playalinda.npsVerified,true);
 assert.notEqual(d.playalinda.accessLevel,'open');
 assert.match(d.playalinda.accessReason,/can fill|close/i);
 assert.match(d.playalinda.policy,/30 minutes/);
 assert.match(d.playalinda.policy,/6 PM/);
});
test('unknown/foreign explicit location ID cannot turn a Cape pad name into a known public winner',()=>{
 const d=buildFloridaViewingDeck(input({locationId:42,pad:'SLC-40'}));
 assert.equal(d.facility,null);
 assert.equal(d.cards.length,0);
 assert.equal(d.locationStatus,'unverified');
 assert.match(d.reason,/does not verify/);
 const empty=buildFloridaViewingDeck();
 assert.equal(empty.missionId,null);
 assert.equal(empty.cards.length,0);
 assert.match(empty.reason,/No scheduled Florida mission/);
});
test('published bearings are conditional, never applied to operator entrance or fake rocket flight path',()=>{
 const x=input();
 assert.equal(x.geographicViewing.points.find(p=>p.id==='ksc-visitor').geometry,null);
 const d=buildFloridaViewingDeck(x);
 assert.ok(d.cards[0].geometry);
 assert.equal(d.ksc.mapId,'ksc-visitor');
 assert.match(d.ksc.locationRole,/Official visitor-complex arrival/);
 assert.equal(d.observation.trajectoryVerified,false);
 assert.equal(d.observation.parkingAvailabilityVerified,false);
 const missing=input();
 missing.geographicViewing.points.find(p=>p.id==='space-view').geometry=null;
 const noGeo=buildFloridaViewingDeck(missing);
 assert.equal(noGeo.cards[0].geometry,null);
});
test('rendered Florida page preserves its canonical and admits public source uncertainty before JS',()=>{
 const page=read('public/synced-national-tools/space-coast-launch/index.html'),
   js=read('public/synced-national-tools/space-coast-launch/app.js'),
   map=read('public/synced-national-tools/space-coast-launch/geo-map.js');
 assert.equal((page.match(/rel="canonical"/g)||[]).length,1);
 assert.match(page,/href="https:\/\/chrisizworski\.com\/national-tools\/space-coast-launch\/"/);
 assert.match(page,/id="florida-viewing-plan"/);
 assert.match(page,/id="fl-deck-primary-map" type="button" disabled/);
 assert.match(page,/id="fl-deck-ticket-map" type="button" disabled/);
 assert.match(page,/Playalinda Beach: a conditional fourth option/);
 assert.match(js,/renderFloridaDeck\(d\)/);
 assert.match(js,/renderFloridaDeck\(null\)/);
 assert.match(js,/space-coast:focus-point/);
 assert.match(map,/space-coast:focus-point/);
 assert.match(map,/public-viewpoint','ticketed-entry/);
 assert.match(page,/viewing\.css\?v=20261103-deck-v1/);
 assert.match(page,/app\.js\?v=20261110-region-voice-v1/);
});
