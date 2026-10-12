/* Minnesota Historical Society / State Park decision rules; published 2026 season only. */
(function(root,factory){const api=factory();if(typeof module!=="undefined"&&module.exports)module.exports=api;if(root)root.SplitRockLighthouseEngine=api})(typeof window!=="undefined"?window:null,function(){
"use strict";
const SOURCE={hours:"https://www.mnhs.org/splitrock",visit:"https://www.mnhs.org/splitrock/visit",memorial:"https://www.mnhs.org/events/53149640550",event:"https://www.mnhs.org/splitrock/activities/edmund-fitzgerald",statepark:"https://www.dnr.state.mn.us/state_parks/park.html?id=spk00266"};
const FACTS={seasonStart:"2026-05-01",seasonEnd:"2026-10-19",dailyOpen:"10:00 AM",dailyClose:"6:00 PM",memorial:"2026-11-10",ceremony:"4:15 PM"};
function valid(d){if(!/^\d{4}-\d\d-\d\d$/.test(String(d||"")))return false;const x=new Date(d+"T12:00:00Z");return !Number.isNaN(+x)&&x.toISOString().slice(0,10)===d;}
function evaluate(input){
 const i=Object.assign({date:"2026-10-12",experience:"tower",adults:2,seniors:0,children:0,parkPass:false},input||{}),people={adults:Math.max(0,Math.min(30,Number(i.adults)||0)),seniors:Math.max(0,Math.min(30,Number(i.seniors)||0)),children:Math.max(0,Math.min(30,Number(i.children)||0))},count=people.adults+people.seniors+people.children;
 const base={state:"VERIFY",headline:"Check published hours and ticket options",detail:"The historic site and the state park are separately administered.",price:null,requirements:[],sources:SOURCE,recorded:"2026-10-12"};
 if(!valid(i.date))return {...base,state:"NEED_DATE",headline:"Choose a valid visit date"};
 if(!count)return {...base,state:"NEED_PARTY",headline:"Enter at least one visitor"};
 if(i.experience==="park"){
  return {...base,state:"PARK_ONLY",headline:"State park visit — not lighthouse admission",detail:"Visiting the state park for lakeshore viewpoints is separate from admission to the MNHS historic lighthouse buildings.",requirements:["A Minnesota state park vehicle permit is ordinarily required for vehicles using state park parking.","A state park vehicle permit does not include historic-site lighthouse admission.","Confirm park-hours and access arrangements directly with the Minnesota DNR."],price:null};
 }
 if(i.experience==="memorial"){
  if(i.date!==FACTS.memorial)return {...base,state:"EVENT_DATE_MISMATCH",headline:"The memorial is November 10, 2026",detail:"Change the date to November 10, 2026 for this year's Edmund Fitzgerald ceremony. Future event years have not been verified."};
  return {...base,state:"MEMORIAL_EVENT",headline:"Memorial admission is a separate ticket",detail:"On November 10, 2026 the grounds and historic buildings are scheduled 10 AM–6 PM. The lighthouse temporarily closes at approximately 4:15 PM for crew-name reading; the beacon is lit afterward.",requirements:["Purchase or verify special event admission from MNHS; ordinary seasonal prices do not apply.","Event admission does not guarantee a parking space or specific seating.","Flashlight or headlamp recommended for unlit grounds after dark.","A livestream is available through MNHS for those not attending in person."],price:null};
 }
 if(i.date<FACTS.seasonStart||i.date>FACTS.seasonEnd){
  return {...base,state:"OUTSIDE_POSTED_SEASON",headline:"Standard 2026 admission schedule does not cover this date",detail:"The published standard schedule runs May 1–October 19, 2026, 10 AM–6 PM daily. A date outside that range cannot be declared open or closed without checking the current official page.",requirements:["Check special opening days or event hours directly with the Minnesota Historical Society.","A state park vehicle permit is required whenever the historic-site visitor center is closed."]};
 }
 if(i.experience==="grounds"){
  const cost=8*count;
  return {...base,state:"GROUNDS_ONLY",headline:"Grounds admission: no lighthouse or keeper's house entry",detail:"The 2026 grounds pass gives access to the historic grounds, not the interior of the lighthouse or keeper's house.",price:cost,requirements:["2026 grounds-pass reference: $8 per visitor.","Verify admission categories and child exemptions with MNHS before purchase.","Free historic-site parking is published during site operating hours for historic-site visitors only.","State park parking uses a separate vehicle-permit policy."]};
 }
 const price=15*people.adults+12*people.seniors+8*people.children;
 return {...base,state:"STANDARD_ADMISSION",headline:"Historic lighthouse visit — published 2026 admission",detail:"For the selected 2026 date, the normal historic-site hours are 10 AM–6 PM. General admission includes the lighthouse, keeper's home and visitor-center experience, subject to programming and construction changes.",price,requirements:["Adult $15; senior/college/military category $12; child age 5–17 $8 (2026 reference prices).","Children 4 and under and eligible MNHS members may be free; this simplified estimate does not model every discount.","Free parking for historic-site visitors during MNHS operating hours only.","Special tours are priced separately and may require their own reservation.","Check current construction-related program changes before paying."]};
}
return {FACTS,SOURCE,evaluate};
});
