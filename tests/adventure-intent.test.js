'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const matcher=require('../public/assets/adventure-intent.js');
const benchmark=require('../scripts/benchmark-adventure-intent.cjs');

const cards=benchmark.catalogFromHtml(read('public/michigan-destinations/index.html'));
const top=q=>matcher.search(cards,q,{limit:8}).map(x=>x.id);
const positives={
 'leave the car behind and explore by bicycle after a lake crossing':'mackinac-island',
 'a huge tea-colored cascade and wooded walks in eastern Upper Michigan':'tahquamenon',
 'an urban river walk with a nearby island and commercial ships':'detroit-river',
 'wine tasting on a peninsula with farms and Lake Michigan shoreline drives':'traverse-city',
 'a city base with good food and rocky lakeshore nature nearby':'marquette',
 'frozen ice curtains near Munising in winter':'munising-winter',
 'historic lighthouse and migrating birds by a sandy spit':'tawas-point',
 'maritime history and shipwreck stories beside Lake Huron':'alpena',
 'a canoe through cold water and cedar-lined bends':'au-sable',
 'no cars, ferry arrival and an island':'mackinac-island',
 'Detroit':'detroit-river'
};
test('intent engine only indexes the twenty authoritative, source-owned destination articles',()=>{
 assert.equal(cards.length,20);
 assert.equal(new Set(cards.map(x=>x.id)).size,20);
 assert.equal(cards.find(x=>x.id==='mackinac-island').title,'Mackinac Island');
 const src=read('public/michigan-destinations/index.html');
 assert.equal((src.match(/<article class="destination"/g)||[]).length,20);
 assert.ok((src.match(/class="photo-credit"/g)||[]).length>=20);
});
test('phrases retain car-free, amber waterfall, waterfront and dining meaning',()=>{
 for(const [query,id] of Object.entries(positives))
   assert.equal(top(query)[0],id,query+' => '+top(query).join(', '));
});
test('unsupported amenities and current safety guarantees are never inferred',()=>{
 const fixtures=JSON.parse(read('scripts/fixtures/adventure-intent-acceptance.json'));
 assert.equal(fixtures.length,36);
 const rejected=fixtures.filter(x=>x.expected.length===0);
 assert.equal(rejected.length,6);
 for(const x of rejected)assert.deepEqual(top(x.query),[],x.query);
 assert.deepEqual(top(''),[]);
 assert.deepEqual(top('buy tickets at the airport'),[]);
});
test('intent engine respects strict region/activity/season inputs applied by page',()=>{
 const up=cards.filter(c=>c.region==='Upper Peninsula');
 const regionOnly=matcher.search(up,'a ferry to a car-free island').map(x=>x.id);
 assert.ok(!regionOnly.includes('mackinac-island'),'no false reintroduction of excluded location');
 const winter=cards.filter(c=>c.months?.includes(1));
 assert.deepEqual(matcher.search([], 'forest and waterfall'),[]);
 assert.ok(matcher.search(up,'amber waterfall').every(x=>up.some(c=>c.id===x.id)));
});
test('deterministic evaluation outperforms original keyword baseline on dated editorial examples',()=>{
 const r=benchmark.run();
 assert.equal(r.baseline.count,36);
 assert.equal(r.intent.count,36);
 assert.ok(r.intent.hitAt3 >= r.baseline.hitAt3,'top-three regression');
 assert.ok(r.intent.mrr >= r.baseline.mrr,'rank regression');
 assert.equal(r.intent.unsupportedRejection,1,'unsupported safeguards');
 assert.ok(r.intent.mrr >= 0.9,'source-grounded relevance floor');
});
test('page offers a visible-on-JS-only search, with URL/privacy and fallback guards',()=>{
 const html=read('public/michigan-destinations/index.html');
 const js=read('public/assets/michigan-destinations.js');
 const css=read('public/assets/michigan-destinations.css');
 const engine=read('public/assets/adventure-intent.js');
 assert.match(html,/id="intent-search" hidden/);
 assert.match(html,/id="intent-query" name="intent" type="search"/);
 assert.match(html,/id="intent-leading"[^>]*hidden/);
 assert.match(html,/assets\/adventure-intent\.js\?v=/);
 assert.match(js,/const intentCatalog = intentEngine \?/);
 assert.match(js,/intentEngine\.search\(eligible\.map/);
 assert.match(js,/const visibleIds = description/);
 assert.match(js,/Never place free text in query strings/);
 assert.doesNotMatch(js,/params\.set\(['"](?:q|intent|query)['"]/);
 assert.doesNotMatch(engine,/fetch\(|localStorage|sessionStorage|geolocation|openai|transformers|huggingface\.co/i);
 assert.match(css,/\.intent-search\[hidden\]/);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/michigan-destinations\/"/);
 assert.equal((html.match(/<ins class="adsbygoogle"/g)||[]).length,0);
});
