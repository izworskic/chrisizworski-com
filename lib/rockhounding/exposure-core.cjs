'use strict';
// Research-only. Not a live recommendation or a calibrated wave-power model.
const missing = new Set(['MM','999','999.0','999.00','9999','9999.0']);
function bearing(deg){return Number.isFinite(deg)?((deg%360)+360)%360:null}
function separation(a,b){const x=bearing(a),y=bearing(b);return x===null||y===null?null:Math.abs(((x-y+540)%360)-180)}
function num(x,max){if(!x||missing.has(x))return null;const n=Number(x);return Number.isFinite(n)&&n>=0&&(max===undefined||n<=max)?n:null}
function parseNdbcStdmet(raw){
  if(typeof raw!=='string')return [];
  const lines=raw.split(/\r?\n/),header=lines.find(l=>/^#(?:YY|YYYY)\s/.test(l));
  if(!header)return [];
  const keys=header.slice(1).trim().split(/\s+/),ix=k=>keys.indexOf(k),rows=[];
  for(const line of lines){
    if(!/^\s*\d{2,4}\s+\d/.test(line))continue;
    const v=line.trim().split(/\s+/);
    if(v.length<keys.length)continue;
    const yr=Number(v[0]),year=yr<100?(yr>=70?yr+1900:yr+2000):yr;
    const date=Date.UTC(year,+v[1]-1,+v[2],+v[3],+v[4]);
    if(!Number.isFinite(date)||new Date(date).getUTCFullYear()!==year)continue;
    const h=num(v[ix('WVHT')],30);if(h===null)continue;
    const dir=num(v[ix('MWD')],360),dpd=num(v[ix('DPD')],40),apd=num(v[ix('APD')],40);
    rows.push({timestamp:new Date(date).toISOString(),waveHeightM:h,waveFromDeg:dir===360?0:dir,periodSeconds:dpd??apd});
  }
  return rows.sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
}
function exposureComparator(row,outwardBearing){
  const diff=separation(row?.waveFromDeg,outwardBearing);
  if(diff===null||!Number.isFinite(row?.waveHeightM)||!Number.isFinite(row?.periodSeconds)||row.waveHeightM<0||row.periodSeconds<=0)return null;
  const shorewardFraction=Math.max(0,Math.cos(diff*Math.PI/180));
  return {angleDifferenceDeg:diff,shorewardFraction,relativeIndex:row.waveHeightM**2*row.periodSeconds*shorewardFraction,kind:'UNCALIBRATED_COMPARATOR'};
}
function latestObservationWindow(rows,nowISO,hours=72,maxAgeHours=3){
  const now=Date.parse(nowISO);if(!Number.isFinite(now)||!Array.isArray(rows))return {status:'UNAVAILABLE'};
  const selected=rows.filter(x=>Number.isFinite(Date.parse(x.timestamp))&&Date.parse(x.timestamp)<=now&&Date.parse(x.timestamp)>=now-hours*3600000);
  if(!selected.length)return {status:'UNAVAILABLE'};
  const latest=selected.at(-1);
  if(now-Date.parse(latest.timestamp)>maxAgeHours*3600000)return {status:'STALE',latest:latest.timestamp};
  const peak=selected.reduce((a,b)=>a.waveHeightM>=b.waveHeightM?a:b);
  return {status:'OBSERVED_AT_BUOY_NOT_SHORE',latest:latest.timestamp,maxWaveHeightM:peak.waveHeightM,peakAt:peak.timestamp,samples:selected.length};
}
function eligibility(site,{hazardsClear=false,walkableClosureAlternativeVerified=false}={}){
  const missing=[];
  if(site?.publicEntry?.status!=='EXACT_ENTRY_VERIFIED')missing.push('ACCESS_UNVERIFIED');
  if(site?.publicEntry?.walkRouteStatus!=='VERIFIED')missing.push('WALK_ROUTE_UNVERIFIED');
  if(site?.collectionPermission?.status!=='EXPLICIT_SITE_PERMISSION')missing.push(site?.collectionPermission?.status==='PROHIBITED'?'COLLECTING_PROHIBITED':'COLLECTING_UNVERIFIED');
  if(!Number.isFinite(site?.shoreSegment?.outwardBearingDeg)||!site?.shoreSegment?.geometry)missing.push('SHORE_SEGMENT_UNVERIFIED');
  if(site?.stoneEvidence!=='LOCATION_MENTIONED')missing.push('STONE_TARGET_UNVERIFIED');
  if(site?.accessAlert==='VEHICLE_DAY_USE_TEMPORARY_CLOSURE_AT_REVIEW'&&!walkableClosureAlternativeVerified)missing.push('PARKING_CLOSURE_UNRESOLVED');
  if(!hazardsClear)missing.push('HAZARDS_NOT_CLEARED');
  return {eligible:missing.length===0,reasons:missing};
}
module.exports={bearing,separation,parseNdbcStdmet,exposureComparator,latestObservationWindow,eligibility};
