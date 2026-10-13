'use strict';
// Arrival and movement comparison. Exact group fares from operator tariff;
// travel allowances are planning bands, NEVER a live route or live bus timetable.
// No direct-lot Canadian rate, parking inventory, or verified 2026-27 WEGO
// last-bus time is available: UNKNOWN is intentionally retained.
const SOURCE=Object.freeze({
 wego:'https://www.niagaraparks.com/getting-around/wego-niagara-falls-bus/',
 parkingCA:'https://www.niagaraparks.com/visit-niagara-parks/plan-your-visit/getting-around/',
 parkingUS:'https://www.niagarafallsstatepark.com/park-information/parking/',
 pass:'https://www.niagaraparks.com/visit-niagara-parks/plan-your-visit/deals-packages/'
});
const CAD_FARES=Object.freeze({adult24:16,child24:12});
function seasonStatus(date){
 // The operator describes Rapidsview as SEASONAL. The 2026 reopening and
 // last-service dates are not present in the verified tariff source.
 if(/^2026-(0[5-9]|10)-\d{2}$/.test(date))return 'SEASONAL_VERIFY_SERVICE';
 return 'SEASON_NOT_CONFIRMED';
}
function usRate(date){
 if(date>='2026-10-12'&&date<='2027-03-31')return 10;
 // 2026 published Mon-Thu $10 Fri-Sun $15 May 22-Oct 11.
 if(date>='2026-05-22'&&date<='2026-10-11'){
  const day=new Date(date+'T12:00:00Z').getUTCDay();
  return day===5||day===6||day===0?15:10;
 }
 return null;
}
function positiveInt(n,max=20){return Number.isInteger(n)&&n>=0&&n<=max?n:0;}
function compareArrival(plan,config={}){
 const driving=plan.side==='US'||plan.side==='CA';
 const adults=Math.max(1,positiveInt(config.adults)||2);
 const children=positiveInt(config.children);
 const hasWego=Boolean(config.wegoIncluded||config.rapidsviewIncluded);
 const freeRapidsview=Boolean(config.rapidsviewIncluded);
 const currency=plan.side==='CA'?'CAD':'USD';
 const stops=plan.stops||[];
 const transferMins=stops.reduce((sum,s)=>sum+(s.transfer_minutes||0),0);
 const options=[];
 function add(id,name,price,arrival,roundTrip,certainty,explanation,source,check,selected){
  options.push({id,name,currency,known_total:price,total_verified:price!==null,
   arrival_allowance_minutes:arrival,roundtrip_extra_minutes:roundTrip,
   certainty,explanation,source_url:source,required_check:check,
   selected:Boolean(selected)});
 }
 add('walk','Walk in / get dropped off',0,0,null,'ARRIVAL_ASSUMED',
  'No parking or visitor transit purchased here. The plan assumes you are already at the first stop at your selected start time. Travel to that start is not included.',
  plan.side==='CA'?SOURCE.parkingCA:SOURCE.parkingUS,
  'Open pedestrian directions to your first stop; no claim about your journey to Niagara.',
  config.mode==='walk');
 if(plan.side==='US'){
  const rate=usRate(plan.visit_local_date);
  add('park','Park once at the State Park',rate,20,null,rate===null?'PRICE_UNVERIFIED':'PUBLISHED_RATE',
   'Nearest appropriate Lot 1 or Lot 2; allow about 20 minutes before the itinerary for paying, parking and walking. Park transfer times within the itinerary are unchanged.',
   SOURCE.parkingUS,'Lot space is not tracked. The Scenic Trolley is optional and not included in the calculated time or cost.',config.mode==='drive');
  add('trolley','Scenic Trolley (optional movement)',null,null,null,'SERVICE_UNVERIFIED',
   'May reduce walking between park areas, but verified departures, fare and route suitability for this date are unavailable. Cannot establish that it is faster than walking.',
   'https://www.niagarafallsstatepark.com/attractions/trolley/',
   'Confirm route and service with New York State Park; do not count on it for a tight admission cutoff.',
   config.mode==='transit');
 }else{
  add('park','Park once near the Falls',null,20,null,'PRICE_UNVERIFIED',
   'Lot A or Queen Victoria Place gives the most straightforward start. Ontario publishes variable daily rates, so there is no honest numeric total to compare with WEGO.',
   SOURCE.parkingCA,'Allow about 20 minutes before your selected start. Parking-space availability and current fee are unknown.',config.mode==='drive');
  // Published 2026 visitor fares. WEGO pass is per PERSON, not per vehicle.
  const fare=hasWego?0:adults*CAD_FARES.adult24+children*CAD_FARES.child24;
  const parking=freeRapidsview?0:10;
  const routeStatus=seasonStatus(plan.visit_local_date);
  add('rapidsview','Rapidsview park-and-ride + WEGO',parking+fare,25,{min:40,max:100},routeStatus,
   (freeRapidsview?'Rapidsview parking included with your qualifying online Falls Pass.':'Published park-and-ride reference is CAD $10/vehicle, subject to seasonal operation.')+
   ' '+(hasWego?'Your existing pass includes WEGO, so no second fare is added.':
   'WEGO 24-hour fare: '+adults+' adult × CAD $16 + '+children+' child (3–12) × CAD $12.')+
   ' Plan about 25 minutes before sightseeing for parking, boarding and the stated roughly 7–8-minute ride; return-trip time is a 40–100-minute planning range, not an official timetable.',
   SOURCE.parkingCA,'Rapidsview is seasonal. Exact 2026-27 service dates, return departures, real-time waits, and admission cutoffs have not been confirmed; verify before choosing this option.',
   config.mode==='transit'&&config.origin==='rapidsview');
  add('wego','WEGO from your own arrival point',fare,null,null,'ORIGIN_UNVERIFIED',
   (hasWego?'Existing access already covers WEGO.':adults+' adult × CAD $16 + '+children+' child × CAD $12 for 24-hour passes.')+
   ' Whether a WEGO stop is close to your hotel or arrival point cannot be calculated without an origin.',
   SOURCE.wego,'Enter an actual starting point in a routing app; WEGO real-time departures are available through the operator-linked Transit app.',
   config.mode==='transit');
 }
 const selected=options.find(x=>x.selected)||options.find(x=>x.id==='walk');
 const known=options.filter(x=>x.total_verified);
 const lowestKnown=Math.min(...known.map(x=>x.known_total));
 return {
  version:1,currency,adults,children,transfers_planned_minutes:transferMins,
  choices:options,selected_id:selected.id,
  known_lowest_cost:lowestKnown,
  winner:'UNRESOLVED',
  verdict:plan.side==='CA'?'Direct Falls parking is simpler to plan, but its rate varies; Rapidsview can have a calculable group fare, but service and return bus times must be verified.':'State Park Lots 1 and 2 have published fees for the covered dates. The trolley is not priced or timed reliably enough to declare it faster.',
  important:'These are different starting points. A $0 walk-in option does not include the cost or time of getting to Niagara Falls. Do not compare it to paid parking as if origins were identical.',
  timing_note:'Arrival buffers are additional time BEFORE the itinerary start. They do not alter the attraction plan, and the walking transfer times in the plan are not live pedestrian routing. WEGO last-bus and timetable have not been validated for this date.',
  sources:SOURCE
 };
}
module.exports={compareArrival,seasonStatus,usRate,CAD_FARES,SOURCE};
