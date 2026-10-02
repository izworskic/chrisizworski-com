const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const path=require('node:path');

test('Oregon route smoke helper passes',()=>{
  const r=spawnSync(process.execPath,[path.join(__dirname,'oregon-public-route-smoke.js')],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr||r.stdout);
  assert.match(r.stdout,/Oregon public route files present/);
});
