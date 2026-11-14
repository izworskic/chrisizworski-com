/* Nearby waterfall explorer, generated with Python from curated access-verified cards.
   Distances are natural waterfall-feature separation, NOT driving, trail, parking,
   legal connections, trip time or confirmation of present-day public opening. */
(()=>{'use strict';
const root=document.getElementById('nearby-lab');
if(!root)return;
const origin=document.getElementById('nearby-origin');
const radius=document.getElementById('nearby-radius');
const status=document.getElementById('nearby-status');
const output=document.getElementById('nearby-results');
const counts=document.getElementById('nearby-source-count');
const cards=new Map([...document.querySelectorAll('[data-fall][data-id]')].map(c=>[c.dataset.id,c]));
const element=(tag,cls,copy)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(copy!==undefined)node.textContent=copy;return node;};
const idsafe=id=>/^[a-z0-9-]+$/.test(id);
function link(label,href){const a=element('a','',label);a.href=href;a.target='_blank';a.rel='noopener noreferrer';return a;}
function syncSaveButtons(){
 // The six-stop planner is authoritative, including when stops are cleared elsewhere.
 for(const item of output.querySelectorAll('[data-nearby-id]')){
  const source=cards.get(item.dataset.nearbyId),button=item.querySelector('.nearby-save-action');
  if(!source||!button)continue;
  const saved=source.querySelector('.save')?.getAttribute('aria-pressed')==='true';
  button.setAttribute('aria-pressed',String(saved));
  button.textContent=saved?'Remove saved stop':'Save stop';
  button.setAttribute('aria-label',(saved?'Remove ':'Save ')+source.dataset.name+(saved?' from':' to')+' your waterfall day');
 }
}
function render(data){
 const current=data.locations.find(x=>x.id===origin.value);
 output.replaceChildren();
 if(!current){status.textContent='Choose a waterfall to see geographically nearby destinations.';return;}
 const miles=Number(radius.value);
 const index=new Map(data.locations.map(x=>[x.id,x]));
 const matches=(data.nearby[current.id]||[]).filter(x=>x.miles<=miles&&index.has(x.id)&&cards.has(x.id)&&(!window.SharedItineraryEngine||window.SharedItineraryEngine.nearbyEligible(cards.get(x.id),x.miles,miles)));
 status.textContent=matches.length+' curated waterfall'+(matches.length===1?'':'s')+' within '+miles+' straight-line miles of '+current.name+'. These are geographic leads, not a driving itinerary or open-trail report.';
 if(!matches.length){output.appendChild(element('p','nearby-empty','No other access-reviewed stops appear in this radius. Try 50 miles or choose another waterfall.'));return;}
 for(const match of matches.slice(0,6)){
  const target=index.get(match.id),original=cards.get(match.id);
  const item=element('article','nearby-stop');
  item.dataset.nearbyId=target.id;
  const label=element('p','nearby-distance',match.miles.toFixed(1)+' miles straight-line · '+target.region);
  const title=element('h3');const guide=element('a','',target.name);guide.href=target.url;title.appendChild(guide);
  const extra=target.id==='gabbro-falls'?'Resort visitor parking and winter walking access are not established. Confirm directly with Snowriver. ':['potawatomi-falls','gorge-falls','rainbow-falls','great-conglomerate-falls'].includes(target.id)?'Black River construction affects specific trails and platforms. ':'';
  const review=element('p','nearby-note',(original.dataset.statusLabel||'Check conditions')+' · '+(target.status==='seasonal'?'Seasonal arrival restrictions apply. ':target.status==='restricted'?'Partial access restrictions apply. ':'')+extra+'Check the source before travel.');
  const actions=element('div','nearby-actions');
  const locate=element('button','nearby-map-action','Show waterfall on map');locate.type='button';
  locate.addEventListener('click',()=>{
   // Nearby geography is independent of the main-list filters. An explicit map
   // request must reveal the target rather than silently fail on a hidden card.
   if(original.hidden){
    const search=document.getElementById('q'),region=document.getElementById('region');
    const effort=document.getElementById('effort'),access=document.getElementById('access');
    if(search&&region&&effort&&access){
     search.value='';region.value='all';effort.value='all';access.value='all';
     region.dispatchEvent(new Event('change',{bubbles:true}));
     status.textContent+=' Map filters were cleared to display '+target.name+'.';
    }
   }
   const focused=typeof window.UPWaterfallFocus==='function'&&window.UPWaterfallFocus(target.id);
   if(!focused&&!original.hidden)original.scrollIntoView({block:'nearest',behavior:'auto'});
   else if(!focused)status.textContent='Unable to display the requested map marker. Open the source-linked waterfall guide instead.';
  });
  const save=element('button','nearby-save-action','Save stop');save.type='button';
  save.addEventListener('click',()=>{
   const existing=original.querySelector('.save');if(!existing)return;
   // The existing planner owns the six-stop limit and add/remove state.
   existing.click();
   syncSaveButtons();
  });
  actions.append(locate,save,link('Arrival evidence',target.source));
  item.append(label,title,review,actions);output.appendChild(item);
 }
 if(matches.length>6)output.appendChild(element('p','nearby-overflow','Showing the six nearest of '+matches.length+'. Expand the radius or choose a different anchor to explore more.'));
 syncSaveButtons();
}
async function init(){
 try{
  const response=await fetch('/assets/up-waterfalls-nearby.json',{cache:'no-cache'});
  if(!response.ok)throw Error('source not available');
  const data=await response.json();
  if(data.schemaVersion!==1||data.method!=='haversine-waterfall-coordinate-straight-line-not-driving'||!Array.isArray(data.locations)||!data.nearby)throw Error('unexpected index');
  const vetted=data.locations.filter(x=>idsafe(x.id)&&cards.has(x.id)&&cards.get(x.id).dataset.arrivalVerified==='verified'&&!['closed','research'].includes(cards.get(x.id).dataset.status)&&x.url?.startsWith('/')&&!x.url.startsWith('//')&&x.source?.startsWith('https://'));
  if(vetted.length!==data.locations.length)throw Error('mismatched access evidence');
  vetted.sort((a,b)=>a.name.localeCompare(b.name));
  for(const x of vetted){const option=document.createElement('option');option.value=x.id;option.textContent=x.name;origin.appendChild(option);}
  origin.value=vetted.some(x=>x.id==='wagner-falls')?'wagner-falls':vetted[0].id;
  counts.textContent=vetted.length+' source-reviewed, eligible stops from '+data.counts.curated+' curated destinations. Geographic index reviewed '+data.reviewed+'.';
  origin.disabled=false;radius.disabled=false;
  origin.addEventListener('change',()=>render(data));radius.addEventListener('change',()=>render(data));render(data);
 }catch{
  status.textContent='Nearby comparison data could not be verified. Use the full source-backed waterfall list and interactive map below instead.';
  output.replaceChildren();
 }
}
document.addEventListener('upfall:shortlist-updated',syncSaveButtons);
init();
})();