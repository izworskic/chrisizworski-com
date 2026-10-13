'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'public/epic-ikon-pass/index.html'),'utf8');
const policy=fs.readFileSync(path.join(root,'public/assets/epic-ikon-2026-27.js'),'utf8');
const E=require('../public/assets/epic-ikon-2026-27.js');
const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
const nodes=schema['@graph'];
test('one canonical with consistent shared Chris Izworski identity and query-first SEO',()=>{
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/epic-ikon-pass\/"/);
 assert.match(html,/<title>Epic vs Ikon Pass 2026–27: Blackout Dates \| Chris Izworski<\/title>/);
 assert.equal(nodes.filter(n=>n['@type']==='Person').length,1);
 assert.equal(nodes.find(n=>n['@type']==='Person')['@id'],'https://chrisizworski.com/#person');
 assert.match(html,/Built by Chris Izworski/);
});
test('the exact visible six FAQ answers match structured data and are not invented',()=>{
 const faq=nodes.filter(n=>n['@type']==='FAQPage');
 assert.equal(faq.length,1);
 assert.equal(faq[0].mainEntity.length,6);
 for(const row of faq[0].mainEntity){
  assert.ok(html.includes('<summary>'+row.name+'</summary>'));
  assert.ok(html.includes('<p>'+row.acceptedAnswer.text+'</p>'));
 }
});
test('all four indexed examples resolve to deterministic canonical-page checks',()=>{
 const links=[...html.matchAll(/data-ski-intent="([^"]+)" href="([^"]+)"/g)];
 assert.equal(links.length,4);
 for(const [,intent,encoded]of links){
  const u=new URL(encoded.replaceAll('&amp;','&'),'https://chrisizworski.com');
  assert.equal(u.pathname,'/epic-ikon-pass/');
  const pass=u.searchParams.get('pass'),resort=u.searchParams.get('resort'),date=u.searchParams.get('date');
  assert.ok(E.PASS_NAMES[pass]&&E.byId[resort]&&/^202[67]-\d\d-\d\d$/.test(date),intent);
  const verdict=E.evaluate({pass,resort,date});
  assert.notEqual(verdict.status,'UNKNOWN',intent);
 }
 assert.equal((html.match(/data-ski-intent=/g)||[]).length,4); // four first-party decision links, no duplicate anchors
});
test('transparent 2026/27 facts and original policy gates remain discoverable',()=>{
 assert.match(html,/Dec 26–31, 2026/);
 assert.match(html,/Dec 26–30, 2026/);
 assert.match(html,/Snowmass-only/);
 assert.match(html,/seven combined days/);
 assert.match(html,/Jackson Hole Mountain Resort/);
 assert.ok(policy.includes('2026-12-31'));
 assert.match(html,/pass_decoder_check/);
 assert.match(html,/ski_intent_shortcut_click/);
 assert.match(html,/The calculator is a source-linked policy check/);
});
