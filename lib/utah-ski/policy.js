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
 if(resort==='snowbird')return {status:'NO_RESERVATION_REQUIRED',reason:'FIRST_COME_PARKING_NOT_GUARANTEED',source:src};
 if(resort==='brighton'&&hour<7)return {status:'LOT_CLOSED',reason:'LOT_OPENING_HOUR',source:src};
 if(resort==='solitude'&&hour<7)return {status:'LOT_CLOSED',reason:'MOONBEAM_OPENS_7AM',source:src};
 if(resort==='brighton'&&hour>=12)return {status:'NO_RESERVATION_REQUIRED',reason:'AFTER_NOON',source:src};
 if(resort==='solitude'&&hour>=11)return {status:'NO_RESERVATION_REQUIRED',reason:'AFTER_11AM',source:src};
 if(resort==='alta'&&hour>=13)return {status:'NO_RESERVATION_REQUIRED',reason:'AFTER_1PM',source:src};
 if(resort==='alta'&&hour<8)return {status:'UNKNOWN',reason:'EARLY_PARKING_RULE_NOT_MODELED',source:src};
 let required=false;
 if(resort==='brighton'){
   if(date>'2027-04-18')return {status:'UNKNOWN',reason:'CLOSING_DAY_UNVERIFIED',source:src};
   required=date>='2026-12-04'&&(friSatSun(date)||resortHoliday(resort,date))&&date!=='2026-12-25';
 } else if(resort==='solitude'){
   required=range(date,'2026-12-18','2027-03-28')&&(friSatSun(date)||resortHoliday(resort,date));
 } else if(resort==='alta'){
   if(date>'2027-04-04')return {status:'UNKNOWN',reason:'SPECIAL_CLOSING_DAY_RULE_NOT_MODELED',source:src};
   if(date>='2026-12-11'&&!friSatSun(date))return {status:'UNKNOWN',reason:'WEEKDAY_HOLIDAY_CALENDAR_NOT_VERIFIED',source:src};
   required=date>='2026-12-11'&&friSatSun(date);
 }
 if(!required)return {status:'NO_RESERVATION_REQUIRED',reason:'OUTSIDE_KNOWN_REQUIRED_WINDOW',source:src};
 const price=resort==='brighton'?(passengers>=4?10:25):resort==='solitude'?(passengers>=4?0:35):null;
 return {status:hasReservation===true?'USER_REPORTS_RESERVATION':hasReservation===false?'RESERVATION_REQUIRED':'RESERVATION_UNVERIFIED',
         reason:'RESERVATION_WINDOW',publishedStandardPriceUSD:price,source:src};
}
function admission({resort,date,pass,combinedAltaSnowbirdUsed,snowbirdUsed}){
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
 // Do not apply Snowbird's five-day limit or blanket Base blackouts to other resorts.
 return {status:'UNKNOWN',reason:'BRIGHTON_OR_SOLITUDE_PASS_TERMS_UNVALIDATED',source:SOURCES.ikon};
}
module.exports={SOURCES,CANYON,BASE_BLACKOUTS,parking,admission,dateValid};
