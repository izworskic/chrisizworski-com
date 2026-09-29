import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KILAUEA_URL='https://chrisizworski.com/national-tools/kilauea-live/';
const KILAUEA_NAME='Kīlauea Live';
const KILAUEA_IMAGE='https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/s3fs-public/media/images/Image_-_2026-08-25T123538.343.jpg';
const MODIFIED='2026-09-28';
const TITLE='Kīlauea Live: Should You Go Now? | Chris Izworski';
const SOCIAL_TITLE='Kīlauea Live: Should You Go Now?';
const DESCRIPTION='Check Kīlauea eruption activity, Hawaiʻi Volcanoes National Park access, summit weather, air conditions and the best public viewpoint before you drive.';
const SOCIAL_DESCRIPTION='Current USGS HVO activity, park access, summit weather and air conditions translated into a practical Kīlauea viewing decision.';
const IMAGE_ALT='Visitors watch Kīlauea lava fountaining at Hawaiʻi Volcanoes National Park. USGS Hawaiian Volcano Observatory public-domain photo.';

const KILAUEA_CARD='<article class="directory-card" data-search-card data-tool-id="kilauea-live" data-personas="trip conditions event volcano eruption viewing photography" data-tags="kilauea volcano hawaii hawaiʻi big island eruption lava halemaumau halemaʻumaʻu national park live viewing hvo nps weather vog air photography" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">Live volcano decision</span><span class="season-label" hidden>Useful now</span></div><h3>Kīlauea Live</h3><p class="place">Hawaiʻi Volcanoes National Park · Hawaiʻi</p><p class="description">See what Kīlauea is doing now, whether the view is worth the trip, the best viewing window, and which public viewpoint fits current conditions.</p><p class="signals"><strong>Signals:</strong> USGS Hawaiian Volcano Observatory + NPS + NWS + Hawaiʻi DOH</p><div class="card-actions"><a class="primary-action" href="/national-tools/kilauea-live/">Is Kīlauea worth going right now? &rarr;</a></div></article>';

function parseSchema(html,label='page'){
  const re=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match=html.match(re);
  if(!match) throw new Error(`Kilauea guard: ${label} JSON-LD block missing`);
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

  const hawaiiRe=/(<section class="catalog-group region-cluster"[^>]*id="region-hawaii"[^>]*>[\s\S]*?<div class="catalog-grid">)([\s\S]*?)(<\/div><\/section>)/;
  if(!hawaiiRe.test(html)) throw new Error('Kilauea guard: Hawaii regional section missing');
  html=html.replace(hawaiiRe,(_,open,body,close)=>`${open}${body.trimEnd()}\n${KILAUEA_CARD}\n${close}`);

  const {match,schema}=parseSchema(html,'directory');
  const graph=schema?.['@graph'];
  const list=graph?.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
  if(!list?.itemListElement) throw new Error('Kilauea guard: national ItemList missing');
  list.itemListElement=list.itemListElement.filter(x=>x.url!==KILAUEA_URL);
  const hawaiiAnchor=list.itemListElement.findIndex(x=>String(x.url||'').includes('/haleakala-sunrise/')||/Haleakal/i.test(String(x.name||'')));
  const entry={'@type':'ListItem',position:0,url:KILAUEA_URL,name:KILAUEA_NAME};
  if(hawaiiAnchor>=0) list.itemListElement.splice(hawaiiAnchor+1,0,entry); else list.itemListElement.push(entry);
  list.itemListElement.forEach((x,i)=>x.position=i+1);
  list.numberOfItems=list.itemListElement.length;
  const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
  if(page) page.dateModified=MODIFIED;
  html=replaceSchema(html,match,schema);

  const count=(html.match(/data-search-card/g)||[]).length;
  html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,`$1${count} tools shown$2`);

  if((html.match(/data-tool-id="kilauea-live"/g)||[]).length!==1) throw new Error('Kilauea guard: Kilauea directory card must be unique');
  const hawaii=html.match(/<section class="catalog-group region-cluster"[^>]*id="region-hawaii"[\s\S]*?<\/section>/)?.[0]||'';
  if(!hawaii.includes('data-tool-id="kilauea-live"')) throw new Error('Kilauea guard: Kilauea must be inside Hawaii region');
  fs.writeFileSync(file,html,'utf8');
  return {cards:count};
}

function setMetaName(html,name,content,anchor){
  const tag=`<meta name="${name}" content="${content}">`;
  const escaped=name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`<meta\\s+name="${escaped}"\\s+content="[^"]*"\\s*\\/?>`,'i');
  return re.test(html)?html.replace(re,tag):html.replace(anchor,anchor+'\n'+tag);
}

function setMetaProperty(html,property,content,anchor){
  const tag=`<meta property="${property}" content="${content}">`;
  const escaped=property.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const re=new RegExp(`<meta\\s+property="${escaped}"\\s+content="[^"]*"\\s*\\/?>`,'i');
  return re.test(html)?html.replace(re,tag):html.replace(anchor,anchor+'\n'+tag);
}

export function ensureKilaueaMeta(targetRoot=process.cwd()){
  const file=path.join(targetRoot,'public','synced-national-tools','kilauea-live','index.html');
  if(!fs.existsSync(file)) throw new Error('Kilauea guard: Kilauea page missing');
  let html=fs.readFileSync(file,'utf8');
  const canonical='<link rel="canonical" href="https://chrisizworski.com/national-tools/kilauea-live/">';
  if(!html.includes(canonical)) throw new Error('Kilauea guard: canonical missing');

  html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${TITLE}</title>`);
  html=setMetaName(html,'description',DESCRIPTION,canonical);
  html=setMetaName(html,'author','Chris Izworski',canonical);
  html=setMetaName(html,'twitter:card','summary_large_image',canonical);
  html=setMetaName(html,'twitter:title',SOCIAL_TITLE,canonical);
  html=setMetaName(html,'twitter:description',SOCIAL_DESCRIPTION,canonical);
  html=setMetaName(html,'twitter:image',KILAUEA_IMAGE,canonical);
  html=setMetaName(html,'twitter:image:alt',IMAGE_ALT,canonical);
  html=setMetaProperty(html,'og:type','website',canonical);
  html=setMetaProperty(html,'og:site_name','Chris Izworski',canonical);
  html=setMetaProperty(html,'og:locale','en_US',canonical);
  html=setMetaProperty(html,'og:title',SOCIAL_TITLE,canonical);
  html=setMetaProperty(html,'og:description',SOCIAL_DESCRIPTION,canonical);
  html=setMetaProperty(html,'og:url',KILAUEA_URL,canonical);
  html=setMetaProperty(html,'og:image',KILAUEA_IMAGE,canonical);
  html=setMetaProperty(html,'og:image:secure_url',KILAUEA_IMAGE,canonical);
  html=setMetaProperty(html,'og:image:type','image/jpeg',canonical);
  html=setMetaProperty(html,'og:image:width','1000',canonical);
  html=setMetaProperty(html,'og:image:height','750',canonical);
  html=setMetaProperty(html,'og:image:alt',IMAGE_ALT,canonical);

  const {match,schema}=parseSchema(html,'Kilauea');
  const graph=Array.isArray(schema?.['@graph'])?schema['@graph']:[];
  const page=graph.find(x=>x?.['@id']===KILAUEA_URL);
  if(!page) throw new Error('Kilauea guard: WebPage schema node missing');
  Object.assign(page,{
    name:SOCIAL_TITLE,
    headline:'Is Kīlauea worth going to right now?',
    description:DESCRIPTION,
    dateModified:MODIFIED,
    primaryImageOfPage:{'@id':`${KILAUEA_URL}#primaryimage`},
    mainEntity:{'@id':`${KILAUEA_URL}#app`}
  });
  const retained=graph.filter(x=>![`${KILAUEA_URL}#primaryimage`,`${KILAUEA_URL}#app`,`${KILAUEA_URL}#breadcrumb`].includes(x?.['@id']));
  retained.push(
    {'@type':'ImageObject','@id':`${KILAUEA_URL}#primaryimage`,url:KILAUEA_IMAGE,contentUrl:KILAUEA_IMAGE,width:1000,height:750,caption:IMAGE_ALT,creditText:'USGS Hawaiian Volcano Observatory · Public Domain'},
    {'@type':'WebApplication','@id':`${KILAUEA_URL}#app`,name:'Kīlauea Live',url:KILAUEA_URL,applicationCategory:'TravelApplication',operatingSystem:'Any',isAccessibleForFree:true,description:'A live visitor decision tool using official eruption status, park access, summit weather, air context and viewpoint fit.'},
    {'@type':'BreadcrumbList','@id':`${KILAUEA_URL}#breadcrumb`,itemListElement:[
      {'@type':'ListItem',position:1,name:'Home',item:'https://chrisizworski.com/'},
      {'@type':'ListItem',position:2,name:'U.S. Outdoor Tools',item:'https://chrisizworski.com/national-tools/'},
      {'@type':'ListItem',position:3,name:'Hawaii',item:'https://chrisizworski.com/national-tools/#region-hawaii'},
      {'@type':'ListItem',position:4,name:'Kīlauea Live',item:KILAUEA_URL}
    ]}
  );
  schema['@graph']=retained;
  html=replaceSchema(html,match,schema);

  if(TITLE.length>60) throw new Error(`Kilauea guard: title too long (${TITLE.length})`);
  if(!html.includes('twitter:card" content="summary_large_image"')) throw new Error('Kilauea guard: large social card missing');
  if((html.match(/<meta property="og:title"/g)||[]).length!==1) throw new Error('Kilauea guard: og:title must be unique');
  fs.writeFileSync(file,html,'utf8');
  return {title:TITLE,description:DESCRIPTION,image:KILAUEA_IMAGE};
}

export function ensureKilaueaDiscovery(targetRoot=process.cwd()){
  return {directory:ensureKilaueaDirectory(targetRoot),meta:ensureKilaueaMeta(targetRoot)};
}

const invoked=fileURLToPath(import.meta.url)===path.resolve(process.argv[1]||'');
if(invoked){
  const root=path.resolve(process.argv[2]||process.cwd());
  const result=ensureKilaueaDiscovery(root);
  console.log(`Kilauea discovery guard complete | cards=${result.directory.cards} | title=${result.meta.title.length} chars | region=Hawaii`);
}
