'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {plan}=require('../public/assets/john-day-visit.js');
test('short and longer scenery stops lead to different real destinations',()=>{
 const short=plan('river',30),long=plan('river',180);
 assert.equal(short.destination,'Giles French Park');assert.equal(long.destination,'LePage Park');
 assert.notDeepEqual(short.steps,long.steps);assert.notEqual(short.official,long.official);
 assert.match(short.steps.join(' '),/Do not spend the whole visit waiting/);
 assert.match(long.steps.join(' '),/driving time is outside/);
});
test('ship-only intent never invents a John Day platform or a passage appointment',()=>{
 for(const time of [30,90,180]){
  const p=plan('ships',time);assert.match(p.title,/Make the river the outing/);
  assert.match(p.reason,/no confirmed public close-up/);assert.match(p.reason,/seasonal/);
  assert.match(p.steps.join(' '),new RegExp(time+' minutes'));assert.match(p.official,/usace\.army\.mil/);
 }
});
test('family and intermediate duration change the itinerary; invalid inputs remain bounded',()=>{
 const family=plan('family',90),river=plan('river',90);
 assert.match(family.steps.join(' '),/together/);assert.notDeepEqual(family.steps,river.steps);
 assert.match(river.steps.join(' '),/binoculars/);
 assert.deepEqual(plan('unexpected','bogus'),plan('river',30));
});
