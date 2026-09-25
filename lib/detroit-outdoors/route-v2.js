"use strict";

const {AsyncLocalStorage}=require("node:async_hooks");
const daylight=require("./regional-daylight.js");
const harness=require("../mackinac-island/harness.js");

const storage=new AsyncLocalStorage();
const originalDecideClosedSet=harness.decideClosedSet;
const DAYLIGHT_ACTIVITIES=new Set(["hiking","scenic","birding","paddling","fall-color","walking","cycling"]);
const NIGHT_ACTIVITIES=new Set(["dark-sky","freighter-watching"]);
const NIGHT_ENGINES=new Set(["night-sky-aurora","great-lakes-ais"]);
const MIN_NIGHT_USABLE_MINUTES=45;
const MIN_SUNSET_USABLE_MINUTES=15;
const PLACE_COORDS={
  "belle-isle":[42.3433,-82.9743],
  "lake-st-clair-metropark":[42.5755,-82.8075],
  "kensington-metropark":[42.5341,-83.6464],
  waterloo:[42.3378,-84.1830],
  "shiawassee-nwr":[43.3498,-84.0061],
  "port-crescent-state-park":[44.0047,-83.0550],
  "detroit-riverfront":[42.3314,-83.0458]
};

function parsedDate(value){
  const ms=Date.parse(String(value||""));
  return Number.isFinite(ms)?ms:null;
}
function driveMinutes(candidate){
  const direct=Number(candidate&&candidate.discovery&&candidate.discovery.driveMinutes);
  if(Number.isFinite(direct)&&direct>=0)return direct;
  const band=String(candidate&&candidate.travel&&candidate.travel.driveBand||candidate&&candidate.place&&candidate.place.drive||"");
  const nums=(band.match(/\d+(?:\.\d+)?/g)||[]).map(Number).filter(Number.isFinite);
  return nums.length?Math.max(...nums):0;
}
function arrivalWithBufferFits(candidate,now,end,bufferMinutes){
  if(end===null)return true;
  const arrivalWithUse=now.getTime()+((driveMinutes(candidate)+Math.max(0,Number(bufferMinutes)||0))*60000);
  return arrivalWithUse<=end;
}
function candidateCoords(candidate){
  const place=candidate&&candidate.place||{};
  const lat=Number(place.lat),lon=Number(place.lon);
  if(Number.isFinite(lat)&&Number.isFinite(lon))return[lat,lon];
  return PLACE_COORDS[place.id]||[42.3314,-83.0458];
}
function signalEligible(candidate,now=new Date()){
  if(!candidate||typeof candidate!=="object")return true;
  const end=parsedDate(candidate.timeWindow&&candidate.timeWindow.end);
  if(end!==null&&now.getTime()>end)return false;
  const engine=String(candidate.sourceEngine||"");
  const activity=String(candidate.activity||"");
  if(NIGHT_ENGINES.has(engine)||NIGHT_ACTIVITIES.has(activity)){
    return arrivalWithBufferFits(candidate,now,end,MIN_NIGHT_USABLE_MINUTES);
  }
  if(engine==="sunset-photography"){
    return arrivalWithBufferFits(candidate,now,end,MIN_SUNSET_USABLE_MINUTES);
  }
  if(!DAYLIGHT_ACTIVITIES.has(activity)&&!["park-weather","regional-discovery","fall-color-phenology","great-lakes-water"].includes(engine))return true;
  const [lat,lon]=candidateCoords(candidate);
  const proxy={
    ...candidate,
    place:{...(candidate.place||{}),lat,lon},
    discovery:{...(candidate.discovery||{}),driveMinutes:driveMinutes(candidate)}
  };
  return daylight._test.daylightDecision(proxy,now).keep;
}
function candidateEligible(candidate,now=new Date()){
  const signals=Array.isArray(candidate&&candidate.bundleSignals)?candidate.bundleSignals.filter(Boolean):[];
  if(signals.length>1){
    return signals.some(signal=>signalEligible({...signal,place:signal.place||candidate.place,travel:signal.travel||candidate.travel},now));
  }
  return signalEligible(candidate,now);
}
function parseEvidenceCandidate(row){
  if(!row||typeof row.text!=="string")return null;
  try{
    const parsed=JSON.parse(row.text);
    return parsed&&parsed.candidateId?parsed:null;
  }catch{return null;}
}
function isBoardDecisionTask(task){
  return /Detroit Outdoors board editor|overall posture of today's Detroit Outdoors board/i.test(String(task||""));
}
function filterClosedSetArgs(args,now=new Date(),state=null){
  if(!isBoardDecisionTask(args&&args.task))return{args,invalidIds:[],eligibleEvidence:args&&args.evidence||[]};
  const evidence=Array.isArray(args.evidence)?args.evidence:[];
  const rows=evidence.map(row=>({row,candidate:parseEvidenceCandidate(row)}));
  const invalidIds=rows.filter(x=>x.candidate&&!candidateEligible(x.candidate,now)).map(x=>x.candidate.candidateId);
  const invalid=new Set(invalidIds);
  if(state)for(const id of invalidIds)state.preJevFiltered.add(id);
  const eligibleEvidence=rows.filter(x=>!x.candidate||!invalid.has(x.candidate.candidateId)).map(x=>x.row);
  const options=Object.fromEntries(Object.entries(args.options||{}).filter(([id])=>!invalid.has(id)));
  const candidateOptionIds=Object.keys(options).filter(id=>eligibleEvidence.some(row=>row.id===id));
  let fallbackId=args.fallbackId;
  if(invalid.has(fallbackId))fallbackId=candidateOptionIds[0]||(Object.prototype.hasOwnProperty.call(options,"STOP")?"STOP":fallbackId);
  return{
    invalidIds,
    eligibleEvidence,
    args:{
      ...args,
      options,
      evidence:eligibleEvidence,
      fallbackId,
      context:{...(args.context||{}),daylightEligibleCandidateCount:eligibleEvidence.length,daylightFilteredCandidateCount:invalidIds.length}
    }
  };
}
async function detroitDecideClosedSet(args){
  const state=storage.getStore();
  if(!state||!isBoardDecisionTask(args&&args.task))return originalDecideClosedSet(args);
  const now=state.now;
  const filtered=filterClosedSetArgs(args,now,state);
  const optionIds=Object.keys(filtered.args.options||{});
  const candidateIds=optionIds.filter(id=>filtered.eligibleEvidence.some(row=>row.id===id));
  if(/overall posture/i.test(String(args.task||""))&&!filtered.eligibleEvidence.length){
    return{mode:"deterministic",choiceId:"QUIET",confidence:1,reason:"No time-eligible candidate remains after deterministic daylight, travel and usable-window gating",auth:"pre-jev-time-gate"};
  }
  if(!candidateIds.length&&optionIds.includes("STOP")){
    return{mode:"deterministic",choiceId:"STOP",confidence:1,reason:"No eligible candidate remains after deterministic time gating",auth:"pre-jev-time-gate"};
  }
  return originalDecideClosedSet(filtered.args);
}

// Route.js destructures decideClosedSet at require time. Patch only while loading
// this Detroit route, then restore the shared harness export for every other tool.
harness.decideClosedSet=detroitDecideClosedSet;
const route=require("./route.js");
harness.decideClosedSet=originalDecideClosedSet;

function filterResponse(body,now=new Date(),state={preJevFiltered:new Set()}){
  if(!body||typeof body!=="object")return body;
  const before=Array.isArray(body.opportunities)?body.opportunities:[];
  const kept=before.filter(candidate=>candidateEligible(candidate,now));
  const removed=before.filter(candidate=>!candidateEligible(candidate,now)).map(candidate=>candidate&&candidate.id).filter(Boolean);
  const pre=[...(state.preJevFiltered||[])];
  const boardMode=body.decision&&body.decision.boardEditor&&body.decision.boardEditor.mode||body.decision&&body.decision.lead&&body.decision.lead.mode||"unknown";
  const nextDecision={
    ...(body.decision||{}),
    daylightGate:{
      mode:"deterministic-pre-jev",
      evaluatedAt:now.toISOString(),
      preJevFilteredCandidateIds:pre,
      postRenderRemovedCandidateIds:removed,
      minNightUsableMinutes:MIN_NIGHT_USABLE_MINUTES,
      minSunsetUsableMinutes:MIN_SUNSET_USABLE_MINUTES,
      boardSelectorMode:boardMode,
      sharedHarnessJev:boardMode==="shared-harness-jev"
    }
  };
  if(nextDecision.boardEditor){
    nextDecision.boardEditor={
      ...nextDecision.boardEditor,
      selectedIds:kept.map(x=>x&&x.id).filter(Boolean),
      selectedCount:kept.length
    };
  }
  if(nextDecision.lead&&removed.includes(nextDecision.lead.choiceId)){
    nextDecision.lead={...nextDecision.lead,choiceId:kept[0]&&kept[0].id||null,postGateChanged:true};
  }
  const changed=removed.length>0;
  return{
    ...body,
    opportunities:kept,
    verdict:changed&&!kept.length?{label:"QUIET",detail:"Daylight-dependent outings are closed, and no night-capable option leaves enough travel time plus a useful on-site window right now."}:body.verdict,
    frontPage:changed?{...(body.frontPage||{}),subhead:kept.length?body.frontPage&&body.frontPage.subhead||"Only currently usable opportunities remain on the board.":"The board is holding: daylight outings are closed and no night opportunity leaves enough travel time plus a useful on-site window."}:body.frontPage,
    decision:nextDecision,
    diagnostics:{
      ...(body.diagnostics||{}),
      daylightGate:nextDecision.daylightGate,
      jev:{boardSelectorMode:boardMode,sharedHarnessJev:boardMode==="shared-harness-jev"}
    }
  };
}

module.exports=async function detroitOutdoorsV2(req,res){
  const state={now:new Date(),preJevFiltered:new Set()};
  return storage.run(state,async()=>{
    const sendJson=res.json.bind(res);
    res.json=body=>{
      const filtered=filterResponse(body,state.now,state);
      const removed=filtered&&filtered.decision&&filtered.decision.daylightGate&&filtered.decision.daylightGate.postRenderRemovedCandidateIds||[];
      if(removed.length)res.setHeader("Cache-Control","no-store");
      return sendJson(filtered);
    };
    return route(req,res);
  });
};

module.exports._test={MIN_NIGHT_USABLE_MINUTES,MIN_SUNSET_USABLE_MINUTES,driveMinutes,arrivalWithBufferFits,candidateCoords,signalEligible,candidateEligible,parseEvidenceCandidate,filterClosedSetArgs,filterResponse,isBoardDecisionTask};
