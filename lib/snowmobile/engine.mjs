export function isSnowmobileSeason(date=new Date()){const m=date.getMonth();return m===11||m===0||m===1||m===2;}
export function freshness(ts,kind='report',now=Date.now()){
  if(!ts)return {minutes:null,state:'UNKNOWN'};
  const t=new Date(ts).getTime(); if(!Number.isFinite(t))return {minutes:null,state:'UNKNOWN'};
  // A future observation is not a recent observation. Do not clamp it to zero age.
  const age=now-t;
  if(!Number.isFinite(age)||age<0)return {minutes:null,state:'UNKNOWN'};
  const min=age/60000;
  const cuts=kind==='weather'?[30,120,360,720]:kind==='grooming'?[360,720,1440,2880]:[360,1440,2880,10080];
  return {minutes:Math.round(min),state:min<=cuts[0]?'LIVE':min<=cuts[1]?'VERY_RECENT':min<=cuts[2]?'RECENT':min<=cuts[3]?'AGING':'STALE'};
}
export function clamp(n,a=0,b=100){return Math.max(a,Math.min(b,n));}
export function featureLatitude(geometry){
  const coords=geometry?.coordinates; const ys=[];
  const walk=a=>{if(!Array.isArray(a))return;if(typeof a[0]==='number'&&typeof a[1]==='number'){ys.push(a[1]);return;}for(const x of a)walk(x)};walk(coords);
  return ys.length?ys.reduce((a,b)=>a+b,0)/ys.length:null;
}
export function corridorSection(lat){
  if(!Number.isFinite(lat))return 'unknown';
  if(lat<44.72)return 'grayling';
  if(lat<44.84)return 'frederic';
  if(lat<44.96)return 'waters';
  return 'gaylord';
}
const norm=v=>String(v??'').trim().toLowerCase().replace(/\s+/g,' ');
/* DNR's explicit snowmobile status on the trail segment itself. Real values
 * include "Temporarily Closed Due To Bridge Maintenance Or Repair", so a
 * leading "Closed" alone is not enough. "Temporarily Open Reroute" is open. */
export function statusSaysClosed(status){return /^(temporarily\s+)?closed\b/i.test(String(status??'').trim());}
const geometryLines=g=>!g?[]:g.type==='LineString'?[g.coordinates]:g.type==='MultiLineString'?g.coordinates:[];
const COVER_TOLERANCE_MILES=15/1609.344; // 15 m: both layers are published from the same DNR linework
const COVER_SHARE=0.6;
/* True when most of the segment's own length lies on the closure's line.
 * Sampling the segment (not the closure) means a neighbor that only touches
 * a closed piece at a shared junction is not swept in with it. */
const boxCache=new WeakMap();
function lonLatBox(geometry){
  if(!geometry||typeof geometry!=='object')return null;
  let box=boxCache.get(geometry);
  if(box!==undefined)return box;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const line of geometryLines(geometry))for(const c of line){
    if(!Number.isFinite(c?.[0])||!Number.isFinite(c?.[1]))continue;
    if(c[0]<minX)minX=c[0];if(c[0]>maxX)maxX=c[0];if(c[1]<minY)minY=c[1];if(c[1]>maxY)maxY=c[1];
  }
  box=minX<=maxX?[minX,minY,maxX,maxY]:null;
  boxCache.set(geometry,box);
  return box;
}
export function closureCoversSegment(segmentGeometry,closureGeometry){
  const seg=geometryLines(segmentGeometry),clo=geometryLines(closureGeometry);
  if(!seg.length||!clo.length)return false;
  // Cheap reject: boxes more than about 100 m apart cannot overlap.
  const a=lonLatBox(segmentGeometry),b=lonLatBox(closureGeometry),pad=0.0015;
  if(!a||!b||a[0]>b[2]+pad||b[0]>a[2]+pad||a[1]>b[3]+pad||b[1]>a[3]+pad)return false;
  const lat0=seg[0][0]?.[1];
  if(!Number.isFinite(lat0))return false;
  const kx=69.172*Math.cos(lat0*Math.PI/180),ky=69.0;
  const xy=c=>[c[0]*kx,c[1]*ky];
  const closure=clo.map(line=>line.filter(c=>Number.isFinite(c?.[0])&&Number.isFinite(c?.[1])).map(xy)).filter(line=>line.length>=2);
  if(!closure.length)return false;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const line of closure)for(const [x,y] of line){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
  const near=p=>{
    if(p[0]<minX-COVER_TOLERANCE_MILES||p[0]>maxX+COVER_TOLERANCE_MILES||p[1]<minY-COVER_TOLERANCE_MILES||p[1]>maxY+COVER_TOLERANCE_MILES)return false;
    for(const line of closure)for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],dx=b[0]-a[0],dy=b[1]-a[1],len=dx*dx+dy*dy;
      let t=len?((p[0]-a[0])*dx+(p[1]-a[1])*dy)/len:0;t=Math.max(0,Math.min(1,t));
      if(Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)<=COVER_TOLERANCE_MILES)return true;
    }
    return false;
  };
  // Sample about every 25 m along the segment, at part midpoints, so distance not vertex density decides.
  const STEP=25/1609.344;
  let total=0,inside=0;
  for(const raw of seg){
    const line=raw.filter(c=>Number.isFinite(c?.[0])&&Number.isFinite(c?.[1])).map(xy);
    for(let i=1;i<line.length;i++){
      const a=line[i-1],b=line[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
      const parts=Math.max(1,Math.min(200,Math.ceil(length/STEP)));
      for(let k=0;k<parts;k++){
        const t=(k+0.5)/parts;
        total++;
        if(near([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]))inside++;
      }
    }
  }
  return total>0&&inside/total>=COVER_SHARE;
}
/*
 * Which closure record, if any, closes THIS segment.
 *
 * Michigan DNR publishes each temporary closure as a copy of the exact trail
 * segment it closes: same GlobalID, same geometry, same mileage. So a closure
 * is matched to a segment, never to a whole trail. Matching by trail name
 * alone once turned a 2.6 mile UP 2 closure in Iron County into 381 miles of
 * closed UP 2, and closures in counties outside this tool's regions closed
 * same-numbered trails inside them (measured Nov 16 2026: 1,532 miles marked
 * closed against 125 miles DNR actually closed).
 *
 *  1. Identity: the closure's GlobalID is the segment's id.
 *  2. The closure's line covers most of the segment, whatever either record
 *     calls the trail (protects against DNR republishing closures under new
 *     ids, and against the two layers naming one trail differently).
 *  3. A same-name record that cannot be located (no line, or no line on the
 *     segment, and no id) still closes the whole named trail. That errs
 *     toward closed, on purpose.
 */
export function closureForSegment(seg,closures=[]){
  const id=norm(seg.id),name=norm(seg.trailNetwork);
  return closures.find(c=>{
    const p=c?.properties||{};
    const snow=`${p.Snowmobile??''} ${p.Snowmobi_1??''} ${p.TrailUseCa??''}`.toLowerCase();
    if(snow && !/snow|yes|designated/i.test(snow))return false;
    const state=`${p.OpenClosed??''} ${p.OpenClos_1??''} ${p.OpenClos_2??''}`.toLowerCase();
    if(!/closed|closure|detour/i.test(state))return false;
    const globalId=norm(p.GlobalID),legacyId=norm(p.DNRTrail),cname=norm(p.TrailNameP);
    if(id&&globalId&&id===globalId)return true;
    if(id&&legacyId&&legacyId!=='dnr trail'&&id===legacyId)return true;
    const closureHasLine=geometryLines(c?.geometry).length>0,segmentHasLine=geometryLines(seg?.geometry).length>0;
    if(closureHasLine&&segmentHasLine)return closureCoversSegment(seg.geometry,c.geometry);
    // From here one side cannot be placed on the map, so only the name is left.
    // Exact name match only, not substring: "LP 4" must not match "LP 47".
    if(!(name&&cname&&name===cname))return false;
    if(closureHasLine)return true; // segment cannot be placed: stay closed
    return !globalId; // no line: an id points at one other segment; no id at all closes the named trail
  })||null;
}
function currentSurfaceReport(clubReport){
  if(!clubReport?.condition)return false;
  const state=clubReport?.freshness?.state||'UNKNOWN';
  return ['LIVE','VERY_RECENT','RECENT','AGING'].includes(state);
}
function conditionBand(score){return score>=85?'EXCELLENT':score>=72?'GOOD':score>=58?'FAIR':score>=40?'MARGINAL':'POOR';}
export function scoreSegment(seg,{clubReport,weather,season=true,verifiedClosure=null,surfaceEvidence=null}={}){
  if(!season)return {score:null,band:'OFF_SEASON',reasons:['Michigan designated snowmobile season is Dec. 1–Mar. 31.'],legalState:(verifiedClosure||statusSaysClosed(seg?.officialStatus))?'CLOSED':'NOT_IN_SEASON'};
  if(verifiedClosure)return {score:0,band:'CLOSED',reasons:[verifiedClosure.properties?.PublicComm||'Official DNR temporary-closure layer matches this trail.'],veto:true,legalState:'CLOSED_TEMPORARY_LAYER',closure:verifiedClosure.properties};
  if(statusSaysClosed(seg?.officialStatus))return {score:0,band:'CLOSED',reasons:[`Michigan DNR snowmobile open/closed status: ${seg.officialStatus}.`],veto:true,legalState:'CLOSED_DNR_TRAIL_STATUS'};

  // A legal trail plus favorable weather is not evidence that the trail
  // surface is rideable. Without a dated local/operator surface report the
  // model withholds a quality score instead of manufacturing FAIR from a
  // baseline number. Snow depth and fresh snowfall remain context only.
  if(!currentSurfaceReport(clubReport)){
    const reasons=['No current local trail-surface condition report is configured or fresh enough to support a ride-quality verdict.'];
    const snow=surfaceEvidence?.observedSnow;
    if(Number.isFinite(snow?.largest48hInches))reasons.push(`${snow.largest48hInches.toFixed(1)} in. is the largest snowfall report timestamped in this region in the last 48 hours; report durations vary and snowfall does not prove trail base or grooming.`);
    const recent=surfaceEvidence?.recentWeather;
    if(recent?.rainObserved)reasons.push('Recent NWS station observations include rain/icing evidence that could damage a snow surface.');
    else if(recent?.thawRisk==='HIGH'||recent?.thawRisk==='MODERATE')reasons.push(`Recent station observations show ${recent.thawRisk.toLowerCase()} thaw/softening risk.`);
    if(weather?.rainSignal===true)reasons.push('Rain is present in the forecast and is unfavorable to trail surfaces.');
    if(Number.isFinite(weather?.maxTempF)&&weather.maxTempF>=33)reasons.push('Above-freezing weather is forecast.');
    return {score:null,band:'UNKNOWN',reasons,legalState:/^open\b/i.test(String(seg?.officialStatus||''))?'DNR_STATUS_OPEN_SURFACE_UNVERIFIED':'NO_MATCH_IN_CURRENT_CLOSURE_LAYER_SURFACE_UNVERIFIED',surfaceState:'UNVERIFIED'};
  }

  let score=58;const reasons=[];
  const c=String(clubReport.condition).toLowerCase();
  if(c.includes('excellent')){score+=25;reasons.push('Current local condition report says excellent.');}
  else if(c.includes('good')){score+=16;reasons.push('Current local condition report says good.');}
  else if(c.includes('fair')){score+=2;reasons.push('Current local condition report says fair.');}
  else if(c.includes('poor')){score-=24;reasons.push('Current local condition report says poor.');}
  else reasons.push(`Current local report states “${String(clubReport.condition).slice(0,60)}.”`);

  const reportState=clubReport?.freshness?.state||'UNKNOWN';
  if(reportState==='AGING'){
    score-=10;
    reasons.push('The local condition report is 2–7 days old, so positive conditions are capped at FAIR until fresher surface evidence arrives.');
  }
  if(clubReport?.groomingFreshness?.state==='STALE')reasons.push('Structured grooming date is stale and is not used as current grooming evidence.');
  else if(['LIVE','VERY_RECENT','RECENT'].includes(clubReport?.groomingFreshness?.state))reasons.push('A recent structured grooming timestamp is available.');

  // Recent observed damage can downgrade a current report. It never upgrades
  // a report, and observed snowfall never becomes trail base.
  const recent=surfaceEvidence?.recentWeather;
  if(recent?.rainObserved){score-=18;reasons.push('Recent NWS station observations include rain/icing; downgrade for possible surface damage.');}
  if(recent?.thawRisk==='HIGH'){score-=16;reasons.push('Recent observed warmth creates high thaw/softening risk.');}
  else if(recent?.thawRisk==='MODERATE'){score-=8;reasons.push('Recent observed warmth creates moderate thaw/softening risk.');}
  const snow=surfaceEvidence?.observedSnow;
  if(Number.isFinite(snow?.largest48hInches))reasons.push(`${snow.largest48hInches.toFixed(1)} in. is the largest regional snowfall report timestamped in the last 48 hours; this is supporting context, not trail-base evidence.`);

  if(seg?.onRoad&&/yes|road/i.test(seg.onRoad)){score-=8;reasons.push('Includes an on-road/road connector.');}
  if(seg?.surface&&/gravel|dirt|earth/i.test(seg.surface)){score-=3;reasons.push('Unpaved surface can become thin during thaw.');}
  if(weather){
    if(Number.isFinite(weather.maxTempF)&&weather.maxTempF>=40){score-=18;reasons.push('Forecast warmth raises thaw/soft-surface risk.');}
    else if(Number.isFinite(weather.maxTempF)&&weather.maxTempF>=33){score-=8;reasons.push('Forecast above-freezing period may soften trails.');}
    if(Number.isFinite(weather.snowIn)&&weather.snowIn>=4)reasons.push('Forecast snow may change conditions after grooming catches up; it does not improve the current score before it falls.');
    if(Number.isFinite(weather.snowIn)&&weather.snowIn>=8){score-=4;reasons.push('Large forecast snowfall can temporarily outrun grooming.');}
    if(weather.rainSignal===true){score-=14;reasons.push('Forecast rain-on-snow risk is unfavorable.');}
  }
  score=clamp(Math.round(score));
  if(reportState==='AGING')score=Math.min(score,59);
  return {score,band:conditionBand(score),reasons,legalState:/^open\b/i.test(String(seg?.officialStatus||''))?'DNR_STATUS_OPEN_NO_TEMP_CLOSURE_MATCH':'NO_MATCH_IN_CURRENT_CLOSURE_LAYER',surfaceState:reportState};
}
export function routeDecision(segments,{season=true,closureLayerVerified=false}={}){
  if(!season)return {score:null,band:'OFF_SEASON',routeState:'OFF_SEASON',critical:null,legalVerification:closureLayerVerified?'CURRENT_LAYER_CHECKED':'UNVERIFIED'};
  const closed=segments.find(s=>s.veto||s.band==='CLOSED');
  if(closed)return {score:0,band:'CLOSED',routeState:'ROUTE_BROKEN',critical:closed,legalVerification:'CURRENT_LAYER_MATCH'};
  const numeric=segments.filter(s=>Number.isFinite(s.score));
  if(!numeric.length)return {score:null,band:'UNKNOWN',routeState:'UNVERIFIED',critical:segments.find(s=>s.band==='UNKNOWN')||null,legalVerification:closureLayerVerified?'CURRENT_LAYER_CHECKED':'UNVERIFIED'};
  const sorted=[...numeric].sort((a,b)=>a.score-b.score),worst=sorted[0];
  const avg=numeric.reduce((a,b)=>a+b.score,0)/numeric.length;
  const lower=sorted[Math.floor((sorted.length-1)*0.25)]?.score??worst.score;
  const routeScore=Math.round(Math.min(avg*.55+lower*.45,worst.score+18));
  return {score:routeScore,band:conditionBand(routeScore),routeState:worst.score<35?'DETOUR_OR_AVOID':'CONNECTED',critical:worst,legalVerification:closureLayerVerified?'CURRENT_LAYER_CHECKED':'UNVERIFIED'};
}
export function confidence({officialFresh=true,closureLayerVerified=false,clubReports=[],weatherFresh=true,segmentCoverage=0,conflicts=0,surfaceEvidence=null}={}){
  let s=10;if(officialFresh)s+=15;if(closureLayerVerified)s+=15;if(weatherFresh)s+=10;
  s+=Math.round(Math.min(10,segmentCoverage*10));
  const direct=clubReports.filter(r=>r?.condition&&r?.freshness?.state&&!['STALE','UNKNOWN'].includes(r.freshness.state));
  const freshDirect=direct.filter(r=>['LIVE','VERY_RECENT','RECENT'].includes(r.freshness.state));
  const agingDirect=direct.filter(r=>r.freshness.state==='AGING');
  s+=Math.min(24,freshDirect.length*12)+Math.min(10,agingDirect.length*5);
  if(surfaceEvidence?.recentWeather?.available)s+=5;
  if(Number.isFinite(surfaceEvidence?.observedSnow?.largest168hInches))s+=3;
  s-=Math.min(25,conflicts*10);
  s=clamp(s);
  if(!direct.length)return Math.min(45,s); // no current surface report = never high-confidence ride quality
  if(!freshDirect.length&&agingDirect.length)return Math.min(60,s); // aging reports cannot create high confidence
  return s;
}

function windMph(value=''){
  const nums=String(value).match(/\d+/g)?.map(Number).filter(Number.isFinite)||[];
  return nums.length?Math.max(...nums):null;
}
function scoreForecastWindow(input){
  const temps=input.temperatures||[],winds=input.winds||[],texts=input.texts||[];
  const maxTempF=temps.length?Math.max(...temps):null;
  const minTempF=temps.length?Math.min(...temps):null;
  const maxWindMph=winds.length?Math.max(...winds):null;
  const text=texts.join(' ').toLowerCase();
  let score=70;const reasons=[];
  if(Number.isFinite(maxTempF)&&maxTempF>=40){score-=30;reasons.push('thaw risk');}
  else if(Number.isFinite(maxTempF)&&maxTempF>=36){score-=18;reasons.push('softening risk');}
  else if(Number.isFinite(maxTempF)&&maxTempF>=33){score-=8;reasons.push('near/above freezing');}
  else if(Number.isFinite(maxTempF)&&maxTempF<=25){score+=6;reasons.push('cold holds');}
  if(/rain|drizzle|freezing rain|showers/.test(text)){score-=25;reasons.push('rain/icing signal');}
  if(/heavy snow|blizzard/.test(text)){score-=10;reasons.push('heavy snow can outrun grooming');}
  else if(/snow|flurr/.test(text)){reasons.push('snow in forecast; current trail score unchanged');}
  if(Number.isFinite(maxWindMph)&&maxWindMph>=30){score-=10;reasons.push('strong wind');}
  else if(Number.isFinite(maxWindMph)&&maxWindMph>=20){score-=4;reasons.push('breezy');}
  if(input.daytime===true)score+=3;
  if(Number.isFinite(input.startHour)&&input.startHour>=8&&input.startHour<=10)score+=2;
  return {maxTempF,minTempF,maxWindMph,score:clamp(Math.round(score)),reasons};
}
function windowLabel(start,end){
  const day=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',weekday:'long'}).format(new Date(start));
  const time=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',hour:'numeric'});
  return `${day} ${time.format(new Date(start))}–${time.format(new Date(end))}`;
}
function hourlyRideWindows(weather={}){
  const byStart=new Map();
  for(const [location,data] of Object.entries(weather||{})){
    for(const p of (data?.hourly||[])){
      if(!p?.startTime)continue;
      const key=p.startTime;
      const row=byStart.get(key)||{startTime:key,endTime:p.endTime||null,locations:[],temperatures:[],winds:[],texts:[],daytimeVotes:[]};
      row.locations.push(location);
      if(Number.isFinite(Number(p.temperature)))row.temperatures.push(Number(p.temperature));
      const wind=windMph(p.windSpeed);if(Number.isFinite(wind))row.winds.push(wind);
      row.texts.push(p.shortForecast||'');
      if(typeof p.isDaytime==='boolean')row.daytimeVotes.push(p.isDaytime);
      byStart.set(key,row);
    }
  }
  const hours=[...byStart.values()].sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
  if(hours.length<5)return [];
  const candidates=[];
  for(let i=0;i<=hours.length-5;i++){
    const block=hours.slice(i,i+5);
    let consecutive=true;
    for(let j=1;j<block.length;j++){
      const gap=new Date(block[j].startTime)-new Date(block[j-1].startTime);
      if(!Number.isFinite(gap)||gap<45*60000||gap>75*60000){consecutive=false;break;}
    }
    if(!consecutive)continue;
    const localStartHour=Number(String(block[0].startTime).match(/T(\d{2}):/)?.[1]);
    if(!Number.isFinite(localStartHour)||localStartHour<7||localStartHour>13)continue;
    const dateKey=String(block[0].startTime).slice(0,10);
    const endTime=block[4].endTime||new Date(new Date(block[4].startTime).getTime()+3600000).toISOString();
    const temperatures=block.flatMap(x=>x.temperatures);
    const winds=block.flatMap(x=>x.winds);
    const texts=block.flatMap(x=>x.texts);
    const daytime=block.every(x=>!x.daytimeVotes.length||x.daytimeVotes.some(Boolean));
    const judged=scoreForecastWindow({temperatures,winds,texts,daytime,startHour:localStartHour});
    candidates.push({dateKey,startTime:block[0].startTime,endTime,name:windowLabel(block[0].startTime,endTime),locations:[...new Set(block.flatMap(x=>x.locations))],...judged});
  }
  const bestByDay=new Map();
  for(const w of candidates){
    const current=bestByDay.get(w.dateKey);
    if(!current||w.score>current.score||(w.score===current.score&&new Date(w.startTime)<new Date(current.startTime)))bestByDay.set(w.dateKey,w);
  }
  return [...bestByDay.values()].sort((a,b)=>new Date(a.startTime)-new Date(b.startTime)).slice(0,3);
}
export function rankRideWindows(weather={},season=true){
  if(!season)return {best:null,windows:[],boundary:'Forecast timing is disabled outside the designated snowmobile season.'};
  const hourly=hourlyRideWindows(weather);
  if(hourly.length){
    const best=[...hourly].sort((a,b)=>b.score-a.score||new Date(a.startTime)-new Date(b.startTime))[0]||null;
    return {best,windows:hourly,mode:'nws-hourly-5h',boundary:'Five-hour windows are ranked from NWS hourly weather only. They can identify deterioration or a better weather window, but they do not upgrade trail condition, legal status, grooming freshness or trail base.'};
  }
  const byStart=new Map();
  for(const [location,data] of Object.entries(weather||{})){
    for(const p of (data?.periods||[])){
      if(!p?.startTime)continue;
      const key=p.startTime;
      const row=byStart.get(key)||{startTime:key,endTime:p.endTime||null,name:p.name||'Forecast period',isDaytime:p.isDaytime!==false,locations:[],temperatures:[],winds:[],texts:[]};
      row.locations.push(location);if(Number.isFinite(Number(p.temperature)))row.temperatures.push(Number(p.temperature));
      const wind=windMph(p.windSpeed);if(Number.isFinite(wind))row.winds.push(wind);
      row.texts.push(`${p.shortForecast||''} ${p.detailedForecast||''}`);
      byStart.set(key,row);
    }
  }
  const windows=[...byStart.values()].map(w=>({...w,...scoreForecastWindow({temperatures:w.temperatures,winds:w.winds,texts:w.texts,daytime:w.isDaytime})})).sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));
  const best=[...windows].sort((a,b)=>b.score-a.score||new Date(a.startTime)-new Date(b.startTime))[0]||null;
  return {best,windows:windows.slice(0,6),mode:'nws-period-fallback',boundary:'Forecast periods are ranked from NWS weather only. They can identify deterioration or a better weather window, but they do not upgrade trail condition, legal status, grooming freshness or trail base.'};
}
