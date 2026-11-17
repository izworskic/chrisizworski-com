const test=require("node:test");
const assert=require("node:assert/strict");
const nhd=require("../api/manistee-river-hydrography.js");
const {queryUrl,PAGE_SIZE,MAX_PAGES,fetchNhdPage,fetchPagesForName}=nhd._test;

function feature(name,i){
  return {
    type:"Feature",
    properties:{gnis_name:name,reachcode:String(i),fcode:46006},
    geometry:{type:"LineString",coordinates:[[-85.9,44.4],[-85.8,44.5]]}
  };
}
function response(features,status=200,extras={}){
  return {ok:status===200,status,json:async()=>({type:"FeatureCollection",features,...extras})};
}
test("page requests are constrained to official USGS named rivers and bounded offsets",()=>{
  const u=new URL(queryUrl({name:"Manistee River",page:2}));
  assert.equal(u.searchParams.get("where"),"gnis_name='Manistee River'");
  assert.equal(u.searchParams.get("orderByFields"),"OBJECTID");
  assert.equal(u.searchParams.get("resultOffset"),String(PAGE_SIZE*2));
  assert.equal(u.searchParams.get("resultRecordCount"),String(PAGE_SIZE));
  assert.match(u.origin,/nationalmap\.gov/);
  assert.throws(()=>queryUrl({name:"Unknown River"}));
  assert.throws(()=>queryUrl({name:"Pine River",page:MAX_PAGES}));
});
test("complete consecutive source pages are collected",async()=>{
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    const offset=Number(new URL(url).searchParams.get("resultOffset"));
    return offset===0?response(Array.from({length:PAGE_SIZE},(_,i)=>feature("Pine River",i)),200,{exceededTransferLimit:true}):
      response(Array.from({length:11},(_,i)=>feature("Pine River",i+PAGE_SIZE)));
  };
  const data=await fetchPagesForName("Pine River",fetcher);
  assert.equal(data.length,PAGE_SIZE+11);
  assert.equal(urls.length,2);
  assert.equal(new URL(urls[1]).searchParams.get("resultOffset"),String(PAGE_SIZE));
});
test("partial and malformed source responses cannot be presented as complete",async()=>{
  const truncated=async()=>response([feature("Manistee River",1)],200,{exceededTransferLimit:true});
  await assert.rejects(fetchNhdPage(queryUrl(),truncated),/incomplete/);
  await assert.rejects(fetchPagesForName("Manistee River",truncated),/marked incomplete/);
  const wrong=async()=>response([feature("Bear Creek",1)]);
  await assert.rejects(fetchPagesForName("Manistee River",wrong),/Unexpected river/);
  const bad=async()=>response([],200,{error:{message:"ArcGIS unavailable"}});
  await assert.rejects(fetchNhdPage(queryUrl(),bad),/invalid/);
});
test("page limit refuses incomplete named-waterway coverage",async()=>{
  const page=async()=>response(Array.from({length:PAGE_SIZE},(_,i)=>feature("Pine River",i)),200,{exceededTransferLimit:true});
  await assert.rejects(fetchPagesForName("Pine River",page),/page limit reached/);
});
test("selected-river request never requires all four basin names",async()=>{
  const urls=[];
  const fetcher=async url=>{urls.push(url);return response([feature("Pine River",1)])};
  const data=await nhd.fetchHydrography({name:"Pine River",fetcher});
  assert.equal(data.retrievalMode,"paged-single-waterway");
  assert.equal(data.sourceCompleteness,"complete-retrieved-set");
  assert.deepEqual(data.requestedWaterways,["Pine River"]);
  assert.equal(urls.length,1);
  assert.equal(new URL(urls[0]).searchParams.get("where"),"gnis_name='Pine River'");
});
test("failed broad query can recover only from the same official USGS NHD layer",async()=>{
  const urls=[];
  const fetcher=async url=>{
    urls.push(url);
    if(!new URL(url).searchParams.has("resultOffset"))return response([],502);
    const name=new URL(url).searchParams.get("where").replace(/^gnis_name='|'$/g,"");
    return response([feature(name,1)]);
  };
  const data=await nhd.fetchHydrography({fetcher});
  assert.equal(data.retrievalMode,"paged-official-recovery");
  assert.equal(data.sourceCompleteness,"complete-retrieved-set");
  assert.equal(data.features.length,4);
  assert.equal(urls.length,5);
  assert.ok(urls.every(u=>new URL(u).hostname==="hydro.nationalmap.gov"));
});
