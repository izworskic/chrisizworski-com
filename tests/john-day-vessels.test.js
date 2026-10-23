'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{describe}=require('../public/assets/john-day-vessels');
const now=Date.parse('2026-10-23T01:00:00Z');
const vessel={lat:45.72,lon:-120.8,seen:new Date(now-120000).toISOString(),speedKnots:4,course:90};
test('cards derive straight-line nearness and course context without inventing arrival times',()=>{
 const d=describe(vessel,now);assert.equal(d.kind,'toward');assert.ok(d.km>5&&d.km<10);assert.equal(d.ageMinutes,2);assert.ok(!('eta' in d));
 assert.equal(describe({...vessel,course:270},now).kind,'nearby');assert.equal(describe({...vessel,speedKnots:0},now).kind,'slow');
 assert.equal(describe({...vessel,lon:-120.6976,lat:45.719},now).kind,'near-lock');
});
test('expired, future and malformed reports cannot produce vessel cards',()=>{
 assert.equal(describe({...vessel,seen:new Date(now-1900000).toISOString()},now),null);
 assert.equal(describe({...vessel,seen:new Date(now+120000).toISOString()},now),null);
 assert.equal(describe({...vessel,lon:null},now),null);
});
