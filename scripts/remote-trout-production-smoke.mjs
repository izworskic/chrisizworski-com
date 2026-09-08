const PAGE='https://chrisizworski.com/remote-trout-lake-finder/';
const API='https://chrisizworski.com/api/lakes?mode=remote&species=Brook%20Trout&thermal=cold&limit=6';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function fetchText(url,timeoutMs=45000){
  const started=Date.now();
  const r=await fetch(url,{headers:{accept:'text/html,application/json','user-agent':'ChrisIzworskiRemoteTroutProductionSmoke/1.0'},signal:AbortSignal.timeout(timeoutMs)});
  const text=await r.text();
  return {r,text,elapsedMs:Date.now()-started};
}

async function waitForRelease(){
  let last=null;
  for(let attempt=1;attempt<=18;attempt++){
    try{
      const page=await fetchText(PAGE,15000);
      last=page;
      if(page.r.ok&&page.text.includes('Find trout lakes that feel farther from the road.')&&page.text.includes('Trout Fit ≠ Remote Context')) return page;
      console.log(`Release not visible yet (attempt ${attempt}/18, HTTP ${page.r.status}); retrying.`);
    }catch(error){
      console.log(`Release check attempt ${attempt}/18 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Remote Trout release did not become visible${last?` (last HTTP ${last.r.status})`:''}`);
}

const page=await waitForRelease();
const api=await fetchText(API,60000);
if(!api.r.ok) throw new Error(`Remote Trout API HTTP ${api.r.status}: ${api.text.slice(0,300)}`);
const data=JSON.parse(api.text);
if(!Array.isArray(data.lakes)||data.lakes.length===0) throw new Error('Remote Trout API returned no source-backed lakes');
for(const lake of data.lakes){
  if(!Number.isFinite(lake.troutFit)||!Number.isFinite(lake.remoteContext)||!Number.isFinite(lake.confidence)) throw new Error(`Invalid score contract for ${lake.name||lake.id}`);
  if(!lake.remoteEvidence) throw new Error(`Missing remoteness evidence for ${lake.name||lake.id}`);
}
console.log(JSON.stringify({status:'ok',pageMs:page.elapsedMs,apiMs:api.elapsedMs,count:data.lakes.length,candidateCount:data.candidateCount,sample:data.lakes.slice(0,3).map(x=>({name:x.name,troutFit:x.troutFit,remoteContext:x.remoteContext,confidence:x.confidence,roadKm:x.remoteEvidence?.nearestRoadKm,accessKm:x.remoteEvidence?.nearestAccessKm}))}));
