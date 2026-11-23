/* Additive Cuyahoga bridge-to-public-park handoff.
 * Does not override existing app selection, bridge layers, AIS, historic replay or ETA gates. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const core=window.CuyahogaBridgeToShore;
const focus=$('river-focus'),selector=$('bridge-select');
if(!core||!focus||!selector)return;
let bridges=null,parks=null;
const create=(tag,value,cls)=>{const e=document.createElement(tag);e.textContent=String(value||'');if(cls)e.className=cls;return e;};
function render(){
 if(!bridges||!parks)return;
 const id=selector.value;
 if(!id)return;
 const old=focus.querySelector('[data-bridge-shore]');
 if(old){if(old.dataset.bridgeShore===id)return;old.remove();}
 const bridge=bridges.find(x=>x.id===id&&x.channel==='main');
 const answer=core.handoff(bridge,parks);
 if(answer.state!=='APPROXIMATE_GEOGRAPHIC_CONTEXT_ONLY')return;
 const {park,distanceMiles}=answer.closest;
 const row=create('div','','bridge-shore-handoff');row.dataset.bridgeShore=id;
 const heading=create('strong','How does this bridge relate to public riverfront?');
 const text=create('p','Nearest of the four mapped Cleveland Metroparks areas: '+park.name+
  ', about '+distanceMiles.toFixed(1)+' miles in a straight line from this approximate NOAA bridge point. This is NOT a sightline or a visitor route.');
 const action=create('button','Explore '+park.name,'bridge-shore-action');action.type='button';
 action.setAttribute('aria-label','Select '+park.name+' public viewing area on the river map');
 action.addEventListener('click',()=>{const button=document.querySelector('[data-park="'+park.id+'"]');if(button)button.click();});
 const source=create('a','Park access and current information ↗');
 source.href=park.officialUrl;source.target='_blank';source.rel='noopener noreferrer';
 row.append(heading,text,action,source);
 focus.append(row);
}
async function load(){
 try{
  const fetchGuide=async url=>{
   const r=await fetch(url,{cache:'force-cache',signal:AbortSignal.timeout(12000)});
   if(!r.ok)throw Error('source unavailable');
   return r.json();
  };
  const pair=await Promise.all([
   fetchGuide('/cuyahoga-freighter-watch/bridges.json'),
   fetchGuide('/cuyahoga-freighter-watch/viewpoints.json')
  ]);
  if(pair[0]?.schemaVersion!==1||!Array.isArray(pair[0].bridges))return;
  if(pair[1]?.schemaVersion!==1||!Array.isArray(pair[1].spots))return;
  bridges=pair[0].bridges;parks=pair[1].spots;render();
 }catch(_){/* Existing app and its source links remain fully functional. */}
}
// The owning Cuyahoga app replaces #river-focus after a map marker, select, AIS
// or archived-fix interaction. Watching replacement is a narrow additive hook
// with no changes to the owning app, and a guard against observing our own row.
const observer=new MutationObserver(()=>{if(!focus.querySelector('[data-bridge-shore="'+selector.value+'"]'))render();});
observer.observe(focus,{childList:true});
selector.addEventListener('change',render);
load();
})();