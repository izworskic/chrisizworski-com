'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {decide,validDate,CONTACT}=require('../lib/john-day-rules');
test('strict YYYY-MM-DD validation, including leap dates',()=>{
 assert.equal(validDate('2026-02-29'),false);assert.equal(validDate('2028-02-29'),true);
 assert.equal(validDate('2026-2-3'),false);assert.equal(validDate('2026-13-01'),false);
});
test('season boundaries are inclusive and do not bleed into unverified future years',()=>{
 const summer=decide({date:'2026-09-14',direction:'downstream'});
 assert.equal(summer.kind,'scheduled');assert.deepEqual(summer.times,['9:30 AM','12:30 PM','3:30 PM','6:30 PM','9:30 PM']);
 assert.equal(decide({date:'2026-09-15'}).kind,'daylight-request');
 assert.equal(decide({date:'2027-05-14'}).kind,'daylight-request');
 assert.equal(decide({date:'2027-05-15'}).kind,'unverified-period');
 assert.equal(decide({date:'2027-07-10'}).verified,false);
});
test('upstream summer slots are historic 2026 only',()=>{
 assert.deepEqual(decide({date:'2026-07-10'}).times,['9:00 AM','12:00 PM','3:00 PM','6:00 PM','9:00 PM']);
});
test('winter is request-based, commercial priority, not invented fixed hours',()=>{
 const d=decide({date:'2026-10-22'});
 assert.equal(d.kind,'daylight-request');assert.deepEqual(d.times,[]);
 assert.match(d.explanation,/commercial traffic/i);assert.equal(d.liveStatus,'unknown');
 assert.equal(d.navigationClearance,false);assert.equal(CONTACT.vhf,'14');
});
test('kayak without qualified motorized assist never gets routine proceed advice',()=>{
 const d=decide({date:'2026-07-10',craft:'nonmotorized'});
 assert.equal(d.kind,'assist-required');assert.deepEqual(d.times,[]);
 assert.match(d.explanation,/assist/i);assert.equal(d.navigationClearance,false);
});
test('input validation never turns bad input into clearance',()=>{
 for(const input of [{date:'2026-99-12'}, {date:'2026-10-01',craft:'aircraft'}, {date:'2026-10-01',direction:'north'}])
 assert.equal(decide(input).verified,false);
});
test('all accepted scenarios cite rules or source index and remain conditional',()=>{
 for(const date of ['2026-06-12','2026-11-02','2027-08-12']){
  const d=decide({date});assert.ok(d.source.startsWith('https://'));assert.equal(d.navigationClearance,false);
 }
});
