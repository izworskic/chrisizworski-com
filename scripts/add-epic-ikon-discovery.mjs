import fs from 'node:fs';
// Explicit, idempotent mirror of the authoritative National Tools catalog entry.
// Authored in izworskic/national-outdoor-tools-hub; this shim only connects the public site shell.
const file='public/synced-national-tools/index.html';
const card="<article class=\"directory-card\" data-search-card data-tool-id=\"epic-ikon-pass\" data-personas=\"trip event\" data-tags=\"ski season winter epic ikon pass blackout date holiday vail aspen mountain snowmass reservation ski lift ticket access travel\" data-months=\"1,2,3,4,5,10,11,12\"><div class=\"card-top\"><span class=\"kind\">Ski pass decision</span><span class=\"season-label\" hidden>In season now</span></div><h3>Epic vs Ikon Pass Blackout Checker</h3><p class=\"place\">2026–27 · U.S. + Whistler</p><p class=\"description\">Select your exact Epic or Ikon pass, destination and ski date. Check published blackout dates, shared-day limits and whether a lift reservation is required.</p><p class=\"signals\"><strong>Sources:</strong> 2026–27 Epic + Ikon official pass rules; account and resort operations not connected</p><div class=\"card-actions\"><a class=\"primary-action\" href=\"https://chrisizworski.com/epic-ikon-pass/\">Will my pass work that day? &rarr;</a></div></article>";
const url='https://chrisizworski.com/epic-ikon-pass/';
let html=fs.readFileSync(file,'utf8');
const snow='data-tool-id="snow"';
if(!html.includes('data-tool-id="epic-ikon-pass"')){
 const i=html.indexOf(snow);if(i<0)throw new Error('National snow card missing');
 const end=html.indexOf('</article>',i);if(end<0)throw new Error('National snow card malformed');
 html=html.slice(0,end+'</article>'.length)+'\n'+card+html.slice(end+'</article>'.length);
}
const m=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);if(!m)throw new Error('National schema missing');
const schema=JSON.parse(m[1]);
const graph=schema['@graph'];
const list=graph.find(x=>x['@id']==='https://chrisizworski.com/national-tools/#toollist');
if(!list)throw new Error('National list missing');
if(!list.itemListElement.some(x=>x.url===url)){
 const k=list.itemListElement.findIndex(x=>x.url==='https://chrisizworski.com/national-tools/snow/');
 if(k<0)throw new Error('National snow schema item missing');
 list.itemListElement.splice(k+1,0,{'@type':'ListItem',position:0,url,name:'Epic vs Ikon Pass Blackout Checker'});
}
list.itemListElement.forEach((x,i)=>{x.position=i+1});
list.numberOfItems=list.itemListElement.length;
const page=graph.find(x=>x['@type']==='CollectionPage');
if(page&&(!page.dateModified||page.dateModified<'2026-10-12'))page.dateModified='2026-10-12';
html=html.replace(m[0],'<script type="application/ld+json">'+JSON.stringify(schema)+'</script>');
html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,'$1'+list.numberOfItems+' tools shown$2');
const cards=[...html.matchAll(/<article class="directory-card" data-search-card[\s\S]*?<\/article>/g)];
if(cards.length!==list.numberOfItems)throw new Error('National mirror card/schema count mismatch: '+cards.length+'/'+list.numberOfItems);
if(cards.filter(x=>x[0].includes('data-tool-id="epic-ikon-pass"')).length!==1)throw new Error('Epic Ikon card duplicate');
if((list.itemListElement.filter(x=>x.url===url)).length!==1)throw new Error('Epic Ikon structured URL duplicate');
if(!process.argv.includes('--check'))fs.writeFileSync(file,html);
console.log('Epic Ikon public National Tools mirror OK, cards='+cards.length);
