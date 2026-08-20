(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
let activeNative=null,activeCard=null,layoutRaf=0,activePopup=null,activeMap=null,panRaf=0;
let autoPan={x:0,y:0};

function installStyles(){
  if($('#manistee-map-flow-v2-styles'))return;
  const s=document.createElement('style');s.id='manistee-map-flow-v2-styles';
  s.textContent=`
  #manistee-river-key{z-index:705!important}
  #manistee-river-key:not([data-v2-open="true"]){display:none!important}
  #manistee-river-key[data-v2-open="true"]{display:block!important;left:12px!important;bottom:94px!important;width:205px!important;max-height:min(48vh,285px)!important;overflow:auto!important}
  .manistee-key-toggle:not(.manistee-key-toggle-v2){display:none!important}
  .manistee-key-toggle-v2{position:absolute;z-index:710;left:12px;bottom:48px;min-height:38px;padding:7px 11px;border:1px solid rgba(31,61,51,.22);border-radius:8px;background:rgba(255,255,255,.97);box-shadow:0 3px 12px rgba(0,0,0,.14);font:700 11px/1 Inter,system-ui,sans-serif;color:#29463d;cursor:pointer}
  #manistee-map .leaflet-popup.manistee-rich-popup{opacity:0!important;pointer-events:none!important}
  .manistee-detached-card{position:absolute;z-index:780;width:min(560px,calc(100% - 32px));max-height:min(56vh,430px);overflow:auto;background:#fff;border:1px solid rgba(32,57,48,.14);border-radius:10px;box-shadow:0 12px 38px rgba(18,35,29,.28);font-family:Inter,system-ui,sans-serif;color:#2a3932;overscroll-behavior:contain}
  .manistee-detached-card[hidden]{display:none!important}
  .manistee-detached-close{position:sticky;float:right;top:5px;margin:5px 5px -39px 0;z-index:5;width:34px;height:34px;border:0;border-radius:50%;background:rgba(255,255,255,.94);box-shadow:0 1px 6px rgba(0,0,0,.12);font-size:22px;line-height:30px;color:#52635d;cursor:pointer}
  .manistee-detached-body{min-width:0}
  .manistee-detached-card .mrp-card{display:grid!important;grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr)!important;gap:0 14px!important;padding:14px 16px 12px!important}
  .manistee-detached-card .mrp-card>.mrp-kicker,.manistee-detached-card .mrp-card>h3,.manistee-detached-card .mrp-card>.mrp-reach,.manistee-detached-card .mrp-card>.mrp-chips,.manistee-detached-card .mrp-card>.mrp-note,.manistee-detached-card .mrp-card>.mrp-facts{grid-column:1!important}
  .manistee-detached-card .mrp-card>.mrp-live{grid-column:2!important;grid-row:1 / span 7!important;border:0!important;border-left:1px solid #e1e6e2!important;margin:0!important;padding:2px 0 2px 14px!important;min-width:0}
  .manistee-detached-card .mrp-live-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:7px!important}
  .manistee-detached-card .mrp-live-grid section{min-width:0}
  .manistee-detached-card .mrp-card>.mrp-actions,.manistee-detached-card .mrp-card>.mrp-source,.manistee-detached-card .mrp-card>.mrp-caution{grid-column:1 / -1!important}
  .manistee-detached-card .mrp-river>.mrp-kicker,.manistee-detached-card .mrp-river>h3,.manistee-detached-card .mrp-river>.mrp-note,.manistee-detached-card .mrp-river>.mrp-stat-list,.manistee-detached-card .mrp-gauge>.mrp-kicker,.manistee-detached-card .mrp-gauge>h3,.manistee-detached-card .mrp-gauge>.mrp-live-badge,.manistee-detached-card .mrp-gauge>.mrp-stat-list{grid-column:1 / -1!important}
  .manistee-detached-card .mrp-river>.mrp-stat-list,.manistee-detached-card .mrp-gauge>.mrp-stat-list{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}
  .manistee-detached-card .mrp-note{max-height:76px!important;overflow:auto!important}
  .manistee-detached-card .mrp-facts{grid-template-columns:1fr 1fr!important}
  .manistee-detached-card .mrp-actions{margin-top:9px!important;padding-top:8px!important;border-top:1px solid #e8ebe8!important}
  @media(max-width:760px){
    .manistee-detached-card{left:10px!important;right:10px!important;bottom:10px!important;top:auto!important;width:auto!important;max-height:43vh!important;border-radius:12px}
    .manistee-detached-card .mrp-card{grid-template-columns:1fr 1fr!important;gap:0 10px!important;padding:12px 13px 11px!important}
    .manistee-detached-card .mrp-card>.mrp-live{grid-column:1 / -1!important;grid-row:auto!important;border-left:0!important;border-top:1px solid #e1e6e2!important;margin-top:7px!important;padding:8px 0 0!important}
    .manistee-detached-card .mrp-note{max-height:56px!important}
    #manistee-river-key[data-v2-open="true"]{left:10px!important;bottom:92px!important;width:min(220px,calc(100vw - 20px))!important}
  }
  @media(max-width:460px){
    .manistee-detached-card .mrp-card{grid-template-columns:1fr!important}
    .manistee-detached-card .mrp-card>*{grid-column:1!important;grid-row:auto!important}
    .manistee-detached-card .mrp-live-grid,.manistee-detached-card .mrp-river>.mrp-stat-list,.manistee-detached-card .mrp-gauge>.mrp-stat-list{grid-template-columns:repeat(2,minmax(0,1fr))!important}
    .manistee-detached-card .mrp-facts{grid-template-columns:1fr 1fr!important}
  }`;
  document.head.appendChild(s);
}

function setupKey(){
  const key=$('#manistee-river-key');if(!key)return;
  key.dataset.v2Open=key.dataset.v2Open||'false';
  $$('.manistee-key-toggle').filter(b=>!b.classList.contains('manistee-key-toggle-v2')).forEach(b=>b.remove());
  let btn=$('.manistee-key-toggle-v2');
  if(!btn){
    btn=document.createElement('button');btn.type='button';btn.className='manistee-key-toggle manistee-key-toggle-v2';btn.textContent='Map key';btn.setAttribute('aria-controls','manistee-river-key');btn.setAttribute('aria-expanded','false');
    btn.addEventListener('click',e=>{e.stopPropagation();const open=key.dataset.v2Open!=='true';key.dataset.v2Open=open?'true':'false';btn.setAttribute('aria-expanded',String(open));});
    key.parentElement?.appendChild(btn);
  }
  key.addEventListener('click',e=>e.stopPropagation(),{once:true});
}
function closeKey(){const key=$('#manistee-river-key'),btn=$('.manistee-key-toggle-v2');if(key)key.dataset.v2Open='false';btn?.setAttribute('aria-expanded','false');}

function hookLeafletPopups(){
  if(!window.L?.Popup||L.Popup.prototype._manisteeFlowV2Hooked)return;
  L.Popup.prototype._manisteeFlowV2Hooked=true;
  const onAdd=L.Popup.prototype.onAdd,onRemove=L.Popup.prototype.onRemove;
  L.Popup.prototype.onAdd=function(map){
    const rich=String(this.options?.className||'').includes('manistee-rich-popup');
    if(rich)this.options.autoPan=false;
    const result=onAdd.call(this,map);
    if(rich){
      activePopup=this;activeMap=map;
      if(!map._manisteeFlowV2Tracked){map._manisteeFlowV2Tracked=true;map.on('move zoom',()=>{if(activeNative)positionCard(activeNative,false);});}
      queueMicrotask(scan);
    }
    return result;
  };
  L.Popup.prototype.onRemove=function(map){
    const wasActive=this===activePopup;
    const result=onRemove.call(this,map);
    if(wasActive){activePopup=null;queueMicrotask(()=>hideCard(true));}
    return result;
  };
}

function ensureCard(){
  if(activeCard?.isConnected)return activeCard;
  const wrap=$('.map-wrap');if(!wrap)return null;
  const card=document.createElement('aside');card.className='manistee-detached-card';card.hidden=true;card.setAttribute('aria-live','polite');card.setAttribute('aria-label','Map point details');
  const close=document.createElement('button');close.type='button';close.className='manistee-detached-close';close.setAttribute('aria-label','Close map details');close.innerHTML='×';
  const body=document.createElement('div');body.className='manistee-detached-body';
  close.addEventListener('click',()=>{const x=$('#manistee-map .leaflet-popup.manistee-rich-popup .leaflet-popup-close-button');if(x)x.click();else hideCard(true);});
  card.append(close,body);wrap.appendChild(card);activeCard=card;return card;
}
function restoreAutoPan(){
  cancelAnimationFrame(panRaf);
  if(!activeMap||(Math.abs(autoPan.x)<1&&Math.abs(autoPan.y)<1)){autoPan={x:0,y:0};return;}
  const reverse={x:-autoPan.x,y:-autoPan.y};autoPan={x:0,y:0};
  activeMap.panBy([reverse.x,reverse.y],{animate:true,duration:.28,easeLinearity:.35});
}
function hideCard(restore=false){if(activeCard)activeCard.hidden=true;activeNative=null;if(restore)restoreAutoPan();}
function keepAnchorVisible(){
  const card=activeCard,map=activeMap,popup=activePopup;if(!card||card.hidden||!map||!popup?.getLatLng)return;
  const mapEl=map.getContainer?.();if(!mapEl)return;
  const mr=mapEl.getBoundingClientRect(),cr=card.getBoundingClientRect(),point=map.latLngToContainerPoint(popup.getLatLng());
  if(!mr.width||!mr.height||!cr.width||!cr.height)return;
  const margin=24,cardLeft=cr.left-mr.left,cardRight=cr.right-mr.left,cardTop=cr.top-mr.top;
  let safeLeft=margin,safeRight=mr.width-margin,safeTop=margin,safeBottom=mr.height-margin;
  if(mr.width<=760)safeBottom=Math.min(safeBottom,cardTop-margin);
  else if(cardRight<=mr.width/2)safeLeft=Math.max(safeLeft,cardRight+margin);
  else safeRight=Math.min(safeRight,cardLeft-margin);
  if(safeRight<=safeLeft||safeBottom<=safeTop)return;
  const targetX=Math.max(safeLeft,Math.min(point.x,safeRight));
  const preferredY=safeTop+(safeBottom-safeTop)*.42;
  const targetY=Math.max(safeTop,Math.min(point.y,Math.min(safeBottom,preferredY)));
  const dx=point.x-targetX,dy=point.y-targetY;
  if(Math.abs(dx)<2&&Math.abs(dy)<2)return;
  autoPan.x+=dx;autoPan.y+=dy;
  map.panBy([dx,dy],{animate:true,duration:.28,easeLinearity:.35});
}
function scheduleAnchorVisibility(){cancelAnimationFrame(panRaf);panRaf=requestAnimationFrame(()=>keepAnchorVisible());}
function positionCard(native,ensureVisible=true){
  const card=ensureCard(),map=$('#manistee-map');if(!card||!map||card.hidden)return;
  cancelAnimationFrame(layoutRaf);layoutRaf=requestAnimationFrame(()=>{
    const mr=map.getBoundingClientRect(),nr=native.getBoundingClientRect(),cr=card.getBoundingClientRect();if(!mr.width||!cr.width)return;
    if(mr.width<=760){card.style.left='10px';card.style.right='10px';card.style.top='auto';card.style.bottom='10px';if(ensureVisible)scheduleAnchorVisibility();return;}
    card.style.right='auto';card.style.bottom='auto';
    const anchorX=nr.left+nr.width/2-mr.left,anchorY=nr.bottom-mr.top;
    const gap=22,rightSpace=mr.width-anchorX,leftSpace=anchorX;
    let left=rightSpace>=leftSpace?anchorX+gap:anchorX-cr.width-gap;
    left=Math.max(12,Math.min(left,mr.width-cr.width-12));
    let top=anchorY-cr.height/2;top=Math.max(12,Math.min(top,mr.height-cr.height-12));
    card.style.left=`${Math.round(left)}px`;card.style.top=`${Math.round(top)}px`;
    if(ensureVisible)scheduleAnchorVisibility();
  });
}
function syncNative(native){
  const content=$('.leaflet-popup-content',native),card=ensureCard();if(!content||!card)return;
  const body=$('.manistee-detached-body',card),html=content.innerHTML;
  if(body.dataset.sourceHtml!==html){body.innerHTML=html;body.dataset.sourceHtml=html;}
  activeNative=native;card.hidden=false;positionCard(native,true);
}
function scan(){
  setupKey();
  const popups=$$('#manistee-map .leaflet-popup.manistee-rich-popup');
  const native=popups.at(-1)||null;
  if(native)syncNative(native);else if(activeNative)hideCard(true);
}
function init(){
  installStyles();hookLeafletPopups();ensureCard();
  const observer=new MutationObserver(()=>queueMicrotask(scan));observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  document.addEventListener('click',e=>{if(!e.target.closest('#manistee-river-key')&&!e.target.closest('.manistee-key-toggle-v2'))closeKey();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeKey();const x=$('#manistee-map .leaflet-popup.manistee-rich-popup .leaflet-popup-close-button');if(x)x.click();else hideCard(true);}});
  window.addEventListener('resize',()=>activeNative&&positionCard(activeNative,true));
  scan();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.ManisteeMapFlowV2Test={setupKey,positionCard,syncNative,keepAnchorVisible,restoreAutoPan};
})();