'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {parseArgs,reportFromSamples}=require('../scripts/rockhounding/poststorm-report.cjs');
const cfg=require('../data/rockhounding/grand-marais-wave-pilot.json');
const now='2026-10-15T12:00:00.000Z';
test('real pilot config refuses model-based findings while cells and waterlines are unverified',()=>{
 const result=reportFromSamples({input:{source:'NOAA_GLWU',records:[]},pilotConfig:cfg,nowISO:now});
 assert.deepEqual(result.report.sites.map(s=>s.status),['CELL_NOT_VERIFIED','CELL_NOT_VERIFIED']);
 assert.equal(result.report.canPublishSafeRockhoundingWindow,false);
 assert.equal(result.report.researchOnly,true);
});
test('argument validation requires explicit archive and output so no silent public file writes',()=>{
 assert.throws(()=>parseArgs(['--input','a.json']),/required/);
 assert.deepEqual(parseArgs(['--input','a','--archive','b','--output','c','--now',now]).input,'a');
});
test('CLI roundtrip persists private small archive and research diagnostics without network',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'rockhounding-poststorm-'));
 try{
  const input=path.join(dir,'sample.json'),archive=path.join(dir,'archive.json'),output=path.join(dir,'report.json');
  fs.writeFileSync(input,JSON.stringify({source:'NOAA_GLWU',records:[]}));
  const p=spawnSync(process.execPath,[path.join(__dirname,'../scripts/rockhounding/poststorm-report.cjs'),
  '--input',input,'--archive',archive,'--output',output,'--now',now],{encoding:'utf8',timeout:10000});
  assert.equal(p.status,0,p.stderr);assert.ok(fs.existsSync(archive));
  const x=JSON.parse(fs.readFileSync(output,'utf8'));
  assert.deepEqual(x.sites.map(s=>s.status),['CELL_NOT_VERIFIED','CELL_NOT_VERIFIED']);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
