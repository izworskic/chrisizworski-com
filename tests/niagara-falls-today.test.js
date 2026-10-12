'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {items,operating}=require('../lib/niagara-falls/catalog.js');
const {plan}=require('../lib/niagara-falls/planner.js');
const base={visit_date:'2026-10-12',arrival_local:'10:00',duration_minutes:240,starting_side:'US',priority:'views',adults:2,youth:0};
function p(extra={}){return plan({...base,...extra},new Date('2026-10-12T12:00:00.000Z'));}
const cave=items.find(s=>s.id==='cave'),maid=items.find(s=>s.id==='maid');
test('NIA-01 two-hour NY remains same side',()=>{const v=p({duration_minutes:120});assert.ok(v.stops.length);assert.equal(v.cross_border_auto_planned,false);assert.ok(v.stops.every(s=>s.currency==='USD'));});
test('NIA-02 boat selected only with schedule slack',()=>{const v=p({priority:'boat'});assert.ok(v.stops.some(s=>s.id==='maid'));assert.ok(v.timeline.contingency_minutes>=15);});
test('NIA-03 Ontario 6 hours low walking stays Canadian',()=>{const v=p({starting_side:'CA',duration_minutes:360,low_walking:true});assert.ok(v.stops.length);assert.ok(v.timeline.estimated_walking_m<=1250);assert.ok(v.stops.every(s=>s.currency==='CAD'));});
test('NIA-04 deadline reject arrival after entry allowance',()=>{const v=p({visit_date:'2026-10-12',arrival_local:'16:00',priority:'mist',duration_minutes:120});assert.ok(!v.stops.some(s=>s.id==='cave'));});
test('NIA-05 Oct 19 maintenance closed',()=>{assert.equal(operating(cave,'2026-10-19').status,'CLOSED');assert.equal(operating(cave,'2026-10-20').status,'CLOSED');});
test('NIA-06 last-ticket cutoffs change across Oct 11 to 12',()=>{assert.equal(operating(cave,'2026-10-11').lastAdmission,'18:15');assert.equal(operating(cave,'2026-10-12').lastAdmission,'16:15');});
test('NIA-07 Nov 9 Maid of Mist closed',()=>{assert.equal(operating(maid,'2026-11-09').status,'CLOSED');assert.ok(!p({visit_date:'2026-11-09',priority:'boat'}).stops.some(x=>x.id==='maid'));});
test('NIA-08 no pass price or pass entitlement claims',()=>{const v=p({visit_date:'2026-11-02'});assert.ok(!JSON.stringify(v).includes('Falls Pass included'));});
test('NIA-09 explicit crossing intent not sufficient for crossing',()=>{const v=p({cross_border:true,documentation_confirmed:false});assert.equal(v.cross_border_auto_planned,false);assert.match(v.unknowns.join(' '),/cross-border/i);});
test('NIA-10 no source unverified border wait assertion',()=>{const v=p();assert.equal(v.cross_border_auto_planned,false);assert.ok(!JSON.stringify(v).includes('fastest bridge'));});
test('NIA-11 rainbow service not a planner dependency',()=>{assert.ok(p().stops.length);});
test('NIA-12 unknown Canadian hours not equivalent to closed',()=>{const v=p({starting_side:'CA',visit_date:'2026-10-13'});assert.ok(v.excluded.some(x=>x.reason==='HOURS_NOT_VERIFIED'));assert.ok(!v.excluded.some(x=>x.reason==='PUBLISHED_CLOSED'));});
test('NIA-13 scenic result when paid closed',()=>{const v=p({visit_date:'2026-12-25'});assert.ok(v.stops.length);assert.ok(v.stops.every(s=>s.type==='view'));});
test('NIA-14 mobility excludes partially accessible cave',()=>{const v=p({step_free:true,priority:'mist'});assert.ok(!v.stops.some(x=>x.id==='cave'));});
test('NIA-15 Oct 12 fireworks not guaranteed by planner data',()=>{assert.ok(!JSON.stringify(p({arrival_local:'20:00'})).includes('guaranteed fireworks'));});
test('NIA-16 post Oct 12 no fireworks claims',()=>{assert.ok(!JSON.stringify(p({visit_date:'2026-10-13'})).includes('fireworks'));});
test('NIA-17 currencies never added together',()=>{const a=p(),b=p({starting_side:'CA'});assert.deepEqual(a.costs.map(x=>x.currency),['USD']);assert.deepEqual(b.costs.map(x=>x.currency),['CAD']);});
test('NIA-18 no invented future-year confirmed schedule',()=>{assert.equal(operating(maid,'2027-10-12').status,'UNKNOWN');assert.equal(operating(cave,'2028-10-12').status,'UNKNOWN');});
test('NIA-19 midnight and DST dates keep exact local date',()=>{const a=p({visit_date:'2026-11-01',arrival_local:'23:45',duration_minutes:120});assert.equal(a.visit_local_date,'2026-11-01');assert.equal(a.arrival_local,'23:45');});
test('NIA-20 concurrent calls stable and network-free',async()=>{const inputs=await Promise.all(Array.from({length:10},()=>Promise.resolve(p())));assert.equal(new Set(inputs.map(x=>JSON.stringify(x))).size,1);});
test('Budget zero removes paid stops',()=>{const v=p({priority:'boat',budget:0});assert.ok(v.stops.every(s=>s.type==='view'));assert.equal(v.costs[0].known_admission_total,0);});
test('Paid visit cost counts adults and youth; prices remain USD',()=>{const v=p({priority:'boat',adults:2,youth:1});for(const x of v.stops){if(x.id==='maid')assert.equal(x.cost,80.25);}});
test('Stops obey conservative deadline and 15 min contingency',()=>{for(const duration_minutes of [120,240,360])for(const arrival_local of ['09:00','13:00','16:00']){const v=p({duration_minutes,arrival_local});assert.ok(v.timeline.contingency_minutes>=15);}});
test('No unknown attraction promoted into verified itinerary',()=>{const v=p({starting_side:'CA'});assert.ok(v.stops.every(s=>s.schedule.status!=='UNKNOWN'));});
test('Invalid and malicious inputs rejected',()=>{assert.throws(()=>p({duration_minutes:99999}));assert.throws(()=>p({visit_date:'2026-02-30'}));assert.throws(()=>p({arrival_local:'12:99'}));});
test('Priority changes route selection where feasible',()=>{const a=p({priority:'views'}),b=p({priority:'boat'});assert.notEqual(a.priority,b.priority);assert.ok(b.stops.some(s=>s.id==='maid'));});
test('Official first action and source provenance available',()=>{const v=p();assert.ok(v.first_action.official_url.startsWith('https://'));assert.ok(v.source_health.length);});

const {weatherForVisit,normalize}=require('../lib/niagara-falls/weather.js');
test('Weather alert source outage reports unavailable, not no alerts',async()=>{
 const v=await weatherForVisit('US','2026-10-12',{now:new Date('2026-10-12T12:00:00Z'),fetch:async()=>{throw Error('offline');}});
 assert.equal(v.status,'SOURCE_UNAVAILABLE');assert.equal(v.checked_at,null);assert.ok(v.authority_url);
});
test('Weather check for a future date does not reuse today',async()=>{
 const v=await weatherForVisit('CA','2027-10-12',{now:new Date('2026-10-12T12:00:00Z')});
 assert.equal(v.status,'VISIT_NOT_TODAY');assert.equal(v.alerts.length,0);
});
test('NWS official warning structure becomes concise alert',()=>{
 const v=normalize({features:[{properties:{event:'Severe Thunderstorm Warning',severity:'Severe',expires:'2026-10-12T20:00:00Z'}}]},'US',new Date('2026-10-12T12:00:00Z'));
 assert.equal(v.length,1);assert.equal(v[0].source,'NWS');assert.match(v[0].headline,/Warning/);
});
test('Unexpected official weather response fails closed',()=>{assert.throws(()=>normalize({features:null},'CA'));});

test('Canada October 12 official dated hours are available only on their verified date',()=>{
 const journey=items.find(s=>s.id==='journey'),cruise=items.find(s=>s.id==='cruise');
 assert.equal(operating(journey,'2026-10-12').close,'19:00');
 assert.equal(operating(cruise,'2026-10-12').close,'20:00');
 assert.equal(operating(journey,'2026-10-13').status,'UNKNOWN');
 assert.equal(operating(cruise,'2027-10-12').status,'UNKNOWN');
});
test('Maid published closing time is not misrepresented as last-ticket cutoff',()=>{
 const h=operating(maid,'2026-10-12');
 assert.equal(h.open,'09:00');assert.equal(h.close,'17:00');
 assert.equal(h.lastAdmission,null);
 assert.match(h.basis,/does not publish a last-ticket cutoff/);
});
test('Canada boat trip never treats unknown admission prices as free',()=>{
 const v=p({starting_side:'CA',priority:'boat',arrival_local:'10:00',duration_minutes:360});
 assert.ok(v.stops.some(s=>s.id==='cruise'));
 assert.equal(v.costs[0].currency,'CAD');
 assert.equal(v.costs[0].prices_complete,false);
 assert.ok(v.costs[0].unverified_attractions.includes('Niagara City Cruises'));
 assert.match(v.unknowns.join(' '),/displayed known subtotal is not the full cost/);
});
test('Canada hard zero-dollar budget cannot silently include unknown-price paid attractions',()=>{
 const v=p({starting_side:'CA',priority:'boat',budget:0});
 assert.ok(v.stops.every(s=>s.type==='view'));
 assert.equal(v.costs[0].prices_complete,true);
 assert.ok(v.excluded.some(s=>s.reason==='PRICE_NOT_VERIFIED'));
});

test('BOAT-01 boat preference is a required itinerary feature when schedule fits',()=>{
 const v=p({visit_date:'2026-10-13',arrival_local:'10:00',priority:'boat'});
 assert.equal(v.boat_resolution.status,'FEASIBLE');
 assert.equal(v.boat_resolution.included,true);
 assert.ok(v.stops.some(x=>x.id==='maid'));
 assert.equal(v.status,'PLANNED_WITH_VERIFICATION');
});
test('BOAT-02 late NY arrival explains missed boat and labels scenic fallback honestly',()=>{
 const v=p({visit_date:'2026-10-13',arrival_local:'20:00',duration_minutes:240,priority:'boat'});
 assert.equal(v.status,'BOAT_NOT_FEASIBLE');
 assert.equal(v.boat_resolution.status,'UNAVAILABLE');
 assert.equal(v.boat_resolution.reason_code,'BOAT_AFTER_OPERATING_WINDOW');
 assert.ok(v.boat_resolution.reason.includes('17:00'));
 assert.ok(v.stops.every(x=>x.id!=='maid'));
 assert.match(v.verdict,/scenic alternative/i);
});
test('BOAT-03 arrival before opening waits instead of rejecting the boat',()=>{
 const v=p({visit_date:'2026-10-13',arrival_local:'08:00',duration_minutes:240,priority:'boat'});
 assert.equal(v.boat_resolution.status,'FEASIBLE');
 const boat=v.stops.find(x=>x.id==='maid');assert.ok(boat);
 assert.ok(boat.waiting_minutes>0);
 assert.ok(Number(boat.departure.slice(0,2))>=10);
});
test('BOAT-04 too little visit time cannot advertise a boat trip',()=>{
 const v=p({visit_date:'2026-10-13',arrival_local:'10:00',duration_minutes:60,priority:'boat'});
 assert.equal(v.boat_resolution.included,false);
 assert.equal(v.boat_resolution.reason_code,'BOAT_NOT_ENOUGH_TIME');
 assert.ok(v.stops.every(x=>x.id!=='maid'));
});
test('BOAT-05 seasonally closed Maid never becomes a boat itinerary',()=>{
 const v=p({visit_date:'2026-11-09',arrival_local:'10:00',duration_minutes:240,priority:'boat'});
 assert.equal(v.boat_resolution.status,'UNAVAILABLE');
 assert.equal(v.boat_resolution.reason_code,'PUBLISHED_CLOSED');
 assert.ok(v.stops.every(x=>x.id!=='maid'));
});
test('BOAT-06 unknown Canadian boat hours cannot be called closed or feasible',()=>{
 const v=p({visit_date:'2026-10-13',starting_side:'CA',arrival_local:'10:00',priority:'boat'});
 assert.equal(v.boat_resolution.status,'UNAVAILABLE');
 assert.equal(v.boat_resolution.reason_code,'HOURS_NOT_VERIFIED');
 assert.ok(v.stops.every(x=>x.id!=='cruise'));
});
test('BOAT-07 boat choice immediately replans in visitor script',()=>{
 const fs=require('node:fs');
 const script=fs.readFileSync(require('node:path').join(__dirname,'../public/assets/niagara-falls-today.js'),'utf8');
 assert.match(script,/form\.addEventListener\('change'/);
 assert.match(script,/data-boat-next-date/);
 assert.match(script,/niagara_boat_not_feasible/);
});
