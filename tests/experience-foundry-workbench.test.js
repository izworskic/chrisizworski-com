import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {compile,validateSpec,starter} from '../experience-foundry/lib/foundry.mjs';
import {validIso} from '../experience-foundry/lib/safety.mjs';
import {planExperience} from '../experience-foundry/lib/planning.mjs';
import {restrictedOutput,writePacket} from '../experience-foundry/lib/output.mjs';
import {asOf,scenarioSpec} from '../experience-foundry/fixtures/scenarios.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const registry=JSON.parse(await fs.readFile(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const base=JSON.parse(await fs.readFile(path.join(root,'experience-foundry/examples/saginaw-field-notes.json'),'utf8'));
const now=new Date(asOf);
test('malformed collections and records return actionable errors, never TypeError',()=>{
  for(const patch of [{sources:[null]},{records:[null]},{distinctiveness:[null,null]},{distinctiveness:{}},{recipe:'constructor'},{recipe:'__proto__'},{constraints:{noNewCanonical:'true',noPublicRoute:1,doNotInferLiveStatus:true}}]){
    assert.ok(validateSpec({...base,...patch},registry,{now}).length,JSON.stringify(patch));
  }
  assert.throws(()=>starter({recipe:'constructor',slug:'test'}),/Unknown recipe/);
});
test('calendar parsing rejects normalized impossible dates and trailing text',()=>{
  for(const value of ['2026-02-29T00:00:00Z','2026-04-31T00:00:00Z','2026-11-07T24:00:00Z','2026-11-07T12:00:00+14:30','prefix2026-11-07T12:00:00Z','2026-11-07T12:00:00Zjunk']) assert.equal(validIso(value),false,value);
  for(const value of ['2024-02-29T12:00:00Z','2026-11-07T12:00:00.123-05:00']) assert.equal(validIso(value),true,value);
});
test('snapshot compilation is reproducible and ages observations from observation time',()=>{
  const spec=scenarioSpec(base,'stale');
  const a=compile(spec,registry,{now}),b=compile(spec,registry,{now});
  assert.deepEqual(a,b);
  assert.match(a.html,/STALE OBSERVATION/);
  assert.equal(a.report.evaluatedAt,asOf.replace('Z','.000Z'));
  spec.records[0].summary+=' Changed source wording.';
  assert.notEqual(a.report.specHash,compile(spec,registry,{now}).report.specHash);
});
test('expiry boundaries and both sides of a conflict stay visible in both designs',()=>{
  for(const recipe of ['field-notes','passage-log']){
    const expired=compile(scenarioSpec({...base,recipe},'expired'),registry,{now});
    assert.match(expired.html,/EXPIRED FORECAST/);assert.match(expired.html,/EXPIRED NOTICE/);
    const conflicts=compile(scenarioSpec({...base,recipe},'conflict'),registry,{now}).report.evidenceStates;
    assert.equal(conflicts.filter(r=>r.qualification.startsWith('CONFLICTING')).length,2);
  }
});
test('v2 source contract rejects missing rights, future dates and impossible observation order',()=>{
  const spec=scenarioSpec(base);
  delete spec.sources[0].rights;spec.sources[0].checkedAt='2099-01-01T00:00:00Z';
  spec.records[0].observedAt='2026-11-08T00:00:00Z';
  spec.records[1].issuedAt='2099-01-01T00:00:00Z';
  spec.records[2].conflictsWith=['missing'];
  const errors=validateSpec(spec,registry,{now}).join(' ');
  for(const term of ['rights','checkedAt','observedAt','future issuedAt','conflictsWith'])assert.ok(errors.includes(term),errors);
});
test('custom planning preserves known ownership without inventing a repository or demand',()=>{
  const result=planExperience({slug:'seasonal-journey',question:'Where can I understand Saginaw Bay seasonal changes?',owner:'phenology'},registry);
  assert.equal(result.plan.recipe,'custom');assert.equal(result.plan.owningRepository,null);
  assert.equal(result.plan.intentOwner.canonical,'https://phenology.chrisizworski.com/');
  assert.ok(result.plan.handoffs.length);assert.ok(result.files['state-matrix.md'].includes('Conflicting sources'));
  assert.ok(result.plan.stages.every(s=>s.status==='NOT_VERIFIED'));
  assert.throws(()=>planExperience({slug:'bad',question:'A concrete visitor decision?',owner:'imaginary'},registry),/Unknown registry/);
});
test('outputs cannot escape through traversal or symlinks, and never overwrite',async()=>{
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'foundry-output-'));
  try{
    await fs.mkdir(path.join(temp,'build'));
    await fs.symlink(path.join(temp,'build'),path.join(temp,'linked'));
    await assert.rejects(restrictedOutput(temp,'linked/test','linked'),/symbolic link/);
    await assert.rejects(restrictedOutput(temp,'build/../public/x','build'),/inside/);
    const target=await restrictedOutput(temp,'build/test','build');
    await writePacket(target,{'brief.md':'original'});
    await assert.rejects(writePacket(target,{'brief.md':'replacement'}),/EEXIST/);
    assert.equal(await fs.readFile(path.join(target,'brief.md'),'utf8'),'original');
  }finally{await fs.rm(temp,{recursive:true,force:true});}
});
test('CLI rejects typo flags and emits complete custom research packets',async()=>{
  const output='experience-foundry/drafts/test-packet-'+process.pid;
  const cli=args=>spawnSync(process.execPath,['scripts/experience-foundry.mjs',...args],{cwd:root,encoding:'utf8'});
  try{
    const result=cli(['plan','--slug','packet-test','--question','Which Saginaw Bay seasonal change is documented?','--owner','phenology','--out',output]);
    assert.equal(result.status,0,result.stderr);
    assert.equal((await fs.readdir(path.join(root,output))).length,5);
    assert.equal(cli(['plan','--slug','packet-test','--question','Which seasonal change is documented?','--out',output]).status,1);
    assert.equal(cli(['build','--spec','experience-foundry/examples/saginaw-field-notes.json','--asof',asOf]).status,1);
    assert.equal(cli(['validate','--spec','experience-foundry/examples/saginaw-field-notes.json','--as-of',asOf]).status,0);
  }finally{await fs.rm(path.join(root,output),{recursive:true,force:true});}
});
