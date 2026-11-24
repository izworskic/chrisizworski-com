/* Lake Superior Circle Tour offline overnight allocator.
 * Builds on the 31-stop, already-published OSM-derived road trace.
 * Does NOT call a live routing service or promise exact road/park mileage.
 */
(function(root){
'use strict';
const OVERNIGHT_BUFFER=1.15; // disclosed discretionary cushion for simplified geometry
const ASSUMED_MPH=45;         // planning assumption, not observed/forecast speed
const BORDER_RESERVE_HOURS=0.75; // separate unknown wait reserve
const MAX_NIGHTS=20;
const ROUND=n=>Math.round(n*10)/10;
const FOCUS=['hiking','waterfalls','shipwatch'];
function standardize(raw={}){
 const duration=Number(raw.days),maxDrive=Number(raw.maxDrive),month=Number(raw.month);
 return {days:[7,10,15].includes(duration)?duration:10,
 maxDrive:[4,5,6,8].includes(maxDrive)?maxDrive:5,
 month:Number.isInteger(month)&&month>=1&&month<=12?month:8,
 interests:Array.isArray(raw.interests)?FOCUS.filter(x=>raw.interests.includes(x)):['hiking','waterfalls'],
 pictured:raw.pictured!==false};
}
function validate(trace,nights){
 if(trace?.version!==1||nights?.version!==1||!Array.isArray(trace.route)||
   trace.route.length!==31||trace.legs?.length!==30||
   trace.route[0]!=='1'||trace.route.at(-1)!=='30'||nights.routeEnd!=='30')
   throw Error('Road-trace or overnight source was not reconciled');
 if(new Set(trace.route).size!==31)throw Error('Duplicate source stops');
 if(!trace.legs.every((e,i)=>e.from===trace.route[i]&&
   e.to===trace.route[i+1]&&Number.isFinite(e.traceMiles)&&e.traceMiles>0&&
   Number.isInteger(e.fromGeometryIndex)&&Number.isInteger(e.toGeometryIndex)&&
   e.toGeometryIndex>e.fromGeometryIndex))
   throw Error('Source route has unmeasured or disconnected legs');
 for(const id of Object.keys(nights.overnights||{}))
  if(!trace.route.slice(1).includes(id)||!nights.overnights[id].directionsQuery)
   throw Error('Invalid stay on unavailable road gateway');
 if(!nights.overnights['30'])throw Error('Cannot finish in Duluth');
 return true;
}
function segment(trace,nights,i,j,settings){
 if(j<=i||j>=trace.route.length)return null;
 const legs=trace.legs.slice(i,j);
 const traced=legs.reduce((n,e)=>n+e.traceMiles,0);
 const cushionMiles=traced*OVERNIGHT_BUFFER;
 const drive=cushionMiles/ASSUMED_MPH;
 const stops=trace.route.slice(i,j+1);
 const crossings=legs.filter(e=>['13:14','20:21'].includes(e.from+':'+e.to)).length;
 const partial=legs.some(e=>e.status==='incomplete-park-approach');
 const pictured=stops.slice(1).includes('11');
 const porkies=stops.slice(1).includes('6');
 const visit=pictured&&settings.pictured?3:0;
 const bonus=porkies&&settings.interests.includes('hiking')?2:0;
 const restBonus=stops.slice(1).includes('12')&&settings.interests.includes('waterfalls')?1.5:0;
 const stop=trace.route[j],overnight=nights.overnights[stop];
 return {from:trace.route[i],to:stop,fromIndex:i,toIndex:j,
  stops,overnight,traceMiles:ROUND(traced),planningMiles:ROUND(cushionMiles),
  driveHours:ROUND(drive),rawDriveHours:drive,borderReserves:crossings,
  borderReserveHours:crossings*BORDER_RESERVE_HOURS,
  experienceHours:visit+bonus+restBonus,
  hasPicturedRocks:pictured,hasPorkies:porkies,
  incompleteParkApproach:partial,withinCap:drive<=settings.maxDrive+1e-9,
  basis:'simplified-archived-OSM-trace-with-disclosed-15-percent-planning-cushion'};
}
function optimize(trace,nights,raw={}){
 validate(trace,nights);
 const settings=standardize(raw),route=trace.route,n=route.length;
 const endpoints=[0,...Object.keys(nights.overnights).map(x=>route.indexOf(x))]
  .filter(x=>x>=0).sort((a,b)=>a-b);
 const anchor=route.indexOf('11');
 const last=endpoints.at(-1);
 if(last!==n-1)throw Error('Overnight catalog misses route finish');
 const total=trace.legs.reduce((v,e)=>v+e.traceMiles,0);
 // Trip lengths below six are intentionally not exposed by the UI.
 function attempt(dayCount,strictCap){
  const memo=Array.from({length:dayCount+1},()=>new Map());
  memo[0].set(0,{cost:0,path:[]});
  const ideal=total*OVERNIGHT_BUFFER/ASSUMED_MPH/dayCount;
  for(let k=1;k<=dayCount;k++){
   for(const end of endpoints.slice(1)){
    for(const start of endpoints){
     if(start>=end)break;
     const prev=memo[k-1].get(start);
     if(!prev)continue;
     // Requiring a Pictured Rocks stopover protects a real visit, rather
     // than pretending it can be completed between highway rest stops.
     if(settings.pictured&&start<anchor&&end>anchor)continue;
     const stop=route[end];
     const leg=segment(trace,nights,start,end,settings);
     if(!leg)continue;
     const overflow=Math.max(0,leg.rawDriveHours-settings.maxDrive);
     if(strictCap&&overflow>1e-9)continue;
     const longest=Math.max(0,leg.rawDriveHours+leg.experienceHours+
       leg.borderReserveHours-8.5);
     const preferred=leg.overnight.kind==='limited'?2.5:0;
     const experience=leg.hasPicturedRocks&&settings.pictured?0:0;
     const routePenalty=Math.pow(leg.rawDriveHours-ideal,2)*3+
       Math.pow(longest,2)*13+overflow*overflow*230+
       preferred+(end-start>8?5:0)+experience;
     // A true source gap is always marked even if the numeric cap looks fine.
     const cost=prev.cost+routePenalty;
     const old=memo[k].get(end);
     if(!old||cost<old.cost)memo[k].set(end,{cost,path:[...prev.path,leg]});
    }
   }
  }
  return memo[dayCount].get(last)||null;
 }
 const chosen=attempt(settings.days,true)||attempt(settings.days,false);
 if(!chosen)throw Error('No overnight sequence across the published Circle Tour');
 const allWithin=chosen.path.every(day=>day.withinCap);
 // Explore one-to-four more days only when the selected budget does not fit.
 let alternate=null;
 if(!allWithin)for(let count=settings.days+1;count<=Math.min(MAX_NIGHTS,settings.days+4);count++){
  const proposal=attempt(count,true);
  if(proposal){alternate={days:count,plan:proposal.path};break;}
 }
 const path=chosen.path.map((day,index)=>({...day,day:index+1,
  caveat:day.incompleteParkApproach?'The Pigeon River park-approach mileage remains unresolved; verify actual road directions.':
    day.overnight.kind==='limited'?'Confirm this small/seasonal overnight option before making a reservation.':'Accommodation is not booked or guaranteed.'}));
 const risk=path.filter(d=>d.incompleteParkApproach);
 return {settings,days:path,allWithinCap:allWithin,
  overCap: path.filter(d=>!d.withinCap).map(d=>d.day),
  incompleteDays:risk.map(d=>d.day),
  alternate,
  traceMiles:ROUND(total),
  samplePlanningMiles:ROUND(total*OVERNIGHT_BUFFER),
  basis:'static OSM-based simplified roadway trace + 15% planning cushion at 45 mph; not a routed ETA or live access check',
  needsLiveDirections:true};
}
// Same editorial cold-season park/trail check used by the published route builder.
const SEASONAL_STOPS=new Set(['3','6','8','11','12','15','18','20','27','28']);
const DAY_WINDOWS=Object.freeze([6,8.5,10,12]);
// A conservative allocation of a visitor's *sample* day, not a visit-duration,
// daylight, road, admission, or safe-driving prediction. Never modify the route.
function experiencePlan(day,raw={},catalog={},windowHours=8.5){
 if(!DAY_WINDOWS.includes(windowHours)||!day||!Array.isArray(day.stops)||
   !Number.isFinite(day.rawDriveHours)||day.rawDriveHours<0||
   !Number.isFinite(day.borderReserveHours)||day.borderReserveHours<0||
   typeof day.withinCap!=='boolean'||typeof day.incompleteParkApproach!=='boolean')return null;
 const p=standardize(raw),dayMinutes=windowHours*60;
 const driveMinutes=Math.ceil(day.rawDriveHours*60),borderMinutes=Math.ceil(day.borderReserveHours*60);
 const unallocated=dayMinutes-driveMinutes-borderMinutes;
 const ranked=[...new Set(day.stops.slice(1))].filter(id=>catalog[id]&&
   Array.isArray(catalog[id].interests)&&typeof catalog[id].label==='string'&&typeof catalog[id].toolUrl==='string')
  .map(id=>({id,score:(id==='11'&&p.pictured?12:0)+
   catalog[id].interests.reduce((n,k)=>n+(p.interests.includes(k)?3:0),0)}))
  .sort((a,b)=>b.score-a.score);
 const first=ranked.find(x=>x.score>0);
 // Never release spare time for an unresolved road approach; keep it withheld.
 const remainingMinutes=day.incompleteParkApproach?null:Math.floor(Math.max(0,unallocated)/15)*15;
 const state=day.incompleteParkApproach?'ROAD_CHECK':
  !day.withinCap?'DRIVE_LIMIT':remainingMinutes<60?'TRANSFER':
  !first?'NO_MATCH':
  [11,12,1,2,3,4].includes(p.month)&&SEASONAL_STOPS.has(first.id)?'SEASONAL_CHECK':'REVIEW';
 return {state,dayMinutes,driveMinutes,borderMinutes,remainingMinutes,
  primary:state==='REVIEW'?first.id:null,
  seasonalCandidate:state==='SEASONAL_CHECK'?first.id:null,
  deferred:ranked.filter(x=>state!=='REVIEW'||x.id!==first.id).map(x=>x.id)};
}
const api=Object.freeze({optimize,standardize,validate,segment,experiencePlan,DAY_WINDOWS,assumedMph:ASSUMED_MPH,planningCushion:OVERNIGHT_BUFFER});
if(typeof module!=='undefined'&&module.exports)module.exports=api;
if(root)root.CircleTourOvernights=api;
})(typeof window==='undefined'?null:window);
