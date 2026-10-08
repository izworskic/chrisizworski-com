'use strict';
// Offline visitor-level proof; no live road, admission, or parking availability claims.
const {CANYON,parking,admission,dateValid}=require('./policy');
const RESORTS=Object.freeze(['alta','snowbird','brighton','solitude']);
const TZ='America/Denver';
function local(date){
 const a=new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',
   hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date);
 const p=Object.fromEntries(a.filter(v=>v.type!=='literal').map(v=>[v.type,v.value]));
 return {day:[p.year,p.month,p.day].join('-'),minute:Number(p.hour)*60+Number(p.minute)};
}
function roadForTrip(snapshot,{date,hour,now}){
 if(!dateValid(date)||!Number.isInteger(hour)||hour<0||hour>23||
    !(now instanceof Date)||!Number.isFinite(now.getTime()))return {status:'UNKNOWN',reason:'INVALID_TIME'};
 const t=local(now),offset=hour*60-t.minute;
 // Live traffic status is relevant only to a near-term departure, never tomorrow or next week.
 if(date!==t.day||offset < -60||offset>120)return {status:'UNKNOWN',reason:'SNAPSHOT_NOT_APPLICABLE_TO_TRIP'};
 if(!snapshot||!snapshot.observedAt)return {status:'UNKNOWN',reason:'NO_TIMESTAMPED_ROAD_SNAPSHOT'};
 const observed=Date.parse(snapshot.observedAt);
 if(!Number.isFinite(observed)||observed>now.getTime()+120000||now.getTime()-observed>1200000)
   return {status:'UNKNOWN',reason:'STALE_ROAD_SNAPSHOT'};
 if(!['CLOSED','UPHILL_RESTRICTED','TRACTION_RESTRICTION','REVIEW_REQUIRED','NO_CONFIRMED_BLOCKER','UNKNOWN'].includes(snapshot.status))
   return {status:'UNKNOWN',reason:'UNRECOGNIZED_ROAD_STATUS'};
 return {status:snapshot.status,reason:snapshot.reason||'CLASSIFIED_UDOT_SIGNAL',observedAt:snapshot.observedAt};
}
function issue(code,action){return {code,action};}
function evaluate(input,resort,now=new Date()){
 if(!RESORTS.includes(resort))throw new RangeError('Unsupported ski resort');
 const p=parking({resort,date:input.date,hour:input.hour,passengers:input.passengers,
   hasReservation:input.parkingReservations?.[resort]});
 const a=admission({resort,date:input.date,pass:input.pass,combinedAltaSnowbirdUsed:input.combinedAltaSnowbirdUsed,
   snowbirdUsed:input.snowbirdUsed,brightonUsed:input.brightonUsed});
 const road=roadForTrip(input.roads?.[CANYON[resort]],{date:input.date,hour:input.hour,now});
 const blockers=[],actions=[],unknowns=[];
 if(road.status==='CLOSED')blockers.push(issue('CANYON_CLOSED','Do not enter; consult official UDOT notices.'));
 else if(road.status==='UPHILL_RESTRICTED')blockers.push(issue('UPHILL_TRAVEL_RESTRICTED','Do not enter uphill until lifted.'));
 else if(road.status==='TRACTION_RESTRICTION')unknowns.push(issue('TRACTION_COMPLIANCE_UNVERIFIED','Review active UDOT traction requirements and vehicle tires.'));
 else if(road.status==='REVIEW_REQUIRED')unknowns.push(issue('ROAD_REVIEW_REQUIRED','Read official canyon notice and restriction details.'));
 else unknowns.push(issue('ROAD_NOT_CONFIRMED_OPEN','Verify official conditions before departure.'));
 if(p.status==='LOT_CLOSED')blockers.push(issue('LOT_CLOSED','Choose a later arrival or other verified parking.'));
 else if(p.status==='RESERVATION_REQUIRED')actions.push(issue('PARKING_RESERVATION_REQUIRED','Reserve parking or adjust arrival time.'));
 else if(['RESERVATION_UNVERIFIED','USER_REPORTS_RESERVATION','UNKNOWN'].includes(p.status))
   unknowns.push(issue('PARKING_RULE_OR_BOOKING_UNVERIFIED','Verify dates, lot and reservation with the resort.'));
 if(['NOT_ELIGIBLE','BLACKOUT','DAYS_EXHAUSTED'].includes(a.status))
   blockers.push(issue('RESORT_ADMISSION_BLOCKED','Select another resort or valid admission product.'));
 else unknowns.push(issue('ADMISSION_NOT_VERIFIED','Confirm ticket/pass blackout and day availability.'));
 unknowns.push(issue('PARKING_CAPACITY_UNKNOWN','No live parking inventory is available; space is not guaranteed.'));
 const verdict=blockers.length?'TRIP_NOT_FEASIBLE_AS_PLANNED':
   actions.length?'ACTION_REQUIRED':'VERIFY_BEFORE_DEPARTURE';
 return {resort,canyon:CANYON[resort],verdict,blockers,actions,unknowns,road,parking:p,admission:a,
   safetyOrInventoryGuaranteed:false};
}
function compare(input,now=new Date()){return RESORTS.map(r=>evaluate(input,r,now));}
module.exports={RESORTS,roadForTrip,evaluate,compare};
