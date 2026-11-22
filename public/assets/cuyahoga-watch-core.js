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
        course:numberInRange(v.course,0,359.9)?v.course:null,
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

  const MILES_PER_METER=0.000621371;
  const EARTH_RADIUS_METERS=6371000;
  const REPORT_CONTEXT_MILES=1.25;
  function straightLineMiles(a,b){
    if(!inArea(a)||!inArea(b))return null;
    const k=Math.PI/180,dLat=(b.lat-a.lat)*k,dLon=(b.lon-a.lon)*k;
    const half=Math.sin(dLat/2)**2+Math.cos(a.lat*k)*Math.cos(b.lat*k)*Math.sin(dLon/2)**2;
    return EARTH_RADIUS_METERS*2*Math.asin(Math.min(1,Math.sqrt(half)))*MILES_PER_METER;
  }

  function vesselVisual(v){
    const t=Number.isInteger(v?.shipType)?v.shipType:null;
    const kind=t!==null&&t>=70&&t<80?'cargo':
      t!==null&&t>=80&&t<90?'tanker':
      t===31||t===32||t===52?'tug':
      t!==null&&t>=60&&t<70?'passenger':'unknown';
    const widthClass=typeof v?.lengthMeters==='number'&&Number.isFinite(v.lengthMeters)
      ?v.lengthMeters>=200?'large':v.lengthMeters>=80?'medium':'small':'not-reported';
    const course=numberInRange(v?.course,0,359.9)?v.course:null;
    return {
      kind,widthClass,reportedLengthMeters:numberInRange(v?.lengthMeters,1,600)?v.lengthMeters:null,
      reportedCourseDegrees:course,
      illustrationOnly:true,actualHullGeometryKnown:false,
      label:{cargo:'Cargo vessel',tanker:'Tanker',tug:'Tug or towing vessel',
        passenger:'Passenger vessel',unknown:'Vessel type not reported'}[kind]
    };
  }
  function reportedMotion(v){
    if(!v||v.speedKnots===null||!numberInRange(v.speedKnots,0,100))
      return 'SPEED_NOT_REPORTED';
    if(v.speedKnots<=0.5)return 'LOW_REPORTED_SPEED';
    return 'MOVING_AT_REPORTED_SPEED';
  }
  function parkObservation(park,live,now=Date.now()){
    if(!inArea(park)||!validCatalog({schemaVersion:1,spots:[park]}))
      return {status:'INVALID_PARK_REFERENCE',nearby:[],closest:null};
    if(live?.state!=='REPORTS_AVAILABLE'||!Array.isArray(live.vessels))
      return {status:live?.state||'UNAVAILABLE',nearby:[],closest:null,
        note:'No source-backed fresh position can be compared to this general park point.'};
    const local=live.vessels
      .filter(v=>recent(v,now)&&inArea(v))
      .map(v=>({vessel:v,straightLineMiles:straightLineMiles(park,v),reportedMotion:reportedMotion(v),
        ageMinutes:Math.max(0,Math.floor((now-Date.parse(v.seen))/60000))}))
      .sort((a,b)=>a.straightLineMiles-b.straightLineMiles||a.vessel.mmsi.localeCompare(b.vessel.mmsi));
    const nearby=local.filter(x=>x.straightLineMiles<=REPORT_CONTEXT_MILES).slice(0,3);
    return {
      status:nearby.length?'OBSERVED_NEAR_GENERAL_PARK_REFERENCE':'NO_FRESH_REPORT_NEAR_REFERENCE',
      nearestReportWithinMiles:REPORT_CONTEXT_MILES,
      nearby,closest:nearby[0]||null,
      note:nearby.length
        ?'Measured straight-line distance from a fresh AIS reported position to an approximate park point. This cannot establish a ship is visible or approaching.'
        :'No fresh AIS report within 1.25 straight-line miles of the approximate park reference. This does not establish the river is empty.'};
  }
  function historicParkMatch(history,day,park){
    if(!inArea(park))return null;
    const visit=historyDay(history,day);
    if(!visit)return null;
    let best=null;
    for(let i=0;i<visit.fixes.length;i++){
      const fix=visit.fixes[i],miles=straightLineMiles(park,fix);
      if(miles===null)continue;
      if(!best||miles<best.straightLineMiles)best={index:i,observedAt:fix.seen,
        straightLineMiles:miles,fix,sourceKind:'NOAA_RECORDED_AIS_FIX_NOT_SIGHTLINE_OR_BRIDGE_PASSAGE'};
    }
    return best;
  }

  function bridgeNoticeContext(catalog,bridgeId,day){
    if(catalog?.schemaVersion!==1||!Array.isArray(catalog.notices)||typeof bridgeId!=='string')
      return null;
    const n=catalog.notices.find(x=>x.bridgeId===bridgeId);
    if(!n||n.recordType!=='SCHEDULED_REMOVAL_NOT_CURRENT_LIVE_STATUS'||
       !/^https:\/\/(?:www\.)?navcen\.uscg\.gov\//.test(n.sourceUrl||'')||
       !/^\d{4}-\d{2}-\d{2}$/.test(day||''))return null;
    if(n.actualCompletionVerified!==false||n.currentOpenOrClosedVerified!==false||
       !/^\d{4}-\d{2}-\d{2}$/.test(n.plannedWorkStart||'')||
       !/^\d{4}-\d{2}-\d{2}$/.test(n.plannedWorkEnd||''))return null;
    const phase=day<n.plannedWorkStart?'PLANNED_FUTURE_WINDOW':
      day>n.plannedWorkEnd?'PAST_PUBLISHED_WINDOW':'WITHIN_PUBLISHED_WINDOW_NOT_LIVE_STATUS';
    const txt=phase==='PLANNED_FUTURE_WINDOW'
      ?'The Coast Guard notice schedules bridge-removal work January 18 to March 4, 2027. This is an announced plan, not a live opening or closure.'
      :phase==='WITHIN_PUBLISHED_WINDOW_NOT_LIVE_STATUS'
        ?'This date falls in the published bridge-removal work window. The notice does not confirm that work or a closure is occurring now.'
        :'The Coast Guard notice described a work window that has passed. Present bridge condition and completion remain unverified here.';
    return {bridgeId,phase,message:txt,sourceUrl:n.sourceUrl,projectUrl:n.projectUrl,
      sourcePublicationDate:n.sourcePublicationDate,liveStateKnown:false,
      visitorBridgeOpeningPredictionEnabled:false};
  }
  function safeMapsQuery(name){
    return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(String(name||'')+', Cleveland, Ohio');
  }
  return Object.freeze({REGION,inArea,recent,classifyLive,validCatalog,historyDay,historicView,firstRiverFixIndex,straightLineMiles,vesselVisual,reportedMotion,parkObservation,historicParkMatch,bridgeNoticeContext,safeMapsQuery});
});
