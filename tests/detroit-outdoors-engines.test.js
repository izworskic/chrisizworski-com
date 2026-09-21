"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  normalizeOpportunityCandidate,
  hardGateSpecialistCandidates,
  dedupeMixedPool,
  countByEngine,
  engineDiagnostics,
  _test
}=require("../lib/detroit-outdoors/engines.js");

function placeState(id,overrides={}){
  const places={
    "lake-st-clair-metropark":{id,name:"Lake St. Clair Metropark",area:"Harrison Township",setting:"Lake St. Clair shoreline and marsh",drive:"35–50 min",driveClass:"near",officialUrl:"https://www.metroparks.com/lake-st-clair-metropark/"},
    "port-crescent-state-park":{id,name:"Port Crescent State Park",area:"Port Austin",setting:"Lake Huron shoreline, river, and dark-sky preserve",drive:"110–135 min",driveClass:"far",officialUrl:"https://www.michigan.gov/recsearch/parks/portcrescent"},
    "kensington-metropark":{id,name:"Kensington Metropark",area:"Milford",setting:"Inland lake and rolling woodland",drive:"45–65 min",driveClass:"near",officialUrl:"https://www.metroparks.com/kensington-metropark/"},
    waterloo:{id,name:"Waterloo Recreation Area",area:"Chelsea",setting:"Glacial lakes and hardwood forest",drive:"60–80 min",driveClass:"mid",officialUrl:"https://www.michigan.gov/recsearch/parks/waterloo"}
  };
  return {
    place:places[id],
    weather:{
      high:72,
      low:54,
      precipitationProbability:10,
      windGust:10,
      cloudCover:15,
      aqi:32,
      ...overrides
    }
  };
}
function emptyAlerts(count){
  return Array.from({length:count},()=>({ok:true,alerts:[]}));
}
function safeBuoyState(){
  return {
    ok:true,
    data:{
      stations:[{
        id:"45147",
        name:"45147",
        lat:42.43,
        lng:-82.68,
        obs_time:new Date(Date.now()-30*60*1000).toISOString(),
        wave_ht:.2,
        wind_spd:2,
        wind_gst:3,
        water_t:20
      }]
    }
  };
}

test("normalized opportunity contract carries engine, evidence, confidence, travel and uncertainty",()=>{
  const c=normalizeOpportunityCandidate({
    id:"x",
    sourceEngine:"test-engine",
    opportunityType:"test-window",
    activity:"scenic",
    place:{id:"p",name:"Place",drive:"20 min",driveClass:"near"},
    verifiedEvidence:[{source:"test",text:"verified"}],
    confidence:{level:"high",reason:"test"},
    travel:{origin:"Detroit",driveBand:"20 min",class:"near"},
    uncertainty:["one uncertainty"]
  });
  assert.equal(c.sourceEngine,"test-engine");
  assert.equal(c.opportunityType,"test-window");
  assert.equal(c.verifiedEvidence.length,1);
  assert.equal(c.confidence.level,"high");
  assert.equal(c.travel.driveBand,"20 min");
  assert.deepEqual(c.hardStops,[]);
  assert.equal(c.uncertainty.length,1);
});

test("Great Lakes engine emits a water opportunity only as a gated candidate",()=>{
  const placeStates=[placeState("lake-st-clair-metropark")];
  const candidates=_test.waterCandidate({
    placeStates,
    alertStates:emptyAlerts(1),
    waterState:safeBuoyState()
  });
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].sourceEngine,"great-lakes-water");
  assert.equal(candidates[0].opportunityType,"calm-water-paddle");
  assert.equal(candidates[0].verifiedEvidence.some(e=>/NDBC/i.test(e.source)),true);
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,1);
  assert.equal(gate.rejected.length,0);
});

test("marine hazard is a deterministic veto before the water candidate can reach JEV",()=>{
  const placeStates=[placeState("lake-st-clair-metropark")];
  const candidates=_test.waterCandidate({
    placeStates,
    alertStates:[{ok:true,alerts:[{event:"Small Craft Advisory",severity:"Moderate",headline:"Small Craft Advisory"}]}],
    waterState:safeBuoyState()
  });
  assert.equal(candidates.length,1,"engine may discover the opportunity before the hard gate");
  assert.match(candidates[0].hardStops.join(" "),/Small Craft Advisory/);
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.equal(gate.rejected.length,1);
  assert.match(gate.rejected[0].reasons.join(" "),/Small Craft Advisory/);
});

test("stale buoy data is rejected by the deterministic validity gate",()=>{
  const state=safeBuoyState();
  state.data.stations[0].obs_time=new Date(Date.now()-8*60*60*1000).toISOString();
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:state
  });
  assert.equal(candidates.length,1);
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/older than four hours/i);
});

test("night-sky engine can identify a bounded low-cloud nighttime window without calling it visibility",()=>{
  const now=Date.parse("2026-09-21T23:00:00Z");
  const region={
    sky_cover:{periods:[
      {start_time:"2026-09-22T00:00:00Z",end_time:"2026-09-22T01:00:00Z",percent:12},
      {start_time:"2026-09-22T01:00:00Z",end_time:"2026-09-22T02:00:00Z",percent:8},
      {start_time:"2026-09-22T02:00:00Z",end_time:"2026-09-22T03:00:00Z",percent:10}
    ]}
  };
  const window=_test.bestNightCloudWindow(region,now);
  assert.equal(window.cloudPercent,10);
  assert.equal(window.start,"2026-09-22T00:00:00Z");
  assert.equal(window.end,"2026-09-22T03:00:00Z");
});

test("fall-color engine emits regional phenology candidates without claiming park-level proof",()=>{
  const placeStates=[placeState("kensington-metropark"),placeState("waterloo")];
  const rows=_test.fallColorCandidates({
    placeStates,
    alertStates:emptyAlerts(2),
    fallSnapshot:{phase:"rising",pct:48,label:"Approaching peak",peakWindow:"Oct 20 to Oct 28"}
  });
  assert.equal(rows.length,2);
  assert.ok(rows.every(c=>c.sourceEngine==="fall-color-phenology"));
  assert.ok(rows.every(c=>/regional phenology lead/i.test(c.caveat)));
  assert.ok(rows.every(c=>c.verifiedEvidence.some(e=>/fall-color model/i.test(e.sourceLabel))));
});

test("specialist engine replaces the weaker same-place legacy activity instead of flooding JEV",()=>{
  const legacy=normalizeOpportunityCandidate({
    id:"lake-st-clair-metropark-paddling",
    sourceEngine:"park-weather",
    opportunityType:"paddling",
    place:{id:"lake-st-clair-metropark",name:"Lake St. Clair Metropark",drive:"35–50 min",driveClass:"near"},
    activity:"paddling",
    score:80,
    reasons:["weather-only paddling lead"],
    verifiedEvidence:[{source:"weather",text:"weather"}]
  });
  const specialist=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:safeBuoyState()
  })[0];
  const mixed=dedupeMixedPool([legacy],[specialist]);
  assert.equal(mixed.candidates.length,1);
  assert.equal(mixed.candidates[0].sourceEngine,"great-lakes-water");
  assert.equal(mixed.replaced.length,1);
});

test("mixed pool diagnostics expose engine participation without imposing a diversity quota",()=>{
  const park=normalizeOpportunityCandidate({
    id:"belle-isle-scenic",
    sourceEngine:"park-weather",
    opportunityType:"scenic",
    place:{id:"belle-isle",name:"Belle Isle Park",drive:"15–25 min",driveClass:"near"},
    activity:"scenic",
    verifiedEvidence:[{source:"weather",text:"weather"}]
  });
  const water=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:safeBuoyState()
  })[0];
  const fall=_test.fallColorCandidates({
    placeStates:[placeState("kensington-metropark"),placeState("waterloo")],
    alertStates:emptyAlerts(2),
    fallSnapshot:{phase:"rising",pct:48,label:"Approaching peak",peakWindow:"Oct 20 to Oct 28"}
  })[0];
  const mixed=[park,water,fall];
  assert.deepEqual(countByEngine(mixed),{
    "park-weather":1,
    "great-lakes-water":1,
    "fall-color-phenology":1
  });
  const diagnostics=engineDiagnostics({
    parkCandidates:[park],
    emitted:{byEngine:{"great-lakes-water":[water],"night-sky-aurora":[],"fall-color-phenology":[fall]}},
    gated:{safe:[water,fall],rejected:[]},
    mixedPool:mixed,
    selected:[water,park],
    specialistStates:{water:{ok:true},nightSky:{ok:true}},
    replaced:[]
  });
  assert.equal(diagnostics.mixedSafeCandidateCount,3);
  assert.equal(diagnostics.selectedEngineDiversity,2);
  assert.deepEqual(diagnostics.selectedIds,[water.id,park.id]);
  assert.ok(Object.hasOwn(diagnostics.emittedCandidateCountByEngine,"night-sky-aurora"));
});
