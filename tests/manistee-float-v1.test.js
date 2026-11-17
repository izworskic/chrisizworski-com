const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const api = require("../api/manistee-float-v1.js");
const hydro = require("../api/manistee-river-hydrography.js");
const data = require("../public/assets/manistee-river-data.js");
const graph = require("../public/assets/manistee-route-core.js");

function res() {
  const headers = {};
  return {
    headers, code: 200, body: null, ended: false,
    setHeader(k,v){headers[k]=v;return this;},
    status(code){this.code=code;return this;},
    json(body){this.body=body;return this;},
    end(){this.ended=true;return this;},
  };
}
async function call(query={},method="GET"){
  const output=res();
  await api({method,query},output);
  return output;
}
function lineBetween(a,b,steps=24) {
  return Array.from({length:steps+1},(_,i)=>{
    const p=i/steps;
    return [a.lon+(b.lon-a.lon)*p,a.lat+(b.lat-a.lat)*p];
  });
}
function sampleHydrography(a,b,waterway) {
  return {
    source:"USGS National Hydrography Dataset",
    fetched_at:"2026-11-17T00:00:00.000Z",
    features:[{type:"Feature",geometry:{type:"LineString",coordinates:lineBetween(a,b)},
      properties:{name:waterway}}],
  };
}
test("public catalog reads the same access source as the field map",async()=>{
  const result=await call({mode:"access"});
  assert.equal(result.code,200);
  assert.equal(result.body.contract,"manistee-float/v1");
  assert.equal(result.body.registryVersion,data.version);
  const access=data.places.filter(p=>p.type==="access"||p.type==="access-camp");
  assert.ok(data.places.length>=53,"Expanded Manistee source corpus must be loaded");
  assert.ok(access.length>=37,"Full coverage layer must be reflected in the API");
  assert.equal(result.body.access.length,access.length);
  assert.equal(result.body.registryAuditDate,"2026-08-20");
  const highBridge=result.body.access.find(point=>point.id==="high-bridge");
  assert.equal(highBridge.accessCaution,"route-caution");
  assert.match(highBridge.note,/washout|closure/i);
  for(const point of result.body.access) {
    const owner=access.find(p=>p.id===point.id);
    assert.ok(owner);
    assert.equal(point.latitude,owner.lat);
    assert.equal(point.longitude,owner.lon);
    assert.equal(point.provenance.url,owner.source.url);
    assert.equal(point.currentAccessVerified,false);
    assert.match(point.specialistLink,/^https:\/\/chrisizworski\.com\/manistee-river-map\/#/);
  }
  assert.match(result.headers["X-Robots-Tag"],/noindex/);
});
test("invalid, same-point and cross-waterway trips cannot reach NHD",async()=>{
  assert.equal((await call({mode:"route",from:"no-such-place",to:"ccc"})).body.error,"ACCESS_NOT_FOUND");
  assert.equal((await call({mode:"route",from:"ccc",to:"ccc"})).body.error,"SAME_ACCESS");
  assert.equal((await call({mode:"route",from:"ccc",to:"pine-elm-flats"})).body.error,"DIFFERENT_WATERWAYS");
  assert.equal((await call({mode:"route",from:"ccc",to:"red-bridge",speedMph:"100"})).body.error,"INVALID_PLANNING_SPEED");
  assert.equal((await call({mode:"route",from:"../ccc",to:"sharon"})).body.error,"INVALID_ACCESS_ID");
  assert.equal((await call({mode:"test"})).body.error,"INVALID_MODE");
});
test("one graph implementation drives a route, with geometry only by request",async()=>{
  const a=data.places.find(p=>p.id==="pine-elm-flats");
  const b=data.places.find(p=>p.id==="pine-peterson");
  const original=hydro.fetchHydrography;
  try{
    hydro.fetchHydrography=async()=>sampleHydrography(a,b,"Pine River");
    const ordinary=await call({mode:"route",from:a.id,to:b.id,speedMph:"3"});
    assert.equal(ordinary.code,200);
    assert.equal(ordinary.body.contract,"manistee-float/v1");
    assert.equal(ordinary.body.route.geometry,null);
    assert.ok(ordinary.body.route.miles>0);
    assert.equal(ordinary.body.navigabilityVerified,false);
    assert.equal(ordinary.body.directionVerified,false);
    assert.equal(ordinary.body.currentAccessVerified,false);
    assert.equal(ordinary.body.route.estimateOnly,true);
    const mapped=await call({mode:"route",from:a.id,to:b.id,geometry:"1"});
    assert.equal(mapped.code,200);
    assert.equal(mapped.body.route.geometry.type,"LineString");
    assert.deepEqual(mapped.body.route.geometry.coordinates[0],[a.lon,a.lat]);
    assert.deepEqual(mapped.body.route.geometry.coordinates.at(-1),[b.lon,b.lat]);
    const pure=graph.routeGraph(graph.buildGraph(sampleHydrography(a,b,"Pine River").features),a,b);
    assert.equal(mapped.body.route.miles,Math.round(pure.distance*100)/100);
  }finally{
    hydro.fetchHydrography=original;
  }
});
test("unmatched geometry yields unavailable, never straight-line mileage",async()=>{
  const a=data.places.find(p=>p.id==="pine-elm-flats");
  const b=data.places.find(p=>p.id==="pine-peterson");
  const orig=hydro.fetchHydrography;
  try{
    hydro.fetchHydrography=async()=>({features:[],fetched_at:"2026-11-17T00:00:00Z"});
    let answer=await call({mode:"route",from:a.id,to:b.id});
    assert.equal(answer.code,503);
    assert.equal(answer.body.error,"WATERWAY_GEOMETRY_MISSING");
    assert.equal("miles" in answer.body,false);
    hydro.fetchHydrography=async()=>{throw new Error("offline");};
    answer=await call({mode:"route",from:a.id,to:b.id});
    assert.equal(answer.code,503);
    assert.equal(answer.body.error,"HYDROGRAPHY_UNAVAILABLE");
    assert.equal(answer.headers["Cache-Control"],"no-store");
  }finally{
    hydro.fetchHydrography=orig;
  }
});
test("HEAD does not call hydrography or return a body",async()=>{
  const a=data.places.find(p=>p.id==="pine-elm-flats");
  const b=data.places.find(p=>p.id==="pine-peterson");
  const orig=hydro.fetchHydrography;
  try{
    hydro.fetchHydrography=async()=>{throw new Error("should not request hydro");};
    const answer=await call({mode:"route",from:a.id,to:b.id},"HEAD");
    assert.equal(answer.code,200);
    assert.equal(answer.ended,true);
    assert.equal(answer.body,null);
  }finally{hydro.fetchHydrography=orig;}
});
test("existing map continues to use the same pure engine and unchanged canonical",()=>{
  const html=fs.readFileSync("public/manistee-river-map/index.html","utf8");
  const client=fs.readFileSync("public/assets/manistee-river-map.js","utf8");
  const core=fs.readFileSync("public/assets/manistee-route-core.js","utf8");
  assert.match(html,/rel="canonical" href="https:\/\/chrisizworski\.com\/manistee-river-map\/"/);
  assert.ok(html.indexOf('/assets/manistee-route-core.js')<html.indexOf('/assets/manistee-river-map.js'));
  assert.match(client,/ManisteeRouteCore\.routeGraph/);
  assert.match(client,/ManisteeRouteCore\.buildGraph/);
  assert.match(core,/function routeGraph\(graph,start,end\)/);
  assert.doesNotMatch(client,/const dist=new Map\(\[\[a\.key,0\]\]\)/);
});

test("dateModified and sitemap remain honest for edited Manistee page",()=>{
  const html=fs.readFileSync("public/manistee-river-map/index.html","utf8");
  const xml=fs.readFileSync("public/sitemap-manistee.xml","utf8");
  assert.match(html,/"dateModified":"2026-11-17"/);
  assert.match(xml,/<lastmod>2026-11-17<\/lastmod>/);
  assert.doesNotMatch(xml,/<\/lastmod>>/);
});
