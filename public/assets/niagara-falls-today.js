(function(){
'use strict';
var form=document.getElementById('plan-form'),body=document.getElementById('result-body'),status=document.getElementById('status'),button=document.getElementById('go'),requestSeq=0,presetPending=false,activePreset='standard';
function todayEastern(){var parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(Date.now()+3600000));var o={};parts.forEach(function(p){o[p.type]=p.value;});return{date:o.year+'-'+o.month+'-'+o.day,hour:Number(o.hour)};}
var t=todayEastern();document.getElementById('date').value=t.date;document.getElementById('time').value=String(t.hour).padStart(2,'0')+':00';
function emit(name,dimensions){try{
 var fields=Object.assign({page_id:'niagara-falls-today'},dimensions||{});
 if(typeof window.gtag==='function')window.gtag('event',name,fields);
 if(typeof window.va==='function')window.va('event',Object.assign({name:name},fields));
}catch(e){}}
function safe(s){return String(s===null||s===undefined?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function link(url,label){return '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+' ↗</a>';}
function explain(reason){
 return {PUBLISHED_CLOSED:'Operator-published closure for this date',HOURS_NOT_VERIFIED:'Date-specific operator hours cannot be verified',ACCESS_ROUTE_UNVERIFIED:'Full step-free accessibility cannot be confirmed',OVER_BUDGET:'Would exceed your admission budget',PRICE_NOT_VERIFIED:'Cost cannot be verified against your budget',BORDER_NOT_PLANNED:'On the other side of the international border',LOWER_FIT_OR_TIME:'Less suitable for your available time or priorities'}[reason]||reason;
}
function guideFor(id){return window.NiagaraFallsGuide&&window.NiagaraFallsGuide[id]||null;}
function guideIntro(r,stops){
 if(!stops.length)return '';
 var theme=r.priority==='boat'?'You want to get closer to the water. The route only includes a boat if its published hours and your available time allow it.':r.priority==='mist'?'You want to feel the mist. Closeness to the spray depends on wind, season and the stops actually operating.':r.priority==='easy'?'You want a gentler pace, so this visit leaves room to stay with a view instead of hurrying past it.':r.priority==='photos'?'You want to photograph the falls. Each viewpoint below shows a different part of the river, not a repeat of the same shot.':r.priority==='value'?'You prefer good value. Public viewpoints can tell a complete Niagara story without buying an attraction ticket.':r.duration_minutes<=120?'Your visit is short: the goal is to understand one side of Niagara, not cross off a long checklist.':'Follow the river through a changing sequence of viewpoints rather than rushing a checklist.';
 var intro=r.side==='US'?'In New York, you approach the separate waterfalls from park paths beside the river and the gorge.':'In Ontario, you can stand at the curved brink and then step back to see the wider pattern of falls and islands.';
 return '<div class="route-introduction"><span class="index">YOUR NIAGARA FIELD GUIDE</span><h4>Here is how your visit unfolds.</h4><p>'+safe(intro+' '+theme)+'</p></div>';
}
function stopStory(s,prev,r){
 var g=guideFor(s.id);if(!g)return '<p>'+safe(s.description)+'</p>';
 var focus=r.priority==='kids'?'With children: find the line where smooth river becomes white water or look for the islands dividing the falls.':r.priority==='photos'?'For a stronger photograph, show the river and surrounding rock, not only a close crop of white water.':r.priority==='easy'?'Leave room to pause. Walking times and step-free routes have not been independently audited.':r.priority==='value'?'Remember that a free scenic viewpoint and a nearby ticketed activity are different experiences.':'';
 return '<p class="guide-location">'+safe(g.where)+'</p>'+(prev?'<p class="guide-transition">'+safe(g.transition)+'</p>':'')+'<p class="guide-scene">'+safe(g.scene)+'</p><p class="guide-context">'+safe(g.context)+'</p><p class="guide-notice"><strong>Look for this:</strong> '+safe(g.notice)+'</p><p class="guide-notice"><strong>On the ground:</strong> '+safe(g.tip)+'</p>'+(focus?'<p class="guide-focus">'+safe(focus)+'</p>':'');
}
function filmPreview(r,stops){
 if(r.side!=='CA'||!stops.some(function(s){return s.id==='table';}))return '';
 return '<aside class="preview-inline"><span class="index">OPTIONAL FIELD FILM</span><h4>What is behind the falling water?</h4><p>At Table Rock, you see the river at the brink. This Niagara Parks film shows the separate, ticketed Journey Behind the Falls experience within the rock. The footage adds context; <strong>it does not mean paid admission is open or included in your route.</strong></p><button type="button" data-niagara-video="DlMgURteL3E">Play the Niagara Parks film ▶</button><p class="preview-links"><a href="https://www.youtube.com/watch?v=DlMgURteL3E" target="_blank" rel="noopener">Official video on YouTube ↗</a> · <a href="https://www.niagaraparks.com/visit/attractions/journey-behind-the-falls/" target="_blank" rel="noopener">Check operator access ↗</a></p></aside>';
}
function bindGuideVideo(){
 body.querySelectorAll('[data-niagara-video]').forEach(function(button){button.addEventListener('click',function(){
  var id=button.getAttribute('data-niagara-video');if(id!=='DlMgURteL3E')return;
  var frame=document.createElement('iframe');frame.title='Niagara Parks — Journey Behind the Falls';
  frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';
  frame.referrerPolicy='strict-origin-when-cross-origin';frame.allow='autoplay; encrypted-media; picture-in-picture';frame.allowFullscreen=true;
  button.replaceWith(frame);emit('niagara_experience_video_play');
 },{once:true});});
}
function updateSideGuide(r){
 var element=document.getElementById('guide-side');if(!element)return;
 element.textContent=r.side==='US'?'Starting in New York: Prospect Point faces the American Falls; Goat Island approaches Horseshoe Falls at the brink. The route stays in New York and never assumes a border crossing.':'Starting in Ontario: Table Rock brings you toward Horseshoe Falls at the brink, while Queen Victoria Park opens a wider view toward all three waterfalls. The route stays in Ontario and never assumes a border crossing.';
}
function draw(r){
 var stops=r.stops||[],first=stops[0],currency=r.side==='US'?'USD':'CAD';
 var admission=r.costs[0],unknownPrices=!admission.prices_complete;
 var totalLabel=currency+' '+Number(admission.known_admission_total).toFixed(2)+(unknownPrices?' + unknown':'');
 var out='<div class="result-content"><div class="verdict"><span class="label">'+safe(r.confidence)+' CONFIDENCE · '+safe(r.status.replace(/_/g,' '))+'</span><h3>'+safe(r.verdict)+'</h3><p>Published schedules are not live opening confirmations. No invented queues, weather or border delays.</p></div>';
 if(r.visit_style==='short'){
  out+='<p class="quick-intent-confirmation"><strong>Two hours · viewpoints only.</strong> No paid attractions or ticket queues assumed. This remains on the selected side of the border.</p>';
 }else if(r.visit_style==='family'){
  out+='<p class="quick-intent-confirmation"><strong>Family-paced itinerary.</strong> Starts at a free viewpoint, limits the number of paid stops, and caps estimated walking distance. Check the party size in Fine-tune before buying tickets.</p>';
 }
 if(r.boat_resolution){
  var br=r.boat_resolution;
  if(br.included){
   out+='<section class="boat-decision boat-success"><strong>Boat ride included in your plan</strong><p>'+safe(br.boat_name)+' fits your chosen time and published operating window. Bookings, tickets and queues are not confirmed.</p><p class="boat-ticket-action">'+link(r.side==='US'?'https://www.maidofthemist.com/schedule-pricing/':'https://www.cityexperiences.com/niagara/city-cruises/niagara/','Check official boat tickets, prices and departures')+'</p></section>';
  }else{
   out+='<section class="boat-decision boat-missed" role="status"><strong>Boat ride could not fit this visit</strong><p>'+safe(br.reason)+'</p>';
   if(br.published_hours&&br.published_hours.open&&br.published_hours.close)out+='<p>Operator-published hours on this date: '+safe(br.published_hours.open)+'–'+safe(br.published_hours.close)+' Eastern.</p>';
   if(br.next_option){
    var next=br.next_option;
    out+='<button type="button" class="boat-next-button" data-boat-next-date="'+safe(next.visit_date)+'" data-boat-next-time="'+safe(next.arrival_local)+'">Plan a boat trip on '+safe(next.visit_date)+' at '+safe(next.arrival_local)+' →</button><p>This is a published operating window, not a reserved ticket or a real-time boat departure.</p>';
   }else out+='<p>No alternate boat window was verified within the next two days. You can choose another date or check the operator.</p>';
   if(br.operator_url)out+=link(br.operator_url,'Boat operator and tickets');
   out+='<p class="fallback-note">The route below is a <strong>scenic alternative, not a boat itinerary</strong>.</p></section>';
  }
 }
 if(first)out+='<div class="first"><div><small>'+(r.boat_resolution&&!r.boat_resolution.included?'SCENIC BACKUP · NOT A BOAT':'YOUR FIRST ACTION')+'</small><b>'+safe(first.name)+'</b><small>Arrive approximately '+safe(first.arrival)+' Eastern · '+safe(r.visit_local_date)+'</small></div><a class="action" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(first.location)+'" target="_blank" rel="noopener">Open directions ↗</a></div>';
 out+='<div class="stats"><div class="stat"><strong>'+stops.length+'</strong><span>Planned stops</span></div><div class="stat"><strong>'+safe(r.timeline.contingency_minutes)+' min</strong><span>Time buffer</span></div><div class="stat"><strong>'+safe(totalLabel)+'</strong><span>'+(unknownPrices?'Known subtotal · more due':'Known admission subtotal')+'</span></div></div>';
 out+='<div class="sectitle">Your guided route · Eastern local time</div>'+guideIntro(r,stops);
 if(stops.length)stops.forEach(function(s,i){out+='<article class="stop"><div class="when">'+safe(s.arrival)+'–'+safe(s.departure)+' · stop '+(i+1)+'</div><h4>'+safe(s.name)+'</h4>'+stopStory(s,i?stops[i-1]:null,r)+'<div class="meta">'+safe(s.transfer_minutes)+' min estimated transfer · '+safe(s.dwell_minutes)+' min conservative visit · '+(s.type==='paid'?'Paid admission':'Free viewpoint')+'</div><p><span class="flag">'+safe(s.schedule.status.replace(/_/g,' '))+'</span> '+safe(s.schedule.lastAdmission?'Last published ticket cutoff '+s.schedule.lastAdmission:(s.schedule.open&&s.schedule.close?'Published hours '+s.schedule.open+'–'+s.schedule.close+'; confirm admission':'Check park access notices'))+'</p>'+link(s.official_url,'Official attraction information')+'</article>';});
 else out+='<p>There is no safe confirmed stop for this request. Check official park advisories.</p>';
 out+=filmPreview(r,stops);
 if(r.schedule_feed){
  var sf=r.schedule_feed;
  out+='<div class="caveat"><strong>Niagara Parks date-specific calendar:</strong> '+safe(sf.status.replace(/_/g,' '))+'. '+(sf.checked_at?'Published hours retrieved '+safe(new Date(sf.checked_at).toLocaleString('en-US',{timeZone:'America/Toronto',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}))+' Eastern. ':'No current source check available. ')+safe(sf.caveat||'')+' '+link(sf.source_url,'Official hours by date')+'</div>';
 }
 if(r.weather){
  var w=r.weather;
  out+='<div class="caveat"><strong>Official regional weather:</strong> '+safe(w.status.replace(/_/g,' '))+'. '+safe(w.caveat||'')+' '+link(w.authority_url,'Check official weather');
  if(w.alerts&&w.alerts.length){
   out+='<ul class="excluded">';
   w.alerts.slice(0,4).forEach(function(a){out+='<li><strong>'+safe(a.headline)+'</strong> · '+safe(a.severity)+'</li>';});
   out+='</ul>';
  }
  out+='</div>';
 }
 out+='<div class="caveat"><strong>Admission and travel limits:</strong> '+safe(r.unknowns.join(' '))+' Parking and applicable taxes are not included in the subtotal. '+(unknownPrices?'<strong>Some selected attractions have unknown admission prices; do not treat this subtotal as your trip total.</strong>':'')+'</div>';
 if(r.excluded.length){out+='<p class="sectitle">What to skip, and why</p><ul class="excluded">';r.excluded.slice(0,4).forEach(function(x){out+='<li><strong>'+safe(x.name)+':</strong> '+safe(explain(x.reason))+' '+link(x.source,'check source')+'</li>';});out+='</ul>';}
 if(r.alternatives.length){out+='<details class="source-details"><summary>Other feasible sequences</summary><ul>';r.alternatives.forEach(function(a){out+='<li>'+safe(a.label)+'</li>';});out+='</ul></details>';}
 out+='<details class="source-details"><summary>Published source status and limitations</summary><p>'+safe(r.what_changed)+'</p><ul>';r.source_health.forEach(function(x){out+='<li>'+safe(x.entity_id)+' — '+safe(x.status)+': '+safe(x.basis)+' ('+safe(x.reviewed)+') '+link(x.source,'operator')+'</li>';});out+='</ul></details>';
 if(r.visit_local_date==='2026-10-12'&&stops.length){out+='<p class="caveat">Tonight: Niagara Parks schedules a 10:00 p.m. fireworks show, <strong>weather permitting</strong>. It is not a verified live event. '+link('https://www.niagaraparks.com/events/event/niagara-falls-fireworks-series','Official fireworks details')+'</p>';}
 out+='<div class="small-links">'+link(r.links_to_official.border,'Bridge status')+link(r.links_to_official.rainbow,'Rainbow timing')+link(r.side==='US'?r.links_to_official.us:r.links_to_official.ca,'Official operating updates')+'</div></div>';
 body.innerHTML=out;body.setAttribute('aria-busy','false');
 var nextButton=body.querySelector('[data-boat-next-date]');
 if(nextButton)nextButton.addEventListener('click',function(){
  var date=nextButton.getAttribute('data-boat-next-date'),arrival=nextButton.getAttribute('data-boat-next-time');
  if(!/^20[0-9]{2}-[0-9]{2}-[0-9]{2}$/.test(date)||!/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(arrival))return;
  form.elements.visit_date.value=date;form.elements.arrival_local.value=arrival;
  emit('niagara_boat_next_option');submit();
 });
 status.textContent=r.boat_resolution&&!r.boat_resolution.included?'Boat not feasible for the selected window. Review the next-boat option.':'Your same-side visit, field notes and constraints.';
 if(window.NiagaraVisitMap&&typeof window.NiagaraVisitMap.render==='function')window.NiagaraVisitMap.render(r);
 bindGuideVideo();updateSideGuide(r);
 emit(r.boat_resolution&&!r.boat_resolution.included?'niagara_boat_not_feasible':stops.length?'niagara_plan_success':'niagara_plan_no_feasible',{intent:r.priority,side:r.side,stops:stops.length,boat_included:Boolean(r.boat_resolution&&r.boat_resolution.included)});
}
async function submit(ev){if(ev)ev.preventDefault();var thisRequest=++requestSeq;button.disabled=true;body.setAttribute('aria-busy','true');
 var intentLabel=activePreset==='short'?'Finding scenic stops that fit two hours':activePreset==='family'?'Building a family-paced plan':activePreset==='boat'?'Checking boat operating hours and arrival time':'Checking your requested experience';
 status.textContent=intentLabel+'…';
 body.innerHTML='<div class="result-content"><div class="quick-loading" role="status"><strong>'+safe(intentLabel)+'…</strong><p>Checking your date and the requested side. No tickets or live queue positions are assumed.</p></div></div>';
 emit('niagara_plan_submit');
 var d=new FormData(form);var data={visit_date:d.get('visit_date'),arrival_local:d.get('arrival_local'),duration_minutes:d.get('custom_minutes')?Number(d.get('custom_minutes')):Number(d.get('duration_minutes')),starting_side:d.get('starting_side'),arrival_mode:d.get('arrival_mode')||'drive',transport_origin:d.get('transport_origin')||'other',wego_included:d.has('wego_included'),rapidsview_included:d.has('rapidsview_included'),priority:d.get('priority'),trip_style:activePreset,adults:Number(d.get('adults')),youth:Number(d.get('youth')),budget:d.get('budget')===''?null:Number(d.get('budget')),step_free:d.has('step_free'),low_walking:d.has('low_walking')};
 try{var response=await fetch('/api/niagara-falls-today',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});var result=await response.json();if(!response.ok)throw new Error(result.error||'Service unavailable');if(thisRequest!==requestSeq)return;draw(result);if(presetPending){presetPending=false;var answer=document.getElementById('result');if(answer)answer.scrollIntoView({behavior:window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}catch(e){if(thisRequest!==requestSeq)return;body.innerHTML='<div class="result-content"><div class="caveat"><strong>Planner currently unavailable.</strong> '+safe(e.message)+' No opening claim can be made. Check the <a href="https://www.niagarafallsstatepark.com/" target="_blank" rel="noopener">U.S. operator</a> or <a href="https://www.niagaraparks.com/hours-of-operations/" target="_blank" rel="noopener">Canadian hours</a>.</div></div>';body.setAttribute('aria-busy','false');status.textContent='Source check needed.';presetPending=false;emit('niagara_source_degraded');}finally{if(thisRequest===requestSeq)button.disabled=false;}
}
form.addEventListener('submit',submit);
// Measure the decision-to-action funnel, not only form submissions. These
// are non-personal event labels, never visitor dates, addresses or budgets.
body.addEventListener('click',function(event){
 var a=event.target.closest&&event.target.closest('a[href]');
 if(!a)return;
 if(a.closest('.boat-ticket-action'))emit('niagara_official_boat_tickets_click');
 else if(a.classList.contains('action'))emit('niagara_first_stop_directions_click');
});
// Quick starts answer distinct high-intent questions without inventing a boat
// operating window. Keep the existing visit date, country, and source gates.
document.querySelectorAll('[data-niagara-preset]').forEach(function(presetButton){
 presetButton.addEventListener('click',function(){
  var id=presetButton.getAttribute('data-niagara-preset'),priority='views',duration='240';
  if(id==='boat'){priority='boat';duration='240';}
  else if(id==='short'){priority='views';duration='120';}
  else if(id==='family'){priority='kids';duration='360';}
  else return;
  var radio=form.querySelector('input[name="duration_minutes"][value="'+duration+'"]');
  if(radio)radio.checked=true;
  var custom=form.querySelector('[name="custom_minutes"]');if(custom)custom.value='';
  var select=form.querySelector('select[name="priority"]');if(select)select.value=priority;
  activePreset=id;
  if(id==='family'){
   // A usable child-visit example, clearly disclosed and editable. Never infer age.
   var youths=form.querySelector('[name="youth"]');if(youths&&Number(youths.value)===0)youths.value='1';
  }
  document.querySelectorAll('[data-niagara-preset]').forEach(function(b){b.setAttribute('aria-pressed',String(b===presetButton));});
  var note=document.getElementById('quick-start-note');
  if(note)note.textContent=id==='boat'?'Checking your selected side and visit date. Boat ticket availability is not live.':id==='short'?'Planning up to two hours of public viewpoints, without paid attractions.':'Planning a family-paced route. The example assumes at least one child; adjust party size under Fine-tune.';
  emit('niagara_preset_'+id);
  presetPending=true;
  submit();
  // Immediate visible feedback, even if the operator API is slow or fails.
  var answer=document.getElementById('result');if(answer)answer.scrollIntoView({behavior:'auto',block:'start'});
 });
});
// Recalculate when the actual goal changes. The old code listened only to
// duration and country, leaving the Boat preference stuck on an old itinerary.
form.addEventListener('change',function(e){if(e.target&&e.target.name){
 var field=e.target.name;
 if(field==='priority'||field==='duration_minutes'||field==='custom_minutes'){
  activePreset='standard';presetPending=false;
  document.querySelectorAll('[data-niagara-preset]').forEach(function(b){b.setAttribute('aria-pressed','false');});
  var note=document.getElementById('quick-start-note');if(note)note.textContent='';
 }
 emit('niagara_replan');submit();
}});
var hero=document.querySelector('.hero-photo'),img=hero&&hero.querySelector('img');if(img){img.addEventListener('error',function(){hero.classList.add('is-missing');});if(img.complete&&img.naturalWidth===0)hero.classList.add('is-missing');}
emit('niagara_planner_view');submit();
})();
