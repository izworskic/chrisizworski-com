/* Source-gated town discovery and bounded on-site time comparison. Not a road itinerary. */
(function(root){
'use strict';
const levels=new Set(['roadside','easy','moderate','steps','difficult']);
const harder=new Set(['moderate','steps','difficult']);
const explicitOnly=new Set(['scott-falls','houghton-douglass-falls','gabbro-falls']);
const normalize=v=>String(v||'').trim().toLowerCase().replace(/[, ]+mi(?:chigan)?$/i,'').replace(/[^a-z0-9]+/g,' ').trim();
function validPoint(p){return !!p&&typeof p.lat==='number'&&typeof p.lon==='number'&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=44&&p.lat<=49&&p.lon>=-93&&p.lon<=-82;}
function distance(a,b){
 if(!validPoint(a)||!validPoint(b))return Infinity;
 const k=Math.PI/180,dlat=(b.lat-a.lat)*k,dlon=(b.lon-a.lon)*k;
 const x=Math.sin(dlat/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin(dlon/2)**2;
 return 3958.7613*2*Math.asin(Math.sqrt(Math.max(0,Math.min(1,x))));
}
function timeMax(s){const m=String(s||'').trim().match(/^(\d+)\s*[–—-]\s*(\d+)\s*min$/i);return m&&Number(m[1])>0&&Number(m[2])>=Number(m[1])&&Number(m[2])<=720?Number(m[2]):null;}
function exactTown(towns,q){const term=normalize(q);const matches=towns.filter(p=>normalize(p.name)===term&&validPoint(p));return term&&matches.length===1?matches[0]:null;}
function validDay(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;const t=new Date(s+'T12:00:00Z');return Number.isFinite(+t)&&t.toISOString().slice(0,10)===s;}
// NOAA fractional-year solar equations; retain UTC day rollover at western
// longitudes. All itinerary clock labels use Eastern time, even west of the
// local time-zone boundary. Buffers are editorial, not a trail safety promise.
const TZ='America/Detroit',MIN=60000,DAY=86400000;
const clockFmt=new Intl.DateTimeFormat('en-US',{timeZone:TZ,hour:'numeric',minute:'2-digit'});
const partsFmt=new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
function easternStart(day,clock){
 if(!validDay(day)||typeof clock!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(clock))return null;
 const want=Date.parse(day+'T'+clock+':00Z');
 let t=want;
 function shown(ms){
  const p=Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map(x=>[x.type,x.value]));
  return Date.parse(p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':00Z');
 }
 for(let i=0;i<3;i++){const delta=want-shown(t);if(!delta)break;t+=delta;}
 return shown(t)===want?t:null;
}
function solarWindow(day,p){
 if(!validDay(day)||!validPoint(p))return null;
 const base=Date.parse(day+'T00:00:00Z'),year=Number(day.slice(0,4));
 const n=(base-Date.UTC(year,0,1))/DAY;
 const days=(Date.UTC(year+1,0,1)-Date.UTC(year,0,1))/DAY;
 const g=2*Math.PI*n/days;
 const eq=229.18*(.000075+.001868*Math.cos(g)-.032077*Math.sin(g)-.014615*Math.cos(2*g)-.040849*Math.sin(2*g));
 const dec=.006918-.399912*Math.cos(g)+.070257*Math.sin(g)-.006758*Math.cos(2*g)+.000907*Math.sin(2*g)-.002697*Math.cos(3*g)+.00148*Math.sin(3*g);
 const lat=p.lat*Math.PI/180;
 const h=(Math.cos(90.833*Math.PI/180)-Math.sin(lat)*Math.sin(dec))/(Math.cos(lat)*Math.cos(dec));
 if(!Number.isFinite(h)||h<-1||h>1)return null;
 const ha=Math.acos(h)*180/Math.PI,noon=720-4*p.lon-eq;
 const sunrise=base+(noon-4*ha)*MIN,sunset=base+(noon+4*ha)*MIN;
 return {sunrise,sunset,earliest:Math.ceil((sunrise+15*MIN)/MIN)*MIN,latest:Math.floor((sunset-45*MIN)/MIN)*MIN};
}
function daylightFit(start,windows,minutes){
 if(!Number.isFinite(start)||!Number.isFinite(minutes)||minutes<0||!Array.isArray(windows)||!windows.length||windows.some(w=>!w||!Number.isFinite(w.earliest)||!Number.isFinite(w.latest)||w.latest<w.earliest))return {status:'UNAVAILABLE'};
 const earliest=Math.max(...windows.map(w=>w.earliest)),latest=Math.min(...windows.map(w=>w.latest));
 const finish=start+minutes*MIN,margin=Math.floor((latest-finish)/MIN);
 return {status:start<earliest?'EARLY':finish>latest?'LATE':'FIT',earliest,latest,finish,margin,latestStart:latest-minutes*MIN};
}
// No inferred parking, no road geometry and no commercial routing API.
// Call only with land-manager parking independently accepted by Arrival Desk.
function roadPoint(c,approved){
 const d=c?.dataset;
 if(!approved||!d||d.status!=='verify'||d.arrivalVerified!=='verified'||!d.parkingLat||!d.parkingLng)return null;
 let source;try{source=new URL(d.parkingSource);}catch{return null;}
 if(source.protocol!=='https:'||!['michigan.gov','www.michigan.gov','keweenawlandtrust.org','www.keweenawlandtrust.org'].includes(source.hostname.toLowerCase()))return null;
 const point={lat:Number(d.parkingLat),lon:Number(d.parkingLng)},fall={lat:Number(d.lat),lon:Number(d.lng)};
 if(!validPoint(point)||!validPoint(fall)||distance(point,fall)<.01)return null;
 return point;
}
function routeHandoff(origin,points){
 if(!validPoint(origin)||!Array.isArray(points)||points.length<1||points.length>3||!points.every(validPoint))return null;
 const fmt=p=>p.lat.toFixed(6)+','+p.lon.toFixed(6),coords=points.map(fmt);
 if(new Set(coords).size!==coords.length||coords.includes(fmt(origin)))return null;
 return 'https://www.google.com/maps/dir/?'+new URLSearchParams({api:'1',origin:fmt(origin),destination:fmt(origin),travelmode:'driving',waypoints:coords.join('|')});
}
function roadBudget(onsite,total,reserve,entered,light){
 if(![onsite,total,reserve].every(Number.isFinite)||onsite<0||reserve<0||total<=0||typeof entered!=='string'||!/^\d{1,3}$/.test(entered.trim()))return {status:'UNCHECKED'};
 const travel=Number(entered),used=onsite+travel;
 if(travel<1||travel>720)return {status:'UNCHECKED'};
 const left=total-used,daylight=light?.status==='FIT'&&Number.isFinite(light.margin)?light.margin+reserve-travel:null;
 return {status:left<0||(daylight!==null&&daylight<0)?'OVER':daylight===null?'DAYLIGHT_UNKNOWN':'FITS_INPUTS',used,left,daylight,reserveDelta:reserve-travel};
}
function eligible(c,style,day){
 // Prefer only the ordinary documented state; seasonal/restricted and private or
 // special approaches remain available in original guides, never auto-proposed.
 if(c.status!=='verify'||c.verified!=='verified'||c.policy!=='check'||explicitOnly.has(c.id)||!levels.has(c.level)||!validPoint(c)||!Number.isFinite(c.max)||c.max<=0||!c.group||!c.region)return false;
 if(style==='easy'&&!['roadside','easy'].includes(c.level))return false;
 const month=Number(day.slice(5,7));
 // This is a cautious warm-season adventure pilot. Do not turn published
 // summer approaches into winter-trip recommendations.
 if(month<6||month>9)return false;
 return true;
}
function plan({origin,total,reserve,radius,style,day,candidates,departure}){
 const invalid={status:'INVALID',options:[],reason:'Choose a known town, valid visit date and time reserve smaller than your outing.'};
 if(!validPoint(origin)||![120,240,480].includes(total)||![30,60,120,180,240].includes(reserve)||reserve>=total||![15,25,50].includes(radius)||!['easy','mixed','hike'].includes(style)||!validDay(day)||!Array.isArray(candidates))return invalid;
 const budget=total-reserve,month=Number(day.slice(5,7));
 if(month<6||month>9)return {status:'HELD',options:[],budget,reason:'Town-based multi-stop suggestions are held outside June through September while seasonal road and trail evidence is incomplete. Use the individual guides and regional plans for your date.'};
 const seen=new Set();
 const rows=candidates.filter(c=>eligible(c,style,day)&&c.max<=budget&&!seen.has(c.id)&&(seen.add(c.id),true)).map(c=>({...c,miles:distance(origin,c)})).filter(c=>c.miles<=radius).sort((a,b)=>a.miles-b.miles||a.id.localeCompare(b.id));
 const choices=[],start=departure===undefined?null:easternStart(day,departure);
 const checkLight=departure!==undefined;
 if(checkLight&&start===null)return {...invalid,reason:'Enter a valid departure time in Eastern time.'};
 const originLight=checkLight?solarWindow(day,origin):null;
 const lightById=new Map(checkLight?rows.map(c=>[c.id,solarWindow(day,c)]):[]);
 let lightHeld=0;
 function add(stops){
  const onsite=stops.reduce((a,c)=>a+c.max,0);
  if(onsite>budget)return;
  if(style==='hike'&&!stops.some(c=>harder.has(c.level)))return;
  if(new Set(stops.map(c=>c.group)).size!==stops.length||new Set(stops.map(c=>c.region)).size!==1)return;
  let spread=0;
  for(let i=0;i<stops.length;i++)for(let j=i+1;j<stops.length;j++)spread=Math.max(spread,distance(stops[i],stops[j]));
  if(spread>15)return;
  const light=checkLight?daylightFit(start,[originLight,...stops.map(c=>lightById.get(c.id))],onsite+reserve):null;
  if(checkLight&&light.status!=='FIT'){lightHeld++;return;}
  const ids=stops.map(c=>c.id).sort().join(',');
  choices.push({stops:stops.slice().sort((a,b)=>a.miles-b.miles||a.id.localeCompare(b.id)),onsite,spare:budget-onsite,spread,farthest:Math.max(...stops.map(c=>c.miles)),ids,light});
 }
 // Full enumeration <= 80 choose 3; no synthetic road distance or travel time.
 for(let i=0;i<rows.length;i++){
  add([rows[i]]);
  for(let j=i+1;j<rows.length;j++){
   add([rows[i],rows[j]]);
   for(let k=j+1;k<rows.length;k++)add([rows[i],rows[j],rows[k]]);
  }
 }
 const nearby=(a,b)=>a.farthest-b.farthest||a.spread-b.spread||a.ids.localeCompare(b.ids);
 const many=choices.slice().sort((a,b)=>b.stops.length-a.stops.length||nearby(a,b)||a.onsite-b.onsite)[0];
 const linger=choices.filter(c=>c.stops.length===1).sort((a,b)=>b.onsite-a.onsite||nearby(a,b))[0];
 const options=[];
 if(many)options.push({...many,label:many.stops.length>1?'See several waterfalls':'One nearby waterfall'});
 if(linger&&linger.ids!==many?.ids)options.push({...linger,label:'Spend longer at one waterfall'});
 return {status:options.length?'AVAILABLE':'EMPTY',budget,options,eligibleCount:rows.length,lightHeld,reason:options.length?'':lightHeld?'No candidate fits the buffered daylight window at that departure time. Try leaving earlier or allowing a shorter outing.':'No documented outing fits these choices. Increase your walking time or radius, choose a different town or use individual guides.'};
}
const api={normalize,distance,timeMax,exactTown,validDay,eligible,plan,solarWindow,easternStart,daylightFit,roadPoint,routeHandoff,roadBudget};
if(typeof module!=='undefined'&&module.exports){module.exports=api;return;}
const d=root.document,desk=d?.getElementById('waterfall-adventure'),form=d?.getElementById('adventure-form');
if(!desk||!form)return;
const el=id=>d.getElementById(id),input=el('adventure-town'),submit=el('adventure-build'),status=el('adventure-status'),results=el('adventure-results'),date=el('visit-date');
const cards=new Map([...d.querySelectorAll('[data-fall][data-id]')].map(c=>[c.dataset.id,c]));
let towns=[],loading=null,active=null;
const add=(parent,tag,text)=>{const node=d.createElement(tag);node.textContent=text;parent.appendChild(node);return node;};
function records(){
 return [...cards.values()].map(c=>{
  const x=c.dataset,review=root.UPWaterfallVisitLens?.review(x.id);
  const gate=root.SharedItineraryEngine?.candidate(c)===true;
  const samePresque=['manabezho-falls','manido-falls','nawadaha-falls'].includes(x.id);
  const parking=normalize(x.arrivalParking);
  return {id:x.id,name:x.name,lat:Number(x.lat),lon:Number(x.lng),status:x.status,verified:x.arrivalVerified,region:x.region,level:x.level,policy:gate&&review&&!review.excluded?review.level:'hold',max:timeMax(c.querySelector('.card-aux .small')?.textContent),group:samePresque?'presque-isle-shared':parking||null};
 });
}
function getPlan(){
 const origin=exactTown(towns,input.value);
 return {origin,total:Number(el('adventure-total').value),reserve:Number(el('adventure-reserve').value),radius:Number(el('adventure-radius').value),style:el('adventure-style').value,day:date.value,departure:el('adventure-departure').value,candidates:records()};
}
function show(){
 const args=getPlan(),answer=plan(args);active=answer;results.replaceChildren();
 if(!args.origin){status.textContent='Enter a unique town from the Census reference list. Nearby suggestions appear as you type.';return;}
 status.textContent=answer.status==='AVAILABLE'?args.origin.name+' · '+answer.eligibleCount+' matching stops · '+answer.budget+' minutes for time at the falls. These are candidate outings, not verified driving schedules.':answer.reason;
 for(const option of answer.options){
  const article=add(results,'article','');article.className='upfall-adventure-option';article.dataset.adventurePlan=option.ids;
  add(article,'h4',option.label);
  add(article,'p',option.onsite+' min maximum recorded on-site time + '+args.reserve+' min of your reserved travel/break time; '+option.spare+' min unallocated.');
  add(article,'p','Farthest waterfall pin: '+Math.round(option.farthest)+' mi from town; '+Math.round(option.spread)+' mi maximum separation between waterfall pins. Straight-line geography, not a route.');
  const light=option.light;
  const lightBox=add(article,'div','');lightBox.className='upfall-adventure-light';
  add(lightBox,'h5','Allow daylight for the whole outing');
  if(light?.status==='FIT'){
   const clock=t=>clockFmt.format(new Date(t));
   add(lightBox,'p','Estimated buffered daylight: '+clock(light.earliest)+' to '+clock(light.latest)+' Eastern. Planned return: '+clock(light.finish)+' Eastern, with '+light.margin+' minutes before the buffered cutoff.');
   add(lightBox,'p','Latest departure for this provisional outing: '+clock(light.latestStart)+' Eastern. Forest and gorge shadows, clouds and access can shorten usable light.');
  }else add(lightBox,'p','Daylight calculation unavailable.');

  const list=add(article,'ul','');
  for(const stop of option.stops){
   const card=cards.get(stop.id),li=add(list,'li',''),link=add(li,'a',stop.name);link.href=card.dataset.url;
   add(li,'p','Allow up to '+stop.max+' min on site · '+Math.round(stop.miles)+' mi straight-line from town · '+card.dataset.statusLabel);
   const source=add(li,'a','Check arrival source');source.href=card.dataset.arrivalSource;
   const locate=add(li,'button','Show on map');locate.type='button';locate.addEventListener('click',()=>{
    if(card.hidden){for(const id of ['q','region','effort','access']){const c=el(id);if(c)c.value=id==='q'?'':'all';}el('region').dispatchEvent(new Event('change',{bubbles:true}));}
    root.UPWaterfallFocus?.(stop.id);
   });
  }
  const road=add(article,'div','');road.className='upfall-adventure-road';
  add(road,'h5','Check the round-trip drive');
  const parking=option.stops.map(stop=>roadPoint(cards.get(stop.id),root.UPWaterfallArrivalDesk?.parkingDirections?.(stop.id)));
  const handoff=routeHandoff(args.origin,parking);
  if(handoff){
   const a=add(road,'a','Open parking-to-parking round trip in Google Maps');a.href=handoff;a.target='_blank';a.rel='noopener noreferrer';
   add(road,'p','Starts and ends at the town reference point. Check all waypoints, correct your actual starting address and confirm legal roads and park gates. This is a suggested order, not an optimized or verified route.');
  }else{
   const missing=option.stops.filter((_,i)=>!parking[i]).map(s=>s.name);
   add(road,'p',missing.length?'Automatic round-trip link withheld: independently mapped visitor parking is missing or not eligible for '+missing.join(', ')+'. Use each official arrival guide to identify legal parking and check the round trip.':'Automatic round-trip link withheld because parking points overlap. Use the arrival guides.');
  }
  const label=add(road,'label','Round-trip driving and breaks (minutes, from your own route check)');
  const estimate=d.createElement('input');estimate.type='number';estimate.min='1';estimate.max='720';estimate.step='1';estimate.inputMode='numeric';estimate.placeholder='Enter checked minutes';estimate.className='adventure-road-minutes';label.appendChild(estimate);
  const check=add(road,'p','Travel time not checked. This remains a candidate outing, not a driving schedule.');check.setAttribute('role','status');check.setAttribute('aria-live','polite');
  const save=add(article,'button','Add these stops to my day');save.type='button';
  estimate.addEventListener('input',()=>{
   // A per-option input is not a change to the search form.
   const answer=roadBudget(option.onsite,args.total,args.reserve,estimate.value,light);
   save.disabled=answer.status==='OVER';
   if(answer.status==='UNCHECKED'){check.textContent='Travel time not checked. Enter the total drive and break minutes; include your return to town.';return;}
   if(answer.status==='OVER'){check.textContent='Does not fit your entered time or buffered daylight. Shorten the outing, leave earlier or compare another option.';return;}
   if(answer.status==='DAYLIGHT_UNKNOWN'){check.textContent='Time budget calculated, but daylight is unavailable. Check the daylight window separately.';return;}
   check.textContent='Fits your entered times: '+answer.used+' min in total, '+answer.left+' min unallocated and '+answer.daylight+' min before the buffered daylight cutoff. Route and access remain unverified.';
  });
  save.addEventListener('click',()=>{
   const freshArgs=getPlan(),fresh=plan(freshArgs),current=fresh.options.find(x=>x.ids===option.ids);
   if(!current){show();status.textContent='Choices changed. Compare outings again before saving.';return;}
   if(roadBudget(current.onsite,freshArgs.total,freshArgs.reserve,estimate.value,current.light).status==='OVER'){status.textContent='The entered driving and break time exceeds your budget or buffered daylight.';return;}
   const selected=[...cards.values()].filter(c=>c.querySelector('.save')?.getAttribute('aria-pressed')==='true').map(c=>c.dataset.id);
   const ids=current.stops.map(c=>c.id);
   const gate=root.SharedItineraryEngine?.assess({ids,cards,selected,date:freshArgs.day,season:1});
   if(!gate?.ok){status.textContent=gate?.reason||'The existing itinerary policy is unavailable. Nothing was added.';return;}
   for(const id of gate.missing)cards.get(id).querySelector('.save').click();
   status.textContent='Added '+gate.missing.length+' stops to your saved day. Review the guides, driving times and daylight before traveling.';
   const jump=add(article,'a','Review my saved waterfall day');jump.href='#shortlist';
  });
 }
}
function invalidate(){if(!active)return;active=null;results.replaceChildren();status.textContent='Choices changed. Compare outings again.';}
function load(){
 if(loading)return loading;
 loading=fetch('/assets/up-waterfall-adventure-towns.json',{credentials:'same-origin'}).then(r=>{if(!r.ok)throw Error('towns');return r.json();}).then(data=>{
  if(data.schemaVersion!==1||!Array.isArray(data.places)||data.places.length<20||!data.places.every(p=>typeof p.name==='string'&&validPoint(p)))throw Error('town index');
  towns=data.places;const dl=el('adventure-towns');
  for(const town of towns){const o=d.createElement('option');o.value=town.name;dl.appendChild(o);}
  submit.disabled=false;status.textContent='Choose your starting town and compare outings.';
 }).catch(()=>{submit.disabled=true;status.textContent='The town reference index could not load. Use the existing map and regional plans.';loading=null;});
 return loading;
}
desk.addEventListener('toggle',()=>{if(desk.open)void load();});
el('adventure-jump')?.addEventListener('click',()=>{desk.open=true;void load();});
if(desk.open)void load();
form.addEventListener('submit',e=>{e.preventDefault();if(towns.length)show();});
form.addEventListener('input',invalidate);date.addEventListener('change',invalidate);
})(typeof window==='undefined'?null:window);
