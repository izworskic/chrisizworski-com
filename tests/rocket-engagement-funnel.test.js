'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const funnel=require('../public/assets/rocket-engagement-funnel');
const A='11111111-1111-4111-8111-111111111111';
const B='22222222-2222-4222-8222-222222222222';
const launches=[
 {id:A,name:'Private-to-analytics mission A',region:'florida',netPrecision:'minute'},
 {id:B,name:'Private-to-analytics mission B',region:'florida',netPrecision:'day'}];
const selection=(id)=>({ok:true,selectedRegion:'florida',selectedLaunchId:id,
 selectedLaunch:launches.find(l=>l.id===id),
 regions:[{id:'florida',launches}]});
function harness(){
 const listeners=new Map(),events=[],ga=[],va=[];
 let intersection;
 const box={dataset:{status:'review'},contains:()=>true,
  getBoundingClientRect:()=>({top:120,bottom:600})};
 const doc={
  readyState:'complete',
  getElementById(id){return id==='rl-flight-desk'?box:null;},
  addEventListener(name,cb){listeners.set(name,[...(listeners.get(name)||[]),cb]);},
  fire(name,detail,target=null){
    for(const cb of listeners.get(name)||[])cb({type:name,detail,target});
  }
 };
 const win={
  innerHeight:800,location:{href:'https://chrisizworski.com/national-tools/rocket-launch-live/?region=florida&launchId='+A},
  addEventListener(){},
  IntersectionObserver:class{
    constructor(cb){intersection=cb;}
    observe(){}disconnect(){}
  },
  gtag(...x){ga.push(x);},
  va(...x){va.push(x);}
 };
 assert.equal(funnel.mount(doc,win),true);
 assert.equal(funnel.mount(doc,win),false);
 const expose=()=>intersection([{isIntersecting:true,intersectionRatio:.4}]);
 return {box,doc,win,ga,va,expose};
}
function items(h,name){return h.va.filter(x=>x[0]==='event'&&x[1].name===name).map(x=>x[1]);}

test('the analytics payload allowlist rejects mission IDs, names, URL and coordinates',()=>{
 const source={region:'florida',surface:'map_marker',status:'review',outcome:'mission_request',
  destination:'official_access',precision:'minute',
  launchId:A,mission_name:'Secret',lat:25.123,lon:-97.45,
  url:'https://host?launchId='+A,search:'anything'};
 assert.deepEqual(funnel.safeData(source),{
  region:'florida',surface:'map_marker',status:'review',
  outcome:'mission_request',destination:'official_access',precision:'minute'});
 const ga=[],va=[];
 assert.equal(funnel.emit({gtag(...a){ga.push(a)},va(...a){va.push(a)}},'chosen',source),true);
 const wire=JSON.stringify({ga,va});
 for(const secret of [A,'Secret','25.123','-97.45','launchId','anything'])
  assert.equal(wire.includes(secret),false,'privacy leak: '+secret);
 assert.ok(wire.includes('rocket_mission_selected'));
 assert.ok(wire.includes('Rocket Mission Selected'));
 assert.equal(funnel.emit({},'chosen',source),false);
 assert.equal(funnel.emit({},'not-an-event',source),false);
});

test('only an actually exposed and data-loaded flight desk sends one exposure',()=>{
 const h=harness();
 h.expose();
 assert.equal(items(h,'Rocket Flight Desk Exposed').length,0);
 h.doc.fire('rocket-viewing:data',selection(A));
 assert.equal(items(h,'Rocket Flight Desk Exposed').length,1);
 h.doc.fire('rocket-viewing:data',selection(B));
 h.doc.fire('rocket-viewing:data',selection(A));
 assert.equal(items(h,'Rocket Flight Desk Exposed').length,1);
 assert.equal(items(h,'Rocket Mission Selected').length,0,'automatic data updates are not user choices');
 assert.deepEqual(items(h,'Rocket Flight Desk Exposed')[0].data,{region:'florida',status:'review',precision:'minute'});
});

test('A to B to A, native picker and national map preserve only confirmed explicit selection',()=>{
 const h=harness();h.expose();h.doc.fire('rocket-viewing:data',selection(A));
 h.doc.fire('rocket-experience:choose',{launchId:B,region:'florida'});
 assert.equal(items(h,'Rocket Mission Selected').length,0,'attempt alone cannot become successful selection');
 h.doc.fire('rocket-viewing:data',selection(B));
 assert.equal(items(h,'Rocket Mission Selected').length,1);
 assert.equal(items(h,'Rocket Mission Selected')[0].data.surface,'flight_desk');
 assert.equal(items(h,'Rocket Mission Selected')[0].data.precision,'day');
 h.doc.fire('change',undefined,{id:'rl-launch-select',value:A});
 h.doc.fire('rocket-viewing:data',selection(A));
 assert.equal(items(h,'Rocket Mission Selected').length,2);
 assert.equal(items(h,'Rocket Mission Selected')[1].data.surface,'native_picker');
 h.doc.fire('rocket-experience:map-choose',{launchId:B,region:'florida'});
 assert.equal(items(h,'Rocket Map Engaged').length,1);
 h.doc.fire('rocket-viewing:data',selection(B));
 assert.equal(items(h,'Rocket Mission Selected').length,3);
 assert.equal(items(h,'Rocket Mission Selected')[2].data.surface,'map_marker');
 h.doc.fire('rocket-experience:locate-result',{region:'florida',focused:true});
 h.doc.fire('rocket-experience:locate-result',{region:'florida',focused:false});
 assert.deepEqual(items(h,'Rocket Map Engaged').map(x=>x.data.outcome),
  ['mission_request','pad_marker_focused','coast_fallback']);
 assert.equal(JSON.stringify(h.ga).includes(A),false);
 assert.equal(JSON.stringify(h.va).includes(B),false);
});

test('failed selection or a blank source does not become a conversion',()=>{
 const h=harness();h.expose();h.doc.fire('rocket-viewing:data',selection(A));
 h.doc.fire('rocket-experience:choose',{launchId:B,region:'florida'});
 h.doc.fire('rocket-viewing:data',null);
 h.doc.fire('rocket-viewing:data',null);
 assert.equal(items(h,'Rocket Mission Selected').length,0);
 assert.equal(items(h,'Rocket Schedule Unavailable').length,1);
 h.doc.fire('rocket-viewing:data',selection(A));
 assert.equal(items(h,'Rocket Flight Desk Exposed').length,1);
});

test('invalid mission, forged region and unknown event names are ignored',()=>{
 const h=harness();h.expose();h.doc.fire('rocket-viewing:data',selection(A));
 h.doc.fire('rocket-experience:choose',{launchId:'not-uuid',region:'florida'});
 h.doc.fire('rocket-experience:choose',{launchId:B,region:'unknown'});
 h.doc.fire('rocket-experience:choose',{launchId:A,region:'florida'});
 h.doc.fire('rocket-viewing:data',selection(A));
 assert.equal(items(h,'Rocket Mission Selected').length,0);
 h.doc.fire('rocket-experience:region-selected',{region:'california',surface:'region_map'});
 assert.equal(items(h,'Rocket Coast Selected').length,1);
 h.doc.fire('rocket-experience:region-selected',{region:'bad-coast',surface:'region_map'});
 assert.equal(items(h,'Rocket Coast Selected').length,1);
});

test('regional handoffs classify only site-controlled exact destinations',()=>{
 const base='https://chrisizworski.com/national-tools/rocket-launch-live/';
 assert.equal(funnel.guideRegion('/vandenberg-rocket-launch-viewing/?launchId='+A,base),'california');
 assert.equal(funnel.guideRegion('/national-tools/space-coast-launch/',base),'florida');
 assert.equal(funnel.guideRegion('https://other-site.example/vandenberg-rocket-launch-viewing/',base),null);
 assert.equal(funnel.guideRegion('/vandenberg-rocket-launch-viewing-hack/',base),null);
});
test('national rocket page has Vercel pageview loader and no analytics in ads code',()=>{
 const html=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
 assert.equal((html.match(/src="\/_vercel\/insights\/script.js"/g)||[]).length,1);
 assert.equal((html.match(/src="\/assets\/rocket-engagement-funnel.js/g)||[]).length,1);
 assert.match(html,/rel="canonical" href="https:\/\/chrisizworski.com\/national-tools\/rocket-launch-live\/"/);
 assert.match(html,/https:\/\/chrisizworski.com\/#person/);
 assert.match(html,/assets\/rocket-map-pins\.js/);
 assert.match(html,/rocket-flight-desk\.js/);
 const app=fs.readFileSync(path.join(__dirname,'../public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
 assert.match(app,/rocket-experience:region-selected/);
 assert.match(app,/rocket-experience:locate-result/);
 assert.match(app,/rocket-experience:map-choose/);
 const source=fs.readFileSync(path.join(__dirname,'../public/assets/rocket-engagement-funnel.js'),'utf8');
 assert.doesNotMatch(source,/localStorage|sessionStorage|document.cookie/);
});