const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const injectWildlife=require('../lib/inject-platte-national-tools.js');

const platte='https://chrisizworski.com/national-tools/platte-crane-live';
const monarch='https://chrisizworski.com/national-tools/monarch-migration-live';

test('National Tools host proxy follows the current hub production alias instead of a pinned release snapshot',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','api','national-tools-hub.js'),'utf8');
  assert.match(source,/https:\/\/national-outdoor-tools-hub\.vercel\.app\/national-tools\//);
  assert.doesNotMatch(source,/\?v=/,'National Tools proxy must not pin an old version query');
  assert.doesNotMatch(source,/melvin-price/i,'National Tools proxy must not remain tied to the previous Melvin Price release');
  assert.match(source,/inject-platte-national-tools/);
});

test('National Tools host injects Platte and Monarch discovery when upstream release omits them',()=>{
  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {'@id':'https://chrisizworski.com/national-tools/#page','@type':'CollectionPage'},
      {'@id':'https://chrisizworski.com/national-tools/#toollist','@type':'ItemList',numberOfItems:1,itemListElement:[{'@type':'ListItem',position:1,url:'https://example.com/tool',name:'Existing Tool'}]}
    ]
  };
  const source=`<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body><main><section class="featured-tools"><div class="feature-grid"></div></section><section class="finder"><div class="chips"><button class="chip" type="button" data-filter="fall">Autumn</button></div></section><section class="topic-hubs"></section></main></body></html>`;
  const html=injectWildlife(source);
  assert.match(html,/Platte Crane Live/);
  assert.match(html,/Monarch Migration Live/);
  assert.match(html,/Wildlife and migration tools/);
  assert.match(html,/Crane Trust \+ USGS \+ NOAA\/NWS/);
  assert.match(html,/Licensed iNaturalist records \+ NWS weather \+ published migration timing \+ GBIF history/);
  assert.ok(html.includes(`href="${platte}"`));
  assert.ok(html.includes(`href="${monarch}"`));
  assert.ok(html.includes('data-filter="wildlife"'));
  const json=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list=json['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.equal(list.numberOfItems,3);
  assert.ok(list.itemListElement.some(x=>x.url===platte));
  assert.ok(list.itemListElement.some(x=>x.url===monarch));
});

test('National Tools wildlife injection is idempotent once both cards are present',()=>{
  const source=`<html><head></head><body><main><section class="library-group" data-library-group="wildlife"><h2>Wildlife and migration tools</h2><div class="tool-grid"><article class="tool-card"><a href="${platte}">Platte Crane Live</a></article><article class="tool-card"><a href="${monarch}">Monarch Migration Live</a></article></div></section></main></body></html>`;
  const once=injectWildlife(source);
  assert.equal(injectWildlife(once),once);
});
