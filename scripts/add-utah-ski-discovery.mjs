import fs from 'node:fs';
// Mirror the canonical Utah ski decision tool into the existing National Tools
// index and sitemap. Idempotent after other national-tools synchronization.
const url='https://chrisizworski.com/utah-ski-access/';
const national='public/synced-national-tools/index.html',sitemap='public/sitemap.xml';
let html=fs.readFileSync(national,'utf8');
const card='<article class="directory-card" data-search-card data-tool-id="utah-ski-access" data-personas="trip conditions" data-tags="utah ski access cottonwood canyon sr190 sr210 road closure traction alta snowbird solitude brighton ikon parking reservation winter ski resort" data-months="1,2,3,4,5,11,12"><div class="card-top"><span class="kind">Ski day access</span><span class="season-label" hidden>In season now</span></div><h3>Utah Ski Canyon Road &amp; Parking Checker</h3><p class="place">Utah · Alta, Snowbird, Brighton, Solitude</p><p class="description">Check UDOT canyon reports, 2026–27 parking reservation windows and Ikon access before driving up SR-190 or SR-210.</p><p class="signals"><strong>Sources:</strong> UDOT Traffic and official resort parking/pass policies; no open-road or space guarantee</p><div class="card-actions"><a class="primary-action" href="'+url+'">Check my Utah ski trip &rarr;</a></div></article>';
if(!html.includes('data-tool-id="utah-ski-access"')){
 const anchor='data-tool-id="epic-ikon-pass"';
 const start=html.indexOf(anchor);if(start<0)throw Error('Epic/Ikon discovery anchor missing');
 const end=html.indexOf('</article>',start);if(end<0)throw Error('National card close missing');
 html=html.slice(0,end+10)+'\n'+card+html.slice(end+10);
}
const m=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if(!m)throw Error('National list schema missing');
const json=JSON.parse(m[1]),list=json['@graph'].find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
if(!list?.itemListElement)throw Error('National tool list missing');
if(!list.itemListElement.some(x=>x.url===url)){
 const idx=list.itemListElement.findIndex(x=>x.url==='https://chrisizworski.com/epic-ikon-pass/');
 if(idx<0)throw Error('Epic/Ikon structured list anchor missing');
 list.itemListElement.splice(idx+1,0,{'@type':'ListItem',position:0,url,name:'Utah Ski Canyon Road & Parking Checker'});
}
list.itemListElement.forEach((x,i)=>x.position=i+1);list.numberOfItems=list.itemListElement.length;
// Preserve the existing verified directory collection date; the new Utah page
// has its own independent 2026-10-13 freshness marker and sitemap entry.
html=html.replace(m[0],'<script type="application/ld+json">'+JSON.stringify(json)+'</script>');
html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,'$1'+list.numberOfItems+' tools shown$2');
const cards=(html.match(/data-search-card/g)||[]).length;
if(cards!==list.numberOfItems)throw Error('National card/schema count mismatch: '+cards+'/'+list.numberOfItems);
if((html.match(/data-tool-id="utah-ski-access"/g)||[]).length!==1)throw Error('Utah card duplicate');
if(list.itemListElement.filter(x=>x.url===url).length!==1)throw Error('Utah structured link duplicate');
let xml=fs.readFileSync(sitemap,'utf8');
if(!xml.includes('<loc>'+url+'</loc>')){
 const addition='  <url><loc>'+url+'</loc><lastmod>2026-10-13</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>\n';
 if(!xml.includes('</urlset>'))throw Error('Sitemap closing element missing');
 xml=xml.replace('</urlset>',addition+'</urlset>');
}
if((xml.split('<loc>'+url+'</loc>').length-1)!==1)throw Error('Utah sitemap duplicate');
if(!process.argv.includes('--check')){
 fs.writeFileSync(national,html);
 fs.writeFileSync(sitemap,xml);
}
console.log('Utah ski National Tools and sitemap discovery OK: '+cards+' directory cards');
