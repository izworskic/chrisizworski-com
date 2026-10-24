'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const registry=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8'));
const bios=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-vessel-biographies.json'),'utf8'));
const {renderProfile}=require('../lib/freighter-layup-profile-render.cjs');
test('six authored biography subjects with meaningful chapters and trusted references',()=>{
 assert.equal(bios.schemaVersion,1);
 assert.equal(bios.profiles.length,6);
 assert.equal(new Set(bios.profiles.map(p=>p.id)).size,bios.profiles.length);
 for(const p of bios.profiles){
   assert.ok(registry.seasons.some(s=>s.records.some(r=>r.id===p.id)),'must have a winter record');
   assert.ok(p.intro.length>100&&p.chapters.length>=2);
   assert.ok(p.specs.length>=2);
   for(const ch of p.chapters){assert.ok(ch.body.length>=100);assert.match(ch.source,/^https:\/\//);}
   for(const spec of p.specs)assert.match(spec.source,/^https:\/\//);
 }
});
test('static pages match deterministic renderer and have unique canonicals',()=>{
 const augmented={...registry,__profiles:bios.profiles};
 const canonicals=new Set();
 for(const p of bios.profiles){
   const rendered=renderProfile(p,augmented);
   const location=path.join(root,'public/great-lakes-freighter-winter-layup/vessels',p.id,'index.html');
   assert.equal(fs.readFileSync(location,'utf8'),rendered,'profile drift: '+p.id);
   const canonical='https://chrisizworski.com/great-lakes-freighter-winter-layup/vessels/'+p.id+'/';
   assert.ok(rendered.includes('<link rel="canonical" href="'+canonical+'">'));
   assert.ok(!canonicals.has(canonical));canonicals.add(canonical);
   assert.ok(rendered.includes('application/ld+json')&&rendered.includes('Read the original reporting'));
   assert.ok(rendered.includes('Where this ship spent its winters'));
 }
});
test('Algoma Compass timeline has independent records in both seasons',()=>{
 const p=bios.profiles.find(p=>p.id==='algoma-compass');
 const page=renderProfile(p,{...registry,__profiles:bios.profiles});
 assert.ok(page.includes('Winter 2025–26'));
 assert.ok(page.includes('Winter 2024–25'));
 assert.ok(page.includes('2025-01-31'));
 assert.ok(page.includes('2026-01-19'));
 assert.equal((page.match(/Owen Sound, Ontario/g)||[]).length>=2,true);
 assert.ok(!page.includes('current live ship position'));
});
test('image attribution stays tied to source photo metadata',()=>{
 const page=renderProfile(bios.profiles.find(p=>p.id==='oakglen'),{...registry,__profiles:bios.profiles});
 assert.ok(page.includes('GuavaTrain'));
 assert.ok(page.includes('CC BY-SA 4.0'));
 assert.ok(page.includes('Ship_Oakglen.jpg'));
});
