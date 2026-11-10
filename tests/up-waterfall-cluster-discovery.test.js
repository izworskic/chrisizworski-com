'use strict';
// B84: each cluster nav edge must be an official visitor guide, never inferred from a nearby GIS point.
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..');
const page=fs.readFileSync(path.join(root,'public/upper-peninsula-waterfalls/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/up-waterfalls.css'),'utf8');
const {CLUSTERS,planFor,focusId}=require('../public/assets/up-waterfall-cluster-discovery.js');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/up-waterfalls.json'),'utf8')).waterfalls;
const records=new Map(data.map(x=>[x.id,x]));
test('every map-to-day membership is published and backed by an existing curated land-manager guide',()=>{
 assert.equal(CLUSTERS.length,4);
 assert.equal(new Set(CLUSTERS.map(c=>c.id)).size,4);
 const ids=CLUSTERS.flatMap(group=>group.ids);
 assert.equal(ids.length,15);assert.equal(new Set(ids).size,ids.length);
 for(const id of ids){
   const item=records.get(id);assert.ok(item,'no curated guide: '+id);
   assert.ok(['verified-access-guide','verified-closure-guide'].includes(item.publication),id);
   assert.equal(item.verification?.parking?.verified,true,id);
   assert.equal(item.verification?.trail?.verified,true,id);
   assert.ok(item.source.startsWith('https://'),id);
   assert.ok(page.includes('data-id="'+id+'"'),id);
   const group=CLUSTERS.find(x=>x.ids.includes(id));
   assert.ok(page.includes('id="'+group.id+'"'),'missing matching itinerary '+id);
   assert.ok(page.includes('data-id="'+id+'"')&&page.includes('href="#'+group.id+'"'),'hub cannot navigate to '+group.id);
 }
 const sandstone=records.get('sandstone-falls');assert.equal(sandstone.status,'closed');
 assert.ok(CLUSTERS.find(c=>c.id==='black-river-waterfall-day').ids.includes('sandstone-falls'));
 const regional=fs.readFileSync(path.join(root,'public/assets/up-waterfalls-regional-clusters.js'),'utf8');
 assert.ok(!regional.includes("'sandstone-falls'"),'closed falls must never become saveable itinerary preset');
});
test('each of 15 published guides offers real region and map navigation without replacing its canonical',()=>{
 for(const group of CLUSTERS)for(const id of group.ids){
  const html=fs.readFileSync(path.join(root,'public/upper-peninsula-waterfalls',id,'index.html'),'utf8');
  assert.equal((html.match(/class="fall-guide-region-bridge"/g)||[]).length,1,id);
  assert.ok(html.includes('href="/upper-peninsula-waterfalls/#'+group.id+'"'),id);
  assert.ok(html.includes('href="/upper-peninsula-waterfalls/?focus='+id+'#falls-map"'),id);
  assert.ok(html.includes('rel="canonical" href="https://chrisizworski.com/upper-peninsula-waterfalls/'+id+'/"'),id);
  assert.ok(html.includes('not vehicle parking or a certified trail route'),id);
  if(id==='sandstone-falls')assert.ok(html.includes('Sandstone remains closed'),id);
 }
});
test('hub nav and card links remain static HTML; map popup script loads after map',()=>{
 assert.equal((page.match(/id="waterfall-day-choices"/g)||[]).length,1);
 assert.equal((page.match(/class="fall-cluster-jump"/g)||[]).length,4);
 assert.equal((page.match(/class="fall-card-region-link"/g)||[]).length,15);
 assert.equal((page.match(/id="cluster-map-focus-status"/g)||[]).length,1);
 assert.ok(page.indexOf('/assets/up-waterfall-cluster-discovery.js')>page.indexOf('/assets/up-waterfalls.js'));
 assert.ok(page.indexOf('id="waterfall-day-choices"')<page.indexOf('id="visit-lens"'));
 assert.match(page,/<link rel="canonical" href="https:\/\/chrisizworski\.com\/upper-peninsula-waterfalls\/"/);
 assert.match(css,/\.fall-cluster-jump-nav/);
 assert.match(css,/\.fall-guide-region-bridge/);
});
test('popup routing rejects invented waterfall IDs, closed-route promotion and unsafe focus parameters',()=>{
 const card=(id,status='verify',arr='verified')=>({dataset:{id,status,arrivalVerified:arr}});
 assert.equal(planFor('wagner-falls',card('wagner-falls')).id,'munising-day');
 assert.equal(planFor('sandstone-falls',card('sandstone-falls','closed')).closed,true);
 assert.equal(planFor('sandstone-falls',card('sandstone-falls','research')),null);
 assert.equal(planFor('wagner-falls',card('wagner-falls','research')),null);
 assert.equal(planFor('wagner-falls',card('wagner-falls','verify','pending')),null);
 assert.equal(planFor('wagner-falls',card('not-wagner')),null);
 assert.equal(planFor('bogus-falls',card('bogus-falls')),null);
 assert.equal(focusId('?focus=manido-falls','#falls-map'),'manido-falls');
 assert.equal(focusId('?focus=manido-falls','#munising-day'),'');
 assert.equal(focusId('?focus=../manido-falls','#falls-map'),'');
 assert.equal(focusId('?focus=unknown-waterfall','#falls-map'),'');
});
