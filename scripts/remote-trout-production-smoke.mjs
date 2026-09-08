const PAGE='https://chrisizworski.com/remote-trout-lake-finder/';
const API='https://chrisizworski.com/api/lakes?mode=remote&species=Brook%20Trout&thermal=cold&limit=6';

async function fetchText(url,timeoutMs=45000){
  const started=Date.now();
  const r=await fetch(url,{headers:{accept:'text/html,application/json','user-agent':'ChrisIzworskiRemoteTroutProductionSmoke/1.0'},signal:AbortSignal.timeout(timeoutMs)});
  const text=await r.text();
  return {r,text,elapsedMs:Date.now()-started};
}

const page=await fetchText(PAGE,20000);
if(!page.r.ok) throw new Error(`Remote Trout page HTTP ${page.r.status}`);
if(!page.text.includes('Find trout lakes that feel farther from the road.')) throw new Error('Remote Trout page missing release marker');
if(!page.text.includes('Trout Fit ≠ Remote Context')) throw new Error('Remote Trout page missing score-separation contract');

const api=await fetchText(API,60000);
if(!api.r.ok) throw new Error(`Remote Trout API HTTP ${api.r.status}: ${api.text.slice(0,300)}`);
const data=JSON.parse(api.text);
if(!Array.isArray(data.lakes)||data.lakes.length===0) throw new Error('Remote Trout API returned no source-backed lakes');
for(const lake of data.lakes){
  if(!Number.isFinite(lake.troutFit)||!Number.isFinite(lake.remoteContext)||!Number.isFinite(lake.confidence)) throw new Error(`Invalid score contract for ${lake.name||lake.id}`);
  if(!lake.remoteEvidence) throw new Error(`Missing remoteness evidence for ${lake.name||lake.id}`);
}
console.log(JSON.stringify({status:'ok',pageMs:page.elapsedMs,apiMs:api.elapsedMs,count:data.lakes.length,candidateCount:data.candidateCount,sample:data.lakes.slice(0,3).map(x=>({name:x.name,troutFit:x.troutFit,remoteContext:x.remoteContext,confidence:x.confidence,roadKm:x.remoteEvidence?.nearestRoadKm,accessKm:x.remoteEvidence?.nearestAccessKm}))}));
