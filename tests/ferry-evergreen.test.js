import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const data=JSON.parse(fs.readFileSync('data/ferry-planners.json','utf8'));
const sandbox={module:{exports:{}},Intl,Date,Number,String,JSON,Math};
vm.runInNewContext(fs.readFileSync('public/assets/ferry-planning-core.js','utf8'),sandbox);
const core=sandbox.module.exports;

function option(id){return data[id].options[0];}

test('known future season is not a future fare',()=>{
 const badger=data['ss-badger'],route=badger.experience.routes[0];
 assert.equal(core.availability(badger,'2027-05-14',route).state,'reference');
 assert.equal(core.availability(badger,'2027-10-10',route).state,'reference');
 assert.equal(core.availability(badger,'2027-10-11',route).state,'closed');
 assert.equal(core.availability(badger,'2028-07-14',route).state,'unknown');
 assert.equal(core.fare(badger,option('ss-badger'),'2027-07-14',2,1,1,true),null);
 assert.equal(core.fare(data.chi,option('chi'),'2027-07-14',2,0,1,true),null);
});

test('Badger 2026 standard passenger, child and vehicle categories are actually priced',()=>{
 const badger=data['ss-badger'],o=option('ss-badger');
 assert.equal(core.fare(badger,o,'2026-05-20',2,1,1,true)?.total,604);
 assert.equal(core.fare(badger,o,'2026-07-20',2,1,1,true)?.total,648);
 assert.equal(core.fare(badger,o,'2026-10-12',2,1,1,true),null);
});

test('Lake Express fare table starts August 11; capped children waiver retains mandatory fees',()=>{
 const c=data['lake-express'],o=option('lake-express');
 assert.equal(core.fare(c,o,'2026-08-10',1,2,0,true),null);
 assert.equal(core.fare(c,o,'2026-08-25',1,2,0,true)?.total,309);
 assert.equal(core.fare(c,o,'2026-08-25',1,3,0,true)?.total,463);
 assert.equal(core.fare(c,o,'2026-09-02',1,2,0,true)?.total,557);
 assert.equal(core.fare(c,o,'2027-08-25',1,2,0,true),null);
});

test('No new-year rollover of seasonal dock changes or projected reopening',()=>{
 const pelee=data.pelee,route=pelee.experience.routes[0];
 assert.equal(core.routeFor(pelee,route.id,'2026-07-28').a.name,'Leamington');
 assert.equal(core.routeFor(pelee,route.id,'2026-07-29').a.name,'Kingsville');
 assert.equal(core.availability(pelee,'2027-07-29',route).state,'unknown');
 assert.equal(core.availability(data.manitou,'2027-07-29',data.manitou.experience.routes[0]).state,'unknown');
 assert.equal(core.availability(data.manitou,'2028-07-29',data.manitou.experience.routes[0]).state,'unknown');
});

test('Time-zone crossing dates remain real elapsed time, not raw port clock subtraction',()=>{
 const east=core.localInstant('2027-07-01','09:00','America/Detroit');
 const central=core.localInstant('2027-07-01','09:00','America/Chicago');
 assert.equal(central-east,60*60*1000);
});

test('Fares cite their evidence year and every route has live official source handoffs',()=>{
 assert.equal(Object.keys(data).length,9);
 for(const [key,c] of Object.entries(data)){
  assert.equal(c.fareReferenceYear,2026,key);
  assert.ok(c.sources.length>=2,key);
  assert.ok(c.sources.every(([,url])=>url.startsWith('https://')),key);
 }
});
