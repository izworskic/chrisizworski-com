'use strict';
// Suggested itineraries. No vessel-availability, travel-time or access prediction.
(function(root){
 const PARK='https://www.nwp.usace.army.mil/Missions/Recreation/Columbia-River/';
 const BONNEVILLE='https://www.nwd.usace.army.mil/missions/civil-works/navigation/recreational-lockage/';
 function plan(goal,duration){
  const minutes=[30,90,180].includes(Number(duration))?Number(duration):30;
  if(goal==='ships')return {
   kicker:'Lock-watching · verify before a special trip',
   title:'Make the river the outing; let a passing tow be the bonus.',
   reason:'There is no confirmed public close-up chamber viewpoint at John Day in this guide, and a nearby AIS signal cannot promise a lockage. For a closer look at lock engineering, explore Bonneville’s seasonal lock visitor area and check access for your date.',
   steps:['Open Corps Locks and navigation notices to look for named traffic and outages.','Confirm Bonneville visitor access and hours if you want to see a chamber close up.','If you stay near John Day, choose a public river stop and treat any tow sighting as a bonus—even with '+minutes+' minutes available.'],
   destination:'Bonneville navigation-lock visitor area',query:'Bonneville Navigation Lock Visitor Area Oregon',official:BONNEVILLE};
  const family=goal==='family',long=minutes===180;
  return {
   kicker:family?'Family stop · a river story to discover':'Best fit · river landscape',
   title:long?'Give the rivers time to tell their story at LePage Park.':'Start with the big river view at Giles French Park.',
   reason:long?'A confluence is a meeting of rivers. At LePage Park, make that meeting the heart of a longer outing beside the John Day and Columbia. You will be exploring the river landscape, not looking into the lock chamber. Check seasonal facilities, fees and access before setting out.':'Begin on the Oregon side near John Day Dam. Take in the broad river, look for passing traffic, and use the dam’s scale to imagine the water lift you explored here. This park is a river stop, not a confirmed close-up chamber viewpoint.',
   steps:[long?'Check Recreation.gov for LePage Park facilities and seasonal availability.':'Check the Corps recreation page for access changes before leaving I-84.',
    family?'Try the lock demonstration together before arriving. At the river, look for the dam, moving water and any passing tow from permitted public areas.':long?'Allow time to watch the confluence and the river landscape from public areas.':'Navigate to Giles French Park near Rufus, rather than an operational dam entrance.',
    minutes===30?'Take in the river first. Do not spend the whole visit waiting for a vessel; a short scenery stop can be rewarding on its own.':minutes===90?'Use the extra time to look for river traffic with binoculars and explore the engineering story. There is no promised ship arrival.':'If you also want a dam-area stop, consider Giles French separately after checking access; driving time is outside this suggested time budget.'],
   destination:long?'LePage Park':'Giles French Park',query:long?'LePage Park Rufus Oregon':'Giles French Park Rufus Oregon',official:long?'https://www.recreation.gov/camping/campgrounds/233536':PARK};
 }
 if(typeof module==='object'&&module.exports)module.exports={plan};
 if(!root.document)return;
 const $=id=>root.document.getElementById(id);
 function render(){const p=plan($('visitGoal').value,$('visitDuration').value);
  for(const [id,key] of [['visitKicker','kicker'],['visitVerdict','title'],['visitReason','reason']])$(id).textContent=p[key];
  $('visitSteps').replaceChildren(...p.steps.map(s=>{const li=document.createElement('li');li.textContent=s;return li}));
  $('visitDirections').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.query);
  $('visitDirections').textContent='Directions to '+p.destination+' ↗';
  $('visitOfficial').href=p.official;$('visitOfficial').textContent=p.destination.startsWith('Bonneville')?'Check official visitor access ↗':'Check official park access ↗';
 }
 $('visitGoal').addEventListener('change',render);$('visitDuration').addEventListener('change',render);render();
})(typeof window==='object'?window:globalThis);
