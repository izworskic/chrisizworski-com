'use strict';
(function(){
 const M=window.UtahSki;if(!M)return;const $=id=>document.getElementById(id);
 const names={alta:'Alta',snowbird:'Snowbird',brighton:'Brighton',solitude:'Solitude'};
 const sources={alta:'https://www.alta.com/getting-here/parking-info',snowbird:'https://www.snowbird.com/the-mountain/parking/parking-overview/',brighton:'https://www.brightonresort.com/getting-here-and-parking',solitude:'https://www.solitudemountain.com/discover-solitude/getting-here-parking'};
 const messages={
  CANYON_CLOSED:'Do not enter during a canyon-wide closure. Verify the official UDOT notice.',
  UPHILL_RESTRICTION_NO_DOCUMENTED_EXCEPTION:'An uphill restriction is reported; do not assume ordinary access.',
  LOT_CLOSED:'The modeled lot does not admit your chosen early arrival.',
  RESORT_ADMISSION_BLOCKED:'Your selected pass, blackout dates, or remaining days do not support this resort.',
  PARKING_RESERVATION_REQUIRED:'You need a parking reservation on this date and arrival time.',
  UPHILL_EXCEPTION_MAY_APPLY:'Exceptions can exist; verify whether your documents qualify at the UDOT checkpoint.',
  ALTA_BYPASS_RESTRICTION_VERIFY:'Partial upper-canyon restriction: verify whether it affects your resort.',
  TRACTION_COMPLIANCE_UNVERIFIED:'Traction restrictions are reported. Verify vehicle and tire requirements directly with UDOT.',
  TRANSIT_ROUTE_IMPACT_UNVERIFIED:'Confirm bus or shuttle service during traction restrictions.',
  ROAD_REVIEW_REQUIRED:'An ambiguous or stale hazard requires checking the official UDOT notice.',
  ROAD_NOT_CONFIRMED_OPEN:'The road is not confirmed open. Check UDOT before departure.',
  PARKING_RULE_OR_BOOKING_UNVERIFIED:'Confirm the correct lot, reservation requirement and any existing booking.',
  ADMISSION_NOT_VERIFIED:'Pass ownership, ticket and remaining visits are not verified.',
  TRANSIT_SERVICE_AND_BOARDING_UNVERIFIED:'Verify actual ski bus or shuttle service, stops and boarding.',
  PARKING_CAPACITY_UNKNOWN:'No live parking inventory is connected. Space is not guaranteed.'
 };
 const roadNames={CLOSED:'Closure signal — verify with UDOT',UPHILL_RESTRICTED:'Uphill restriction reported',
 PARTIAL_UPHILL_RESTRICTION:'Partial uphill restriction',TRACTION_RESTRICTION:'Traction law signal',
 REVIEW_REQUIRED:'Ambiguous or stale notice',NO_CONFIRMED_BLOCKER:'No blocker detected; not confirmed open',UNKNOWN:'Unverified — check UDOT'};
 let roads={};
 function num(id){const v=$(id).value;return v===''?undefined:Number(v)}
 function parking(resort){const v=$('parking-'+resort).value;return v==='yes'?true:v==='no'?false:undefined}
 function plan(){return {date:$('date').value,hour:Number($('hour').value),travelMode:$('mode').value,
 passengers:Number($('people').value),pass:$('pass').value,
 combinedAltaSnowbirdUsed:num('alta-used'),snowbirdUsed:num('snowbird-used'),brightonUsed:num('brighton-used'),
 parkingReservations:Object.fromEntries(Object.keys(names).map(k=>[k,parking(k)])),roads};}
 function create(tag,klass,txt){const n=document.createElement(tag);if(klass)n.className=klass;if(txt!==undefined)n.textContent=txt;return n;}
 function section(parent,title,items){if(!items.length)return;parent.append(create('h4',null,title));const ul=create('ul');
 for(const item of items)ul.append(create('li',null,messages[item.code]||item.action||'Verify with the official source.'));
 parent.append(ul);}
 function render(){
 const input=plan();if(!input.date)return;let results;try{results=M.compare(input,new Date())}catch(_){return}
 const container=$('cards');container.replaceChildren();
 for(const result of results){
  const card=create('article','resort'),head=create('div','resort-head'),body=create('div','resort-content');
  head.append(create('h3',null,names[result.resort]));
  const label=result.verdict==='TRIP_NOT_FEASIBLE_AS_PLANNED'?'Not feasible as planned':result.verdict==='ACTION_REQUIRED'?'Action required':'Verify before departure';
  head.append(create('div','status'+(result.verdict==='TRIP_NOT_FEASIBLE_AS_PLANNED'?' blocked':''),label));card.append(head);
  body.append(create('p',null,(result.canyon==='SR210'?'Little':'Big')+' Cottonwood · Road: '+result.road.status.replaceAll('_',' ').toLowerCase()));
  body.append(create('p',null,'Pass: '+result.admission.status.replaceAll('_',' ').toLowerCase()));
  body.append(create('p',null,'Parking: '+result.parking.status.replaceAll('_',' ').toLowerCase()));
  if(Number.isFinite(result.parking.publishedStandardPriceUSD)){
   body.append(create('p',null,'Published standard parking: $'+result.parking.publishedStandardPriceUSD+' per vehicle (varies by lot and products)'));}
  section(body,'Cannot proceed as planned',result.blockers);
  section(body,'Do before travel',result.actions);
  section(body,'Still requires proof',result.unknowns);
  const links=create('div','links');
  const a=create('a',null,'Official resort rules ↗');a.href=sources[result.resort];a.target='_blank';a.rel='noopener noreferrer';
  const u=create('a',null,'UDOT canyon status ↗');u.href='https://cottonwoodcanyons.udot.utah.gov/';u.target='_blank';u.rel='noopener noreferrer';
  links.append(a,u);body.append(links);card.append(body);container.append(card);
 }
 }
 function status(route,id){$(id).textContent=roads[route]?(roadNames[roads[route].status]||'Verify with UDOT'):'Unverified — check UDOT';}
 async function refresh(){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);
  try{
   const response=await fetch('/api/utah-ski-validation',{signal:controller.signal,credentials:'same-origin',cache:'no-store'});
   if(!response.ok)throw Error('unavailable');const snapshot=await response.json();
   if(!snapshot?.canyons||!snapshot?.apiCoverage)throw Error('invalid');
   const when=snapshot.observedAt;roads=Object.fromEntries(Object.entries(snapshot.canyons).map(([k,v])=>[k,{status:v.status,reason:v.reason,observedAt:when}]));
   const unavailable=Object.entries(snapshot.apiCoverage).filter(([,v])=>v!=='RECEIVED').map(([k,v])=>k+': '+v);
   $('observed').textContent=(unavailable.length?'Some feeds are unavailable ('+unavailable.join(', ')+'). ':'UDOT feeds received. ')+
     'Checked '+new Date(when).toLocaleString()+'. This does not verify an open road. Check official UDOT before departure.';
  }catch(_){$('observed').textContent='The UDOT developer-feed validation is unavailable. Road access remains unverified. Check official Cottonwood Canyon notices before attempting either route.';}
  finally{clearTimeout(timer)}status('SR190','sr190');status('SR210','sr210');render();
 }
 const local=new Intl.DateTimeFormat('en-US',{timeZone:'America/Denver',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const o=Object.fromEntries(local.map(p=>[p.type,p.value]));let date=o.year+'-'+o.month+'-'+o.day;
 if(date<'2026-11-01')date='2026-12-19';if(date>'2027-05-31')date='2027-01-09';
 $('date').value=date;
 $('trip-form').addEventListener('submit',e=>{e.preventDefault();render();$('cards').scrollIntoView({behavior:'smooth',block:'nearest'});});
 for(const s of $('trip-form').querySelectorAll('select,input'))s.addEventListener('change',render);
 refresh();render();
})();
