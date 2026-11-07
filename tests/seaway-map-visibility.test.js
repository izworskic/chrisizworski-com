'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../public/assets/seaway-core');
const read=p=>fs.readFileSync(p,'utf8');
const fixture=()=>{
  const ships=[];
  const add=(n,lat,lon)=>{for(let i=0;i<n;i++)ships.push({
    mmsi:String(300000001+ships.length),name:'TEST VESSEL '+ships.length,
    lat:lat+(i%4)*0.0004,lon:lon+(i%5)*0.0004,seen:'2026-11-07T13:00:00Z'
  });};
  add(15,45.5,-73.54);add(3,45.31,-73.92);add(8,44.3,-76);
  return ships;
};
const project=v=>({x:v.lon*400,y:v.lat*400});
test('26 real input observations become obvious grouped symbols without losing a ship',()=>{
  const ships=fixture();
  const groups=C.groupMapReports(ships,project,67);
  assert.deepEqual(groups.map(g=>g.count).sort((a,b)=>a-b),[3,8,15]);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),ships.length);
  assert.equal(new Set(groups.flatMap(g=>g.vessels.map(v=>v.mmsi))).size,26);
  for(const group of groups){
    assert.ok(group.lat>=group.bounds[0][0]&&group.lat<=group.bounds[1][0]);
    assert.ok(group.lon>=group.bounds[0][1]&&group.lon<=group.bounds[1][1]);
    assert.deepEqual(group.vessels.map(v=>v.mmsi),[...group.vessels.map(v=>v.mmsi)].sort());
  }
});
test('changing zoom allows separate positions and never invents a new report',()=>{
  const ships=fixture();
  const separated=[{...ships[0],lon:-73.5},{...ships[1],lon:-73.8}];
  const groups=C.groupMapReports(separated,project,19);
  assert.equal(groups.length,2);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),2);
});
test('selected vessel must be independently visible even if other observations share its position',()=>{
  const ships=fixture(),selected=ships[0].mmsi;
  const groups=C.groupMapReports(ships,project,67,selected);
  assert.equal(groups.reduce((n,g)=>n+g.count,0),26);
  assert.equal(groups.filter(g=>g.count===1&&g.vessels[0].mmsi===selected).length,1);
  assert.equal(groups.some(g=>g.count===14),true);
});
test('input order does not determine grouping, location estimates or vessel ownership',()=>{
  const ships=fixture();
  const a=C.groupMapReports(ships,project,67),b=C.groupMapReports([...ships].reverse(),project,67);
  const signature=g=>g.map(x=>[x.id,x.count,x.lat,x.lon]).sort((p,q)=>p[0].localeCompare(q[0]));
  assert.deepEqual(signature(a),signature(b));
});
test('map has actual counted ship markers, an in-map report counter, source confidence and drill-down controls',()=>{
  const js=read('public/assets/seaway.js'),css=read('public/assets/seaway.css');
  assert.match(js,/C\.groupMapReports\(/);
  assert.match(js,/data-vessel-count/);
  assert.match(js,/seaway-vessel-cluster/);
  assert.match(js,/mapReportBadge\.replaceChildren/);
  assert.match(js,/inspectVesselGroup\(/);
  assert.match(js,/group\.vessels\)/);
  assert.match(js,/map\.fitBounds/);
  assert.match(js,/chooseShip\(v\.mmsi,true\)/);
  assert.match(js,/zIndexOffset:1250/);
  assert.match(js,/zIndexOffset:v\.mmsi===selectedShip\?1800:1100/);
  assert.match(css,/\.seaway-vessel-cluster\.leaflet-marker-icon/);
  assert.match(css,/\.seaway-map-report-badge\.leaflet-control/);
  assert.match(css,/\.seaway-cluster-choice:focus-visible/);
  assert.match(js,/Positions are reports, not guaranteed arrivals/);
  for(const slug of ['st-lawrence-seaway','eisenhower-lock']){
    const html=read('public/'+slug+'/index.html');
    for(const asset of ['seaway.css','seaway-core.js','seaway.js'])
      assert.ok(html.includes('/assets/'+asset+'?v=20261107b'),slug+' old asset version '+asset);
    assert.match(html,/name="robots" content="index,follow,max-image-preview:large"/);
  }
});
