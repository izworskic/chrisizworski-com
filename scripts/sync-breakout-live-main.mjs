import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const BREAKOUT_SLUGS = [
  'live-decisions',
  'zion-narrows-conditions',
  'grand-canyon-access',
  'going-to-the-sun-road-status',
  'haleakala-sunrise',
  'yellowstone-road-status',
  'tioga-road-status',
  'cadillac-mountain-sunrise',
  'mount-rainier-road-status',
  'lake-mead-access',
  'lake-powell-ramp-status'
];

const TOOL_SLUGS=BREAKOUT_SLUGS.filter(x=>x!=='live-decisions');
const CANONICAL_ORIGIN='https://chrisizworski.com';
const GA4='G-Y5D2V2W7HN';
const ADSENSE='ca-pub-8222782620788075';
const DIRECTORY_URL=`${CANONICAL_ORIGIN}/national-tools/live-decisions/`;
const DIRECTORY_NAME='Live Trip Decisions';

function routePairs(){
  return BREAKOUT_SLUGS.flatMap(slug=>{
    const base=`/national-tools/${slug}`;
    const dest=`/synced-national-tools/${slug}/index.html`;
    return [[base,dest],[`${base}/`,dest]];
  });
}

function syncDirectoryDiscovery(targetRoot){
  const file=path.join(targetRoot,'public','synced-national-tools','index.html');
  if(!fs.existsSync(file)) throw new Error('Breakout sync: synced national directory missing');
  let html=fs.readFileSync(file,'utf8');
  const card='<article class="directory-card" data-search-card data-tool-id="live-decisions" data-personas="trip conditions event" data-tags="live trip decisions national parks road status sunrise river lake access current conditions zion glacier yellowstone yosemite rainier grand canyon haleakala acadia lake mead lake powell" data-months="1,2,3,4,5,6,7,8,9,10,11,12"><div class="card-top"><span class="kind">Live decision collection</span><span class="season-label" hidden>Useful now</span></div><h3>Live Trip Decisions</h3><p class="place">Ten destination decisions · United States</p><p class="description">Roads close, rivers rise, clouds erase sunrises and low water changes access. Open the destination-specific live tool that answers the decision before you commit the drive.</p><p class="signals"><strong>Signals:</strong> NPS + USGS + NWS + Bureau of Reclamation source-backed checks</p><div class="card-actions"><a class="primary-action" href="/national-tools/live-decisions/">Open live trip decisions &rarr;</a></div></article>';
  html=html.replace(/<article class="directory-card"[^>]*data-tool-id="live-decisions"[\s\S]*?<\/article>\s*/g,'');
  const section=html.indexOf('<section class="catalog-group national-utilities"');
  if(section<0) throw new Error('Breakout sync: national utilities section missing');
  const grid=html.indexOf('<div class="catalog-grid">',section);
  if(grid<0) throw new Error('Breakout sync: national utilities grid missing');
  const insert=grid+'<div class="catalog-grid">'.length;
  html=html.slice(0,insert)+'\n'+card+html.slice(insert);

  const schemaRe=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match=html.match(schemaRe);
  if(!match) throw new Error('Breakout sync: national directory JSON-LD missing');
  const schema=JSON.parse(match[1]);
  const graph=schema?.['@graph'];
  const list=graph?.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#toollist');
  if(!list?.itemListElement) throw new Error('Breakout sync: national directory ItemList missing');
  list.itemListElement=list.itemListElement.filter(x=>x.url!==DIRECTORY_URL);
  list.itemListElement.unshift({'@type':'ListItem',position:1,url:DIRECTORY_URL,name:DIRECTORY_NAME});
  list.itemListElement.forEach((x,i)=>x.position=i+1);
  list.numberOfItems=list.itemListElement.length;
  const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/#page');
  if(page) page.dateModified='2026-09-28';
  html=html.replace(match[0],`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  const count=(html.match(/data-search-card/g)||[]).length;
  html=html.replace(/(<p class="finder-count" id="finder-count" aria-live="polite">)\d+ tools shown(<\/p>)/,`$1${count} tools shown$2`);
  if((html.match(/data-tool-id="live-decisions"/g)||[]).length!==1) throw new Error('Breakout sync: live decisions card must be unique');
  fs.writeFileSync(file,html,'utf8');
}

export function installBreakoutLive(coreDir,targetRoot){
  const cfgPath=path.join(coreDir,'config','breakout-live-pages.json');
  if(!fs.existsSync(cfgPath)) throw new Error('Breakout sync: core config missing');
  const cfg=JSON.parse(fs.readFileSync(cfgPath,'utf8'));
  const ids=Object.keys(cfg).sort();
  const expected=[...TOOL_SLUGS].sort();
  if(JSON.stringify(ids)!==JSON.stringify(expected)) throw new Error(`Breakout sync: core portfolio mismatch: ${ids.join(', ')}`);

  for(const slug of BREAKOUT_SLUGS){
    const src=path.join(coreDir,'public','national-tools',slug,'index.html');
    if(!fs.existsSync(src)) throw new Error(`Breakout sync: generated page missing for ${slug}`);
    const html=fs.readFileSync(src,'utf8');
    const canonical=`${CANONICAL_ORIGIN}/national-tools/${slug}/`;
    if(!html.includes(canonical)) throw new Error(`Breakout sync: canonical mismatch for ${slug}`);
    if(!html.includes(GA4)) throw new Error(`Breakout sync: GA4 missing for ${slug}`);
    if(!html.includes(ADSENSE)) throw new Error(`Breakout sync: AdSense missing for ${slug}`);
    const outDir=path.join(targetRoot,'public','synced-national-tools',slug);
    fs.mkdirSync(outDir,{recursive:true});
    fs.writeFileSync(path.join(outDir,'index.html'),html,'utf8');
  }

  syncDirectoryDiscovery(targetRoot);

  const vercelPath=path.join(targetRoot,'vercel.json');
  const v=JSON.parse(fs.readFileSync(vercelPath,'utf8'));
  v.rewrites ||= [];
  const pairs=routePairs();
  const sources=new Set(pairs.map(([source])=>source));
  v.rewrites=v.rewrites.filter(r=>!sources.has(r.source));
  const catchAll=v.rewrites.findIndex(r=>r.source==='/national-tools/:path*');
  if(catchAll<0) throw new Error('Breakout sync: national-tools catch-all missing');
  v.rewrites.splice(catchAll,0,...pairs.map(([source,destination])=>({source,destination})));

  const finalCatch=v.rewrites.findIndex(r=>r.source==='/national-tools/:path*');
  for(const [source,destination] of pairs){
    const matches=v.rewrites.filter(r=>r.source===source);
    if(matches.length!==1||matches[0].destination!==destination) throw new Error(`Breakout sync: route mismatch for ${source}`);
    if(v.rewrites.findIndex(r=>r.source===source)>=finalCatch) throw new Error(`Breakout sync: ${source} does not precede catch-all`);
  }
  fs.writeFileSync(vercelPath,JSON.stringify(v,null,2)+'\n');
  return {pages:BREAKOUT_SLUGS.length,routes:pairs.length};
}

const invoked=fileURLToPath(import.meta.url)===path.resolve(process.argv[1]||'');
if(invoked){
  const coreDir=process.argv[2];
  const targetRoot=process.argv[3]||process.cwd();
  if(!coreDir) throw new Error('Usage: node scripts/sync-breakout-live-main.mjs <core-dir> [target-root]');
  const result=installBreakoutLive(path.resolve(coreDir),path.resolve(targetRoot));
  console.log(`Breakout live main sync complete | pages=${result.pages} | routes=${result.routes}`);
}
