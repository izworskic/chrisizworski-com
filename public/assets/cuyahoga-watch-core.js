/* Cuyahoga shore watch: pure public-data guards. No ETA estimation or navigation instructions. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object' && module.exports)module.exports=api;
  if(root)root.CuyahogaWatchCore=api;
})(typeof window==='undefined'?null:window,function(){
  'use strict';
  const REGION=Object.freeze({south:41.44,north:41.54,west:-81.75,east:-81.65});
  const MAX_AGE_MS=30*60*1000;
  function numberInRange(n,min,max){return typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max}
  function inArea(v){return !!v&&numberInRange(v.lat,REGION.south,REGION.north)&&numberInRange(v.lon,REGION.west,REGION.east)}
  function utc(iso){if(typeof iso!=='string'||!iso.endsWith('Z'))return null;
    const ms=Date.parse(iso);return Number.isFinite(ms)?ms:null}
  function recent(v,now){const t=utc(v?.seen);return t!==null&&now-t>=-60000&&now-t<=MAX_AGE_MS}
  function validLive(v){return inArea(v)&&/^\d{9}$/.test(String(v.mmsi||''))&&utc(v.seen)!==null}
  function classifyLive(data,now=Date.now()){
    if(!data||data.ok!==true||!Array.isArray(data.vessels))
      return {state:'UNAVAILABLE',count:0,vessels:[],reason:'Live AIS reports could not be loaded. This does not mean no ships are present.'};
    const checked=utc(data.checkedAt);
    if(checked===null||now-checked>MAX_AGE_MS||now-checked< -60000)
      return {state:'STALE',count:0,vessels:[],reason:'The latest AIS feed check is too old. Refresh the live tracker before choosing a watch.'};
    const vessels=data.vessels.filter(v=>validLive(v)&&recent(v,now))
      .map(v=>({mmsi:String(v.mmsi),name:String(v.name||'Unidentified vessel').slice(0,110),
        lat:v.lat,lon:v.lon,seen:v.seen,
        speedKnots:numberInRange(v.speedKnots,0,100)?v.speedKnots:null,
        lengthMeters:numberInRange(v.lengthMeters,1,600)?v.lengthMeters:null,
        shipType:Number.isInteger(v.shipType)?v.shipType:null,
        source:String(v.source||'AIS report').slice(0,90)}))
      .sort((a,b)=>b.seen.localeCompare(a.seen));
    const attributions=Array.isArray(data.attribution)
      ?data.attribution.filter(a=>a && typeof a.credit==='string').slice(0,20)
        .map(a=>({source:String(a.source||'AIS').slice(0,90),credit:a.credit.slice(0,350)}))
      :[];
    return {state:vessels.length?'REPORTS_AVAILABLE':'NO_FRESH_LOCAL_REPORTS',
      count:vessels.length,checkedAt:data.checkedAt,vessels,attributions,
      reason:vessels.length?'Fresh AIS positions are observations, not arrival predictions.':'No recent AIS positions appeared in this river box. Coverage gaps do not establish an empty river.'};
  }
  function validCatalog(data){
    return data?.schemaVersion===1&&Array.isArray(data.spots)&&data.spots.length>0
      &&data.spots.every(s=>typeof s.id==='string'&&s.id.length>0&&
        /^https:\/\/www\.clevelandmetroparks\.com\//.test(s.officialUrl||'')&&
        numberInRange(s.lat,REGION.south,REGION.north)&&numberInRange(s.lon,REGION.west,REGION.east)&&
        s.coordinateNote&&s.visitStatus==='PUBLIC_PARK_ACCESS_VERIFY_CURRENT_CLOSURES');
  }
  function historyDay(data,day){
    if(data?.schemaVersion!==1||data.observationKind!=='NOAA_HISTORICAL_BROADCAST_FIXES'||!Array.isArray(data.voyages))return null;
    const item=data.voyages.find(v=>v.id===day);
    if(!item||!Array.isArray(item.fixes)||!item.fixes.length||!item.fixes.every(p=>inArea(p)&&utc(p.seen)!==null))return null;
    const sorted=[...item.fixes].sort((a,b)=>a.seen.localeCompare(b.seen));
    return {...item,fixes:sorted};
  }
  function firstRiverFixIndex(data,day){
    const v=historyDay(data,day);
    if(!v)return 0;
    // The visitor begins at a recorded river fix near the central public viewpoints.
    // Preserve every original NOAA fix in the slider, including distant harbor reports.
    const first=v.fixes.findIndex(p=>p.lat>=41.488&&p.lat<=41.496&&p.lon>=-81.706&&p.lon<=-81.697);
    return first>=0?first:0;
  }
  function historicView(data,day,selectedIndex){
    const v=historyDay(data,day);
    if(!v)return {state:'HISTORY_UNAVAILABLE',fixes:[],reason:'Historical ship observations are unavailable. No route is inferred.'};
    const index=Math.max(0,Math.min(v.fixes.length-1,Number.isInteger(selectedIndex)?selectedIndex:0));
    const seen=v.fixes[index];
    return {state:'HISTORICAL',voyage:v,index,count:v.fixes.length,observed:seen,
      observedAt:seen.seen,disclaimer:'Each marker is a historical NOAA AIS report, not the continuous path sailed, a bridge opening, or an arrival prediction.'};
  }
  function safeMapsQuery(name){
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(name||'')+', Cleveland, Ohio');
  }
  return Object.freeze({REGION,inArea,recent,classifyLive,validCatalog,historyDay,historicView,firstRiverFixIndex,safeMapsQuery});
});
