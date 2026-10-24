const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const html=fs.readFileSync(path.join(__dirname,'../public/seed-saving-lab/index.html'),'utf8');
const chunks=html.split('<script>').slice(1).map(x=>x.split('</script>')[0]);
const source=chunks.filter(s=>s.includes('SeedLabData = data')||s.includes('SeedLabEngine=api'));
const ctx=vm.createContext({});
for(const s of source)vm.runInContext(s,ctx,{timeout:1000});
const d=ctx.SeedLabData,e=ctx.SeedLabEngine;
const p=n=>{const v=d.plants.find(x=>x.name===n);assert.ok(v,'missing '+n);return v};
const other=n=>({...p(n),id:p(n).id+'~2'});
const check=(a,b,o={})=>e.compare(p(a),a===b?other(b):p(b),{seedType:'op',overlap:'yes',...o},d);
test('Seed Saving Lab — discoverable static route and valid schema',()=>{
 assert.match(html,/Cross-Pollination Explorer/);
 assert.match(html,/https:\/\/chrisizworski.com\/seed-saving-lab\//);
 assert.match(html,/id="whole-garden"/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 const json=JSON.parse(html.split('<script type="application/ld+json">')[1].split('</script>')[0]);
 assert.equal(json['@graph'][0]['@id'],'https://chrisizworski.com/#person');
 assert.equal(json['@graph'][0].url,'https://chrisizworski.com/');
});
test('Seed Saving Lab — curated vegetable and flower inventory',()=>{
 assert.ok(d.plants.length>=45);
 assert.ok(!d.plants.some(x=>/Brandywine|Cherokee|Queen Lime/.test(x.name)),'crops, not varieties');
 assert.equal(new Set(d.plants.map(x=>x.name)).size,d.plants.length);
 assert.ok(d.plants.some(x=>x.category==='Vegetable'));
 assert.ok(d.plants.some(x=>x.category==='Flower'));
 assert.equal(new Set(d.plants.map(x=>x.id)).size,d.plants.length);
 assert.ok(d.plants.every(x=>x.source.startsWith('https://')));
});
test('Seed Saving Lab — high value crossings',()=>{
 assert.equal(check('Zucchini','Pumpkin').potential,'compatible');
 assert.equal(check('Broccoli','Kale (curly / European)').potential,'compatible');
 assert.equal(check('Siberian kale','Rutabaga').potential,'compatible');
 assert.equal(check('Armenian cucumber','Cantaloupe / muskmelon').potential,'compatible');
 assert.equal(check('Cosmos','Sulfur cosmos').potential,'unlikely');
 assert.equal(check('French marigold','African marigold').potential,'exception');
 assert.equal(check('Zucchini','Butternut squash').potential,'exception');
 assert.equal(check('Calendula (pot marigold)','French marigold').potential,'unlikely');
});
test('Seed Saving Lab — distances and flowering must remain conservative',()=>{
 assert.equal(check('Beet','Swiss chard').guideline,3200);
 assert.equal(check('Pepper (sweet or hot)','Pepper (sweet or hot)').guideline,800);
 assert.equal(check('Zucchini','Pumpkin',{distance:1600}).outcome,'reduced');
 assert.equal(check('Zucchini','Pumpkin',{distance:1599}).outcome,'needs-action');
 assert.equal(check('Zucchini','Pumpkin',{distance:-1}).distance,null);
 assert.equal(check('Broccoli','Kale (curly / European)',{protection:'time',overlap:'yes'}).outcome,'needs-action');
 assert.equal(check('Broccoli','Kale (curly / European)',{overlap:'unknown',distance:2000}).outcome,'unknown');
 assert.equal(check('Broccoli','Kale (curly / European)',{overlap:'no'}).outcome,'managed');
 assert.equal(check('Broccoli','Kale (curly / European)',{protection:'controlled'}).outcome,'managed');
});
test('Seed Saving Lab — garden matrix never upgrades snapshots to purity guarantees',()=>{
 const a=p('Zucchini'),b=p('Pumpkin'),c=p('Cosmos');
 const r=e.makeGarden([a,b,c],{bloom:{[a.id]:'no',[b.id]:'yes'}},d);
 assert.equal(r.pairs.length,3);
 assert.equal(r.counts.compatible,1);
 assert.equal(r.pairs.find(x=>x.level==='compatible').overlap,'unknown');
 assert.throws(()=>e.makeGarden([a,a],{},d));
 assert.equal(e.makeGarden([p('French marigold'),p('African marigold')],{},d).counts.exception,1);
});
test('Seed Saving Lab — genetics content avoids made-up percentages',()=>{
 const r=check('Zinnia','Zinnia');
 assert.match(e.generationText(r,2),/F2/);
 assert.doesNotMatch(e.generationText(r,2),/75%|25%/);
 assert.match(e.generationText(check('Tomato','Tomato',{seedType:'f1'}),1),/F2/);
});
