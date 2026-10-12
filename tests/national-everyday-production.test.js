import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('synced National Tools retains Everyday Decisions and House Reality Check', () => {
  const html=fs.readFileSync('public/synced-national-tools/index.html','utf8');
  assert.match(html,/class="catalog-group everyday-decisions"/);
  assert.match(html,/data-filter="everyday"/);
  assert.match(html,/data-tool-id="house-fit" data-personas="everyday"/);
  assert.match(html,/href="https:\/\/chrisizworski\.com\/can-i-afford-this-house\//);
  assert.match(html,/data-tool-id="welland-canal"/);
  assert.match(html,/href="\/welland-canal\/"/);
});

test('main build compatibility shim does not rewrite authoritative hub freshness', () => {
  const source=fs.readFileSync('scripts/reconcile-tools-directory.mjs','utf8');
  assert.match(source,/extracted National Tools hub owns its publication metadata/);
  assert.doesNotMatch(source,/page\.dateModified\s*=\s*['"]2026-10-05['"]/);
  assert.doesNotMatch(source,/national-tools\/#page'[\s\S]{0,200}dateModified\s*=/);
});

test('synced National Tools metadata is current after verified hub sync', () => {
  const html=fs.readFileSync('public/synced-national-tools/index.html','utf8');
  const schemaText=html.split('<script type="application/ld+json">')[1]?.split('</script>')[0];
  assert.ok(schemaText);
  const schema=JSON.parse(schemaText);
  const page=schema?.['@graph']?.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
  const list=schema?.['@graph']?.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.ok(page?.dateModified >= '2026-10-11', 'National Tools modification date should reflect Welland discovery');
  assert.match(page?.description||'',/Everyday Decisions/);
  assert.equal(list?.numberOfItems, (html.match(/data-search-card/g) || []).length, 'structured ItemList must match visible tools');
  assert.ok(list?.itemListElement?.some(x=>x.url==='https://chrisizworski.com/welland-canal/'));
  assert.ok(list?.itemListElement?.some(x=>x.url==='https://chrisizworski.com/can-i-afford-this-house/'));
});
