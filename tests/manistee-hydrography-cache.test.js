const test=require("node:test");
const assert=require("node:assert/strict");
const nhd=require("../api/manistee-river-hydrography.js");
const {clearGeometryMemory,GEOMETRY_MEMORY_TTL_MS}=nhd._test;

function success(name){
  return {
    ok:true,status:200,
    async json(){return {type:"FeatureCollection",features:[{
      type:"Feature",
      properties:{gnis_name:name,reachcode:"123",fcode:46006},
      geometry:{type:"LineString",coordinates:[[-85.9,44.4],[-85.8,44.5]]}
    }]};}
  };
}

test("one successful source request supplies subsequent warm-instance river requests",async()=>{
  clearGeometryMemory();
  let calls=0;
  const fetcher=async()=>{calls++;return success("Pine River");};
  const first=await nhd.fetchHydrography({name:"Pine River",fetcher,cache:true});
  const again=await nhd.fetchHydrography({name:"Pine River",fetcher,cache:true});
  assert.equal(calls,1);
  assert.equal(first,again);
  assert.equal(again.sourceCompleteness,"complete-retrieved-set");
  assert.ok(GEOMETRY_MEMORY_TTL_MS>0 && GEOMETRY_MEMORY_TTL_MS<=86400000);
  clearGeometryMemory();
});

test("concurrent callers for the same waterway share one upstream request",async()=>{
  clearGeometryMemory();
  let calls=0;
  const fetcher=async()=>{calls++;await Promise.resolve();return success("Manistee River");};
  const [first,second]=await Promise.all([
    nhd.fetchHydrography({name:"Manistee River",fetcher,cache:true}),
    nhd.fetchHydrography({name:"Manistee River",fetcher,cache:true})
  ]);
  assert.equal(calls,1);
  assert.equal(first,second);
  clearGeometryMemory();
});

test("failed official responses are never cached as success or reused stale",async()=>{
  clearGeometryMemory();
  let calls=0;
  const offline=async()=>{calls++;throw new Error("official source offline");};
  await assert.rejects(nhd.fetchHydrography({name:"Pine River",fetcher:offline,cache:true}),/official source offline/);
  await assert.rejects(nhd.fetchHydrography({name:"Pine River",fetcher:offline,cache:true}),/official source offline/);
  assert.equal(calls,2);
  clearGeometryMemory();
});

test("invalid and incomplete geometry never enters the successful cache",async()=>{
  clearGeometryMemory();
  let calls=0;
  const truncated=async()=>{calls++;return {ok:true,status:200,json:async()=>({
    type:"FeatureCollection",features:[],exceededTransferLimit:true
  })};};
  await assert.rejects(nhd.fetchHydrography({name:"Pine River",fetcher:truncated,cache:true}),/marked incomplete/);
  await assert.rejects(nhd.fetchHydrography({name:"Pine River",fetcher:truncated,cache:true}),/marked incomplete/);
  assert.equal(calls,2);
  clearGeometryMemory();
});

test("invalid river IDs are blocked before any source request or cache lookup",async()=>{
  clearGeometryMemory();
  const fetcher=async()=>{throw new Error("must not call source");};
  await assert.rejects(nhd.fetchHydrography({name:"Not Manistee",fetcher,cache:true}),/Unsupported river name/);
});
