'use strict';
// Offline signal classifier, NOT an official UDOT status or open-road detector.
// Input shapes: https://udottraffic.utah.gov/help/endpoint/{event,roadconditions,messagesigns}
const ROUTES=Object.freeze({
 SR190:{name:'Big Cottonwood Canyon',pattern:/\b(?:SR[-\s]*190|UT[-\s]*190|BIG\s+COTTONWOOD)\b/i,location:/BIG\s+COTTONWOOD\s+CANYON/i},
 SR210:{name:'Little Cottonwood Canyon',pattern:/\b(?:SR[-\s]*210|UT[-\s]*210|LITTLE\s+COTTONWOOD)\b/i,location:/LITTLE\s+COTTONWOOD\s+CANYON/i}
});
const TTL=Object.freeze({event:1800,roadconditions:1800,messagesigns:900});
function clean(v){return String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
function epoch(v){const n=Number(v);return Number.isFinite(n)&&n>0?(n>100000000000?Math.floor(n/1000):Math.floor(n)):null;}
function fresh(row,type,now){const t=epoch(row.LastUpdated);return t!==null&&t<=now+120&&now-t<=TTL[type];}
function label(s){
 const v=clean(s).toUpperCase();
 if(!v)return null;
 if(/\b(?:NO|WITHOUT|NOT)\s+(?:ACTIVE\s+)?(?:ROAD\s+)?CLOSURES?\b/.test(v)||/\bNO\s+UPHILL\s+RESTRICTIONS?\b/.test(v))return null;
 if(/\b(?:PLANNED|SCHEDULED|TOMORROW|TONIGHT|UPCOMING)\b/.test(v)&&/\b(?:CLOS(?:ED|URE)|RESTRICT(?:ED|ION)|TRACTION|CHAINS?)\b/.test(v))return 'AMBIGUOUS_NOTICE';
 // An Alta-bypass (partial) uphill closure does not automatically block Snowbird.
 if(/\bUPHILL\b/.test(v)&&/\b(?:RESTRICT(?:ED|ION)|CLOSED|TRAFFIC)\b/.test(v)&&
    /\b(?:PARTIAL|BYPASS\s+ROAD|TOWN\s+OF\s+ALTA)\b/.test(v))
   return 'PARTIAL_UPHILL_RESTRICTION';
 if(/\b(?:UPHILL\s+(?:TRAVEL\s+)?(?:CLOSED|RESTRICTED|RESTRICTION|PROHIBITED)|NO\s+UPHILL\s+TRAFFIC|UPHILL\s+TRAFFIC\s+NOT\s+ALLOWED)\b/.test(v))return 'UPHILL_RESTRICTION';
 if(/\b(?:(?:ROAD|CANYON|HIGHWAY|SR[-\s]*(?:190|210))\s+(?:IS\s+)?CLOSED|FULL\s+(?:ROAD\s+)?CLOSURE|ALL\s+LANES\s+CLOSED|CLOSED\s+TO\s+ALL\s+TRAFFIC)\b/.test(v))return 'CLOSED';
 if(/\b(?:TRACTION\s+(?:LAW\s+)?(?:REQUIREMENTS?\s+)?(?:IN\s+EFFECT|ACTIVE)|CHAINS?\s+REQUIRED|TRACTION\s+DEVICES?\s+REQUIRED|CLASS\s*[23]\s+TRACTION)\b/.test(v))return 'TRACTION_RESTRICTION';
 if(/\bPARKING\s+(?:LOTS?\s+)?(?:FULL|CAPACITY|LIMITED)\b/.test(v))return 'PARKING_ADVISORY';
 return null;
}
function activeEvent(e,now){
 const start=epoch(e.StartDate),end=epoch(e.PlannedEndDate);
 return (start===null||start<=now)&&(end===null||now<end);
}
function classify(feeds,routeId,now=Math.floor(Date.now()/1000)){
 const route=ROUTES[routeId];if(!route)throw new RangeError('Unsupported route');
 const input=feeds&&typeof feeds==='object'?feeds:{};
 const coverage={},signals=[];
 for(const [type,key] of [['event','events'],['roadconditions','roadconditions'],['messagesigns','messagesigns']]){
   const rows=input[key];
   coverage[key]=Array.isArray(rows)?'RECEIVED':'MISSING_OR_INVALID';
   if(!Array.isArray(rows))continue;
   for(const r of rows){
     if(!r||typeof r!=='object')continue;
     let kind=null;
     if(type==='event'){
       const roadText=[r.RoadwayName,r.Location,r.Name].map(clean).join(' ');
       if(!route.pattern.test(roadText)||!activeEvent(r,now))continue;
       kind=r.IsFullClosure===true?'CLOSED':label([r.Description,r.Comment,r.EventSubType].join(' '));
       // Recurrent schedules require temporal parsing; never assert closure is active.
       if(r.Recurrence||r.RecurrenceSchedules)kind=kind?'AMBIGUOUS_NOTICE':null;
       if(kind==='CLOSED'){
         // UDOT's IsFullClosure means all lanes of THIS EVENT, not the entire
         // canyon. An isolated canyon segment may or may not block this visitor.
         const scope=[r.Description,r.Name,r.Comment].map(clean).join(' ');
         const canyonPhrase=routeId==='SR210'?'LITTLE\\s+COTTONWOOD':'BIG\\s+COTTONWOOD';
         const whole=new RegExp('(?:'+canyonPhrase+'\\s+CANYON\\s+(?:IS\\s+)?(?:CLOSED|CLOSURE)|ENTIRE\\s+(?:'+canyonPhrase+'\\s+CANYON|CANYON)\\s+CLOSED|CANYON\\s+CLOSED\\s+TO\\s+ALL\\s+TRAFFIC)','i');
         // "Little Cottonwood Canyon closed at a parking entrance only" is a
         // local segment restriction despite the canyon-wide phrase. Do not
         // overstate the travel impact without destination-specific geometry.
         const segmentSpecific=/(?:\bONLY\b|\bLOCAL(?:IZED)?\b|\bMILEPOST\b|\bMP\s*\d+|\bPARKING\b|\bDRIVEWAY\b|\bNEAR\b|\bBETWEEN\b)/i.test(scope);
         if(!whole.test(scope)||!route.location.test(roadText)||segmentSpecific||epoch(r.StartDate)===null)
           kind='AMBIGUOUS_NOTICE';
       }
     }else if(type==='roadconditions'){
       if(!route.pattern.test(clean(r.RoadwayName)))continue;
       kind=label(r.Restriction)||'CONDITIONS_REPORTED';
     }else{
       const signText=Array.isArray(r.Messages)?r.Messages.map(clean).join(' '):clean(r.Messages);
       if(!route.pattern.test([r.Name,r.Roadway,signText].map(clean).join(' ')))continue;
       kind=label(signText);
       if(kind==='CLOSED'&&(!/(?:LITTLE|BIG)\s+COTTONWOOD\s+CANYON\s+(?:IS\s+)?CLOSED/i.test(signText)||
          /(?:\bONLY\b|\bLOCAL(?:IZED)?\b|\bMILEPOST\b|\bMP\s*\d+|\bPARKING\b|\bDRIVEWAY\b|\bNEAR\b|\bBETWEEN\b)/i.test(signText)))
         kind='AMBIGUOUS_NOTICE';
     }
     if(kind)signals.push({type,kind,id:String(r.ID??r.Id??''),fresh:fresh(r,type,now)});
   }
 }
 const live=signals.filter(s=>s.fresh&&s.kind!=='CONDITIONS_REPORTED');
 const old=signals.filter(s=>!s.fresh&&s.kind!=='CONDITIONS_REPORTED');
 const has=v=>live.some(s=>s.kind===v);
 let status='UNKNOWN',reason='NO_AUTHORITATIVE_OPEN_CONFIRMATION';
 if(has('CLOSED')){status='CLOSED';reason='ACTIVE_CLOSURE_SIGNAL';}
 else if(has('UPHILL_RESTRICTION')){status='UPHILL_RESTRICTED';reason='ACTIVE_UPHILL_SIGNAL';}
 else if(has('PARTIAL_UPHILL_RESTRICTION')){status='PARTIAL_UPHILL_RESTRICTION';reason='ACTIVE_PARTIAL_UPHILL_SIGNAL';}
 else if(has('TRACTION_RESTRICTION')){status='TRACTION_RESTRICTION';reason='ACTIVE_TRACTION_SIGNAL';}
 else if(has('AMBIGUOUS_NOTICE')||old.length){status='REVIEW_REQUIRED';reason='AMBIGUOUS_OR_STALE_HAZARD';}
 else if(Object.values(coverage).every(v=>v==='RECEIVED')&&signals.some(s=>s.type==='roadconditions'&&s.fresh)){
   status='NO_CONFIRMED_BLOCKER';reason='NO_BLOCKER_IN_RECEIVED_FEEDS';
 }
 return {route:routeId,canyon:route.name,status,reason,openConfirmed:false,
   observedAt:new Date(now*1000).toISOString(),coverage,signals,
   officialSource:'https://cottonwoodcanyons.udot.utah.gov/'};
}
module.exports={ROUTES,TTL,clean,label,classify};
