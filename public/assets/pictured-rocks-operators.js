(function(){
'use strict';

const CRUISE_URL='https://picturedrocks.com/fares-schedule/';
const NPS_GUIDES='https://www.nps.gov/piro/planyourvisit/kayak-tours.htm';
const GUIDES=[
  {
    name:'Big Water Paddle Co.',
    url:'https://bigwaterpaddle.com/tours/',
    schedule:'Painted Cove: 10:00 AM or 2:00 PM; about 3 hours. Golden Hour: evening start varies, generally 5:30–6:30 PM; arrive 30 minutes early.',
    fit:'Small-group shore-launched paddles from the Miners area; also offers a 5-hour Best of the Rocks trip.'
  },
  {
    name:'Paddling Michigan / Uncle Ducky’s',
    url:'https://www.paddlingmichigan.com/pictured-rocks-kayaking-tours/',
    schedule:'Taste of the Rocks: 9 AM, noon, 3 PM, 6 PM; about 3 hours. Paddler’s Choice: 9 AM, noon, 3 PM; about 6 hours. Morning Delight: 10 AM; about 2 hours. Check in 30 minutes early.',
    fit:'Multiple trip lengths from short beginner-friendly paddles to longer cliff-line days.'
  },
  {
    name:'Pictured Rocks Kayaking',
    url:'https://picturedrockskayaking.com/tours/',
    schedule:'Miners Castle: about 3 hours. Ultimate: about 4–5 hours. Spray Falls: 5+ hours. Departure inventory varies by date; arrive at least 40 minutes early.',
    fit:'Boat-supported kayak tours with offshore launches; check the live booking calendar for the day’s departure times.'
  },
  {
    name:'Yooper Yachts',
    url:'https://yooperyachts.com/products',
    schedule:'Lovers Arch generally meets at 9 AM and runs to roughly 2:30 PM. Kissing Rock is about 2–2.5 hours. Sunset meeting time shifts with daylight; confirm directly before paying.',
    fit:'Small public groups and private guided paddles; weather-dependent reservations.'
  }
];

function easternDate(){
  try{
    const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/Detroit',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const get=t=>parts.find(p=>p.type===t)?.value||'';
    return `${get('year')}-${get('month')}-${get('day')}`;
  }catch(e){return '';}
}

function cruiseSchedule(){
  const d=easternDate();
  if(d>='2026-09-28'&&d<='2026-10-04') return 'Today’s published window: Spray Falls departures at 10 AM, 11 AM, noon, 1 PM, 2 PM, 3 PM and 4 PM; sunset departure 5:45 PM.';
  if(d>='2026-10-05'&&d<='2026-10-11') return 'Published window: Spray Falls departures at 10 AM, 11 AM, 1 PM, 2 PM and 3:30 PM; sunset departure 5:30 PM.';
  if(d>='2026-10-12'&&d<='2026-10-18') return 'Published window: Spray Falls departures at 10 AM, 11 AM, 1 PM, 2 PM and 3:30 PM; sunset departure 5:15 PM.';
  if(d>'2026-10-18') return 'The published 2026 cruise season ended October 18. Check the operator for the next available season.';
  return 'Multiple daytime and sunset departures operate seasonally. Open the live schedule for the exact date before locking the itinerary.';
}

function addStyles(){
  if(document.getElementById('picturedRocksBookingStyles'))return;
  const style=document.createElement('style');
  style.id='picturedRocksBookingStyles';
  style.textContent=`
  .answer-booking{margin:18px 0;padding:16px;border:1px solid #d6dfdd;border-radius:12px;background:#f8fbfa}
  .answer-booking .eyebrow{margin-bottom:4px}.answer-booking h3{font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:1.3rem;margin:3px 0 8px}.answer-booking>p{color:#536468;margin:0 0 11px;font-size:.86rem;line-height:1.5}
  .answer-booking-card{padding:11px 0;border-top:1px solid #e0e6e4}.answer-booking-card:first-of-type{border-top:0}.answer-booking-card strong{display:block;color:#173d43;margin-bottom:4px}.answer-booking-card p{margin:0 0 7px;color:#526468;font-size:.8rem;line-height:1.45}.answer-booking-card a,.answer-booking-source a{font-weight:850;color:#0b5966;text-decoration:none}.answer-booking-card a:hover,.answer-booking-source a:hover{text-decoration:underline}.answer-booking-source{margin-top:9px;padding-top:9px;border-top:1px solid #e0e6e4;font-size:.75rem;color:#69797b}
  `;
  document.head.appendChild(style);
}

function resultMode(){
  const timeline=(document.getElementById('timeline')?.textContent||'').toLowerCase();
  if(timeline.includes('authorized guided kayak tour'))return 'kayak';
  if(timeline.includes('pictured rocks boat cruise'))return 'cruise';
  return '';
}

function ensureBox(){
  const result=document.getElementById('result');
  if(!result)return null;
  let box=document.getElementById('resultBooking');
  if(!box){
    box=document.createElement('section');
    box.id='resultBooking';
    box.className='answer-booking';
    box.setAttribute('aria-label','Booking details for this itinerary');
    const actions=result.querySelector('.action-row');
    result.insertBefore(box,actions||null);
  }
  return box;
}

function renderBooking(){
  const result=document.getElementById('result');
  if(!result||result.hidden)return;
  const mode=resultMode();
  const box=ensureBox();
  if(!box)return;
  if(!mode){box.hidden=true;return;}
  box.hidden=false;
  if(mode==='cruise'){
    box.innerHTML=`<p class="eyebrow">Make the reservation fit the route</p><h3>Pictured Rocks Cruises</h3><p>${cruiseSchedule()} Current late-season trips are Spray Falls cruises, about 2 hours, departing from the Munising City Dock at 100 City Park Drive. Arrive early and verify availability and marine status before treating a departure as fixed.</p><div class="answer-booking-card"><strong>Operator</strong><p>NPS-authorized concessioner · (906) 387-2379</p><a href="${CRUISE_URL}" target="_blank" rel="noopener">See live departures and book ↗</a></div>`;
    return;
  }
  box.innerHTML=`<p class="eyebrow">Choose the guide that fits this answer</p><h3>NPS-permitted guided kayak options</h3><p>The planner has selected a guided paddle as the water anchor. These are choices, not rankings. Lake Superior conditions can change the operating decision, so confirm the departure with the guide before building the rest of the day around it.</p>${GUIDES.map(g=>`<div class="answer-booking-card"><strong>${g.name}</strong><p>${g.schedule}</p><p>${g.fit}</p><a href="${g.url}" target="_blank" rel="noopener">Check schedule / availability ↗</a></div>`).join('')}<div class="answer-booking-source">Permit verification: <a href="${NPS_GUIDES}" target="_blank" rel="noopener">National Park Service permitted kayak guides ↗</a></div>`;
}

function scheduleRender(){setTimeout(renderBooking,0);}
function init(){
  addStyles();
  const form=document.getElementById('tripForm');
  if(form)form.addEventListener('submit',scheduleRender);
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-trip-shape]'))scheduleRender();
  });
  const reset=document.getElementById('resetBtn');
  if(reset)reset.addEventListener('click',()=>{const box=document.getElementById('resultBooking');if(box)box.hidden=true;});
  renderBooking();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
})();
