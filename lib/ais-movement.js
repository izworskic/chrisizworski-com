'use strict';
// Common observation contract for Great Lakes AIS consumers. Never extrapolate.
const MAX_AGE_MS=30*60000;
const MOTION_MAX_AGE_MS=15*60000; // conservative decision policy, not a calibrated threshold
const finite=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max?v:null;
function utcMs(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return NaN;
 const [y,m,d]=value.slice(0,10).split('-').map(Number);
 if(m<1||m>12||d<1||d>new Date(Date.UTC(y,m,0)).getUTCDate()||Number(value.slice(11,13))>23)return NaN;
 return Date.parse(value);
}
function observedFields(p){
 return {speedKnots:finite(p.sog,0,102.2)===102.2?null:finite(p.sog,0,102.2),
  course:finite(p.cog,0,359.9),heading:finite(p.heading,0,359)};
}
function motion(v,now){
 const age=now-utcMs(v?.seen);
 const speed=finite(v?.speedKnots,0,102.2);
 const validSpeed=speed!==null&&speed<102.2;
 const course=finite(v?.course,0,359.9);
 const recent=Number.isFinite(age)&&age>=0&&age<=MOTION_MAX_AGE_MS;
 const state=!recent?'unknown':!validSpeed?'unknown':speed<=0.5?'low-reported-speed':'moving';
 return {state,asOf:v?.seen??null,ageSeconds:Number.isFinite(age)&&age>=0?Math.floor(age/1000):null,
  courseOverGround:state==='moving'?course:null,
  approachEligible:recent&&validSpeed&&speed>=1.5&&course!==null,
  basis:'single AIS position report; not a verified trajectory, berth or passage'};
}
// A same-time contradictory report is not resolved by arbitrary feed order.
// A strictly newer valid report can supersede a conflict; no older fix is
// promoted as current when the newest received report is contradictory.
function latestReports(reports){
 const byId=new Map();
 for(const v of reports){
  const time=utcMs(v.seen);
  if(!Number.isFinite(time))continue;
  const prior=byId.get(v.mmsi);
  if(!prior||time>prior.time){byId.set(v.mmsi,{v,time,conflict:false});continue;}
  if(time<prior.time)continue;
  if(['lat','lon','speedKnots','course','heading'].some(k=>v[k]!==prior.v[k]))prior.conflict=true;
 }
 return [...byId.values()].filter(x=>!x.conflict).map(x=>x.v);
}
function eligibleApproach(v,now){return motion(v,now).approachEligible;}
module.exports={MAX_AGE_MS,MOTION_MAX_AGE_MS,utcMs,observedFields,motion,latestReports,eligibleApproach};
