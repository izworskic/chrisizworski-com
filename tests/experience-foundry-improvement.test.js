import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {startImprovement,assessRun,proveImprovement,reviewProof,verifyBaseline,sourcePath,hash} from '../experience-foundry/lib/improvement.mjs';

const registry={tools:[{id:'fixture-tool',canonical:'https://example.org/tool/',primaryIntent:'Choose a destination'}],relationships:[]};
const root=fileURLToPath(new URL('../',import.meta.url));
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8'});
const original="module.exports={link:id=>'/destination/',empty:()=>null};\n";
const improved="module.exports={link:id=>'/destination/?id='+encodeURIComponent(id),empty:()=>null};\n";
const adapter=`const path=require('node:path');
const root=process.argv[process.argv.indexOf('--source-root')+1];
const model=require(path.join(root,'model.cjs'));
const url=new URL(model.link('second-choice'),'https://example.org');
console.log(JSON.stringify({cases:[
 {id:'keep-choice',passed:url.searchParams.get('id')==='second-choice',observed:'Destination URL: '+url.href},
 {id:'empty-state',passed:model.empty()===null,observed:'Empty input returns: '+JSON.stringify(model.empty())}
]}));`;

async function fixture() {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'foundry-cycle-test-'));
  git(dir,'init','-q');git(dir,'config','user.email','test@example.org');git(dir,'config','user.name','Foundry test');
  await fs.writeFile(path.join(dir,'model.cjs'),original);
  git(dir,'add','model.cjs');git(dir,'commit','-qm','Capture actual baseline');
  const packet=startImprovement({root:dir,slug:'choice-continuity',question:'Can a visitor retain their selected destination?',owner:'fixture-tool',files:['model.cjs']},registry);
  const snapshot=JSON.parse(packet.files['baseline.json']);
  const run=packet.run;
  run.owningRepository='fixture/owner';
  run.diagnosis={visitorTask:'Continue planning the selected destination.',currentFriction:'The destination link drops the selected identity.',
    capabilities:['An existing destination renderer accepts stable IDs.'],
    evidence:[{id:'missing-choice',kind:'source',file:'model.cjs',startLine:1,endLine:1,observation:'The link function ignores its selected ID argument.'}]};
  run.opportunities=[
    {id:'continuity',outcome:'Keep the selected destination through navigation.',evidenceIds:['missing-choice'],reuse:'Reuse destination ID parsing and source selection.',effort:'Small link and receiving-page integration.',risk:'Unknown IDs must not silently select another destination.'},
    {id:'comparison',outcome:'Compare two destination options before choosing.',evidenceIds:['missing-choice'],reuse:'Reuse existing destination details and criteria.',effort:'A new comparison interaction and mobile layout.',risk:'Available evidence may not support every comparison.'},
    {id:'return-path',outcome:'Return to the source view with prior context.',evidenceIds:['missing-choice'],reuse:'Reuse the selected ID and local view model.',effort:'Add a context-preserving return control.',risk:'Return navigation must handle removed destinations.'}
  ];
  run.selection={opportunityId:'continuity',rationale:'Restore the interrupted decision first; comparison depends on consistent selection.'};
  run.concepts=[
    {id:'deep-link',opportunityId:'continuity',firstScreen:'Show the selected destination immediately after navigation.',interaction:'Carry the selected ID in a shareable destination link.',completedAction:'Visitor continues with the same destination selected.',feasibility:'The receiver already accepts an ID in its query string.',tradeoff:'Navigation changes the page and may lose scroll context.',evidenceIds:['missing-choice']},
    {id:'inline-detail',opportunityId:'continuity',firstScreen:'Keep the source list visible beside selected detail.',interaction:'Expand a detail panel without navigating away.',completedAction:'Visitor compares detail while retaining the original selection.',feasibility:'Existing destination data can drive an inline view.',tradeoff:'A larger layout change and more duplicated rendering.',evidenceIds:['missing-choice']}
  ];
  run.design={conceptId:'deep-link',rationale:'Preserve the working receiver and a shareable URL with less duplication.',reviewer:'Synthetic test fixture, not product design acceptance'};
  run.scenarios=[
    {id:'keep-choice',role:'improvement',journey:'Select a non-default destination and follow its detail link.',input:'The second destination has ID second-choice.',expected:'The URL carries second-choice for the receiver.'},
    {id:'empty-state',role:'preservation',journey:'Open the tool without an available destination.',input:'An empty destination source is supplied.',expected:'No destination is invented from empty input.'}
  ];
  run.measurement={event:'Destination details opened by an explicit visitor action.',distinguishingProperty:'Use the new contextual handoff surface category.',completionSignal:'Receiver confirms restoration of the selected destination.',baseline:'Unavailable: synthetic fixture has no visitors.'};
  run.verifier='tests/replay.cjs';
  await fs.mkdir(path.join(dir,'tests'));
  await fs.writeFile(path.join(dir,run.verifier),adapter);
  return {dir,run,snapshot,packet,cleanup:()=>fs.rm(dir,{recursive:true,force:true})};
}

test('a captured packet is incomplete and points to a concrete next action',async()=>{
  const f=await fixture();
  try{
    const blank=JSON.parse(f.packet.files['run.json']);
    const assessment=assessRun(blank,f.snapshot,registry);
    assert.equal(assessment.readyToImplement,false);
    assert.ok(assessment.blockers.some(b=>b.stage==='opportunity'));
    assert.ok(assessment.blockers.some(b=>b.stage==='design'));
    assert.match(assessment.nextAction,/owningRepository/);
    assert.equal(assessRun(f.run,f.snapshot,registry).readyToImplement,true);
    verifyBaseline(f.dir,f.snapshot);
    assert.match(f.packet.files['IMPLEMENT.md'],/IMPLEMENT the selected concept/);
  }finally{await f.cleanup();}
});

test('green preservation checks and complete paperwork cannot masquerade as improvement',async()=>{
  const f=await fixture();
  try{
    const {proof}=await proveImprovement({root:f.dir,...f,registry});
    assert.equal(proof.demonstrated,false);
    assert.deepEqual(proof.comparison.map(c=>c.result),['UNMET','PRESERVED']);
    assert.deepEqual(proof.changed,[]);
    assert.equal(proof.release.visitorOutcome,'NOT_MEASURED');
    assert.equal((await reviewProof({root:f.dir,...f,registry,proof})).demonstrated,false);
  }finally{await f.cleanup();}
});

test('the same adapter demonstrates a real gain and rejects stale code, run or verifier',async()=>{
  const f=await fixture();
  try{
    await fs.writeFile(path.join(f.dir,'model.cjs'),improved);
    const {proof}=await proveImprovement({root:f.dir,...f,registry});
    assert.equal(proof.demonstrated,true);
    assert.deepEqual(proof.comparison.map(c=>c.result),['GAIN','PRESERVED']);
    assert.equal((await reviewProof({root:f.dir,...f,registry,proof})).demonstrated,true);
    const changed=structuredClone(f.run);changed.selection.rationale+=' Changed decision.';
    assert.equal((await reviewProof({root:f.dir,run:changed,snapshot:f.snapshot,registry,proof})).demonstrated,false);
    await fs.appendFile(path.join(f.dir, f.run.verifier),'\n// changed verifier');
    assert.match((await reviewProof({root:f.dir,...f,registry,proof})).proofProblems.join(' '),/adapter changed/);
    await fs.writeFile(path.join(f.dir,'model.cjs'),original);
    assert.match((await reviewProof({root:f.dir,...f,registry,proof})).proofProblems.join(' '),/Implementation changed/);
  }finally{await f.cleanup();}
});

test('one improved outcome cannot outweigh a regression',async()=>{
  const f=await fixture();
  try{
    await fs.writeFile(path.join(f.dir,'model.cjs'),improved.replace('empty:()=>null','empty:()=>"invented"'));
    const {proof}=await proveImprovement({root:f.dir,...f,registry});
    assert.equal(proof.demonstrated,false);
    assert.deepEqual(proof.comparison.map(c=>c.result),['GAIN','REGRESSION']);
    assert.match(proof.nextAction,/Repair regressions/);
  }finally{await f.cleanup();}
});

test('new implementation modules remain honestly absent in the captured baseline',async()=>{
  const f=await fixture();
  try{
    const packet=startImprovement({root:f.dir,slug:'new-module',question:f.run.question,owner:'fixture-tool',
      files:['model.cjs'],newFiles:['selection.cjs']},registry);
    const snapshot=JSON.parse(packet.files['baseline.json']);
    const run={...f.run,baselineHash:packet.run.baselineHash,scope:packet.run.scope};
    assert.equal(snapshot.files[1].content,null);
    verifyBaseline(f.dir,snapshot);
    await fs.writeFile(path.join(f.dir,'selection.cjs'),"module.exports=id=>'/destination/?id='+encodeURIComponent(id);\n");
    await fs.writeFile(path.join(f.dir,'model.cjs'),"module.exports={link:require('./selection.cjs'),empty:()=>null};\n");
    const {proof}=await proveImprovement({root:f.dir,run,snapshot,registry});
    assert.equal(proof.demonstrated,true);
    assert.deepEqual(proof.changed,['model.cjs','selection.cjs']);
  }finally{await f.cleanup();}
});

test('a failing adapter is a harness error, never an apparent baseline failure',async()=>{
  const f=await fixture();
  try{
    for(const source of ['process.exit(1);','console.log("not JSON");','console.log(JSON.stringify({cases:[]}));',
      adapter.replace("id:'empty-state'","id:'keep-choice'")]){
      await fs.writeFile(path.join(f.dir,f.run.verifier),source);
      await assert.rejects(proveImprovement({root:f.dir,...f,registry}),/execution failed|JSON only|every declared|duplicate/);
    }
  }finally{await f.cleanup();}
});

test('proof detects edited snapshots, invalid evidence ranges and counterfeit comparisons',async()=>{
  const f=await fixture();
  try{
    const changed=structuredClone(f.snapshot);changed.files[0].content='fake baseline';changed.files[0].sha256=hash('fake baseline');
    assert.throws(()=>verifyBaseline(f.dir,changed),/does not match/);
    f.run.diagnosis.evidence[0].endLine=100000;
    assert.equal(assessRun(f.run,f.snapshot,registry).readyToImplement,false);
    f.run.diagnosis.evidence[0].endLine=1;
    const {proof}=await proveImprovement({root:f.dir,...f,registry});
    proof.demonstrated=true;proof.status='BEHAVIOR_DEMONSTRATED';proof.comparison[0].result='GAIN';
    assert.equal((await reviewProof({root:f.dir,...f,registry,proof})).demonstrated,false);
  }finally{await f.cleanup();}
});

test('path traversal, symlinks and untracked baselines cannot enter replay scope',async()=>{
  const f=await fixture();
  try{
    for(const p of ['../private','/etc/passwd','a/../../b','a\\b','-HEAD','a//b'])assert.throws(()=>sourcePath(p));
    assert.throws(()=>startImprovement({root:f.dir,slug:'bad',owner:'fixture-tool',question:'Which destination should I select?',files:['tests/replay.cjs']},registry),/regular tracked/);
    await fs.rename(path.join(f.dir,'model.cjs'),path.join(f.dir,'real.cjs'));
    await fs.symlink(path.join(f.dir,'real.cjs'),path.join(f.dir,'model.cjs'));
    await assert.rejects(proveImprovement({root:f.dir,...f,registry}),/symlinks/);
  }finally{await f.cleanup();}
});

test('CLI improve captures actual source; assess refuses an unfinished assignment and overwrite',async()=>{
  const out='experience-foundry/drafts/improvement-cli-'+process.pid;
  const cli=args=>spawnSync(process.execPath,['scripts/experience-foundry.mjs',...args],{cwd:root,encoding:'utf8'});
  try{
    const args=['improve','--slug','foundry-cli-test','--owner','rocket-launch-usa','--question','Can a visitor continue with the selected mission?',
      '--files','public/assets/rocket-flight-desk.js','--out',out];
    const result=cli(args);
    assert.equal(result.status,0,result.stderr);
    const assessed=cli(['assess','--run',out+'/run.json']);
    assert.equal(assessed.status,1);
    assert.ok(JSON.parse(assessed.stdout).blockers.length>0);
    assert.equal(cli(args).status,1);
    assert.equal(cli(['prove','--run',out+'/run.json']).status,1);
  }finally{await fs.rm(path.join(root,out),{recursive:true,force:true});}
});
