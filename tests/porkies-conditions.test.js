const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const source=fs.readFileSync(path.join(root,'public/assets/porkies-conditions.js'),'utf8');
const html=fs.readFileSync(path.join(root,'public/porcupine-mountains/index.html'),'utf8');
const engineSource=fs.readFileSync(path.join(root,'public/assets/porkies-explorer.js'),'utf8');
const box={module:{exports:{}},globalThis:{}};
vm.runInNewContext(source,box);
const desk=box.module.exports;
const engineBox={module:{exports:{}},globalThis:{}};
vm.runInNewContext(engineSource,engineBox);
const engine=engineBox.module.exports;
test('DNR GIS references are bounded by park region and source-owned',()=>{
 const closure=desk.sourceQuery(0),reroute=desk.sourceQuery(1),bridge=desk.bridgeQuery();
 assert.match(closure,/DNRTrailsOPENDATA\/FeatureServer\/0\/query\?/);
 assert.match(reroute,/DNRTrailsOPENDATA\/FeatureServer\/1\/query\?/);
 assert.match(bridge,/DNRReferenceAssetsOPENDATA\/FeatureServer\/0\/query\?/);
 for(const url of [closure,reroute,bridge]){
  assert.match(url,/esriGeometryEnvelope/);
  assert.match(url,/returnGeometry=false/);
  assert.match(url,/resultRecordCount=30/);
 }
});
test('zero GIS closure records never becomes an open-state claim',()=>{
 const zero=desk.assessSample('closure',{features:[]});
 assert.equal(zero.state,'observed');
 assert.equal(zero.count,0);
 assert.notEqual(zero.state,'open');
 assert.equal(desk.assessSample('closure',null).state,'unknown');
 assert.equal(desk.assessSample('closure',{error:{message:'down'}}).state,'unknown');
 assert.equal(desk.assessSample('closure',{features:[],exceededTransferLimit:true}).state,'unknown');
 assert.equal(desk.assessSample('closure',{features:new Array(30).fill({attributes:{}})}).mayBeTruncated,true);
});
test('bridge inventory is NOT a condition inspection',()=>{
 const val=desk.bridgeAssessment({features:[{attributes:{OBJECTID:163,ASSETDETAILTYPE:'Vehicular',CONDITION:null}}]});
 assert.equal(val.count,1);
 assert.equal(val.inspected,0);
 assert.equal(val.types[0],'Vehicular');
 assert.equal(desk.bridgeAssessment(null).state,'unknown');
});
test('all road seasons remain qualified, never confirmed open',()=>{
 const winter=desk.modeForDate('2027-01-15',engine);
 assert.equal(winter.code,'restricted');
 assert.match(winter.text,/December 1|M-107/);
 assert.match(winter.text,/519/);
 const spring=desk.modeForDate('2027-05-15',engine);
 assert.equal(spring.code,'uncertain');
 assert.match(spring.text,/reopening|safe/i);
 const shoulder=desk.modeForDate('2026-11-20',engine);
 assert.equal(shoulder.code,'uncertain');
 const summer=desk.modeForDate('2026-10-30',engine);
 assert.equal(summer.code,'unknown');
 assert.match(summer.text,/no authoritative live/i);
 assert.equal(desk.modeForDate('nonsense',engine).code,'unknown');
});
test('trailhead matching is explicit; 15 unproven paths receive warnings',()=>{
 for(const name of ['Summit Peak Tower Trail','Visitor Center Nature Trail','West River Trail','East River Trail','Escarpment Trail','Pinkerton Trail']){
  assert.ok(source.includes('"'+name+'":'),name+' must have explicit source match');
 }
 assert.match(source,/Parking-to-trailhead connection NOT verified/);
 assert.match(source,/Do not navigate to the trail.s generic GIS coordinate/);
 assert.match(html,/id="park-access-evidence"/);
 assert.match(html,/id="park-gis-verdict"/);
 assert.match(html,/porkies-conditions\.js/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/dateModified":"2026-10-31"/);
 assert.doesNotMatch(html,/parking available now|bridge certified safe|all park roads open/i);
});
