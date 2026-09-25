"use strict";

const test=require("node:test");
const assert=require("node:assert/strict");
const {buildGoogleMapsHandoff,GOOGLE_MAPS_MAX_WAYPOINTS}=require("../lib/blue-ridge-parkway/google-maps.js");

const start={lat:35.513,lon:-83.303,milepost:469.1};
const finish={lat:37.228,lon:-79.946,milepost:121.4};
const stops=[
  {id:"waterrock",lat:35.4598,lon:-83.1404,milepost:451.2},
  {id:"crabtree",lat:35.819671,lon:-82.149581,milepost:339.5},
  {id:"cumberland",lat:36.436501,lon:-81.070557,milepost:217.5},
  {id:"rocky",lat:36.8110,lon:-80.3480,milepost:169}
];
const anchors=[
  ...stops,
  {id:"graveyard",lat:35.3215,lon:-82.8474,milepost:418.8},
  {id:"linn",lat:36.0923,lon:-81.8290,milepost:304.4},
  {id:"doughton",lat:36.4355,lon:-81.15,milepost:241.1}
];

function waypointCoords(url){const u=new URL(url);return(u.searchParams.get("waypoints")||"").split("|").filter(Boolean);}

test("point-to-point Google Maps handoff preserves every planned stop in drive order",()=>{
  const handoff=buildGoogleMapsHandoff({start,destination:finish,stops,anchors,startMile:start.milepost,endMile:finish.milepost});
  const waypoints=waypointCoords(handoff.url);
  assert.equal(handoff.complete,true);
  assert.equal(handoff.plannedStopCount,stops.length);
  assert.ok(waypoints.length<=GOOGLE_MAPS_MAX_WAYPOINTS);
  const planned=stops.map(s=>`${s.lat.toFixed(5)},${s.lon.toFixed(5)}`);
  let cursor=-1;
  for(const coordinate of planned){const next=waypoints.indexOf(coordinate);assert.ok(next>cursor,`${coordinate} should appear in route order`);cursor=next;}
  const u=new URL(handoff.url);
  assert.equal(u.searchParams.get("origin"),`${start.lat.toFixed(5)},${start.lon.toFixed(5)}`);
  assert.equal(u.searchParams.get("destination"),`${finish.lat.toFixed(5)},${finish.lon.toFixed(5)}`);
});

test("long point-to-point handoff may add drive-through Parkway anchors without dropping planned stops",()=>{
  const sparseStops=[stops[0]];
  const handoff=buildGoogleMapsHandoff({start,destination:finish,stops:sparseStops,anchors,startMile:start.milepost,endMile:finish.milepost});
  assert.equal(handoff.complete,true);
  assert.ok(handoff.routeAnchorCount>=1);
  assert.ok(waypointCoords(handoff.url).includes(`${sparseStops[0].lat.toFixed(5)},${sparseStops[0].lon.toFixed(5)}`));
});

test("round-trip handoff mirrors outbound routing points so the return is pulled back onto the Parkway",()=>{
  const gateway={lat:35.564,lon:-82.544,milepost:384.1};
  const roundStops=[
    {id:"folk",lat:35.5928,lon:-82.4817,milepost:382},
    {id:"craggy",lat:35.7042,lon:-82.3737,milepost:364}
  ];
  const roundAnchors=[...roundStops,{id:"mitchell",lat:35.7644,lon:-82.2651,milepost:355.3}];
  const handoff=buildGoogleMapsHandoff({start:gateway,destination:gateway,stops:roundStops,anchors:roundAnchors,startMile:384.1,endMile:355.3,roundTrip:true});
  const waypoints=waypointCoords(handoff.url);
  assert.equal(handoff.complete,true);
  assert.equal(handoff.returnConstrained,true);
  assert.ok(waypoints.length<=GOOGLE_MAPS_MAX_WAYPOINTS);
  assert.equal(waypoints[0],waypoints.at(-1));
  const u=new URL(handoff.url);
  assert.equal(u.searchParams.get("origin"),u.searchParams.get("destination"));
});


test("both planner engines serialize the shared full-route Google Maps handoff",()=>{
  const fs=require("node:fs");
  const engine=fs.readFileSync(require.resolve("../lib/blue-ridge-parkway/engine.js"),"utf8");
  const point=fs.readFileSync(require.resolve("../lib/blue-ridge-parkway/point-to-point.js"),"utf8");
  const browser=fs.readFileSync(require.resolve("../public/assets/blue-ridge-parkway.js"),"utf8");
  assert.match(engine,/buildGoogleMapsHandoff/);
  assert.match(point,/buildGoogleMapsHandoff/);
  assert.match(browser,/Open full drive in Google Maps/);
  assert.match(browser,/Parkway routing anchor/);
});
