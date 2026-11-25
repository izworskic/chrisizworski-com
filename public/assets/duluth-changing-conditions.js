/* Duluth-specific input and copy; reuse the verified Soo change-state engine.
 * A candidate list is capped at eight by the existing API, not a traffic census. */
(function(root,factory){
 const api=typeof module==='object'&&module.exports?factory(require('./soo-changing-conditions'),require('./ais-movement')):factory(root.SooChangingConditions,root.GreatLakesAisEvidence);
 if(typeof module==='object'&&module.exports)module.exports=api;else root.DuluthChanges=api;
})(typeof window==='object'?window:{},function(core,ais){
 'use strict';
 const GAP=15*60000,MAX=8;
 const fresh=(t,now)=>Number.isFinite(t)&&t<=now&&now-t<=GAP;
 const key=(m,d)=>m+':'+d;
 function snapshot(data,now,previous){
   if(!core||!ais||data?.ok!==true||!Array.isArray(data.candidates)||data.candidates.length>MAX)return null;
   const checked=ais.utcMs(data.checkedAt);
   if(!fresh(checked,now))return null;
   const ships=Object.create(null),listed=new Set(),seenIds=new Set();
   for(const s of data.candidates){
     if(typeof s?.mmsi!=='string'||!/^\d{9}$/.test(s.mmsi)||!['arrival','departure'].includes(s.direction)||seenIds.has(s.mmsi))return null;
     seenIds.add(s.mmsi);
     const id=key(s.mmsi,s.direction),opposite=key(s.mmsi,s.direction==='arrival'?'departure':'arrival');
     // Presence under either direction cannot establish a withdrawal.
     listed.add(id);listed.add(opposite);
     const seen=ais.utcMs(s.seen);
     const start=ais.utcMs(s.window?.start),mid=ais.utcMs(s.window?.midpoint),end=ais.utcMs(s.window?.end);
     if(!fresh(seen,now)||seen>checked||![start,mid,end].every(Number.isFinite)||start>mid||mid>end||start>=end||end<=now||end-start>48*60*60000||end>checked+48*60*60000)continue;
     // An opposite-direction report cannot lower the vessel's observation watermark.
     const other=previous?.accepted?.[opposite];
     if(other&&seen<=other.seen)continue;
     const name=typeof s.name==='string'&&s.name.trim()?s.name.trim().slice(0,100):'Vessel '+s.mmsi;
     ships[id]={id,name,kind:'timed',seen,start,mid,end};
   }
   return {checked,ships,listed};
 }
 function initial(){return core?core.initial():null;}
 function step(prev,data,failed,now){
   if(!core)return null;
   return core.step(prev,failed?null:snapshot(data,now,prev),failed,now);
 }
 function summary(state,now,pick){
   if(!core||!state)return null;
   const selection=core.selectEvent(state,now,pick?[key(pick.mmsi,pick.direction)]:[]);
   if(!selection)return null;
   const e=selection.event;
   const direction=e.id?.endsWith(':departure')?'outbound':'inbound';
   const subject=e.name+': the '+direction+' passage estimate';
   const copy={
     recovered:'Fresh AIS check available again. Review the current canal watch.',
     shifted:subject+' midpoint moved '+Math.abs(e.minutes)+' min '+(e.minutes<0?'earlier':'later')+'. Recheck before heading to the bridge.',
     'window-changed':subject+' changed. Recheck the current planning window.',
     withdrawn:subject+' is no longer listed among the current candidates. This does not establish a passage, departure or route change.',
     resumed:subject+' is listed again. Check the current window.',
     'new-estimate':subject+' is now listed. Check the current window.'
   };
   return copy[e.kind]?{kind:e.kind,text:copy[e.kind],from:e.from,to:e.to}:null;
 }
 return {initial,step,summary,snapshot};
});
