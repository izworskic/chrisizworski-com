(function(){
'use strict';
// Hub controller only. All domain judgments live in this-week-engine.js.
const E=window.ThisWeekEngine,root=document.getElementById('this-week');
if(!root||!E)return;
const $=id=>document.getElementById(id);
const cards={shed:$('week-shed'),maple:$('week-maple'),rock:$('week-rock'),eagle:$('week-eagle'),waterfowl:$('week-waterfowl')};
const scopes={shed:'Local forecast + regional modeled snow',maple:'Local forecast, not measured sap',rock:'Statewide beaches, NOT the selected town',eagle:'Public viewing corridors, not sightings',waterfowl:'Midwest wetlands and large-water reference points'};
let sequence=0,started=false,rockCache=null,waterfowlCache=new Map();
function readable(t){
 if(!t)return 'Seasonal / interpretive information';
 const d=new Date(t);return Number.isNaN(+d)?'Source time unavailable':'Source updated '+d.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
}
function show(item){
 const card=cards[item.id];if(!card)return;
 const badge=card.querySelector('[data-week-state]');
 badge.textContent=({opportunity:'Weather opportunity',check:'Check locally',wait:'Better to wait',seasonal:'Outside monitoring season',unavailable:'Data unavailable',context:'Interpretive planning'})[item.state]||'Check conditions';
 badge.dataset.grade=item.state;
 card.querySelector('[data-week-headline]').textContent=item.headline;
 card.querySelector('[data-week-reason]').textContent=item.reason;
 card.querySelector('[data-week-trigger]').textContent=item.trigger;
 card.querySelector('[data-week-scope]').textContent=item.scope||scopes[item.id];
 card.querySelector('[data-week-source]').textContent=item.source+' · '+readable(item.updated);
 card.querySelector('[data-week-detail]').textContent=item.details||'';
}
function unavailable(id){
 const item={
  id,state:'unavailable',headline:'Current conditions could not be checked',
  reason:'This source did not return a usable answer; no go/wait decision is issued.',
  trigger:'Open the dedicated tool or try refreshing.',
  source:'Provider feed not verified',updated:null,scope:scopes[id]
 };
 show(item);
}
async function lookup(url,signal){
 const r=await fetch(url,{headers:{Accept:'application/json'},signal});
 if(!r.ok)throw Error('Source returned '+r.status);
 return r.json();
}
async function refresh(){
 started=true;const request=++sequence;const region=$('week-region').value;
 const name=E.REGION_OPTIONS.find(x=>x.id===region)?.name||'Bay City';
 const btn=$('week-refresh');btn.disabled=true;btn.textContent='Checking sources…';
 $('week-updated').textContent='Checking four independently sourced tools. A missing source never becomes a favorable result.';
 for(const id of ['shed','maple','rock','waterfowl']){
  const c=cards[id];c.querySelector('[data-week-state]').textContent='Checking source…';
  c.querySelector('[data-week-headline]').textContent='Gathering condition evidence';
  c.querySelector('[data-week-reason]').textContent='No recommendation until this feed returns.';
 }
 show(E.eagle());
 const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),17500);
 const birdRegion=({'bay-city':'saginaw-bay','traverse-city':'northern-lower','marquette':'upper-peninsula'})[region]||'saginaw-bay';
 const birdHit=waterfowlCache.get(birdRegion);
 const requests=[
  lookup('/api/shed-antlers?mode=forecast&site='+encodeURIComponent(region),ac.signal),
  lookup('/api/maple-sap?mode=site&site='+encodeURIComponent(region),ac.signal),
  rockCache&&Date.now()-rockCache.at<600000?Promise.resolve(rockCache.data):lookup('/api/michigan-rockhounding',ac.signal).then(data=>{rockCache={at:Date.now(),data};return data;}),
  birdHit&&Date.now()-birdHit.at<600000?Promise.resolve(birdHit.data):lookup('/api/waterfowl-freeze-line?mode=region&region='+encodeURIComponent(birdRegion),ac.signal).then(data=>{waterfowlCache.set(birdRegion,{data,at:Date.now()});return data;})
 ];
 // Independent settles let valid tools work when one external provider fails.
 const results=await Promise.allSettled(requests);
 clearTimeout(timer);if(request!==sequence)return;
 const interpret=[d=>E.shed(d,Date.now(),name),d=>E.maple(d,Date.now(),name),d=>E.rock(d,Date.now()),d=>E.waterfowl(d,Date.now())];
 ['shed','maple','rock','waterfowl'].forEach((id,i)=>{
   if(results[i].status==='fulfilled'){try{show(interpret[i](results[i].value))}catch{unavailable(id)}}
   else unavailable(id);
 });
 const now=new Date();$('week-updated').textContent='Checked '+now.toLocaleString('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'})+' · Local planning is not an event sighting or a safety guarantee.';
 btn.disabled=false;btn.textContent='Refresh conditions';
}
$('week-region').addEventListener('change',refresh);
$('week-refresh').addEventListener('click',refresh);
// Lazy auto-check: the directory stays fast until the user nears this section.
// A manual refresh remains available if IntersectionObserver is unsupported.
if('IntersectionObserver' in window){
 const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){observer.disconnect();if(!started)refresh()}},{rootMargin:'220px 0px'});
 observer.observe(root);
}else refresh();
})();
