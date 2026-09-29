const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

function fixtureDirectory(){
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':'https://chrisizworski.com/national-tools/#page','dateModified':'2026-09-01'},
    {'@type':'ItemList','@id':'https://chrisizworski.com/national-tools/#toollist','numberOfItems':3,'itemListElement':[
      {'@type':'ListItem',position:1,url:'https://chrisizworski.com/national-tools/rivers/',name:'River Conditions'},
      {'@type':'ListItem',position:2,url:'https://chrisizworski.com/national-tools/haleakala-sunrise/',name:'Haleakalā Sunrise Conditions & Planner'},
      {'@type':'ListItem',position:3,url:'https://chrisizworski.com/national-tools/kilauea-live/',name:'Kīlauea Live'}
    ]}
  ]};
  return `<!doctype html><html><head><script type="application/ld+json">${JSON.stringify(schema)}</script></head><body>
<section class="season-now"><h2 id="season-now-title">Which conditions could change your plan?</h2><p>Existing seasonal copy.</p></section>
<p class="finder-count" id="finder-count" aria-live="polite">3 tools shown</p>
<section class="catalog-group national-utilities" data-catalog-group><div class="catalog-grid"><article class="directory-card" data-search-card data-tool-id="rivers"></article></div></section>
<section class="regional-collections"><section class="catalog-group region-cluster" data-catalog-group id="region-hawaii" aria-labelledby="region-hawaii-title"><div class="catalog-head"><div><p class="eyebrow">Regional collection</p><h2 id="region-hawaii-title">Hawaii</h2></div><p>Island destination decisions.</p></div><div class="catalog-grid"><article class="directory-card" data-search-card data-tool-id="haleakala-sunrise"></article><article class="directory-card" data-search-card data-tool-id="kilauea-live"></article></div></section></section>
</body></html>`;
}

function fixtureKilauea(){
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'WebSite','@id':'https://chrisizworski.com/#website','url':'https://chrisizworski.com/','name':'Chris Izworski'},
    {'@type':'Person','@id':'https://chrisizworski.com/#person','name':'Chris Izworski'},
    {'@type':'WebPage','@id':'https://chrisizworski.com/national-tools/kilauea-live/','url':'https://chrisizworski.com/national-tools/kilauea-live/','name':'Old title','description':'Old description'}
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

test('Kilauea guard strengthens its Hawaii regional home and discovery metadata idempotently',async()=>{
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
  assert.equal((directory.match(/id="region-hawaii"/g)||[]).length,1);
  assert.match(directory,/<h2 id="region-hawaii-title">Hawaiʻi &amp; Pacific<\/h2>/);
  assert.match(directory,/class="kilauea-feature"/);
  const national=directory.match(/<section class="catalog-group national-utilities"[\s\S]*?<\/section>/)[0];
  assert.doesNotMatch(national,/kilauea-live/);
  const hawaii=directory.match(/<section class="catalog-group region-cluster"[^>]*id="region-hawaii"[\s\S]*?<\/section>/)[0];
  assert.match(hawaii,/data-tool-id="kilauea-live"/);
  assert.match(hawaii,/USGS Hawaiian Volcano Observatory \+ NPS \+ NWS \+ Hawaiʻi DOH/);

  const directorySchema=JSON.parse(directory.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list=directorySchema['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.equal(list.itemListElement.filter(x=>x.url==='https://chrisizworski.com/national-tools/kilauea-live/').length,1);
  assert.equal(list.numberOfItems,list.itemListElement.length);
  assert.deepEqual(list.itemListElement.map(x=>x.position),list.itemListElement.map((_,i)=>i+1));
  const haleakala=list.itemListElement.findIndex(x=>/Haleakal/.test(x.name));
  const kilauea=list.itemListElement.findIndex(x=>x.url==='https://chrisizworski.com/national-tools/kilauea-live/');
  assert.equal(kilauea,haleakala+1);

  const page=fs.readFileSync(path.join(dir,'kilauea-live','index.html'),'utf8');
  assert.match(page,/<title>Kīlauea Eruption Live Today: Worth Going\? \| Chris Izworski<\/title>/);
  assert.match(page,/twitter:card" content="summary_large_image"/);
  assert.match(page,/twitter:image/);
  assert.match(page,/og:image/);
  assert.match(page,/max-snippet:-1/);
  assert.equal((page.match(/<meta property="og:title"/g)||[]).length,1);
  assert.equal((page.match(/<meta name="twitter:card"/g)||[]).length,1);
  const pageSchema=JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.ok(pageSchema['@graph'].some(x=>x['@type']==='BreadcrumbList'));
  assert.ok(pageSchema['@graph'].some(x=>x['@type']==='ImageObject'));
  assert.ok(pageSchema['@graph'].some(x=>x['@type']==='WebApplication'));
  const webPage=pageSchema['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/kilauea-live/');
  assert.equal(webPage.primaryImageOfPage['@id'],'https://chrisizworski.com/national-tools/kilauea-live/#primaryimage');
  assert.equal(webPage.author['@id'],'https://chrisizworski.com/#person');
});
