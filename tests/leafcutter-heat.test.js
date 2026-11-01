'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../lib/leafcutter-release.cjs');
function day(date,temp,offset='-04:00'){
 return Array.from({length:24},(_,h)=>({startTime:date+'T'+String(h).padStart(2,'0')+':00:00'+offset,isDaytime:h>=9&&h<=18,temperature:temp,temperatureUnit:'F'}));
}
test('full 24-hour heat includes cool nights and tallies GDD50 separately from release threshold',()=>{
 const now=new Date('2026-07-11T03:00:00Z');
 const heat=E.summarizeHeat([...day('2026-07-11',65),...day('2026-07-12',80)],true,now);
 assert.equal(heat.status,'AVAILABLE');
 assert.equal(heat.completeDays,2);
 assert.equal(heat.totalDegreeDaysF,45);
 assert.equal(heat.warmDaytimeHours,10);
 assert.equal(heat.daily[0].gdd50F,15);
 assert.equal(heat.daily[1].gdd50F,30);
 assert.ok(heat.caveat.includes('NOT a validated leafcutter bee emergence threshold'));
 assert.equal(heat.scope,'forecast-only-garden-warmth-index');
 assert.equal(E.summarizeHeat([...day('2026-07-11',80),...day('2026-07-12',80)],false,now).totalDegreeDaysF,null);
});
test('partial or duplicate forecast hours do not produce invented degree-day totals',()=>{
 const missing=day('2026-07-11',82).filter(p=>!p.startTime.includes('T04:'));
 const complete=day('2026-07-12',82),now=new Date('2026-07-11T03:00:00Z');
 const output=E.summarizeHeat([...missing,...complete,complete[0]],true,now);
 assert.equal(output.daily[0].coverage,'partial');
 assert.equal(output.daily[0].gdd50F,null);
 assert.equal(output.completeDays,1);
 assert.equal(output.status,'INSUFFICIENT');
 assert.equal(output.totalDegreeDaysF,null);
});
test('DST spring skip and fall repeated hour count as full local days',()=>{
 const spring=Array.from({length:24},(_,h)=>h).filter(h=>h!==2).map(h=>({
   startTime:'2026-03-08T'+String(h).padStart(2,'0')+':00:00'+(h<2?'-05:00':'-04:00'),
   isDaytime:h>=9&&h<=18,temperature:70,temperatureUnit:'F'}));
 const fall=Array.from({length:24},(_,h)=>({
   startTime:'2026-11-01T'+String(h).padStart(2,'0')+':00:00'+(h<1?'-04:00':'-05:00'),
   isDaytime:h>=9&&h<=18,temperature:70,temperatureUnit:'F'}));
 fall.push({startTime:'2026-11-01T01:00:00-04:00',isDaytime:false,temperature:70,temperatureUnit:'F'});
 const s=E.summarizeHeat(spring,true,new Date('2026-03-08T05:00:00Z'));
 const f=E.summarizeHeat(fall,true,new Date('2026-11-01T04:00:00Z'));
 assert.equal(s.daily[0].coverage,'complete');
 assert.equal(s.daily[0].hours,23);
 assert.equal(f.daily[0].coverage,'complete');
 assert.equal(f.daily[0].hours,25);
});
