'use strict';
// Dated USACE recreational navigation rules. This module NEVER establishes
// lock opening, safe approach, current availability or permission to enter.
const WINTER='https://ndc.ops.usace.army.mil/ords/ntni/print_nav_notice?in_nav_notice_number=215019&in_title_formatting=UB';
const SUMMER='https://www.nwp.usace.army.mil/Media/News-Releases/Article/4508175/summer-recreational-lock-schedule-now-in-effect-on-columbia-river/';
const SAFETY='https://www.nwp.usace.army.mil/Media/Public-Notices/Article/3783175/corps-updates-safe-lockage-policy-for-recreational-vessels-on-columbia-snake-ri/';
const NOTICES='https://ndc.ops.usace.army.mil/ords/r/ntni/notices/navigation-notices';
const CONTACT={name:'John Day Lock control',phone:'541-739-1050',vhf:'14',minimumNoticeMinutes:30,source:WINTER};
const RULE_WINDOWS=Object.freeze([
 {id:'summer-2026',from:'2026-05-15',through:'2026-09-14',source:SUMMER,kind:'scheduled'},
 {id:'winter-2026-27',from:'2026-09-15',through:'2027-05-14',source:WINTER,kind:'daylight-request'}
]);
const TIMES={upstream:['9:00 AM','12:00 PM','3:00 PM','6:00 PM','9:00 PM'],downstream:['9:30 AM','12:30 PM','3:30 PM','6:30 PM','9:30 PM']};
function validDate(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
 const d=new Date(s+'T12:00:00Z');
 return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===s;
}
function decide({date,direction='upstream',craft='motorized'}={}){
 if(!validDate(date))return {kind:'invalid',title:'Choose a valid date',explanation:'Select the intended passage date.',verified:false,source:null,contact:CONTACT};
 if(!['upstream','downstream'].includes(direction)||!['motorized','nonmotorized'].includes(craft))
   return {kind:'invalid',title:'Choose a direction and craft type',explanation:'Use an available selector.',verified:false,source:null,contact:CONTACT};
 const period=RULE_WINDOWS.find(x=>date>=x.from&&date<=x.through);
 let result;
 if(!period){
   result={kind:'unverified-period',title:'No verified published rules for this date',explanation:'Do not reuse a past seasonal schedule. Check current USACE navigation notices and contact lock control.',verified:false,source:NOTICES,times:[]};
 }else if(period.kind==='scheduled'){
   result={kind:'scheduled',title:'Published summer 2026 recreational time slots',explanation:'These are published directional recreational lockage times, NOT appointments, arrival guarantees or present lock availability. Check later notices and contact the operator before arrival.',verified:true,source:SUMMER,times:[...TIMES[direction]],publishedWindow:{from:period.from,through:period.through}};
 }else{
   result={kind:'daylight-request',title:'Winter 2026–27: daylight only, on request',explanation:'USACE publishes daylight-only lockage on request. Commercial traffic generally has priority before and after the annual outage. Actual passage is at lock-operator discretion; a separate notice may affect operations.',verified:true,source:WINTER,times:[],publishedWindow:{from:period.from,through:period.through}};
 }
 result={...result,date,direction,craft,contact:CONTACT,safetySource:SAFETY,noticesSource:NOTICES,
  limitations:['Check current Navigation Notices to Navigation Interests for closures, amendments and outages.','Contact John Day lock control at least 30 minutes before arriving: 541-739-1050 or marine VHF channel 14.','Carry mooring lines and comply with the current Corps safe-lockage policy; the operator has final authority.'],
  liveStatus:'unknown',navigationClearance:false};
 if(craft==='nonmotorized'){
   result.kind='assist-required';
   result.title='Nonmotorized craft: qualified motorized assist required';
   result.explanation='USACE permits some nonmotorized craft only when secured to an approved motorized assist craft with passengers aboard that assist craft, subject to the lockmaster. The government does not provide an assist vessel. Do not approach expecting solo lockage.';
   result.limitations.unshift('Arrange a qualified assist vessel, transfer passengers aboard the assist vessel, and confirm suitability directly with lock control before approaching.');
   result.times=[]; // no implied appointment for a solo canoe or kayak
 }
 return result;
}
module.exports={decide,validDate,CONTACT,RULE_WINDOWS,TIMES,WINTER,SUMMER,SAFETY,NOTICES};
