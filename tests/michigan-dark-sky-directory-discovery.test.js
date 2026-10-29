'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const route='/national-tools/dark-sky/michigan/';
const publicPath=path.join(root,'public/synced-national-tools/index.html');
const action=path.join(root,'scripts/add-michigan-dark-sky-directory-discovery.mjs');

test('actual public National Tools mirror links to Michigan night-sky park planning from Aurora card',()=>{
 const html=fs.readFileSync(publicPath,'utf8');
 const card=html.match(/<article class="directory-card"[^>]*data-tool-id="aurora"[^>]*>[\s\S]*?<\/article>/)?.[0];
 assert.ok(card,'Aurora catalog card should exist');
 assert.match(card,/data-dark-sky-bridge="michigan"/);
 assert.ok(card.includes('href="'+route+'"'));
 assert.match(card,/stargazing dark sky protected parks michigan access/);
 assert.equal((html.match(/href="\/national-tools\/dark-sky\/michigan\/"/g)||[]).length,1,
  'A single contextual link, not a duplicate catalog item');
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/"/);
});

test('directory sync follow-up is idempotent and survives rebuilding the mirror',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'mi-dark-sky-discovery-'));
 const file=path.join(temp,'index.html');
 const base='<html><body><article class="directory-card" data-search-card data-tool-id="aurora" data-tags="sky night"><h3>Aurora Tonight</h3><div class="card-actions"><a class="primary-action" href="/national-tools/aurora/">Check tonight</a></div></article></body></html>';
 try{
  fs.writeFileSync(file,base);
  const run=()=>execFileSync(process.execPath,[action],{cwd:root,env:{...process.env,NATIONAL_TOOLS_DIRECTORY_FILE:file},stdio:'pipe'});
  run();
  const one=fs.readFileSync(file,'utf8');
  assert.match(one,/Michigan dark-sky parks, forecasts and arrival guidance/);
  run();
  const two=fs.readFileSync(file,'utf8');
  assert.equal(one,two,'A later build must not duplicate the park link');
  assert.equal((two.match(/data-dark-sky-bridge="michigan"/g)||[]).length,1);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
});
