import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { REGIONS } from '../lib/snowmobile/regions.mjs';
import { canonicalFor, imageFor } from '../lib/snowmobile/discovery.mjs';
const root=new URL('../',import.meta.url);
test('snowmobile emitted pages identify the builder and discoverable planner without duplicate entities',()=>{
  for(const region of [undefined,...REGIONS]) {
    const url=canonicalFor(region), rel=region?`public/snowmobile/regions/${region.key}.html`:'public/snowmobile/index.html';
    const html=readFileSync(new URL(rel,root),'utf8');
    const graph=JSON.parse(html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1])['@graph'];
    const ids=graph.filter(n=>n['@id']).map(n=>n['@id']);assert.equal(new Set(ids).size,ids.length);
    assert.equal(graph.filter(n=>n['@type']==='WebApplication').length,1);
    const page=graph.find(n=>n['@type']==='WebPage');assert.equal(page.mainEntity['@id'],url+'#planner');
    const app=graph.find(n=>n['@id']===page.mainEntity['@id']);assert.equal(app.creator['@id'],'https://chrisizworski.com/#person');assert.equal(app.url,url);
    assert.ok(html.includes(`rel="canonical" href="${url}"`));
    assert.ok(html.includes('Built and maintained by Chris Izworski'));
    assert.ok(html.includes('href="/chris-izworski/"'));
    assert.ok(html.includes('twitter:image:alt'));assert.ok(html.includes('og:image:width'));
    assert.ok(html.includes('Shared links open the region, without your location or selected route.'));
    const img=readFileSync(new URL('public'+new URL(imageFor(region)).pathname,root));
    assert.equal(img.subarray(1,4).toString(),'PNG');assert.equal(img.readUInt32BE(16),1200);assert.equal(img.readUInt32BE(20),630);
    for(const other of REGIONS.filter(r=>r.key!==region?.key)) assert.ok(html.includes(`href="${canonicalFor(other)}"`)||html.includes(`href="/snowmobile/regions/${other.key}.html"`));
  }
});
test('planner has crawlable inbound creator and winter-trip discovery',()=>{
 for(const rel of ['public/chris-izworski-works/index.html','public/mackinac-bridge-live/index.html','public/michigan-snow-totals/index.html']) assert.ok(readFileSync(new URL(rel,root),'utf8').includes('href="/snowmobile/"'));
 const llms=readFileSync(new URL('public/llms.txt',root),'utf8');for(const region of REGIONS) assert.ok(llms.includes(canonicalFor(region)));
});
