/* Apostle Islands landing desk. Source-backed orientation, not marine navigation. */
(() => {'use strict';
const select=document.getElementById('dock-island-choice');
const count=document.getElementById('dock-found-count');
const docks=[...document.querySelectorAll('.dock-record')];
if(!select||!docks.length)return;
const tripIsland=document.getElementById('trip-island');
const picked=document.getElementById('trip-selected-dock');
const printSelection=(name)=>{
 if(picked)picked.textContent=name
 ? 'Proposed NPS dock to verify: '+name+'. This does not reserve a berth, authorize a landing, or establish vessel clearance.'
 : 'No specific island dock selected. A named public dock does not confirm landing or available berth.';
};
function showIsland(value){
 const key=value||'all';let shown=0,closed=0;
 for(const card of docks){
  const visible=key==='all'||card.dataset.island===key;
  card.hidden=!visible;
  if(visible){shown++;if(card.dataset.dockState==='closed')closed++;}
 }
 select.value=key;
 const word=shown===1?'landing record':'landing records';
 count.textContent='Showing '+shown+' NPS '+word+(closed?', including '+closed+' closed landing'+(closed===1?'':'s'):'')+'. Depth ranges are not current clearance or berth availability.';
}
select.addEventListener('change',()=>showIsland(select.value));
document.querySelectorAll('[data-dock-island]').forEach(link=>{
 link.addEventListener('click',()=>showIsland(link.dataset.dockIsland));
});
document.querySelectorAll('.dock-plan-link').forEach(link=>{
 link.addEventListener('click',()=>{
  const card=link.closest('.dock-record');
  if(!card)return;
  if(tripIsland){
   tripIsland.value=link.dataset.targetIsland;
   printSelection(card.querySelector('h3')?.textContent||'');
   tripIsland.dispatchEvent(new Event('change',{bubbles:true}));
  }
 });
});
if(tripIsland)tripIsland.addEventListener('change',e=>{
 if(e.isTrusted)printSelection('');
});
const hash=decodeURIComponent(window.location.hash||'');
const linked=docks.find(card=>hash==='#'+card.id);
const initial=linked?.dataset.island||'stockton';
showIsland(initial);
})();
