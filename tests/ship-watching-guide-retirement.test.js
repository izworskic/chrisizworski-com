'use strict';

// Decommission contract: the November 2026 Watch Desk is gone, but the
// pre-existing public ship-watching guide, specialist tools and inbound links remain.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const slug='great-lakes-ship-watching-spots';
const guide='public/'+slug+'/index.html';
const canonical='https://chrisizworski.com/'+slug+'/';
const retired=[
 '.github/workflows/freighter-watch-desk.yml',
 'api/freighter-watch-conditions.js','lib/freighter-watch-sites.js',
 'public/assets/freighter-watch-decision.js',
 'public/assets/freighter-watch-desk.css','public/assets/freighter-watch-desk.js',
 'scripts/prove-freighter-watch-desk.mjs','scripts/prove-freighter-watch-visit.mjs',
 'scripts/verify-freighter-watch-desk-browser.cjs',
 'tests/freighter-watch-conditions.test.js','tests/freighter-watch-decision.test.js',
 'tests/freighter-watch-desk-foundry-replay.cjs','tests/freighter-watch-desk.test.js',
 'tests/freighter-watch-visit-foundry-replay.cjs',
 'docs/experience-briefs/FREIGHTER_WATCH_DESK_2026_11_08.md',
 'docs/experience-briefs/FREIGHTER_WATCH_VISIT_VERDICT_2026_11_08.md',
 'docs/experience-briefs/FREIGHTER_WATCH_WATERFRONT_FIRST_2026_11_08.md'
];
test('retired Watch Desk has no deployed runtime, API, test or workflow files',()=>{
 for(const file of retired)assert.equal(exists(file),false,file+' must stay retired');
});
test('static guide survives with correct canonical, six sites, FAQ and creator',()=>{
 const html=read(guide);
 assert.match(html,/<title>Great Lakes Freighter-Watching Spots \| Chris Izworski<\/title>/);
 assert.ok(html.includes('rel="canonical" href="'+canonical+'"'));
 assert.ok(html.includes('<h1>Where to Watch Great Lakes Freighters From Shore</h1>'));
 assert.ok(html.includes('id="viewing-guide"'));
 const choices=html.split('id="viewing-guide"')[1].split('</section>')[0];
 assert.equal((choices.match(/<article>/g)||[]).length,6);
 assert.match(choices,/Saginaw Bay · Bay City/);
 assert.match(html,/"@type":"FAQPage"/);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/Built by <a href="https:\/\/chrisizworski\.com\/chris-izworski\/">Chris Izworski<\/a>/);
 assert.doesNotMatch(html,/freighter-watch-desk|freighter-watch-decision|fwd-visit-plan|unpkg\.com\/leaflet/);
});
test('the guide and sitemap preserve one indexable original route with matched lastmod',()=>{
 const html=read(guide);
 const ld=html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/);
 assert.ok(ld,'existing JSON-LD remains');
 const structured=JSON.parse(ld[1]);
 const page=structured['@graph'].find(node=>node['@type']==='WebPage');
 assert.equal(page.url,canonical);
 const sitemap=read('public/sitemap.xml');
 assert.ok(sitemap.includes('<loc>'+canonical+'</loc>\n    <lastmod>'+page.dateModified+'</lastmod>'));
 assert.equal((sitemap.match(new RegExp('<loc>'+canonical.replaceAll('.','\\.')+'<\\/loc>','g'))||[]).length,1);
});
test('existing specialist ship tools and inbound links are preserved',()=>{
 for(const route of ['soo-locks','duluth-canal-park','great-lakes-freighter-tracking','great-lakes-freighter-winter-layup'])
   assert.equal(exists('public/'+route+'/index.html'),true,'specialist remains '+route);
 for(const route of ['/soo-locks/','/duluth-canal-park/','/great-lakes-freighter-tracking/','/great-lakes-freighter-winter-layup/'])
   assert.ok(read(guide).includes('href="'+route),guide+' retains handoff '+route);
 for(const referring of ['public/tools/index.html','public/guides/index.html','public/freighters/index.html',
  'public/soo-locks/index.html','public/great-lakes-freighter-tracking/index.html'])
   assert.ok(read(referring).includes('/'+slug+'/'),referring+' must still point to the intact guide');
});
test('retired registry node and relationships are removed without deleting tracker owners',()=>{
 const registry=JSON.parse(read('benchmarks/tool-network-registry.json'));
 assert.ok(!registry.tools.some(x=>x.id==='freighter-watch-desk'));
 assert.ok(!registry.relationships.some(x=>x.from==='freighter-watch-desk'||x.to==='freighter-watch-desk'));
 for(const id of ['ship-tracker','soo-locks','duluth-canal-park','winter-layup'])
   assert.ok(registry.tools.some(x=>x.id===id),'specialist registry owner exists: '+id);
});
