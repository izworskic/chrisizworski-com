'use strict';const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const html=fs.readFileSync('public/utah-ski-access/index.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const script=fs.readFileSync('scripts/add-utah-ski-discovery.mjs','utf8');
test('V2 is canonical and has indexable query-first search title',()=>{
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/utah-ski-access\/"/);
 assert.match(html,/<meta name="robots" content="index,follow/);
 const title=html.match(/<title>([^<]+)<\/title>/)?.[1];assert.ok(title);
 assert.ok(title.length<=60,'SERP title must stay within 60 chars');
 assert.match(html,/UTAH|Utah/);assert.match(html,/application\/ld\+json/);
});
test('National Tools registration and sitemap are idempotently built',()=>{
 assert.match(pkg.scripts['build:site'],/scripts\/add-utah-ski-discovery.mjs/);
 assert.match(script,/data-tool-id="utah-ski-access"/);
 assert.match(script,/public\/synced-national-tools\/index.html/);
 assert.match(script,/public\/sitemap.xml/);
 assert.match(script,/data-search-card/g);
 assert.match(script,/--check/);
});
test('First-screen canyon orientation and 2026-27 resort handoffs',()=>{
 assert.match(html,/canyon-map-title/);assert.match(html,/SR-210/);assert.match(html,/SR-190/);
 assert.ok(html.includes('src="/images/utah-ski/utah-cottonwood-canyons-illustrated.webp"'));
 assert.match(html,/Snowbird → Alta/);assert.match(html,/Solitude → Brighton/);
 assert.match(html,/class="canyon-art-map"/);
 for(const r of ['Alta','Snowbird','Brighton','Solitude'])assert.ok(html.includes(r));
 assert.match(html,/No road-open, safe-to-drive or guaranteed-parking verdict/);
 assert.match(html,/id="sr210-context"/);assert.match(html,/id="sr190-context"/);
});

test('Utah ski illustration is an optimized binary image asset, not an inline diagram',()=>{
 const path='public/images/utah-ski/utah-cottonwood-canyons-illustrated.webp';
 const image=fs.readFileSync(path);
 assert.equal(image.subarray(0,4).toString(),'RIFF');
 assert.equal(image.subarray(8,12).toString(),'WEBP');
 assert.ok(image.length>50000&&image.length<350000,'Map is a readable, reasonably sized WebP');
 assert.doesNotMatch(html,/<figure class="corridor"[^>]*><svg/);
 assert.match(html,/loading="eager"/);
 assert.match(html,/not exact road alignment or live closures/);
});
