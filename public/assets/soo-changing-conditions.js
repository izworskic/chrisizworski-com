/* Soo Locks change intelligence. Session-local comparisons, never a passage or delay detector. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.SooChangingConditions=api;
})(typeof window!=='undefined'?window:globalThis,function(){
 'use strict';
 const MIN=60000,MAX_GAP=15*MIN,THRESHOLD=15*MIN,MAX_SHIPS=128;
 const time=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s))return NaN;const t=Date.parse(s);return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===s.slice(0,19)?t:NaN;};
 const id=s=>String(s?.mmsi||s?.id||'');
 const clean=s=>typeof s==='string'&&s.trim()?s.trim().slice(0,100):'';
 const valid=(t,now,limit)=>Number.isFinite(t)&&Number.isFinite(now)&&t<=now&&now-t<=limit;
 function snapshot(data,now,core,near){
   const checked=time(data?.checkedAt),n=data?.nextShip;
   if(data?.ok!==true||n?.ok!==true||!valid(checked,now,MAX_GAP)||!Array.isArray(n.candidates)||!Array.isArray(n.inLock)||!core.navigationSeason(now).open)return null;
   const ships=Object.create(null),conflicts=new Set(),listed=new Set();
   function add(s,kind,limit){
     const key=id(s),seen=time(s?.seen);
     if(/^\d{9}$/.test(key))listed.add(key);
     if(!/^\d{9}$/.test(key)||!valid(seen,now,limit)||seen>checked)return;
     const item={id:key,name:clean(s.name)||'Vessel '+key,kind,seen};
     if(kind==='timed'){
       const w=s.window||{},start=time(w.start),mid=time(w.midpoint),end=time(w.end);
       if(![start,mid,end].every(Number.isFinite)||start>mid||mid>end||end<=start||end<=now||end-start>7*24*60*MIN)return;
       Object.assign(item,{start,mid,end});
     }
     if(ships[key]){
       if(ships[key].kind!==kind||ships[key].seen!==seen||ships[key].mid!==item.mid||ships[key].start!==item.start||ships[key].end!==item.end)conflicts.add(key);
       return;
     }
     if(Object.keys(ships).length>=MAX_SHIPS)return;
     ships[key]=item;
   }
   n.inLock.forEach(s=>add(s,'chamber',MAX_GAP));
   n.candidates.forEach(s=>add(s,'timed',MAX_GAP));
   if(near)near.freshNearLock(data,false,now).forEach(s=>add(s,'slow',5*MIN));
   conflicts.forEach(k=>delete ships[k]);
   // A malformed or truncated snapshot is not evidence of missing ships.
   if(conflicts.size||n.inLock.length+n.candidates.length+(Array.isArray(n.nearLockMotion)?n.nearLockMotion.length:0)>MAX_SHIPS)return null;
   if(Array.isArray(n.nearLockMotion))n.nearLockMotion.forEach(s=>{const k=id(s);if(/^\d{9}$/.test(k))listed.add(k);});
   return {checked,ships,listed};
 }
 function initial(){return {last:null,anchors:Object.create(null),withdrawn:Object.create(null),events:[],failed:false};}
 function event(kind,s,from,to,extra={}){return {kind,id:s?.id||null,name:s?.name||null,from,to,...extra};}
 function step(prev,next,failed,now,threshold=THRESHOLD){
   prev=prev||initial();
   if(failed||!next)return {...prev,failed:true,events:[]};
   if(prev.last&&next.checked<=prev.last.checked)return prev;
   if(prev.failed){
     return {last:next,anchors:seed(next),withdrawn:Object.create(null),events:[event('recovered',null,prev.last?.checked??next.checked,next.checked)],failed:false};
   }
   if(!prev.last||next.checked-prev.last.checked>MAX_GAP)return {last:next,anchors:seed(next),withdrawn:Object.create(null),events:[],failed:false};
   const anchors=Object.create(null),withdrawn=Object.create(null),events=[],old=prev.last;
   Object.values(prev.withdrawn).filter(x=>next.checked-x.at<=MAX_GAP).forEach(x=>{withdrawn[x.id]=x;});
   // Do not mistake an elapsed or aged-out estimate for newly observed motion.
   for(const s of Object.values(old.ships)){
     if(s.kind==='timed'&&!next.listed.has(s.id)&&s.end>next.checked&&next.checked-s.seen<=MAX_GAP){
       events.push(event('withdrawn',s,old.checked,next.checked));withdrawn[s.id]={id:s.id,at:next.checked};
     }
   }
   for(const s of Object.values(next.ships)){
     const prior=old.ships[s.id],anchor=prev.anchors[s.id];
     if(prior&&s.seen<prior.seen){anchors[s.id]=anchor||{...prior,at:old.checked};continue;}
     if(s.kind==='timed'){
       if(prior?.kind==='timed'){
         const base=anchor&&anchor.kind==='timed'&&next.checked-anchor.at<=MAX_GAP?anchor:{...prior,at:old.checked};
         const delta=s.mid-base.mid,edges=Math.max(Math.abs(s.start-base.start),Math.abs(s.end-base.end));
         if(s.seen>prior.seen&&(Math.abs(delta)>=threshold||edges>=threshold)){
           events.push(event(Math.abs(delta)>=threshold?'shifted':'window-changed',s,base.at,next.checked,{minutes:Math.round(delta/MIN)}));
           anchors[s.id]={...s,at:next.checked};
         }else anchors[s.id]=base;
       }else{
         const kind=withdrawn[s.id]||prior?.kind==='slow'||prior?.kind==='chamber'?'resumed':'new-estimate';
         if(!prior||s.seen>prior.seen)events.push(event(kind,s,old.checked,next.checked));
         anchors[s.id]={...s,at:next.checked};
       }
       delete withdrawn[s.id];
     }else{
       if((!prior||prior.kind!==s.kind)&&(!prior||s.seen>prior.seen))events.push(event(s.kind==='chamber'?'chamber':'slow',s,old.checked,next.checked,{withdrawn:prior?.kind==='timed'}));
       if(prior?.kind==='timed')withdrawn[s.id]={id:s.id,at:next.checked};
       anchors[s.id]={...s,at:next.checked};
     }
   }
   // A missing or changed report is not proof of departure. Retain a recent
   // material event only while its associated evidence still supports the label.
   const currentEvents=events.length?events:prev.events.filter(e=>next.checked-e.to<=MAX_GAP&&supports(e,next,now));
   return {last:next,anchors,withdrawn,events:currentEvents,failed:false};
 }
 function seed(next){const a=Object.create(null);Object.values(next.ships).forEach(s=>{a[s.id]={...s,at:next.checked};});return a;}
 function supports(e,next,now){
   if(!valid(e.to,now,MAX_GAP)||!next||!valid(next.checked,now,MAX_GAP))return false;
   if(e.kind==='recovered')return true;
   const s=next.ships[e.id];
   if(e.kind==='withdrawn')return !next.listed.has(e.id);
   if(!s||!valid(s.seen,now,s.kind==='slow'?5*MIN:MAX_GAP))return false;
   if(e.kind==='slow'||e.kind==='chamber')return s.kind===e.kind;
   return s.kind==='timed'&&s.end>now;
 }
 function summary(state,now,preferred=[]){
   if(!state||state.failed)return null;
   const order={recovered:0,withdrawn:1,chamber:2,slow:3,resumed:4,shifted:5,'window-changed':6,'new-estimate':7};
   const available=state.events.filter(e=>supports(e,state.last,now)).sort((a,b)=>{
     if(a.kind==='recovered'||b.kind==='recovered')return order[a.kind]-order[b.kind];
     const aRank=preferred.indexOf(a.id),bRank=preferred.indexOf(b.id);
     return (aRank<0?999:aRank)-(bRank<0?999:bRank)||order[a.kind]-order[b.kind]||String(a.id).localeCompare(String(b.id));
   });
   const e=available[0];if(!e)return null;
   const messages={
     recovered:'Fresh check available after an unsuccessful refresh. Review your current visit plan.',
     withdrawn:e.name+': the previous arrival estimate is no longer listed. This does not establish a departure or passage.',
     chamber:e.name+': newly reported in a lock chamber. Check the observation age.',
     slow:e.name+': newly reported at low speed near the locks. Arrival timing is uncertain.',
     resumed:e.name+': an arrival estimate is available again. Review the current window.',
     shifted:e.name+': the estimated arrival midpoint moved '+Math.abs(e.minutes)+' min '+(e.minutes<0?'earlier':'later')+'. Review your visit timing.',
     'window-changed':e.name+': the estimated arrival window changed. Review your visit timing.',
     'new-estimate':e.name+': an arrival estimate is now listed. Review the current window.'
   };
   return {kind:e.kind,text:messages[e.kind],from:e.from,to:e.to,count:available.length};
 }
 return {MIN,MAX_GAP,THRESHOLD,snapshot,initial,step,summary};
});
