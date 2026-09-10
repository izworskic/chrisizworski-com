'use strict';

const injectExisting=require('./inject-platte-national-tools.js');

const TOOL={
  url:'https://chrisizworski.com/national-tools/fort-madison-live/',
  schemaName:'Fort Madison Live: Trains, Barges & Swing Bridge Openings',
  intent:'<li><a href="https://chrisizworski.com/national-tools/fort-madison-live/">See what reaches Fort Madison next<span>Identified trains, named Mississippi tows, Southwest Chief timing, river stage and predicted swing-bridge interaction</span></a></li>',
  feature:'<article class="feature-card" data-fort-madison-feature="true" data-tags="fort madison iowa mississippi river bridge swing bridge trains railroad rail bnsf amtrak southwest chief barges tow vessels transportation railfan" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="feature-kicker">Mississippi River · Iowa</div><h3><a href="https://chrisizworski.com/national-tools/fort-madison-live/">Fort Madison Live</a></h3><p>See what is approaching the Fort Madison swing bridge next. The tool reconciles identified rail movements, named commercial tows, Southwest Chief timing, river stage and modeled bridge-opening windows into one live event view.</p><div class="signal-line">USACE LPMS + NOAA/NWPS + Amtrak + licensed rail observations</div><a class="tool-cta" href="https://chrisizworski.com/national-tools/fort-madison-live/">Open Fort Madison Live &rarr;</a></article>',
  library:'<article class="tool-card" data-search-card data-fort-madison-card="true" data-tags="fort madison iowa mississippi river bridge swing bridge trains railroad rail bnsf amtrak southwest chief barges tow vessels transportation railfan water" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="tk">Live crossing intelligence<span class="tk-season" hidden> / useful now</span></div><div class="tool-title"><a href="https://chrisizworski.com/national-tools/fort-madison-live/">Fort Madison Live: Trains, Barges &amp; Swing Bridge Openings</a></div><div class="tool-desc">Track the next rail, tow and bridge event at Fort Madison with named tow candidates, Southwest Chief timing, river stage, truth-labeled freight observations and modeled cross-system interaction.</div></article>'
};

function ensureSchema(html){
  const schemaRe=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while((match=schemaRe.exec(html))){
    try{
      const data=JSON.parse(match[1]);
      const graph=data?.['@graph'];
      if(!Array.isArray(graph)) continue;
      const list=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
      if(!list?.itemListElement) continue;
      list.itemListElement=list.itemListElement.filter(x=>!String(x?.url||'').includes('/fort-madison-live'));
      list.itemListElement.push({'@type':'ListItem',position:list.itemListElement.length+1,url:TOOL.url,name:TOOL.schemaName});
      list.itemListElement.forEach((x,i)=>x.position=i+1);
      list.numberOfItems=list.itemListElement.length;
      const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
      if(page) page.dateModified='2026-09-10';
      const replacement=`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
      return html.slice(0,match.index)+replacement+html.slice(match.index+match[0].length);
    }catch{}
  }
  return html;
}

function ensureWaterIntent(html){
  if(html.includes('>See what reaches Fort Madison next<')) return html;
  const melvin='<li><a href="https://chrisizworski.com/national-tools/melvin-price-live/">Time a Melvin Price Locks visit<span>Live tow queue, lock activity, Mississippi flow and stage, AIS vessels, weather, free tour timing and a go-now visitor outlook</span></a></li>';
  if(html.includes(melvin)) return html.replace(melvin,`${melvin}${TOOL.intent}`);
  const start='<article class="intent-card"><div class="intent-kicker">Water</div>';
  const startIndex=html.indexOf(start);
  if(startIndex<0) return html;
  const endIndex=html.indexOf('</ul></article>',startIndex);
  if(endIndex<0) return html;
  return html.slice(0,endIndex)+TOOL.intent+html.slice(endIndex);
}

function ensureFeatured(html){
  if(html.includes('data-fort-madison-feature="true"')) return html;
  const grid='<div class="feature-grid">';
  const gridIndex=html.indexOf(grid);
  if(gridIndex<0) return html;
  const insertAt=gridIndex+grid.length;
  return html.slice(0,insertAt)+TOOL.feature+'\n'+html.slice(insertAt);
}

function ensureWaterLibrary(html){
  if(html.includes('data-fort-madison-card="true"')) return html;
  const start='<section class="library-group" data-library-group="water">';
  const startIndex=html.indexOf(start);
  if(startIndex<0) return html;
  const gridIndex=html.indexOf('<div class="tool-grid">',startIndex);
  if(gridIndex<0) return html;
  const insertAt=gridIndex+'<div class="tool-grid">'.length;
  return html.slice(0,insertAt)+TOOL.library+html.slice(insertAt);
}

module.exports=function injectFortMadisonNationalTools(input){
  let html=injectExisting(String(input||''));
  html=ensureSchema(html);
  html=ensureWaterIntent(html);
  html=ensureFeatured(html);
  html=ensureWaterLibrary(html);
  return html;
};
