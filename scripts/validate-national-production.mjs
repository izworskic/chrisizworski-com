#!/usr/bin/env node
const origin=process.env.NATIONAL_SMOKE_ORIGIN||"https://chrisizworski.com";
const places=[
  {name:"Seattle",q:"Seattle, WA",lat:47.6062,lon:-122.3321,tz:"America/Los_Angeles"},
  {name:"Denver",q:"Denver, CO",lat:39.7392,lon:-104.9903,tz:"America/Denver"},
  {name:"Atlanta",q:"Atlanta, GA",lat:33.7490,lon:-84.3880,tz:"America/New_York"},
  {name:"Burlington",q:"Burlington, VT",lat:44.4759,lon:-73.2121,tz:"America/New_York"}
];
const results=[];
async function get(path,options={}){
  const json=options.json!==false;
  const timeout=options.timeout||15000;
  const response=await fetch(origin+path,{headers:{accept:json?"application/json":"text/html"},signal:AbortSignal.timeout(timeout)});
  const text=await response.text();
  if(!response.ok)throw new Error(path+" HTTP "+response.status+" "+text.slice(0,180));
  if(!json)return text;
  try{return JSON.parse(text)}catch{throw new Error(path+" returned non-JSON")}
}
async function check(label,fn){
  try{await fn();results.push({label,ok:true});console.log("PASS",label)}
  catch(error){results.push({label,ok:false,error:String(error.message||error)});console.error("FAIL",label,error.message||error)}
}
await check("Portland Oregon geocode resilience",async()=>{
  const forms=["Portland, OR","Portland Oregon","97201"];
  for(const q of forms){
    const x=await get("/api/national-geocode?q="+encodeURIComponent(q),{timeout:20000});
    if(!Number.isFinite(Number(x.latitude))||!Number.isFinite(Number(x.longitude)))throw new Error(q+" missing coordinates");
    if(x.stateCode!=="OR")throw new Error(q+" lost Oregon state identity");
    if(!x.geocodeSource)throw new Error(q+" missing geocode source");
  }
});

for(const p of places){
  await check(p.name+" geocode",async()=>{
    const x=await get("/api/national-geocode?q="+encodeURIComponent(p.q));
    if(!Number.isFinite(Number(x.latitude))||!x.timeZone)throw new Error("missing coordinates/timezone");
  });
  await check(p.name+" aurora",async()=>{
    const x=await get("/api/national-aurora?lat="+p.lat+"&lon="+p.lon);
    if(!x.sources||!x.retrieved_at)throw new Error("missing source contract");
  });
  await check(p.name+" rivers summary",async()=>{
    const x=await get("/api/national-rivers?lat="+p.lat+"&lon="+p.lon,{timeout:20000});
    if(!Array.isArray(x.gauges)||!x.sources)throw new Error("missing gauges/source contract");
  });
  let selectedRiverSite=null;
  await check(p.name+" river discovery",async()=>{
    const x=await get("/api/national-rivers?mode=discovery&radius=50&limit=200&lat="+p.lat+"&lon="+p.lon,{timeout:15000});
    if(x.mode!=="river-discovery"||!Array.isArray(x.rivers)||!x.sources)throw new Error("missing river discovery contract");
    const first=x.rivers.flatMap(r=>Array.isArray(r.gauges)?r.gauges:[])[0];
    selectedRiverSite=first?.id||null;
  });
  await check(p.name+" selected river detail",async()=>{
    if(!selectedRiverSite)throw new Error("no monitored river available for selected-detail smoke");
    const x=await get("/api/national-rivers?lat="+p.lat+"&lon="+p.lon+"&site="+encodeURIComponent(selectedRiverSite),{timeout:20000});
    if(x.mode!=="selected-river-detail"||x.selected_site?.id!==selectedRiverSite||!Array.isArray(x.gauges))throw new Error("selected river did not remain exact-site");
  });
  await check(p.name+" frost",async()=>{
    const x=await get("/api/national-frost?lat="+p.lat+"&lon="+p.lon,{timeout:20000});
    if(!x.sources||!x.location)throw new Error("missing frost source contract");
  });
  await check(p.name+" fall timing",async()=>{
    const x=await get("/api/national-fall-color?lat="+p.lat+"&lon="+p.lon,{timeout:20000});
    if(!x.sources||!x.timing_context)throw new Error("missing fall timing contract");
  });
  await check(p.name+" current leaf observations",async()=>{
    const x=await get("/api/national-fall-observations?lat="+p.lat+"&lon="+p.lon+"&tz="+encodeURIComponent(p.tz),{timeout:20000});
    if(!x.sources||!x.colored_leaves)throw new Error("missing observation contract");
  });
}

const coastalControls=[
  {name:"Grand Haven coastal",lat:43.063,lon:-86.228,expectCoastal:true},
  {name:"Folly Beach coastal",lat:32.655,lon:-79.940,expectCoastal:true},
  {name:"Portland Oregon inland control",lat:45.537,lon:-122.650,expectCoastal:false},
  {name:"Denver inland control",lat:39.7392,lon:-104.9903,expectCoastal:false}
];
let coastalCovered=0;
for(const p of coastalControls){
  await check(p.name+" coastal contract",async()=>{
    const x=await get("/api/national-coastal?lat="+p.lat+"&lon="+p.lon,{timeout:20000});
    if(typeof x.coastal_available!=="boolean"||!x.decision||!Array.isArray(x.sources)||x.sources.length!==3)throw new Error("missing coastal decision/source contract");
    if(p.expectCoastal&&x.coastal_available)coastalCovered+=1;
    if(!p.expectCoastal&&x.coastal_available)throw new Error("inland control unexpectedly received coastal coverage");
    if(!p.expectCoastal&&x.applicability?.status!=="not-applicable")throw new Error("inland control did not fail coastal location admission");
    if(!p.expectCoastal&&x.decision.level!=="not-applicable")throw new Error("inland control did not return explicit not-applicable decision");
    if(!p.expectCoastal&&(x.nearby_observation||x.tide_context||x.official_beach_forecast?.day1||x.official_beach_forecast?.day2))throw new Error("inland control leaked distant coastal source data");
    if(x.sources.some(source=>source&&source.available===false&&source.stale===true))throw new Error("unavailable source marked stale instead of unavailable");
  });
}
await check("coastal production has real coastal coverage",async()=>{
  if(coastalCovered<1)throw new Error("neither coastal control returned any live coastal source coverage");
});

const snowControls=[
  {name:"Mount Hood Oregon snow",lat:45.33,lon:-121.71,state:"OR"},
  {name:"Burlington Vermont snow",lat:44.4759,lon:-73.2121,state:"VT"},
  {name:"Atlanta Georgia snow",lat:33.7490,lon:-84.3880,state:"GA"}
];
let snowControlsWithLiveSource=0;
const localSnowLevels=new Set(["melt-pressure-high","melt-pressure-moderate","freeze-thaw","accumulation-supportive","cold-hold","pack-holding"]);
for(const p of snowControls){
  await check(p.name+" contract",async()=>{
    const x=await get("/api/national-snow?lat="+p.lat+"&lon="+p.lon+"&state="+encodeURIComponent(p.state),{timeout:20000});
    if(!x.decision||!Array.isArray(x.sources)||x.sources.length!==3)throw new Error("missing Snow decision/source contract");
    if(x.context_radius_miles!==120||x.decision_radius_miles!==60)throw new Error("Snow geography radii drifted");
    if(x.sources.some(source=>source&&source.available===false&&source.stale===true))throw new Error("unavailable Snow source marked stale");
    if(x.sources.some(source=>source&&source.available!==false))snowControlsWithLiveSource+=1;
    if(localSnowLevels.has(x.decision.level)){
      const basis=x.decision.pack_basis;
      if(!basis||!Number.isFinite(Number(basis.distance_miles))||Number(basis.distance_miles)>60||!(Number(basis.value)>0))throw new Error("local Snow conclusion lacks measured pack inside 60 miles");
    }
    if(!localSnowLevels.has(x.decision.level)&&x.decision.melt_pressure&&x.decision.melt_pressure!=="not-evaluated")throw new Error("non-local Snow state unexpectedly carries evaluated melt pressure");
  });
}
await check("snow production has live source coverage",async()=>{
  if(snowControlsWithLiveSource<1)throw new Error("all Snow controls lost every source family");
});

for(const route of ["/national-tools/","/national-tools/aurora/","/national-tools/rivers/","/national-tools/coastal/","/national-tools/snow/","/national-tools/frost/","/national-tools/planting/","/national-tools/fall-color/","/national-tools/garden/","/national-tools/fall/","/national-tools/water/","/national-tools/night-sky/"]){
  await check(route+" page",async()=>{
    const body=await get(route,{json:false});
    if(!/<title>[^<]+<\/title>/i.test(body)||!body.includes("Chris Izworski"))throw new Error("page shell incomplete");
  });
}
await check("planting crop rules",async()=>{
  const x=await get("/data/national-planting-crops.json");
  const crops=Array.isArray(x)?x:x.crops;
  if(!Array.isArray(crops)||crops.length<20)throw new Error("expected at least 20 crop rules");
});
console.log("\n"+JSON.stringify({origin,checked_at:new Date().toISOString(),passed:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,results},null,2));
if(results.some(r=>!r.ok))process.exit(1);
