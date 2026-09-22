#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=rel=>readFile(path.join(root,rel),'utf8');
const ledger=JSON.parse(await read('benchmarks/detroit-discovery-observation.json'));
const registry=JSON.parse(await read('benchmarks/tool-network-registry.json'));
const actions=JSON.parse(await read('benchmarks/tool-network-actions.json'));
const sitemap=await read('public/sitemap.xml');
const llms=await read('public/llms.txt');

const cluster=ledger.cluster||[];
const snapshots=ledger.snapshots||[];
const latest=snapshots.at(-1)||null;
const previousComparable=latest
  ? [...snapshots].slice(0,-1).reverse().find(s=>s.window?.type===latest.window?.type)
  : null;

const pct=n=>Number.isFinite(n)?(n*100).toFixed(2)+'%':'n/a';
const delta=(a,b)=>Number.isFinite(a)&&Number.isFinite(b)&&b!==0?(a-b)/b:null;
const sum=(rows,key)=>rows.reduce((n,r)=>n+Number(r?.[key]||0),0);

function familyFor(query){
  const q=String(query||'').toLowerCase();
  if(!q)return 'unknown';
  if(/freighter|ship|vessel/.test(q)&&/detroit|river/.test(q))return 'freighter';
  if(/bird|birding|migration/.test(q)&&/detroit|southeast michigan|belle isle/.test(q))return 'birding';
  if(/lake st\.? clair|paddl|water condition|wave|buoy/.test(q)&&/clair|detroit|metro/.test(q))return 'lake-st-clair-water';
  if(/sunset|golden hour/.test(q)&&/detroit|riverfront|belle isle/.test(q))return 'sunset';
  if(/things to do|outdoor|outside/.test(q)&&/detroit|southeast michigan/.test(q))return 'broad-detroit';
  return 'emerging-other';
}
function queryRows(snapshot){
  return snapshot?.detroitCluster?.queries||[];
}
function familySummary(snapshot){
  const out={};
  for(const row of queryRows(snapshot)){
    const family=row.family||familyFor(row.query);
    out[family]??={queries:0,impressions:0,clicks:0};
    out[family].queries+=1;
    out[family].impressions+=Number(row.impressions||0);
    out[family].clicks+=Number(row.clicks||0);
  }
  return out;
}
const currentFamilies=familySummary(latest);
const priorFamilies=familySummary(previousComparable);
const newFamilies=Object.keys(currentFamilies).filter(k=>k!=='emerging-other'&&!priorFamilies[k]);
const emergingOther=queryRows(latest)
  .filter(r=>(r.family||familyFor(r.query))==='emerging-other')
  .sort((a,b)=>Number(b.impressions||0)-Number(a.impressions||0));

const toolIds=new Set((registry.tools||[]).map(t=>t.id));
const missingRegistry=cluster.filter(c=>!toolIds.has(c.id)).map(c=>c.id);
const missingSitemap=cluster.filter(c=>!sitemap.includes('<loc>'+c.url+'</loc>')).map(c=>c.url);
const missingLlms=cluster.filter(c=>!llms.includes(c.url)).map(c=>c.url);
const observation=(actions.observationPrograms||[]).find(x=>x.id==='detroit-discovery-pilot-v1');
const earliest=observation?.earliestExpansionReview||ledger.earliestExpansionReview;
const today=new Date().toISOString().slice(0,10);
const reviewOpen=Boolean(earliest&&today>=earliest);

const pageRows=Object.entries(latest?.detroitCluster?.pages||{}).map(([url,v])=>({url,...v}));
const positionOpportunities=pageRows.filter(r=>Number(r.impressions||0)>0&&Number(r.position||0)>=4&&Number(r.position||0)<=15);
const clusterImpressions=Number(latest?.detroitCluster?.impressions ?? sum(pageRows,'impressions'));
const clusterClicks=Number(latest?.detroitCluster?.clicks ?? sum(pageRows,'clicks'));
const clusterCtr=clusterImpressions?clusterClicks/clusterImpressions:null;
const ga4=latest?.ga4||{};
const exposure=Number.isFinite(Number(ga4.networkExposures))?Number(ga4.networkExposures):null;
const networkOpens=Number.isFinite(Number(ga4.networkOpens))?Number(ga4.networkOpens):null;
const handoffRate=exposure&&networkOpens!==null?networkOpens/exposure:null;

let status='OBSERVE';
let reason='The five-page cluster is still inside its first observation window.';
if(reviewOpen){
  if(emergingOther.some(r=>Number(r.impressions||0)>=20)){
    status='REVIEW_QUERY_GAP';
    reason='At least one unowned query pattern has enough impressions to inspect, but it still must pass distinct-intent and downstream-value review before a new canonical exists.';
  }else{
    status='STRENGTHEN_EXISTING';
    reason='The review gate is open, but current evidence does not justify another Detroit canonical.';
  }
}

console.log('\nDETROIT DISCOVERY PILOT');
console.log('='.repeat(72));
console.log('Status:',status);
console.log('Reason:',reason);
console.log('Observation start:',ledger.launchDate,'· earliest expansion review:',earliest||'unknown');
if(latest){
  console.log('Latest snapshot:',latest.id,'·',latest.window?.type,latest.window?.start+' → '+latest.window?.end);
  console.log('Detroit cluster:',clusterImpressions,'impressions ·',clusterClicks,'clicks · CTR',pct(clusterCtr));
  console.log('Pages with impressions:',latest.detroitCluster?.pagesWithImpressions??pageRows.filter(r=>Number(r.impressions||0)>0).length);
  console.log('Pages with clicks:',latest.detroitCluster?.pagesWithClicks??pageRows.filter(r=>Number(r.clicks||0)>0).length);
  if(previousComparable){
    const a=latest.site||{},b=previousComparable.site||{};
    console.log('Comparable site delta:',{
      impressions:delta(Number(a.impressions),Number(b.impressions)),
      clicks:delta(Number(a.clicks),Number(b.clicks))
    });
  }
}
console.log('Query families:',currentFamilies);
console.log('New owned families in latest comparable window:',newFamilies);
console.log('Position 4–15 Detroit opportunities:',positionOpportunities.map(r=>({url:r.url,impressions:r.impressions,position:r.position,ctr:r.ctr})));
console.log('Unowned/emerging queries:',emergingOther.slice(0,10).map(r=>({query:r.query,impressions:r.impressions,clicks:r.clicks,position:r.position})));
console.log('Network handoff rate:',handoffRate===null?'not yet loaded':pct(handoffRate));
console.log('Governance checks:',{
  missingRegistry,
  missingSitemap,
  missingLlms,
  observationProgram:Boolean(observation)
});

const fatal=[
  ...missingRegistry.map(x=>'registry:'+x),
  ...missingSitemap.map(x=>'sitemap:'+x),
  ...missingLlms.map(x=>'llms:'+x),
  ...(!observation?['observation-program:missing']:[])
];
if(process.argv.includes('--check')){
  if(fatal.length){
    console.error('report:detroit-discovery FAIL',fatal);
    process.exitCode=1;
  }else{
    console.log('report:detroit-discovery PASS');
  }
}
