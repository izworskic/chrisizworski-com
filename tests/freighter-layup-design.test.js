'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/great-lakes-freighter-winter-layup/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/freighter-layup.css'),'utf8');
const registry=JSON.parse(fs.readFileSync(path.join(root,'public/assets/freighter-layup-registry.json'),'utf8'));
test('editorial entry keeps meaningful accessible visitor journey',()=>{
 assert.match(html,/<body class="layup-home">/);
 for(const id of ['main','page-title','explorer','layup-map','harbor-panel','fleet','ship-grid','ship-detail','how-it-works','ship-biographies'])assert.ok(html.includes('id="'+id+'"'),id);
 assert.ok(html.indexOf('id="explorer"')<html.indexOf('id="fleet"'));
 assert.ok(html.indexOf('id="fleet"')<html.indexOf('id="how-it-works"'));
 assert.ok(html.includes('href="#explorer"'));
 assert.ok(html.includes('aria-label="Explore a harbor"'));
 assert.ok(html.includes('role="status"'));
});
test('real hero photograph has durable credit and honest historic distinction',()=>{
 assert.ok(html.includes('Mesabi_Miner')||html.includes('Mesabi%20Miner'));
 assert.ok(html.includes('Sharon Mollerus'));
 assert.ok(html.includes('CC BY 2.0'));
 assert.ok(html.includes('Not a 2025–26 layup photograph'));
 assert.ok(html.includes('https://commons.wikimedia.org/wiki/Special:Redirect/file/'));
});
test('design presentation is isolated from permanent vessel biography pages',()=>{
 assert.ok(css.includes('.layup-home .hero'));
 assert.ok(css.includes('.layup-home .atlas-workspace'));
 assert.ok(css.includes('.layup-home .feature-grid'));
 assert.ok(css.includes('@media(max-width:580px)'));
});
test('all twelve crawlable ship names and five verified harbor names remain in source',()=>{
 const s=registry.seasons.find(x=>x.id==='2025-26');
 assert.equal(s.records.length,12);
 for(const v of s.records)assert.ok(html.includes('<h3>'+v.name+'</h3>'),'static fallback '+v.name);
 for(const id of ['season','stat-ships','stat-harbors','stat-year','ship-search','harbor-filter','berth-filter','clear-filters','count-note'])assert.ok(html.includes('id="'+id+'"'),id);
});
