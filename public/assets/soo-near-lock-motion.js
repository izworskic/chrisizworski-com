/* Observational state only: never an ETA, passage direction, queue or lock assignment. */
(function(root,factory){
  'use strict';
  const core=factory();
  if(typeof module==='object'&&module.exports)module.exports=core;
  else root.SooNearLockMotion=core;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  const MAX_AGE_MS=5*60000,MAX_DISTANCE_NM=1,MAX_SPEED_KNOTS=1.5;
  const validTime=(value,now)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)&&Number.isFinite(now)&&Number.isFinite(Date.parse(value))&&new Date(Date.parse(value)).toISOString().slice(0,19)===value.slice(0,19)&&now>=Date.parse(value)&&now-Date.parse(value)<=MAX_AGE_MS;
  const validPosition=v=>Number.isFinite(v.lat)&&Math.abs(v.lat)<=90&&Number.isFinite(v.lon)&&Math.abs(v.lon)<=180;
  const validSpeed=v=>Number.isFinite(v.speedKnots)&&v.speedKnots>=0&&v.speedKnots<MAX_SPEED_KNOTS;
  const idValid=v=>typeof v.mmsi==='string'&&/^\d{9}$/.test(v.mmsi);
  const ranked=a=>{const ids=new Set();return a.sort((x,y)=>Date.parse(y.seen)-Date.parse(x.seen)||x.distanceNm-y.distanceNm||x.id.localeCompare(y.id)).filter(v=>{if(ids.has(v.id))return false;ids.add(v.id);return true;});};
  function observe(v,now,engine){
    if(!v||!idValid(v)||!Number.isInteger(v.shipType)||v.shipType<70||v.shipType>89||!validTime(v.seen,now)||!validPosition(v)||!validSpeed(v)||!engine.inBox(v,engine.RIVER_BBOX)||engine.inChamber(v))return null;
    const d=engine.distNm([v.lat,v.lon],engine.LOCK_POINT);
    if(!Number.isFinite(d)||d<0||d>MAX_DISTANCE_NM)return null;
    return {id:v.mmsi,mmsi:v.mmsi,name:typeof v.name==='string'&&v.name.trim()?v.name.trim().slice(0,100):'Vessel '+v.mmsi,lat:v.lat,lon:v.lon,seen:v.seen,speedKnots:v.speedKnots,distanceNm:Math.round(d*10)/10,state:'near-lock-low-motion'};
  }
  // Input must be the owning engine's latestReports-normalized vessel list.
  function observeList(vessels,now,engine){return ranked((Array.isArray(vessels)?vessels:[]).map(v=>observe(v,now,engine)).filter(Boolean));}
  function freshNearLock(data,failed,now){
    const n=data?.nextShip;
    if(failed||data?.ok!==true||n?.ok!==true||!Array.isArray(n.nearLockMotion))return [];
    const timed=new Set([...(Array.isArray(n.inLock)?n.inLock:[]),...(Array.isArray(n.candidates)?n.candidates:[]),...(n.pick?[n.pick]:[])].map(v=>String(v?.mmsi||v?.id||'')));
    return ranked(n.nearLockMotion.filter(v=>v?.state==='near-lock-low-motion'&&idValid(v)&&v.id===v.mmsi&&typeof v.name==='string'&&v.name.trim().length>0&&v.name.length<=100&&!timed.has(v.id)&&validTime(v.seen,now)&&validPosition(v)&&Number.isFinite(v.distanceNm)&&v.distanceNm>=0&&v.distanceNm<=MAX_DISTANCE_NM&&validSpeed(v)));
  }
  function visitorState(data,failed,now){
    const ships=freshNearLock(data,failed,now);
    if(!ships.length)return null;
    const s=ships[0],age=Math.floor((now-Date.parse(s.seen))/60000);
    const speed=s.speedKnots===0?'0':s.speedKnots<.1?'less than 0.1':s.speedKnots.toFixed(1);
    return {ship:s,headline:s.name+(s.speedKnots===0?' reported at zero speed near the locks':' reported moving slowly near the locks'),detail:'Within 1 nautical mile of the lock complex (straight-line distance). Reported speed '+speed+' knots. Observation '+(age===0?'less than a minute ago':age+' min ago')+'. Arrival timing is uncertain. This report does not show whether the ship is waiting to enter a lock.',action:'Show this vessel on the live map',additional:ships.length-1};
  }
  function nextExpiry(data,failed,now){
    const ships=freshNearLock(data,failed,now);
    return ships.length?Math.min(...ships.map(s=>Date.parse(s.seen)+MAX_AGE_MS+1)):null;
  }
  return {MAX_AGE_MS,MAX_DISTANCE_NM,MAX_SPEED_KNOTS,observe,observeList,freshNearLock,visitorState,nextExpiry};
});
