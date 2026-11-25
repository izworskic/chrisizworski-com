'use strict';
// Production is untouched: this test checks opt-in skill parity and an offline ranking pilot.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const names=['hf-cli','huggingface-datasets','huggingface-tool-builder','ml-justification'];
const get=p=>fs.readFileSync(path.join(root,p),'utf8');

test('review-only Hugging Face skills are mirrored exactly for all three agent harnesses',()=>{
 for(const name of names) {
  const base=get('.agents/skills/'+name+'/SKILL.md');
  assert.match(base,new RegExp('^---\\nname: '+name+'\\n'));
  assert.ok(base.length>450,name+' skill is actionable rather than a pointer');
  for(const dir of ['.claude','.github']) assert.equal(get(dir+'/skills/'+name+'/SKILL.md'),base);
 }
 assert.match(get('AGENTS.md'),/HUGGING_FACE_CAPABILITIES/);
});
test('offline baseline reads the twenty existing HTML cards without fetching models',()=>{
 const r=spawnSync(process.execPath,['scripts/evaluate-adventure-semantic-search.mjs','--json'],
  {cwd:root,encoding:'utf8',timeout:10000});
 assert.equal(r.status,0,r.stderr);
 const out=JSON.parse(r.stdout);
 assert.equal(out.cardCount,20);
 assert.equal(out.queryCount,12);
 assert.equal(out.status,'NOT_EVALUATED');
 assert.equal(out.semantic,null);
 assert.ok(out.lexical.hitAt3>=0 && out.lexical.hitAt3<=1);
 assert.ok(out.lexical.mrr>=0 && out.lexical.mrr<=1);
 assert.deepEqual(out.lexical.cases.find(q=>q.query.includes('sandstone')).expected,['pictured-rocks']);
});
test('strict publication gate cannot pass without an independently reviewed vector snapshot',()=>{
 const r=spawnSync(process.execPath,['scripts/evaluate-adventure-semantic-search.mjs','--strict'],
 {cwd:root,encoding:'utf8',timeout:10000});
 assert.notEqual(r.status,0);
 assert.match(r.stderr,/Strict semantic relevance gate failed/);
});
test('capability adoption adds no visitor runtime/model scripts and preserves ad/SEO policy',()=>{
 const doc=get('docs/HUGGING_FACE_CAPABILITY_ADOPTION_20261122.md');
 assert.match(doc,/No production UI changes/);
 assert.match(doc,/Auto ads/);
 assert.match(doc,/NOT VERIFIED/);
 assert.match(doc,/onnx-community\/all-MiniLM-L6-v2-ONNX/);
});
