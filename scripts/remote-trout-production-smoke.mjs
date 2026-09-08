const PAGE='https://chrisizworski.com/remote-trout-lake-finder/';
const API='https://chrisizworski.com/api/lakes?mode=remote&species=Brook%20Trout&remote=easy&limit=6';
const MAP='https://chrisizworski.com/api/lakes?mode=remote-map&species=Brook%20Trout&remote=easy&bbox=-96,41,-74,57';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function fetchText(url,timeoutMs=45000){
  const started=Date.now();
  const r=await fetch(url,{headers:{accept:'text/html,application/json','user-agent':'ChrisIzworskiRemoteTroutProductionSmoke/2.0'},signal:AbortSignal.timeout(timeoutMs)});
  const text=await r.text();
  return {r,text,elapsedMs:Date.now()-started};
}

async function waitForRelease(){
  let last=null;
  for(let attempt=1;attempt<=18;attempt++){
    try{
      const page=await fetchText(PAGE,15000);
      last=page;
      if(page.r.ok&&page.text.includes('Ontario trout intelligence · V2')&&page.text.includes('No hidden top-candidate sampling.')&&page.text.includes("Why isn't my lake here?")) return page;
      console.log(`V2 release not visible yet (attempt ${attempt}/18, HTTP ${page.r.status}); retrying.`);
    }catch(error){
      console.log(`V2 release check attempt ${attempt}/18 failed: ${error.message}`);
    }
    await sleep(5000);
  }
  throw new Error(`Remote Trout V2 release did not become visible${last?` (last HTTP ${last.r.status})`:''}`);
}

const page=await waitForRelease();
const api=await fetchText(API,60000);
if(!api.r.ok) throw new Error(`Remote Trout V2 API HTTP ${api.r.status}: ${api.text.slice(0,300)}`);
const data=JSON.parse(api.text);
if(data.coverageComplete!==true) throw new Error('Remote Trout V2 list does not declare complete indexed coverage');
if(data.candidateCount!==3414) throw new Error(`Expected 3414 indexed Brook Trout lakes, got ${data.candidateCount}`);
if(data.indexSummary?.unionWaterbodyIds!==6538||data.indexSummary?.lakes!==5651||data.indexSummary?.mappable!==5649||data.indexSummary?.remoteScored!==5649||data.indexSummary?.unmapped!==2) throw new Error(`V2 index truth accounting mismatch: ${JSON.stringify(data.indexSummary)}`);
if(!Array.isArray(data.lakes)||data.lakes.length!==6) throw new Error('Remote Trout V2 API did not return the requested first page');
for(const lake of data.lakes){
  if(!Number.isFinite(lake.troutFit)) throw new Error(`Invalid Trout Fit for ${lake.name||lake.id}`);
  if(!Array.isArray(lake.targetEvidence)||lake.targetEvidence.length===0) throw new Error(`Missing target-species provenance for ${lake.name||lake.id}`);
  if(!lake.remote||!Object.prototype.hasOwnProperty.call(lake.remote,'score')) throw new Error(`Missing Remote Context object for ${lake.name||lake.id}`);
}
const map=await fetchText(MAP,60000);
if(!map.r.ok) throw new Error(`Remote Trout V2 map HTTP ${map.r.status}: ${map.text.slice(0,300)}`);
const mapData=JSON.parse(map.text);
if(mapData.coverageComplete!==true) throw new Error(`Remote Trout V2 province viewport is not complete: ${JSON.stringify({matchedInView:mapData.matchedInView,displayedInView:mapData.displayedInView,truncatedReason:mapData.truncatedReason})}`);
if(!Array.isArray(mapData.markers)||mapData.markers.length<3000) throw new Error(`Remote Trout V2 map returned too few Brook Trout markers: ${mapData.markers?.length}`);
console.log(JSON.stringify({status:'ok',pageMs:page.elapsedMs,apiMs:api.elapsedMs,mapMs:map.elapsedMs,candidateCount:data.candidateCount,indexSummary:data.indexSummary,mapMarkers:mapData.markers.length,sample:data.lakes.slice(0,3).map(x=>({name:x.name,troutFit:x.troutFit,remoteContext:x.remoteContext,confidence:x.confidence,evidence:x.targetEvidence,roadKm:x.remote?.roadKm,accessKm:x.remote?.accessKm}))}));
