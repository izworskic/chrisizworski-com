/* Evidence-only comparison of existing public viewing areas; not a transit forecast. */
(function(root,factory){
  const api=typeof module==='object'&&module.exports?factory(require('./ais-movement')):factory(root.GreatLakesAisEvidence);
  if(typeof module==='object'&&module.exports)module.exports=api;else root.WellandViewingIntelligence=api;
})(typeof window==='object'?window:{},function(ais){
  'use strict';
  const CHECK_AGE=5*60000,REPORT_AGE=15*60000,RADIUS_KM=2,IDS=['3','7','8'];
  const fresh=(t,now,age)=>Number.isFinite(t)&&Number.isFinite(now)&&t<=now&&now-t<=age;
  const coord=v=>Number.isFinite(v?.lat)&&Number.isFinite(v?.lon)&&v.lat>=42.83&&v.lat<=43.28&&v.lon>=-79.34&&v.lon<=-79.10;
  function distanceKm(a,b){
    const rad=n=>n*Math.PI/180, dlat=rad(a.lat-b.lat),dlon=rad(a.lon-b.lon);
    const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function compare(data,now,locks){
    const unavailable={status:'unavailable',checked:null,areas:[],supported:[],shared:0};
    if(!ais||data?.ok!==true||!Array.isArray(data.vessels)||data.vessels.length>4096||!Array.isArray(locks))return unavailable;
    const checked=ais.utcMs(data.checkedAt);
    if(!fresh(checked,now,CHECK_AGE))return unavailable;
    const areas=IDS.map(id=>({id,lock:locks.find(l=>l.id===id),reports:[]}));
    if(areas.some(a=>!coord(a.lock)))return unavailable;
    // Reject conflicting newest records before filtering by type or position, so an
    // older valid report cannot replace the latest contradictory observation.
    const groups=new Map();
    for(const v of data.vessels){
      if(typeof v?.mmsi!=='string'||!/^\d{9}$/.test(v.mmsi))continue;
      const seen=ais.utcMs(v.seen);
      if(!Number.isFinite(seen))continue;
      const prior=groups.get(v.mmsi);
      if(!prior||seen>prior.seen){groups.set(v.mmsi,{v,seen,conflict:false});continue;}
      if(seen===prior.seen&&['lat','lon','shipType','speedKnots','course','heading'].some(k=>v[k]!==prior.v[k]))prior.conflict=true;
    }
    let shared=0;
    for(const {v,seen,conflict} of groups.values()){
      if(conflict||!coord(v)||!ais.positionFresh(v,now)||!fresh(seen,now,REPORT_AGE)||seen>checked||!Number.isInteger(v.shipType)||v.shipType<70||v.shipType>89)continue;
      const nearby=areas.map(a=>({a,km:distanceKm(v,a.lock)})).filter(x=>x.km<=RADIUS_KM);
      if(nearby.length>1)shared++;
      for(const {a,km} of nearby)a.reports.push({mmsi:v.mmsi,seen,km,shared:nearby.length>1});
    }
    const result=areas.map(a=>({id:a.id,count:a.reports.length,latest:a.reports.length?Math.max(...a.reports.map(r=>r.seen)):null,shared:a.reports.filter(r=>r.shared).length}));
    const supported=result.filter(a=>a.count>0).map(a=>a.id);
    return {status:supported.length===1?'single':supported.length>1?'multiple':'none',checked,areas:result,supported,shared};
  }
  return {CHECK_AGE,REPORT_AGE,RADIUS_KM,compare,distanceKm};
});
