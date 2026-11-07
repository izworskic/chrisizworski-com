'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Parking=require('../lib/winter-hike-parking.cjs');
const Routes=require('../lib/winter-hike-routes.cjs');
const Nps=require('../lib/winter-hike-nps-alerts.cjs');
const API=require('../api/winter-hike-lab.js');
const base=path.join(__dirname,'../public/winter-hike-snowshoe-lab');
const html=fs.readFileSync(path.join(base,'index.html'),'utf8');
const js=fs.readFileSync(path.join(base,'app.js'),'utf8');
const response=()=>{let code=200;return{setHeader(){},status(c){code=c;return this},json(body){return{code,body}}};};
const observation=(id='piro-sand-point-marsh',day='2026-11-07')=>Parking.assess(id,{tripDay:day,now:Date.parse(day+'T15:00:00Z')});
const report=(park,alerts)=>({parkCode:park,status:'official-alerts-checked',sourceType:'park-site',checkedAt:'2026-11-07T12:00:00Z',
 sourceUrl:Nps.PARKS[park].url,alerts});
const alert=(title,description='',category='closure')=>({
 title,description,category,url:'https://www.nps.gov/piro/planyourvisit/conditions.htm',
 activeWindowVerified:true,ambiguousDateRange:false
});
test('every inventoried route offers manager-grounded access research without fabricated winter clearance',async()=>{
 const a=Parking.audit();
 assert.deepEqual(a.failures,[]);
 const coverage=Parking.coverage();
 assert.equal(coverage.totalRoutes,52);
 assert.equal(coverage.namedCheckpoints,24);
 assert.equal(coverage.managerAreaOnly,28);
 assert.equal(coverage.noManagerEvidence,0);
 assert.equal(coverage.currentOperationallyConfirmed,0);
 assert.equal(new Set(Routes.catalog.routes.map(r=>r.id)).size,52);
 for(const route of Routes.catalog.routes){
   const record=Parking.assess(route.id);
   assert.match(record.source,/^https:\/\/(?:www\.)?(?:nps|michigan)\.gov\//);
   assert.equal(record.navigationReady,false);
   assert.equal(record.drivingDirectionsUrl,null);
   assert.equal(record.managerAccessConfirmed,false);
   assert.equal(record.parking,'unknown');
   assert.equal(record.trail,'unknown');
   assert.equal(record.road,'unknown');
   assert.ok(record.managerQuestion?.length>10,'specific unresolved manager access question for '+route.id);
 }
 const result=await API({method:'GET',query:{mode:'catalog'}},response());
 assert.equal(result.code,200);
 assert.deepEqual(result.body.accessCoverage,coverage);
 assert.equal(result.body.routes.length,52);
 assert.equal(result.body.routes.filter(x=>x.winterAccess.coverageTier==='manager-area-only').length,28);
 assert.equal(result.body.routes.filter(x=>x.winterAccess.tracked).length,24);
});
test('all Sleeping Bear and Pictured Rocks routes have a scoped official NPS alert map',()=>{
 const nps=Routes.catalog.routes.filter(x=>['sleepbear','piro'].includes(x.placeGroup));
 assert.equal(nps.length,12);
 for(const r of nps)assert.ok(Nps.TRACKED[r.id],r.id+' missing official alert scope');
 for(const r of Routes.catalog.routes.filter(x=>!['sleepbear','piro'].includes(x.placeGroup))){
  assert.equal(Nps.TRACKED[r.id],undefined,'do not misattribute NPS closures to DNR trails');
 }
});
test('NPS alerts can close a specific trail but never another trail with a similar town or road name',()=>{
 const feed=report('piro',[
  alert('Munising Falls Trail Closed Until Further Notice','Washed out and inaccessible.'),
  alert('Munising Snowshoe Trail Closed Until Further Notice','Dedicated loop closed.'),
  alert('East City Limits Road Closure','Road closed to vehicles due to maintenance.')
 ]);
 const munising=Nps.forRoute('piro-munising-snowshoe',feed);
 assert.equal(munising.status,'official-closure');
 assert.deepEqual([...munising.blockedKinds].sort(),['road','trail']);
 assert.equal(munising.closures.length,2);
 const sandPoint=Nps.forRoute('piro-sand-point-marsh',feed);
 assert.equal(sandPoint.status,'official-alerts-checked');
 assert.equal(sandPoint.closures.length,0);
 assert.match(sandPoint.meaning,/DOES NOT prove/i);
 const missing=Nps.forRoute('bay-tobico-marsh',feed);
 assert.equal(missing.status,'not-covered');
});
test('NPS closure of Pierce Stocking Scenic Drive never implies Alligator Hill Stocking Drive trailhead closed',()=>{
 const feed=report('slbe',[alert('Pierce Stocking Scenic Drive Closed for the Winter','Road closed to vehicles.')]);
 for(const id of ['sleepbear-alligator-easy','sleepbear-alligator-intermediate','sleepbear-alligator-advanced']){
  const v=Nps.forRoute(id,feed);
  assert.equal(v.status,'official-alerts-checked');
  assert.equal(v.closures.length,0);
 }
 const samePark=report('slbe',[alert('Alligator Hill Trail Closed Due to Storm Damage','Trail closed until further notice')]);
 assert.equal(Nps.forRoute('sleepbear-alligator-easy',samePark).status,'official-closure');
 assert.deepEqual(Nps.forRoute('sleepbear-alligator-easy',samePark).blockedKinds,['trail']);
});
test('an NPS bulletins date range without a year does not become an indefinite closure',()=>{
 const now=Date.parse('2026-11-07T12:00:00Z');
 const bulletin=Nps.normalize({title:'Sand Point Road Closed 10/1-10/14',category:'closure',
   description:'Project closure from October 1 through 14',url:'https://nps.gov/piro/planyourvisit/conditions.htm'},'piro',now);
 assert.equal(bulletin.activeWindowVerified,false);
 const result=Nps.forRoute('piro-sand-point-marsh',report('piro',[bulletin]));
 assert.equal(result.status,'official-alerts-checked');
 assert.equal(result.closures.length,0);
 assert.equal(result.advisories.length,1);
 assert.equal(observation().road,'unknown');
 const expired=Nps.normalize({title:'Sand Point Marsh Closed',category:'closure',
   end_date:'2026-10-14',description:'Expired official notice'},'piro',now);
 assert.equal(expired,null);
});
test('inactive, future and malicious park notices are excluded or source-sanitized',()=>{
 const now=Date.parse('2026-11-07T12:00:00Z');
 assert.equal(Nps.normalize({title:'Closed',is_active:false},'piro',now),null);
 assert.equal(Nps.normalize({title:'Closed',start_date:'2026-12-01'},'piro',now),null);
 const item=Nps.normalize({title:'Sand Point <script>bad()</script> Marsh Closed',description:'<b>Closure</b>',
   url:'https://example.invalid/?token=secret',category:'Closure'},'piro',now);
 assert.doesNotMatch(item.title,/<script|bad\(\)/);
 assert.equal(item.url,Nps.PARKS.piro.url);
 assert.equal(item.description,'Closure');
});
test('unavailable or malformed NPS feeds never create a travel clearance',async()=>{
 const source=async()=>({ok:false,status:404});
 const r=await Nps.getParkAlerts('piro',{fetcher:source,apiKey:'',useCache:false});
 assert.equal(r.status,'unavailable');
 const v=Nps.forRoute('piro-sand-point-marsh',r);
 assert.equal(v.status,'unavailable');
 assert.equal(v.closures.length,0);
 assert.equal(Parking.assess('piro-sand-point-marsh').managerAccessConfirmed,false);
});
test('NPS site alerts are tried first and server-only NPS API key is a fallback, never serialized',async()=>{
 const log=[];
 const token='unit-test-secret-token';
 const fetcher=async(url,opts)=>{
   log.push({url:String(url),headers:opts.headers});
   if(String(url).includes('park-alerts-'))return{ok:false,status:503};
   return{ok:true,json:async()=>({data:[{title:'Alligator Hill Trail Closed',category:'closure',
    description:'Official closure',url:'https://www.nps.gov/slbe/planyourvisit/conditions.htm'}]})};
 };
 const report=await Nps.getParkAlerts('slbe',{fetcher,apiKey:token,useCache:false});
 assert.equal(report.status,'official-alerts-checked');
 assert.equal(report.sourceType,'developer-api');
 assert.equal(report.alerts.length,1);
 assert.equal(log.length,2);
 assert.equal(log[1].headers['X-Api-Key'],token);
 assert.doesNotMatch(JSON.stringify(report),/unit-test-secret/);
 assert.equal(Nps.forRoute('sleepbear-alligator-easy',report).status,'official-closure');
});
test('read-only access endpoint supplies official alerts independently of NOAA and noindex is retained',async()=>{
 const original=global.fetch,prior=process.env.NPS_API_KEY;
 delete process.env.NPS_API_KEY;
 global.fetch=async url=>({ok:true,json:async()=>[
  {title:'Sand Point Marsh Trail Closed',category:'closure',description:'Marsh boardwalk closed until further notice',
    url:'https://www.nps.gov/piro/planyourvisit/conditions.htm'}
 ]});
 try{
  const result=await API({method:'GET',query:{mode:'access',route:'piro-sand-point-marsh'}},response());
  assert.equal(result.code,200);
  assert.equal(result.body.accessVerdict,'OFFICIAL_CLOSURE');
  assert.equal(result.body.parkAlerts.blockedKinds.includes('trail'),true);
  assert.equal(result.body.parkingVerification.parking,'unknown');
  assert.equal((await API({method:'GET',query:{mode:'access',route:'wrong-id'}},response())).code,400);
  assert.equal((await API({method:'GET',query:{mode:'access',route:'bay-tobico-marsh'}},response())).body.accessVerdict,'PARKING_NOT_CONFIRMED');
 }finally{global.fetch=original;if(prior===undefined)delete process.env.NPS_API_KEY;else process.env.NPS_API_KEY=prior;}
});
test('visitor controls reveal operational unknown, separate alert feed, and no car-routing or false open badges',()=>{
 assert.match(html,/id="arrival-evidence"/);
 assert.match(html,/id="access-census"/);
 assert.match(html,/name="robots" content="noindex,nofollow"/);
 assert.match(html,/app\.js\?v=6/);
 assert.match(js,/mode:'access'/);
 assert.match(js,/renderManagerAlerts/);
 assert.match(js,/state\.selected\?\.id!==route\.id/);
 assert.match(js,/published-seasonal-maintenance-policy/);
 assert.match(js,/manager-area-only/);
 assert.match(js,/official NPS alert/i);
 assert.ok(!js.includes('google.com/maps/dir'));
});
