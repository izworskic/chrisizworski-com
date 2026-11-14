'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const engine=require('../public/assets/shared-itinerary-engine.js');
const sheet=require('../public/assets/up-waterfalls-day-sheet.js');
const regional=require('../public/assets/up-waterfalls-regional-clusters.js');
const munising=require('../public/assets/up-waterfalls-munising-day.js');
const presque=require('../public/assets/up-waterfalls-presque-isle-outing.js');
const page=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const read=p=>fs.readFileSync(p,'utf8');
function card(id,{status='verify',arrivalVerified='verified'}={}){
 return {dataset:{id,status,arrivalVerified,region:'Western U.P.'},querySelector:s=>s==='.save'?{getAttribute:()=> 'false'}:null};
}
const ids=['wagner-falls','miners-falls','elliot-falls'];
const cards=new Map(ids.map(id=>[id,card(id)]));
test('shared fallback is deterministic and not described as a verified route',()=>{
 assert.equal(engine.engine(),'js-parity');
 assert.equal(engine.calendar('2027-02-29').state,0);
 assert.equal(engine.calendar('2028-02-29').state,2);
 assert.equal(engine.calendar('').state,1);
 assert.equal(engine.assess({ids,cards,date:'2027-06-15',season:1}).ok,true);
 assert.match(engine.assess({ids,cards,date:'2027-06-15',season:1}).reason,/no route, current opening or drive time/i);
 assert.equal(engine.sheetKind(3,1),1);
 assert.equal(engine.sheetKind(3,2),2);
 assert.equal(engine.sheetKind(7,1),0);
});
test('winter holds distinguish extended walks, motor vehicle outings, and park lookouts',()=>{
 for(const season of [1,2]){
  assert.equal(engine.assess({ids,cards,date:'2026-12-20',season}).ok,false);
  assert.equal(engine.assess({ids,cards,date:'2027-03-31',season}).ok,false);
 }
 assert.equal(engine.assess({ids,cards,date:'2027-04-01',season:1}).ok,true);
 assert.equal(engine.assess({ids,cards,date:'',season:1}).ok,false);
 assert.equal(engine.assess({ids,cards,date:'',season:2}).ok,true);
 assert.equal(engine.assess({ids,cards,date:'2026-12-20',season:0}).ok,true);
 assert.equal(engine.assess({ids,cards,date:'2027-02-29',season:0}).ok,false);
});
test('closed, research-only, unverified, absent and malformed stops cannot enter a day',()=>{
 for(const status of ['closed','research','mystery']){
  const modified=new Map(cards);
  modified.set(ids[0],card(ids[0],{status}));
  assert.equal(engine.assess({ids,cards:modified,date:'2027-06-01'}).ok,false,status);
  assert.equal(engine.candidate(modified.get(ids[0])),false);
 }
 const pending=new Map(cards);
 pending.set(ids[0],card(ids[0],{arrivalVerified:'pending'}));
 assert.equal(engine.assess({ids,cards:pending,date:'2027-06-01'}).ok,false);
 assert.equal(engine.assess({ids:[...ids,'../bad'],cards,date:'2027-06-01'}).ok,false);
 assert.equal(engine.assess({ids:[...ids,'unknown-falls'],cards,date:'2027-06-01'}).ok,false);
 assert.equal(sheet.allowedSharedStop(card('wagner-falls',{status:'closed'})),false);
});
test('at most six unique stops; proposed additions are all-or-nothing',()=>{
 const additional=new Map(cards);
 for(const id of ['a','b','c','d'])additional.set(id,card(id));
 assert.equal(engine.assess({ids,cards:additional,selected:['a','b','c','d'],date:'2027-06-01'}).ok,false);
 assert.equal(engine.assess({ids,cards:additional,selected:['a','b','c'],date:'2027-06-01'}).ok,true);
 assert.equal(engine.assess({ids,cards,selected:['unlisted-stale-id'],date:'2027-06-01'}).ok,false);
 const selected=['wagner-falls','miners-falls'];
 assert.deepEqual(engine.assess({ids,cards,selected,date:'2027-06-01'}).missing,['elliot-falls']);
 assert.equal(engine.vetoApproved({ok:true,missing:ids},{ids,cards,selected:['a','b','c','d'],date:'2027-06-01'}).ok,false);
 assert.equal(engine.vetoApproved({ok:false,missing:[],reason:'Agency closure'},{ids,cards,date:'2027-06-01'}).ok,false);
});
test('nearby is an inclusive geographic radius, never arrival or driving evidence',()=>{
 const item=card('wagner-falls');
 for(const r of [10,25,50]){
  assert.equal(engine.nearbyEligible(item,r,r),true);
  assert.equal(engine.nearbyEligible(item,r+0.001,r),false);
 }
 for(const d of [NaN,Infinity,-1,40]){
  assert.equal(engine.nearbyEligible(item,d,10),false);
 }
 assert.equal(engine.nearbyEligible(card('x',{status:'closed'}),1,10),false);
 assert.equal(engine.nearbyEligible(card('x',{arrivalVerified:'unverified'}),1,10),false);
 assert.equal(engine.nearbyEligible(item,2,15),false);
});
test('existing regional experience remains independent, including construction restrictions',()=>{
 const regionCards=new Map([...cards,['eagle-river-falls',card('eagle-river-falls')],
  ['haven-falls',card('haven-falls')],['manganese-falls',card('manganese-falls')],
  ['great-conglomerate-falls',card('great-conglomerate-falls')],
  ['potawatomi-falls',card('potawatomi-falls',{status:'restricted'})],
  ['gorge-falls',card('gorge-falls',{status:'restricted'})],
  ['rainbow-falls',card('rainbow-falls',{status:'restricted'})]]);
 assert.equal(regional.assess('keweenaw-parks',regionCards,[],'').ok,true);
 assert.equal(regional.assess('black-river-corridor',regionCards,[],'2027-02-01').ok,false);
 assert.equal(regional.assess('black-river-corridor',regionCards,[],'2027-06-01').ok,true);
 assert.equal(munising.assessPreset('shoreline',regionCards,[],'2027-01-03').ok,false);
 assert.equal(presque.seasonalAdvisory('2027-02-01').winter,true);
});
test('HTML script ordering and protected surfaces are preserved',()=>{
 const shared=page.indexOf('/assets/shared-itinerary-engine.js');
 assert.ok(shared>page.indexOf('/assets/up-waterfalls-visit-lens.js'));
 assert.ok(shared<page.indexOf('/assets/up-waterfalls-nearby.js'));
 for(const file of ['up-waterfalls-nearby.js','up-waterfalls-day-sheet.js','up-waterfalls-munising-day.js',
  'up-waterfalls-presque-isle-outing.js','up-waterfalls-regional-clusters.js'])
  assert.match(read('public/assets/'+file),/SharedItineraryEngine/);
 assert.match(read('rust/shared-itinerary/src/lib.rs'),/never generates roads|never generates roads/i);
 assert.match(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/upper-peninsula-waterfalls\//);
 assert.match(page,/pagead2\.googlesyndication\.com/);
});
