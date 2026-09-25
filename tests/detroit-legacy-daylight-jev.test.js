const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const T=require("../lib/detroit-outdoors/route-v2.js")._test;

const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const night=new Date("2026-09-25T00:30:00Z"); // Sep 24, 8:30 PM EDT

function legacyPark(id="belle-isle-hiking"){
  return {
    id,
    sourceEngine:"park-weather",
    opportunityType:"hiking",
    activity:"hiking",
    place:{id:"belle-isle",name:"Belle Isle Park",drive:"15–25 min",driveClass:"near"},
    travel:{origin:"central Detroit",driveBand:"15–25 min",class:"near"},
    timeWindow:{label:"Today",start:null,end:null},
    score:82
  };
}
function ship(){
  return {
    id:"riverfront-live-freighter",
    sourceEngine:"great-lakes-ais",
    opportunityType:"live-freighter-passage",
    activity:"freighter-watching",
    place:{id:"detroit-riverfront",name:"Detroit Riverfront",drive:"5–15 min"},
    timeWindow:{label:"Possible passage now / verify live map",start:"2026-09-25T00:25:00Z",end:null},
    score:80
  };
}
function darkSky(end){
  return {
    id:"night-port-crescent-sky-window",
    sourceEngine:"night-sky-aurora",
    opportunityType:"clear-dark-sky",
    activity:"dark-sky",
    place:{id:"port-crescent-state-park",name:"Port Crescent State Park",drive:"110–135 min",driveClass:"far"},
    travel:{origin:"central Detroit",driveBand:"110–135 min",class:"far"},
    timeWindow:{label:"Tonight",start:"2026-09-25T00:00:00Z",end},
    score:84
  };
}
function evidence(candidate){return{id:candidate.id,source:"test",text:JSON.stringify({...candidate,candidateId:candidate.id})};}

test("legacy park-weather cards cannot remain eligible after sunset",()=>{
  assert.equal(T.candidateEligible(legacyPark(),night),false);
  assert.equal(T.candidateEligible(ship(),night),true);
});

test("night candidates must leave drive time plus 45 usable minutes on site",()=>{
  const now=new Date("2026-09-25T01:00:00Z"); // 9:00 PM EDT
  assert.equal(T.candidateEligible(darkSky("2026-09-25T03:30:00Z"),now),false); // 11:30 PM EDT ends too soon for 135m drive + 45m use
  assert.equal(T.candidateEligible(darkSky("2026-09-25T04:30:00Z"),now),true);  // 12:30 AM EDT leaves 45m usable after conservative drive
  assert.equal(T.MIN_NIGHT_USABLE_MINUTES,45);
});

test("Detroit pre-JEV JSON removes legacy night parks before the closed-set choice",()=>{
  const park=legacyPark();
  const vessel=ship();
  const filtered=T.filterClosedSetArgs({
    task:"You are the Detroit Outdoors board editor. From every hard-safe candidate, choose the single opportunity that deserves card position 1 today.",
    options:{[park.id]:"park option",[vessel.id]:"ship option"},
    evidence:[evidence(park),evidence(vessel)],
    fallbackId:park.id,
    context:{hardSafeCandidateCount:2}
  },night);
  assert.deepEqual(filtered.invalidIds,[park.id]);
  assert.equal(Object.hasOwn(filtered.args.options,park.id),false);
  assert.equal(Object.hasOwn(filtered.args.options,vessel.id),true);
  assert.equal(filtered.args.fallbackId,vessel.id);
  assert.equal(filtered.args.context.daylightEligibleCandidateCount,1);
});

test("Detroit pre-JEV JSON also removes night trips whose useful window dies before arrival",()=>{
  const far=darkSky("2026-09-25T03:00:00Z");
  const vessel=ship();
  const filtered=T.filterClosedSetArgs({
    task:"You are the Detroit Outdoors board editor. From every hard-safe candidate, choose the single opportunity that deserves card position 1 today.",
    options:{[far.id]:"dark sky",[vessel.id]:"ship option"},
    evidence:[evidence(far),evidence(vessel)],
    fallbackId:far.id,
    context:{hardSafeCandidateCount:2}
  },new Date("2026-09-25T01:00:00Z"));
  assert.deepEqual(filtered.invalidIds,[far.id]);
  assert.equal(Object.hasOwn(filtered.args.options,far.id),false);
  assert.equal(filtered.args.fallbackId,vessel.id);
});

test("response guard removes any residual daylight card and exposes selector diagnostics",()=>{
  const park=legacyPark();
  const vessel=ship();
  const body=T.filterResponse({
    ok:true,
    opportunities:[park,vessel],
    decision:{lead:{choiceId:park.id,mode:"shared-harness-jev"},boardEditor:{mode:"shared-harness-jev",selectedIds:[park.id,vessel.id],selectedCount:2}},
    diagnostics:{}
  },night,{preJevFiltered:new Set([park.id])});
  assert.deepEqual(body.opportunities.map(x=>x.id),[vessel.id]);
  assert.equal(body.decision.lead.choiceId,vessel.id);
  assert.equal(body.decision.daylightGate.mode,"deterministic-pre-jev");
  assert.equal(body.decision.daylightGate.sharedHarnessJev,true);
  assert.equal(body.decision.daylightGate.minNightUsableMinutes,45);
  assert.deepEqual(body.decision.daylightGate.preJevFilteredCandidateIds,[park.id]);
  assert.deepEqual(body.decision.daylightGate.postRenderRemovedCandidateIds,[park.id]);
});

test("fall-color dispatcher uses the daylight-aware Detroit route",()=>{
  const dispatcher=read("api/fall-color.js");
  assert.match(dispatcher,/"detroit-outdoors": require\("\.\.\/lib\/detroit-outdoors\/route-v2\.js"\)/);
});
