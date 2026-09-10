'use strict';

const PLATTE={
  url:'https://chrisizworski.com/national-tools/platte-crane-live',
  schemaName:'Platte Crane Live: Nebraska Sandhill Crane Migration Intelligence',
  intent:'<li><a href="https://chrisizworski.com/national-tools/platte-crane-live">See Nebraska’s Sandhill Crane migration<span>Official crane surveys, modeled migration state, river conditions, weather, public viewing sites and historical timing</span></a></li>',
  feature:'<article class="feature-card" data-platte-feature="true" data-tags="wildlife birds birding migration sandhill cranes nebraska platte river kearney grand island gibbon rowe sanctuary weather river tourism" data-months="2,3,4"><div class="feature-kicker">Sandhill Cranes · Nebraska</div><h3><a href="https://chrisizworski.com/national-tools/platte-crane-live">Platte Crane Live</a></h3><p>Decide whether Nebraska’s Sandhill Crane migration is worth the trip with official Crane Trust surveys, a clearly labeled between-survey model, Platte River conditions, movement weather, public viewing guidance and historical timing.</p><div class="signal-line">Crane Trust + USGS + NOAA/NWS + historical migration climatology</div><a class="tool-cta" href="https://chrisizworski.com/national-tools/platte-crane-live">Open Platte Crane Live &rarr;</a></article>',
  library:'<article class="tool-card" data-search-card data-tags="wildlife birds birding migration sandhill cranes nebraska platte river kearney grand island gibbon rowe sanctuary weather river travel tourism" data-months="2,3,4"><div class="tk">Live migration intelligence<span class="tk-season" hidden> / useful now</span></div><div class="tool-title"><a href="https://chrisizworski.com/national-tools/platte-crane-live">Platte Crane Live: Nebraska Sandhill Crane Migration</a></div><div class="tool-desc">Official surveys first, modeled abundance second, plus river conditions, movement weather, public viewing sites, dawn and dusk planning, and historical peak timing. The model never masquerades as a live bird count.</div></article>'
};

const MONARCH={
  url:'https://chrisizworski.com/national-tools/monarch-migration-live',
  schemaName:'Monarch Migration Live: Butterfly Migration Intelligence',
  intent:'<li><a href="https://chrisizworski.com/national-tools/monarch-migration-live">Track the Monarch migration<span>Recent licensed observations, migration timing, flight weather, Great Lakes concentration context and local habitat timing</span></a></li>',
  feature:'<article class="feature-card" data-monarch-feature="true" data-tags="wildlife butterflies butterfly monarch migration pollinators milkweed great lakes michigan fall spring nature travel weather sightings" data-months="3,4,5,6,7,8,9,10,11"><div class="feature-kicker">Monarch Butterflies · North America</div><h3><a href="https://chrisizworski.com/national-tools/monarch-migration-live">Monarch Migration Live</a></h3><p>See whether Monarch migration is active near you, how current sightings compare with recent records, whether flight weather is helping movement, and where Great Lakes shorelines may concentrate southbound butterflies.</p><div class="signal-line">Licensed iNaturalist records + NWS weather + published migration timing + GBIF history</div><a class="tool-cta" href="https://chrisizworski.com/national-tools/monarch-migration-live">Open Monarch Migration Live &rarr;</a></article>',
  library:'<article class="tool-card" data-search-card data-tags="wildlife butterflies butterfly monarch migration pollinators milkweed great lakes michigan fall spring nature travel weather sightings" data-months="3,4,5,6,7,8,9,10,11"><div class="tk">Live migration intelligence<span class="tk-season" hidden> / useful now</span></div><div class="tool-title"><a href="https://chrisizworski.com/national-tools/monarch-migration-live">Monarch Migration Live: Butterfly Migration Intelligence</a></div><div class="tool-desc">Recent commercially reusable Monarch observations, published northbound and southbound timing, live NWS flight weather, historical occurrence context, Great Lakes concentration context and phase-aware habitat guidance. Observation records and modeled Migration Pulse remain explicitly separate.</div></article>'
};

const TOOLS=[PLATTE,MONARCH];

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
      let changed=false;
      for(const tool of TOOLS){
        if(!list.itemListElement.some(x=>x?.url===tool.url)){
          list.itemListElement.push({'@type':'ListItem',position:list.itemListElement.length+1,url:tool.url,name:tool.schemaName});
          changed=true;
        }
      }
      if(changed){
        list.itemListElement.forEach((x,i)=>x.position=i+1);
        list.numberOfItems=list.itemListElement.length;
        const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
        if(page) page.dateModified='2026-09-10';
        const replacement=`<script type="application/ld+json">${JSON.stringify(data)}</script>`;
        return html.slice(0,match.index)+replacement+html.slice(match.index+match[0].length);
      }
      return html;
    }catch{}
  }
  return html;
}

function ensureWildlifeIntent(html){
  const start='<article class="intent-card"><div class="intent-kicker">Wildlife</div><h3>Time a major wildlife migration</h3><ul>';
  let startIndex=html.indexOf(start);
  if(startIndex<0){
    const featureAnchor='<section class="featured-tools"';
    const featureIndex=html.indexOf(featureAnchor);
    if(featureIndex<0) return html;
    const intent=`${start}${TOOLS.map(t=>t.intent).join('')}</ul></article>\n`;
    return html.slice(0,featureIndex)+intent+html.slice(featureIndex);
  }
  let endIndex=html.indexOf('</ul></article>',startIndex);
  if(endIndex<0) return html;
  for(const tool of TOOLS){
    const slice=html.slice(startIndex,endIndex);
    if(!slice.includes(tool.url)){
      html=html.slice(0,endIndex)+tool.intent+html.slice(endIndex);
      endIndex+=tool.intent.length;
    }
  }
  return html;
}

function ensureFeaturedCards(html){
  const grid='<div class="feature-grid">';
  const gridIndex=html.indexOf(grid);
  if(gridIndex<0) return html;
  let endIndex=html.indexOf('</div></section>',gridIndex);
  if(endIndex<0) endIndex=html.length;
  let insertAt=gridIndex+grid.length;
  for(const tool of [...TOOLS].reverse()){
    const slice=html.slice(gridIndex,endIndex);
    if(!slice.includes(tool.url)){
      const card=`${tool.feature}\n`;
      html=html.slice(0,insertAt)+card+html.slice(insertAt);
      endIndex+=card.length;
    }
  }
  return html;
}

function ensureWildlifeLibrary(html){
  const start='<section class="library-group" data-library-group="wildlife">';
  let startIndex=html.indexOf(start);
  if(startIndex<0){
    const topicIndex=html.indexOf('<section class="topic-hubs"');
    if(topicIndex<0) return html;
    const section=`${start}<h2>Wildlife and migration tools</h2><p class="group-blurb">Specialist tools for timing major wildlife events using live conditions, official observations and historical seasonal context.</p><div class="tool-grid">${TOOLS.map(t=>t.library).join('')}</div></section>\n`;
    return html.slice(0,topicIndex)+section+html.slice(topicIndex);
  }
  let endIndex=html.indexOf('</div></section>',startIndex);
  if(endIndex<0) return html;
  for(const tool of TOOLS){
    const slice=html.slice(startIndex,endIndex);
    if(!slice.includes(tool.url)){
      html=html.slice(0,endIndex)+tool.library+html.slice(endIndex);
      endIndex+=tool.library.length;
    }
  }
  return html;
}

function ensureWildlifeFilter(html){
  if(html.includes('data-filter="wildlife"')) return html;
  const autumn='<button class="chip" type="button" data-filter="fall">Autumn</button>';
  const index=html.indexOf(autumn);
  if(index<0) return html;
  const chip='<button class="chip" type="button" data-filter="wildlife">Wildlife</button>';
  return html.slice(0,index+autumn.length)+chip+html.slice(index+autumn.length);
}

module.exports=function injectNationalWildlifeTools(input){
  let html=String(input||'');
  html=ensureSchema(html);
  html=ensureWildlifeIntent(html);
  html=ensureFeaturedCards(html);
  html=ensureWildlifeLibrary(html);
  html=ensureWildlifeFilter(html);

  // Layout-drift fallback: both canonical wildlife tools must remain discoverable.
  for(const tool of TOOLS){
    if(!html.includes(`href="${tool.url}"`)){
      const fallback=`<section class="library-group" data-library-group="wildlife"><h2>Wildlife and migration tools</h2><div class="tool-grid">${tool.library}</div></section>`;
      html=html.replace(/<\/main>/i,`${fallback}</main>`);
    }
  }
  return html;
};
