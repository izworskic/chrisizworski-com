(function(){
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const FALL_ENDPOINT='/api/fall-color?view=snapshot';
const NPS_FALL='https://www.nps.gov/piro/faqs.htm';
const NPS_PLAN='https://www.nps.gov/piro/planyourvisit/index.htm';
const NPS_MINERS_FALLS='https://www.nps.gov/places/miners-falls.htm';
const NPS_CLIFFS='https://www.nps.gov/places/pictured-rocks-cliffs.htm';

function addStyles(){
  if($('#picturedRocksFallRangerStyles'))return;
  const style=document.createElement('style');
  style.id='picturedRocksFallRangerStyles';
  style.textContent=`
  .fall-read{border-top:4px solid #9c5b2d;background:linear-gradient(180deg,#fffdf8 0,#fff 100%)}
  .fall-read-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:20px;align-items:start}
  .fall-meter{min-width:145px;text-align:right}.fall-number{font-family:Georgia,'Times New Roman',serif;font-size:3rem;line-height:.9;color:#713f22}.fall-number small{font-family:Inter,system-ui,sans-serif;font-size:.9rem;font-weight:800;color:#5d6b6d}.fall-label{font-weight:900;margin-top:8px;color:#28484d}
  .fall-ranger-read{font-family:Georgia,'Times New Roman',serif;font-size:1.2rem;line-height:1.5;color:#263f43;max-width:850px;margin:18px 0 0}
  .fall-picks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}.fall-pick{border:1px solid #e5d4c2;border-radius:11px;background:#fff;padding:13px}.fall-pick strong{display:block;color:#713f22;margin-bottom:4px}.fall-pick span{font-size:.84rem;color:#536568}
  .fall-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}.fall-actions button,.fall-actions a{border:0;border-radius:8px;padding:10px 12px;font:inherit;font-size:.82rem;font-weight:850;text-decoration:none;cursor:pointer}.fall-actions button{background:#7c492b;color:#fff}.fall-actions a{background:#f3ece3;color:#57361f}
  .fall-source{margin:13px 0 0;font-size:.72rem;color:#697779}.fall-source a{color:inherit;font-weight:800}
  .fall-highlight{box-shadow:0 0 0 2px rgba(156,91,45,.24)}.fall-badge{display:inline-block;margin:0 0 8px;border-radius:999px;background:#f4e8db;color:#713f22;padding:4px 7px;font-size:.64rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase}
  @media(max-width:700px){.fall-read-head{grid-template-columns:1fr}.fall-meter{text-align:left}.fall-number{font-size:2.5rem}.fall-picks{grid-template-columns:1fr}.fall-ranger-read{font-size:1.08rem}}
  `;
  document.head.appendChild(style);
}

function rewrite(selector,text){const el=$(selector);if(el)el.textContent=text;}
function rewriteStaticCopy(){
  rewrite('.hero .kicker','Pictured Rocks field guide');
  rewrite('.hero h1','Read the lake, pick your side, and build the day Pictured Rocks is actually giving you.');
  rewrite('.hero .lede','Pictured Rocks is a long Lake Superior shoreline, not one attraction. Start with weather and access, decide whether the cliffs are worth committing to water, then stay disciplined about west, Chapel, or east.');
  rewrite('.trip-shapes-section .eyebrow','Choose the experience before the stops');
  rewrite('.trip-shapes-section h2','There are four honest ways to spend a day here.');
  const tripCopy=[
    'If the colored cliff wall is the reason you came, a cruise is the cleanest first-timer answer. You give up schedule flexibility in exchange for the view that defines the park.',
    'A guided kayak puts you down at cliff level, where the scale makes sense. It is also the choice Lake Superior gets the biggest vote on—guide and marine conditions come first.',
    'Chapel is not something you squeeze in after lunch. The long loop is a full Pictured Rocks day: forest, falls, beach, cliff edge and one of the best land looks at the lakeshore.',
    'This is the smart answer more often than visitors expect. H-58, Miners Castle, waterfalls, beaches, dunes and the lighthouse can make an excellent day without turning the trip into a mileage contest.'
  ];
  $$('.trip-shapes-section .trip-card p').forEach((p,i)=>{if(tripCopy[i])p.textContent=tripCopy[i];});
  rewrite('.map-section .eyebrow','Read the park before you drive it');
  rewrite('.map-section h2','Pictured Rocks is long enough to punish backtracking.');
  rewrite('#mapStoryTitle','Three zones. Treat them that way.');
  rewrite('#mapStoryText','Munising and the Miners cluster make a natural west-side day. Chapel is a hiking commitment in the middle. Grand Sable, Hurricane River and Grand Marais belong to the east. Crossing the park twice is how sightseeing turns into windshield time.');
  rewrite('#planner .eyebrow','Now build the day');
  rewrite('#planner h2','Tell me what kind of day you have. The park will narrow the choices.');
  const plannerIntro=$('#planner .section-head p:last-child');
  if(plannerIntro)plannerIntro.innerHTML='Every answer changes routing, timing, or what gets ruled out. A good Pictured Rocks plan is as much about what you <em>leave out</em> as what you include.';
  rewrite('.photo-story .eyebrow','One thing worth knowing before you arrive');
  rewrite('.photo-story h2','The postcard cliffs face Lake Superior.');
  const storyParas=$$('.photo-story .copy p');
  if(storyParas[1])storyParas[1].textContent='You can stand above real cliff country at Miners Castle and along the Chapel route, but the long mineral-stained wall people picture when they hear “Pictured Rocks” is a water-facing landscape. A land day and a water day are both excellent; they are not interchangeable.';
  if(storyParas[2])storyParas[2].innerHTML='<strong>The useful choice:</strong> if the cliff wall itself is the trip, protect time for water and let Lake Superior decide whether it happens. If flexibility matters more, build a land day and stop pretending you need to see everything.';
  rewrite('[aria-labelledby="zones-title"] .eyebrow','Think like someone who knows the park');
  rewrite('#zones-title','West, Chapel, and east are different days.');
  const zones=$$('.three-zones article p');
  if(zones[0])zones[0].textContent='West is the easiest first-day base: cruises, Miners Castle, Miners Beach and Miners Falls are close enough together to make the day feel generous instead of rushed.';
  if(zones[1])zones[1].textContent='Chapel country asks for commitment. Start early, let the hike own the schedule, and do not build a second major objective on top of it.';
  if(zones[2])zones[2].textContent='East feels quieter and more spacious: Grand Sable Dunes, Sable Falls, Twelvemile Beach, Hurricane River, Au Sable Light and Grand Marais reward a day that keeps moving east.';
}

function rangerRead(r){
  const pct=Number(r&&r.pct)||0, phase=r&&r.phase;
  if(phase==='green')return 'The hardwood show has not really started yet. Do not drive the whole lakeshore chasing a peak that is not here. Use H-58 as scenery between real park stops, and let cliffs, waterfalls and Lake Superior carry the day.';
  if(phase==='rising'&&pct<60)return 'Color is starting, which is often a better photograph than the number suggests: green canopy makes the first reds and yellows stand out. Miners Falls and the H-58 corridor are good places to spend time without overcommitting the day.';
  if(phase==='rising')return 'This is the mixed-canopy window I like: enough color to make the forest feel changed, enough green left to give it contrast. Build a land route around H-58, Miners Falls and one major overlook instead of racing from Munising to Grand Marais and back.';
  if(phase==='peak')return 'This is the week to be disciplined. The drive itself becomes part of the park experience. Pick a side, start early, and give the forest time. If the lake is cooperative, the cliff wall with autumn canopy above it is the signature view—but the marine forecast still gets the final word.';
  if(phase==='falling')return 'The hardwood peak is slipping. Wind matters as much as the color percentage now, so take the sheltered forest and waterfall walks early and treat exposed overlooks as bonuses. The park can still be excellent after “peak” if you stop measuring the day by one number.';
  return 'Most hardwood color has passed. Shift the day back toward the permanent Pictured Rocks strengths—cliffs, waterfalls, dunes, beaches and maritime history. Later-changing tamaracks can still add color in pockets.';
}
function picksFor(r){
  if(!r)return [];
  if(r.phase==='peak'||(r.phase==='rising'&&r.pct>=60))return [
    ['H-58','Make the road part of the day. Stop backtracking and let the forest connect the park.'],
    ['Miners Falls','A strong forest-color walk with the park’s most powerful waterfall at the end.'],
    ['Cliffs + canopy','If marine conditions cooperate, water gives you the rare cliff-and-autumn-canopy view in one frame.']
  ];
  if(r.phase==='falling')return [
    ['Miners Falls','Sheltered forest gives you a better chance of holding leaves after wind.'],
    ['Sable Falls','Compact east-end stop with forest, waterfall and Lake Superior in one short sequence.'],
    ['Au Sable Light','When foliage thins, the shoreline and maritime landscape become more of the story.']
  ];
  return [
    ['H-58','Use the scenic road to connect good stops; do not make “finding color” the only objective.'],
    ['Miners Castle','Fast cliff payoff with forest context and very little schedule risk.'],
    ['Miners Falls','A reliable land stop that gets better as the hardwood color develops.']
  ];
}
function highlightFallPicks(r){
  $$('.place-card').forEach(card=>{card.classList.remove('fall-highlight');const old=$('.fall-badge',card);if(old)old.remove();});
  const wanted=(r.phase==='peak'||(r.phase==='rising'&&r.pct>=60))?['Miners Falls','Chapel Rock + loop','Grand Sable country']:r.phase==='falling'?['Miners Falls','Grand Sable country','Au Sable Light']:['Miners Falls','Miners Castle'];
  $$('.place-card').forEach(card=>{const h=$('h3',card);if(!h||!wanted.includes(h.textContent.trim()))return;card.classList.add('fall-highlight');const badge=document.createElement('span');badge.className='fall-badge';badge.textContent='Fall-color pick now';const copy=$('.place-copy',card);if(copy)copy.insertBefore(badge,copy.firstChild);});
}
function buildFallDay(){
  const form=$('#tripForm');if(!form)return;
  if(form.elements.time)form.elements.time.value='day';
  if(form.elements.walk)form.elements.walk.value='moderate';
  if(form.elements.priority)form.elements.priority.value='photo';
  if(form.elements.water)form.elements.water.value='land';
  if(form.elements.base&&form.elements.base.value==='undecided')form.elements.base.value='munising';
  if(form.requestSubmit)form.requestSubmit();else form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
  $('#result')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function renderFall(snapshot){
  const region=snapshot&&Array.isArray(snapshot.regions)?snapshot.regions.find(x=>x.id==='eup'):null;
  if(!region||!snapshot.inSeason)return;
  const today=$('#today');if(!today||$('#fallColorRead'))return;
  const section=document.createElement('section');section.id='fallColorRead';section.className='section fall-read';section.setAttribute('aria-labelledby','fall-color-title');
  const drivers=region.source&&Array.isArray(region.source.drivers)?region.source.drivers.join(', '):'regional climatology';
  const updated=snapshot.updated?new Date(snapshot.updated).toLocaleString([], {month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'current snapshot';
  const picks=picksFor(region).map(([a,b])=>`<div class="fall-pick"><strong>${a}</strong><span>${b}</span></div>`).join('');
  section.innerHTML=`<div class="fall-read-head"><div><p class="eyebrow">Fall color field read</p><h2 id="fall-color-title">The forest is part of the decision today.</h2><p>This uses the same Michigan Fall Color engine as the statewide tool, interpreted here for Pictured Rocks. The engine signal is regional Eastern U.P.—shoreline stands can run ahead or behind it.</p></div><div class="fall-meter"><div class="fall-number">${region.pct}<small>%</small></div><div class="fall-label">${region.label}</div></div></div><p class="fall-ranger-read">${rangerRead(region)}</p><div class="fall-picks">${picks}</div><div class="fall-actions"><button type="button" id="buildFallDay">Build a fall-color land day</button><a href="/fall-color/" target="_blank" rel="noopener">Open Michigan Fall Color ↗</a><a href="${NPS_FALL}" target="_blank" rel="noopener">NPS fall timing ↗</a></div><p class="fall-source">Regional peak window: <strong>${region.peakWindow}</strong> · updated ${updated} · drivers: ${drivers}. NPS says Pictured Rocks peak is usually the last week of September or within the first ten days of October, and notes that wind or heavy rain can strip leaves quickly. <a href="${NPS_PLAN}" target="_blank" rel="noopener">NPS trip guidance ↗</a></p>`;
  today.insertAdjacentElement('afterend',section);
  $('#buildFallDay')?.addEventListener('click',buildFallDay);
  highlightFallPicks(region);
  document.body.dataset.fallColorPhase=region.phase||'';
  document.body.dataset.fallColorPct=String(region.pct||'');
}
async function loadFall(){
  try{
    const res=await fetch(FALL_ENDPOINT,{headers:{Accept:'application/json'}});
    if(!res.ok)throw new Error(`HTTP ${res.status}`);
    renderFall(await res.json());
  }catch(err){console.warn('Pictured Rocks fall-color layer unavailable',err);}
}
function addSourceLinks(){
  const notes=$('.field-notes');if(!notes)return;
  if(!notes.querySelector('[data-ranger-source="fall"]')){const a=document.createElement('a');a.dataset.rangerSource='fall';a.href=NPS_MINERS_FALLS;a.target='_blank';a.rel='noopener';a.textContent='NPS: Miners Falls in fall ↗';notes.appendChild(a);}
  if(!notes.querySelector('[data-ranger-source="cliffs"]')){const a=document.createElement('a');a.dataset.rangerSource='cliffs';a.href=NPS_CLIFFS;a.target='_blank';a.rel='noopener';a.textContent='NPS: cliff viewing ↗';notes.appendChild(a);}
}
function init(){addStyles();rewriteStaticCopy();addSourceLinks();loadFall();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();