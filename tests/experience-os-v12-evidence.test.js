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

test('Experience OS V1.2: bootstrap creates an explicitly incomplete draft, not a fake release',async()=>{
 const {makeDraft}=await import(pathToFileURL(path.join(root,'scripts/new-experience-os-v1.2.mjs')).href);
 const {validateReleaseRecord}=await load();
 const draft=makeDraft({slug:'test-adventure',ownerRepo:'owner/visitors',canonical:'https://example.org/test-adventure/',pageFile:'public/test-adventure/index.html'});
 assert.equal(draft.recordStatus,'draft');
 assert.equal(draft.release.live.status,'PENDING');
 assert.equal(draft.release.measured.status,'NOT_MEASURED');
 const result=validateReleaseRecord(draft);
 assert.equal(result.ok,false,'A source-free draft must not pass the structural release gate');
 assert.ok(result.issues.some(x=>x.code==='claims'));
});
test('Experience OS V1.2: bootstrap rejects unsafe paths and avoids clobbering existing outputs',async()=>{
 const {makeDraft}=await import(pathToFileURL(path.join(root,'scripts/new-experience-os-v1.2.mjs')).href);
 assert.throws(()=>makeDraft({slug:'test-adventure',ownerRepo:'owner/repo',canonical:'http://example.com/test/',pageFile:'public/test/index.html'}),/HTTPS/);
 assert.throws(()=>makeDraft({slug:'test-adventure',ownerRepo:'owner/repo',canonical:'https://example.com/test/',pageFile:'../secret.html'}),/safe relative/);
 const {spawnSync}=require('node:child_process'),os=require('node:os');
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'experience-os-'));
 try{
  const cli=path.join(root,'scripts/new-experience-os-v1.2.mjs');
  const args=[cli,'--slug','test-adventure','--ownerRepo','owner/repo','--canonical','https://example.org/test-adventure/','--pageFile','public/test-adventure/index.html','--out','data/draft.json'];
  const a=spawnSync(process.execPath,args,{cwd:tmp,encoding:'utf8'});
  const b=spawnSync(process.execPath,args,{cwd:tmp,encoding:'utf8'});
  assert.equal(a.status,0,a.stderr);
  assert.equal(b.status,1,'The second call must never overwrite an existing review');
  assert.ok(fs.existsSync(path.join(tmp,'data/draft.json')));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});

test('Experience OS V1.2: PENDING text fields cannot pass even when all required array keys exist',async()=>{
 const {makeDraft}=await import(pathToFileURL(path.join(root,'scripts/new-experience-os-v1.2.mjs')).href);
 const {validateReleaseRecord}=await load();
 const blank=makeDraft({slug:'test-adventure',ownerRepo:'owner/visitors',canonical:'https://example.org/test-adventure/',pageFile:'public/test-adventure/index.html'});
 const r=validateReleaseRecord(blank);
 assert.ok(r.issues.some(i=>i.code==='pending.placeholder'));
});
test('Experience OS V1.2: a released record cannot claim verified if actual browser QA is pending',async()=>{
 const {validateReleaseRecord}=await load();
 const x=readSample();x.qa.browserStatus='PENDING';delete x.qa.browserRun;x.qa.screenshotEvidence=[];
 const r=validateReleaseRecord(x);
 assert.ok(r.issues.some(i=>i.code==='recordStatus.browser'));
 assert.ok(r.issues.some(i=>i.code==='release.browserProof'));
});

test('Experience OS V1.2: published CLI verifies the real Gooseberry release record with site integration',()=>{
 const {spawnSync}=require('node:child_process');
 const cli=path.join(root,'scripts/verify-experience-os-v1.2.mjs');
 const record=path.join(root,'design-systems/experience-os-v1/examples/gooseberry-release-record.json');
 const run=spawnSync(process.execPath,[cli,record,'--check-site'],{cwd:root,encoding:'utf8'});
 assert.equal(run.status,0,run.stderr||run.stdout);
 assert.match(run.stdout,/structural checks/);
 assert.match(run.stdout,/No browser, network/);
});
test('Experience OS V1.2: central site audit catches catalog/ItemList order drift',async()=>{
 const {auditSite}=await load();
 const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'experience-os-order-'));
 try{
  for(const relative of [
   'public/gooseberry-falls/index.html','public/tools/index.html',
   'public/sitemap.xml','benchmarks/tool-network-registry.json'
  ]){
   const target=path.join(tmp,relative);
   fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.copyFileSync(path.join(root,relative),target);
  }
  const toolsFile=path.join(tmp,'public/tools/index.html');
  let html=fs.readFileSync(toolsFile,'utf8');
  const block=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(block);
  const graph=JSON.parse(block[1]),items=graph['@graph'].find(x=>x['@type']==='ItemList').itemListElement;
  const idx=items.findIndex(x=>x.item?.url==='https://chrisizworski.com/gooseberry-falls/');
  assert.ok(idx>=0&&idx<items.length-1,'Must start ordered to test drift');
  const [gooseberry]=items.splice(idx,1);items.push(gooseberry);
  items.forEach((x,i)=>x.position=i+1);
  html=html.replace(block[1],JSON.stringify(graph));
  fs.writeFileSync(toolsFile,html);
  const issues=auditSite(readSample(),tmp);
  assert.ok(issues.some(x=>x.code==='site.catalogOrder'),JSON.stringify(issues));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
});
