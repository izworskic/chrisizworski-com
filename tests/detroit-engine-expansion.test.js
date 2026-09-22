const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
const adapters=require("../lib/detroit-outdoors/expanded-engines.js");
const registry=require("../lib/detroit-outdoors/engine-registry.js");

test("Detroit engine registry owns the expanded opportunity families and holds monarch behind rights review",()=>{
  const byId=registry.registryById();
  for(const id of [
    "bird-migration-live","great-lakes-beach","southeast-river","morel-phenology",
    "clean-air-window","lake-st-clair-ice","xc-snow-screen","monarch-migration"
  ]) assert.ok(byId[id],id);
  assert.equal(byId["monarch-migration"].status,"rights-review");
  assert.equal(byId["monarch-migration"].role,"registered-not-enabled");
  assert.ok(!registry.enabledEngineIds().includes("monarch-migration"));
});

test("live bird adapter uses owned migration intelligence without pretending BirdCast was ingested",()=>{
  const rows=adapters._test.birdCandidate({ok:true,data:{
    season:{active:true,key:"fall"},
    regions:[{
      id:"western-lake-erie",
      flight:{key:"favorable",label:"Favorable movement setup",explanation:"North winds support southbound movement."},
      morning:{label:"Worth an early start",reason:"Supportive migration weather plus 34 recently reported species makes this a strong place to check after sunrise."},
      observations:{speciesCount:34}
    }]
  }});
  assert.equal(rows.length,1);
  const c=rows[0];
  assert.equal(c.sourceEngine,"bird-migration-live");
  assert.equal(c.activity,"birding");
  assert.match(c.confidence.reason,/BirdCast radar remains the authoritative movement confirmation/);
  assert.match(c.uncertainty.join(" "),/not ingested/);
  assert.doesNotMatch(JSON.stringify(c),/BirdCast says|radar observed|radar detected/i);
});

test("Lake Erie beach adapter emits only after the existing complete safety eligibility gate",()=>{
  const base={
    generated_at:"2026-07-15T12:00:00Z",
    season:{active:true},
    daily_ranking:{available:true},
    beaches:[{
      rating:{eligible:true,score:82,label:"Good beach day",confidence:"high"},
      lake_conditions:{water_temp_f:72,wave_height_ft:.8},
      weather:{today:{temperature_max_f:82}},
      swim_risk:{status:"low",label:"Low swim risk"},
      water_quality:{state:"no-active-alert"}
    }]
  };
  assert.equal(adapters._test.beachCandidate({ok:true,data:base}).length,1);
  assert.equal(adapters._test.beachCandidate({ok:true,data:{...base,beaches:[{...base.beaches[0],rating:{...base.beaches[0].rating,eligible:false}}]}}).length,0);
});

test("river adapter only frames a fresh material USGS flow change and never upgrades it into paddling safety",()=>{
  const mk=(site,flow)=>({
    sourceInfo:{siteCode:[{value:site}]},
    variable:{variableCode:[{value:"00060"}]},
    values:[{value:flow.map((v,i)=>({value:String(v),dateTime:new Date(Date.now()-(flow.length-1-i)*3600000).toISOString()}))}]
  });
  const data={value:{timeSeries:[mk("04174500",[100,100,102,101,99,100,170]),mk("04165500",[50,51,50,49,50,51,52])]}};
  const rows=adapters._test.riverCandidate({ok:true,data});
  assert.equal(rows.length,1);
  assert.equal(rows[0].sourceEngine,"southeast-river");
  assert.equal(rows[0].opportunityType,"river-change");
  assert.match(rows[0].uncertainty.join(" "),/not a paddling-safety or fishing-quality rating/i);
  assert.doesNotMatch(JSON.stringify(rows[0]),/safe to paddle|good for paddling|safe for fishing/i);
});

test("clean-air adapter only emits when the board has a meaningful location contrast",()=>{
  const place=(id,name,aqi)=>({ok:true,place:{id,name,area:"Detroit",setting:"park",drive:"20 min",driveClass:"near"},weather:{aqi}});
  assert.equal(adapters._test.cleanAirCandidate([place("a","A",45),place("b","B",85)]).length,1);
  assert.equal(adapters._test.cleanAirCandidate([place("a","A",45),place("b","B",52)]).length,0);
});

test("off-season engines are skipped before network fetch while evergreen engines remain available",async()=>{
  const code=read("lib/detroit-outdoors/expanded-engines.js");
  assert.match(code,/beachSeason\?loadOne\(BEACH_API/);
  assert.match(code,/iceSeason\?loadOne\(ICE_API/);
  assert.match(code,/morelSeason\?loadOne\(MOREL_API/);
  assert.match(code,/xcSeason\?loadOne\(XC_MODEL_API/);
  assert.match(code,/loadOne\(BIRD_MIGRATION_API/);
  assert.match(code,/loadOne\(USGS_RIVER_API/);
  const off=adapters._test.offSeasonState("x","https://example.com");
  assert.equal(off.state,"off-season");
  assert.equal(off.ok,true);
  const status=adapters.expandedSourceStatus({beach:off});
  assert.equal(status["great-lakes-beach"].state,"off-season");
});

test("expanded engine code preserves seasonal and safety truth boundaries",()=>{
  const code=read("lib/detroit-outdoors/expanded-engines.js");
  assert.match(code,/Soil warming is modeled from air temperature/);
  assert.match(code,/not evidence that morels are present at a specific site/);
  assert.match(code,/cannot establish local ice thickness or safe travel/);
  assert.match(code,/Never use this candidate as permission to walk, drive, fish or recreate on ice/);
  assert.match(code,/does not claim the trail is open, groomed or skiable/);
  assert.match(code,/Weather and modeled snow cannot prove grooming, opening status or skiability/);
  assert.match(code,/rating\.eligible!==true/);
});

test("Detroit mixed-engine loader actually invokes the reused adapter bundle",()=>{
  const engines=read("lib/detroit-outdoors/engines.js");
  const route=read("lib/detroit-outdoors/route.js");
  assert.match(engines,/require\("\.\/expanded-engines\.js"\)/);
  assert.match(engines,/loadExpandedEngineStates\(\)/);
  assert.match(engines,/emitExpandedCandidates/);
  assert.match(engines,/\.\.\.expanded\.byEngine/);
  assert.match(engines,/\.\.\.expanded\.candidates/);
  assert.match(route,/live birding, Lake Erie beach, USGS river-change, morel, cleaner-air, Michigan ice, and XC snow-screen/);
  assert.match(route,/reusedOpportunitySources:opportunityEngineDiagnostics\.sourceStatus/);
});

test("expanded engine adapter parses as JavaScript",()=>{
  assert.doesNotThrow(()=>new Function(read("lib/detroit-outdoors/expanded-engines.js")));
});

test("deterministic board fallback values incremental decision utility instead of raw score alone",()=>{
  const route=read("lib/detroit-outdoors/route.js");
  assert.match(route,/function fallbackUtility\(candidate,selected=\[\]\)/);
  assert.match(route,/if\(engine!=="park-weather"\) value\+=7/);
  assert.match(route,/verifiedEvidence/);
  assert.match(route,/confidence==="high"/);
  assert.match(route,/x&&x\.activity===candidate\.activity\)\) value-=10/);
  assert.match(route,/x&&x\.sourceEngine===engine\)\) value-=6/);
  assert.match(route,/x\.place\.id===candidate\.place\.id\)\) value-=5/);
  assert.match(route,/fallbackBoardOrder\(remaining,selected\)/);
  assert.doesNotMatch(route,/Variety of place, activity, distance and time-of-day is useful[^\n]+quota[^\n]+fallback/i);
});

test("Detroit browser renders a core board before editorial enrichment",()=>{
  const route=read("lib/detroit-outdoors/route.js");
  const client=read("public/assets/detroit-outdoors.js");
  const html=read("public/detroit-outdoors/index.html");
  assert.match(route,/if\(query\.get\("mode"\)==="core"\)/);
  assert.match(route,/mode:"core-board"/);
  assert.match(route,/editorial:\{mode:"deferred"/);
  assert.match(client,/requestBoard\("\/api\/detroit-outdoors\?edition=cards-v1&mode=core"\)/);
  assert.match(client,/renderPayload\(core,false\)/);
  assert.match(client,/enrichEditorial\(\)/);
  assert.match(client,/editorial unavailable · live board remains current/);
  assert.ok(client.includes('if($("#writer-mode")) $("#writer-mode").textContent="editorial unavailable · live board remains current";'));
  assert.match(html,/\/assets\/detroit-outdoors\.js\?v=20260922b/);
});

test("Detroit core-first client parses and tolerates specialist cards without legacy weather",()=>{
  const client=read("public/assets/detroit-outdoors.js");
  assert.doesNotThrow(()=>new Function(client));
  assert.match(client,/function renderWeather\(w\)\{\s*if\(!w\)return"";/);
  assert.match(client,/const reasons=\(\(c\.story&&c\.story\.whyToday\)\|\|c\.reasons\|\|\[\]\)/);
  assert.match(client,/const deeper=c&&c\.specialistHandoff&&c\.specialistHandoff\.url\|\|c&&c\.verifyUrl\|\|""/);
});
