/* Source-logged overnight suggestions, map-day handoff and navigation review.
 * The page works with no JavaScript; no backend credentials or live routing calls.
 */
(function(){
'use strict';
if(typeof window==='undefined'||!window.document)return;
const w=window,d=document,engine=w.CircleTourOvernights;
const fromJson=id=>{try{return JSON.parse(d.getElementById(id)?.textContent||'');}catch{return null;}};
const trace=fromJson('ct-road-trace-data'),night=fromJson('ct-overnight-source'),published=fromJson('ct-traveler-presets');
const opt=d.getElementById('ct-optimized'),summary=d.getElementById('ct-opt-summary'),
 list=d.getElementById('ct-opt-nights'),alternate=d.getElementById('ct-opt-alternate');
if(!opt||!engine||!trace||!night||!published||!summary||!list||!alternate)return;
const get=id=>d.getElementById(id);
const controls=[get('ct-prefer-days'),get('ct-prefer-drive'),get('ct-prefer-month'),
 get('ct-prefer-pictured'),get('ct-prefer-hiking'),get('ct-prefer-waterfalls'),get('ct-prefer-shipwatch')];
if(controls.some(x=>!x))return;
const element=(tag,txt,cls)=>{const x=d.createElement(tag);if(txt!==undefined)x.textContent=txt;if(cls)x.className=cls;return x};
const a=(txt,url)=>{const x=element('a',txt);x.href=url;return x};
const sourceStops=published.specialists||{};
const route=trace.route;
function selection(){
 return {days:Number(controls[0].value),maxDrive:Number(controls[1].value),
 month:Number(controls[2].value),pictured:controls[3].checked,
 interests:['hiking','waterfalls','shipwatch'].filter((x,i)=>controls[i+4].checked)};
}
function roadLink(day){
 const u=new URL('/lake-superior-circle-tour/',w.location.origin);
 u.searchParams.set('ct_from',day.from);
 u.searchParams.set('ct_to',day.to);
 u.searchParams.set('ct_night_day',String(day.day));
 u.hash='circleTourMap';
 return u.pathname+u.search+u.hash;
}
function startQuery(id){
 return id==='1'?'Duluth, Minnesota, USA':night.overnights[id]?.directionsQuery||null;
}
function driveDirections(day){
 const origin=startQuery(day.from),dest=startQuery(day.to);
 if(!origin||!dest)return null;
 const u=new URL('https://www.google.com/maps/dir/');
 u.searchParams.set('api','1');u.searchParams.set('origin',origin);
 u.searchParams.set('destination',dest);u.searchParams.set('travelmode','driving');
 // Named intermediate cities or trails are not guaranteed routing stops.
 // Visitors see the complete shoreline trace in our on-page map.
 return u.href;
}
function staySearch(day){
 const name=day.overnight.directionsQuery;
 const u=new URL('https://www.google.com/maps/search/');
 u.searchParams.set('api','1');u.searchParams.set('query','lodging near '+name);
 return u.href;
}
function interestsFor(day,p){
 const ids=day.stops.slice(1).filter(stop=>sourceStops[stop]);
 const unique=ids.map(stop=>({...sourceStops[stop],id:stop}));
 return unique.sort((x,y)=>{
  const score=z=>(z.id==='11'&&p.pictured?12:0)+
   (z.interests||[]).reduce((n,k)=>n+(p.interests.includes(k)?3:0),0);
  return score(y)-score(x);
 }).slice(0,2);
}
function photoFor(highlights){
 return highlights.find(x=>x.photo)?.photo||null;
}
function markAnalytics(action,detail={}){
 if(typeof w.va==='function')try{w.va('event',{name:'Circle Tour Overnights',data:{action,...detail}});}catch{}
}
function render(){
 let result;
 try{result=engine.optimize(trace,night,selection());}
 catch(err){
  summary.textContent='The overnight optimizer could not reconcile the published route. The original map and ten-day field guide are still available.';
  list.replaceChildren();alternate.replaceChildren();return;
 }
 opt.dataset.state=result.allWithinCap?'sample':'over';
 opt.dataset.days=String(result.days.length);
 summary.replaceChildren();
 const title=element('strong',result.allWithinCap?
  'Suggested overnight route within your sample driving limit':
  'This trip still has days above your sample driving limit');
 summary.appendChild(title);
 summary.appendChild(element('p',result.days.length+' travel days from Duluth, counterclockwise. '+
  (result.allWithinCap?'All planned road-trace driving allowances fit '+result.settings.maxDrive+' hours; this is NOT an actual routed ETA.':
   'Over-limit days: '+result.overCap.join(', ')+'. No unsupported mileage is silently counted as verified.')));
 if(result.incompleteDays.length)summary.appendChild(element('p',
  'Exact Pigeon River / Grand Portage park access remains unresolved on Day '+
   result.incompleteDays.join(', ')+'. The sample drive limit is not an access guarantee.','ctp-warning'));
 summary.appendChild(element('p',
  'Each night shown is an area to investigate, not confirmed lodging. Day mileage follows the archived simplified OpenStreetMap road line, not a current routing service.'));
 list.replaceChildren();
 const selected=result.settings;
 for(const day of result.days){
  const box=element('article',undefined,'ct-opt-day');
  box.dataset.day=String(day.day);
  box.dataset.from=day.from;box.dataset.to=day.to;
  box.dataset.caution=String(day.incompleteParkApproach||!day.withinCap||day.overnight.kind==='limited');
  const h=element('div',undefined,'ct-opt-head');
  h.appendChild(element('h4','Day '+day.day+' · '+day.overnight.label));
  const badge=element('span','~'+day.driveHours.toFixed(1)+' h sample drive','ct-opt-metric');
  badge.dataset.over=String(!day.withinCap);h.appendChild(badge);
  box.appendChild(h);
  box.appendChild(element('p',
   'Source segment: '+startQuery(day.from).replace(/, (USA|Canada)$/,'')+
   ' → '+day.overnight.label,'ct-opt-meta'));
  box.appendChild(element('p',
   '~'+day.traceMiles.toFixed(1)+' mi along simplified road trace; ~'+
   day.planningMiles.toFixed(1)+' mi with the 15% planning cushion. '+
   (day.borderReserves?'Plan extra for '+day.borderReserves+' border crossing(s).':''),
   'ct-opt-meta'));
  const matches=interestsFor(day,selected);
  const pic=photoFor(matches);
  if(pic){
   const fig=element('figure',undefined,'ct-opt-photo');
   const img=d.createElement('img');
   img.src=pic.src;img.alt=pic.alt;img.loading='lazy';img.decoding='async';
   img.width=600;img.height=300;
   fig.appendChild(img);
   const caption=element('figcaption');
   caption.appendChild(a('Photo: '+pic.by,pic.file));
   caption.appendChild(element('span',' · '));caption.appendChild(a(pic.license,pic.licenseUrl));
   fig.appendChild(caption);box.appendChild(fig);
  }
  if(matches.length){
   const title=element('strong','Worth considering along this stretch');
   box.appendChild(title);
   const ul=element('ul');
   for(const x of matches){
    const li=element('li');
    const link=a(x.label+' — open the planning tool',x.toolUrl);
    li.appendChild(link);ul.appendChild(li);
   }
   box.appendChild(ul);
  }
  const actions=element('div',undefined,'ct-opt-actions');
  const mapLink=a('Show this day on the map',roadLink(day));
  mapLink.dataset.ctMapDay=String(day.day);
  mapLink.addEventListener('click',()=>markAnalytics('day-map-open',{day:day.day}));
  actions.appendChild(mapLink);
  const google=driveDirections(day);
  if(google){
   const navigate=a('Check actual driving directions',google);
   navigate.target='_blank';navigate.rel='noopener noreferrer';
   actions.appendChild(navigate);
  }
  const lodging=a('Look for lodging in this area',staySearch(day));
  lodging.target='_blank';lodging.rel='noopener noreferrer';actions.appendChild(lodging);
  box.appendChild(actions);
  if(day.overnight.kind==='limited')box.appendChild(element('p',
   'Limited or potentially seasonal stay: '+day.overnight.caution,'ct-opt-caution'));
  if(day.incompleteParkApproach)box.appendChild(element('p',day.caveat,'ct-opt-caution'));
  if(!day.withinCap)box.appendChild(element('p',
   'This day exceeds the selected driving allowance. Adjust the trip length or driving limit; do not treat it as resolved.','ct-opt-caution'));
  box.appendChild(element('p','Always verify park entrances, overnight availability, weather and border requirements before departure.','ct-opt-meta'));
  list.appendChild(box);
 }
 alternate.replaceChildren();
 if(!result.allWithinCap){
  if(result.alternate){
   const button=element('button','Try '+result.alternate.days+' days to reduce long drives','ct-plan-button');
   button.type='button';
   button.addEventListener('click',()=>{
    // The original selector has 7/10/15, so never silently replace it
    // with an unsupported day count. Instead show the verified alternative.
    if([7,10,15].includes(result.alternate.days)){
     controls[0].value=String(result.alternate.days);
     controls[0].dispatchEvent(new Event('change',{bubbles:true}));
    }else{
     alternate.textContent='A '+result.alternate.days+'-day custom split is possible in the road-trace model, but overnight availability and local driving directions still need checking. The published 15-day route remains available for comparison.';
    }
   });
   alternate.appendChild(element('p',
    'A '+result.alternate.days+'-day split may fit the sample cap. Additional nights are candidates, not bookings.'));
   alternate.appendChild(button);
  }else alternate.appendChild(element('p',
   'The existing overnight candidate list cannot meet that cap within four additional days. Confirm road routes and consider a slower or shorter regional trip.'));
 }
 opt.dataset.rendered='true';
 markAnalytics('plan-evaluated',{days:result.days.length,over:result.overCap.length});
}
for(const field of controls)field.addEventListener('change',render);
render();
})();
