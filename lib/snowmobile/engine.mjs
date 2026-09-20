export function isSnowmobileSeason(date=new Date()){const m=date.getMonth();return m===11||m===0||m===1||m===2;}
export function freshness(ts,kind='report',now=Date.now()){
  if(!ts)return {minutes:null,state:'UNKNOWN'};
  const t=new Date(ts).getTime(); if(!Number.isFinite(t))return {minutes:null,state:'UNKNOWN'};
  const min=Math.max(0,(now-t)/60000);
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
const norm=v=>String(v??'').trim().toLowerCase();
export function closureForSegment(seg,closures=[]){
  const id=norm(seg.id),name=norm(seg.trailNetwork);
  return closures.find(c=>{
    const p=c?.properties||{};
    const snow=`${p.Snowmobile??''} ${p.Snowmobi_1??''} ${p.TrailUseCa??''}`.toLowerCase();
    if(snow && !/snow|yes|designated/i.test(snow))return false;
    const state=`${p.OpenClosed??''} ${p.OpenClos_1??''} ${p.OpenClos_2??''}`.toLowerCase();
    if(!/closed|closure|detour/i.test(state))return false;
    const cid=norm(p.DNRTrail),cname=norm(p.TrailNameP);
    return Boolean((id&&cid&&(id===cid||id.includes(cid)||cid.includes(id)))||(name&&cname&&(name===cname||name.includes(cname)||cname.includes(name))));
  })||null;
}
export function scoreSegment(seg,{clubReport,weather,season=true,verifiedClosure=null}={}){
  if(!season)return {score:null,band:'OFF_SEASON',reasons:['Michigan designated snowmobile season is Dec. 1–Mar. 31.'],legalState:verifiedClosure?'CLOSED':'NOT_IN_SEASON'};
  if(verifiedClosure)return {score:0,band:'CLOSED',reasons:[verifiedClosure.properties?.PublicComm||'Official DNR temporary-closure layer matches this trail.'],veto:true,legalState:'CLOSED_TEMPORARY_LAYER',closure:verifiedClosure.properties};
  if(seg?.officialStatus&&/^closed\b/i.test(String(seg.officialStatus)))return {score:0,band:'CLOSED',reasons:[`Michigan DNR snowmobile open/closed status: ${seg.officialStatus}.`],veto:true,legalState:'CLOSED_DNR_TRAIL_STATUS'};
  let score=58;const reasons=[];
  if(seg?.onRoad&&/yes|road/i.test(seg.onRoad)){score-=8;reasons.push('Includes an on-road/road connector.');}
  if(seg?.surface&&/gravel|dirt|earth/i.test(seg.surface)){score-=3;reasons.push('Unpaved surface can become thin during thaw.');}
  if(clubReport?.condition){
    const c=clubReport.condition.toLowerCase();
    if(c.includes('excellent')){score+=25;reasons.push('Club condition report says excellent.');}
    else if(c.includes('good')){score+=16;reasons.push('Club condition report says good.');}
    else if(c.includes('fair')){score+=2;reasons.push('Club condition report says fair.');}
    else if(c.includes('poor')){score-=24;reasons.push('Club condition report says poor.');}
  }
  if(clubReport?.freshness?.state==='STALE'){score-=12;reasons.push('Club condition evidence is stale.');}
  if(clubReport?.groomingFreshness?.state==='STALE')reasons.push('Structured grooming date is stale and is not used as current grooming evidence.');
  if(weather){
    if(Number.isFinite(weather.maxTempF)&&weather.maxTempF>=40){score-=18;reasons.push('Warm temperatures raise thaw/soft-surface risk.');}
    else if(Number.isFinite(weather.maxTempF)&&weather.maxTempF>=33){score-=8;reasons.push('Above-freezing period may soften trails.');}
    if(weather.snowIn>=4){score+=6;reasons.push('Forecast snow may help after grooming catches up.');}
    if(weather.snowIn>=8){score-=4;reasons.push('Large forecast snowfall can temporarily outrun grooming.');}
    if(weather.rainSignal===true){score-=14;reasons.push('Rain-on-snow risk is unfavorable.');}
  }
  score=clamp(Math.round(score));
  return {score,band:score>=85?'EXCELLENT':score>=72?'GOOD':score>=58?'FAIR':score>=40?'MARGINAL':'POOR',reasons,legalState:/^open\b/i.test(String(seg?.officialStatus||''))?'DNR_STATUS_OPEN_NO_TEMP_CLOSURE_MATCH':'NO_MATCH_IN_CURRENT_CLOSURE_LAYER'};
}
export function routeDecision(segments,{season=true,closureLayerVerified=false}={}){
  if(!season)return {score:null,band:'OFF_SEASON',routeState:'OFF_SEASON',critical:null,legalVerification:closureLayerVerified?'CURRENT_LAYER_CHECKED':'UNVERIFIED'};
  const closed=segments.find(s=>s.veto||s.band==='CLOSED');
  if(closed)return {score:0,band:'CLOSED',routeState:'ROUTE_BROKEN',critical:closed,legalVerification:'CURRENT_LAYER_MATCH'};
  const numeric=segments.filter(s=>Number.isFinite(s.score));
  if(!numeric.length)return {score:null,band:'UNKNOWN',routeState:'UNKNOWN',critical:null,legalVerification:closureLayerVerified?'CURRENT_LAYER_CHECKED':'UNVERIFIED'};
  const sorted=[...numeric].sort((a,b)=>a.score-b.score),worst=sorted[0];
  const avg=numeric.reduce((a,b)=>a+b.score,0)/numeric.length;
  const lower=sorted[Math.floor((sorted.length-1)*0.25)]?.score??worst.score;
  const routeScore=Math.round(Math.min(avg*.55+lower*.45,worst.score+18));
  return {score:routeScore,band:routeScore>=85?'EXCELLENT':routeScore>=72?'GOOD':routeScore>=58?'FAIR':routeScore>=40?'MARGINAL':'POOR',routeState:worst.score<35?'DETOUR_OR_AVOID':'CONNECTED',critical:worst,legalVerification:closureLayerVerified?'CURRENT_LAYER_CHECKED':'UNVERIFIED'};
}
export function confidence({officialFresh=true,closureLayerVerified=false,clubReports=[],weatherFresh=true,segmentCoverage=0,conflicts=0}={}){
  let s=25;if(officialFresh)s+=20;if(closureLayerVerified)s+=15;if(weatherFresh)s+=10;
  s+=Math.min(20,clubReports.filter(r=>r?.freshness?.state&&!['STALE','UNKNOWN'].includes(r.freshness.state)).length*10);
  s+=Math.round(Math.min(10,segmentCoverage*10));s-=Math.min(25,conflicts*10);return clamp(s);
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
  else if(/snow|flurr/.test(text)){score+=3;reasons.push('snow in forecast');}
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
    return {best,windows:hourly,mode:'nws-hourly-5h',boundary:'Five-hour windows are ranked from NWS hourly weather only. They do not upgrade trail condition, legal status, grooming freshness or trail base.'};
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
  return {best,windows:windows.slice(0,6),mode:'nws-period-fallback',boundary:'Forecast periods are ranked from NWS weather only. They do not upgrade trail condition, legal status, grooming freshness or trail base.'};
}
