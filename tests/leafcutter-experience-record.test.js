'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
test('Leafcutter Experience OS 1.2 release evidence is structurally valid and honestly staged',async()=>{
 const {validateReleaseRecord}=await import('../design-systems/experience-os-v1/lib/release-evidence.mjs');
 const file=path.join(__dirname,'../docs/experience-briefs/leafcutter-nest-year.release.json');
 const data=JSON.parse(fs.readFileSync(file,'utf8'));
 const result=validateReleaseRecord(data,{repoRoot:path.resolve(__dirname,'..'),checkSite:false});
 assert.deepEqual(result.issues,[],JSON.stringify(result.issues));
 assert.ok(result.ok);
 assert.equal(data.project.canonical,'https://chrisizworski.com/leafcutter-bees/');
 assert.equal(data.release.measured.status,'NOT_MEASURED');
 assert.ok(data.scenarios.some(x=>x.kind==='reverse'));
});
