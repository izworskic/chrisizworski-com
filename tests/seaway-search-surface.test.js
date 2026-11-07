'use strict';

// Seaway search integrity: one canonical intent owner, coherent SERP/social data,
// honest meaningful edit dates, crawlable body links and wrong-host protection.
// No live AIS calls or Search Console ranking claims are made by this gate.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const seo=JSON.parse(read('data/seaway/search-surface.json'));
const sitemap=read('public/sitemap.xml');
const imageSitemap=read('public/image-sitemap.xml');
const index=read('public/sitemap-index.xml');
const robots=read('public/robots.txt');
const middleware=read('middleware.ts');
const origin='https://chrisizworski.com';

function decode(value){return value.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
function pageBlocks(xml){return [...xml.matchAll(/<url>\s*[\s\S]*?<\/url>/g)].map(m=>m[0]);}
function matchTag(html,tag,property,value) {
  const tags=[...html.matchAll(new RegExp('<'+tag+'\\b[^>]*>','gi'))].map(m=>m[0]);
  return tags.filter(t=>new RegExp('\\b'+property+'=["\\\']'+value+'["\\\']','i').test(t));
}
function attr(tag,name) {
  return (tag.match(new RegExp('\\b'+name+'="([^"]*)"','i'))||[])[1]||'';
}

for(const [slug,contract] of Object.entries(seo)){
  test(slug+': crawlable title, snippet, social preview and app schema agree',()=>{
    const html=read('public/'+slug+'/index.html'),head=html.split('</head>')[0];
    const canonical=origin+'/'+slug+'/';
    const title=decode((head.match(/<title>([^<]+)<\/title>/)||[])[1]||'');
    assert.equal(title,contract.title);
    assert.ok(title.length<=60 && title.length>=35,'repo SERP title width');
    const description=decode(attr(matchTag(head,'meta','name','description')[0]||'','content'));
    assert.equal(description,contract.description);
    assert.ok(description.length>=120 && description.length<=158,'repo SERP description length');
    const can=matchTag(head,'link','rel','canonical');
    assert.equal(can.length,1,'one canonical tag');
    assert.equal(attr(can[0],'href'),canonical);
    assert.match(head,/<meta name="robots" content="index,follow,max-image-preview:large">/);
    assert.equal(attr(matchTag(head,'meta','property','og:title')[0]||'','content'),contract.title.replace(/&/g,'&amp;'));
    assert.equal(decode(attr(matchTag(head,'meta','property','og:description')[0]||'','content')),contract.description);
    assert.equal(attr(matchTag(head,'meta','property','og:url')[0]||'','content'),canonical);
    assert.equal(attr(matchTag(head,'meta','name','twitter:card')[0]||'','content'),'summary_large_image');
    assert.equal(decode(attr(matchTag(head,'meta','name','twitter:title')[0]||'','content')),contract.title);
    assert.equal(decode(attr(matchTag(head,'meta','name','twitter:description')[0]||'','content')),contract.description);
    assert.ok(attr(matchTag(head,'meta','name','twitter:image:alt')[0]||'','content').length>20);
    const image=origin+'/assets/seaway/'+contract.image;
    assert.equal(attr(matchTag(head,'meta','property','og:image')[0]||'','content'),image);
    assert.equal(attr(matchTag(head,'meta','name','twitter:image')[0]||'','content'),image);
    assert.ok(fs.statSync(path.join(root,'public/assets/seaway',contract.image)).size>5000);
    const json=(head.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)||[])[1];
    assert.ok(json,'crawlable initial JSON-LD');
    const graph=JSON.parse(json)['@graph'];
    const get=t=>graph.find(n=>n['@type']===t);
    const person=get('Person'),page=get('WebPage'),app=get('WebApplication'),breadcrumbs=get('BreadcrumbList');
    assert.equal(person['@id'],origin+'/#person');
    assert.equal(page.url,canonical);
    assert.equal(page.name,contract.title);
    assert.equal(page.description,contract.description);
    assert.equal(page.dateModified,contract.dateModified);
    assert.equal(page.author['@id'],person['@id']);
    assert.equal(page.mainEntity['@id'],app['@id']);
    assert.equal(app.url,canonical);
    assert.equal(app.description,contract.description);
    assert.ok(breadcrumbs.itemListElement.some(x=>x.item===canonical));
  });

  test(slug+': discoverable only through proper primary-host sitemap and source image',()=>{
    const canonical=origin+'/'+slug+'/';
    const pageEntries=pageBlocks(sitemap).filter(x=>x.includes('<loc>'+canonical+'</loc>'));
    assert.equal(pageEntries.length,1,'main sitemap has exactly one canonical URL');
    assert.match(pageEntries[0],new RegExp('<lastmod>'+seo[slug].dateModified+'<\\/lastmod>'));
    const pictureEntries=pageBlocks(imageSitemap).filter(x=>x.includes('<loc>'+canonical+'</loc>'));
    assert.equal(pictureEntries.length,1,'image sitemap lists canonical once');
    assert.ok(pictureEntries[0].includes('<image:loc>'+origin+'/assets/seaway/'+seo[slug].image+'</image:loc>'));
    assert.ok(!sitemap.includes('picturedrocks.chrisizworski.com/'+slug));
  });
}

test('Seaway sitemap index and robots point to live canonical collections without duplicate Seaway sitemap',()=>{
  assert.match(index,/<loc>https:\/\/chrisizworski\.com\/sitemap\.xml<\/loc>/);
  assert.match(index,/<loc>https:\/\/chrisizworski\.com\/image-sitemap\.xml<\/loc>/);
  assert.match(robots,/^Sitemap: https:\/\/chrisizworski\.com\/sitemap-index\.xml$/m);
  assert.match(robots,/^Sitemap: https:\/\/chrisizworski\.com\/image-sitemap\.xml$/m);
  assert.equal((imageSitemap.match(/SEAWAY_IMAGE_SITEMAP:START/g)||[]).length,1);
  assert.equal((imageSitemap.match(/SEAWAY_IMAGE_SITEMAP:END/g)||[]).length,1);
  assert.equal(new Set(Object.values(seo).map(v=>v.dateModified)).size,1,'this paired significant revision shipped together');
});

test('wrong-host copies of both Seaway pages redirect using the existing Pictured Rocks guard, not the primary host',()=>{
  const start=middleware.indexOf('const PICTURED_ROCKS_MAIN_SITE_PREFIXES');
  const end=middleware.indexOf('];',start);
  const guard=middleware.slice(start,end);
  for(const slug of Object.keys(seo)){
    assert.ok(guard.includes("'/"+slug+"'"),slug+' is a wrong-host leak');
    assert.ok(middleware.includes("'/"+slug+"/:path*'"),slug+' has middleware matcher');
  }
  assert.ok(middleware.includes('host === PICTURED_ROCKS_HOST && isPicturedRocksMainSiteLeak(url.pathname)'));
  assert.ok(middleware.includes('return Response.redirect(canonical, 308)'));
  assert.ok(middleware.includes('(url.pathname === \'/\' || url.pathname === \'/index.html\')'),'Pictured Rocks root remains distinct');
});

test('generators keep one search truth; journeys and source content retain distinct intent and link structure',()=>{
  const generator=read('scripts/generate-seaway.mjs');
  const enhancer=read('scripts/enhance-seaway-journey.mjs');
  assert.match(generator,/search-surface\.json/);
  assert.match(generator,/dateModified:page\.dateModified/);
  assert.match(enhancer,/search-surface\.json/);
  assert.ok(!enhancer.includes('const oldTitle='),'no post-generation title replacement that can drift');
  const hub=read('public/st-lawrence-seaway/index.html');
  const ike=read('public/eisenhower-lock/index.html');
  assert.match(hub,/href="\/welland-canal\/"/);
  assert.match(hub,/href="\/eisenhower-lock\/"/);
  assert.match(ike,/href="\/st-lawrence-seaway\/"/);
  assert.match(hub,/Five river chapters/);
  assert.match(ike,/Seaway Visitor Center/);
});
