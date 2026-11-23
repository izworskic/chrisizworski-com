/* Calumet working-river core. Copied observational constraints from the site's
 * existing Cuyahoga shore watch; never calculates a ship or bridge ETA.
 * Pure CommonJS/browser module so the rules can be unit-tested offline. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.CalumetWatchCore=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const REGION=Object.freeze({south:41.66,north:41.75,west:-87.59,east:-87.50});
  const MAX_AGE_MS=30*60*1000;
  const finite=(x,a,b)=>typeof x==='number'&&Number.isFinite(x)&&x>=a&&x<=b;
  const inArea=p=>!!p&&finite(p.lat,REGION.south,REGION.north)&&finite(p.lon,REGION.west,REGION.east);
  const isoMs=s=>typeof s==='string'&&s.endsWith('Z')&&Number.isFinite(Date.parse(s))?Date.parse(s):null;
  const recent=(p,now)=>{const ms=isoMs(p?.seen);return ms!==null&&now-ms>=-60000&&now-ms<=MAX_AGE_MS;};
  function classifyLive(data,now=Date.now()){
    if(!data||data.ok!==true||!Array.isArray(data.vessels))
      return {state:'UNAVAILABLE',vessels:[],attributions:[],reason:'AIS reports are unavailable. That does not mean no ships are on the river.'};
    const checked=isoMs(data.checkedAt);
    if(checked===null||now-checked>MAX_AGE_MS||now-checked< -60000)
      return {state:'STALE',vessels:[],attributions:[],reason:'The source check is more than 30 minutes old. These positions cannot support a current watch.'};
    const seen=new Set();
    const vessels=data.vessels.filter(v=>inArea(v)&&recent(v,now)&&/^\d{9}$/.test(String(v.mmsi||'')))
      .sort((a,b)=>String(b.seen).localeCompare(String(a.seen)))
      .filter(v=>{const id=String(v.mmsi);if(seen.has(id))return false;seen.add(id);return true;})
      .map(v=>({mmsi:String(v.mmsi),name:String(v.name||'Unidentified vessel').slice(0,110),
        lat:v.lat,lon:v.lon,seen:v.seen,
        speedKnots:finite(v.speedKnots,0,100)?v.speedKnots:null,
        course:finite(v.course,0,359.9)?v.course:null,
        lengthMeters:finite(v.lengthMeters,1,600)?v.lengthMeters:null,
        shipType:Number.isInteger(v.shipType)?v.shipType:null,
        source:String(v.source||'AIS report').slice(0,120)}));
    const attributions=Array.isArray(data.attribution)?data.attribution
      .filter(a=>a&&typeof a.credit==='string').slice(0,20)
      .map(a=>({source:String(a.source||'AIS').slice(0,90),credit:a.credit.slice(0,350)})):[];
    return {state:vessels.length?'REPORTS_AVAILABLE':'NO_FRESH_LOCAL_REPORTS',
      checkedAt:data.checkedAt,vessels,attributions,
      reason:vessels.length?'Positions are reports, not a future passage or bridge-opening forecast.':
        'No fresh AIS report was found inside the Calumet area. Coverage gaps do not establish an empty river.'};
  }
  function miles(a,b){
    if(!inArea(a)||!inArea(b))return null;
    const k=Math.PI/180,dLat=(b.lat-a.lat)*k,dLon=(b.lon-a.lon)*k;
    const h=Math.sin(dLat/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin(dLon/2)**2;
    return 3958.7613*2*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  function nearPlace(place,result,now=Date.now()){
    if(!inArea(place)||result?.state!=='REPORTS_AVAILABLE')
      return {state:'NOT_DETERMINABLE',closest:null};
    const ranked=result.vessels.filter(v=>recent(v,now)).map(v=>({vessel:v,distanceMiles:miles(place,v)}))
      .filter(x=>x.distanceMiles!==null).sort((a,b)=>a.distanceMiles-b.distanceMiles);
    const close=ranked.find(x=>x.distanceMiles<=1.25);
    return {state:close?'NEARBY_REPORTED_POSITION':'NO_NEARBY_REPORT',closest:close||null};
  }
  function vesselVisual(v){
    const t=Number.isInteger(v?.shipType)?v.shipType:null;
    const kind=t!==null&&t>=70&&t<80?'cargo':t!==null&&t>=80&&t<90?'tanker':
      [31,32,52].includes(t)?'tug':t!==null&&t>=60&&t<70?'passenger':'unknown';
    const length=finite(v?.lengthMeters,1,600)?v.lengthMeters:null;
    return {kind,size:length===null?'not-reported':length>=200?'large':length>=80?'medium':'small',
      course:finite(v?.course,0,359.9)?v.course:null,illustrative:true};
  }
  function validateGuide(g){
    return g?.schemaVersion===1&&Array.isArray(g.bridges)&&g.bridges.length>=4&&
      Array.isArray(g.viewpoints)&&g.viewpoints.length>=2&&
      g.bridges.every(b=>typeof b.id==='string'&&inArea(b)&&b.sourceUrl?.startsWith('https://')&&b.mapRole==='ROUNDED_REFERENCE_NOT_SPAN')&&
      g.viewpoints.every(p=>typeof p.id==='string'&&inArea(p)&&p.sourceUrl?.startsWith('https://')&&
        ['PUBLIC_SIDEWALK_AREA_VERIFY_ACCESS','PUBLIC_PARK_SIGHTLINE_NOT_VERIFIED'].includes(p.accessClass));
  }
  function noticeWindow(record,today){
    if(!record||!record.start||!record.end||!record.sourceUrl)return 'UNVERIFIED';
    if(today<record.start)return 'PUBLISHED_FUTURE_WORK_NOT_LIVE';
    if(today>record.end)return 'PAST_NOTICE_NOT_LIVE';
    return 'WITHIN_PUBLISHED_WORK_WINDOW_NOT_LIVE';
  }
  return Object.freeze({REGION,MAX_AGE_MS,inArea,recent,classifyLive,miles,nearPlace,vesselVisual,validateGuide,noticeWindow});
});