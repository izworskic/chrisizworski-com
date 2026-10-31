#!/usr/bin/env node
// Research planning only: this never changes publication eligibility or invents access.
import fs from 'node:fs';
const ledger=JSON.parse(fs.readFileSync('data/up-waterfall-reconciliation.json','utf8'));
const curated=JSON.parse(fs.readFileSync('data/up-waterfalls.json','utf8')).waterfalls;
const PINNED=[160,166,135,45,46,91,95,96,190,191,192,213,198,199,88,110,119,154,215,150,151];
function score(c){
  const pin=PINNED.indexOf(c.gisObjectId);
  const generic=/^(upper|lower|middle|first|second|little|big) falls$/i.test(c.name);
  const risk=/dam|peavy|quinnesec|power house|hydro/i.test(c.name);
  const started=Boolean(c.evidenceReviewed||c.sourceLinks?.length||c.accessRouteAudit);
  return {points:(pin>=0?100-pin:0)+(started?12:0)-(generic?15:0)-(risk?8:0),reason:pin>=0?'Named priority for authoritative source review':started?'Previously sourced, access review incomplete':generic?'Generic name; disambiguate river and physical waterfall':'Requires independent land-manager and visitor-approach evidence'};
}
export function buildQueue(){
  const pending=ledger.candidates.filter(x=>!x.curatedId);
  const rows=pending.map(x=>{const p=score(x);return {gisObjectId:x.gisObjectId,name:x.name,county:x.county,river:x.river||null,lat:x.lat,lng:x.lng,cluster:[String(x.county).toUpperCase(),String(x.river||'UNKNOWN').toUpperCase()].join(' / '),priorityScore:p.points,priorityReason:p.reason,publicationEligible:false,reviewStatus:x.evidenceReviewed?'previous-research-needs-public-access-review':'needs-source-discovery',sourceCount:x.sourceLinks?.length||0,blockingGate:x.outstandingGate||'Verify identity, land manager, public parking, legal approach, and current conditions before indexing'};});
  rows.sort((a,b)=>b.priorityScore-a.priorityScore||a.county.localeCompare(b.county)||a.gisObjectId-b.gisObjectId);
  const batches=[];for(let i=0;i<rows.length;i+=8){batches.push({batchNumber:Math.floor(i/8)+1,candidates:rows.slice(i,i+8).map(x=>x.gisObjectId)});}
  if(new Set(rows.map(x=>x.gisObjectId)).size!==rows.length)throw Error('Duplicate GIS candidate');
  if(rows.length!==ledger.counts.pending)throw Error('Pending count mismatch');
  if(ledger.counts.exactIdMatched+rows.length!==161)throw Error('GIS coverage mismatch');
  if(curated.length!==ledger.counts.curatedTotal)throw Error('Curated count mismatch');
  return {schemaVersion:1,generatedFrom:'data/up-waterfall-reconciliation.json',policy:'RESEARCH ONLY. Priority is a review-effort heuristic, not evidence of legal visitor access, permission, parking, or live opening. Do not auto-index.',counts:{gisFeatures:161,curatedDestinations:curated.length,matchedGisFeatures:ledger.counts.exactIdMatched,pendingGisFeatures:rows.length},batchSize:8,batches,candidates:rows};
}
const out=JSON.stringify(buildQueue(),null,2)+'\n';
if(process.argv.includes('--check')){
  if(fs.readFileSync('data/up-waterfall-review-queue.json','utf8')!==out){console.error('Waterfall review queue is stale; rerun generator.');process.exit(1);}
}else{fs.writeFileSync('data/up-waterfall-review-queue.json',out);console.log('Generated waterfall review queue.');}
