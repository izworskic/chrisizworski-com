'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.join(__dirname,'..',p),'utf8');
const html=read('public/niagara-falls-today/index.html');
const js=read('public/assets/niagara-falls-today.js');
test('V6 page puts the actual planning decision above video and wayfinding',()=>{
 const planner=html.indexOf('<div class="primary-grid">');
 const film=html.indexOf('<section class="falls-films');
 const map=html.indexOf('<section class="wayfinding-panel"');
 assert.ok(planner>0&&film>planner&&map>film);
 assert.ok(html.indexOf('id="plan-form"')<film);
 assert.equal((html.match(/<img /g)||[]).length,4,'one hero and three compact film thumbnails');
});
test('query-first title, canonical and one owner identity are maintained',()=>{
 assert.match(html,/<title>Niagara Falls Today: Boat Rides, Hours &amp; Visit Planner<\/title>/);
 assert.match(html,/Boat Rides, Hours &amp; Visit Planner/);
 assert.match(html,/name="description" content="Planning Niagara Falls today\?/);
 assert.equal((html.match(/rel="canonical"/g)||[]).length,1);
 assert.equal((html.match(/"@type":"Person"/g)||[]).length,1);
 assert.match(html,/Built by Chris Izworski/);
});
test('boat and side questions are visible HTML and valid FAQ JSON, not hidden generated text',()=>{
 const tag=html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)<\/script>/);
 assert.ok(tag);
 const schema=JSON.parse(tag[1]);assert.equal(schema['@context'],'https://schema.org');
 const faq=schema['@graph'].find(x=>x['@type']==='FAQPage');
 assert.ok(faq);
 for(const question of ['Can I take a Niagara Falls boat ride today?','Is Maid of the Mist the same as the boat from Canada?']){
  assert.ok(faq.mainEntity.some(x=>x.name===question));
  assert.ok(html.includes('<summary>'+question+'</summary>'));
 }
 assert.match(html,/https:\/\/www\.maidofthemist\.com\/schedule-pricing\//);
});
test('high-intent boat, short visit and family quick starts invoke planner, not a fake result',()=>{
 for(const intent of ['boat','short','family']){
  assert.match(html,new RegExp('data-niagara-preset="'+intent+'"'));
  assert.match(js,new RegExp("id==='"+intent+"'"));
 }
 assert.match(js,/presetPending=true/);
 assert.match(js,/submit\(\)/);
 assert.match(js,/niagara_preset_/);
 assert.match(js,/scrollIntoView/);
});
test('successful boat results lead to official ticketing but never promise live inventory',()=>{
 assert.match(js,/https:\/\/www\.maidofthemist\.com\/schedule-pricing\//);
 assert.match(js,/https:\/\/www\.cityexperiences\.com\/niagara\/city-cruises\/niagara\//);
 assert.match(js,/Bookings, tickets and queues are not confirmed/);
 assert.match(js,/niagara_official_boat_tickets_click/);
 assert.match(js,/boat_included/);
});
test('two search-visible Niagara decision pages link back without new duplicate landing pages',()=>{
 for(const target of ['public/national-tools/niagara-rainbow/index.html','public/niagara-border-crossing/index.html']){
  const t=read(target);assert.match(t,/href="\/niagara-falls-today\/"/);
  assert.match(t,/rel="canonical"/);
 }
});
