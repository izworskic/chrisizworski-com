'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..');
const readSample=()=>JSON.parse(fs.readFileSync(path.join(root,'design-systems/experience-os-v1/examples/gooseberry-release-record.json'),'utf8'));
const load=()=>import(pathToFileURL(path.join(root,'design-systems/experience-os-v1/lib/release-evidence.mjs')).href);
const copy=o=>JSON.parse(JSON.stringify(o));

test('Experience OS V1.2: completed Gooseberry record passes all structural and source-only site checks',async()=>{
 const {validateReleaseRecord}=await load();
 const r=validateReleaseRecord(readSample(),{repoRoot:root,checkSite:true});
 assert.deepEqual(r.issues,[]);
 assert.equal(r.ok,true);
 assert.ok(r.counts.scenarios>=8);
 assert.equal(r.counts.photos,5);
});

test('Experience OS V1.2: weather forecasts cannot certify an open trail',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();x.claims.find(c=>c.kind==='forecast').subject='park-access';
 const r=validateReleaseRecord(x);
 assert.equal(r.ok,false);
 assert.ok(r.issues.some(e=>e.code==='claims.scope'),JSON.stringify(r.issues));
});

test('Experience OS V1.2: no gauge data cannot be promoted to observed streamflow',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();const gauge=x.claims.find(c=>c.subject==='river-flow');
 gauge.kind='observation';gauge.state='SUPPORTED';
 const r=validateReleaseRecord(x);
 // Structurally, real observed river-flow needs an actual observation evidence source.
 // Preserve the no-data claim rather than forging a new observation from the known site.
 assert.equal(r.ok,false);
 assert.ok(r.issues.some(e=>e.code==='claims.observationProvenance'),JSON.stringify(r.issues));
});

test('Experience OS V1.2: unscoped access status is not accepted as official notice',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();const a=x.claims.find(c=>c.subject==='park-access');
 a.kind='official-notice';a.state='SUPPORTED';
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(e=>e.code==='claims.accessScope'));
});

test('Experience OS V1.2: a READY deployment is not independent live verification',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();x.release.live={status:'NOT_VERIFIED'};
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(e=>e.code==='recordStatus.release'));
});
test('Experience OS V1.2: never claim observed improvement without window and source',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();
 x.release.measured={status:'CONFIRMED',evidenceUrl:'https://example.org/',checkedDate:'2026-10-31'};
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(e=>e.code==='release.measured.window'));
});
test('Experience OS V1.2: source claims require checked dates, limits and forecast expiry policy',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample(),forecast=x.claims.find(c=>c.kind==='forecast');
 forecast.checkedDate='later';forecast.maxAgeMinutes=0;forecast.limitation='';
 const r=validateReleaseRecord(x);
 for(const id of ['claims.checkedDate','claims.forecastAge','claims.limitation'])
  assert.ok(r.issues.some(e=>e.code===id),id);
});
test('Experience OS V1.2: contextual photo must disclose its actual subject',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();delete x.photos.find(p=>p.subjectMatch==='contextual').disclosure;
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(e=>e.code==='photos.disclosure'));
});
test('Experience OS V1.2: scenario and map failure checks cannot be silently removed',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();x.scenarios=x.scenarios.filter(s=>s.kind!=='reverse');
 delete x.failures['no-tiles'];
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(e=>e.code==='scenarios.reverse'));
 assert.ok(r.issues.some(e=>e.code==='failures.no-tiles'));
});
test('Experience OS V1.2: source path traversal is rejected',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();x.project.pageFile='../personal/private.html';
 const r=validateReleaseRecord(x,{repoRoot:root,checkSite:true});
 assert.ok(r.issues.some(e=>e.code==='project.pageFile'));
 assert.ok(r.issues.some(e=>e.code==='site.path'));
});
test('Experience OS V1.2: a draft cannot imply confirmed later evidence if its browser QA is pending',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();x.recordStatus='draft';x.release.verified={status:'PENDING'};
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(e=>e.code==='release.order'));
});
