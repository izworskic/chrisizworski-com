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
function evidence(candidate){return{id:candidate.id,source:"test",text:JSON.stringify({...candidate,candidateId:candidate.id})};}

test("legacy park-weather cards cannot remain eligible after sunset",()=>{
  assert.equal(T.candidateEligible(legacyPark(),night),false);
  assert.equal(T.candidateEligible(ship(),night),true);
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
  assert.deepEqual(body.decision.daylightGate.preJevFilteredCandidateIds,[park.id]);
  assert.deepEqual(body.decision.daylightGate.postRenderRemovedCandidateIds,[park.id]);
});

test("fall-color dispatcher uses the daylight-aware Detroit route",()=>{
  const dispatcher=read("api/fall-color.js");
  assert.match(dispatcher,/"detroit-outdoors": require\("\.\.\/lib\/detroit-outdoors\/route-v2\.js"\)/);
});
