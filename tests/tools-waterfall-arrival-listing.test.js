'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const cp=require('node:child_process');
const tools=fs.readFileSync('public/tools/index.html','utf8');
const generator=fs.readFileSync('scripts/update-tool-verbiage-tools.mjs','utf8');
const corpus=JSON.parse(fs.readFileSync('data/hub-search/corpus.json','utf8'));
const target='/upper-peninsula-waterfalls/';
const description='Explore 80 curated U.P. waterfall and scenic-stop guides on an interactive map. The Arrival Desk separates documented visitor parking from waterfall locations, explains trail approaches and restrictions, and helps you build a source-checked day plan.';

test('Michigan tools catalog features one truthful waterfall explorer entry with working canonical',()=>{
  const all=[...tools.matchAll(/<div class="tool-card"[^>]*data-tool-id="upper-peninsula-waterfalls"[^>]*>/g)];
  assert.equal(all.length,1,'one existing card, not a duplicate');
  assert.match(all[0][0],/data-tags="[^"]*parking arrival access day planner"/);
  const following=tools.slice(all[0].index,all[0].index+1100);
  assert.match(following,/Waterfall map and arrival desk/);
  assert.match(following,/href="\/upper-peninsula-waterfalls\/"/);
  assert.ok(following.includes(description));
  assert.match(following,/Explore map and arrival guidance/);
  assert.doesNotMatch(following,/200\+|topographic routing|spring-runoff conditions/);
  assert.match(tools,/rel="canonical" href="https:\/\/chrisizworski\.com\/tools\/"/);
  assert.match(tools,/https:\/\/chrisizworski\.com\/#person/);
});

test('structured ItemList, hub search corpus, and future tool-copy script agree',()=>{
  const script=tools.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(script,'structured data required');
  const graph=JSON.parse(script[1])['@graph'];
  const item=graph.find(x=>x['@type']==='ItemList');
  assert.ok(item);
  assert.equal(item.numberOfItems,item.itemListElement.length);
  const matches=item.itemListElement.filter(x=>x.item?.url==='https://chrisizworski.com'+target);
  assert.equal(matches.length,1);
  assert.match(matches[0].item.description,/Arrival Desk/);
  assert.ok(matches[0].item.description.includes('80 curated'));
  const searchCards=corpus.tools.filter(x=>x.id==='upper-peninsula-waterfalls');
  assert.equal(searchCards.length,1);
  assert.equal(searchCards[0].description,description);
  assert.equal(searchCards[0].kind,'Waterfall map and arrival desk');
  assert.equal(searchCards[0].href,target);
  assert.ok(searchCards[0].tags.includes('parking arrival access day planner'));
  assert.ok(generator.includes(description),'tool verbiage rebuild must not restore unsupported copy');
});

test('hub-search Python snapshot stays reproducible from the page',()=>{
  const r=cp.spawnSync('python3',['scripts/build-hub-search.py','--check'],{encoding:'utf8',timeout:30000});
  assert.equal(r.status,0,(r.stderr||'')+'\n'+(r.stdout||''));
});
