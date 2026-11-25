'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs');
const {pairedHourlyAir}=require('../lib/shorefeel/paired-hourly.js');
const shore={office:'DTX',x:31,y:93},inland={office:'DTX',x:22,y:93};
const clock=new Date('2026-07-01T13:15:00Z');
const period=(day,hour,temp)=>({startsAt:new Date(Date.UTC(2026,6,day,hour)).toISOString(),tempF:temp});
const compare=(s,i,g=shore,h=inland)=>pairedHourlyAir(s,i,g,h,clock);
test('only same-hour paired distinct NWS grids yield numeric forecast differences',()=>{
 const r=compare([period(1,13,77),period(1,14,78),period(1,15,79)],
   [period(1,13,84),period(1,14,86),period(1,16,85)]);
 assert.equal(r.status,'available');
 assert.equal(r.rows.length,2);
 assert.deepEqual(r.rows.map(x=>x.shoreMinusInlandF),[-7,-8]);
 assert.equal(r.rows[1].startsAt,'2026-07-01T14:00:00.000Z');
 assert.equal(r.publicationAuthorizedAsBeachCorrection,false);
 assert.match(r.scope,/Neither is a thermometer/);
});
test('same cell or missing grid never become an independent coast gradient',()=>{
 const data=[period(1,13,80)];
 assert.equal(compare(data,data,shore,shore).status,'unavailable');
 assert.equal(compare(data,data,null,inland).status,'unavailable');
 assert.equal(compare(data,data,shore,shore).rows.length,0);
});
test('time misalignment, unphysical temperatures and duplicate conflict fail closed',()=>{
 assert.equal(compare([period(1,13,80)],[period(1,14,79)]).rows.length,0);
 assert.equal(compare([period(1,13,NaN)],[period(1,13,70)]).rows.length,0);
 assert.equal(compare([period(1,13,80),period(1,13,75)], [period(1,13,75)]).rows.length,0);
 const r=compare([period(1,13,75),period(1,13,80),period(1,14,81)],
   [period(1,13,77),period(1,14,83)]);
 assert.equal(r.status,'partial');
 assert.equal(r.conflictCount,1);
 assert.equal(r.rows.length,1);
});
test('future horizon, rollover and missing inputs are bounded',()=>{
 const r=compare([period(1,13,77),period(2,2,80),period(3,20,90)],
   [period(1,13,83),period(2,2,79),period(3,20,90)]);
 assert.equal(r.rows.length,2);
 assert.equal(r.rows[1].shoreMinusInlandF,1);
 assert.equal(compare(null,[],shore,inland).status,'unavailable');
 assert.equal(pairedHourlyAir([],[],shore,inland,new Date('bad')).status,'unavailable');
});
test('contract: API retains current apparent forecast as main answer and adds paired secondary evidence',()=>{
 const api=fs.readFileSync(require('node:path').join(__dirname,'../api/shorefeel.js'),'utf8');
 assert.match(api,/pairedHourlyAir\(periods/);
 assert.match(api,/hourlyAirComparison:shorelineHourlyComparison/);
 assert.match(api,/beachFeel:shorelineFeel/);
 const client=fs.readFileSync(require('node:path').join(__dirname,'../public/assets/shorefeel-saginaw.js'),'utf8');
 assert.match(client,/payload\?\.hourlyAirComparison/);
 assert.match(client,/vs inland grid/);
});
