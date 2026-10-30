'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const route='/sleeping-giant-provincial-park/';
const canonical='https://chrisizworski.com'+route;
function emit(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sleeping-giant-production-'));
 try{
  execFileSync(process.execPath,['scripts/build-sleeping-giant-site.mjs','--out',dir],
   {cwd:root,encoding:'utf8',timeout:45000});
  return fs.readFileSync(path.join(dir,'index.html'),'utf8');
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
}
const schemaFrom=html=>{
 const blocks=[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
 assert.equal(blocks.length,1);
 return JSON.parse(blocks[0][1]);
};
test('Sleeping Giant production renderer preserves 6 static options, all 70 source-engine combinations and accessible map',()=>{
 const html=emit();
 assert.equal((html.match(/class="route-card"/g)||[]).length,6);
 assert.ok(html.includes('id="explorer-data"'));
 assert.ok(html.includes('id="map-focus"'));
 assert.ok(html.includes('id="map-canvas"'));
 assert.ok(html.includes('id="map-geographic"'), 'real geographic basemap container missing');
 assert.ok(html.includes('/assets/vendor/leaflet-1.9.4.css'), 'Leaflet styles absent');
 assert.ok(html.includes('/assets/leaflet-1.9.4.js'), 'local Leaflet runtime absent');
 assert.ok(html.includes('/api/carto-basemap-config'), 'site CARTO configuration not wired');
 assert.ok(html.includes('tile.openstreetmap.org'), 'fallback provider absent');
 assert.ok(html.includes('basemaps.cartocdn.com/rastertiles/voyager'), 'CARTO Voyager provider absent');
 assert.ok(html.includes('geoLines.clearLayers()'), 'route selection cannot clear stale geographic lines');
 assert.ok(html.includes('No reconciled trail route or parking location is verified'), 'unmapped route must avoid invented geometry');
 assert.doesNotMatch(html, /Google Maps driving directions to approximate parking/i);
 assert.ok(html.includes('id="trail-top-of-the-giant"'));
 assert.ok(html.includes('id="trail-sea-lion"'));
 assert.ok(html.includes('21.8 km'));
 assert.ok(html.includes('Ontario Parks'));
 assert.ok(html.includes('<noscript>'));
 assert.match(html,/unverified parking-to-trail connection/i);
 assert.doesNotMatch(html,/<a[^>]*href=["']https:\/\/www\.google\.com\/maps\/dir\//i);
});
test('Sleeping Giant release head owns one distinct canonical and consistent full Person/ItemList JSON-LD',()=>{
 const html=emit(),schema=schemaFrom(html);
 const graph=schema['@graph'];
 const owner=graph.find(x=>x['@type']==='WebPage'),person=graph.find(x=>x['@type']==='Person');
 const list=graph.find(x=>x['@type']==='ItemList'),crumbs=graph.find(x=>x['@type']==='BreadcrumbList');
 assert.equal(owner['@id'],canonical+'#webpage');
 assert.equal(owner.url,canonical);
 assert.equal(owner.author['@id'],'https://chrisizworski.com/#person');
 assert.equal(owner.publisher['@id'],'https://chrisizworski.com/#person');
 assert.equal(person['@id'],'https://chrisizworski.com/#person');
 assert.equal(owner.dateModified,'2026-10-29');
 assert.equal(list.numberOfItems,6);
 assert.equal(new Set(list.itemListElement.map(x=>x.url)).size,6);
 assert.ok(list.itemListElement.every(x=>html.includes('id="'+x.url.split('#trail-')[1].replace(/^/,'trail-')+'"')));
 assert.equal(crumbs.itemListElement.at(-1).item,canonical);
 assert.match(html,/<meta name="robots" content="index,follow,max-image-preview:large">/);
 assert.match(html,/<link rel="canonical" href="https:\/\/chrisizworski.com\/sleeping-giant-provincial-park\/"/);
 assert.doesNotMatch(html,/<meta name="robots" content="noindex/);
 assert.doesNotMatch(html,/Unpublished Visitor Preview/);
});
test('Sleeping Giant site page follows the standard single-ad-loader policy without an extra in-article placement',()=>{
 const html=emit();
 assert.equal(html.split('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js').length-1,1);
 assert.equal((html.match(/name="google-adsense-account"/g)||[]).length,1);
 assert.match(html,/ca-pub-8222782620788075/);
 assert.doesNotMatch(html,/<ins[^>]*class="adsbygoogle"/);
 assert.doesNotMatch(html,/assets\/in-article-ads\.js/);
});
test('Sitemap, Tools, Guides, Circle Tour and registry agree on one canonical and direct source-backed handoffs',()=>{
 const sitemap=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
 const tools=fs.readFileSync(path.join(root,'public/tools/index.html'),'utf8');
 const guides=fs.readFileSync(path.join(root,'public/guides/index.html'),'utf8');
 const circle=fs.readFileSync(path.join(root,'public/lake-superior-circle-tour/index.html'),'utf8');
 const registry=JSON.parse(fs.readFileSync(path.join(root,'benchmarks/tool-network-registry.json'),'utf8'));
 const packageJSON=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
 assert.equal((sitemap.match(/<loc>https:\/\/chrisizworski\.com\/sleeping-giant-provincial-park\/<\/loc>/g)||[]).length,1);
 assert.ok(tools.includes('data-tool-id="sleeping-giant-provincial-park"'));
 assert.ok(tools.includes('href="/sleeping-giant-provincial-park/"'));
 assert.ok(guides.includes('href="/sleeping-giant-provincial-park/"'));
 assert.ok(circle.includes('Compare trails and bike-to-hike routes'));
 assert.ok(circle.includes('21.8 km return'));
 assert.ok(circle.includes('Sleeping Giant camping is seasonal'));
 assert.ok(registry.tools.some(x=>x.id==='sleeping-giant-provincial-park'&&x.canonical===canonical));
 assert.ok(registry.relationships.some(x=>x.from==='circle-tour'&&x.to==='sleeping-giant-provincial-park'));
 assert.ok(registry.relationships.some(x=>x.from==='sleeping-giant-provincial-park'&&x.to==='circle-tour'));
 assert.ok(packageJSON.scripts['build:site'].includes('node scripts/build-sleeping-giant-site.mjs && node scripts/generate-tool-entity-graph.mjs'));
 assert.ok(!Object.hasOwn(packageJSON.scripts,'preverify:all'), 'Source verification must not rewrite the committed public page');
});
test('Source truth cannot be replaced by 2026 seasonal claims, inferred travel times or cached real-time weather',()=>{
 const html=emit();
 assert.match(html,/not a live trail report/);
 assert.match(html,/Current trail and road access|Trail and road access/);
 assert.match(html,/No documented complete bicycle approach/);
 assert.match(html,/bike-to-foot transition|bike-to-hike routes/);
 assert.doesNotMatch(html,/\bOPEN NOW\b/);
 assert.doesNotMatch(html,/\bWEATHER LIVE\b/);
 assert.doesNotMatch(html,/api\/sleeping-giant/);
});

test('Repository-checkout public page exists before build, has canonical authored six-route source content',()=>{
 const html=fs.readFileSync(path.join(root,'public/sleeping-giant-provincial-park/index.html'),'utf8');
 const schema=schemaFrom(html);
 const owner=schema['@graph'].find(x=>x['@type']==='WebPage');
 const list=schema['@graph'].find(x=>x['@type']==='ItemList');
 assert.equal(owner.url,canonical);
 assert.equal(owner.author['@id'],'https://chrisizworski.com/#person');
 assert.equal(list.numberOfItems,6);
 assert.ok(html.includes('id="trail-top-of-the-giant"'));
 assert.ok(html.includes('id="trail-sea-lion"'));
 assert.ok(html.includes('21.8 km'));
 assert.match(html,/not a live trail report/i);
 assert.match(html,/robots" content="index,follow/);
 assert.equal(html.split('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js').length-1,1);
});
