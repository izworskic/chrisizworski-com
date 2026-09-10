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

const AURORA_STATES=[
  ['Alaska','alaska','Fairbanks, the Interior, Denali, Anchorage, Nome and Southeast Alaska'],
  ['Minnesota','minnesota','Voyageurs, Ely, the Boundary Waters, North Shore, Bemidji and the Twin Cities'],
  ['North Dakota','north-dakota','the Turtle Mountains, Pembina, Minot, Devils Lake, the Badlands, Bismarck and Fargo'],
  ['Montana','montana','Glacier, the Flathead, Hi-Line, Fort Peck, Missoula, Bozeman and Billings'],
  ['Maine','maine','Allagash, Aroostook, Katahdin, Rangeley, Acadia, Bangor and southern Maine']
].map(([state,slug,places])=>{
  const url=`https://chrisizworski.com/national-tools/aurora/${slug}/`;
  return {
    state,slug,url,
    schemaName:`${state} Northern Lights Tonight: Live Aurora Forecast`,
    intent:`<li><a href="${url}">Check ${state} northern lights<span>Live NOAA aurora signal, Kp and solar wind combined with NWS clouds, darkness and moonlight across ${places}</span></a></li>`,
    library:`<article class="tool-card" data-search-card data-aurora-state="${slug}" data-tags="sky nature aurora northern lights ${state.toLowerCase()} noaa nws kp ovation night photography travel" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="tk">State aurora intelligence<span class="tk-season" hidden> / useful tonight</span></div><div class="tool-title"><a href="${url}">${state} Northern Lights Tonight</a></div><div class="tool-desc">A state-specific 0–100 viewing score, live NOAA aurora and solar-wind signals, local NWS cloud cover, darkness, moonlight, three-night context and regional viewing guidance. The score is a planning index, not a probability.</div></article>`
  };
});

const WILDLIFE_TOOLS=[PLATTE,MONARCH];
const ALL_TOOLS=[...WILDLIFE_TOOLS,...AURORA_STATES];

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
      for(const tool of ALL_TOOLS){
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
    const intent=`${start}${WILDLIFE_TOOLS.map(t=>t.intent).join('')}</ul></article>\n`;
    return html.slice(0,featureIndex)+intent+html.slice(featureIndex);
  }
  let endIndex=html.indexOf('</ul></article>',startIndex);
  if(endIndex<0) return html;
  for(const tool of WILDLIFE_TOOLS){
    const slice=html.slice(startIndex,endIndex);
    if(!slice.includes(tool.url)){
      html=html.slice(0,endIndex)+tool.intent+html.slice(endIndex);
      endIndex+=tool.intent.length;
    }
  }
  return html;
}

function ensureSkyIntent(html){
  const start='<article class="intent-card"><div class="intent-kicker">Sky</div><h3>Decide whether tonight is worth going out</h3><ul>';
  const startIndex=html.indexOf(start);
  if(startIndex<0) return html;
  let endIndex=html.indexOf('</ul></article>',startIndex);
  if(endIndex<0) return html;
  for(const tool of AURORA_STATES){
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
  for(const tool of [...WILDLIFE_TOOLS].reverse()){
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
    const section=`${start}<h2>Wildlife and migration tools</h2><p class="group-blurb">Specialist tools for timing major wildlife events using live conditions, official observations and historical seasonal context.</p><div class="tool-grid">${WILDLIFE_TOOLS.map(t=>t.library).join('')}</div></section>\n`;
    return html.slice(0,topicIndex)+section+html.slice(topicIndex);
  }
  let endIndex=html.indexOf('</div></section>',startIndex);
  if(endIndex<0) return html;
  for(const tool of WILDLIFE_TOOLS){
    const slice=html.slice(startIndex,endIndex);
    if(!slice.includes(tool.url)){
      html=html.slice(0,endIndex)+tool.library+html.slice(endIndex);
      endIndex+=tool.library.length;
    }
  }
  return html;
}

function ensureAuroraLibrary(html){
  const natureStart='<section class="library-group" data-library-group="nature">';
  let startIndex=html.indexOf(natureStart);
  if(startIndex>=0){
    let endIndex=html.indexOf('</div></section>',startIndex);
    if(endIndex<0) return html;
    for(const tool of AURORA_STATES){
      const slice=html.slice(startIndex,endIndex);
      if(!slice.includes(tool.url)){
        html=html.slice(0,endIndex)+tool.library+html.slice(endIndex);
        endIndex+=tool.library.length;
      }
    }
    return html;
  }
  const topicIndex=html.indexOf('<section class="topic-hubs"');
  if(topicIndex<0) return html;
  const section=`<section class="library-group" data-library-group="nature"><h2>Sky and seasonal nature tools</h2><p class="group-blurb">State-specific aurora tools keep NOAA space-weather potential separate from local clouds, darkness and moonlight.</p><div class="tool-grid">${AURORA_STATES.map(t=>t.library).join('')}</div></section>\n`;
  return html.slice(0,topicIndex)+section+html.slice(topicIndex);
}

function ensureWildlifeFilter(html){
  if(html.includes('data-filter="wildlife"')) return html;
  const autumn='<button class="chip" type="button" data-filter="fall">Autumn</button>';
  const index=html.indexOf(autumn);
  if(index<0) return html;
  const chip='<button class="chip" type="button" data-filter="wildlife">Wildlife</button>';
  return html.slice(0,index+autumn.length)+chip+html.slice(index+autumn.length);
}

module.exports=function injectNationalDiscoveryTools(input){
  let html=String(input||'');
  html=ensureSchema(html);
  html=ensureWildlifeIntent(html);
  html=ensureSkyIntent(html);
  html=ensureFeaturedCards(html);
  html=ensureWildlifeLibrary(html);
  html=ensureAuroraLibrary(html);
  html=ensureWildlifeFilter(html);

  for(const tool of WILDLIFE_TOOLS){
    if(!html.includes(`href="${tool.url}"`)){
      const fallback=`<section class="library-group" data-library-group="wildlife"><h2>Wildlife and migration tools</h2><div class="tool-grid">${tool.library}</div></section>`;
      html=html.replace(/<\/main>/i,`${fallback}</main>`);
    }
  }
  for(const tool of AURORA_STATES){
    if(!html.includes(`href="${tool.url}"`)){
      const fallback=`<section class="library-group" data-library-group="nature"><h2>State northern lights tools</h2><div class="tool-grid">${tool.library}</div></section>`;
      html=html.replace(/<\/main>/i,`${fallback}</main>`);
    }
  }
  return html;
};
