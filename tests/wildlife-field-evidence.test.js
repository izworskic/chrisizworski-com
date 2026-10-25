'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const F=require('../public/assets/wildlife-field-evidence.js');
const now=Date.UTC(2026,9,25,12);
test('Age is tied to observed date, not request time',()=>{
 assert.deepEqual([F.assess('agency-survey','2026-10-22',now).ageDays,F.assess('agency-survey','2026-10-01',now).dateStatus,F.assess('agency-survey','2025-10-22',now).dateStatus],[3,'aging','historical']);
 assert.equal(F.assess('research-community','2026-10-16',now).dateStatus,'aging');
 assert.equal(F.assess('research-community','2026-10-24',now).ageDays,1);
 assert.equal(F.assess('research-community','2026-02-30',now).dateStatus,'unverified-date');
 assert.equal(F.assess('agency-survey','2026-10-26',now).dateStatus,'unverified-date');
});
test('Animal presence cannot be deduced from weather, habitat, missing date',()=>{
 assert.equal(F.assess('weather','2026-10-25',now).animalObserved,false);
 assert.equal(F.assess('habitat','2026-10-25',now).animalObserved,false);
 assert.equal(F.assess('agency-survey','2026-10-22',now).animalObserved,true);
 assert.equal(F.assess('agency-survey',null,now).dateStatus,'unverified-date');
 assert.match(F.assess('research-community','2026-10-22',now).scope,/no confirmation/i);
});
test('Public places are source-backed and not conflated with observed birds',()=>{
 assert.equal(F.places('waterfowl','saginaw-bay').length,4);
 assert.equal(F.places('waterfowl','northern-lower').length,0);
 assert.ok(F.places('shed','bay-city')[0].note.includes('NOT a verified shed-collecting site'));
 assert.ok(F.places('waterfowl','saginaw-bay').every(p=>p.source.startsWith('https://')&&!p.name.toLowerCase().includes('nest')));
});
test('Wiring exists in each target tool and source dates remain separate',()=>{
 const read=p=>fs.readFileSync(path.resolve(__dirname,'../public',p),'utf8');
 const waterfowl=read('waterfowl-freeze-line/app.js');
 const eagle=read('winter-eagle-watching/app.js');
 const shed=read('michigan-shed-antlers/app.js');
 assert.match(waterfowl,/assess\('agency-survey',p.date\)/);
 assert.match(waterfowl,/renderPlaces\(\$\('public-viewing-places'\),'waterfowl',id\)/);
 assert.match(eagle,/indexed-community.*research-community/);
 assert.match(shed,/renderPlaces\(\$\('shed-public-places'\),'shed',id\)/);
});
