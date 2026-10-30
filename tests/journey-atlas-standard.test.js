'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const api=require('../public/assets/journey-atlas-v1.js');
const html=read('public/lake-superior-circle-tour/index.html');
const runtime=read('public/assets/journey-atlas-v1.js');
const css=read('public/assets/journey-atlas-v1.css');

test('JOURNEY_ATLAS_V1 is versioned, callable and portable',()=>{
  const manifest=JSON.parse(read('design-systems/journey-atlas-v1/manifest.json'));
  assert.equal(manifest.id,'JOURNEY_ATLAS_V1');
  assert.equal(manifest.version,'1.0.0');
  assert.equal(manifest.dependsOn,'FIELD_GUIDE_V1');
  assert.equal(api.version,'1.0.0');
  assert.equal(read('design-systems/journey-atlas-v1/starter/journey-atlas.js'),runtime);
  assert.equal(read('design-systems/journey-atlas-v1/starter/journey-atlas.css'),css);
  const starter=read('design-systems/journey-atlas-v1/starter/index.html');
  assert.match(starter,/data-journey-atlas/);
  assert.match(starter,/data-ja-region/);
  assert.match(starter,/data-ja-empty/);
  assert.match(starter,/photo|Photo/);
});

test('fit selector strictly filters region, interest and time, never inventing live evidence',()=>{
  const records=[
    {region:'on',interests:'scenery hiking',times:'short half',order:3},
    {region:'wi',interests:'maritime scenery',times:'half full',order:1},
    {region:'mi',interests:'scenery photography',times:'short full',order:2}
  ];
  assert.deepEqual(api.choose(records,{region:'wi',interest:'maritime',time:'half'}).map(x=>x.region),['wi']);
  assert.deepEqual(api.choose(records,{region:'on',interest:'maritime',time:'short'}),[]);
  assert.deepEqual(api.choose(records,{region:'all',interest:'scenery',time:'all'}).map(x=>x.region),['wi','mi','on']);
  assert.equal(records[0].order,3);
});

test('Circle Tour preserves original route and includes complete fallback cards',()=>{
  assert.match(html,/id="journey-atlas" data-journey-atlas/);
  assert.match(html,/href="\/assets\/journey-atlas-v1.css"/);
  assert.match(html,/src="\/assets\/journey-atlas-v1.js"/);
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/lake-superior-circle-tour\/"/);
  assert.equal((html.match(/class="stop-card"/g)||[]).length,31);
  const articles=[...html.matchAll(/<article class="ja-card"[^>]*>/g)].map(x=>x[0]);
  assert.equal(articles.length,10);
  for(const region of ['on','wi','mi','mn'])assert.ok(articles.some(a=>a.includes('data-ja-region="'+region+'"')));
  for(const article of articles){
    assert.match(article,/data-ja-region="(on|wi|mi|mn)"/);
    assert.match(article,/data-ja-interests="[a-z ]+"/);
    assert.match(article,/data-ja-times="[a-z ]+"/);
    assert.match(article,/data-ja-order="\d+"/);
  }
  const atlas=html.slice(html.indexOf('<!-- JOURNEY_ATLAS_V1'),html.indexOf('<div class="live-strip"'));
  assert.equal((atlas.match(/Official source<\/a>/g)||[]).length,10);
  assert.equal((atlas.match(/data-ja-add-stop="\d+"/g)||[]).length,10);
  for(const match of atlas.matchAll(/data-ja-add-stop="(\d+)"/g))
    assert.ok(html.includes('id="stop-'+match[1]+'"'),'must map to existing trip stop '+match[1]);
  assert.equal((atlas.match(/class="ja-photo"/g)||[]).length,6);
  assert.equal((atlas.match(/<figcaption>/g)||[]).length,6);
  assert.match(atlas,/2026 day-use season ended October 25/);
  assert.match(atlas,/2027 sailings and seats must not be inferred/);
  assert.match(atlas,/editorial, not a live weather/);
});
