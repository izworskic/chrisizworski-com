/* User-controlled planning on verified, pre-published Circle Tour routes.
 * Static field guide and original specialist tools survive all failures.
 */
(function(){
'use strict';
if(typeof window==='undefined'||!window.document)return;
const root=window,doc=document,planner=root.CircleTourTraveler,kernel=root.CircleTourRust;
const host=doc.getElementById('ct-personalize'),data=doc.getElementById('ct-traveler-presets');
if(!host||!data||!planner)return;
let source;
try{source=JSON.parse(data.textContent);}catch{return;}
const get=id=>doc.getElementById(id);
const el={days:get('ct-prefer-days'),drive:get('ct-prefer-drive'),month:get('ct-prefer-month'),
 pictured:get('ct-prefer-pictured'),summary:get('ct-prefer-summary'),
 timeline:get('ct-prefer-timeline'),alternate:get('ct-prefer-alternate'),
 map:get('ct-prefer-map'),share:get('ct-prefer-share'),
 copy:get('ct-prefer-copy'),copystatus:get('ct-prefer-copy-status'),
 print:get('ct-prefer-print')};
const focus=['hiking','waterfalls','shipwatch'].map(key=>[key,get('ct-prefer-'+key)]);
if(Object.values(el).some(x=>!x)||focus.some(x=>!x[1]))return;
const params=new URL(root.location.href).searchParams;
const initial=planner.settings({
 days:params.has('ct_days')?Number(params.get('ct_days')):10,
 maxDrive:params.has('ct_drive')?Number(params.get('ct_drive')):5,
 month:params.has('ct_month')?Number(params.get('ct_month')):8,
 interests:params.has('ct_focus')?params.get('ct_focus').split(','):['hiking','waterfalls'],
 pictured:params.has('ct_pictured')?params.get('ct_pictured')!=='0':true
});
host.dataset.js='on';
el.days.value=String(initial.days);el.drive.value=String(initial.maxDrive);
el.month.value=String(initial.month);el.pictured.checked=initial.pictured;
for(const [key,check] of focus)check.checked=initial.interests.includes(key);
function node(tag,copy,className){
 const result=doc.createElement(tag);
 if(copy!==undefined)result.textContent=copy;
 if(className)result.className=className;
 return result;
}
function link(label,href){const a=node('a',label);a.href=href;return a;}
function settings(){return planner.settings({
 days:Number(el.days.value),maxDrive:Number(el.drive.value),
 month:Number(el.month.value),pictured:el.pictured.checked,
 interests:focus.filter(x=>x[1].checked).map(x=>x[0])});}
function shareUrl(s){
 const u=new URL(root.location.href);
 for(const key of ['ct_days','ct_drive','ct_month','ct_focus','ct_pictured'])u.searchParams.delete(key);
 u.searchParams.set('ct_days',s.days);
 u.searchParams.set('ct_drive',s.maxDrive);
 u.searchParams.set('ct_month',s.month);
 u.searchParams.set('ct_focus',s.interests.join(','));
 u.searchParams.set('ct_pictured',s.pictured?'1':'0');
 u.hash='plan-your-trip';return u.href;
}
function render(){
 let model;
 try{model=planner.compare(source,settings(),kernel);}
 catch{el.summary.textContent='Planning comparison is unavailable. The ten-day field guide and full interactive map below still work.';return;}
 const p=model.settings,chosen=model.chosen;
 el.summary.replaceChildren();
 el.summary.appendChild(node('h3',chosen.over?
  'Some driving days exceed your preference':chosen.uncertain?
  'The sample driving budget fits, but road evidence is incomplete':chosen.seasonal?
  'The sample driving budget fits; check seasonal access':'This route fits your sample driving preference'));
 el.summary.appendChild(node('p',
  p.days+' published days from Duluth · '+model.monthName+
  ' · a maximum of '+p.maxDrive+' hours of sample driving each day.'));
 const tooLong=chosen.days.filter(d=>d.exceeds).map(d=>d.day);
 el.summary.appendChild(node('p',chosen.over?
  'Days '+tooLong.join(', ')+' exceed the sample driving limit. Plan for an additional night, lighter stops, or a longer published itinerary.':
  'No published day exceeds this sample driving limit. '+(chosen.uncertain?
   'The incomplete road approach still needs checking before you can confirm the trip fits.':
   'This does not confirm actual road travel times.')));
 const unknown=chosen.days.filter(d=>!d.complete).map(d=>d.day);
 if(unknown.length)el.summary.appendChild(node('p',
  'Still needs exact road approach evidence: Day '+unknown.join(', ')+'. No border-to-park arrival time is guaranteed.','ctp-warning'));
 if(chosen.seasonal)el.summary.appendChild(node('p',
  chosen.seasonal+' days involve experiences requiring seasonal park and road checks.','ctp-warning'));
 if(p.pictured)el.summary.appendChild(node('p',
  'Pictured Rocks remains a must-see: preserve time there and trim other activities first.'));
 el.alternate.replaceChildren();
 if(model.alternative!==null){
  const other=model.options[String(model.alternative)];
  el.alternate.appendChild(node('strong','A less rushed published option: '+model.alternative+' days'));
  el.alternate.appendChild(node('p',other.over+' days exceed the same driving cap instead of '+
   chosen.over+'. There are still '+other.uncertain+
   ' day(s) with incomplete road evidence and normal access checks.'));
  const button=node('button','Compare the '+model.alternative+'-day itinerary','ct-plan-button');
  button.type='button';button.addEventListener('click',()=>{
   el.days.value=String(model.alternative);render();el.summary.scrollIntoView({block:'nearest'});
  });el.alternate.appendChild(button);
 }else if(chosen.over){
  el.alternate.appendChild(node('strong','The published routes cannot fully meet that cap.'));
  el.alternate.appendChild(node('p',
   'Consider extra nights along northern Ontario or the Minnesota North Shore. A new split would need actual road-mile and lodging verification; this planner does not invent one.'));
 }else{
  el.alternate.appendChild(node('p',
   'This is an editorial feasibility comparison. Accommodation, border entry, trail access and ferry service remain unconfirmed.'));
 }
 const route='/lake-superior-circle-tour/?itinerary='+p.days+
   '&direction=counterclockwise#itin-'+p.days;
 el.map.href=route;
 el.map.textContent='Open the published '+p.days+'-day route and all 31 stops on the map';
 el.timeline.replaceChildren();
 for(const day of chosen.days){
  const card=node('article',undefined,'ct-personal-day');
  card.dataset.day=String(day.day);
  card.dataset.state=day.complete?(day.exceeds?'over':day.seasonalHold?'seasonal':'sample'):'unverified';
  const header=node('div',undefined,'ct-personal-day-head');
  header.appendChild(node('h4','Day '+day.day+' · '+day.overnightArea));
  header.appendChild(node('span',day.label,'ct-personal-state'));
  card.appendChild(header);
  card.appendChild(node('p',day.routeSummary,'ct-personal-stops'));
  card.appendChild(node('p',day.miles===0?
    'Stay day. No transfer miles in the published route.':
    day.miles+' editorial day miles · approximately '+day.driveHours.toFixed(1)+
      ' hours sample driving allowance'+(day.exceeds?' · above your preference':'')+
      (!day.complete?' · full drive time unverified':''),
    'ct-personal-miles'));
  if(day.borderReserveMinutes)card.appendChild(node('p',
    'Add a separate 45-minute unverified border reserve. It is not an observed crossing wait.',
    'ct-personal-note'));
  if(!day.complete){
   const warning=node('p','The sample allowance is based only on editorial mileage. Check the road route and border wait before committing to an arrival time.','ctp-warning');
   if(day.incompleteLegs?.includes('20→21')){
    warning.textContent='The Pigeon River-to-park approach is not independently measured. The sample allowance uses editorial mileage. Minnesota DNR identifies the park entrance and visitor parking on Highway 61, separate from the border crossing. ';
    warning.appendChild(link('Check the official park entrance map','https://files.dnr.state.mn.us/maps/state_parks/spk00173.pdf'));
    warning.appendChild(node('span',' · '));
    warning.appendChild(link('Check U.S. border wait information','https://bwt.cbp.gov/'));
    warning.appendChild(node('span','. If your crossing has no reported wait, allow for uncertainty; no arrival time is confirmed.'));
   }
   card.appendChild(warning);
  }
  if(day.seasonalHold)card.appendChild(node('p',
    'Before booking, check seasonal road, park and trail access directly.','ctp-warning'));
  const body=node('div',undefined,'ct-personal-day-body');
  const photo=day.suggestions.find(x=>x.photo);
  if(photo){
   const fig=node('figure',undefined,'ct-personal-photo');
   const img=doc.createElement('img');
   img.src=photo.photo.src;img.alt=photo.photo.alt;
   img.loading='lazy';img.decoding='async';img.width=480;img.height=320;
   fig.appendChild(img);
   const caption=node('figcaption');
   caption.appendChild(link('Photo: '+photo.photo.by,photo.photo.file));
   caption.appendChild(node('span',' · '));
   caption.appendChild(link(photo.photo.license,photo.photo.licenseUrl));
   fig.appendChild(caption);body.appendChild(fig);
  }
  if(day.suggestions.length){
   const block=node('div',undefined,'ct-personal-advice');
   block.appendChild(node('strong','Worth considering on this stretch'));
   const ul=node('ul');
   for(const activity of day.suggestions){
    const item=node('li');
    item.appendChild(link(activity.label+' — open the existing tool',activity.toolUrl));
    item.appendChild(node('small',activity.toolAction+
      (day.exceeds?' Only if you adjust this driving day.':'')));
    ul.appendChild(item);
   }
   block.appendChild(ul);body.appendChild(block);
  }else{
   body.appendChild(node('p',
    'Protect this stretch as a transfer or recovery day rather than forcing another attraction.'));
  }
  card.appendChild(body);
  card.appendChild(link('Check the original route evidence and map',route));
  el.timeline.appendChild(card);
 }
 el.share.value=shareUrl(p);
 el.copystatus.textContent='Share link includes only selected trip preferences. No account required.';
 host.dataset.days=String(p.days);
 host.dataset.engine=kernel?.engine?.()||'editorial-fallback';
}
for(const field of [el.days,el.drive,el.month,el.pictured,...focus.map(x=>x[1])])
 field.addEventListener('change',render);
el.copy.addEventListener('click',async()=>{
 try{
  if(!root.navigator?.clipboard?.writeText)throw Error('no clipboard');
  await root.navigator.clipboard.writeText(el.share.value);
  el.copystatus.textContent='Trip preference link copied.';
 }catch{
  el.share.focus();el.share.select();
  el.copystatus.textContent='Copy the selected link to share your preferences.';
 }
});
el.print.addEventListener('click',()=>root.print());
render();
Promise.resolve(kernel?.activate?.()).then(render).catch(render);
})();
