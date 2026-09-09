'use strict';

const URL='https://chrisizworski.com/national-tools/platte-crane-live';

module.exports=function injectPlatteNationalTools(input){
  let html=String(input||'');
  if(html.includes(`href="${URL}"`)||html.includes(`href='${URL}'`)) return html;

  // Keep the national hub's ItemList honest even if its upstream release lags.
  const schemaRe=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  while((match=schemaRe.exec(html))){
    try{
      const data=JSON.parse(match[1]);
      const graph=data?.['@graph'];
      if(!Array.isArray(graph)) continue;
      const list=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
      if(!list?.itemListElement) continue;
      if(!list.itemListElement.some(x=>x?.url===URL)){
        list.itemListElement.push({'@type':'ListItem',position:list.itemListElement.length+1,url:URL,name:'Platte Crane Live: Nebraska Sandhill Crane Migration Intelligence'});
        list.itemListElement.forEach((x,i)=>x.position=i+1);
        list.numberOfItems=list.itemListElement.length;
        const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
        if(page) page.dateModified='2026-09-09';
        const replacement=`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
        html=html.slice(0,match.index)+replacement+html.slice(match.index+match[0].length);
      }
      break;
    }catch{}
  }

  const wildlifeIntent=`<article class="intent-card"><div class="intent-kicker">Wildlife</div><h3>Time a major wildlife migration</h3><ul><li><a href="${URL}">See Nebraska’s Sandhill Crane migration<span>Official crane surveys, modeled migration state, river conditions, weather, public viewing sites and historical timing</span></a></li></ul></article>\n`;
  const feature=`<article class="feature-card" data-tags="wildlife birds birding migration sandhill cranes nebraska platte river kearney grand island gibbon rowe sanctuary weather river tourism" data-months="2,3,4"><div class="feature-kicker">Sandhill Cranes · Nebraska</div><h3><a href="${URL}">Platte Crane Live</a></h3><p>Decide whether Nebraska’s Sandhill Crane migration is worth the trip with official Crane Trust surveys, a clearly labeled between-survey model, Platte River conditions, movement weather, public viewing guidance and historical timing.</p><div class="signal-line">Crane Trust + USGS + NOAA/NWS + historical migration climatology</div><a class="tool-cta" href="${URL}">Open Platte Crane Live &rarr;</a></article>\n`;
  const library=`<section class="library-group" data-library-group="wildlife"><h2>Wildlife and migration tools</h2><p class="group-blurb">Specialist tools for timing major wildlife events using live conditions, official observations and historical seasonal context.</p><div class="tool-grid"><article class="tool-card" data-search-card data-tags="wildlife birds birding migration sandhill cranes nebraska platte river kearney grand island gibbon rowe sanctuary weather river travel tourism" data-months="2,3,4"><div class="tk">Live migration intelligence<span class="tk-season" hidden> / useful now</span></div><div class="tool-title"><a href="${URL}">Platte Crane Live: Nebraska Sandhill Crane Migration</a></div><div class="tool-desc">Official surveys first, modeled abundance second, plus river conditions, movement weather, public viewing sites, dawn and dusk planning, and historical peak timing. The model never masquerades as a live bird count.</div></article></div></section>\n`;

  const featureAnchor='<section class="featured-tools"';
  const featureIndex=html.indexOf(featureAnchor);
  if(featureIndex>=0) html=html.slice(0,featureIndex)+wildlifeIntent+html.slice(featureIndex);

  const gridIndex=html.indexOf('<div class="feature-grid">');
  if(gridIndex>=0){
    const insertAt=gridIndex+'<div class="feature-grid">'.length;
    html=html.slice(0,insertAt)+feature+html.slice(insertAt);
  }

  const topicIndex=html.indexOf('<section class="topic-hubs"');
  if(topicIndex>=0) html=html.slice(0,topicIndex)+library+html.slice(topicIndex);

  // Layout-drift fallback: the canonical card must still be discoverable.
  if(!html.includes(`href="${URL}"`)){
    const fallback=`<section class="library-group" data-library-group="wildlife"><h2>Wildlife and migration tools</h2><div class="tool-grid"><article class="tool-card"><div class="tk">Live migration intelligence</div><div class="tool-title"><a href="${URL}">Platte Crane Live: Nebraska Sandhill Crane Migration</a></div><div class="tool-desc">Official Crane Trust surveys, transparent migration modeling, Platte River conditions, weather and public viewing guidance.</div></article></div></section>`;
    html=html.replace(/<\/main>/i,`${fallback}</main>`);
  }
  return html;
};
