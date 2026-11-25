'use strict';
// Structural audit only; never grades hypothetical agent behavior.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const reg=JSON.parse(read('docs/skill-evals/skill-maturity-registry.json'));
const list=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name).sort();
const blob=data=>crypto.createHash('sha1').update('blob '+data.length+'\0').update(data).digest('hex');
const sorted=a=>[...a].sort();
const exceptions=new Set(['experience-investment','penpot-design','rea']);
const explicit=new Set(['penpot-design','rea','stitch-concept-review']);
test('registry reconciles actual skill inventory and catalog',()=>{
 assert.equal(reg.schema,1);
 const ids=sorted(reg.skills.map(s=>s.id));
 assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(ids,list('.agents/skills'));
 assert.deepEqual(ids,list('.claude/skills'));
 assert.deepEqual(ids.filter(x=>!exceptions.has(x)),list('.github/skills'));
 const manual=read('docs/PRODUCT_ENGINEERING_OS.md').toString();
 const section=manual.slice(manual.indexOf('## 5.'),manual.indexOf('## 6.'));
 const catalog=[...section.matchAll(/^\| \[([a-z0-9-]+)\]\(\.\.\/\.agents\/skills\/[^/]+\/SKILL\.md\)/gm)].map(m=>m[1]);
 assert.deepEqual(sorted(catalog),ids);
 assert.equal(reg.inventory.logicalSkills,ids.length);
 assert.equal(reg.inventory.mirrorFiles,reg.skills.reduce((n,s)=>n+s.mirrors.length,0));
});
test('audited content and permission boundaries are preserved',()=>{
 for(const s of reg.skills){
  const expected=['.agents','.claude',...(!exceptions.has(s.id)?['.github']:[])].map(m=>m+'/skills/'+s.id+'/SKILL.md');
  assert.deepEqual(s.mirrors,expected,s.id);
  for(const p of expected)assert.equal(blob(read(p)),s.auditedSkillBlob,s.id+' changed; review evidence and refresh registry');
  if(explicit.has(s.id))assert.equal(s.authorization,'explicit-owner-only',s.id);
  if(s.caseSuite){assert.ok(fs.statSync(path.join(root,s.caseSuite)).isFile(),s.id);assert.equal(s.caseCoverage,'dedicated');}
  else assert.equal(s.caseCoverage,'dedicated-cases-not-located');
 }
 for(const p of reg.sharedReferences.paths)assert.ok(fs.statSync(path.join(root,p)).isFile());
 assert.equal(reg.inventory.dedicatedCaseSuites,reg.skills.filter(s=>s.caseSuite).length);
 assert.equal(reg.inventory.withoutDedicatedCasesLocated,reg.skills.filter(s=>!s.caseSuite).length);
});
test('no unevaluated skill receives invented validation or retirement',()=>{
 for(const s of reg.skills){
  const e=s.behavioralEvidence;
  if(e.status==='NOT_VERIFIED'){
   assert.deepEqual(e.runs,[],s.id);
   assert.equal(e.decision,'retain-pending-evidence',s.id);
  }else{
   // A later schema revision must define and validate actual fresh-context evidence.
   assert.fail(s.id+' requires a reviewed evidence schema before maturity promotion');
  }
  assert.ok(s.implementationEvidence.every(x=>x.type.endsWith('not-skill-effect')));
 }
 assert.equal(reg.inventory.behaviorallyEvaluated,0);
 assert.equal(reg.inventory.provenByPairedEvidence,0);
 for(const x of reg.frameworkEvaluations){
  assert.ok(fs.statSync(path.join(root,x.suite)).isFile());
  assert.equal(x.status,'NOT_VERIFIED');
  assert.equal(x.baselineExecuted,0);
  assert.equal(x.candidateExecuted,0);
  assert.ok(x.planned>0);
 }
 for(const o of reg.overlapReview){
  assert.ok(o.skills.length>=2&&o.boundary.length>0&&o.disposition.startsWith('retain')||o.skills.length>=2&&o.boundary.length>0&&o.disposition==='evaluate-routing-overlap');
  for(const id of o.skills)assert.ok(reg.skills.some(s=>s.id===id),id);
 }
});
