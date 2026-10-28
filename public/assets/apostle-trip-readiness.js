/* Apostle Islands trip readiness (2026 evidence snapshot). No remote booking state or safety verdicts. */
(() => {
'use strict';
const form=document.getElementById('trip-readiness-form');
if(!form)return;
const $=id=>document.getElementById(id);
const island=$('trip-island'),visit=$('trip-type'),mode=$('trip-transport'),date=$('trip-date'),people=$('trip-people'),nights=$('trip-nights');
const output=$('trip-r-result'),heading=$('trip-r-title'),status=$('trip-r-status'),summary=$('trip-r-summary'),dateNote=$('trip-r-date-note'),fee=$('trip-r-fee'),steps=$('trip-r-steps'),copy=$('trip-copy'),copied=$('trip-copy-status'),nightWrap=$('trip-nights-wrap');
const source={
 permit:'https://www.nps.gov/apis/planyourvisit/camping-permits-reservations.htm',
 camping:'https://www.nps.gov/apis/planyourvisit/camping.htm',
 conditions:'https://www.nps.gov/apis/planyourvisit/conditions.htm',
 shuttles:'https://www.apostleisland.com/hiking-and-camping-shuttles/',
 lighthouse:'https://www.apostleisland.com/fares-schedules/',
 taxis:'https://www.nps.gov/apis/planyourvisit/commercial-services.htm',
 docks:'https://www.nps.gov/apis/planyourvisit/boating.htm',
 marine:'https://marine.weather.gov/MapClick.php?zoneid=LSZ150',
 closures:'https://www.nps.gov/apis/learn/infrastructure-projects.htm'
};
const islandNames={stockton:'Stockton Island',oak:'Oak Island',sand:'Sand Island',raspberry:'Raspberry Island',michigan:'Michigan Island',rocky:'Rocky Island',basswood:'Basswood Island',devils:'Devils Island'};
const groupIslands=new Set(['stockton','oak','sand','rocky','basswood']);
const shuttleDay=new Set(['stockton']);
const shuttleOvernight=new Set(['stockton','oak']);
const tourDay=new Set(['raspberry','michigan']);
let lastBrief='';
const pad=n=>String(n).padStart(2,'0');
const today=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());};
const dayDifference=(d0,d1)=>Math.round((Date.parse(d0+'T12:00:00Z')-Date.parse(d1+'T12:00:00Z'))/86400000);
const SOURCE_SEASON_END='2026-08-30';
function refreshSourceDesk(){
 const now=today();
 const rows=[...document.querySelectorAll('.ap-source-item')];
 for(const row of rows){
  const type=row.dataset.kind,reviewDue=row.dataset.reviewDue||'';
  const out=row.querySelector('.ap-source-state');
  if(!out)continue;
  row.dataset.expired=(!!reviewDue&&now>reviewDue)?'true':'false';
  if(type==='archived'){
   out.textContent=row.dataset.expired==='true'?'2026 archive · 2027 review overdue':'2026 season archived · future trips unverified';
  }else if(type==='on-demand'){
   out.textContent='Read the official marine forecast before every crossing';
  }else if(row.dataset.expired==='true'){
   out.textContent='Review overdue since '+reviewDue+' · check official source';
  }else{
   out.textContent='Dated review '+row.dataset.reviewed+' · check official source';
  }
 }
}

const makeStep=(title,detail,url,label)=>{
const li=document.createElement('li');const bold=document.createElement('strong');bold.textContent=title+'. ';li.append(bold,document.createTextNode(detail+' '));
if(url&&label){const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label+' ↗';li.append(a);}steps.append(li);
};
const setOutcome=(code,label,description)=>{
output.dataset.outcome=code;status.textContent=label;summary.textContent=description;
};
const arrivalNote=(day,overnight,party)=>{
if(!day){return 'No departure date supplied. No schedule or reservation window has been checked.';}
const interval=dayDifference(day,today());
if(interval<0)return 'Selected date is in the past. Choose a future departure.';
if(interval===0)return 'Selected date is today. This tool cannot check booking availability or same-day marine safety.';
if(!overnight)return 'Departure '+day+'. A selected date does not confirm a water taxi, landing, or seasonal shuttle.';
if(party>=8)return 'Departure '+day+'. Group sites use the annual March lottery process, not the ordinary 30-day individual-site window. Confirm site inventory and rules on Recreation.gov.';
if(interval>30)return 'Departure '+day+'. NPS individual-site reservations ordinarily open within 30 days of arrival; the standard window has not opened for this date.';
return 'Departure '+day+'. You are within the NPS 30-day individual-site reservation window, but this does NOT mean a campsite is available.';
};
function build(){
const key=island.value;
const name=islandNames[key]||'Apostle Islands';
const overnight=visit.value==='overnight',transport=mode.value;
const p=Math.max(1,Math.min(21,Number.parseInt(people.value,10)||1));
people.value=String(p);
const n=Math.max(1,Math.min(14,Number.parseInt(nights.value,10)||1));
nightWrap.hidden=!overnight;
const tripDate=/^\d{4}-\d{2}-\d{2}$/.test(date.value)?date.value:'';
const group=overnight&&p>=8;
let code='planning';
steps.replaceChildren();
heading.textContent=name+' · '+(overnight?n+' night'+(n===1?'':'s'):'day visit')+' · '+p+' traveler'+(p===1?'':'s');
dateNote.textContent=arrivalNote(tripDate,overnight,p);
fee.hidden=!overnight;
fee.textContent=!overnight?'':(group?'NPS published group campsite rate: $30 per site per night, plus a $10 trip reservation fee. ':'NPS published individual campsite rate: $15 per site per night, plus a $10 trip reservation fee. ')+ 'These are the NPS figures reviewed in October 2026, not a live price or fee quote. Transport and other charges are separate.';
if(key==='devils'){
code='closed';
setOutcome(code,'Landing plan blocked','The 2026 NPS construction closure applies to Devils Island’s dock/marina, and its campsites are closed. Do not plan a landing or overnight trip based on a historic trail listing.');
makeStep('Choose a permitted alternative','Consider a viewing-only tour if an authorized operator confirms a safe offshore route, or select another NPS island. Do not approach the closed dock.',source.closures,'NPS closure update');
}else if(overnight&&key==='raspberry'){
code='closed';
setOutcome(code,'Camping plan not supported','Raspberry Island has no designated campsites and is excluded from primitive camping. A lighthouse day trip is a different option.');
makeStep('Change the plan','Select a day lighthouse excursion or an island with NPS-designated campsites.',source.camping,'NPS camping');
}else if(group&&!groupIslands.has(key)){
code='unsupported';
setOutcome(code,'No qualifying group campsite in this inventory','Groups of 8–21 must use designated group campsites. NPS lists group sites on Stockton, Oak, Sand, Basswood and Rocky, not this selected island.');
makeStep('Choose a group-site island','Use the NPS campsite directory and group lottery instructions before committing to water transport.',source.permit,'Group permit rules');
}else if(transport==='none'){
code='unsupported';
setOutcome(code,'No land-only access to this island','These National Lakeshore islands have no road or bridge connection. Without suitable water transport, you cannot plan to land. Visit Meyers Beach on the mainland or consider the separate Madeline Island ferry.');
makeStep('Change the arrival plan','Compare an authorized water taxi or a scheduled island excursion, or choose the mainland shoreline.',source.taxis,'NPS-authorized operators');
}else if(transport==='scheduled'){
const supported=overnight?shuttleOvernight.has(key):(shuttleDay.has(key)||tourDay.has(key));
if(!supported){
code='unsupported';
setOutcome(code,'No verified scheduled service for this trip','The NPS concessioner lists regular shuttles to Stockton and Oak, but not this island/visit combination. This is not a proof that no private transport exists.');
makeStep('Arrange a different arrival','Check NPS-authorized water taxis for this island, including an explicit pickup and landing agreement.',source.taxis,'Operator directory');
}else if(tourDay.has(key)&&!overnight){
code='conditional';
setOutcome(code,'Published lighthouse tour · landing not confirmed','A historic lighthouse trip is advertised, but a viewing cruise is not necessarily an island landing. Confirm your selected tour stops ashore and permits time on the island.');
makeStep('Confirm the landing','Ask the operator about the chosen date, actual island stop, lighthouse access, and passenger return.',source.lighthouse,'Tour schedules');
}else{
code='conditional';
setOutcome(code,today()>SOURCE_SEASON_END?'Archive only · next season unverified':'Seasonal shuttle listed · date unverified',key==='oak'?'The concessioner publishes an Oak Island overnight shuttle, not a regular Oak same-day hiking service.':'The concessioner publishes Stockton Island '+(overnight?'overnight camping':'day-hiking')+' shuttle service. The reviewed 2026 season has ended. Future schedules and ticket availability are unverified.');
makeStep('Reserve both ways','Verify seasonal operating dates and buy outbound AND return transportation; return trips are separate booking decisions.',source.shuttles,'Shuttle operator');
}
}else if(transport==='taxi'){
code='conditional';
setOutcome(code,'Water taxi must be arranged','NPS lists authorized water-taxi operators, but this planner has not checked whether any operator serves this exact island, dock or date. Get an explicit return pickup plan.');
makeStep('Arrange an authorized pickup','Confirm service to the selected public landing, passenger count, dock access, return pickup, weather cancellation and fees.',source.taxis,'NPS-listed water taxis');
}else if(transport==='own'){
code='conditional';
setOutcome(code,'Private-boat access requires separate verification','A documented public dock is not a guaranteed berth. Lake Superior fog, waves, lake levels and dock restrictions can make the intended landing impractical.');
makeStep('Plan marine navigation','Verify your vessel, official charts, current dock restrictions, dock priorities, anchoring alternatives and fuel. Do not use the map pins as navigation waypoints.',source.docks,'NPS boating guidance');
}
if(overnight&&code!=='closed'){
makeStep(group?'Reserve a group campsite':'Reserve an eligible campsite',group?'Group sites for 8–21 people follow a March lottery; use a designated group site and confirm the current calendar year.':'NPS individual and primitive reservations ordinarily open within 30 days; the email confirmation is not the official camping permit.',source.permit,'NPS permits');
makeStep('Carry your real permit','NPS says print your permit within seven days of arrival or obtain it in person at the Bayfield Visitor Center. Transport tickets do not include it.',source.permit,'Printing instructions');
}else if(!overnight&&key!=='devils'){
makeStep('Check landing and activity','Check the official dock listing and island trail information. A sightseeing cruise might not disembark.',source.docks,'Public docks');
}
if(code!=='closed'){
makeStep('Inspect current closures','Check island-specific NPS alerts, construction notices and any trail or campsite access changes. Historic documents are not current openings.',source.conditions,'NPS alerts');
makeStep('Keep a weather-flexible return','Check NWS marine forecasts and coordinate directly with the operator or captain. Bad conditions can delay or cancel a crossing.',source.marine,'NWS marine forecast');
}
if(tripDate&&dayDifference(tripDate,today())<0){dateNote.textContent+=' The plan cannot be treated as a future trip.';}
if(tripDate&&Number(tripDate.slice(0,4))>2026&&transport==='scheduled'){dateNote.textContent+=' A future-season operator schedule has NOT been verified.';}
lastBrief=[
'Apostle Islands trip logistics — research reviewed October 27, 2026',
heading.textContent,'Travel date: '+(tripDate||'not selected'),'Transport: '+mode.selectedOptions[0].text,
'Status: '+status.textContent,summary.textContent,dateNote.textContent,
...([...steps.children].map((n,i)=>(i+1)+'. '+n.textContent)),
'Official source: '+source.conditions,'NPS permit rules: '+source.permit,
'Marine forecast: '+source.marine,'No ticket, landing, campsite or safe passage has been confirmed.'
].join('\n');
copy.disabled=false;
copied.textContent='';
}
form.addEventListener('submit',e=>{e.preventDefault();build();});
form.addEventListener('change',build);
for(const control of [people,date])control.addEventListener('input',()=>{if(control===date)build();});
document.querySelectorAll('a[href="#trip-readiness"]').forEach(a=>a.addEventListener('click',()=>{}));
document.querySelectorAll('.island-card').forEach(card=>{
const id=card.dataset.islandId;
if(!islandNames[id])return;
const container=card.querySelector('.island-actions');
if(!container||container.querySelector('.island-plan-link'))return;
const link=document.createElement('a');
link.href='#trip-readiness';link.className='island-plan-link';link.textContent='Build a trip brief ↓';
link.addEventListener('click',()=>{island.value=id;build();});
container.append(link);
});
copy.addEventListener('click',async()=>{
if(!lastBrief)return;
try{if(!navigator.clipboard?.writeText)throw Error('unavailable');await navigator.clipboard.writeText(lastBrief);copied.textContent='Trip brief copied. Confirm details with NPS and your operator.';}
catch{copied.textContent='Clipboard unavailable. The steps above remain available to select and copy.';}
});
refreshSourceDesk();
build();
})();
