#!/usr/bin/env node
// Source-research priority, never visitor-access permission.
import fs from 'node:fs';
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const curated=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const PINNED=[160,166,135,45,46,91,95,96,190,191,192,213,198,199,88,110,119,154,215,150,151];
function priority(candidate){
const i=PINNED.indexOf(candidate.gisObjectId),started=!!(candidate.evidenceReviewed||candidate.sourceLinks?.length||candidate.accessRouteAudit),blocked=candidate.publicationEligible===false&&!!candidate.outstandingGate;
const generic=/^(upper|lower|middle|first|second|little|big) falls$/i.test(candidate.name),hazard=/dam|peavy|quinnesec|power house|hydro/i.test(candidate.name);
const tier=blocked?"awaiting-new-official-evidence":started?"needs-complete-source-gate":"needs-source-discovery";
const bonus=!blocked&&i>=0?Math.max(0,30-i):0;
const points=(blocked?0:started?95:110)+bonus+(started?Math.min(12,candidate.sourceLinks?.length||0):0)-(generic?15:0)-(hazard?8:0);
const reason=blocked?"Prior audit blocks public access; reconsider only with NEW owner, parking or footpath evidence":started?"Source research partly completed; finish full visitor rights and arrival gate":"New research lead; discover owner, trailhead and public parking";
return {points,tier,reason};
}
function generate(ledger,curated){
const pending=ledger.candidates.filter(x=>!x.curatedId);
const rows=pending.map(x=>{const p=priority(x);return {gisObjectId:x.gisObjectId,name:x.name,county:x.county,river:x.river||null,lat:x.lat,lng:x.lng,cluster:[String(x.county).toUpperCase(),String(x.river||"UNKNOWN").toUpperCase()].join(" / "),priorityScore:p.points,priorityTier:p.tier,priorityReason:p.reason,publicationEligible:false,reviewStatus:x.evidenceReviewed?"previous-research-needs-public-access-review":"needs-source-discovery",sourceCount:x.sourceLinks?.length||0,blockingGate:x.outstandingGate||"Verify identity, land manager, public parking, legal approach, and current conditions before indexing"};});
rows.sort((a,b)=>b.priorityScore-a.priorityScore||String(a.county).localeCompare(String(b.county))||a.gisObjectId-b.gisObjectId);
const batches=[];for(let i=0;i<rows.length;i+=8)batches.push({batchNumber:1+Math.floor(i/8),candidates:rows.slice(i,i+8).map(x=>x.gisObjectId)});
if(new Set(rows.map(x=>x.gisObjectId)).size!==rows.length||rows.length!==ledger.counts.pending||rows.length+ledger.counts.exactIdMatched!==161||curated.length!==ledger.counts.curatedTotal)throw Error("GIS coverage mismatch");
const triageSummary={};for(const x of rows)triageSummary[x.priorityTier]=(triageSummary[x.priorityTier]||0)+1;
return {schemaVersion:2,generatedFrom:"data/up-waterfall-reconciliation.json",policy:"RESEARCH ONLY. A completed unverified visitor-access audit is retained but deprioritized until NEW official owner, parking or complete route evidence exists. This queue does not grant visitor access or change indexing.",counts:{gisFeatures:161,curatedDestinations:curated.length,matchedGisFeatures:ledger.counts.exactIdMatched,pendingGisFeatures:rows.length},triageSummary,batchSize:8,batches,candidates:rows};
}
export function buildQueue(){return generate(ledger,curated);}
if(process.argv[1]?.endsWith('build-up-waterfall-review-queue.mjs')){
 const out=JSON.stringify(buildQueue(),null,2)+'\n';
 if(process.argv.includes('--check')){if(fs.readFileSync('data/up-waterfall-review-queue.json','utf8')!==out){console.error('Waterfall queue stale');process.exit(1);}}
 else {fs.writeFileSync('data/up-waterfall-review-queue.json',out);console.log('Generated waterfall queue.');}
}
