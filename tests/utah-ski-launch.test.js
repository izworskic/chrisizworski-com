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
 for(const r of ['Alta','Snowbird','Brighton','Solitude'])assert.ok(html.includes(r));
 assert.match(html,/No road-open, safe-to-drive or guaranteed-parking verdict/);
 assert.match(html,/id="sr210-context"/);assert.match(html,/id="sr190-context"/);
});
