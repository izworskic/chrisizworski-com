const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const GA4='G-Y5D2V2W7HN';
const ADS='ca-pub-8222782620788075';
const tools=['zion-narrows-conditions','grand-canyon-access','going-to-the-sun-road-status','haleakala-sunrise','yellowstone-road-status','tioga-road-status','cadillac-mountain-sunrise','mount-rainier-road-status','lake-mead-access','lake-powell-ramp-status'];

test('breakout sync copies verified pages and routes without owning the national directory',async()=>{
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
    if(slug==='live-decisions'){
      const liveSchema={'@context':'https://schema.org','@graph':[
        {'@type':'CollectionPage','@id':'https://chrisizworski.com/national-tools/live-decisions/#page','dateModified':'2026-09-01'},
        {'@type':'ItemList','@id':'https://chrisizworski.com/national-tools/live-decisions/#list','numberOfItems':10,'itemListElement':tools.map((id,i)=>({'@type':'ListItem','position':i+1,'url':`https://chrisizworski.com/national-tools/${id}/`,'name':id}))}
      ]};
      const regions='<section class="decision-region"><div class="decision-region-head"><p class="eyebrow">Southwest &amp; Colorado Plateau</p></div><div class="decision-link-grid"><a class="decision-link-card" href="/national-tools/zion-narrows-conditions/"><span>Zion</span></a></div></section><section class="decision-region"><div class="decision-region-head"><p class="eyebrow">Hawaii</p></div><div class="decision-link-grid"><a class="decision-link-card" href="/national-tools/haleakala-sunrise/"><span>Haleakala</span></a></div></section>';
      fs.writeFileSync(path.join(dir,'index.html'),`<link rel="canonical" href="https://chrisizworski.com/national-tools/${slug}/"><script>${GA4}</script><meta name="google-adsense-account" content="${ADS}"><script type="application/ld+json">${JSON.stringify(liveSchema)}</script><h1>Start with where you're going.</h1>${regions}`);
    }else{
      fs.writeFileSync(path.join(dir,'index.html'),`<link rel="canonical" href="https://chrisizworski.com/national-tools/${slug}/"><script>${GA4}</script><meta name="google-adsense-account" content="${ADS}">`);
    }
  }
  const directory='<html><body><p id="directory-owner">hub owns this directory</p></body></html>';
  fs.writeFileSync(path.join(site,'public','synced-national-tools','index.html'),directory);
  const kilaueaDir=path.join(site,'public','synced-national-tools','kilauea-live');
  fs.mkdirSync(kilaueaDir,{recursive:true});
  fs.writeFileSync(path.join(kilaueaDir,'index.html'),'<script type="application/ld+json">{"dateModified":"2026-09-29"}</script>');
  fs.writeFileSync(path.join(site,'public','sitemap-breakout-live.xml'),'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
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

  assert.equal(fs.readFileSync(path.join(site,'public','synced-national-tools','index.html'),'utf8'),directory,'breakout sync must not mutate the hub-owned national directory');

  const live=fs.readFileSync(path.join(site,'public','synced-national-tools','live-decisions','index.html'),'utf8');
  assert.match(live,/Start with where you're going\./);
  assert.equal((live.match(/href="\/national-tools\/kilauea-live\/"/g)||[]).length,1,'live decisions Kilauea card must be unique');
  const hawaiiStart=live.indexOf('<p class="eyebrow">Hawaii</p>');
  assert.ok(hawaiiStart>=0,'Hawaii region must exist');
  const hawaii=live.slice(hawaiiStart);
  assert.match(hawaii,/href="\/national-tools\/haleakala-sunrise\/"/);
  assert.match(hawaii,/href="\/national-tools\/kilauea-live\/"/);
  const liveOutSchema=JSON.parse(live.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  const liveList=liveOutSchema['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/live-decisions/#list');
  assert.equal(liveList.numberOfItems,11);
  assert.equal(liveList.itemListElement.filter(x=>x.url==='https://chrisizworski.com/national-tools/kilauea-live/').length,1);

  const sitemap=fs.readFileSync(path.join(site,'public','sitemap-breakout-live.xml'),'utf8');
  assert.equal((sitemap.match(/https:\/\/chrisizworski\.com\/national-tools\/kilauea-live\//g)||[]).length,1,'Kilauea sitemap URL must be unique');
  assert.match(sitemap,/<loc>https:\/\/chrisizworski\.com\/national-tools\/kilauea-live\/<\/loc><lastmod>2026-09-29<\/lastmod>/);

  fs.writeFileSync(path.join(kilaueaDir,'index.html'),'<script type="application/ld+json">{"dateModified":"2026-10-03"}</script>');
  installBreakoutLive(core,site);
  assert.match(fs.readFileSync(path.join(site,'public','sitemap-breakout-live.xml'),'utf8'),/<lastmod>2026-10-03<\/lastmod>/,'repeat sync must follow the current page date');
  fs.writeFileSync(path.join(kilaueaDir,'index.html'),'<script type="application/ld+json">{}</script>');
  assert.throws(()=>installBreakoutLive(core,site),/Kilauea page dateModified missing/);
  fs.rmSync(tmp,{recursive:true,force:true});
});
