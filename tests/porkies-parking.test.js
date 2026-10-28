const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');
const published=JSON.parse(fs.readFileSync(path.join(root,'public/porcupine-mountains/access-points.json'),'utf8'));
const audit=JSON.parse(fs.readFileSync(path.join(root,'data/porkies-parking-crosswalk.json'),'utf8'));
const html=fs.readFileSync(path.join(root,'public/porcupine-mountains/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'public/assets/porkies-explorer.css'),'utf8');
const js=fs.readFileSync(path.join(root,'public/assets/porkies-access-map.js'),'utf8');
const sandbox={module:{exports:{}},globalThis:{}};
vm.runInNewContext(js,sandbox,{filename:'porkies-access-map.js'});
const {season,eligibility,urlFor,nameFor}=sandbox.module.exports;
const approxMeters=(a,b)=>{
 const radians=Math.PI/180,R=6371000;
 const dLat=(b.lat-a.lat)*radians,dLon=(b.lon-a.lon)*radians;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*radians)*Math.cos(b.lat*radians)*Math.sin(dLon/2)**2;
 return R*2*Math.asin(Math.sqrt(h));
};
test('parking crosswalk retains all 16 original DNR assets with exactly six selected',()=>{
 assert.equal(audit.total,16);assert.equal(audit.records.length,16);
 assert.equal(published.points.length,6);assert.equal(audit.heldBack,10);
 const selected=audit.records.filter(x=>x.decision==='published');
 assert.equal(selected.length,6);
 assert.deepEqual(selected.map(x=>x.parkingAssetId).sort((a,b)=>a-b),published.points.map(x=>x.parkingAssetId).sort((a,b)=>a-b));
 assert.equal(new Set(audit.records.map(x=>x.parkingAssetId)).size,16);
 assert.equal(new Set(published.points.map(x=>x.id)).size,6);
});
test('each public location is a DNR parking asset corroborated by independent named trail within 100 m',()=>{
 for(const p of published.points){
   assert.equal(p.status,'dnr-mapped-crosschecked-not-current');
   assert.ok(Number.isInteger(p.parkingAssetId)&&Number.isInteger(p.recPointId));
   assert.ok(p.pageUrl.startsWith('https://www.michigan.gov/recsearch/data/locations/trails-l-p/'));
   const m=approxMeters({lat:p.lat,lon:p.lon},{lat:p.namedRecreationLat,lon:p.namedRecreationLon});
   assert.ok(m<=100,p.id+' source features too far apart '+m);
   assert.ok(Math.abs(m-p.separationMeters)<3,p.id+' stated distance differs from geographic calculation '+m);
   assert.match(p.coordinatesPurpose,/no claim of vacancy, open gate, plowed lot, or precise pedestrian entrance/i);
   assert.ok(!/guaranteed open|currently open|plowed today/i.test(p.status+p.coordinatesPurpose));
 }
});
test('no directions published for the other ten geographic asset candidates',()=>{
 for(const r of audit.records.filter(x=>x.decision==='hold')){
   assert.ok(!published.points.some(p=>p.parkingAssetId===r.parkingAssetId),'unreviewed parking asset '+r.parkingAssetId);
   assert.ok(!html.includes('data-parking-id="'+r.parkingAssetId+'"'));
 }
});
test('all six mapped cards render server-side and retain source links with JS disabled',()=>{
 for(const p of published.points){
   assert.ok(html.includes('data-parking-id="'+p.id+'"'),p.id);
   assert.ok(html.includes(p.title),p.title);
   assert.ok(html.includes(p.pageUrl),p.pageUrl);
 }
 assert.equal((html.match(/class="parking-card"/g)||[]).length,6);
 assert.match(html,/id="parking-map"/);
 assert.match(html,/id="parking-list"/);
 assert.match(html,/name="robots" content="noindex,follow"/);
 assert.match(html,/assets\/vendor\/leaflet-1.9.4.css/);
 assert.match(css,/\.parking-card\.selected-plan/);
});
test('map-only routing policy blocks closed or uncertain seasonal roads',()=>{
 const byId=Object.fromEntries(published.points.map(p=>[p.id,p]));
 for(const id of ['lake','summit','pinkerton']){
   assert.equal(eligibility(byId[id],'2027-01-15').canDirect,false,id+' wrongly winter routed');
   assert.equal(eligibility(byId[id],'2027-05-15').canDirect,false,id+' wrongly assumed spring opening');
   assert.equal(eligibility(byId[id],'2026-11-15').canDirect,false,id+' falsely routed during ambiguous November');
   assert.equal(eligibility(byId[id],'2027-08-15').canDirect,true,id+' did not offer summer directions');
 }
 assert.equal(eligibility(byId.presque,'2027-01-15','west').canDirect,false,'unresolved September 2026 township CR519/M28 notice forbids unchecked Google driving URLs');
 assert.match(eligibility(byId.presque,'2027-01-15','west').notice,/Johnson Road/);
 assert.match(eligibility(byId.presque,'2027-01-15','west').notice,/not.*claim|does NOT establish/i);
 assert.equal(eligibility(byId.presque,'2026-08-15','west').canDirect,true,'historical notice must not retroactively block visits before its publication');
 assert.equal(eligibility(byId.presque,'2027-01-15','east').canDirect,false,'winter east-to-Presque route cannot silently cross closed park roads');
 assert.equal(eligibility(byId.presque,'2027-01-15','inpark').canDirect,false,'unknown winter arrival corridor cannot imply legal route');
 assert.equal(eligibility(byId.ski,'2027-01-15','east').canDirect,true,'winter complex east approach should be possible');
 assert.equal(eligibility(byId.ski,'2027-01-15','west').canDirect,false,'winter west-to-ski cannot silently cross South Boundary Road');
 assert.equal(eligibility(byId.ski,'2027-05-15').canDirect,false,'spring ski operation cannot be inferred');
 assert.equal(eligibility(byId.visitor,'2027-01-15').canDirect,false,'winter visitor center approach unverified');
 assert.equal(season('2027-02-30'),'unknown');
 assert.equal(byId.presque.westEntranceNotice.reopeningVerified,false);
 assert.equal(byId.presque.westEntranceNotice.detourRouteVerified,false);
});
test('Google Maps links end at DNR mapped parking asset coordinates, not attraction positions',()=>{
 for(const p of published.points){
   const href=urlFor(p,true),v=new URL(href);
   assert.equal(v.hostname,'www.google.com');assert.equal(v.pathname,'/maps/dir/');
   assert.equal(v.searchParams.get('api'),'1');
   assert.equal(v.searchParams.get('travelmode'),'driving');
   assert.equal(v.searchParams.get('destination'),p.lat.toFixed(6)+','+p.lon.toFixed(6));
 }
 assert.equal(nameFor({name:'Lake of the Clouds overlook'}),'lake');
 assert.equal(nameFor({name:'Presque Isle River scenic-area access (County Road 519)'}),'presque');
 assert.equal(nameFor({name:'A sourced wilderness hike'}),null,'do not fake a parking lot for unresolved backcountry hike');
});
