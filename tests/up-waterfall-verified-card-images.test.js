'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const html=fs.readFileSync('public/upper-peninsula-waterfalls/index.html','utf8');
const css=fs.readFileSync('public/assets/up-waterfalls.css','utf8');
const photos=JSON.parse(fs.readFileSync('data/up-waterfall-photo-provenance.json','utf8')).photos;
const queue=JSON.parse(fs.readFileSync('data/up-waterfall-photo-review-queue.json','utf8'));
const escapeHtml=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
const cards=[...html.matchAll(/<article class="waterfall-card" data-fall data-id="([^"]+)"[\s\S]*?<\/article>/g)];
const byId=new Map(cards.map(m=>[m[1],m[0]]));
test('verified waterfall photo previews appear only for fully attributed named waterfall guides',()=>{
 assert.equal(cards.length,80);
 assert.equal(byId.size,80);
 assert.equal(photos.length,queue.verifiedPhotoCount);
 assert.equal(queue.pending.length,queue.unphotographedCuratedCount);
 assert.equal((html.match(/class="upfall-card-preview"/g)||[]).length,photos.length);
 const verified=new Set(photos.map(p=>p.id));
 for(const p of photos){
   const c=byId.get(p.id);
   assert.ok(c,'missing card '+p.id);
   assert.equal((c.match(/class="upfall-card-preview"/g)||[]).length,1,'only one photo '+p.id);
   assert.ok(c.includes('src="'+escapeHtml(p.imageUrl)+'"'),'photo source '+p.id);
   assert.ok(c.includes('alt="'+escapeHtml(p.alt)+'"'),'exact named alt '+p.id);
   assert.ok(c.includes('href="/upper-peninsula-waterfalls/'+p.id+'/"'),'real visitor guide '+p.id);
   assert.ok(c.includes('href="'+escapeHtml(p.sourceUrl)+'"'),'photo provenance '+p.id);
   assert.ok(c.includes('href="'+escapeHtml(p.licenseUrl)+'"'),'reuse license '+p.id);
   assert.ok(c.includes(escapeHtml(p.creator)),'visible photographer credit '+p.id);
   assert.match(c,/loading="lazy" decoding="async" fetchpriority="low"/);
 }
 for(const row of queue.pending){
   assert.ok(byId.has(row.id),'missing unphotographed listing '+row.id);
   assert.ok(!byId.get(row.id).includes('class="upfall-card-preview"'),'never invent thumbnail for '+row.id);
   assert.ok(!verified.has(row.id));
 }
});
test('compact photo previews do not remove visitor controls or map workflow',()=>{
 assert.ok(css.includes('.upfall-card-preview img'));
 assert.ok(css.includes('object-fit:contain'));
 assert.ok(css.includes('.waterfall-card .arrival-details{clear:both}'));
 assert.ok(html.includes('id="falls-map"'));
 assert.ok(html.includes('id="shortlist"'));
 assert.ok(html.includes('id="results"'));
 assert.ok(html.includes('pagead2.googlesyndication.com'));
 assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/upper-peninsula-waterfalls/"'));
 assert.equal((html.match(/class="upfall-photo-preview-card"/g)||[]).length,3,'keep hero gallery');
});

test('verified-photo card HTML remains deterministically synchronized with the vetted registry',()=>{
 const verify=cp.spawnSync(process.execPath,['scripts/sync-up-waterfall-photo-cards.mjs','--check'],{encoding:'utf8',timeout:15000});
 assert.equal(verify.status,0,verify.stderr||verify.stdout);
 assert.match(verify.stdout,/Waterfall photo card previews current:/);
});
