import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORIGIN='https://chrisizworski.com';
const KILAUEA_URL=`${ORIGIN}/national-tools/kilauea-live/`;
const KILAUEA_NAME='Kīlauea Live';
const KILAUEA_IMAGE='https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/media/images/Image_-_2026-08-25T123538.343.jpg';
const MODIFIED='2026-09-28';

const KILAUEA_CARD='<article class="directory-card" data-search-card data-tool-id="kilauea-live" data-personas="trip conditions event volcano eruption viewing photography" data-tags="kilauea volcano hawaii hawaiʻi big island eruption lava halemaumau halemaʻumaʻu national park live viewing hvo nps weather vog air quality photography" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">Live volcano decision</span><span class="season-label" hidden>Useful now</span></div><h3>Kīlauea Live</h3><p class="place">Hawaiʻi Volcanoes National Park · Hawaiʻi</p><p class="description">See what Kīlauea is doing now, whether the view is worth the trip, the best viewing window, and which public viewpoint fits the current conditions.</p><p class="signals"><strong>Signals:</strong> USGS Hawaiian Volcano Observatory + NPS + NWS + Hawaiʻi DOH</p><div class="card-actions"><a class="primary-action" href="/national-tools/kilauea-live/">Is Kīlauea worth going to right now? &rarr;</a></div></article>';

const HAWAII_SECTION=`<section class="catalog-group region-cluster" data-catalog-group id="region-hawaii-pacific" aria-labelledby="region-hawaii-pacific-title"><div class="catalog-head"><div><p class="eyebrow">Regional collection</p><h2 id="region-hawaii-pacific-title">Hawaiʻi &amp; Pacific</h2></div><p>Island trips where volcanic activity, access, visibility and weather can change the decision by the hour. Start with the current evidence before committing the drive.</p></div><div class="catalog-grid">\n${KILAUEA_CARD}\n</div></section>\n`;

const FEATURE='<p class="kilauea-feature"><strong>Hawaiʻi right now:</strong> <a href="/national-tools/kilauea-live/">Kīlauea Live</a> combines the newest USGS HVO activity report with park access, summit weather, air evidence and viewpoint tradeoffs to answer whether the trip is worth making now.</p>';

function parseSchema(html){
  const match=html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  if(!match) throw new Error('Kilauea guard: JSON-LD block missing');
  return {match,schema:JSON.parse(match[1])};
}

function replaceSchema(html,match,schema){
  return html.replace(match[0],`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
}

export function ensureKilaueaDirectory(targetRoot=process.cwd()){
  const file=path.join(targetRoot,'public','synced-national-tools','index.html');
  if(!fs.existsSync(file)) throw new Error('Kilauea guard: synced national directory missing');
  let html=fs.readFileSync(file,'utf8');

  html=html.replace(/<article class="directory-card"[^>]*data-tool-id="kilauea-live"[\s\S]*?<\/article>\s*/g,'');
  html=html.replace(/<section class="catalog-group region-cluster"[^>]*id="region-hawaii-pacific"[\s\S]*?<\/section>\s*/g,'');
  html=html.replace(/<p class="kilauea-feature">[\s\S]*?<\/p>\s*/g,'');

  const seasonTitle='<h2 id="season-now-title">Which conditions could change your plan?</h2>';
  if(!html.includes(seasonTitle)) throw new Error('Kilauea guard: season-now anchor missing');
  html=html.replace(seasonTitle,seasonTitle+FEATURE);

  const pnw='<section class="catalog-group region-cluster" data-catalog-group id="region-pacific-northwest"';
  if(!html.includes(pnw)) throw new Error('Kilauea guard: Pacific Northwest anchor missing');
  html=html.replace(pnw,HAWAII_SECTION+pnw);

  const {match,schema}=parseSchema(html);
  const graph=schema?.['@graph'];
  const list=graph?.find(x=>x?.['@id']===`${ORIGIN}/national-tools/#toollist`);
  if(!list?.itemListElement) throw new Error('Kilauea guard: national ItemList missing');
  list.itemListElement=list.itemListElement.filter(x=>x.url!==KILAUEA_URL);
  const after=list.itemListElement.findIndex(x=>/Yosemite Firefall/i.test(x.name||''));
  const entry={'@type':'ListItem',position:0,url:KILAUEA_URL,name:KILAUEA_NAME};
  if(after>=0) list.itemListElement.splice(after+1,0,entry); else list.itemListElement.push(entry);
  list.itemListElement.forEach((x,i)=>x.position=i+1);
  list.numberOfItems=list.itemListElement.length;
  const page=graph.find(x=>x?.['@id']===`${ORIGIN}/national-tools/#page`);
  if(page) page.dateModified=MODIFIED;
  html=replaceSchema(html,match,schema);

  const count=(html.match(/data-search-card/g)||[]).length;
  html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,`$1${count} tools shown$2`);

  if((html.match(/data-tool-id="kilauea-live"/g)||[]).length!==1) throw new Error('Kilauea guard: Kilauea card must be unique');
  if((html.match(/id="region-hawaii-pacific"/g)||[]).length!==1) throw new Error('Kilauea guard: Hawaiʻi & Pacific section must be unique');
  const national=html.match(/<section class="catalog-group national-utilities"[\s\S]*?<\/section>/)?.[0]||'';
  if(national.includes('data-tool-id="kilauea-live"')) throw new Error('Kilauea guard: Kilauea must not be in national utilities');
  if(html.indexOf('id="region-hawaii-pacific"')>html.indexOf('id="region-pacific-northwest"')) throw new Error('Kilauea guard: Hawaiʻi placement invalid');

  fs.writeFileSync(file,html,'utf8');
  return {cards:count};
}

function setMetaName(html,name,content){
  const tag=`<meta name="${name}" content="${content}">`;
  const re=new RegExp(`<meta\\s+name="${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"\\s+content="[^"]*"\\s*\\/?>`,'i');
  return re.test(html)?html.replace(re,tag):html.replace('</head>',tag+'\n</head>');
}

function setMetaProperty(html,property,content){
  const tag=`<meta property="${property}" content="${content}">`;
  const re=new RegExp(`<meta\\s+property="${property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"\\s+content="[^"]*"\\s*\\/?>`,'i');
  return re.test(html)?html.replace(re,tag):html.replace('</head>',tag+'\n</head>');
}

export function ensureKilaueaMeta(targetRoot=process.cwd()){
  const file=path.join(targetRoot,'public','synced-national-tools','kilauea-live','index.html');
  if(!fs.existsSync(file)) throw new Error('Kilauea guard: Kilauea page missing');
  let html=fs.readFileSync(file,'utf8');
  const title='Kīlauea Eruption Live: Is It Worth Going Right Now?';
  const description='See what Kīlauea is doing now, whether the view is worth the trip, the best viewing window, and which Hawaiʻi Volcanoes National Park viewpoint fits.';
  const socialDescription='Current Kīlauea activity, park access, summit weather and air evidence translated into a practical viewing decision.';
  const alt='Visitors watch Kīlauea lava fountaining at Hawaiʻi Volcanoes National Park; USGS Hawaiian Volcano Observatory photo.';

  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${title}</title>`);
  html=setMetaName(html,'description',description);
  html=setMetaName(html,'robots','index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1');
  html=setMetaName(html,'author','Chris Izworski');
  html=setMetaName(html,'keywords','Kīlauea live, Kīlauea eruption, Kīlauea viewing, Hawaiʻi Volcanoes National Park, Halemaʻumaʻu, lava viewing');
  html=setMetaName(html,'twitter:card','summary_large_image');
  html=setMetaName(html,'twitter:title',title);
  html=setMetaName(html,'twitter:description',socialDescription);
  html=setMetaName(html,'twitter:image',KILAUEA_IMAGE);
  html=setMetaName(html,'twitter:image:alt',alt);
  html=setMetaProperty(html,'og:type','website');
  html=setMetaProperty(html,'og:site_name','Chris Izworski');
  html=setMetaProperty(html,'og:locale','en_US');
  html=setMetaProperty(html,'og:title',title);
  html=setMetaProperty(html,'og:description',socialDescription);
  html=setMetaProperty(html,'og:url',KILAUEA_URL);
  html=setMetaProperty(html,'og:image',KILAUEA_IMAGE);
  html=setMetaProperty(html,'og:image:secure_url',KILAUEA_IMAGE);
  html=setMetaProperty(html,'og:image:type','image/jpeg');
  html=setMetaProperty(html,'og:image:width','1000');
  html=setMetaProperty(html,'og:image:height','750');
  html=setMetaProperty(html,'og:image:alt',alt);
  html=setMetaProperty(html,'og:updated_time',MODIFIED);

  const {match,schema}=parseSchema(html);
  const graph=Array.isArray(schema?.['@graph'])?schema['@graph']:[];
  const page=graph.find(x=>x?.['@id']===KILAUEA_URL);
  if(!page) throw new Error('Kilauea guard: WebPage schema node missing');
  Object.assign(page,{
    name:title,
    headline:title,
    description,
    dateModified:MODIFIED,
    inLanguage:'en-US',
    keywords:['Kīlauea live','Kīlauea eruption','Kīlauea viewing','Hawaiʻi Volcanoes National Park','Halemaʻumaʻu','lava viewing'],
    primaryImageOfPage:{'@id':`${KILAUEA_URL}#primaryimage`},
    image:{'@id':`${KILAUEA_URL}#primaryimage`},
    mainEntity:{'@id':`${KILAUEA_URL}#app`},
    about:[{'@type':'Thing','name':'Kīlauea volcano'},{'@type':'Place','name':'Hawaiʻi Volcanoes National Park'}]
  });
  const retained=graph.filter(x=>![`${KILAUEA_URL}#primaryimage`,`${KILAUEA_URL}#app`,`${KILAUEA_URL}#breadcrumb`].includes(x?.['@id']));
  retained.push(
    {'@type':'ImageObject','@id':`${KILAUEA_URL}#primaryimage`,url:KILAUEA_IMAGE,contentUrl:KILAUEA_IMAGE,width:1000,height:750,caption:alt,creditText:'USGS Hawaiian Volcano Observatory — public domain'},
    {'@type':'WebApplication','@id':`${KILAUEA_URL}#app`,name:'Kīlauea Live',url:KILAUEA_URL,applicationCategory:'TravelApplication',operatingSystem:'Any',isAccessibleForFree:true,description:'A live visitor decision tool combining official Kīlauea activity, park access, summit weather, air context and viewpoint fit.'},
    {'@type':'BreadcrumbList','@id':`${KILAUEA_URL}#breadcrumb`,itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:`${ORIGIN}/`},
      {'@type':'ListItem',position:2,name:'U.S. Outdoor Tools',item:`${ORIGIN}/national-tools/`},
      {'@type':'ListItem',position:3,name:'Hawaiʻi & Pacific',item:`${ORIGIN}/national-tools/#region-hawaii-pacific`},
      {'@type':'ListItem',position:4,name:'Kīlauea Live',item:KILAUEA_URL}
    ]}
  );
  schema['@graph']=retained;
  html=replaceSchema(html,match,schema);

  if(!html.includes('twitter:card" content="summary_large_image"')) throw new Error('Kilauea guard: large Twitter card missing');
  if(!html.includes('og:image')) throw new Error('Kilauea guard: Open Graph image missing');
  if((html.match(/<meta property="og:title"/g)||[]).length!==1) throw new Error('Kilauea guard: og:title must be unique');
  if((html.match(/<meta name="twitter:card"/g)||[]).length!==1) throw new Error('Kilauea guard: twitter:card must be unique');

  fs.writeFileSync(file,html,'utf8');
  return {title,description,image:KILAUEA_IMAGE};
}

export function ensureKilaueaDiscovery(targetRoot=process.cwd()){
  return {directory:ensureKilaueaDirectory(targetRoot),meta:ensureKilaueaMeta(targetRoot)};
}

const invoked=fileURLToPath(import.meta.url)===path.resolve(process.argv[1]||'');
if(invoked){
  const root=path.resolve(process.argv[2]||process.cwd());
  const result=ensureKilaueaDiscovery(root);
  console.log(`Kilauea discovery guard complete | cards=${result.directory.cards} | twitter=summary_large_image | region=Hawaii-Pacific`);
}
