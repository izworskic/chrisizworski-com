/* B84 — connect official visitor guides, source-gated cluster planners and map pins.
   Map markers are natural-feature references, never parking/navigation targets. */
(function(){
'use strict';
const CLUSTERS=Object.freeze([
 Object.freeze({id:'munising-day',label:'Munising waterfall day',area:'Munising / Pictured Rocks',ids:Object.freeze(['wagner-falls','miners-falls','elliot-falls','chapel-falls'])}),
 Object.freeze({id:'presque-isle-outing',label:'Presque Isle river outing',area:'Porcupine Mountains',ids:Object.freeze(['nawadaha-falls','manido-falls','manabezho-falls'])}),
 Object.freeze({id:'keweenaw-waterfall-day',label:'Keweenaw park & gorge day',area:'Keweenaw Peninsula',ids:Object.freeze(['eagle-river-falls','haven-falls','manganese-falls'])}),
 Object.freeze({id:'black-river-waterfall-day',label:'Black River construction-aware day',area:'Black River Scenic Byway',ids:Object.freeze(['great-conglomerate-falls','potawatomi-falls','gorge-falls','rainbow-falls','sandstone-falls'])})
]);
const byId=new Map(CLUSTERS.flatMap(group=>group.ids.map(id=>[id,group])));
const ID_PATTERN=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function planFor(id,card){
 if(!ID_PATTERN.test(id||''))return null;
 const group=byId.get(id);
 if(!group||!card||card.dataset?.id!==id||card.dataset?.arrivalVerified!=='verified')return null;
 if(!['verify','seasonal','restricted','closed'].includes(card.dataset.status))return null;
 if(card.dataset.status==='closed'&&id!=='sandstone-falls')return null;
 return {id:group.id,label:group.label,area:group.area,closed:card.dataset.status==='closed'};
}
function focusId(search,hash){
 if(hash!=='#falls-map')return '';
 const focus=new URLSearchParams(search).get('focus')||'';
 return ID_PATTERN.test(focus)&&byId.has(focus)?focus:'';
}
if(typeof module!=='undefined'&&module.exports)module.exports={CLUSTERS,planFor,focusId};
if(typeof document==='undefined')return;
const cards=new Map([...document.querySelectorAll('[data-fall][data-id]')].map(c=>[c.dataset.id,c]));
const map=window.UPWaterfallMap;
// The source map already renders a guide link, status and verified parking-only markers.
// Add one in-place cluster link ONLY to waterfall popups (never a parking popup).
if(map&&typeof map.on==='function')map.on('popupopen',event=>{
 const content=event.popup?.getContent?.();
 if(!content||typeof content.querySelector!=='function')return;
 if(content.querySelector('.waterfall-popup-cluster-link'))return;
 const guide=content.querySelector('a[href^="/upper-peninsula-waterfalls/"]');
 if(!guide)return;
 const match=/^\/upper-peninsula-waterfalls\/([a-z0-9-]+)\/$/.exec(guide.getAttribute('href')||'');
 if(!match)return;
 const id=match[1],record=planFor(id,cards.get(id));
 if(!record)return;
 const a=document.createElement('a');
 a.className='waterfall-popup-cluster-link';
 a.href='/upper-peninsula-waterfalls/#'+record.id;
 a.textContent=record.closed?'Review byway closure and alternative falls':'Explore '+record.label;
 const note=document.createElement('p');
 note.className='waterfall-popup-cluster-note';
 note.textContent=record.closed?'This fall is closed; it is NOT included in the day plan.': 'Regional planner: separate public approaches, current conditions not verified.';
 content.append(a,note);
});
const focus=focusId(window.location.search,window.location.hash);
if(focus&&cards.has(focus)){
 const card=cards.get(focus);
 const reveal=()=>{
  // Filters may hide the requested pin. User explicitly requested one named map reference.
  if(card.hidden){
   const q=document.getElementById('q'),region=document.getElementById('region');
   const effort=document.getElementById('effort'),access=document.getElementById('access');
   if(q&&region&&effort&&access){
     q.value='';region.value='all';effort.value='all';access.value='all';
     region.dispatchEvent(new Event('change',{bubbles:true}));
   }
  }
  const shown=typeof window.UPWaterfallFocus==='function'&&window.UPWaterfallFocus(focus);
  window.UPWaterfallMetrics?.mapFocus(focus,shown);
  const note=document.getElementById('cluster-map-focus-status');
  if(note)note.textContent=shown
    ? card.dataset.name+' waterfall pin selected. The marker is NOT a parking or trailhead direction; use the linked visitor guide for arrival.'
    : 'Map marker could not be selected. Use the verified visitor guide for this waterfall.';
 };
 window.requestAnimationFrame(reveal);
}
})();