const test=require("node:test");
const assert=require("node:assert/strict");
const graph=require("../public/assets/manistee-route-core.js");

function line(coords){return {type:"Feature",geometry:{type:"LineString",coordinates:coords}};}
function point(coord){return {lat:coord[1],lon:coord[0]};}
test("shared graph routing chooses the shortest joined NHD path",()=>{
  const a=[-85.7,44.2],b=[-85.65,44.2],c=[-85.6,44.2],d=[-85.65,44.25];
  const features=[line([a,b,c]),line([a,d,c])];
  const network=graph.buildGraph(features);
  const route=graph.routeGraph(network,point(a),point(c));
  assert.ok(route);
  const direct=graph.hav(pointArray(a),pointArray(b))+graph.hav(pointArray(b),pointArray(c));
  assert.ok(Math.abs(route.distance-direct)<.01);
  assert.deepEqual(route.path[0],[a[1],a[0]]);
  assert.deepEqual(route.path.at(-1),[c[1],c[0]]);
  function pointArray(x){return [x[1],x[0]];}
});
test("large mapped reach is traversed without missing endpoints",()=>{
  const coords=Array.from({length:2001},(_,i)=>[-85.8+i*0.00005,44.2]);
  const route=graph.routeGraph(graph.buildGraph([line(coords)]),point(coords[0]),point(coords.at(-1)));
  assert.ok(route);
  assert.equal(route.path.length,coords.length);
  assert.ok(route.distance>4);
});
test("disconnected NHD lines never become a straight-line route",()=>{
  const a=[-85.7,44.2],b=[-85.69,44.2],c=[-85.68,44.2],d=[-85.67,44.2];
  const route=graph.routeGraph(graph.buildGraph([line([a,b]),line([c,d])]),point(a),point(d));
  assert.equal(route,null);
});
test("out-of-channel point snap is not silently permitted",()=>{
  const a=[-85.7,44.2],b=[-85.6,44.2];
  const network=graph.buildGraph([line([a,b])]);
  assert.equal(graph.routeGraph(network,{lat:44.22,lon:-85.7},point(b)),null);
});
