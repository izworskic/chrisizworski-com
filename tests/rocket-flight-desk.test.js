'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const desk=require('../public/assets/rocket-flight-desk');
const ROOT=path.join(__dirname,'..');
const ids=['11111111-1111-4111-8111-111111111111','22222222-2222-4222-8222-222222222222'];
const florida=[
 {id:ids[0],region:'florida',name:'Fixture mission A',net:'2026-11-12T19:30:00Z',
  netPrecision:'minute',pad:'SLC-40',rocket:'Falcon 9',lat:28.563,lon:-80.577,status:'Go for Launch'},
 {id:ids[1],region:'florida',name:'Fixture mission B',net:'2026-11-15T18:30:00Z',
  netPrecision:'day',pad:'LC-39A',rocket:'Falcon 9',lat:28.608,lon:-80.604,status:'To Be Confirmed'}
];
function data(region='florida',selected=florida[0],more={}){
 const regions=[{id:'florida',name:'Florida Space Coast',lat:28.58,lon:-80.61,launches:florida},
  {id:'texas',name:'Starbase',lat:25.997,lon:-97.157,launches:[]}];
 if(selected&&!regions.some(r=>r.id===region&&r.launches.some(l=>l.id===selected.id))){
   let entry=regions.find(r=>r.id===region);
   if(!entry){entry={id:region,launches:[]};regions.push(entry);}
   entry.launches.push(selected);
 }
 return {ok:true,selectedRegion:region,selectedLaunchId:selected?.id||null,
  selectedLaunch:selected,region:{id:region,timezone:'America/New_York',authority:'https://www.nasa.gov/kennedy/',
   access:'https://www.nps.gov/cana/planyourvisit/rocket-launch-viewing.htm'},
  regions,weather:{level:'unknown'},access:{sites:[]},coverage:{partial:false},
  scheduleFreshness:'recent',scheduleCheckedAt:'2026-11-07T12:00:00Z',...more};
}
test('flight desk announces a tentative viewing decision, never launch GO or ticket clearance',()=>{
 const d=desk.decide(data());
 assert.equal(d.launchId,ids[0]);
 assert.equal(d.status,'review');
 assert.match(d.headline,/find your spot/i);
 assert.match(d.note,/official access/i);
 assert.match(d.access,/tickets|NPS/i);
 assert.match(d.when,/launch time may change/i);
 assert.ok(d.official?.startsWith('https://www.nps.gov/'));
 assert.match(d.specialist,/space-coast-launch/);
});
test('date-only and hour-only placeholders are not presented as confirmed arrival times',()=>{
 const [a,b]=florida;
 assert.equal(desk.decide(data('florida',b)).status,'timing');
 assert.match(desk.decide(data('florida',b)).when,/liftoff time to come/i);
 const h=desk.decide(data('florida',{...a,netPrecision:'hour'}));
 assert.equal(h.status,'timing');assert.match(h.when,/hour approximate/i);
 const month=desk.target({...a,netPrecision:'month'},'America/New_York');
 assert.match(month,/date still to come/i);
 assert.doesNotMatch(month,/7:30|2:30/i);
});
test('stale snapshot, hold, closure and restricted region all block a positive viewing claim',()=>{
 const stale=desk.decide(data('florida',florida[0],{scheduleFreshness:'stale'}));
 assert.equal(stale.status,'stale');assert.match(stale.headline,/may have changed/i);
 const hold=desk.decide(data('florida',{...florida[0],status:'Hold'}));
 assert.equal(hold.status,'hold');
 const texas={...florida[0],region:'texas'};
 const closed=desk.decide(data('texas',texas,{access:{liveOfficialNotice:{state:'closed',checkedAt:'2026-11-07T09:00:00Z'}}}));
 assert.equal(closed.status,'hold');assert.match(closed.headline,/closure/i);
 const alaska=desk.decide(data('alaska',{...florida[0],region:'alaska'},
  {region:{id:'alaska',timezone:'America/Anchorage',access:'https://akaerospace.com/beyond-launch'}}));
 assert.equal(alaska.status,'access');assert.match(alaska.access,/No confirmed public/i);
});
test('a weather reference is not an approval, and source incompleteness is displayed',()=>{
 const d=desk.decide(data('florida',florida[0],{weather:{level:'assessed',places:[{status:'ok',cloudStatus:'ok',cloudCoverPercent:46,updatedAt:'2026-11-07T11:00:00Z',assessment:{level:'fair'},period:{shortForecast:'Partly cloudy',startTime:'2026-11-12T19:00:00Z',endTime:'2026-11-12T20:00:00Z'}}]},coverage:{partial:true}}));
 assert.match(d.sky,/launch still subject to change/i);
 assert.match(d.source,/some flights may be missing/i);
 assert.equal(d.status,'review');
});
test('nominal partial weather with every NWS sample unavailable is not claimed as a forecast',()=>{
 const d=desk.decide(data('florida',florida[0],{weather:{level:'partial',
   places:[{status:'unavailable',period:null,cloudStatus:'unavailable'},
           {status:'unavailable',period:null,cloudStatus:'unavailable'}]}}));
 assert.equal(d.sky,'No forecast yet for the scheduled launch hour');
 const some=desk.decide(data('florida',florida[0],{weather:{level:'partial',
   places:[{status:'ok',cloudStatus:'ok',cloudCoverPercent:56,updatedAt:'2026-11-07T11:00:00Z',assessment:{level:'fair'},period:{shortForecast:'Cloudy',startTime:'2026-11-12T19:00:00Z',endTime:'2026-11-12T20:00:00Z'}},
           {status:'unavailable',period:null}]}}));
 assert.match(some.sky,/Some local weather available/);
});
test('unavailable source or no future selected mission never asserts zero operations',()=>{
 const empty=desk.decide(data('florida',null));
 assert.equal(empty.status,'unknown');assert.match(empty.note,/don.t always appear/i);
 const outage=desk.decide(null);
 assert.equal(outage.status,'unavailable');assert.equal(outage.launchId,null);
 assert.match(outage.note,/not a verified current target/i);
});
test('pad coordinate claim uses the same regional bounds as source-grounded map pins',()=>{
 const old=global.RocketMapPins;
 try{
  global.RocketMapPins={inRegion:(r,lat,lon)=>r==='florida'&&lat>28&&lat<29&&lon>-81};
  assert.equal(desk.decide(data()).padExact,true);
  assert.match(desk.decide(data()).origin,/pad location on the map/i);
  const wrong=desk.decide(data('florida',{...florida[0],lat:0,lon:0}));
  assert.equal(wrong.padExact,false);
  assert.match(wrong.origin,/exact pad not confirmed/i);
 }finally{global.RocketMapPins=old;}
});
test('mission switch dispatches stable selected UUID and a map handoff without a second feed',()=>{
 const els=new Map(),listeners={};const events=[];
 function el(id){if(!els.has(id))els.set(id,{
  id,dataset:{},attrs:{},children:[],textContent:'',href:'',disabled:false,hidden:false,
  listeners:{},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},
  addEventListener(n,cb){this.listeners[n]=cb;},
  replaceChildren(...children){this.children=children;},
  appendChild(x){this.children.push(x);},
  get value(){return this._value??this.children[0]?.value??'';},
  set value(v){this._value=v;}
 });return els.get(id);}
 const dom={getElementById:el,createElement:tag=>({tag,children:[],value:'',textContent:''}),
  addEventListener:(name,callback)=>{listeners[name]=callback;},
  dispatchEvent:e=>{events.push(e);listeners[e.type]?.(e);}
 };
 const mounted=desk.mount(dom);
 assert.ok(mounted);
 mounted.render(data());
 assert.equal(el('rl-flight-mission').textContent,florida[0].name);
 assert.equal(el('rl-flight-desk').dataset.launchId,ids[0]);
 assert.equal(el('rl-flight-desk').dataset.nextGate,'access');
 assert.match(el('rl-flight-next-title').textContent,/find a public place to watch/i);
 assert.equal(el('rl-flight-specialist').hidden,true,'do not duplicate next regional CTA');
 assert.equal(el('rl-flight-mission-select').disabled,false);
 assert.equal(el('rl-flight-locate').disabled,false);
 el('rl-flight-mission-select').value=ids[1];
 el('rl-flight-mission-select').listeners.change();
 assert.equal(events.at(-1).type,'rocket-experience:choose');
 assert.deepEqual(events.at(-1).detail,{launchId:ids[1],region:'florida'});
 mounted.render(data('florida',florida[1]));
 assert.equal(el('rl-flight-mission').textContent,florida[1].name);
 assert.equal(el('rl-flight-desk').dataset.launchId,ids[1]);
 assert.equal(el('rl-flight-desk').dataset.nextGate,'schedule');
 assert.match(el('rl-flight-next-title').textContent,/Wait for a more precise liftoff time/);
 assert.equal(el('rl-flight-specialist').hidden,false,'regional guide remains alternative to authority for tentative time');
 el('rl-flight-locate').listeners.click();
 assert.equal(events.at(-1).type,'rocket-experience:locate');
 assert.deepEqual(events.at(-1).detail,{launchId:ids[1],region:'florida'});
 mounted.render(data());
 assert.equal(el('rl-flight-desk').dataset.launchId,ids[0]);
 mounted.render(null);
 assert.match(el('rl-flight-next-title').textContent,/can.t confirm the next flight/i);
 assert.equal(el('rl-flight-next-link').attrs.href,'https://www.nasa.gov/event-type/launch-schedule/');
 assert.equal(el('rl-flight-locate').disabled,true);
 assert.equal(el('rl-flight-mission-select').disabled,true);
});
test('existing canonical, SEO/Person, photo credit and national map are preserved',()=>{
 const html=fs.readFileSync(path.join(ROOT,'public/synced-national-tools/rocket-launch-live/index.html'),'utf8');
 const app=fs.readFileSync(path.join(ROOT,'public/synced-national-tools/rocket-launch-live/app.js'),'utf8');
 assert.match(html,/canonical" href="https:\/\/chrisizworski\.com\/national-tools\/rocket-launch-live\//);
 assert.match(html,/https:\/\/chrisizworski\.com\/#person/);
 assert.match(html,/\/assets\/rocket-flight-desk\.js\?v=20261110-voice-v1/);
 assert.match(html,/\/assets\/rocket-flight-desk\.css\?v=20261108-foundry-v2/);
 assert.match(html,/id="rl-coast-map"/);
 assert.match(html,/Photo: Senior Airman Kadielle Shaw/);
 assert.match(html,/id="rl-viewing"/);
 assert.match(app,/rocket-experience:choose/);
 assert.match(app,/rocket-experience:locate/);
 assert.match(app,/state\.rocketPins\?\.focusSelected\(\)/);
 assert.doesNotMatch(app,/supabase|redis/i);
});

test('Experience OS v1.2.1 release evidence structurally validates without asserting live or outcome proof',async()=>{
 const {validateReleaseRecord}=await import('../design-systems/experience-os-v1/lib/release-evidence.mjs');
 const record=JSON.parse(fs.readFileSync(path.join(ROOT,'docs/experience-briefs/rocket-launch-live.release.json'),'utf8'));
 const result=validateReleaseRecord(record);
 assert.equal(result.ok,true,JSON.stringify(result.issues));
 assert.equal(record.recordStatus,'draft');
 assert.equal(record.qa.browserStatus,'PASSED');
 assert.equal(record.release.deployed.status,'NOT_VERIFIED');
 assert.equal(record.release.live.status,'NOT_VERIFIED');
 assert.equal(record.release.measured.status,'NOT_MEASURED');
});
