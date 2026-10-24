const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/seed-saving-lab/index.html'),'utf8');
const chunks=Array.from(html.matchAll(/<script(?:\\s[^>]*)?>([\\s\\S]*?)<\\/script>/g),m=>m[1]);
const source=chunks.filter(s=>s.includes('SeedLabData = data')||s.includes('SeedLabEngine=api'));
const ctx=vm.createContext({});
for(const s of source)vm.runInContext(s,ctx,{timeout:1000});
const d=ctx.SeedLabData,e=ctx.SeedLabEngine;
const p=n=>{const v=d.plants.find(x=>x.name===n);assert.ok(v,'missing '+n);return v};
const check=(a,b,o={})=>e.compare(p(a),p(b),{seedType:'op',overlap:'yes',...o},d);
test('Seed Saving Lab — discoverable static route and valid schema',()=>{
 assert.match(html,/Cross-Pollination Explorer/);
 assert.match(html,/https:\/\/chrisizworski.com\/seed-saving-lab\//);
 assert.match(html,/id="whole-garden"/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 const json=JSON.parse(html.match(/<script type="application\/ld\+json">([\\s\\S]*?)<\\/script>/)[1]);
 assert.equal(json['@graph'][0]['@id'],'https://chrisizworski.com/#person');
});
test('Seed Saving Lab — curated vegetable and flower inventory',()=>{
 assert.ok(d.plants.length>=65);
 assert.ok(d.plants.some(x=>x.category==='Vegetable'));
 assert.ok(d.plants.some(x=>x.category==='Flower'));
 assert.equal(new Set(d.plants.map(x=>x.id)).size,d.plants.length);
 assert.ok(d.plants.every(x=>x.source.startsWith('https://')));
});
test('Seed Saving Lab — high value crossings',()=>{
 assert.equal(check('Zucchini','Jack-o’-lantern pumpkin').potential,'compatible');
 assert.equal(check('Broccoli','European kale').potential,'compatible');
 assert.equal(check('Siberian kale','Rutabaga').potential,'compatible');
 assert.equal(check('Armenian cucumber','Cantaloupe / muskmelon').potential,'compatible');
 assert.equal(check('Purple cosmos','Orange sulfur cosmos').potential,'unlikely');
 assert.equal(check('French marigold','African marigold').potential,'exception');
 assert.equal(check('Zucchini','Butternut squash').potential,'exception');
 assert.equal(check('Orange calendula','French marigold').potential,'unlikely');
});
test('Seed Saving Lab — distances and flowering must remain conservative',()=>{
 assert.equal(check('Beetroot','Swiss chard').guideline,3200);
 assert.equal(check('Sweet bell pepper','Jalapeño pepper').guideline,800);
 assert.equal(check('Zucchini','Jack-o’-lantern pumpkin',{distance:1600}).outcome,'reduced');
 assert.equal(check('Zucchini','Jack-o’-lantern pumpkin',{distance:1599}).outcome,'needs-action');
 assert.equal(check('Zucchini','Jack-o’-lantern pumpkin',{distance:-1}).distance,null);
 assert.equal(check('Broccoli','European kale',{protection:'time',overlap:'yes'}).outcome,'needs-action');
 assert.equal(check('Broccoli','European kale',{overlap:'unknown',distance:2000}).outcome,'unknown');
 assert.equal(check('Broccoli','European kale',{overlap:'no'}).outcome,'managed');
 assert.equal(check('Broccoli','European kale',{protection:'controlled'}).outcome,'managed');
});
test('Seed Saving Lab — garden matrix never upgrades snapshots to purity guarantees',()=>{
 const a=p('Zucchini'),b=p('Jack-o’-lantern pumpkin'),c=p('Purple cosmos');
 const r=e.makeGarden([a,b,c],{bloom:{[a.id]:'no',[b.id]:'yes'}},d);
 assert.equal(r.pairs.length,3);
 assert.equal(r.counts.compatible,1);
 assert.equal(r.pairs.find(x=>x.level==='compatible').overlap,'unknown');
 assert.throws(()=>e.makeGarden([a,a],{},d));
 assert.equal(e.makeGarden([p('French marigold'),p('African marigold')],{},d).counts.exception,1);
});
test('Seed Saving Lab — genetics content avoids made-up percentages',()=>{
 const r=check('Queen Lime zinnia','Oklahoma White zinnia');
 assert.match(e.generationText(r,2),/F2/);
 assert.doesNotMatch(e.generationText(r,2),/75%|25%/);
 assert.match(e.generationText(check('Cherokee Purple tomato','Brandywine tomato',{seedType:'f1'}),1),/F2/);
});
