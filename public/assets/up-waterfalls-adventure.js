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
function plan({origin,total,reserve,radius,style,day,candidates}){
 const invalid={status:'INVALID',options:[],reason:'Choose a known town, valid visit date and time reserve smaller than your outing.'};
 if(!validPoint(origin)||![120,240,480].includes(total)||![30,60,120,180,240].includes(reserve)||reserve>=total||![15,25,50].includes(radius)||!['easy','mixed','hike'].includes(style)||!validDay(day)||!Array.isArray(candidates))return invalid;
 const budget=total-reserve,month=Number(day.slice(5,7));
 if(month<6||month>9)return {status:'HELD',options:[],budget,reason:'Town-based multi-stop suggestions are held outside June through September while seasonal road and trail evidence is incomplete. Use the individual guides and regional plans for your date.'};
 const seen=new Set();
 const rows=candidates.filter(c=>eligible(c,style,day)&&c.max<=budget&&!seen.has(c.id)&&(seen.add(c.id),true)).map(c=>({...c,miles:distance(origin,c)})).filter(c=>c.miles<=radius).sort((a,b)=>a.miles-b.miles||a.id.localeCompare(b.id));
 const choices=[];
 function add(stops){
  const onsite=stops.reduce((a,c)=>a+c.max,0);
  if(onsite>budget)return;
  if(style==='hike'&&!stops.some(c=>harder.has(c.level)))return;
  if(new Set(stops.map(c=>c.group)).size!==stops.length||new Set(stops.map(c=>c.region)).size!==1)return;
  let spread=0;
  for(let i=0;i<stops.length;i++)for(let j=i+1;j<stops.length;j++)spread=Math.max(spread,distance(stops[i],stops[j]));
  if(spread>15)return;
  const ids=stops.map(c=>c.id).sort().join(',');
  choices.push({stops:stops.slice().sort((a,b)=>a.miles-b.miles||a.id.localeCompare(b.id)),onsite,spare:budget-onsite,spread,farthest:Math.max(...stops.map(c=>c.miles)),ids});
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
 return {status:options.length?'AVAILABLE':'EMPTY',budget,options,eligibleCount:rows.length,reason:options.length?'':'No documented outing fits these choices. Increase your walking time or radius, choose a different town or use individual guides.'};
}
const api={normalize,distance,timeMax,exactTown,validDay,eligible,plan};
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
 return {origin,total:Number(el('adventure-total').value),reserve:Number(el('adventure-reserve').value),radius:Number(el('adventure-radius').value),style:el('adventure-style').value,day:date.value,candidates:records()};
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
  const save=add(article,'button','Add these stops to my day');save.type='button';
  save.addEventListener('click',()=>{
   const freshArgs=getPlan(),fresh=plan(freshArgs),current=fresh.options.find(x=>x.ids===option.ids);
   if(!current){show();status.textContent='Choices changed. Compare outings again before saving.';return;}
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
