/* U.P. waterfall visitability lens — planning, never a live trail/flow/open verdict.
 * Each card is a curated destination; a waterfall pin is NOT a visitor arrival.
 * Relative suitability is editorial and strictly uses recorded full on-site duration.
 * Official road/closure notes are scoped. Last manually checked 2026-11-02.
 */
(()=>{'use strict';
const root=document.getElementById('visit-lens');
if(!root)return;
const cards=Array.from(document.querySelectorAll('[data-fall]'));
const region=document.getElementById('region'),lensRegion=document.getElementById('visit-region');
const budget=document.getElementById('visit-budget'),date=document.getElementById('visit-date');
const verdict=document.getElementById('visit-verdict'),picks=document.getElementById('visit-picks');
const baseline=document.getElementById('visit-baseline'),currentSelection=document.getElementById('visit-selection');
const sources=Object.freeze({
 porkies:'https://www.michigan.gov/recsearch/parks/porkies',
 bond:'https://www.michigan.gov/recsearch/parks/bondfalls',
 mdot:'https://www.michigan.gov/mdot/news-outreach/pressreleases/2026/10/15/mdot-roadside-parks-set-to-close-for-season',
 blackriver:'https://www.fs.usda.gov/r09/ottawa/alerts/black-river-waterfall-platforms-and-trails-undergoing-major-repairs',
 munising:'https://www.nps.gov/places/munising-falls.htm'
});
const safeText=(value)=>String(value||'').replace(/\s+/g,' ').trim();
const localISO=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');};
date.value=localISO();
lensRegion.value=region.value;
const duration=c=>{
 const text=safeText(c.querySelector('.card-aux .small')?.textContent);
 const match=text.match(/(\d+)\s*[–—-]\s*(\d+)\s*min/i);
 return {text,max:match?Number(match[2]):null};
};
const hasOfficialEvidence=c=>{try{
 const host=new URL(c.dataset.arrivalSource).hostname.toLowerCase();
 return host.endsWith('.gov')||host==='michigan.gov'||host.endsWith('.usda.gov')||host==='northcountrytrail.org';
}catch{return false;}};
const isWinterRoadPeriod=d=>{const m=d.getMonth()+1;return m===12||m<=5;};
function guidance(c,when){
 const notice=[];
 const name=c.dataset.id,status=c.dataset.status,month=when.getMonth()+1;
 if(status==='closed')return {excluded:true,notice:['Agency-reported closure; verify before any future trip.'],level:'closed'};
 if(status==='research'||c.dataset.arrivalVerified!=='verified')return {excluded:true,notice:['Complete legal waterfall approach is not verified.'],level:'unverified'};
 if(status==='restricted')notice.push('Partial restrictions in the source record; check exactly which viewpoint is affected.');
 if(status==='seasonal')notice.push('Vehicle or foot access is seasonal. Opening today is not established.');
 if(name==='gabbro-falls'){
  notice.push('Gabbro is on Snowriver resort property. Confirm designated waterfall-visitor parking, non-guest terms and bridge-side footpath with the owner before traveling.');
  if(month>=11||month<=4)notice.push('Snowriver ski-season operations do not certify winter waterfall pedestrian access; stay off active ski runs and unapproved service roads.');
 }
 if(name==='scott-falls'){
  notice.push('The documented view is from the MDOT park side of busy M-28 ONLY. Do not cross the highway to the falls or use a shoulder turnout.');
 }
 if(name==='houghton-douglass-falls'){
  notice.push('DNR visitor infrastructure is still in phased development; the completed accessible falls overlook is not verified. Follow only currently permitted portions.');
 }
 if(name==='mex-i-min-e-falls'&&(month>=10||month<=5)){
  notice.push('Forest Road 4500 and Burned Dam Campground are not maintained for all-season vehicle access; snow and gates may prevent arrival.');
 }
 if(name==='bond-falls'&&(month>=11||month<=4)){
  notice.push('Bond Falls vehicle access is usually mid-May through mid-October; check the scenic-site approach.');
 }
 if(['fumee-falls','agate-falls','tioga-park-falls'].includes(name)&&(month>=11||month<=4)){
  notice.push('MDOT closes most roadside parks after late October; this exact entrance needs a current gate check.');
 }
 const isPorkies=(c.dataset.place||'').toLowerCase().includes('porcupine')||
 /porkies|south boundary|pinkerton/i.test((c.dataset.arrivalParking||'')+' '+(c.dataset.arrivalTrail||''));
 if(isPorkies&&isWinterRoadPeriod(when)){
  notice.push('Porkies: some South Boundary Road and M-107 sections close to vehicles Dec. 1 through late spring; check this approach, not the waterfall pin.');
 }
 if(['potawatomi-falls','gorge-falls','sandstone-falls','rainbow-falls','great-conglomerate-falls'].includes(name)){
  notice.push('Black River trail/platform construction has location-specific restrictions through the agency notice.');
 }
 if(!notice.length)notice.push('No closure encoded for this stop, but current road, gate and trail status remain unconfirmed.');
 const materialCaution=notice.some(text=>!text.startsWith('No closure encoded for this stop'));
 return {excluded:false,level:materialCaution||status==='seasonal'||status==='restricted'?'extra-check':'check',notice};
}
function gather(){
 const parsed=date.value?new Date(date.value+'T12:00:00'):new Date(NaN);
 const valid=Number.isFinite(parsed.valueOf());
 const when=valid?parsed:new Date();
 const limit=budget.value==='all'?Infinity:Number(budget.value);
 const native=window.UPWaterfallsRust?.current?.()||null;
 const active=cards.filter(c=>!c.hidden);
 // An M-28 park-side view and an unfinished falls overlook should not be unsolicited hiking recommendations.
 // Visitors specifically searching those names may inspect them with the explicit limitations intact.
 const searched=(document.getElementById('q')?.value||'').trim().toLowerCase();
 const explicitOnly=new Set(['scott-falls','houghton-douglass-falls']);
 const qualifying=active.map(c=>{
  const effort=duration(c), access=guidance(c,when);
  const p=native?.policy(c,when);
  return {c,effort,access:p?{...access,excluded:p.excluded,level:p.level}:access};
 }).filter(x=>
  (!explicitOnly.has(x.c.dataset.id)||(searched&&x.c.dataset.name.toLowerCase().includes(searched)))&&!x.access.excluded&&
 (native?native.budgetAllows(x.effort.max,limit):(Number.isFinite(limit)?x.effort.max!==null&&x.effort.max<=limit:true)));
 qualifying.sort((x,y)=>{
  if(native)return native.compare(x,y);
  const rank=x=>x.access.level==='check'?0:1;
  return rank(x)-rank(y)||(hasOfficialEvidence(y.c)?1:0)-(hasOfficialEvidence(x.c)?1:0)||
   (x.effort.max??999)-(y.effort.max??999)||x.c.dataset.name.localeCompare(y.c.dataset.name);
 });
 const chosen=[],regions=new Set();
 for(const item of qualifying){
  if(lensRegion.value==='all'&&regions.has(item.c.dataset.region))continue;
  chosen.push(item);regions.add(item.c.dataset.region);
  if(chosen.length===3)break;
 }
 if(chosen.length<3){for(const item of qualifying){
  if(chosen.some(x=>x.c===item.c))continue;chosen.push(item);if(chosen.length===3)break;
 }}
 return {when,valid,limit,active,qualifying,chosen};
}
let selectedId=null;
function textEl(tag,value,className){const el=document.createElement(tag);if(className)el.className=className;el.textContent=value;return el;}
function sourceLink(c){const link=document.createElement('a');link.href=c.dataset.arrivalSource||c.dataset.url;link.rel='noopener noreferrer';link.target='_blank';link.textContent='Check original arrival source';return link;}
function render(){
 const data=gather();picks.replaceChildren();
 const longRange=data.when.getFullYear()>2027||(data.when.getFullYear()===2027&&data.when.getMonth()>5);
 const preface=longRange?'The selected date is beyond this source review period; treat all restrictions as historical. ':'';
 const singular=data.qualifying.length===1?'profile':'profiles';
 verdict.textContent=preface+data.qualifying.length+' '+singular+' match your active region, filters and full on-site time budget. These are places to investigate, not confirmed-open trips.';
 baseline.textContent=data.limit===Infinity?'On-site time: any. Travel between U.P. regions is NOT included.':
  'On-site time: at most '+data.limit+' minutes PER STOP, using the high end of each published range. Driving, parking delays and changing conditions are extra.';
 const iso=data.valid?date.value:'your selected travel day';
 if(!data.chosen.length){
  const empty=textEl('div','No supported match for '+iso+'. Try a longer visit, another region or fewer filters. A missing match is not a closure notice.','visit-empty');picks.appendChild(empty);
  currentSelection.textContent='No selected waterfall. Original park/source links remain in the full list.';return;
 }
 data.chosen.forEach(({c,effort,access})=>{
  const id=c.dataset.id,card=document.createElement('article');card.className='visit-pick';card.dataset.visitPick=id;
  if(selectedId===id)card.classList.add('is-selected');
  const head=textEl('p','FALLS TO CONSIDER · '+c.dataset.region,'visit-kicker');
  const title=document.createElement('h3');const guide=document.createElement('a');guide.href=c.dataset.url;guide.textContent=c.dataset.name;title.appendChild(guide);
  const time=textEl('p','On site: '+(effort.text||'published time unavailable')+' · '+safeText(c.dataset.statusLabel),'visit-meta');
  const why=textEl('p',access.notice[0],'visit-why');
  const remaining=access.notice.slice(1);
  const checks=document.createElement('p');checks.className='visit-source-hint';
  if(remaining.length)checks.textContent=remaining.join(' ');
  const row=document.createElement('div');row.className='visit-actions';
  const focus=document.createElement('button');focus.type='button';focus.className='visit-focus';focus.textContent='Locate on map';focus.setAttribute('aria-pressed',String(selectedId===id));
  focus.addEventListener('click',()=>{
   selectedId=id;render();const action=picks.querySelector('[data-visit-pick="'+id+'"] .visit-focus');
   if(action)action.focus({preventScroll:true});
   if(typeof window.UPWaterfallFocus==='function')window.UPWaterfallFocus(id);
   else c.scrollIntoView({block:'nearest',behavior:'auto'});
  });
  row.append(focus,sourceLink(c));
  card.append(head,title,time,why);if(remaining.length)card.appendChild(checks);card.appendChild(row);picks.appendChild(card);
 });
 if(selectedId&&!data.chosen.some(x=>x.c.dataset.id===selectedId)){
  selectedId=null;
  currentSelection.textContent='Previous stop no longer fits these filters. Select a current match or use the full list.';
 }else if(selectedId){
  const item=data.chosen.find(x=>x.c.dataset.id===selectedId);
  currentSelection.textContent='Map focus: '+item.c.dataset.name+'. The pin marks the waterfall, not visitor parking.';
 }else{
  currentSelection.textContent=lensRegion.value==='all'?'These examples may be hundreds of miles apart. Choose a region before building one day of stops.':'Choose a stop to focus the map; its arrival source remains the authority.';
 }
}
lensRegion.addEventListener('change',()=>{region.value=lensRegion.value;region.dispatchEvent(new Event('change',{bubbles:true}));render();});
region.addEventListener('change',()=>{lensRegion.value=region.value;render();});
for(const id of ['visit-budget','visit-date','effort','access'])document.getElementById(id)?.addEventListener('change',render);
document.getElementById('q')?.addEventListener('input',render);
document.addEventListener('upfall:selected',e=>{const id=e.detail?.id;if(!id||!picks.querySelector('[data-visit-pick="'+id+'"]'))return;selectedId=id;render();});
window.UPWaterfallVisitLens={review(id){const card=cards.find(c=>c.dataset.id===id);const when=new Date((date.value||localISO())+'T12:00:00');return card?guidance(card,Number.isFinite(when.valueOf())?when:new Date()):null;},travelDate(){return date.value;},engine(){return window.UPWaterfallsRust?.current?.()?.engine||'javascript-fallback';}};
date.addEventListener('change',()=>document.dispatchEvent(new Event('upfall:review-updated')));
render();
// Hydrate Rust after the HTML-first planner renders. Every card/month/time
// budget is validated before Rust may influence a visitor recommendation.
window.UPWaterfallsRust?.load?.(cards,guidance,hasOfficialEvidence,duration)?.then(engine=>{if(engine)render();});
})();