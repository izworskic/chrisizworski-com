'use strict';
// Descriptive linear referencing on existing reviewed research polylines.
// This is not navigation, a surveyed channel, a lock event or an ETA.
const LIMITS=Object.freeze({maxOffsetNm:0.35,nearTieNm:0.15,endBufferNm:0.05,
 lockBufferNm:0.25,maxCourseDifference:55,minMovingKnots:1.5,maxResearchKnots:40,
 maxGapSeconds:180,minProgressNm:0.025,maxSpeedDisagreementKnots:6});
const num=(v,min,max)=>typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;
const angle=(a,b)=>Math.abs(((a-b+540)%360)-180);
function dateMs(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s))return NaN;
 const t=Date.parse(s);
 return Number.isFinite(t)&&new Date(t).toISOString().slice(0,19)===s.slice(0,19)?t:NaN;
}
function makeCorridor(routes,{project,routeLengthNm,inChamber}){
 if(!routes||typeof project!=='function'||typeof routeLengthNm!=='function'||typeof inChamber!=='function')throw Error('Existing geometry adapter required');
 const paths=Object.entries(routes).map(([id,points])=>{
  if(!Array.isArray(points)||points.length<2||points.some((p,i)=>!Array.isArray(p)||p.length!==2||!num(p[0],-90,90)||!num(p[1],-180,180)||
   (i>0&&p[0]===points[i-1][0]&&p[1]===points[i-1][1])))throw Error('Invalid corridor geometry');
  return {id,points,length:routeLengthNm(points)};
 });
 const result=(v,state,extra={})=>({state,observedAt:v?.seen??null,observedPosition:num(v?.lat,-90,90)&&num(v?.lon,-180,180)?{lat:v.lat,lon:v.lon}:null,
   direction:null,routeCandidates:[],distanceRangeNm:null,forecastEnabled:false,...extra});
 function classify(v){
  if(!num(v?.lat,-90,90)||!num(v?.lon,-180,180)||!Number.isFinite(dateMs(v?.seen)))return result(v,'INVALID_OBSERVATION');
  if(inChamber(v))return result(v,'NEAR_LOCK_CHAMBER_REFERENCE');
  const ranked=paths.map(r=>({id:r.id,...project(r.points,[v.lat,v.lon]),length:r.length,
   points:r.points})).sort((a,b)=>a.lateralNm-b.lateralNm||a.id.localeCompare(b.id));
  const best=ranked[0];
  if(!best||best.lateralNm>LIMITS.maxOffsetNm)return result(v,'OFF_CORRIDOR_MODEL');
  if(best.alongNm<=LIMITS.lockBufferNm||best.length-best.alongNm<=LIMITS.endBufferNm)return result(v,'NEAR_MODEL_BOUNDARY');
  const close=ranked.filter(r=>r.lateralNm<=LIMITS.maxOffsetNm&&r.lateralNm-best.lateralNm<=LIMITS.nearTieNm);
  // Shared sections can have different cumulative mileages. Preserve the range,
  // not a fictional single branch. Divergent local segments remain ambiguous.
  const sameLocal=close.every(r=>JSON.stringify(r.points.slice(r.segment,r.segment+2))===JSON.stringify(best.points.slice(best.segment,best.segment+2)));
  if(close.length>1&&!sameLocal)return result(v,'AMBIGUOUS_CORRIDOR',{routeCandidates:close.map(r=>r.id)});
  // Adjacent segments with markedly different tangents at a tight turn cannot
  // determine a unique local direction from a single point.
  const local=best.points.slice(best.segment,best.segment+2);
  const other=best.points.slice(Math.max(0,best.segment-1),Math.min(best.points.length,best.segment+3));
  if(other.length>local.length){
   for(let j=Math.max(0,best.segment-1);j<=Math.min(best.points.length-2,best.segment+1);j++){
    if(j===best.segment)continue;
    const p=project(best.points.slice(j,j+2),[v.lat,v.lon]);
    if(p.lateralNm<=best.lateralNm+0.025&&angle(p.towardLocks,best.towardLocks)>45)
     return result(v,'AMBIGUOUS_TURN',{routeCandidates:close.map(r=>r.id)});
   }
  }
  const matches=close.map(({id,alongNm,lateralNm,segment})=>({id,alongNm,lateralNm,segment}));
  const geometry={routeCandidates:matches.map(r=>r.id),matches,distanceRangeNm:[Math.min(...matches.map(r=>r.alongNm)),Math.max(...matches.map(r=>r.alongNm))]};
  if(!num(v.speedKnots,0,LIMITS.maxResearchKnots)||v.speedKnots<LIMITS.minMovingKnots||!num(v.course,0,359.9))
    return result(v,'POSITION_ONLY_MOTION_UNRESOLVED',geometry);
  const a=angle(v.course,best.towardLocks),b=angle(v.course,(best.towardLocks+180)%360);
  const direction=a<=LIMITS.maxCourseDifference?'toward-locks':b<=LIMITS.maxCourseDifference?'away-from-locks':null;
  return result(v,direction?'COURSE_SUPPORTS_DIRECTION':'CROSS_CHANNEL_OR_UNRESOLVED',{...geometry,direction});
 }
 function pair(a,b){
  const dt=(dateMs(b?.seen)-dateMs(a?.seen))/1000;
  const no=reason=>({state:reason,forecastEnabled:false});
  if(!/^\d{9}$/.test(String(a?.mmsi||''))||a.mmsi!==b?.mmsi)return no('IDENTITY_MISMATCH');
  if(!Number.isFinite(dt)||dt<=0||dt>LIMITS.maxGapSeconds)return no('GAP_OR_TIME_UNRESOLVED');
  const x=classify(a),y=classify(b);
  if(!x.direction||!y.direction||x.direction!==y.direction)return no('DIRECTION_UNRESOLVED_OR_CHANGED');
  const common=x.matches.filter(i=>y.matches.some(j=>j.id===i.id));
  if(!common.length)return no('BRANCH_CHANGE_UNRESOLVED');
  const deltas=common.map(i=>y.matches.find(j=>j.id===i.id).alongNm-i.alongNm);
  const sign=x.direction==='toward-locks'?-1:1;
  if(deltas.some(d=>d*sign<LIMITS.minProgressNm))return no('INSUFFICIENT_OR_CONTRADICTORY_PROGRESS');
  const speeds=deltas.map(d=>Math.abs(d)*3600/dt),reported=(a.speedKnots+b.speedKnots)/2;
  if(speeds.some(v=>v>LIMITS.maxResearchKnots||Math.abs(v-reported)>LIMITS.maxSpeedDisagreementKnots))
    return no('IMPLIED_PROGRESS_SPEED_DISAGREES');
  return {state:'OBSERVED_PAIR_SUPPORTS_PROGRESS',direction:x.direction,seconds:dt,
   routeCandidates:common.map(r=>r.id),progressNmRange:[Math.min(...deltas.map(Math.abs)),Math.max(...deltas.map(Math.abs))],
   from:a.seen,to:b.seen,forecastEnabled:false};
 }
 return {classify,pair};
}
module.exports={LIMITS,makeCorridor,dateMs};
