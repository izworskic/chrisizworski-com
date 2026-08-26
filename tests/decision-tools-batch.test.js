import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const b=JSON.parse(await readFile(new URL("../benchmarks/decision-tools-batch-2026-08-26.json",import.meta.url),"utf8"));
test("decision tool V2 declares four enforced loss functions and unique depth features",async()=>{
  assert.equal(b.version,"2.0.0");
  assert.equal(b.tools.length,6);
  assert.equal(Object.keys(b.lossFunctions).length,4);
  const features=new Set();
  for(const t of b.tools){
    assert.ok(t.bestFitScore>=b.buildThreshold,t.id);
    assert.ok(t.liveSources.length>=2,t.id);
    assert.equal(t.measurement.windowDays,28);
    assert.ok(t.v2Feature,t.id);
    features.add(t.v2Feature);
    const h=await readFile(new URL("../public/"+t.slug+"/index.html",import.meta.url),"utf8");
    assert.ok(h.includes('data-v2-feature="'+t.v2Feature+'"'),t.id);
    for(const id of ["compareAll","rankings","bestWindow","windowBars","scoreBreakdown","dataStack","siteMap"]) assert.ok(h.includes('id="'+id+'"'),t.id+" "+id);
  }
  assert.equal(features.size,6);
});
