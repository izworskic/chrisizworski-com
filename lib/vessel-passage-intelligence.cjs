'use strict';
// Offline descriptive research; not navigation, surveyed crossing times or ETA.
const MAX_GAP_SECONDS=180, MAX_CHORD_KNOTS=40;
const LOW_DISPLACEMENT_RADIUS_M=75, MIN_LOW_DISPLACEMENT_SECONDS=600;
const finite=(n,a,b)=>typeof n==='number'&&Number.isFinite(n)&&n>=a&&n<=b;
const round=n=>Math.round(n*10)/10;
function utc(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s))throw Error('Invalid UTC observation');
 const t=Date.parse(s);
 if(!Number.isFinite(t)||new Date(t).toISOString().slice(0,19)!==s.slice(0,19))throw Error('Invalid UTC observation');
 return t;
}
function distanceMeters(a,b){
 const r=Math.PI/180,dy=(b.lat-a.lat)*r,dx=(b.lon-a.lon)*r;
 const h=Math.sin(dy/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dx/2)**2;
 return 12742000*Math.asin(Math.min(1,Math.sqrt(Math.max(0,h))));
}
function trackSegments(fixes){
 if(!Array.isArray(fixes)||fixes.length>30000)throw Error('Invalid or oversized track');
 const map=new Map();
 let duplicates=0;
 for(const fix of fixes){
  const t=utc(fix?.seen);
  if(!finite(fix.lat,-90,90)||!finite(fix.lon,-180,180))throw Error('Invalid position');
  const old=map.get(t);
  if(old){
   if(old.lat!==fix.lat||old.lon!==fix.lon)throw Error('Conflicting same-time track fixes');
   duplicates++;continue;
  }
  map.set(t,{t,lat:fix.lat,lon:fix.lon});
 }
 const points=[...map.values()].sort((a,b)=>a.t-b.t);
 const segments=[],byTime=new Map();
 let gapBreaks=0,jumpBreaks=0,maxGapSeconds=0;
 for(const point of points){
  const last=segments.at(-1),prev=last?.at(-1);
  if(prev){
   const seconds=(point.t-prev.t)/1000;
   maxGapSeconds=Math.max(maxGapSeconds,seconds);
   if(seconds>MAX_GAP_SECONDS){gapBreaks++;segments.push([]);}
   else if(distanceMeters(prev,point)/1852*3600/seconds>MAX_CHORD_KNOTS){jumpBreaks++;segments.push([]);}
  }else segments.push([]);
  segments.at(-1).push(point);
  byTime.set(point.t,segments.length-1);
 }
 return {segments,byTime,uniqueFixes:points.length,duplicates,gapBreaks,jumpBreaks,maxGapSeconds};
}
function lowDisplacement(segments){
 const out=[];
 for(const group of segments){
  // Every included observation lies inside the anchor's 75 m radius.
  // Greedy, disjoint episodes; no interpolation across a missing report.
  let start=0;
  for(let i=1;i<=group.length;i++){
   if(i<group.length&&distanceMeters(group[start],group[i])<=LOW_DISPLACEMENT_RADIUS_M)continue;
   const end=i-1,seconds=(group[end].t-group[start].t)/1000;
   if(end-start+1>=4&&seconds>=MIN_LOW_DISPLACEMENT_SECONDS)out.push({first:new Date(group[start].t).toISOString(),last:new Date(group[end].t).toISOString(),observations:end-start+1,durationSeconds:seconds});
   start=i;
  }
 }
 return out;
}
function analyzePassage(fixes,events){
 const t=trackSegments(fixes);
 if(!Array.isArray(events)||events.length>500)throw Error('Invalid checkpoint events');
 const ids=new Set(),windows=[];
 for(const e of events){
  if(e?.status!=='OBSERVED_NEAR_CHART_POINT_WITH_BRACKET'||e.useForIndividualBridgeCalibration===false||!e.bracket)continue;
  if(typeof e.id!=='string'||!e.id||ids.has(e.id)||!Number.isFinite(e.riverMile))throw Error('Invalid or repeated checkpoint identity');
  ids.add(e.id);
  const a=utc(e.bracket.observedBracketStart),b=utc(e.bracket.nearestObservedAt),c=utc(e.bracket.observedBracketEnd);
  if(!(a<b&&b<c)||!t.byTime.has(a)||!t.byTime.has(b)||!t.byTime.has(c))throw Error('Checkpoint bracket must reference actual ordered fixes');
  windows.push({id:e.id,mile:e.riverMile,a,b,c});
 }
 windows.sort((a,b)=>a.b-b.b||a.id.localeCompare(b.id));
 const intervals=[],withheld={overlapping:0,discontinuous:0,sameMile:0};
 for(let i=1;i<windows.length;i++){
  const a=windows[i-1],b=windows[i];
  if(a.mile===b.mile){withheld.sameMile++;continue;}
  if(a.c>=b.a){withheld.overlapping++;continue;}
  const seg=t.byTime.get(a.a);
  if([a.b,a.c,b.a,b.b,b.c].some(x=>t.byTime.get(x)!==seg)){withheld.discontinuous++;continue;}
  intervals.push({from:a.id,to:b.id,direction:b.mile>a.mile?'increasing-reference-miles':'decreasing-reference-miles',
   observedFrom:new Date(a.b).toISOString(),observedTo:new Date(b.b).toISOString(),
   observedElapsedSeconds:(b.b-a.b)/1000,
   referenceBracketMinimumSeconds:(b.a-a.c)/1000,referenceBracketMaximumSeconds:(b.c-a.a)/1000,
   label:'ELAPSED_BETWEEN_NEAR_REFERENCE_FIXES_NOT_CONFIRMED_CROSSINGS'});
 }
 return {uniqueFixes:t.uniqueFixes,duplicateFixes:t.duplicates,segments:t.segments.length,
  gapBreaks:t.gapBreaks,jumpBreaks:t.jumpBreaks,maxGapSeconds:t.maxGapSeconds,
  eligibleReferenceWindows:windows.length,intervals,withheld,lowDisplacementEpisodes:lowDisplacement(t.segments),
  claims:{completeTransit:false,confirmedStop:false,bridgeCrossing:false,forecastEnabled:false}};
}
function summarize(voyages){
 const keys=new Map();
 for(const v of voyages)for(const x of v.analysis.intervals){
  const k=x.from+'|'+x.to+'|'+x.direction;
  if(!keys.has(k))keys.set(k,{from:x.from,to:x.to,direction:x.direction,rows:[]});
  keys.get(k).rows.push({date:v.date,mmsi:v.mmsi,seconds:x.observedElapsedSeconds});
 }
 const pairs=[...keys.values()].map(({rows,...v})=>{
  const days=new Set(rows.map(x=>x.date)).size,ships=new Set(rows.map(x=>x.mmsi)).size;
  return {...v,samples:rows.length,dates:days,distinctVessels:ships,
   observedElapsedSecondsMin:Math.min(...rows.map(x=>x.seconds)),observedElapsedSecondsMax:Math.max(...rows.map(x=>x.seconds)),
   status:'DESCRIPTIVE_ONLY_NO_VALIDATED_CROSSING_LABELS'};
 }).sort((a,b)=>(a.from+'|'+a.to).localeCompare(b.from+'|'+b.to));
 return {pairs,uniqueFixes:voyages.reduce((n,v)=>n+v.analysis.uniqueFixes,0),
  sampledDates:new Set(voyages.map(v=>v.date)).size,distinctVessels:new Set(voyages.map(v=>v.mmsi)).size,
  intervalCount:voyages.reduce((n,v)=>n+v.analysis.intervals.length,0),
  lowDisplacementEpisodes:voyages.reduce((n,v)=>n+v.analysis.lowDisplacementEpisodes.length,0),
  withheld:voyages.reduce((a,v)=>Object.fromEntries(Object.keys(a).map(k=>[k,a[k]+v.analysis.withheld[k]])),{overlapping:0,discontinuous:0,sameMile:0}),
  forecastEnabled:false,validationStatus:'INSUFFICIENT_INDEPENDENT_PASSAGE_OUTCOMES'};
}
module.exports={trackSegments,analyzePassage,summarize,distanceMeters,utc,MAX_GAP_SECONDS,MAX_CHORD_KNOTS};
