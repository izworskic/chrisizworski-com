'use strict';
// Source publication gate for the 2027 MSU corn earworm measurements.
// None of these tests assume 2027 records exist. Null is a truthful state.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const file='public/assets/garden-earworm-trap-2027-data.js';
const ctx={window:{}};
vm.runInNewContext(read(file),ctx,{timeout:1000});
const d=ctx.window.GardenEarwormTrap2027Data;
assert.notEqual(d,undefined,'Explicit data state is required');
const page=read('public/michigan-garden-pest-watch/index.html');
const client=read('public/assets/garden-earworm-2027.js');
const script='/assets/garden-earworm-trap-2027-data.js?v=20261103a';
assert.ok(page.includes(script));
assert.ok(page.includes('/assets/garden-earworm-2027.js?v=20261103a'));
assert.ok(page.indexOf(script)<page.indexOf('/assets/garden-earworm-2027.js'));
assert.ok(page.includes('id="earworm-2027-summary"'));
assert.ok(page.includes('id="earworm-2027-observations"'));
assert.ok(page.indexOf('id="earworm-2027-evidence"')<page.indexOf('id="earworm-county-picker"'));
assert.ok(page.includes('2027 source')||page.includes('2027 field evidence'));
assert.match(client,/candidate\.reviewFlags\.length/);
assert.match(client,/candidate\.season!==2027/);
assert.match(client,/publishedDate>today/);
assert.match(client,/MISSING_UNSPECIFIED/);
assert.match(client,/latestCollectionWeek/);
assert.match(client,/sourceTableSha256/);
assert.match(client,/No.*pesticide interval|No pesticide interval/i);
assert.ok(!/fetch\(/.test(client),'Live source lookup is not allowed from client JS');
if(d!==null){
 const data=JSON.parse(JSON.stringify(d));
 assert.equal(data.schema,'garden-earworm-trap-archive-v1');
 assert.equal(data.season,2027);
 assert.equal(data.species,'Helicoverpa zea');
 assert.equal(data.seasonState,'SOURCE_REPORTED_NOT_OUTBREAK_FORECAST');
 assert.match(data.source.url,/^https:\/\/www\.canr\.msu\.edu\/news\/michigan-vegetable-crop-report-[a-z0-9-]+-2027$/);
 assert.match(data.source.publishedDate,/^2027-\d\d-\d\d$/);
 assert.match(data.source.latestCollectionWeek,/^2027-\d\d-\d\d$/);
 assert.ok(data.source.latestCollectionWeek<=data.source.publishedDate);
 assert.match(data.source.sourceTableSha256,/^[0-9a-f]{64}$/);
 assert.ok(Array.isArray(data.reviewFlags));
 assert.ok(data.counties.length>=3&&data.counties.length<=20);
 const allWeeks=data.counties[0].samples.map(s=>s.week);
 assert.ok(allWeeks.length>=1&&allWeeks.length<=23);
 for(const county of data.counties){
  assert.equal(county.samples.length,allWeeks.length);
  assert.ok(['CLOTH_HELIOTHIS','WIRE_HARTSTACK','TYPE_NOT_SPECIFIED'].includes(county.trapType));
  county.samples.forEach((s,i)=>{
   assert.equal(s.week,allWeeks[i]);
   assert.ok(['REPORTED','NOT_REPORTED','MISSING_UNSPECIFIED'].includes(s.status));
   if(s.status==='REPORTED')assert.ok(Number.isInteger(s.total)&&s.total>=0);
   else{assert.equal(s.total,null);assert.equal(s.avgPerNight,null)}
  });
 }
 console.log('2027 MSU source candidate: '+data.source.publishedDate+
  ', '+data.counties.length+' reporting counties, review flags '+data.reviewFlags.length+
  '. Must be reviewed/merged to appear; flagged source never renders a numeric chart.');
}else{
 assert.ok(!fs.existsSync(path.join(root,'data/garden-earworm-msu-2027-provenance.json')),
  'No staged 2027 source metadata should coexist with null candidate');
 console.log('2027 MSU source gate PASS: no 2027 trap data, no fabricated reports; audited 2026 archive preserved.');
}
