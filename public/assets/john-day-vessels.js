'use strict';
(function(root){
 const LOCK={lat:45.719149,lon:-120.697630};
 function describe(v,now=Date.now()){
  const seen=Date.parse(v.seen);if(!Number.isFinite(seen)||now-seen>1800000||seen>now+60000||!Number.isFinite(v.lon)||!Number.isFinite(v.lat))return null;
  const east=(LOCK.lon-v.lon)*Math.cos(LOCK.lat*Math.PI/180)*111.32,north=(LOCK.lat-v.lat)*111.32;
  const km=Math.hypot(east,north),bearing=(Math.atan2(east,north)*180/Math.PI+360)%360;
  const pointsToward=Number.isFinite(v.course)&&Math.cos((v.course-bearing)*Math.PI/180)>.6;
  let movement='Other recent river report',kind='nearby';
  if(km<2){movement='Near the lock area';kind='near-lock'}
  else if(v.speedKnots>=.5&&pointsToward&&km<=20){movement='Course toward the lock area';kind='toward'}
  else if(Number.isFinite(v.speedKnots)&&v.speedKnots<.5){movement='Slow / stationary report';kind='slow'}
  return {...v,km,kind,movement,ageMinutes:Math.max(0,Math.floor((now-seen)/60000))};
 }
 const api={describe};if(typeof module==='object'&&module.exports)module.exports=api;root.JohnDayVessels=api;
})(typeof window==='object'?window:globalThis);
