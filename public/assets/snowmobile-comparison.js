/* Shared trip comparison. Travel time never upgrades trail evidence. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.SnowmobileComparison=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const ORIGINS=[
    {id:'bay-city',label:'Bay City',point:'43.5945,-83.8889'},
    {id:'saginaw',label:'Saginaw',point:'43.4195,-83.9508'},
    {id:'midland',label:'Midland',point:'43.6156,-84.2472'},
    {id:'lansing',label:'Lansing',point:'42.7325,-84.5555'},
    {id:'grand-rapids',label:'Grand Rapids',point:'42.9634,-85.6681'},
    {id:'detroit',label:'Detroit',point:'42.3314,-83.0458'},
    {id:'traverse-city',label:'Traverse City',point:'44.7631,-85.6206'}
  ];
  function bundleFresh(data,now=Date.now()){
    const age=now-Date.parse(data?.generatedAt);
    return data?.operational?.dataState!=='stale-last-known'&&Number.isFinite(age)&&age>=-300000&&age<=1200000;
  }
  function evaluate(region,context={},drive=null,maxHours=3){
    const route=region.route||{};
    let state='UNKNOWN',label='Verify local conditions',rank=2;
    if(route.routeState==='ROUTE_BROKEN'||route.band==='CLOSED'){
      state='CLOSED';label='Closure on mapped route';rank=4;
    }else if(!context.active||route.band==='OFF_SEASON'){
      state='OFF_SEASON';label='Plan for the season';rank=2;
    }else if(region.error||!context.fresh){
      state='UNAVAILABLE';label='Current evidence unavailable';rank=3;
    }else if(context.closuresVerified!==true||route.legalVerification!=='CURRENT_LAYER_CHECKED'){
      state='UNVERIFIED';label='Closure check incomplete';rank=3;
    }else if(Number.isFinite(route.score)&&Number.isFinite(route.confidence)&&route.confidence>=50){
      if(route.score>=72){state='CANDIDATE';label='Stronger trip candidate';rank=0;}
      else if(route.score>=58){state='BORDERLINE';label='Borderline for a long drive';rank=1;}
      else{state='AVOID';label='Poor target for a long drive';rank=3;}
    }
    const minutes=Number.isFinite(drive?.driveMinutes)&&drive.driveMinutes>=0?drive.driveMinutes:null;
    const limit=Number.isFinite(Number(maxHours))&&Number(maxHours)>0?Number(maxHours)*60:180;
    const withinDrive=minutes===null?null:minutes<=limit;
    return {state,label,rank,minutes,withinDrive,tripCandidate:state==='CANDIDATE'&&withinDrive===true};
  }
  function compare(regions,context,drives={},maxHours=3,sort='evidence'){
    return regions.map(region=>({region,decision:evaluate(region,context,drives[region.key],maxHours)})).sort((a,b)=>{
      const ad=a.decision,bd=b.decision;
      // A nearest-first view still labels unknown, stale and closed evidence explicitly.
      if(sort==='nearest')return (ad.minutes??Infinity)-(bd.minutes??Infinity)||ad.rank-bd.rank||a.region.key.localeCompare(b.region.key);
      const budget=d=>d.withinDrive===false?1:0;
      return budget(ad)-budget(bd)||ad.rank-bd.rank||(ad.minutes??Infinity)-(bd.minutes??Infinity)||a.region.key.localeCompare(b.region.key);
    });
  }
  function detailUrl(key,originId,maxHours){
    const base='/snowmobile/regions/'+encodeURIComponent(key)+'.html';
    // Share named cities only. Browser-location coordinates never enter page URLs.
    return ORIGINS.some(o=>o.id===originId)?base+'?origin='+encodeURIComponent(originId)+'&maxDrive='+encodeURIComponent(maxHours):base;
  }
  return {ORIGINS,bundleFresh,evaluate,compare,detailUrl};
});
