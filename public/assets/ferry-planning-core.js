/* Pure trip arithmetic. No schedules, inventory, live traffic or vessel tracking. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.FerryPlanning=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 const inRange=(d,a,b)=>d>=a&&d<=b;
 const number=(v,min=0,max=1440)=>Math.max(min,Math.min(max,Number(v)||0));
 function routeFor(c,id,date,vehicle=0,direction='outward'){
  const x=c.experience;let r=JSON.parse(JSON.stringify(x.routes.find(r=>r.id===id)||x.routes[0]));
  if(r.peakMinutes&&inRange(date,'2026-06-19','2026-09-07'))r.minutes=r.peakMinutes;
  if(r.seasonalGateway&&date.slice(0,4)==='2026'&&date>='2026-07-29')r.a={name:'Kingsville',lat:42.028,lon:-82.739,address:'25 Dock Road, Kingsville, Ontario',zone:'America/Detroit'};
  if(c.id==='beaver'&&Number(vehicle)>0){r.buffer=90;r.bufferKind='operator';}
  if(direction==='reverse'&&r.reverse)[r.a,r.b]=[r.b,r.a];
  return r;
 }
 function availability(c,date,r){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||(!Number.isFinite(Date.parse(date+'T12:00:00Z'))||new Date(date+'T12:00:00Z').toISOString().slice(0,10)!==date))return {state:'unknown',title:'Choose a valid travel date',text:'The plan needs a calendar date.'};
  if(c.id==='manitou')return date.slice(0,4)==='2026'?{state:'closed',title:'No regular ferry service in 2026',text:'Both Manitou docks are under construction. Do not use this plan as a sailing or fare offer.'}:{state:'unknown',title:'Ferry restart not confirmed here',text:'NPS expects dock and village reopening in 2027. Confirm a new operator schedule and access notice before planning a ferry departure.'};
  if(date.slice(0,4)!=='2026')return {state:'unknown',title:'A new operator calendar is needed',text:'This planner has 2026 references only. Another year’s season, fares and sailings are unverified.'};
  if(c.season&&!inRange(date,...c.season))return {state:'closed',title:'Outside the published ferry season',text:'The selected date falls outside the operator’s 2026 reference season. Check for a newly published calendar before traveling.'};
  if(c.id==='pelee'&&!inRange(date,'2026-04-01','2026-12-07'))return {state:'closed',title:'Outside the 2026 ferry season',text:'Winter air service is a separate transport option; no ferry departure is offered here.'};
  if(c.id==='toronto'&&r.seasonal&&(date>='2026-10-14'||date<='2026-04-15'))return {state:'closed',title:'This island dock has no winter ferry in this reference',text:'Use Ward’s Island for the published winter operation, and check the city timetable. Do not assume a summer route is running.'};
  return {state:'reference',title:'Check your exact sailing with the operator',text:'A date inside a reference season does not confirm a departure, available seat, vehicle space or today’s operation.'};
 }
 function localInstant(date,time,zone){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))return null;
  const [y,m,d]=date.split('-').map(Number),[h,min]=time.split(':').map(Number);const target=Date.UTC(y,m-1,d,h,min);
  const check=new Date(target);if(check.getUTCFullYear()!==y||check.getUTCMonth()!==m-1||check.getUTCDate()!==d)return null;
  const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});let instant=target;
  for(let i=0;i<4;i++){const p=Object.fromEntries(formatter.formatToParts(new Date(instant)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));const local=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute);const offset=target-local;instant+=offset;if(!offset)return instant;}
  return null;
 }
 function tripPlan(c,input){
  const r=routeFor(c,input.route,input.date,input.vehicle,input.direction),a=availability(c,input.date,r),buffer=r.buffer+number(input.margin,0,240),unload=number(input.unload,0,180),drive=input.drive===''||input.drive==null?null:number(input.drive,0,1440);
  const p={route:r,availability:a,buffer,unload,drive,totalMinutes:(drive||0)+buffer+r.minutes+unload,events:[],warnings:[]};
  if(a.state!=='reference')return p;
  const departure=localInstant(input.date,input.departure,r.a.zone);if(departure==null)return p;
  p.departure=departure;p.arrival=departure+r.minutes*60000;p.ready=p.arrival+unload*60000;p.checkin=departure-buffer*60000;
  if(drive!=null)p.events.push({name:'Leave for the departure port',instant:p.checkin-drive*60000,zone:r.a.zone,detail:'Your drive estimate; no live traffic.'});
  p.events.push({name:'Be at the departure terminal',instant:p.checkin,zone:r.a.zone,detail:`${r.buffer} min ${r.bufferKind==='operator'?'operator check-in minimum':'planning allowance'} + ${number(input.margin,0,240)} min extra margin.`},{name:'Outward sailing you entered',instant:departure,zone:r.a.zone,detail:r.a.name},{name:'Estimated arrival',instant:p.arrival,zone:r.b.zone,detail:`${r.minutes} min approximate crossing. ${r.historical?'Historical duration.':''}`},{name:'Ready to leave the arrival terminal',instant:p.ready,zone:r.b.zone,detail:`Your ${unload}-minute unloading / exit allowance.`});
  if(input.tripType==='oneway')return p;
  if(input.returnTime){
   const returnDate=input.returnDate||input.date,returnRoute={...r,a:r.b,b:r.a};
   const returnAvailability=availability(c,returnDate,returnRoute);
   if(returnAvailability.state!=='reference'){p.warnings.push('The return date is outside the supported season or year. Confirm a real return sailing before treating this as a round trip.');return p;}
   const ret=localInstant(returnDate,input.returnTime,r.b.zone);if(ret==null){p.warnings.push('Enter a valid return date and time.');return p;}
   if(ret<=p.arrival){p.warnings.push('The return you entered leaves before the outward arrival. Check both dates and each port’s local time.');return p;}
   const sameDate=(input.returnDate||input.date)===input.date;
   if(r.sameDay===false&&sameDate){p.warnings.push('This boat or itinerary does not support the same-day round trip modeled here. Choose separate travel dates and verify the complete operator itinerary.');return p;}
   const returnCheck=ret-buffer*60000;p.returnDeparture=ret;p.ashoreMinutes=Math.floor((returnCheck-p.ready)/60000);
   p.events.push({name:'Back at the return terminal',instant:returnCheck,zone:r.b.zone,detail:`Includes the same ${buffer}-minute planning/check-in allowance; verify the return-port rule.`},{name:'Return sailing you entered',instant:ret,zone:r.b.zone,detail:r.b.name},{name:'Estimated return arrival',instant:ret+r.minutes*60000,zone:r.a.zone,detail:'Uses the same approximate crossing duration.'});
   if(p.ashoreMinutes<=0)p.warnings.push('There is no usable time between unloading and the return check-in. Choose different sailings or an overnight visit.');
   else if(sameDate&&p.ashoreMinutes<120)p.warnings.push('This leaves less than two hours after terminal allowances. Consider whether the trip is worth that short a visit.');
  }
  return p;
 }
 function fare(c,o,date,adults,kids,vehicle,roundtrip){
  const r=c.experience.routes.find(r=>r.id===o?.id)||c.experience.routes[0];if(availability(c,date,r).state!=='reference'||!o?.pricing||date.slice(0,4)!=='2026'||(vehicle&&o.noVehicle))return null;
  if((o.priceStart&&date<o.priceStart)||(o.priceEnd&&date>o.priceEnd))return null;
  let t=o.pricing;if((o.id==='badger'||o.id==='chi')&&inRange(date,'2026-06-19','2026-09-07'))t=o.summerPricing||t;
  if(c.id==='toronto'&&inRange(date,'2026-08-01','2026-08-31'))t={...t,childRT:0};
  const s=roundtrip?'RT':'OW';adults=number(adults,1,20);kids=number(kids,0,20);vehicle=number(vehicle,0,1);
  if(t['adult'+s]==null||(kids&&t['child'+s]==null)||(vehicle&&t['vehicle'+s]==null))return null;
  const passengers=adults*t['adult'+s]+kids*(t['child'+s]||0),car=vehicle*(t['vehicle'+s]||0),fees=(adults+kids)*(t['feePerson'+s]||0)+vehicle*(t['feeVehicle'+s]||0);
  return {passengers,vehicle:car,fees,total:Math.round((passengers+car+fees)*100)/100};
 }
 return {routeFor,availability,localInstant,tripPlan,fare};
});
