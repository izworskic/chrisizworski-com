const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const injectPlatte=require('../lib/inject-platte-national-tools.js');

const canonical='https://chrisizworski.com/national-tools/platte-crane-live';

test('National Tools host proxy follows the current hub production alias instead of a pinned release snapshot',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','api','national-tools-hub.js'),'utf8');
  assert.match(source,/https:\/\/national-outdoor-tools-hub\.vercel\.app\/national-tools\//);
  assert.doesNotMatch(source,/\?v=/,'National Tools proxy must not pin an old version query');
  assert.doesNotMatch(source,/melvin-price/i,'National Tools proxy must not remain tied to the previous Melvin Price release');
  assert.match(source,/inject-platte-national-tools/);
});

test('National Tools host injects Platte Crane discovery when upstream release omits it',()=>{
  const schema={
    '@context':'https://schema.org',
    '@graph':[
      {'@id':'https://chrisizworski.com/national-tools/#page','@type':'CollectionPage'},
      {'@id':'https://chrisizworski.com/national-tools/#toollist','@type':'ItemList',numberOfItems:1,itemListElement:[{'@type':'ListItem',position:1,url:'https://example.com/tool',name:'Existing Tool'}]}
    ]
  };
  const source=`<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body><main><section class="featured-tools"><div class="feature-grid"></div></section><section class="topic-hubs"></section></main></body></html>`;
  const html=injectPlatte(source);
  assert.match(html,/Platte Crane Live/);
  assert.match(html,/Wildlife and migration tools/);
  assert.match(html,/Crane Trust \+ USGS \+ NOAA\/NWS/);
  assert.ok(html.includes(`href="${canonical}"`));
  const json=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list=json['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.equal(list.numberOfItems,2);
  assert.ok(list.itemListElement.some(x=>x.url===canonical));
});

test('National Tools Platte injection is idempotent when upstream already contains the card',()=>{
  const source=`<html><head></head><body><main><a href="${canonical}">Platte Crane Live</a></main></body></html>`;
  assert.equal(injectPlatte(source),source);
});
