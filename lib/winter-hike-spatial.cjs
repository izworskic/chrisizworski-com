'use strict';
/**
 * Spatial *segment-level* closures. The official DNR RecreationSearchTrailID
 * may be reused between differently named line geometries, so identity alone
 * never establishes closure. Exact spatial overlap helps identify a closed
 * segment; it does not certify another segment or an unplanned route as open.
 */
const norm=s=>String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]/g,'');
const a=r=>r?.attributes||r||{};
const EARTH=111195;
function okPoint(p){return Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])&&
 p[0]>=-91&&p[0]<=-82&&p[1]>=41&&p[1]<=49;}
function lines(f) {
 if(!Array.isArray(f?.geometry?.paths))return [];
 const out=[];
 for(const path of f.geometry.paths){
  if(!Array.isArray(path)||path.length<2||path.some(p=>!okPoint(p)))continue;
  out.push(path);
 }
 return out;
}
function metric(p,lat){return [p[0]*EARTH*Math.cos(lat*Math.PI/180),p[1]*EARTH]}
function pointDistance(p,a,b,lat) {
 const q=metric(p,lat),u=metric(a,lat),v=metric(b,lat);
 const dx=v[0]-u[0],dy=v[1]-u[1],den=dx*dx+dy*dy;
 const t=den?Math.max(0,Math.min(1,((q[0]-u[0])*dx+(q[1]-u[1])*dy)/den)):0;
 return Math.hypot(q[0]-u[0]-t*dx,q[1]-u[1]-t*dy);
}
function closenessMeters(path, targetLines, radius=12) {
 let total=0,near=0;
 for(let i=1;i<path.length;i++){
  const u=path[i-1],v=path[i],lat=(u[1]+v[1])/2;
  const m=metric(u,lat),n=metric(v,lat),distance=Math.hypot(n[0]-m[0],n[1]-m[1]);
  if(!Number.isFinite(distance)||distance===0)continue;
  const steps=Math.max(1,Math.ceil(distance/8));
  const each=distance/steps;
  for(let j=0;j<steps;j++){
   const x=(j+.5)/steps,p=[u[0]+(v[0]-u[0])*x,u[1]+(v[1]-u[1])*x];
   total+=each;
   if(targetLines.some(target=>target.slice(1).some((end,k)=>pointDistance(p,target[k],end,lat)<=radius)))near+=each;
  }
 }
 return {totalMeters:total,nearMeters:near,nearFraction:total?near/total:0};
}
function identityMatch(destination,f) {
 return String(a(f).RecreationSearchTrailID||'')===String(destination.id||'') &&
    norm(a(f).TrailNamePrimary)===norm(destination.name);
}
function closedRecord(f) {
 return /clos|unsafe|repair/i.test(String(a(f).OpenClosedStatusNonmotor||'')) &&
 String(a(f).TrailUseCategory||'').toLowerCase()!=='motorized';
}
function audit(destination,{hikingSegments=[],closureSegments=[],routeObjectIds=null}={}) {
 const base={source:'MI DNR Trails OPENDATA: hiking and temporary-closure segment geometry',
  closedObjectIds:[],identityConflicts:[],missingGeometry:[],routeStatus:'unverified',
  closure:{active:false,matchesDestination:false,geometryVerified:false,routeAffected:false},
  checked:'spatial source snapshot only; not winter parking, trail condition or a route opening'};
 if(!destination?.id||!destination?.name)return {...base,routeStatus:'unknown-identity'};
 const relevant=[...hikingSegments,...closureSegments].filter(x=>String(a(x).RecreationSearchTrailID||'')===String(destination.id));
 const identityConflicts=relevant.filter(x=>!identityMatch(destination,x)).map(x=>a(x).OBJECTID).filter(Number.isInteger);
 const hiking=hikingSegments.filter(x=>identityMatch(destination,x));
 const closures=closureSegments.filter(x=>identityMatch(destination,x)&&closedRecord(x));
 const closedObjectIds=[],missingGeometry=[];
 for(const c of closures){
  const cLines=lines(c);
  if(!cLines.length){missingGeometry.push(a(c).OBJECTID);continue}
  const match=hiking.some(h=>{
   const l=lines(h);
   if(!l.length)return false;
   // The SAME OBJECTID can appear in both DNR hiking and closure layers. We
   // still require actual co-located line geometry, not just ID and name.
   const byOid=a(h).OBJECTID===a(c).OBJECTID;
   const overlap=l.reduce((sum,path)=>{
    const stat=closenessMeters(path,cLines);
    return {near:sum.near+stat.nearMeters,total:sum.total+stat.totalMeters};
   },{near:0,total:0});
   return byOid && overlap.total>=40 && overlap.near>=40 && overlap.near/overlap.total>=.8;
  });
  if(match)closedObjectIds.push(a(c).OBJECTID);
  else missingGeometry.push(a(c).OBJECTID);
 }
 const known=new Set(hiking.map(x=>a(x).OBJECTID));
 const route=Array.isArray(routeObjectIds) && routeObjectIds.length>0
   && routeObjectIds.every(x=>Number.isInteger(x)&&known.has(x));
 const routeHit=route && routeObjectIds.some(x=>closedObjectIds.includes(x));
 const active=closures.length>0;
 return {
  ...base,closedObjectIds,missingGeometry,identityConflicts,
  routeStatus:route
    ? routeHit?'closure-on-selected-route'
      : active?'proposed-route-avoids-known-closure-unverified'
      :'no-matched-closure-unverified'
    :active?'partial-closure-route-unknown':'route-not-provided',
  closure:{active,matchesDestination:active,geometryVerified:closedObjectIds.length>0,
    routeAffected:Boolean(routeHit)},
  verifiedGeometryMeaning:'Only exact matched DNR line segments; no certification of open trail or real-world passability'
 };
}
module.exports={audit,lines,closenessMeters,identityMatch,closedRecord};
