import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(path.join(root,'public/tools/index.html'),'utf8');
const manifest=JSON.parse(readFileSync(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
const target='/michigan-destinations/';
const canonical='https://chrisizworski.com/michigan-destinations/';

test('Michigan Adventure Finder is a visible, searchable Michigan trip planning card', () => {
  const group=html.match(/<section class="tool-group" id="trip-planners-group"[\s\S]*?<\/section>/);
  assert.ok(group,'Michigan trip planner section must exist');
  const cards=[...group[0].matchAll(/<div class="tool-card"[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>\s*<div class="tool-desc">([\s\S]*?)<\/div>\s*<\/div>/g)];
  const adventure=cards.find(m=>m[1]===target);
  assert.ok(adventure,'Adventure Finder must be a genuine tool-card, not only a promo banner');
  assert.match(adventure[0],/data-tool-id="michigan-adventure-finder"/);
  assert.match(adventure[0],/data-tags="[^"]*\bplanning\b/);
  assert.match(adventure[0],/data-tags="[^"]*\bnature\b/);
  assert.match(adventure[2],/Michigan Adventure Finder/);
  assert.match(adventure[3],/20 real Michigan destinations/);
  assert.match(adventure[3],/CARTO map/);
  assert.doesNotMatch(group[0],/class="adventure-discovery"/,'do not duplicate old promotional banner');
  assert.equal((html.match(/href="\/michigan-destinations\/"/g)||[]).length,1);
});

test('Michigan Adventure Finder belongs to directory schema and existing source registry', () => {
  const schemaText=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(schemaText);
  const schema=JSON.parse(schemaText);
  const listing=schema['@graph'].find(x=>x['@id']==='https://chrisizworski.com/tools/#toollist');
  const cards=[...html.matchAll(/<div class="tool-card"[^>]*>[\s\S]*?<div class="tool-title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a><\/div>\s*<div class="tool-desc">([\s\S]*?)<\/div>\s*<\/div>/g)];
  assert.equal(cards.length,listing.numberOfItems);
  assert.equal(cards.length,listing.itemListElement.length);
  assert.equal(cards.filter(c=>c[1]===target).length,1);
  const pages=listing.itemListElement.map(row=>row.item.url);
  assert.equal(new Set(pages).size,pages.length,'all directory URLs unique');
  assert.equal(pages.filter(url=>url===canonical).length,1);
  assert.deepEqual(listing.itemListElement.map(item=>item.position),cards.map((_,i)=>i+1));
  const entry=listing.itemListElement.find(row=>row.item.url===canonical)?.item;
  assert.ok(entry);
  assert.equal(entry['@type'],'CollectionPage');
  assert.equal(entry['@id'],canonical+'#page');
  assert.equal(entry.author?.['@id'],'https://chrisizworski.com/#person');
  const registry=manifest.tools.find(tool=>tool.id==='michigan-adventure-finder');
  assert.equal(registry?.canonical,canonical);
  assert.equal(registry?.cluster,'trip-planning');
});
