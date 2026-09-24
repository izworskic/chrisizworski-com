"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");
const regional=require("../lib/detroit-outdoors/regional-discovery.js");
const expanded=require("../lib/detroit-outdoors/expanded-engines.js");

test("Detroit regional discovery widens the universe without random rotation",()=>{
  const source=fs.readFileSync(path.join(root,"lib/detroit-outdoors/regional-discovery.js"),"utf8");
  assert.match(source,/api\/discover/);
  assert.match(source,/maxDriveHours:2/);
  assert.match(source,/MAX_DISCOVERY_PLACES=18/);
  assert.match(source,/MAX_EVALUATED_PLACES=10/);
  assert.doesNotMatch(source,/Math\.random/);
  assert.doesNotMatch(source,/shuffle/i);
});

test("regional prefilter preserves utility order while limiting category and area monopolies",()=>{
  const select=regional._test.diversitySelect;
  const rows=[
    {name:"A",area:"East",category:"park",score:99,driveHours:.3},
    {name:"B",area:"East",category:"park",score:98,driveHours:.4},
    {name:"C",area:"East",category:"park",score:97,driveHours:.5},
    {name:"D",area:"West",category:"wildlife",score:96,driveHours:.8},
    {name:"E",area:"North",category:"viewpoint",score:95,driveHours:1.0},
    {name:"F",area:"South",category:"trailhead",score:94,driveHours:1.1}
  ];
  const selected=select(rows,5);
  assert.equal(selected.length,5);
  assert.equal(selected[0].name,"A");
  assert.ok(selected.some(row=>row.area==="West"));
  assert.ok(selected.some(row=>row.area==="North"));
});

test("regional candidates require weather and a successful NWS point-alert check",()=>{
  const build=regional._test.candidateFrom;
  const place={id:"osm:way:1",name:"Test Nature Preserve",area:"Wayne",latitude:42.4,longitude:-83.1,category:"park",categoryLabel:"Natural area",score:82,driveMinutes:32,source:"OpenStreetMap",sourceUrl:"https://www.openstreetmap.org/way/1"};
  const weather={high:68,low:51,precipitationProbability:10,windGust:14,cloudCover:30};
  assert.equal(build(place,weather,{ok:false,alerts:[]},"2026-09-24"),null);
  const safe=build(place,weather,{ok:true,alerts:[]},"2026-09-24");
  assert.ok(safe);
  assert.equal(safe.sourceEngine,"regional-discovery");
  assert.equal(safe.standout,false);
  assert.equal(safe.hardStops.length,0);
  assert.ok(safe.verifiedEvidence.length>=3);
  const stopped=build(place,weather,{ok:true,alerts:[{event:"Tornado Warning",severity:"Extreme",certainty:"Observed",headline:"Warning"}]},"2026-09-24");
  assert.ok(stopped.hardStops.length>0);
});

test("expanded engine wrapper keeps established engines and appends regional discovery",()=>{
  assert.equal(typeof expanded.loadExpandedEngineStates,"function");
  assert.equal(typeof expanded.emitExpandedCandidates,"function");
  assert.equal(typeof expanded._test.birdCandidate,"function");
  assert.equal(typeof expanded._test.regionalDiscovery.weatherScore,"function");
  const emitted=expanded.emitExpandedCandidates({placeStates:[],expandedStates:{regionalDiscovery:{ok:true,data:{candidates:[{id:"x"}]}}}});
  assert.deepEqual(emitted.byEngine["regional-discovery"],[{id:"x"}]);
  assert.ok(emitted.candidates.some(row=>row.id==="x"));
});
