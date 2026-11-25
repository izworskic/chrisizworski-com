'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('HF model is pinned to a real revision and no run-time model weights are bundled',()=>{
 const script=read('scripts/run-adventure-semantic-embeddings.mjs');
 const workflow=read('.github/workflows/hf-semantic-benchmark.yml');
 assert.match(script,/aff7a1dc4e8a1ea593e6ea21e95c22ef0a25966f/);
 assert.match(script,/onnx-community\/all-MiniLM-L6-v2-ONNX/);
 assert.match(script,/dtype:'q4'/);
 assert.match(workflow,/workflow_dispatch/);
 assert.match(workflow,/timeout-minutes: 20/);
 assert.match(workflow,/HF_RUNTIME_DIR/);
 assert.match(workflow,/actions\/upload-artifact/);
 assert.doesNotMatch(workflow,/schedule:/);
 assert.doesNotMatch(workflow,/secrets\.|write-all|contents: write/);
});
test('holdout stays separate from existing gold set with known source card IDs',()=>{
 const src=read('public/michigan-destinations/index.html');
 const ids=[...src.matchAll(/<article class="destination" id="([^"]+)"/g)].map(x=>x[1]);
 const holdout=JSON.parse(read('scripts/fixtures/adventure-semantic-holdout.json'));
 const gold=JSON.parse(read('scripts/fixtures/adventure-semantic-queries.json'));
 assert.equal(ids.length,20);
 assert.equal(new Set(ids).size,20);
 assert.equal(holdout.length,20);
 assert.equal(new Set(holdout.map(x=>x.query)).size,20);
 for(const x of holdout) {
  assert.ok(x.query.split(' ').length>6);
  assert.ok(x.expected.length>0);
  for(const id of x.expected) assert.ok(ids.includes(id),id);
  assert.ok(!gold.some(g=>g.query===x.query));
 }
});
test('off-line pinned embedding generator does not import or fetch a model for --help',()=>{
 const p=spawnSync(process.execPath,['scripts/run-adventure-semantic-embeddings.mjs','--help'],{
  cwd:root,encoding:'utf8',timeout:5000,env:{...process.env,HF_RUNTIME_DIR:''}});
 assert.equal(p.status,0,p.stderr);
 assert.match(p.stdout,/pinned CPU ONNX model/);
});
