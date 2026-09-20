const SEASON_START_MONTH=11; // December, zero-indexed
const SEASON_END_MONTH=2; // March

export function isSnowmobileSeason(date=new Date()){
  const m=date.getMonth();
  return m===11||m===0||m===1||m===2;
}
export function freshness(ts,kind='report',now=Date.now()){
  if(!ts) return {minutes:null,state:'UNKNOWN'};
  const min=Math.max(0,(now-new Date(ts).getTime())/60000);
  const cuts=kind==='weather'?[30,120,360,720]:kind==='grooming'?[360,720,1440,2880]:[360,1440,2880,10080];
  return {minutes:Math.round(min),state:min<=cuts[0]?'LIVE':min<=cuts[1]?'VERY_RECENT':min<=cuts[2]?'RECENT':min<=cuts[3]?'AGING':'STALE'};
}
export function clamp(n,a=0,b=100){return Math.max(a,Math.min(b,n));}

export function scoreSegment(seg,{clubReport,weather,season=true}={}){
  if(!season) return {score:null,band:'OFF_SEASON',reasons:['Michigan designated snowmobile season is Dec. 1–Mar. 31.']};
  if(seg?.officialStatus&&/closed/i.test(seg.officialStatus)) return {score:0,band:'CLOSED',reasons:['Official DNR trail status indicates closed.'],veto:true};
  let score=58; const reasons=[];
  if(seg?.onRoad&&/yes|road/i.test(seg.onRoad)){score-=8;reasons.push('Includes an on-road/road connector.');}
  if(seg?.surface&&/gravel|dirt|earth/i.test(seg.surface)){score-=3;reasons.push('Unpaved surface can become thin during thaw.');}
  if(clubReport?.condition){
    const c=clubReport.condition.toLowerCase();
    if(c.includes('excellent')){score+=25;reasons.push('Recent club condition says excellent.');}
    else if(c.includes('good')){score+=16;reasons.push('Recent club condition says good.');}
    else if(c.includes('fair')){score+=2;reasons.push('Club condition is fair.');}
    else if(c.includes('poor')){score-=24;reasons.push('Club condition is poor.');}
  }
  if(clubReport?.freshness?.state==='STALE'){score-=12;reasons.push('Club condition evidence is stale.');}
  if(weather){
    if(weather.maxTempF>=40){score-=18;reasons.push('Warm temperatures raise thaw/soft-surface risk.');}
    else if(weather.maxTempF>=33){score-=8;reasons.push('Above-freezing period may soften trails.');}
    if(weather.snowIn>=4){score+=6;reasons.push('Forecast snow may help after grooming catches up.');}
    if(weather.snowIn>=8){score-=4;reasons.push('Large new snowfall can temporarily outrun grooming.');}
    if(weather.rainIn>=0.1){score-=14;reasons.push('Rain-on-snow risk is unfavorable.');}
  }
  score=clamp(Math.round(score));
  return {score,band:score>=85?'EXCELLENT':score>=72?'GOOD':score>=58?'FAIR':score>=40?'MARGINAL':'POOR',reasons};
}

export function routeDecision(segments,{season=true}={}){
  if(!season) return {score:null,band:'OFF_SEASON',routeState:'OFF_SEASON',critical:null};
  const closed=segments.find(s=>s.veto||s.band==='CLOSED');
  if(closed) return {score:0,band:'CLOSED',routeState:'ROUTE_BROKEN',critical:closed};
  const numeric=segments.filter(s=>Number.isFinite(s.score));
  if(!numeric.length) return {score:null,band:'UNKNOWN',routeState:'UNKNOWN',critical:null};
  const sorted=[...numeric].sort((a,b)=>a.score-b.score);
  const worst=sorted[0];
  const avg=numeric.reduce((a,b)=>a+b.score,0)/numeric.length;
  const lower=sorted[Math.floor((sorted.length-1)*0.25)]?.score??worst.score;
  const routeScore=Math.round(Math.min(avg*0.55+lower*0.45,worst.score+18));
  return {score:routeScore,band:routeScore>=85?'EXCELLENT':routeScore>=72?'GOOD':routeScore>=58?'FAIR':routeScore>=40?'MARGINAL':'POOR',routeState:worst.score<35?'DETOUR_OR_AVOID':'CONNECTED',critical:worst};
}

export function confidence({officialFresh=true,clubReports=[],weatherFresh=true,segmentCoverage=0,conflicts=0}={}){
  let s=35;
  if(officialFresh)s+=20;
  if(weatherFresh)s+=10;
  s+=Math.min(20,clubReports.filter(r=>r?.freshness?.state&&!['STALE','UNKNOWN'].includes(r.freshness.state)).length*10);
  s+=Math.round(Math.min(10,segmentCoverage*10));
  s-=Math.min(25,conflicts*10);
  return clamp(s);
}
