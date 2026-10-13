/* Pictured Rocks V5: dated tour commitment and ranger-grade itinerary truth gates.
   Published schedules are never ticket inventory or a marine-safety decision.
   Standalone pure API is testable without a browser. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.PicturedRocksV5=api;
  if(root&&root.document)api.mount(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const CRUISE_URL='https://picturedrocks.com/fares-schedule/';
const NPS_KAYAK='https://www.nps.gov/piro/planyourvisit/kayak-tours.htm';
const NPS_SAFETY='https://www.nps.gov/piro/planyourvisit/safety.htm';
const SLOTS=Object.freeze([
  {time:'10:00',type:'Spray Falls'},
  {time:'11:00',type:'Spray Falls'},
  {time:'13:00',type:'Spray Falls'},
  {time:'14:00',type:'Spray Falls'},
  {time:'15:30',type:'Spray Falls'},
  {time:'17:15',type:'Sunset Spray Falls'}
]);
const NOTES={
  minersCastle:['The viewpoint that explains the geology','The upper overlook gives you the sculpted sandstone cliff without committing to a long trail. The lower view uses stairs; avoid treating both as equally accessible.','https://www.nps.gov/places/miners-castle.htm'],
  minersBeach:['Walk beneath the cliff country','Miners Beach trades panoramic cliffs for the scale of the lake itself. It complements Miners Castle; it is not a replacement for a cruise along the main cliff wall.','https://www.nps.gov/places/miners-beach.htm'],
  minersFalls:['The forest before the waterfall','Budget the roughly 1.2-mile return walk and steps to the lower viewing platform. This is not a drive-up waterfall.','https://www.nps.gov/places/miners-falls.htm'],
  chapel:['Let Chapel own the day','The roughly 10.5-mile loop is a long hike with limited parking and no pets on Chapel trails and beaches. Do not tack a fixed boat departure onto it.','https://www.nps.gov/piro/planyourvisit/hikes.htm'],
  hurricane:['The lighthouse is a walk, not a pull-off','Hurricane River is the beach stop. Reaching Au Sable Light extends it into a roughly three-mile return outing; carry time for the walk back.','https://www.nps.gov/places/hurricane-river-beach.htm'],
  sable:['The landscape turns into dunes','Grand Sable is a different Pictured Rocks experience from the colored cliffs near Munising. The sandy trail has no pet access.','https://www.nps.gov/places/grand-sable-dunes-trail.htm'],
  cruise:['The cliffs face the water','On the Spray Falls route, the fast catamaran continues past the main cliffs toward Spray Falls. The operator—not a shore forecast—decides whether it sails.','https://picturedrocks.com/fares-schedule/'],
  kayak:['Stay within an authorized guided departure','Lake Superior is cold and exposed. Only trained sea kayakers with appropriate equipment should go independently; a guided tour is the better choice for most visitors.','https://www.nps.gov/piro/planyourvisit/kayaking-boating.htm']
};
function todayDetroit(now=new Date()){
  const p=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
  const get=k=>p.find(x=>x.type===k).value;
  return get('year')+'-'+get('month')+'-'+get('day');
}
function validDate(s){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s||''))return false;
  const d=new Date(s+'T12:00:00Z');
  return !Number.isNaN(+d)&&d.toISOString().slice(0,10)===s;
}
function cruiseTruth(date,today=todayDetroit()){
  if(!validDate(date))return {code:'DATE_REQUIRED',slots:[],label:'Choose a valid visit date'};
  if(date<today)return {code:'PAST_DATE',slots:[],label:'That date has passed. Choose a future date.'};
  if(date>='2026-10-12'&&date<='2026-10-18')return {
    code:'PUBLISHED_NOT_BOOKED',slots:SLOTS.map(x=>({...x})),
    label:'Published Oct 12–18, 2026 departure pattern — NOT seat availability',
    source:CRUISE_URL,sourceChecked:'2026-10-13'
  };
  if(date>'2026-10-18'&&date<'2027-01-01')return {
    code:'SEASON_ENDED',slots:[],
    label:'The published 2026 cruise season ends October 18. Do not schedule a boat afterward.',
    source:CRUISE_URL
  };
  return {code:'TIMETABLE_UNVERIFIED',slots:[],
    label:'No verified date-specific published departure list. Check the operator directly; no seats or times are assumed.',
    source:CRUISE_URL};
}
function formatTime(v){
  const match=/^(\d{2}):(\d{2})$/.exec(v||'');
  if(!match)return 'Time not selected';
  const h=Number(match[1]),m=Number(match[2]);
  return ((h+11)%12+1)+':'+String(m).padStart(2,'0')+(h>=12?' PM':' AM');
}
function shiftTime(v,minutes){
  if(!/^\d{2}:\d{2}$/.test(v||''))return '';
  const parts=v.split(':').map(Number),t=parts[0]*60+parts[1]+minutes;
  if(t<0||t>=1440)return '';
  return String(Math.floor(t/60)).padStart(2,'0')+':'+String(t%60).padStart(2,'0');
}
function commitment(date,departure,today=todayDetroit()){
  const truth=cruiseTruth(date,today);
  const slot=truth.slots.find(x=>x.time===departure)||null;
  if(truth.code!=='PUBLISHED_NOT_BOOKED')return {code:truth.code,truth,slot:null};
  if(!slot)return {code:'DEPARTURE_NEEDED',truth,slot:null};
  return {code:'SCHEDULE_SELECTED_NOT_BOOKED',truth,slot,
    checkIn:shiftTime(slot.time,-45),returnEstimate:shiftTime(slot.time,120),
    adultFare:56,childFare:19,infantFare:1};
}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function mount(doc){
  const $=id=>doc.getElementById(id),form=$('tripForm'),result=$('result');
  if(!form||!result||!$('tripDate')||!$('tourDeparture'))return;
  const date=$('tripDate'),time=$('tourDeparture'),state=$('v5ScheduleState');
  if(!date.value)date.value=todayDetroit();
  date.min=todayDetroit();
  const sourceLink='<a href="'+CRUISE_URL+'" target="_blank" rel="noopener">Official schedule and ticket booking ↗</a>';
  let busy=false,initialized=false;
  function refreshSlots(){
    const previous=time.value,truth=cruiseTruth(date.value);
    time.innerHTML='<option value="">'+(truth.code==='PUBLISHED_NOT_BOOKED'?'Choose a published departure (not a booking)':'No verified departure for this date')+'</option>';
    truth.slots.forEach(slot=>{
      const o=doc.createElement('option');o.value=slot.time;
      o.textContent=formatTime(slot.time)+' · '+slot.type+' · 2 hours · $56 adult (2026)';
      time.appendChild(o);
    });
    if(truth.slots.some(x=>x.time===previous))time.value=previous;
    time.disabled=truth.slots.length===0;
    state.textContent=truth.label+' · '+(truth.sourceChecked?'Source reviewed Oct 13, 2026. ':'')+'Operator availability and weather remain unverified.';
    state.dataset.state=truth.code;
  }
  function showPanel(html){
    let box=$('v5Commitment');
    if(!box){box=doc.createElement('section');box.id='v5Commitment';box.className='v5-commitment';box.setAttribute('aria-label','Trip commitment and source checks');result.insertBefore(box,result.querySelector('.action-row'));}
    box.innerHTML=html;
  }
  function notes(ids){
    let box=$('v5PlaceRead');
    if(!box){box=doc.createElement('section');box.id='v5PlaceRead';box.className='v5-places';result.insertBefore(box,result.querySelector('.action-row'));}
    const unique=[...new Set(ids.filter(x=>NOTES[x]))].slice(0,3);
    box.hidden=!unique.length;
    box.innerHTML='<p class="eyebrow">Why these stops earned their place</p><div class="v5-place-grid">'+unique.map(id=>{
      const n=NOTES[id];
      return '<article><h3>'+safe(n[0])+'</h3><p>'+safe(n[1])+'</p><a href="'+safe(n[2])+'" target="_blank" rel="noopener">Check source ↗</a></article>';
    }).join('')+'</div>';
  }
  function updateResult(){
    if(busy||result.hidden)return;
    busy=true;
    try{
      const cruiseRow=[...$('timeline').querySelectorAll('.stop')].find(s=>s.querySelector('h3')?.textContent.includes('Pictured Rocks boat cruise'));
      const kayakRow=[...$('timeline').querySelectorAll('.stop')].find(s=>s.querySelector('h3')?.textContent.includes('Authorized guided kayak tour'));
      const ids=[...$('timeline').querySelectorAll('.stop h3')].map(h=>Object.entries(window.PicturedRocksPlannerEngine?.PLACES||{}).find(([,p])=>p.title===h.textContent)?.[0]).filter(Boolean);
      notes(ids);
      const value=commitment(date.value,time.value);
      const dateHuman=validDate(date.value)?new Date(date.value+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'}):'Unverified date';
      const heading='<p class="eyebrow">V5 · Verify before you commit</p>';
      if(cruiseRow){
        const clock=cruiseRow.querySelector('.stop-time');
        const description=cruiseRow.querySelector('.meta');
        if(value.code==='SCHEDULE_SELECTED_NOT_BOOKED'){
          clock.textContent=formatTime(value.slot.time)+' · operator-published';
          description.textContent='Arrive 30–45 minutes early (aim '+formatTime(value.checkIn)+'); cruise ~2 hours; return about '+formatTime(value.returnEstimate)+' if operated. NOT a ticket or confirmed departure.';
          if(value.slot.time>='15:30'){
            const after=Array.from(cruiseRow.parentNode.children).slice(Array.from(cruiseRow.parentNode.children).indexOf(cruiseRow)+1);
            after.forEach(s=>{const label=s.querySelector('.stop-time');if(label)label.textContent='Optional only — daylight and operating time';});
          }else{
            const next=cruiseRow.nextElementSibling;
            if(next?.classList.contains('stop')){const label=next.querySelector('.stop-time');if(label)label.textContent='After cruise · flexible stop';}
          }
          showPanel(heading+'<h3>Published '+safe(dateHuman)+' · '+safe(formatTime(value.slot.time))+' Spray Falls cruise</h3><p class="v5-note">The selected time is on the operator’s published schedule, <strong>not</strong> live seat inventory or a reservation. Depart from 100 City Park Drive, Munising. Plan 30–45 minutes for arrival/check-in; confirm boarding instructions directly.</p><div class="v5-metrics"><span>Duration <strong>~2 hours</strong></span><span>2026 adult fare <strong>$56</strong></span><span>Age 4–12 <strong>$19</strong></span><span>Under 4 <strong>$1</strong></span></div><p>Verify the actual departure, seats, and weather before finalizing the land stops. '+sourceLink+'</p>');
          $('fitBadge').textContent='Scheduled example · not booked';
        }else{
          clock.textContent='No confirmed departure';
          description.textContent='This is a conditional water activity, not a usable fixed-time itinerary until an operator date and departure are verified.';
          const label=value.code==='DEPARTURE_NEEDED'?'Choose a published time above before putting the boat on your itinerary.':value.truth.label;
          showPanel(heading+'<h3>Water plan is not ready to book</h3><p>'+safe(label)+'</p><p class="v5-note">Land-first backup: Miners Castle, Miners Beach and Sand Point (subject to current NPS access). Do not drive to Munising for an unverified sailing.</p>'+sourceLink);
          $('fitBadge').textContent='Needs cruise confirmation';
        }
      }else if(kayakRow){
        const clock=kayakRow.querySelector('.stop-time');if(clock)clock.textContent='Guide sets departure';
        showPanel(heading+'<h3>Guided kayak: confirm the operator and marine window</h3><p>No kayak departure time or guide availability can be verified from this planner. Only experienced sea kayakers with proper equipment should consider independent Lake Superior paddling; avoid recreational kayaks and canoes here.</p><p><a href="'+NPS_KAYAK+'" target="_blank" rel="noopener">NPS guide directory ↗</a> · <a href="'+NPS_SAFETY+'" target="_blank" rel="noopener">NPS safety rules ↗</a></p>');
        $('fitBadge').textContent='Guide confirmation required';
      }else{
        showPanel(heading+'<h3>Land route · suggested order, not live access clearance</h3><p>Time labels are planning estimates, not navigation ETAs. Confirm current trail, parking, pet and road notices with NPS; H-58 travel and walk durations vary. Download the official map before leaving service.</p>');
      }
      result.dataset.v5='enhanced';
      if(typeof window.gtag==='function')window.gtag('event','pictured_rocks_v5_decision',{commitment_state:cruiseRow?value.code:kayakRow?'GUIDE_REQUIRED':'LAND_PLAN',trip_date:validDate(date.value)?'selected':'missing'});
    }finally{busy=false;}
  }
  refreshSlots();
  date.addEventListener('change',()=>{refreshSlots();if(!result.hidden)updateResult();});
  time.addEventListener('change',()=>{if(!result.hidden)updateResult();});
  form.addEventListener('submit',()=>{setTimeout(updateResult,0);});
  doc.addEventListener('click',e=>{
    if(e.target.closest('[data-preset],[data-trip-shape]'))setTimeout(updateResult,0);
  });
  const reset=$('resetBtn');if(reset)reset.addEventListener('click',()=>{date.value=todayDetroit();time.value='';refreshSlots();});
  const target=$('timeline');
  // Re-apply only after the original renderer replaces the timeline.
  const observer=new MutationObserver(changes=>{
    if(busy||!initialized||result.hidden)return;
    if(changes.some(c=>c.target===target&&c.type==='childList'))setTimeout(updateResult,0);
  });
  observer.observe(target,{childList:true});
  initialized=true;
  if(!result.hidden)updateResult();
}
return {todayDetroit,validDate,cruiseTruth,commitment,formatTime,shiftTime,mount,SLOTS,NOTES};
});
