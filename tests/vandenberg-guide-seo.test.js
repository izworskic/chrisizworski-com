'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root=path.resolve(__dirname,'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const route='/vandenberg-rocket-launch-viewing/';
const canonical='https://chrisizworski.com'+route;
const page=read('public/vandenberg-rocket-launch-viewing/index.html');
const stylesheet=read('public/vandenberg-rocket-launch-viewing/styles.css');
const tracker=read('public/vandenberg-rocket-launch-viewing/guide.js');
const national=read('public/synced-national-tools/rocket-launch-live/index.html');
const config=JSON.parse(read('vercel.json'));
const sitemap=read('public/sitemap.xml');
const model=require('../lib/vandenberg-viewing');

test('the guide publishes exactly one, searchable, distinct canonical URL',()=>{
  const title=page.match(/<title>([^<]+)<\/title>/)?.[1]||'';
  const desc=page.match(/<meta name="description" content="([^"]+)"/)?.[1]||'';
  assert.ok(title.length>=42&&title.length<=65,'Search title should answer the local intent without truncation');
  assert.ok(desc.length>=120&&desc.length<=165,'Search description should convey the viewing decision');
  assert.match(page,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.equal((page.match(/rel="canonical"/g)||[]).length,1);
  assert.ok(page.includes('<link rel="canonical" href="'+canonical+'">'));
  assert.doesNotMatch(page,/<meta http-equiv="refresh"/i);
  assert.doesNotMatch(page,/rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/rocket-launch-live\//);
  assert.ok(page.indexOf('<h1')>0);
  assert.match(page,/Watch a <em>Vandenberg rocket launch<\/em>/);
});

test('core answers, all six venues and restrictions are published in HTML with JS disabled',()=>{
  const visible=page.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'');
  const body=visible.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
  assert.ok(body.length>14000,'This must be a substantive guide, not an empty JS wrapper');
  assert.match(body,/For the strongest public launch-viewing prospects, start with Ocean Park/);
  assert.match(body,/6 sourced public candidates/);
  assert.equal((body.match(/class="vg-place-card"/g)||[]).length,6);
  for(const venue of model.SITES)assert.ok(body.includes(venue.name.replace('Ocean Beach Park','Ocean Park')
    .replace('Surf Beach / Surf Station','Surf Beach / Surf Station')
    .replace('Allan Hancock College — Lompoc','Allan Hancock College')),venue.name+' absent from first response');
  assert.match(body,/8 a\.m\.–6 p\.m\./);
  assert.match(body,/Ocean Park closes at sunset/);
  assert.match(body,/Harris Grade Road/);
  assert.match(body,/Hawk.s Nest/);
  assert.match(body,/Marshallia Ranch Road/);
  assert.match(body,/Highway 246/);
  assert.match(body,/a generally open beach/i);
  assert.match(body,/Launches can scrub late/);
  assert.equal((body.match(/class="vg-faq-item"/g)||[]).length,7);
  assert.doesNotMatch(body,/Loading launch records|checking schedule availability|placeholder — replace later/i);
});

test('search discovery is a single sitemap entry with truthful date and live static route',()=>{
  const occurrence=(sitemap.match(/<loc>https:\/\/chrisizworski\.com\/vandenberg-rocket-launch-viewing\/<\/loc>/g)||[]).length;
  assert.equal(occurrence,1,'Exactly one main sitemap URL');
  assert.match(sitemap,/<loc>https:\/\/chrisizworski\.com\/vandenberg-rocket-launch-viewing\/<\/loc>\s*<lastmod>2026-11-13<\/lastmod>/);
  assert.equal(page.match(/"dateModified":"2026-11-13"/g)?.length,2,
    'Both published WebPage and Article need honest source modification dates');
  for(const filename of fs.readdirSync(path.join(root,'public')).filter(n=>/^sitemap.*\.xml$/.test(n)&&n!=='sitemap.xml'))
    assert.ok(!read('public/'+filename).includes(canonical),
      'Guide must not duplicate a URL in '+filename);
  assert.deepEqual(config.rewrites.filter(x=>x.source===route||x.source===route.slice(0,-1)),[
    {source:route.slice(0,-1),destination:route+'index.html'},
    {source:route,destination:route+'index.html'}]);
  assert.ok(!config.redirects.some(x=>x.source===route||x.source===route.slice(0,-1)),
    'Both URL forms should resolve through the site-standard rewrite with one canonical, not a retired-alias redirect');
});

test('schema is well-formed and cites a real article and the canonical page',()=>{
  const blocks=[...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length,1);
  const schema=JSON.parse(blocks[0][1]);
  const graph=schema['@graph'];
  assert.equal(schema['@context'],'https://schema.org');
  const nodes=new Map(graph.map(n=>[n['@type'],n]));
  for(const name of ['WebPage','Article','Person','BreadcrumbList','FAQPage'])
    assert.ok(nodes.has(name),name+' missing');
  assert.equal(nodes.get('WebPage').url,canonical);
  assert.equal(nodes.get('Article').mainEntityOfPage['@id'],canonical+'#webpage');
  assert.equal(nodes.get('Article').dateModified,nodes.get('WebPage').dateModified);
  assert.equal(nodes.get('Article').author['@id'],'https://chrisizworski.com/#person');
  assert.deepEqual(nodes.get('BreadcrumbList').itemListElement.map(x=>x.position),[1,2,3,4]);
  const faqs=nodes.get('FAQPage').mainEntity;
  assert.equal(faqs.length,7);
  assert.ok(faqs.every(x=>x['@type']==='Question'&&x.acceptedAnswer['@type']==='Answer'));
  for(const faq of faqs)assert.ok(page.includes(faq.name),'Visible FAQ must match JSON-LD');
});

test('the guide and live California tool are connected both ways and remain separate intents',()=>{
  const refs=[...page.matchAll(/href="(\/national-tools\/rocket-launch-live\/\?region=california[^"]*)"/g)];
  assert.ok(refs.length>=5,'The guide must prominently direct people to the live mission-specific planner');
  assert.ok(refs.some(x=>x[1].includes('#rl-vandenberg')),'Send search visitors straight to the actual viewer map');
  assert.match(national,/href="\/vandenberg-rocket-launch-viewing\/"/);
  assert.match(national,/id="rl-vandenberg"/);
  assert.match(national,/rel="canonical" href="https:\/\/chrisizworski\.com\/national-tools\/rocket-launch-live\/"/);
  assert.equal((national.match(/href="\/vandenberg-rocket-launch-viewing\/"/g)||[]).length,3);
});

test('the beyond-Great-Lakes guide directory links this distinct field guide once',()=>{
  const directory=read('public/guides/index.html');
  const directorySitemap=sitemap.match(/<loc>https:\/\/chrisizworski\.com\/guides\/<\/loc>\s*<lastmod>([^<]+)<\/lastmod>/);
  assert.ok(directorySitemap);
  assert.equal(directorySitemap[1],'2026-11-05');
  assert.match(directory,/"dateModified": "2026-11-05"/);
  assert.match(directory,/Beyond the Great Lakes <span>5 Guides<\/span>/);
  assert.equal((directory.match(/data-field-guide="vandenberg-rocket-viewing"/g)||[]).length,1);
  assert.ok(directory.includes('href="/vandenberg-rocket-launch-viewing/"'));
  assert.ok(directory.includes('href="/national-tools/rocket-launch-live/?region=california"'));
});

test('photography is a verified historical launch with rights/credit, not future mission art',()=>{
  assert.match(page,/<img src="https:\/\/media\.defense\.gov\/2026\/Jan\/25\/2003864850\/2000\/2000\/0\/260125-X-VF463-1001\.JPG"/);
  assert.match(page,/U\.S\. Space Force \/ 2nd Lt\. Andrew Taller/);
  assert.match(page,/ARCHIVAL PHOTO/);
  assert.match(page,/No U\.S\. Space Force endorsement is implied/);
  assert.match(page,/https:\/\/www\.vandenberg\.spaceforce\.mil\/News\/Photos\/igphoto\/2003864850\//);
  assert.match(page,/fetchpriority="high"/);
  assert.match(page,/<img[^>]*width="1600" height="1067"/);
});

test('access rules and source links remain distinct from launch predictions',()=>{
  assert.match(page,/https:\/\/explorelompoc\.com\/best-places-to-view-a-rocket-launch-in-lompoc\//);
  assert.match(page,/https:\/\/www\.vandenberg\.spaceforce\.mil\/About-Us\/Environmental\//);
  assert.match(page,/https:\/\/www\.hancockcollege\.edu\/police\/parking\.php/);
  assert.match(page,/https:\/\/www\.cityoflompoc\.com\/government\/departments\/community-development\/parks/);
  assert.match(page,/https:\/\/www\.weather\.gov\//);
  assert.doesNotMatch(page,/will be visible|guaranteed open|% chance of seeing/i);
  assert.match(page,/not.*guaranteed view/i);
});

test('measurement only sends allowlisted link placements, no visitor coordinates',()=>{
  assert.match(tracker,/vandenberg_guide_planner_open/);
  assert.match(tracker,/vandenberg_guide_faq_open/);
  assert.match(tracker,/ALLOWED_PLACEMENTS/);
  assert.match(tracker,/target\.searchParams\.get\('region'\)!=='california'/);
  assert.doesNotMatch(tracker,/geolocation|getCurrentPosition|latitude|longitude|localStorage|sessionStorage|fetch\(/);
  assert.doesNotMatch(page,/gtag\.js\?id=/,
    'Google Analytics initialization is inserted by the existing build, not duplicated manually');
  assert.ok(page.includes('/vandenberg-rocket-launch-viewing/guide.js?v=20261103-v1'));
});

test('responsive, accessible reading does not depend on third-party maps or a fixed-position ad',()=>{
  assert.match(page,/href="#main"/);
  assert.match(page,/<main id="main">/);
  assert.match(page,/<section class="vg-section vg-faq" id="faq"/);
  assert.match(stylesheet,/@media\(max-width:760px\)/);
  assert.match(stylesheet, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(stylesheet,/:focus-visible/);
  assert.doesNotMatch(page,/<iframe/i);
  assert.doesNotMatch(page,/maps\.googleapis\.com|api\/rocket-launch-usa|api\.weather\.gov/);
  assert.match(page,/leaflet@1\.9\.4\/dist\/leaflet\.js/);
  assert.doesNotMatch(stylesheet,/position:fixed/);
});
