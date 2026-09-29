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
const KILAUEA_URL=`${CANONICAL_ORIGIN}/national-tools/kilauea-live/`;
const KILAUEA_NAME='Kīlauea Live';
const KILAUEA_PLACE='Hawaiʻi Volcanoes National Park · Hawaiʻi';
const KILAUEA_DECISION='Is Kīlauea worth going to right now, and which viewpoint fits the conditions?';

function routePairs(){
  return BREAKOUT_SLUGS.flatMap(slug=>{
    const base=`/national-tools/${slug}`;
    const dest=`/synced-national-tools/${slug}/index.html`;
    return [[base,dest],[`${base}/`,dest]];
  });
}

function syncKilaueaLiveDecisionDiscovery(targetRoot){
  const file=path.join(targetRoot,'public','synced-national-tools','live-decisions','index.html');
  if(!fs.existsSync(file)) throw new Error('Breakout sync: live decisions page missing');
  let html=fs.readFileSync(file,'utf8');
  const card=`<a class="decision-link-card" href="/national-tools/kilauea-live/"><span>${KILAUEA_PLACE}</span><strong>${KILAUEA_NAME}</strong><small>${KILAUEA_DECISION}</small></a>`;
  html=html.replace(/<a class="decision-link-card" href="\/national-tools\/kilauea-live\/">[\s\S]*?<\/a>/g,'');
  const hawaiiRe=/(<section class="decision-region"><div class="decision-region-head"><p class="eyebrow">Hawaii<\/p>[\s\S]*?<div class="decision-link-grid">)([\s\S]*?)(<\/div><\/section>)/;
  if(!hawaiiRe.test(html)) throw new Error('Breakout sync: Hawaii region missing from live decisions page');
  html=html.replace(hawaiiRe,(_,open,body,close)=>`${open}${body}${card}${close}`);

  const schemaRe=/<script type="application\/ld\+json">([\s\S]*?)<\/script>/;
  const match=html.match(schemaRe);
  if(!match) throw new Error('Breakout sync: live decisions JSON-LD missing');
  const schema=JSON.parse(match[1]);
  const graph=schema?.['@graph'];
  const list=graph?.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/live-decisions/#list');
  if(!list?.itemListElement) throw new Error('Breakout sync: live decisions ItemList missing');
  list.itemListElement=list.itemListElement.filter(x=>x.url!==KILAUEA_URL);
  list.itemListElement.push({'@type':'ListItem',position:0,url:KILAUEA_URL,name:KILAUEA_NAME});
  list.itemListElement.forEach((x,i)=>x.position=i+1);
  list.numberOfItems=list.itemListElement.length;
  const page=graph.find(x=>x?.['@id']==='https://chrisizworski.com/national-tools/live-decisions/#page');
  if(page) page.dateModified='2026-09-28';
  html=html.replace(match[0],`<script type="application/ld+json">${JSON.stringify(schema)}</script>`);
  if((html.match(/<a class="decision-link-card" href="\/national-tools\/kilauea-live\/">/g)||[]).length!==1) throw new Error('Breakout sync: Kilauea live decision card must be unique');
  fs.writeFileSync(file,html,'utf8');
}

function syncKilaueaSitemap(targetRoot){
  const file=path.join(targetRoot,'public','sitemap-breakout-live.xml');
  if(!fs.existsSync(file)) throw new Error('Breakout sync: breakout sitemap missing');
  let xml=fs.readFileSync(file,'utf8');
  xml=xml.replace(/\s*<url><loc>https:\/\/chrisizworski\.com\/national-tools\/kilauea-live\/<\/loc>[\s\S]*?<\/url>/g,'');
  const entry='  <url><loc>https://chrisizworski.com/national-tools/kilauea-live/</loc><lastmod>2026-09-28</lastmod><changefreq>hourly</changefreq><priority>1.0</priority></url>\n';
  if(!xml.includes('</urlset>')) throw new Error('Breakout sync: sitemap closing tag missing');
  xml=xml.replace('</urlset>',entry+'</urlset>');
  if((xml.match(/https:\/\/chrisizworski\.com\/national-tools\/kilauea-live\//g)||[]).length!==1) throw new Error('Breakout sync: Kilauea sitemap URL must be unique');
  fs.writeFileSync(file,xml,'utf8');
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

  syncKilaueaLiveDecisionDiscovery(targetRoot);
  syncKilaueaSitemap(targetRoot);

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
