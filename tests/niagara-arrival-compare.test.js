'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {compareArrival,usRate,seasonStatus}=require('../lib/niagara-falls/arrival-compare.js');
const {wayfinding}=require('../lib/niagara-falls/wayfinding.js');
function fixture(side='CA',date='2026-10-16'){
 return {side,visit_local_date:date,priority:'boat',stops:[{id:side==='CA'?'cruise':'maid',name:'Boat',arrival:'10:00',departure:'11:30',location:'Boat entrance',transfer_minutes:25}],timeline:{estimated_walking_m:500}};
}
test('WEGO costs a whole party, not per car: 2 adults and 1 child equals CAD $44',()=>{
 const x=compareArrival(fixture(),{mode:'drive',adults:2,children:1});
 const r=x.choices.find(y=>y.id==='rapidsview'),w=x.choices.find(y=>y.id==='wego');
 assert.equal(w.known_total,44);assert.equal(r.known_total,54);
 assert.equal(x.currency,'CAD');
 assert.equal(x.winner,'UNRESOLVED');
 assert.equal(x.choices.find(y=>y.id==='park').known_total,null);
 assert.equal(x.choices.find(y=>y.id==='park').total_verified,false);
});
test('already-included WEGO is not charged twice',()=>{
 const x=compareArrival(fixture(),{adults:2,children:1,wegoIncluded:true});
 assert.equal(x.choices.find(y=>y.id==='wego').known_total,0);
 assert.equal(x.choices.find(y=>y.id==='rapidsview').known_total,10);
});
test('qualifying online Falls Pass can cover both WEGO and Rapidsview parking',()=>{
 const x=compareArrival(fixture(),{adults:2,children:1,rapidsviewIncluded:true});
 assert.equal(x.choices.find(y=>y.id==='rapidsview').known_total,0);
 assert.equal(x.choices.find(y=>y.id==='wego').known_total,0);
});
test('Canadian unknown direct parking price never becomes a numeric cheapest option',()=>{
 const x=compareArrival(fixture());
 const p=x.choices.find(y=>y.id==='park');
 assert.equal(p.certainty,'PRICE_UNVERIFIED');
 assert.equal(p.known_total,null);
 assert.match(x.verdict,/rate varies/);
});
test('2026 Niagara park-and-ride seasonal option never claims service or last bus verified',()=>{
 const a=compareArrival(fixture('CA','2026-10-16'));
 const b=compareArrival(fixture('CA','2026-12-20'));
 assert.equal(a.choices.find(x=>x.id==='rapidsview').certainty,'SEASONAL_VERIFY_SERVICE');
 assert.equal(b.choices.find(x=>x.id==='rapidsview').certainty,'SEASON_NOT_CONFIRMED');
 assert.match(a.timing_note,/not been validated/);
});
test('US parking published fall rate and unknown year handled without fabrication',()=>{
 const us=compareArrival(fixture('US','2026-10-12'),{mode:'drive'});
 assert.equal(us.choices.find(x=>x.id==='park').known_total,10);
 assert.equal(us.choices.find(x=>x.id==='trolley').known_total,null);
 assert.equal(us.choices.find(x=>x.id==='park').selected,true);
 assert.equal(usRate('2028-10-13'),null);
 assert.equal(usRate('2026-10-11'),15);
});
test('Rapidsview choice provides its real address but never draws a fake walking route from that lot',()=>{
 const w=wayfinding(fixture('CA'), 'transit', {origin:'rapidsview',adults:2,children:0});
 assert.equal(w.parking.id,'caC');
 assert.match(w.parking.address,/4555 Upper Rapids Road/);
 assert.equal(w.parking.lat,null);
 assert.equal(w.comparison.selected_id,'rapidsview');
 assert.match(w.notes.join(' '),/verify/i);
});
test('walking from first stop costs no visitor fare but does not pretend arrival was free',()=>{
 const c=compareArrival(fixture(),{mode:'walk'});
 assert.equal(c.choices.find(x=>x.id==='walk').known_total,0);
 assert.match(c.important,/does not include the cost or time/);
});
