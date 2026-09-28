const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const GA4='G-Y5D2V2W7HN';
const ADS='ca-pub-8222782620788075';
const tools=['zion-narrows-conditions','grand-canyon-access','going-to-the-sun-road-status','haleakala-sunrise','yellowstone-road-status','tioga-road-status','cadillac-mountain-sunrise','mount-rainier-road-status','lake-mead-access','lake-powell-ramp-status'];

test('breakout sync copies verified pages, pins routes, and adds one directory discovery entry',async()=>{
  const {installBreakoutLive,BREAKOUT_SLUGS}=await import('../scripts/sync-breakout-live-main.mjs');
  const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'breakout-main-sync-'));
  const core=path.join(tmp,'core');
  const site=path.join(tmp,'site');
  fs.mkdirSync(path.join(core,'config'),{recursive:true});
  fs.mkdirSync(path.join(site,'public','synced-national-tools'),{recursive:true});
  fs.writeFileSync(path.join(core,'config','breakout-live-pages.json'),JSON.stringify(Object.fromEntries(tools.map(x=>[x,{}]))));
  for(const slug of BREAKOUT_SLUGS){
    const dir=path.join(core,'public','national-tools',slug);
    fs.mkdirSync(dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'index.html'),`<link rel="canonical" href="https://chrisizworski.com/national-tools/${slug}/"><script>${GA4}</script><meta name="google-adsense-account" content="${ADS}">`);
  }
  const schema={'@context':'https://schema.org','@graph':[
    {'@type':'CollectionPage','@id':'https://chrisizworski.com/national-tools/#page','dateModified':'2026-09-01'},
    {'@type':'ItemList','@id':'https://chrisizworski.com/national-tools/#toollist','numberOfItems':1,'itemListElement':[{'@type':'ListItem','position':1,'url':'https://chrisizworski.com/national-tools/rivers/','name':'River Conditions'}]}
  ]};
  fs.writeFileSync(path.join(site,'public','synced-national-tools','index.html'),`<script type="application/ld+json">${JSON.stringify(schema)}</script><p class="finder-count" id="finder-count" aria-live="polite">1 tools shown</p><section class="catalog-group national-utilities" data-catalog-group><div class="catalog-grid"><article class="directory-card" data-search-card data-tool-id="rivers"></article></div></section>`);
  fs.writeFileSync(path.join(site,'vercel.json'),JSON.stringify({rewrites:[{source:'/national-tools/existing',destination:'/existing.html'},{source:'/national-tools/:path*',destination:'https://national-outdoor-tools-hub.vercel.app/national-tools/:path*'}]}));
  const result=installBreakoutLive(core,site);
  assert.deepEqual(result,{pages:11,routes:22});
  const v=JSON.parse(fs.readFileSync(path.join(site,'vercel.json'),'utf8'));
  const catchAll=v.rewrites.findIndex(r=>r.source==='/national-tools/:path*');
  assert.ok(catchAll>0);
  for(const slug of BREAKOUT_SLUGS){
    for(const slash of ['', '/']){
      const source=`/national-tools/${slug}${slash}`;
      const rows=v.rewrites.filter(r=>r.source===source);
      assert.equal(rows.length,1,`${source} must be unique`);
      assert.equal(rows[0].destination,`/synced-national-tools/${slug}/index.html`);
      assert.ok(v.rewrites.findIndex(r=>r.source===source)<catchAll,`${source} must precede catch-all`);
    }
    assert.ok(fs.existsSync(path.join(site,'public','synced-national-tools',slug,'index.html')));
  }
  const directory=fs.readFileSync(path.join(site,'public','synced-national-tools','index.html'),'utf8');
  assert.equal((directory.match(/data-tool-id="live-decisions"/g)||[]).length,1,'directory card must be unique');
  assert.match(directory,/href="\/national-tools\/live-decisions\/"/);
  assert.match(directory,/>2 tools shown</);
  const outSchema=JSON.parse(directory.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const list=outSchema['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
  assert.equal(list.numberOfItems,2);
  assert.equal(list.itemListElement.filter(x=>x.url==='https://chrisizworski.com/national-tools/live-decisions/').length,1);
  assert.deepEqual(list.itemListElement.map(x=>x.position),[1,2]);
});
