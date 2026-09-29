const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

function fixtureDirectory(){
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':'https://chrisizworski.com/national-tools/#page','dateModified':'2026-09-01'},
    {'@type':'ItemList','@id':'https://chrisizworski.com/national-tools/#toollist','numberOfItems':3,'itemListElement':[
      {'@type':'ListItem',position:1,url':'https://chrisizworski.com/national-tools/rivers/','name':'River Conditions'},
      {'@type':'ListItem',position:2,url':'https://chrisizworski.com/national-tools/haleakala-sunrise/','name':'Haleakala Sunrise'},
      {'@type':'ListItem',position:3,url':'https://chrisizworski.com/national-tools/kilauea-live/','name':'Kīlauea Live'}
    ]}
  ]};
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body>
<p class="finder-count" id="finder-count" aria-live="polite">3 tools shown</p>
<section class="catalog-group national-utilities" data-catalog-group><div class="catalog-grid"><article class="directory-card" data-search-card data-tool-id="kilauea-live"></article><article class="directory-card" data-search-card data-tool-id="rivers"></article></div></section>
<section class="catalog-group region-cluster" data-catalog-group id="region-hawaii" aria-labelledby="region-hawaii-title"><div class="catalog-head"><div><p class="eyebrow">Regional collection</p><h2 id="region-hawaii-title">Hawaii</h2></div><p>Island destination decisions.</p></div><div class="catalog-grid"><article class="directory-card" data-search-card data-tool-id="haleakala-sunrise"><div class="card-top"></div><h3>Haleakalā Sunrise</h3></article></div></section>
</body></html>`;
}

function fixtureKilauea(){
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':'https://chrisizworski.com/#website','url':'https://chrisizworski.com/','name':'Chris Izworski'},
    {'@type':'Person','@id':'https://chrisizworski.com/#person','name':'Chris Izworski','url':'https://chrisizworski.com/'},
    {'@type':'WebPage','@id':'https://chrisizworski.com/national-tools/kilauea-live/','url':'https://chrisizworski.com/national-tools/kilauea-live/','name':'Old title','description':'Old description','author':{'@id':'https://chrisizworski.com/#person'},'publisher':{'@id':'https://chrisizworski.com/#person'}}
  ]};
  return `<!doctype html><html><head>
<meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="https://chrisizworski.com/national-tools/kilauea-live/">
<meta property="og:type" content="website"><meta property="og:title" content="Old"><meta property="og:description" content="Old"><meta property="og:url" content="https://chrisizworski.com/national-tools/kilauea-live/">
<meta name="twitter:card" content="summary"><meta name="twitter:title" content="Old"><meta name="twitter:description" content="Old">
<title>Old title</title><meta name="description" content="Old description">
<script type="application/ld+json">${JSON.stringify(schema)}</script>
</head><body></body></html>`;
}

test('Kilauea guard keeps the tool in Hawaii and hardens search/share metadata idempotently',async()=>{
  const {ensureKilaueaDiscovery}=await import('../scripts/ensure-kilauea-discovery.mjs');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'kilauea-discovery-'));
  const dir=path.join(root,'public','synced-national-tools');
  fs.mkdirSync(path.join(dir,'kilauea-live'),{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),fixtureDirectory());
  fs.writeFileSync(path.join(dir,'kilauea-live','index.html'),fixtureKilauea());

  ensureKilaueaDiscovery(root);
  ensureKilaueaDiscovery(root);

  const directory=fs.readFileSync(path.join(dir,'index.html'),'utf8');
  assert.equal((directory.match(/data-tool-id="kilauea-live"/g)||[]).length,1);
  const hawaii=directory.match(/<section class="catalog-group region-cluster"[^>]*id="region-hawaii"[\s\S]*?<\/section>/)[0];
  assert.match(hawaii,/data-tool-id="kilauea-live"/);
  const national=directory.match(/<section class="catalog-group national-utilities"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(national,/kilauea-live/);
  assert.match(directory,/>3 tools shown</);

  const directorySchema=JSON.parse(directory.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list=directorySchema['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.equal(list.itemListElement.filter(x=>x.url==='https://chrisizworski.com/national-tools/kilauea-live/').length,1);
  assert.equal(list.numberOfItems,list.itemListElement.length);
  const haleakala=list.itemListElement.findIndex(x=>x.url==='https://chrisizworski.com/national-tools/haleakala-sunrise/');
  const kilauea=list.itemListElement.findIndex(x=>x.url==='https://chrisizworski.com/national-tools/kilauea-live/');
  assert.equal(kilauea,haleakala+1);

  const page=fs.readFileSync(path.join(dir,'kilauea-live','index.html'),'utf8');
  const title=page.match(/<title>(.*?)<\/title>/)[1];
  assert.equal(title,'Kīlauea Live: Should You Go Now? | Chris Izworski');
  assert.ok(title.length<=60);
  assert.match(page,/<meta name="robots" content="index,follow,max-image-preview:large">/);
  assert.match(page,/twitter:card" content="summary_large_image"/);
  assert.match(page,/twitter:image/);
  assert.match(page,/og:image/);
  assert.match(page,/og:image:alt/);
  assert.equal((page.match(/<meta property="og:title"/g)||[]).length,1);
  const pageSchema=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(pageSchema['@graph'].some(x=>x['@type']==='BreadcrumbList'));
  assert.ok(pageSchema['@graph'].some(x=>x['@type']==='ImageObject'));
  assert.ok(pageSchema['@graph'].some(x=>x['@type']==='WebApplication'));
  assert.match(page,/"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(page,/"author":\{"@id":"https:\/\/chrisizworski\.com\/#person"\}/);
});
