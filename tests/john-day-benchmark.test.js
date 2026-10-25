'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path');
test('John Day structural proxy exceeds release threshold with no truth veto',()=>{
 const run=cp.spawnSync(process.execPath,[path.join(__dirname,'../scripts/benchmark-john-day.cjs')],{encoding:'utf8',timeout:5000});
 assert.equal(run.status,0,run.stdout+'\n'+run.stderr);
 const r=JSON.parse(run.stdout);
 assert.equal(r.type,'structural-code-proxy');assert.ok(r.score>=90);
 assert.deepEqual(r.failures,[]);assert.ok(Object.values(r.veto).every(Boolean));
});
