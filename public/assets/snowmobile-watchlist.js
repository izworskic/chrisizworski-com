/* Saved riding places and source-dated return receipts, device only. */
(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SnowmobileWatchlist=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const KEY='ciz:snowmobile:spots:v1',DAY=86400000,HOUR=3600000;
 const REGIONS=new Set(['eastern-up','keweenaw-copper-country','central-western-up','grayling-gaylord','northeast-sunrise','northwest-michigan','west-michigan']);
 const stamp=v=>typeof v==='string'&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
 const fresh=(v,now,max)=>{const t=stamp(v);return t!==null&&t<=now&&now-t<=max;};
 const date=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T12:00:00Z'))&&new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v;
 const inches=v=>Number.isFinite(v)&&v>=0&&v<=1000;
 const str=v=>typeof v==='string'&&v.trim().length>0&&v.length<=120;
 function place(value){
  const region=value?.region,label=value?.label,url=value?.url;
  if(!REGIONS.has(region)||!str(label)||typeof url!=='string')return null;
  const base='/snowmobile/regions/'+region+'.html';
  if(url===base&&value.id==='region-'+region)return {id:value.id,label,region,url};
  if(!url.startsWith(base+'#trail-conditions-near-'))return null;
  const slug=url.slice((base+'#trail-conditions-near-').length);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||value.id!=='town-'+region+'-'+slug)return null;
  return {id:value.id,label,region,url};
 }
 function regionPlace(region){return place({id:'region-'+region.key,label:region.shortLabel||region.label,region:region.key,url:'/snowmobile/regions/'+region.key+'.html'});}
 function townPlace(town){
  // The existing search returns only verified DNR town references.
  const slug=String(town?.url||'').split('#trail-conditions-near-')[1];
  return place({id:'town-'+town?.region+'-'+slug,label:town?.name,region:town?.region,url:town?.url});
 }
 function cleanReading(r,now){
  if(!r||typeof r!=='object')return {};
  const out={};
  if(fresh(r.snow?.at,now,7*DAY))out.snow={at:r.snow.at,largest48:inches(r.snow.largest48)?r.snow.largest48:null};
  const f=r.forecast;
  if(fresh(f?.at,now,7*DAY)&&stamp(f.start)!==null&&stamp(f.end)!==null&&stamp(f.end)-stamp(f.start)===72*HOUR)
   out.forecast={at:f.at,start:f.start,end:f.end,total:inches(f.total)?f.total:null};
  const c=r.closure;
  if(fresh(c?.at,now,7*DAY)&&typeof c.matched==='boolean')out.closure={at:c.at,matched:c.matched};
  const club=r.clubs;
  if(fresh(club?.at,now,7*DAY)&&Array.isArray(club.reports)){
   const names=new Set(),reports=[];
   for(const x of club.reports.slice(0,25)){
    if(!str(x?.name)||names.has(x.name))continue;names.add(x.name);
    reports.push({name:x.name,reportedAt:date(x.reportedAt)?x.reportedAt:null,
      groomedAt:date(x.groomedAt)?x.groomedAt:null,checked:x.checked===true});
   }
   out.clubs={at:club.at,reports};
  }
  return out;
 }
 function read(storage,now=Date.now()){
  try{
   const raw=storage.getItem(KEY);
   if(!raw)return {spots:[],available:true};
   const data=JSON.parse(raw);
   if(data?.version!==1||!Array.isArray(data.spots))return {spots:[],available:true};
   const ids=new Set(),spots=[];
   for(const x of data.spots.slice(0,34)){
    const p=place(x);if(!p||ids.has(p.id))continue;ids.add(p.id);
    spots.push({...p,savedAt:fresh(x.savedAt,now,100*365*DAY)?x.savedAt:new Date(now).toISOString(),lastSeen:cleanReading(x.lastSeen,now)});
   }
   return {spots,available:true};
  }catch{return {spots:[],available:false};}
 }
 function write(storage,spots){
  try{storage.setItem(KEY,JSON.stringify({version:1,spots}));return true;}catch{return false;}
 }
 function clear(storage){
  try{storage.removeItem(KEY);return true;}catch{return false;}
 }
 function capture(bundle,region,receipt,comparison,now=Date.now()){
  const out={};
  if(comparison.bundleFresh(bundle,now)&&region&&!region.error){
   const snow=region.surfaceEvidence?.observedSnow;
   if(snow?.available&&fresh(snow.latestAt,now,7*DAY))
    out.snow={at:snow.latestAt,largest48:fresh(snow.latestAt,now,2*DAY)&&inches(snow.largest48hInches)?snow.largest48hInches:null};
   const f=comparison.currentOutlook(region.weather,now);
   if(f)out.forecast={at:f.issuedAt,start:f.startAt,end:f.endAt,total:inches(f.snowTotalInches)?f.snowTotalInches:null};
   const r=region.route;
   if(bundle.season?.active===true&&bundle.statewide?.closuresVerified===true){
    if(r?.routeState==='ROUTE_BROKEN'&&r.legalVerification==='CURRENT_LAYER_MATCH')
     out.closure={at:bundle.generatedAt,matched:true};
    else if(['CONNECTED','DETOUR_OR_AVOID','UNVERIFIED'].includes(r?.routeState)&&r.legalVerification==='CURRENT_LAYER_CHECKED')
     out.closure={at:bundle.generatedAt,matched:false};
   }
  }
  const c=region&&comparison.clubEvidence(receipt,region.key,now);
  if(c&&c.available>0)out.clubs={at:c.checkedAt,reports:c.reports.map(r=>({name:r.name,
   reportedAt:['RECENT','AGING','STALE'].includes(r.state)?r.reportedAt:null,
   groomedAt:r.grooming?r.lastGroomedAt:null,
   checked:!['UNAVAILABLE','UNDATED','DATE_CONFLICT'].includes(r.state)}))};
  return cleanReading(out,now);
 }
 function mergeReading(old,current,now=Date.now()){
  const prior=cleanReading(old,now),next=cleanReading(current,now);
  for(const key of Object.keys(next)){
   if(prior[key]&&stamp(next[key].at)<stamp(prior[key].at))continue;
   if(key==='clubs'&&prior.clubs){
    // Preserve a source's previous dated observation if its current check
    // failed; a failure must not erase the comparison baseline.
    const previous=new Map(prior.clubs.reports.map(r=>[r.name,r]));
    next.clubs.reports=next.clubs.reports.map(r=>r.checked?r:previous.get(r.name)||r);
   }
   prior[key]=next[key];
  }
  return prior;
 }
 function changes(previous,current,now=Date.now()){
  const p=cleanReading(previous,now),c=cleanReading(current,now),lines=[];
  if(c.snow&&p.snow&&stamp(c.snow.at)>stamp(p.snow.at))lines.push('A newer dated NWS snowfall report is available in the region.');
  if(c.forecast&&p.forecast&&stamp(c.forecast.at)>stamp(p.forecast.at))lines.push('NWS issued a newer 72-hour hub forecast.');
  if(c.closure&&p.closure&&stamp(c.closure.at)>stamp(p.closure.at)&&c.closure.matched!==p.closure.matched)
   lines.push(c.closure.matched?'A route-breaking DNR closure is now matched.':'The prior route-breaking closure is not matched in this check. Verify the DNR map; this is not confirmation of opening.');
  if(c.clubs&&p.clubs&&stamp(c.clubs.at)>stamp(p.clubs.at)){
   const old=new Map(p.clubs.reports.filter(r=>r.checked).map(r=>[r.name,r]));
   for(const r of c.clubs.reports){
    const before=old.get(r.name);if(!r.checked||!before)continue;
    if(r.reportedAt&&before.reportedAt&&r.reportedAt>before.reportedAt)lines.push(r.name+' posted a newer dated report.');
    if(r.groomedAt&&before.groomedAt&&r.groomedAt>before.groomedAt)lines.push(r.name+' lists a newer grooming date.');
    else if(r.groomedAt&&!before.groomedAt)lines.push(r.name+' now has current dated grooming evidence.');
   }
  }
  return lines;
 }
 function mount({document:doc,storage,comparison,search}){
  const by=id=>doc.getElementById(id),panel=by('sled-watchlist'),list=by('sled-watch-items'),message=by('sled-watch-message');
  if(!panel||!list||!message)return null;
  const init=read(storage);let spots=init.spots,available=init.available,latest=null,checks=null,failed=false,signature='',searchHandle=null;
  const baseline=new Map(spots.map(s=>[s.id,s.lastSeen]));
  const node=(tag,value,cls)=>{const n=doc.createElement(tag);if(value!==undefined)n.textContent=value;if(cls)n.className=cls;return n;};
  const status=t=>{message.textContent=t;};
  function persist(){if(!write(storage,spots)){available=false;status('Device storage is unavailable. Saved places last only until this page closes.');}}
  function when(value){return new Intl.DateTimeFormat('en-US',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'America/Detroit',timeZoneName:'short'}).format(new Date(value));}
  function amount(v){return v===0?'0 in':v<.1?'<0.1 in':v.toFixed(1)+' in';}
  function reading(s,now){
   const region=latest?.regions?.find(r=>r.key===s.region);
   return capture(latest,region,checks?.get(s.region)?.data,comparison,now);
  }
  function syncButtons(){
   for(const button of doc.querySelectorAll('[data-sled-watch-region]')){
    const saved=spots.some(s=>s.id==='region-'+button.dataset.sledWatchRegion);
    button.textContent=saved?'Saved to My riding places':'Save this riding region';
    button.setAttribute('aria-pressed',String(saved));
   }
  }
  function render(){
   panel.hidden=!spots.length&&by('sled-watch-add')?.getAttribute('aria-expanded')!=='true';
   by('sled-watch-clear').hidden=!spots.length;
   syncButtons();
   const now=Date.now(),display=spots.map(s=>({s,current:reading(s,now)}));
   const sig=JSON.stringify([display,failed,available,spots.length]);
   if(sig===signature)return;signature=sig;
   const focused=doc.activeElement?.getAttribute('data-watch-remove');
   list.replaceChildren();
   for(const {s,current} of display){
    const card=node('li',undefined,'sled-watch-item'),head=node('div',undefined,'sled-watch-item-head');
    const link=node('a',s.label);link.href=s.url;head.append(link);
    const remove=node('button','Remove','secondary-btn');remove.type='button';remove.setAttribute('data-watch-remove',s.id);remove.setAttribute('aria-label','Remove '+s.label);
    remove.addEventListener('click',()=>toggle(s));head.append(remove);card.append(head);
    const region=latest?.regions?.find(r=>r.key===s.region);
    const regionName=region?.shortLabel||region?.label||s.region.replace(/-/g,' ');
    card.append(node('p',s.id.startsWith('town-')?'Regional evidence for '+regionName+'; open town for local sources.':'Evidence for the mapped regional route.','small'));
    const delta=changes(baseline.get(s.id),current,now);
    const hasCurrent=Object.keys(current).length>0,old=cleanReading(s.lastSeen,now);
    const comparable=Object.keys(current).some(k=>baseline.get(s.id)?.[k]);
    card.append(node('p',delta.length?'Since your last visit: '+delta.join(' '):hasCurrent?(comparable?'No newer comparable source changes detected.':'First current check for this place.'):'No current reading.','sled-watch-change'));
    if(current.snow)card.append(node('p','NWS snowfall report dated '+when(current.snow.at)+(current.snow.largest48!==null?'; largest report in past 48h: '+amount(current.snow.largest48):'')+'.','small'));
    if(current.forecast)card.append(node('p','Hub forecast '+(current.forecast.total===null?'amount unavailable':amount(current.forecast.total)+' new snow')+' through '+when(current.forecast.end)+'; issued '+when(current.forecast.at)+'.','small'));
    if(current.closure)card.append(node('p',(current.closure.matched?'Route-breaking closure matched.':'No route-breaking closure matched; not proof of an open trail.')+' Checked '+when(current.closure.at)+'.','small'));
    if(current.clubs){
     const posted=current.clubs.reports.filter(r=>r.checked&&r.reportedAt).sort((a,b)=>b.reportedAt.localeCompare(a.reportedAt))[0];
     const groomed=current.clubs.reports.filter(r=>r.checked&&r.groomedAt);
     card.append(node('p',(posted?'Latest dated club posting: '+posted.name+' '+posted.reportedAt+'. ':'No dated posting verified. ')+groomed.length+' club(s) with current dated grooming. Sources checked '+when(current.clubs.at)+'.','small'));
    }
    const missing=Object.keys(old).filter(k=>!current[k]);
    if(missing.length){
     const labels={snow:'snow report',forecast:'hub forecast',closure:'closure check',clubs:'club check'};
     for(const k of missing){
      let v=old[k],line='Last known '+labels[k]+' · '+when(v.at)+' · STALE, not current.';
      if(k==='snow'&&v.largest48!==null)line+=' Previous largest 48h report: '+amount(v.largest48)+'.';
      if(k==='forecast'&&v.total!==null)line+=' Previous 72h forecast: '+amount(v.total)+' through '+when(v.end)+'.';
      card.append(node('p',line,'sled-watch-stale'));
     }
    }
    if(!hasCurrent&&!missing.length)card.append(node('p','No recent saved reading. Open the regional planner and verify original sources.','small'));
    list.append(card);
   }
   if(focused){
    const target=[...list.querySelectorAll('[data-watch-remove]')].find(b=>b.getAttribute('data-watch-remove')===focused);
    (target||by('sled-watch-add'))?.focus();
   }
  }
  function toggle(value){
   const p=place(value);if(!p)return;
   const n=spots.findIndex(s=>s.id===p.id);
   if(n>=0){spots.splice(n,1);baseline.delete(p.id);status('Removed '+p.label+'.');}
   else{
    if(spots.length>=34){status('Watchlist is full. Remove a place before adding another.');return;}
    const now=Date.now();spots.push({...p,savedAt:new Date(now).toISOString(),lastSeen:reading(p,now)});
    status('Saved '+p.label+' on this device.');
   }
   persist();render();
  }
  function update(bundle,clubChecks){
   latest=bundle;checks=clubChecks;failed=!bundle;
   const now=Date.now();let changed=false;
   for(const s of spots){
    const next=mergeReading(s.lastSeen,reading(s,now),now);
    if(JSON.stringify(next)!==JSON.stringify(s.lastSeen)){s.lastSeen=next;changed=true;}
   }
   if(changed)persist();render();
  }
  const add=by('sled-watch-add'),finder=by('sled-watch-finder');
  add.hidden=false;
  add.addEventListener('click',()=>{
   const open=add.getAttribute('aria-expanded')!=='true';add.setAttribute('aria-expanded',String(open));finder.hidden=!open;
   if(open){
    panel.hidden=false;
    if(!searchHandle&&search)searchHandle=search.attach(by('sled-watch-town'),by('sled-watch-results'),{mode:'towns',onSelect:t=>{
     const p=townPlace(t);if(p&&!spots.some(s=>s.id===p.id))toggle(p);else if(p)status(p.label+' is already saved.');
    },onInvalid:status});
    by('sled-watch-town')?.focus();
   }else render();
  });
  by('sled-watch-clear').addEventListener('click',()=>{
   spots=[];baseline.clear();if(!clear(storage)){available=false;status('Storage could not be cleared.');}else status('All saved riding places cleared.');
   render();add.focus();
  });
  by('region-list').addEventListener('click',e=>{
   const button=e.target.closest('[data-sled-watch-region]');if(!button)return;
   const region=latest?.regions?.find(r=>r.key===button.dataset.sledWatchRegion);
   if(region){const p=regionPlace(region);if(p)toggle(p);}
  });
  if(!available)status('Device storage is blocked. You can still use the planner; saved places last only for this visit.');
  render();
  return {update,render};
 }
 return {KEY,place,regionPlace,townPlace,read,write,clear,capture,mergeReading,changes,mount};
});
