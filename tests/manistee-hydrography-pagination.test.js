const test=require("node:test");
const assert=require("node:assert/strict");
const hydro=require("../api/manistee-river-hydrography.js");
const {queryUrl,PAGE_SIZE,MAX_PAGES_PER_WATERWAY,fetchNamedWaterway,requestGeoJson}=hydro._test;

function feature(name,i){
  return {
    type:"Feature",
    properties:{gnis_name:name,OBJECTID:i+1,reachcode:String(i),fcode:46006},
    geometry:{type:"LineString",coordinates:[[-85.9,44.4],[-85.8,44.5]]},
  };
}
function response(features,status=200,extras={}){
  return {ok:status===200,status,json:async()=>({type:"FeatureCollection",features,...extras})};
}
test("paginates a whitelisted official NHD river ordered by OBJECTID",()=>{
  const u=new URL(queryUrl("Manistee River",PAGE_SIZE*2));
  assert.equal(u.searchParams.get("where"),"gnis_name='Manistee River'");
  assert.equal(u.searchParams.get("orderByFields"),"OBJECTID ASC");
  assert.equal(u.searchParams.get("resultOffset"),String(PAGE_SIZE*2));
  assert.equal(u.searchParams.get("resultRecordCount"),String(PAGE_SIZE));
  assert.match(u.origin,/nationalmap\.gov/);
  assert.throws(()=>queryUrl("Unknown River"));
  assert.throws(()=>queryUrl("Pine River",-10));
});
test("all complete official NHD pages are represented without duplicate identities",async()=>{
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    const offset=Number(new URL(url).searchParams.get("resultOffset"));
    return offset===0 ?
      response(Array.from({length:PAGE_SIZE},(_,i)=>feature("Pine River",i)),200,{exceededTransferLimit:true}) :
      response([feature("Pine River",PAGE_SIZE-1),...Array.from({length:11},(_,i)=>feature("Pine River",i+PAGE_SIZE))]);
  };
  const data=await fetchNamedWaterway("Pine River",{fetcher});
  assert.equal(data.length,PAGE_SIZE+11);
  assert.equal(new Set(data.map(f=>f.properties.objectId)).size,data.length);
  assert.equal(urls.length,2);
});
test("incomplete, malformed or mismatched NHD pages never become route geometry",async()=>{
  const noId=async()=>response([{...feature("Manistee River",1),properties:{gnis_name:"Manistee River"}}]);
  await assert.rejects(fetchNamedWaterway("Manistee River",{fetcher:noId}),/missing object identity/);
  const wrong=async()=>response([feature("Bear Creek",1)]);
  await assert.rejects(fetchNamedWaterway("Manistee River",{fetcher:wrong}),/mismatched/);
  const failure=async()=>response([],502);
  await assert.rejects(requestGeoJson(queryUrl("Pine River",0),{fetcher:failure}),/unavailable/);
  const fake=async()=>response([],200,{error:{message:"ArcGIS unavailable"}});
  await assert.rejects(requestGeoJson(queryUrl("Pine River",0),{fetcher:fake}),/unavailable/);
});
test("source pagination cap fails closed instead of emitting an incomplete route",async()=>{
  const repeating=async()=>response(Array.from({length:PAGE_SIZE},(_,i)=>feature("Pine River",i)),200,{exceededTransferLimit:true});
  await assert.rejects(fetchNamedWaterway("Pine River",{fetcher:repeating}),/page cap exceeded/);
});
test("selected-river requests avoid whole-basin queries and preserve completeness",async()=>{
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    return response([feature("Pine River",1)]);
  };
  const data=await hydro.fetchHydrography({name:"Pine River",fetcher});
  assert.equal(data.retrievalMode,"paged-single-waterway");
  assert.equal(data.sourceCompleteness,"complete-retrieved-set");
  assert.deepEqual(data.requestedWaterways,["Pine River"]);
  assert.equal(urls.length,1);
  assert.equal(new URL(urls[0]).searchParams.get("where"),"gnis_name='Pine River'");
});
test("full basin audit uses only named USGS queries and requires source completeness",async()=>{
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    const name=new URL(url).searchParams.get("where").replace(/^gnis_name='|'$/g,"");
    return response(Array.from({length:10},(_,i)=>feature(name,i)));
  };
  const data=await hydro.fetchHydrography({fetcher});
  assert.equal(data.features.length,40);
  assert.equal(data.complete,true);
  assert.equal(data.requestedWaterways.length,4);
  assert.equal(urls.length,4);
  assert.ok(urls.every(u=>new URL(u).hostname==="hydro.nationalmap.gov"));
});
