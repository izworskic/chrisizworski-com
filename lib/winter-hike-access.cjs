'use strict';
/**
 * Only independently dated, winter-specific manager statements can clear an
 * access dimension. Source records must be manually curated on the server; this
 * function does not scrape or trust user-generated "open" declarations.
 */
const HOURS=3600000;
const KINDS=['trail','parking','road'];
const states=['open','closed','restricted'];
function official(url) {
  if(typeof url!=='string')return false;
  try{
    const u=new URL(url);
    if(u.protocol!=='https:'||u.username||u.password)return false;
    return ['michigan.gov','fs.usda.gov','nps.gov'].some(domain=>u.hostname===domain||u.hostname.endsWith('.'+domain));
  }catch{return false}
}
function validateCheck(c,now=Date.now()) {
 if(!c||!KINDS.includes(c.kind)||!states.includes(c.status)||!official(c.sourceUrl)||c.winterSpecific!==true)
   return false;
 const checked=Date.parse(c.checkedAt);
 if(!Number.isFinite(checked)||checked>now+HOURS||now-checked>72*HOURS)return false;
 if(typeof c.trailId!=='string'||!/^[\w-]{8,64}$/.test(c.trailId))return false;
 if(c.kind==='parking'&&c.status==='open' && c.plowedConfirmed!==true)return false;
 if(c.kind==='road'&&c.status==='open'&&c.roadMaintenanceConfirmed!==true)return false;
 return true;
}
function accessFromChecks(trailId,records=[],now=Date.now()) {
 const selected={trail:null,parking:null,road:null},evidence={};
 for(const kind of KINDS) {
  const candidates=records.filter(r=>r?.kind===kind&&r.trailId===trailId&&validateCheck(r,now))
    .sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt));
  // If same-time official reports conflict, do not certify either.
  if(candidates.length>1 && candidates[0].checkedAt===candidates[1].checkedAt &&
    candidates[0].status!==candidates[1].status)continue;
  if(candidates.length){selected[kind]=candidates[0].status;evidence[kind]=candidates[0]}
 }
 const out={trail:selected.trail||'unverified',parking:selected.parking||'unverified',
   road:selected.road||'unverified',managerConfirmed:false,winterSpecific:false,
   sourceUrl:null,checkedAt:null,winterParkingCoordinates:null,navigationReady:false,
   verificationByType:Object.fromEntries(KINDS.map(k=>[k,!!evidence[k]])),
   provenance:evidence};
 // A single arbitrary managerChecked claim cannot satisfy all dimensions.
 if(KINDS.every(k=>selected[k]==='open'&&!!evidence[k])){
  out.managerConfirmed=true;out.winterSpecific=true;
  out.checkedAt=new Date(Math.min(...KINDS.map(k=>Date.parse(evidence[k].checkedAt)))).toISOString();
  out.sourceUrl=evidence.trail.sourceUrl;
  const p=evidence.parking;
  const loc=p.location;
  if(loc?.kind==='winter-parking-lot'&&Number.isFinite(loc.lat)&&Number.isFinite(loc.lon) &&
    loc.lat>=41&&loc.lat<=49&&loc.lon>=-91&&loc.lon<=-82&&
    p.plowedConfirmed===true&&p.parkingEntranceConfirmed===true) {
   out.winterParkingCoordinates={lat:loc.lat,lon:loc.lon,sourceUrl:p.sourceUrl,checkedAt:p.checkedAt};
   out.navigationReady=true;
  }
 }
 return out;
}
module.exports={validateCheck,accessFromChecks,official};
