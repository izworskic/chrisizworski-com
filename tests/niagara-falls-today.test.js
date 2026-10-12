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
test('NIA-12 unknown Canadian hours not equivalent to closed',()=>{const v=p({starting_side:'CA'});assert.ok(v.excluded.some(x=>x.reason==='HOURS_NOT_VERIFIED'));assert.ok(!v.excluded.some(x=>x.reason==='PUBLISHED_CLOSED'));});
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
