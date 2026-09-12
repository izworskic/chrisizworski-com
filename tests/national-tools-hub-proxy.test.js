const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

test('National Tools host passes through the current owner directory without a full card mutation layer',()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','api','national-tools-hub.js'),'utf8');
  assert.match(source,/https:\/\/national-outdoor-tools-hub\.vercel\.app\/national-tools\//);
  assert.doesNotMatch(source,/\?v=/,'National Tools proxy must not pin an old version query');
  assert.doesNotMatch(source,/inject-(?:fort-madison|platte)-national-tools/,'the outer shell must not mutate the owner directory');
});

test('the Yosemite canonical correction fixes the owner entry in place instead of duplicating it',()=>{
  const { ensureYosemite } = require('../api/national-tools-hub.js');
  const withNestedUrlOnly = `<html><body>
    <article class="directory-card" data-search-card data-tool-id="yosemite-firefall"></article>
    <article class="directory-card" data-search-card data-tool-id="blue-spring"></article>
    <p class="finder-count" id="finder-count" aria-live="polite">2 tools shown</p>
    <script type="application/ld+json">{"@graph":[{"@id":"https://chrisizworski.com/national-tools/#toollist","itemListElement":[{"@type":"ListItem","position":1,"url":"https://chrisizworski.com/national-tools/yosemite-firefall-live/","name":"Yosemite Firefall Live"}]}]}</script>
  </body></html>`;

  const fixed = ensureYosemite(withNestedUrlOnly);
  const schema = JSON.parse(fixed.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list = schema['@graph'].find(item => item['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
  const yosemiteEntries = list.itemListElement.filter(item => item.name === 'Yosemite Firefall Live');

  assert.equal(yosemiteEntries.length, 1, 'must not create a second Yosemite ListItem');
  assert.equal(yosemiteEntries[0].url, 'https://chrisizworski.com/yosemite-firefall-live/', 'must correct to the canonical root URL');
  assert.equal(list.numberOfItems, list.itemListElement.length);

  // Running it again on already-corrected input must stay idempotent.
  const fixedTwice = ensureYosemite(fixed);
  const schemaTwice = JSON.parse(fixedTwice.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const listTwice = schemaTwice['@graph'].find(item => item['@id'] === 'https://chrisizworski.com/national-tools/#toollist');
  assert.equal(listTwice.itemListElement.filter(item => item.name === 'Yosemite Firefall Live').length, 1);
});
