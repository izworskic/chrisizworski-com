const test=require("node:test");
const assert=require("node:assert/strict");
const T=require("../api/national-white-christmas")._test;

test("LIVE ACIS establishes a bounded 1991-2020 White Christmas history near Detroit",async()=>{
  const start=Date.now();
  const x=await T.historicalClimatology(42.3314,-83.0458);
  assert.ok(x,"ACIS returned no qualifying station history");
  assert.ok(x.station.distance_miles<=T.HISTORY_RADIUS_MILES);
  assert.ok(x.history.valid_years>=25);
  assert.ok(x.history.probability>=0&&x.history.probability<=100);
  console.log("LIVE_ACIS_DETROIT",JSON.stringify({ms:Date.now()-start,station:x.station.name,distance:x.station.distance_miles,probability:x.history.probability,years:x.history.valid_years}));
});

test("LIVE CPC returns a December-relevant broad outlook near Detroit",async()=>{
  const x=await T.cpcPair(42.3314,-83.0458);
  assert.ok(x.temperature||x.precipitation,"CPC returned no December-relevant outlook");
  for(const item of [x.temperature,x.precipitation].filter(Boolean)){
    assert.ok(Number.isFinite(item.probability));
    assert.ok(item.probability>=0&&item.probability<=100);
    assert.ok(T.containsDecember(item.valid_period),item.valid_period);
  }
  console.log("LIVE_CPC_DETROIT",JSON.stringify(x));
});

test("LIVE ACIS preserves Michigan north-south climatology direction",async()=>{
  const [detroit,marquette]=await Promise.all([
    T.historicalClimatology(42.3314,-83.0458),
    T.historicalClimatology(46.5436,-87.3954)
  ]);
  assert.ok(detroit&&marquette);
  assert.ok(marquette.history.probability>detroit.history.probability,
    "expected Marquette White Christmas climatology to exceed Detroit");
  console.log("LIVE_WHITE_CHRISTMAS",JSON.stringify({
    detroit:{station:detroit.station.name,distance:detroit.station.distance_miles,probability:detroit.history.probability,years:detroit.history.valid_years},
    marquette:{station:marquette.station.name,distance:marquette.station.distance_miles,probability:marquette.history.probability,years:marquette.history.valid_years}
  }));
});
