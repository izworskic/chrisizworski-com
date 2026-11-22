import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {shortlist,pairFor} from '../public/assets/michigan-winter-trail-desk.js';

const read=path=>readFileSync(path,'utf8');
const html=read('public/michigan-winter-trails/index.html');
const controller=read('public/assets/michigan-winter-trail-desk.js');
const map=read('public/assets/michigan-winter-trails.js');
const css=read('public/assets/michigan-winter-trails.css');
const routes=[...html.matchAll(/<article class="wf-story" id="([^"]+)" data-tag="([^"]+)" data-access="([^"]+)" data-region="([^"]+)" data-effort="([^"]+)"/g)]
 .map(([,id,tag,access,region,effort])=>({id,tag,access,region,effort}));

test('decision desk offers a crawlable first answer without replacing the 15 source dossiers',()=>{
 assert.equal(routes.length,15);
 assert.equal((html.match(/<h1\b/g)||[]).length,1);
 assert.match(html,/id="trl-desk-heading"/);
 assert.match(html,/id="trl-desk-results"/);
 assert.match(html,/id="trl-desk-outcome" role="status" aria-live="polite"/);
 assert.match(html,/Interactive comparison requires JavaScript/);
 assert.match(html,/href="#stop-1"/);
 assert.match(html,/href="#stop-2"/);
 assert.match(html,/script type="module" src="\/assets\/michigan-winter-trail-desk.js"/);
 assert.match(html,/dateModified":"2026-11-22"/);
 assert.match(read('public/sitemap-winter.xml'),/michigan-winter-trails\/<\/loc><lastmod>2026-11-22<\/lastmod>/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/pagead2.googlesyndication.com\/pagead\/js\/adsbygoogle.js/);
});

test('matching activities, region, effort and optional documentation keeps source order',()=>{
 const all=shortlist(routes,{mode:'all',region:'all',effort:'all',officialOnly:false});
 assert.equal(all.length,15);
 const upSnow=shortlist(routes,{mode:'snowshoe',region:'up',effort:'all',officialOnly:false});
 assert.ok(upSnow.length>=2);
 assert.ok(upSnow.every(r=>r.tag==='snowshoe'&&r.region==='up'));
 assert.deepEqual(upSnow,all.filter(r=>r.tag==='snowshoe'&&r.region==='up'));
 const documented=shortlist(routes,{mode:'all',region:'all',effort:'all',officialOnly:true});
 assert.ok(documented.length>0);
 assert.ok(documented.length<all.length);
 assert.ok(documented.every(r=>r.access==='documented'));
 const none=shortlist(routes,{mode:'bike',region:'up',effort:'easy',officialOnly:true});
 assert.deepEqual(none,[]);
});

test('comparison handles empty, single and rotating choices without duplication',()=>{
 assert.deepEqual(pairFor([]),[]);
 assert.deepEqual(pairFor([{id:'a'}],0).map(r=>r.id),['a']);
 const seq=[{id:'a'},{id:'b'},{id:'c'},{id:'d'},{id:'e'}];
 assert.deepEqual(pairFor(seq,0).map(r=>r.id),['a','b']);
 assert.deepEqual(pairFor(seq,2).map(r=>r.id),['c','d']);
 assert.deepEqual(pairFor(seq,4).map(r=>r.id),['e','a']);
 assert.deepEqual(pairFor(seq,-1).map(r=>r.id),['e','a']);
});

test('comparison is based on original source details and keeps independent snow and access checks',()=>{
 for(const id of ['trl-desk-mode','trl-desk-region','trl-desk-effort','trl-desk-official','trl-desk-next','trl-desk-map','trl-desk-clear'])
  assert.ok(html.includes('id="'+id+'"'),id);
 for(const source of ['/michigan-snow-depth/','/michigan-cross-country-skiing/','/lake-effect-snow/'])
  assert.ok(html.includes('href="'+source+'"'),source);
 for(const selector of ['.wf-story','.trl-status','.wf-access','.wf-kicker'])
  assert.ok(controller.includes(selector),selector);
 assert.match(controller,/data.*evidence|dataset\.evidence/);
 assert.match(controller,/protocol === 'https:'/);
 assert.match(controller,/not a live opening or safety ranking/);
 assert.match(html,/not live reports that the snow is ready/);
 assert.match(html,/not verify today's parking or grooming/);
 assert.doesNotMatch(controller,/maps\/dir\/|directions\?api=1/);
});

test('map selection and detailed notes stay synchronized and accessible',()=>{
 assert.match(controller,/syncOriginal\(\)/);
 assert.match(controller,/wf-chip\[data-tag/);
 assert.match(controller,/winter-trails:fit-map/);
 assert.match(map,/winter-trails:fit-map/);
 assert.match(controller,/scrollIntoView/);
 assert.match(controller,/prefers-reduced-motion/);
 assert.match(controller,/aria/);
 assert.match(css,/\.trl \.trl-desk-controls/);
 assert.match(css,/:focus-visible/);
 assert.match(css,/@media\(max-width:610px\)/);
});
