"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {
  LAKE_ST_CLAIR_MARINE_ALERTS,
  normalizeOpportunityCandidate,
  hardGateSpecialistCandidates,
  dedupeMixedPool,
  countByEngine,
  engineDiagnostics,
  _test
}=require("../lib/detroit-outdoors/engines.js");

function placeState(id,overrides={}){
  const places={
    "belle-isle":{id,name:"Belle Isle Park",area:"Detroit",setting:"Detroit River island",drive:"15–25 min",driveClass:"near",officialUrl:"https://www.michigan.gov/recsearch/parks/belleisle"},
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
    marineAlerts:{ok:true,data:{features:[]}},
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

test("Lake St Clair water gate uses the official NWS marine zone rather than an offshore point lookup",()=>{
  assert.equal(LAKE_ST_CLAIR_MARINE_ALERTS,"https://api.weather.gov/alerts/active?zone=LCZ460");
});

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

test("extreme observed alerts are hard vetoes even when the event name is outside the explicit warning list",()=>{
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:[{ok:true,alerts:[{event:"Unusual Hazard",severity:"Extreme",certainty:"Observed",headline:"Extreme observed hazard"}]}],
    waterState:safeBuoyState()
  });
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/dangerous weather warning/i);
});

test("water candidates fail closed when required water temperature is missing",()=>{
  const state=safeBuoyState();
  state.data.stations[0].water_t=null;
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:state
  });
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/water-temperature observation is unavailable/i);
});

test("water candidates fail closed when the dedicated marine alert source is unavailable",()=>{
  const state=safeBuoyState();
  state.marineAlerts={ok:false,error:"NWS unavailable",data:null};
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:state
  });
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/marine-hazard feed is unavailable/i);
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

test("fall-color specialist fails closed when its NWS alert lookup fails",()=>{
  const rows=_test.fallColorCandidates({
    placeStates:[placeState("kensington-metropark"),placeState("waterloo")],
    alertStates:[{ok:false,alerts:[],error:"NWS timeout"},{ok:true,alerts:[]}],
    fallSnapshot:{phase:"rising",pct:48,label:"Approaching peak",peakWindow:"Oct 20 to Oct 28"}
  });
  const kensington=rows.find(c=>c.place.id==="kensington-metropark");
  assert.ok(kensington);
  const gate=hardGateSpecialistCandidates([kensington]);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/NWS alert feed is unavailable/i);
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

test("specialist hard veto removes the same-place legacy activity before JEV",()=>{
  const legacy=normalizeOpportunityCandidate({
    id:"lake-st-clair-metropark-paddling",
    sourceEngine:"park-weather",
    opportunityType:"paddling",
    place:{id:"lake-st-clair-metropark",name:"Lake St. Clair Metropark",drive:"35–50 min",driveClass:"near"},
    activity:"paddling",
    score:88,
    reasons:["weather-only paddling lead"],
    verifiedEvidence:[{source:"weather",text:"weather"}]
  });
  const state=safeBuoyState();
  state.data.stations[0].wave_ht=.6;
  const specialist=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:state
  });
  assert.equal(specialist.length,1);
  const gate=hardGateSpecialistCandidates(specialist);
  assert.equal(gate.safe.length,0);
  assert.equal(gate.rejected.length,1);
  const mixed=dedupeMixedPool([legacy],gate.safe,gate.rejected);
  assert.equal(mixed.candidates.length,0);
  assert.equal(mixed.vetoedLegacy.length,1);
  assert.equal(mixed.vetoedLegacy[0].legacyId,"lake-st-clair-metropark-paddling");
  assert.equal(mixed.vetoedLegacy[0].specialistId,"water-lake-st-clair-calm-window");
});

test("unavailable buoy source still emits a rejected specialist veto so legacy paddling cannot survive",()=>{
  const legacy=normalizeOpportunityCandidate({
    id:"lake-st-clair-metropark-paddling",
    sourceEngine:"park-weather",
    opportunityType:"paddling",
    place:{id:"lake-st-clair-metropark",name:"Lake St. Clair Metropark",drive:"35–50 min",driveClass:"near"},
    activity:"paddling",
    score:90,
    verifiedEvidence:[{source:"weather",text:"calm land forecast"}]
  });
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:{ok:false,error:"buoy API unavailable",data:null}
  });
  assert.equal(candidates.length,1);
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/buoy feed is unavailable/i);
  const mixed=dedupeMixedPool([legacy],gate.safe,gate.rejected);
  assert.equal(mixed.candidates.length,0);
  assert.equal(mixed.vetoedLegacy.length,1);
});

test("rough water outside the old emission prefilter still vetoes legacy paddling",()=>{
  const legacy=normalizeOpportunityCandidate({
    id:"lake-st-clair-metropark-paddling",
    sourceEngine:"park-weather",
    opportunityType:"paddling",
    place:{id:"lake-st-clair-metropark",name:"Lake St. Clair Metropark",drive:"35–50 min",driveClass:"near"},
    activity:"paddling",
    score:90,
    verifiedEvidence:[{source:"weather",text:"calm land forecast"}]
  });
  const state=safeBuoyState();
  state.data.stations[0].wave_ht=.8;
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:emptyAlerts(1),
    waterState:state
  });
  assert.equal(candidates.length,1);
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/wave height/i);
  const mixed=dedupeMixedPool([legacy],gate.safe,gate.rejected);
  assert.equal(mixed.candidates.length,0);
});

test("water specialist fails closed when the park-point NWS alert lookup fails",()=>{
  const candidates=_test.waterCandidate({
    placeStates:[placeState("lake-st-clair-metropark")],
    alertStates:[{ok:false,alerts:[],error:"NWS timeout"}],
    waterState:safeBuoyState()
  });
  assert.equal(candidates.length,1);
  const gate=hardGateSpecialistCandidates(candidates);
  assert.equal(gate.safe.length,0);
  assert.match(gate.rejected[0].reasons.join(" "),/park-point alert feed is unavailable/i);
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


test("sunset photography engine emits a non-park Detroit Riverfront opportunity from solar geometry and NWS sky cover",()=>{
  const now=new Date("2026-09-21T20:30:00Z");
  const sunset=_test.solarMinutes("2026-09-21",42.3314,-83.0458,false);
  assert.ok(sunset>1140&&sunset<1230,`sunset ${sunset}`);
  const nightSkyState={
    ok:true,
    data:{
      ovation:{regions:[{
        id:"detroit",
        sky_cover:{periods:[
          {start_time:"2026-09-21T22:00:00Z",end_time:"2026-09-21T23:00:00Z",percent:35},
          {start_time:"2026-09-21T23:00:00Z",end_time:"2026-09-22T00:00:00Z",percent:42},
          {start_time:"2026-09-22T00:00:00Z",end_time:"2026-09-22T01:00:00Z",percent:48}
        ]}
      }]}
    }
  };
  const rows=_test.sunsetPhotographyCandidate({
    placeStates:[placeState("belle-isle",{precipitationProbability:8,windGust:9,aqi:30})],
    alertStates:emptyAlerts(1),
    nightSkyState,
    now
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].place.id,"detroit-riverfront");
  assert.equal(rows[0].sourceEngine,"sunset-photography");
  assert.equal(rows[0].opportunityType,"sunset-photography");
  assert.match(rows[0].whyNow,/sunset period/i);
  assert.ok(rows[0].verifiedEvidence.some(e=>/Detroit Riverwalk/i.test(e.sourceLabel)));
});

test("sunset photography engine does not claim a colorful sunset from sky-cover percentage alone",()=>{
  const now=new Date("2026-09-21T20:30:00Z");
  const nightSkyState={
    ok:true,
    data:{ovation:{regions:[{id:"detroit",sky_cover:{periods:[
      {start_time:"2026-09-21T22:00:00Z",end_time:"2026-09-21T23:00:00Z",percent:35},
      {start_time:"2026-09-21T23:00:00Z",end_time:"2026-09-22T00:00:00Z",percent:40}
    ]}}]}}
  };
  const row=_test.sunsetPhotographyCandidate({
    placeStates:[placeState("belle-isle")],
    alertStates:emptyAlerts(1),
    nightSkyState,
    now
  })[0];
  assert.ok(row);
  assert.match(row.caveat,/does not resolve cloud type/i);
  assert.doesNotMatch(row.whyNow,/guarantee|colorful/i);
});

test("Great Lakes AIS engine can emit a short-lived Detroit Riverfront freighter-watching candidate",()=>{
  const aisState={
    ok:true,
    data:{
      vessels:[
        {mmsi:"366904940",name:"TEST LAKER",lat:42.34,lon:-83.02,seen:"2026-09-21T20:25:00Z",speedKnots:8.4,course:210,heading:208,shipType:70,source:"test"}
      ],
      maxAgeMinutes:30
    }
  };
  const rows=_test.freighterWatchingCandidate({
    placeStates:[placeState("belle-isle")],
    alertStates:emptyAlerts(1),
    aisState
  });
  assert.equal(rows.length,1);
  assert.equal(rows[0].place.id,"detroit-riverfront");
  assert.equal(rows[0].sourceEngine,"great-lakes-ais");
  assert.equal(rows[0].opportunityType,"live-freighter-passage");
  assert.match(rows[0].reasons.join(" "),/TEST LAKER/);
  assert.match(rows[0].caveat,/not a passage schedule/i);
});

test("AIS engine ignores distant or non-commercial traffic instead of creating candidate noise",()=>{
  const aisState={
    ok:true,
    data:{vessels:[
      {mmsi:"111111111",name:"PLEASURE",lat:42.34,lon:-83.02,seen:"2026-09-21T20:25:00Z",speedKnots:5,shipType:36,source:"test"},
      {mmsi:"222222222",name:"FAR LAKER",lat:43.0,lon:-82.4,seen:"2026-09-21T20:25:00Z",speedKnots:8,shipType:70,source:"test"}
    ]}
  };
  const rows=_test.freighterWatchingCandidate({
    placeStates:[placeState("belle-isle")],
    alertStates:emptyAlerts(1),
    aisState
  });
  assert.equal(rows.length,0);
});
