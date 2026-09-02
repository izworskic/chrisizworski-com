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
for(const p of places){
  await check(p.name+" geocode",async()=>{
    const x=await get("/api/national-geocode?q="+encodeURIComponent(p.q));
    if(!Number.isFinite(Number(x.latitude))||!x.timeZone)throw new Error("missing coordinates/timezone");
  });
  await check(p.name+" aurora",async()=>{
    const x=await get("/api/national-aurora?lat="+p.lat+"&lon="+p.lon);
    if(!x.sources||!x.retrieved_at)throw new Error("missing source contract");
  });
  await check(p.name+" rivers",async()=>{
    const x=await get("/api/national-rivers?lat="+p.lat+"&lon="+p.lon,{timeout:20000});
    if(!Array.isArray(x.gauges)||!x.sources)throw new Error("missing gauges/source contract");
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
for(const route of ["/national-tools/","/national-tools/aurora/","/national-tools/rivers/","/national-tools/frost/","/national-tools/planting/","/national-tools/fall-color/"]){
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
