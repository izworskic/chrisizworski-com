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

function routePairs(){
  return BREAKOUT_SLUGS.flatMap(slug=>{
    const base=`/national-tools/${slug}`;
    const dest=`/synced-national-tools/${slug}/index.html`;
    return [[base,dest],[`${base}/`,dest]];
  });
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
