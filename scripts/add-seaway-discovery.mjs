import fs from 'node:fs';
const hub='/st-lawrence-seaway/',destination='/eisenhower-lock/',absolute='https://chrisizworski.com';
const card=`<div class="tool-card" data-tool-id="st-lawrence-seaway" data-tool-key="st-lawrence-seaway" data-tags="boating planning transportation great-lakes ships locks seaway canada new-york quebec ontario" data-months="3,4,5,6,7,8,9,10,11,12"><div class="tk">Seaway ship watch<span class="tk-season" hidden> / plan a shore visit</span></div><div class="tool-title"><a href="${hub}">St. Lawrence Seaway Ships &amp; Locks</a></div><div class="tool-desc">Follow recent ships from Montreal toward Lake Ontario, explore seven locks with an interactive model and choose a documented public viewing spot.</div></div>\n`;
const tools='public/tools/index.html';let html=fs.readFileSync(tools,'utf8');
if(!html.includes('data-tool-id="st-lawrence-seaway"')){const at=html.indexOf('<div class="tool-card" data-tool-id="welland-canal"');if(at<0)throw Error('Welland directory anchor missing');html=html.slice(0,at)+card+html.slice(at);fs.writeFileSync(tools,html);}
const freight='public/freighters/index.html';html=fs.readFileSync(freight,'utf8');
if(!html.includes('data-seaway-discovery="freighters"')){
 const needle='<article class="feature"><p class="card-kicker">Lake Ontario to Lake Erie';const at=html.indexOf(needle);if(at<0)throw Error('Freighter desk Welland anchor missing');
 const feature=`<article class="feature" data-seaway-discovery="freighters"><p class="card-kicker">Montreal to Lake Ontario · Canada &amp; United States</p><h3><a href="${hub}">St. Lawrence Seaway Ship Watch</a></h3><p>Follow recent ship reports, explore seven locks and understand the climb inland. Plan a documented public visit at Eisenhower Lock or Iroquois Point.</p><a class="text-link" href="${hub}">Explore the Seaway →</a> · <a class="text-link" href="${destination}">Eisenhower Lock visiting guide →</a></article>\n`;
 html=html.slice(0,at)+feature+html.slice(at);fs.writeFileSync(freight,html);
}
const welland='public/welland-canal/index.html';html=fs.readFileSync(welland,'utf8');
if(!html.includes('data-seaway-discovery="welland"')){const needle='<section class="section faq" id="faq">';if(!html.includes(needle))throw Error('Welland related-content anchor missing');html=html.replace(needle,`<p data-seaway-discovery="welland" class="section"><strong>Follow the journey east:</strong> <a href="${hub}">St. Lawrence Seaway ship map and seven-lock explorer</a> · <a href="${destination}">Eisenhower Lock public viewing guide</a></p>\n`+needle);fs.writeFileSync(welland,html);}
const sitemap='public/sitemap.xml';html=fs.readFileSync(sitemap,'utf8');
for(const route of [hub,destination])if(!html.includes(`<loc>${absolute+route}</loc>`))html=html.replace('</urlset>',`  <url><loc>${absolute+route}</loc><lastmod>2026-10-23</lastmod></url>\n</urlset>`);
fs.writeFileSync(sitemap,html);
// These are site-shell discovery shims, reapplied after the owning national-hub
// source sync. No product logic is developed in that external deployment mirror.
for(const file of ['public/synced-national-tools/index.html','public/synced-national-tools/northeast-great-lakes/index.html']){
 if(!fs.existsSync(file))continue;
 html=fs.readFileSync(file,'utf8');const main=file==='public/synced-national-tools/index.html';
 if(!html.includes('data-seaway-discovery="national"')){
  const needle=main?'<article class="directory-card" data-search-card data-tool-id="welland-canal"':'<article class="tool-card"><span class="kind">Live ship watch</span><h3>Welland Canal';
  const at=html.indexOf(needle);if(at<0)throw Error('National Welland discovery anchor missing in '+file);
  const feature=main?`<article class="directory-card" data-search-card data-tool-id="st-lawrence-seaway" data-seaway-discovery="national" data-personas="trip conditions" data-tags="st lawrence seaway ship tracker locks eisenhower massena iroquois montreal beauharnois thousand islands" data-months="3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">Live ship watch</span><span class="season-label" hidden>Plan a shore visit</span></div><h3>St. Lawrence Seaway Ships &amp; Locks</h3><p class="place">Montreal to Lake Ontario · Canada &amp; New York</p><p class="description">Explore recent ships, seven locks, public viewing plans, an interactive lock model and historical Seaway traffic charts.</p><p class="signals"><strong>Signals:</strong> recent AIS + official transit links + documented public access</p><div class="card-actions"><a class="primary-action" href="${hub}">Explore the Seaway →</a></div></article>\n`:`<article class="tool-card" data-seaway-discovery="national"><span class="kind">Seaway ship watch</span><h3>St. Lawrence Seaway Ships &amp; Locks</h3><p class="place">Montreal · Massena · Iroquois · Thousand Islands</p><p>Follow recent AIS reports and explore the seven-lock journey toward Lake Ontario. Use documented public viewing plans and an interactive educational lock model.</p><p class="why"><strong>Best for:</strong> choosing a shore visit and understanding the engineering.</p><p class="sources">Recent AIS + official Seaway and municipal sources + historical BTS traffic</p><a class="action" href="${hub}">Explore the Seaway →</a></article>\n`;
  html=html.slice(0,at)+feature+html.slice(at);
 }
 const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);if(!match)throw Error('National schema missing');
 const graph=JSON.parse(match[1]),list=graph['@graph']?.find(x=>x['@type']==='ItemList');if(!Array.isArray(list?.itemListElement))throw Error('National item list missing');
 if(!list.itemListElement.some(x=>x.url===absolute+hub||x.item?.url===absolute+hub))list.itemListElement.push({'@type':'ListItem',position:list.itemListElement.length+1,url:absolute+hub,name:'St. Lawrence Seaway Ships & Locks'});
 list.itemListElement.forEach((x,i)=>x.position=i+1);list.numberOfItems=list.itemListElement.length;
 html=html.replace(match[0],'<script type="application/ld+json">'+JSON.stringify(graph)+'</script>');
 if(main)html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown/, '$1'+list.numberOfItems+' tools shown');
 fs.writeFileSync(file,html);
}
console.log('Seaway maritime, directory, national-shell and sitemap discovery applied.');
