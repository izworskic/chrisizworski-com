/* Browser parity adapter: generated from Utah ski policy and decision models. */
(function(root){'use strict';const P={exports:{}};
(function(module){
'use strict';
// Research-only 2026-27 resort policy model. No ticket or parking inventory is queried.
// Outputs describe published rules, NOT verified admission or a guaranteed space.
const SOURCES=Object.freeze({
  alta:'https://www.alta.com/getting-here/parking-info',
  brighton:'https://www.brightonresort.com/getting-here-and-parking',
  solitude:'https://www.solitudemountain.com/discover-solitude/getting-here-parking',
  snowbird:'https://www.snowbird.com/the-mountain/parking/parking-overview/',
  ikon:'https://www.ikonpass.com/en/faq/'
});
const CANYON=Object.freeze({alta:'SR210',snowbird:'SR210',brighton:'SR190',solitude:'SR190'});
const BASE_BLACKOUTS=Object.freeze([['2026-12-26','2026-12-30'],['2027-01-16','2027-01-17'],['2027-02-13','2027-02-14']]);
function range(d,a,b){return d>=a&&d<=b;}
function ranges(d,items){return items.some(v=>range(d,v[0],v[1]));}
function dateValid(d){return typeof d==='string'&&/^20\d\d-\d\d-\d\d$/.test(d)&&!Number.isNaN(Date.parse(d+'T12:00:00Z'))&&new Date(d+'T12:00:00Z').toISOString().startsWith(d);}
function friSatSun(d){return [0,5,6].includes(new Date(d+'T12:00:00Z').getUTCDay());}
function resortHoliday(r,d){
 if(r==='brighton')return d!=='2026-12-25'&&ranges(d,[['2026-12-18','2027-01-03'],['2027-01-16','2027-01-19'],['2027-02-13','2027-02-16']]);
 if(r==='solitude')return ranges(d,[['2026-12-25','2027-01-03'],['2027-01-18','2027-01-18'],['2027-02-15','2027-02-15']]);
 return false;
}
function parking({resort,date,hour,passengers,hasReservation}){
 const src=SOURCES[resort];
 if(!src||!dateValid(date)||!Number.isInteger(hour)||hour<0||hour>23)return {status:'UNKNOWN',reason:'INVALID_TRIP_INPUT'};
 if(!range(date,'2026-11-01','2027-05-31'))return {status:'UNKNOWN',reason:'OUTSIDE_MODELED_SEASON',source:src};
 if(!Number.isInteger(passengers)||passengers<1||passengers>20)return {status:'UNKNOWN',reason:'INVALID_VEHICLE_OCCUPANCY',source:src};
 if(resort==='snowbird')return {status:'PARKING_OPTIONS_UNVERIFIED',reason:'FREE_FIRST_COME_AND_RESERVED_SPECIFIC_LOTS_2026_27',source:src};
 if(resort==='brighton'&&hour<7)return {status:'LOT_CLOSED',reason:'LOT_OPENING_HOUR',source:src};
 if(resort==='solitude'&&hour<7)return {status:'LOT_CLOSED',reason:'MOONBEAM_OPENS_7AM',source:src};
 if(resort==='brighton'&&hour>=12)return {status:'NO_RESERVATION_REQUIRED',reason:'AFTER_NOON',source:src};
 if(resort==='solitude'&&hour>=11)return {status:'NO_RESERVATION_REQUIRED',reason:'AFTER_11AM',source:src};
 if(resort==='alta'&&hour>=13)return {status:'NO_RESERVATION_REQUIRED',reason:'AFTER_1PM',source:src};
 if(resort==='alta'&&hour<8){
   // Alta ordinary resort lots do not provide general parking before 8 AM.
   // Published early-morning reservations are specific to the South Flagstaff lot.
   if(hour<6)return {status:'LOT_CLOSED',reason:'NO_ORDINARY_PARKING_BEFORE_8AM',source:src};
   if(!range(date,'2026-12-11','2027-04-04'))return {status:'UNKNOWN',reason:'EARLY_MORNING_SEASON_UNVERIFIED',source:src};
   const holiday=ranges(date,[['2026-12-18','2027-01-03'],['2027-01-18','2027-01-18'],['2027-02-15','2027-02-15']]);
   return {status:hasReservation===true?'USER_REPORTS_RESERVATION':hasReservation===false?'RESERVATION_REQUIRED':'RESERVATION_UNVERIFIED',
     reason:'EARLY_MORNING_SOUTH_FLAGSTAFF_ONLY',publishedStandardPriceUSD:friSatSun(date)||holiday?25:15,source:src};
 }
 let required=false;
 if(resort==='brighton'){
   if(date>'2027-04-18')return {status:'UNKNOWN',reason:'CLOSING_DAY_UNVERIFIED',source:src};
   required=date>='2026-12-04'&&(friSatSun(date)||resortHoliday(resort,date))&&date!=='2026-12-25';
 } else if(resort==='solitude'){
   required=range(date,'2026-12-18','2027-03-28')&&(friSatSun(date)||resortHoliday(resort,date));
 } else if(resort==='alta'){
   if(date>'2027-04-25')return {status:'UNKNOWN',reason:'AFTER_PUBLISHED_CLOSING_DAY',source:src};
   const holiday=ranges(date,[['2026-12-18','2027-01-03'],['2027-01-18','2027-01-18'],['2027-02-15','2027-02-15']]);
   required=date==='2027-04-25'||(range(date,'2026-12-11','2027-04-04')&&(friSatSun(date)||holiday));
 }
 if(!required)return {status:'NO_RESERVATION_REQUIRED',reason:'OUTSIDE_KNOWN_REQUIRED_WINDOW',source:src};
 const price=resort==='brighton'?(passengers>=4?10:25):resort==='solitude'?(passengers>=4?0:35):25;
 return {status:hasReservation===true?'USER_REPORTS_RESERVATION':hasReservation===false?'RESERVATION_REQUIRED':'RESERVATION_UNVERIFIED',
         reason:'RESERVATION_WINDOW',publishedStandardPriceUSD:price,source:src};
}
function admission({resort,date,pass,combinedAltaSnowbirdUsed,snowbirdUsed,brightonUsed}){
 if(!CANYON[resort]||!dateValid(date))return {status:'UNKNOWN',reason:'INVALID_TRIP_INPUT'};
 if(pass==='USER_CONFIRMED_TICKET')return {status:'UNVERIFIED_TICKET',reason:'USER_REPORT_NOT_PROVIDER_VERIFIED'};
 if(!['IKON','IKON_BASE'].includes(pass))return {status:'UNKNOWN',reason:'PASS_NOT_MODELED'};
 if(!range(date,'2026-11-01','2027-05-31'))return {status:'UNKNOWN',reason:'OUTSIDE_MODELED_SEASON'};
 if(resort==='alta'&&pass==='IKON_BASE')return {status:'NOT_ELIGIBLE',reason:'IKON_BASE_EXCLUDES_ALTA',source:SOURCES.ikon};
 if(resort==='snowbird'&&pass==='IKON_BASE'&&ranges(date,BASE_BLACKOUTS))return {status:'BLACKOUT',reason:'SNOWBIRD_IKON_BASE_BLACKOUT',source:SOURCES.ikon};
 if(resort==='alta'||resort==='snowbird'){
   const limit=pass==='IKON'?7:5;
   const used=pass==='IKON'?combinedAltaSnowbirdUsed:snowbirdUsed;
   if(!Number.isInteger(used)||used<0)return {status:'DAY_COUNT_UNKNOWN',reason:'REMAINING_DAYS_UNVERIFIED',source:SOURCES.ikon};
   return used>=limit?{status:'DAYS_EXHAUSTED',reason:'PASS_DAY_LIMIT_REACHED',source:SOURCES.ikon}:
     {status:'POTENTIALLY_ELIGIBLE',reason:'DAYS_SELF_REPORTED',source:SOURCES.ikon};
 }
 if(resort==='solitude'){
   // Published 26/27 full and Base Ikon both include unlimited Solitude access.
   return {status:'POTENTIALLY_ELIGIBLE',reason:'UNLIMITED_SOLITUDE_ACCESS_PUBLISHED',source:SOURCES.ikon};
 }
 if(resort==='brighton'){
   if(pass==='IKON_BASE'&&ranges(date,BASE_BLACKOUTS))
     return {status:'BLACKOUT',reason:'BRIGHTON_IKON_BASE_BLACKOUT',source:SOURCES.ikon};
   const limit=pass==='IKON'?7:5;
   if(!Number.isInteger(brightonUsed)||brightonUsed<0)return {status:'DAY_COUNT_UNKNOWN',reason:'REMAINING_BRIGHTON_DAYS_UNVERIFIED',source:SOURCES.ikon};
   return brightonUsed>=limit?{status:'DAYS_EXHAUSTED',reason:'BRIGHTON_DAY_LIMIT_REACHED',source:SOURCES.ikon}:
     {status:'POTENTIALLY_ELIGIBLE',reason:'BRIGHTON_DAYS_SELF_REPORTED',source:SOURCES.ikon};
 }
 return {status:'UNKNOWN',reason:'UNMODELED_PASS_ACCESS',source:SOURCES.ikon};
}
module.exports={SOURCES,CANYON,BASE_BLACKOUTS,parking,admission,dateValid};

})(P);const D={exports:{}};
(function(module,require){
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
 if(!['CLOSED','UPHILL_RESTRICTED','PARTIAL_UPHILL_RESTRICTION','TRACTION_RESTRICTION','REVIEW_REQUIRED','NO_CONFIRMED_BLOCKER','UNKNOWN'].includes(snapshot.status))
   return {status:'UNKNOWN',reason:'UNRECOGNIZED_ROAD_STATUS'};
 return {status:snapshot.status,reason:snapshot.reason||'CLASSIFIED_UDOT_SIGNAL',observedAt:snapshot.observedAt};
}
function issue(code,action){return {code,action};}
function evaluate(input,resort,now=new Date()){
 if(!RESORTS.includes(resort))throw new RangeError('Unsupported ski resort');
 const transit=['UTA_BUS','SHUTTLE','AUTHORIZED_TRANSPORT'].includes(input.travelMode);
 const p=transit?{status:'NOT_APPLICABLE_TRANSIT',reason:'NO_PERSONAL_VEHICLE_PARKING'}:
   parking({resort,date:input.date,hour:input.hour,passengers:input.passengers,
     hasReservation:input.parkingReservations?.[resort]});
 const a=admission({resort,date:input.date,pass:input.pass,combinedAltaSnowbirdUsed:input.combinedAltaSnowbirdUsed,
   snowbirdUsed:input.snowbirdUsed,brightonUsed:input.brightonUsed});
 const road=roadForTrip(input.roads?.[CANYON[resort]],{date:input.date,hour:input.hour,now});
 const blockers=[],actions=[],unknowns=[];
 if(road.status==='CLOSED')blockers.push(issue('CANYON_CLOSED','Do not enter; consult official UDOT notices.'));
 else if(road.status==='UPHILL_RESTRICTED'||road.status==='PARTIAL_UPHILL_RESTRICTION'){
   const affectsDestination=road.status!=='PARTIAL_UPHILL_RESTRICTION'||resort==='alta';
   const potentialException=input.parkingReservations?.[resort]===true||
     ['UTA_BUS','SHUTTLE','AUTHORIZED_TRANSPORT'].includes(input.travelMode)||
     ['RESIDENT','LODGING_GUEST','CRITICAL_EMPLOYEE','AUTHORIZED_PERSONNEL'].includes(input.uphillExceptionProof);
   if(!affectsDestination){
     unknowns.push(issue('ALTA_BYPASS_RESTRICTION_VERIFY','Partial upper-canyon restriction reported; Snowbird may still be reachable. Verify official checkpoint notice.'));
   }else if(potentialException){
     unknowns.push(issue('UPHILL_EXCEPTION_MAY_APPLY','UDOT lists exceptions for some reservations, transit and authorized travelers. Present proof at checkpoint; access is not guaranteed.'));
   }else{
     blockers.push(issue('UPHILL_RESTRICTION_NO_DOCUMENTED_EXCEPTION','Do not attempt ordinary uphill entry during the restriction. Verify any exception with UDOT.'));
   }
 }
 else if(road.status==='TRACTION_RESTRICTION')unknowns.push(transit?
   issue('TRANSIT_ROUTE_IMPACT_UNVERIFIED','Confirm ski bus or shuttle service during the active traction restriction.'):
   issue('TRACTION_COMPLIANCE_UNVERIFIED','Review active UDOT traction requirements and vehicle tires.'));
 else if(road.status==='REVIEW_REQUIRED')unknowns.push(issue('ROAD_REVIEW_REQUIRED','Read official canyon notice and restriction details.'));
 else unknowns.push(issue('ROAD_NOT_CONFIRMED_OPEN','Verify official conditions before departure.'));
 if(p.status==='LOT_CLOSED')blockers.push(issue('LOT_CLOSED','Choose a later arrival or other verified parking.'));
 else if(p.status==='RESERVATION_REQUIRED')actions.push(issue('PARKING_RESERVATION_REQUIRED','Reserve parking or adjust arrival time.'));
 else if(['RESERVATION_UNVERIFIED','USER_REPORTS_RESERVATION','PARKING_OPTIONS_UNVERIFIED','UNKNOWN'].includes(p.status))
   unknowns.push(issue('PARKING_RULE_OR_BOOKING_UNVERIFIED','Verify dates, lot and reservation with the resort.'));
 if(['NOT_ELIGIBLE','BLACKOUT','DAYS_EXHAUSTED'].includes(a.status))
   blockers.push(issue('RESORT_ADMISSION_BLOCKED','Select another resort or valid admission product.'));
 else unknowns.push(issue('ADMISSION_NOT_VERIFIED','Confirm ticket/pass blackout and day availability.'));
 if(transit)unknowns.push(issue('TRANSIT_SERVICE_AND_BOARDING_UNVERIFIED','Verify scheduled service, stop access, and ability to board; bus positions are not seating inventory.'));
 else unknowns.push(issue('PARKING_CAPACITY_UNKNOWN','No live parking inventory is available; space is not guaranteed.'));
 const verdict=blockers.length?'TRIP_NOT_FEASIBLE_AS_PLANNED':
   actions.length?'ACTION_REQUIRED':'VERIFY_BEFORE_DEPARTURE';
 return {resort,canyon:CANYON[resort],verdict,blockers,actions,unknowns,road,parking:p,admission:a,
   safetyOrInventoryGuaranteed:false};
}
function compare(input,now=new Date()){return RESORTS.map(r=>evaluate(input,r,now));}
module.exports={RESORTS,roadForTrip,evaluate,compare};

})(D,function(p){if(p!=='./policy')throw Error('unsupported import');return P.exports;});root.UtahSki=Object.freeze({compare:D.exports.compare,policy:P.exports});})(window);
