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
    return (ORIGINS.some(o=>o.id===originId)||/^(?:mi|wi|oh|in|il|mn|pa|ny)-\d{7}$/.test(originId||'')||/^mi-trail-[a-z0-9-]+$/.test(originId||''))?base+'?origin='+encodeURIComponent(originId)+'&maxDrive='+encodeURIComponent(maxHours):base;
  }
  // This receipt is independent of the route decision. Recompute calendar
  // age at display time so cached data cannot prolong a report's freshness.
  function clubEvidence(data,key,now=Date.now()){
    const age=now-Date.parse(data?.checkedAt);
    if(data?.region!==key||!Array.isArray(data.reports)||!data.reports.length||
      !Number.isFinite(age)||age<0||age>30*60000)return null;
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));
    const part=type=>parts.find(p=>p.type===type).value;
    const today=part('year')+'-'+part('month')+'-'+part('day');
    const dayAge=date=>{
      if(!/^\d{4}-\d{2}-\d{2}$/.test(date||''))return null;
      const value=Date.parse(date+'T12:00:00Z');
      if(!Number.isFinite(value)||new Date(value).toISOString().slice(0,10)!==date)return null;
      const days=(Date.parse(today+'T12:00:00Z')-value)/86400000;
      return days>=0?days:null;
    };
    const inSeason=[12,1,2,3].includes(Number(part('month')));
    const reports=data.reports.map(r=>{
      const days=dayAge(r.reportedAt), groomDays=dayAge(r.lastGroomedAt);
      const conflict=r.dateConflict===true||r.state==='DATE_CONFLICT';
      const unavailable=r.state==='UNAVAILABLE';
      const recent=!conflict&&!unavailable&&r.state==='RECENT'&&days!==null&&days<=3;
      const grooming=recent&&inSeason&&r.groomingFreshness==='RECENT'&&groomDays!==null&&groomDays<=3;
      const state=unavailable?'UNAVAILABLE':conflict?'DATE_CONFLICT':days===null?'UNDATED':recent?'RECENT':days<=7?'AGING':'STALE';
      return {name:String(r.name||'Local club'),state,reportedAt:days===null?null:r.reportedAt,
        lastGroomedAt:groomDays===null?null:r.lastGroomedAt,grooming,
        condition:recent&&inSeason&&typeof r.condition==='string'&&/^(excellent|very good|good|fair|poor|good to excellent|fair to good)$/i.test(r.condition)?r.condition:null};
    });
    return {checkedAt:data.checkedAt,reports,monitored:reports.length,
      available:reports.filter(r=>r.state!=='UNAVAILABLE').length,
      recent:reports.filter(r=>r.state==='RECENT').length,
      groomed:reports.filter(r=>r.grooming).length,
      conflicts:reports.filter(r=>r.state==='DATE_CONFLICT').length};
  }
  function currentOutlook(weather,now=Date.now()){
    const o=weather?.outlook,issued=Date.parse(o?.issuedAt),start=Date.parse(o?.startAt),end=Date.parse(o?.endAt);
    if(o?.version!==1||o.scope!=='HUB_POINT_ONLY'||!['AVAILABLE','PARTIAL'].includes(o.status)||!Number.isFinite(issued)||
      issued>now||now-issued>6*3600000||!Number.isFinite(start)||!Number.isFinite(end)||now>=start+3600000||end-start!==72*3600000||
      !Array.isArray(o.days)||o.days.length!==3)return null;
    return o;
  }
  return {ORIGINS,bundleFresh,evaluate,compare,detailUrl,clubEvidence,currentOutlook};
});
