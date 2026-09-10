'use strict';

const test=require('node:test');
const assert=require('node:assert/strict');
const inject=require('../lib/inject-platte-national-tools.js');

const MONARCH='https://chrisizworski.com/national-tools/monarch-migration-live';
const PLATTE='https://chrisizworski.com/national-tools/platte-crane-live';

function fixture(){
  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {'@type':'CollectionPage','@id':'https://chrisizworski.com/national-tools/#page','dateModified':'2026-09-09'},
      {'@type':'ItemList','@id':'https://chrisizworski.com/national-tools/#toollist','numberOfItems':0,'itemListElement':[]}
    ]
  };
  return `<!doctype html><main>
<script type="application/ld+json">${JSON.stringify(schema)}</script>
<section class="featured-tools"><div class="feature-grid"></div></section>
<section class="finder"><div class="chips"><button class="chip" type="button" data-filter="fall">Autumn</button></div></section>
<section class="topic-hubs"></section>
</main>`;
}

test('injects Monarch and Platte as first-class National Tools wildlife entries',()=>{
  const html=inject(fixture());
  assert.match(html,new RegExp(MONARCH.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.match(html,new RegExp(PLATTE.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
  assert.ok(html.includes('data-monarch-feature="true"'));
  assert.ok(html.includes('data-filter="wildlife"'));
  assert.ok(html.includes('Monarch Migration Live: Butterfly Migration Intelligence'));
  assert.ok(html.includes('Wildlife and migration tools'));

  const schemaMatch=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  assert.ok(schemaMatch);
  const data=JSON.parse(schemaMatch[1]);
  const list=data['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.equal(list.numberOfItems,2);
  assert.ok(list.itemListElement.some(x=>x.url===MONARCH));
  assert.ok(list.itemListElement.some(x=>x.url===PLATTE));
});

test('wildlife injection is idempotent',()=>{
  const once=inject(fixture());
  const twice=inject(once);
  assert.equal(twice,once);
});
