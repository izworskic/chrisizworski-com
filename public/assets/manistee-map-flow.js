(()=>{
'use strict';
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>[...r.querySelectorAll(s)];
let resizeTimer=null;

function installStyles(){
  if($('#manistee-map-flow-styles'))return;
  const style=document.createElement('style');
  style.id='manistee-map-flow-styles';
  style.textContent=`
  .manistee-key-toggle{position:absolute;z-index:695;left:14px;bottom:58px;min-height:38px;padding:7px 11px;border:1px solid rgba(31,61,51,.22);border-radius:8px;background:rgba(255,255,255,.96);box-shadow:0 3px 12px rgba(0,0,0,.14);font:700 11px/1 Inter,system-ui,sans-serif;color:#29463d;cursor:pointer}
  .manistee-key-toggle:hover,.manistee-key-toggle[aria-expanded="true"]{background:#fff;border-color:#5f7e73}
  .manistee-river-key[data-flow-key="true"]{display:none!important;left:14px!important;bottom:104px!important;width:210px!important;max-height:min(52vh,310px)!important;overflow:auto!important}
  .manistee-river-key[data-flow-key="true"][data-open="true"]{display:block!important}
  .manistee-rich-popup.flow-detached .leaflet-popup-tip-container{display:none!important}
  .manistee-rich-popup.flow-detached{pointer-events:none;margin-bottom:0}
  .manistee-rich-popup.flow-detached .leaflet-popup-content-wrapper{pointer-events:auto;width:min(540px,calc(100vw - 56px));max-width:none!important;max-height:min(58vh,440px);border-radius:9px;box-shadow:0 10px 34px rgba(18,35,29,.24);overflow:hidden}
  .manistee-rich-popup.flow-detached .leaflet-popup-content{width:auto!important;max-height:min(58vh,440px);overflow:auto;margin:0!important}
  .manistee-rich-popup.flow-detached .leaflet-popup-close-button{pointer-events:auto;width:34px;height:34px;line-height:32px;font-size:20px;color:#52635d!important;z-index:3}
  .manistee-rich-popup.flow-detached .mrp-card{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:0 14px;padding:14px 16px 12px}
  .manistee-rich-popup.flow-detached .mrp-card>.mrp-kicker,.manistee-rich-popup.flow-detached .mrp-card>h3,.manistee-rich-popup.flow-detached .mrp-card>.mrp-reach,.manistee-rich-popup.flow-detached .mrp-card>.mrp-chips,.manistee-rich-popup.flow-detached .mrp-card>.mrp-note,.manistee-rich-popup.flow-detached .mrp-card>.mrp-facts{grid-column:1}
  .manistee-rich-popup.flow-detached .mrp-card>.mrp-live{grid-column:2;grid-row:1 / span 7;border:0;border-left:1px solid #e1e6e2;margin:0;padding:2px 0 2px 14px;min-width:0}
  .manistee-rich-popup.flow-detached .mrp-live-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
  .manistee-rich-popup.flow-detached .mrp-live-grid section{min-width:0}
  .manistee-rich-popup.flow-detached .mrp-card>.mrp-actions,.manistee-rich-popup.flow-detached .mrp-card>.mrp-source,.manistee-rich-popup.flow-detached .mrp-card>.mrp-caution{grid-column:1 / -1}
  .manistee-rich-popup.flow-detached .mrp-river>.mrp-note,.manistee-rich-popup.flow-detached .mrp-gauge>.mrp-live-badge{grid-column:1 / -1}
  .manistee-rich-popup.flow-detached .mrp-river>.mrp-stat-list,.manistee-rich-popup.flow-detached .mrp-gauge>.mrp-stat-list{grid-column:1 / -1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px}
  .manistee-rich-popup.flow-detached .mrp-river>.mrp-kicker,.manistee-rich-popup.flow-detached .mrp-river>h3,.manistee-rich-popup.flow-detached .mrp-gauge>.mrp-kicker,.manistee-rich-popup.flow-detached .mrp-gauge>h3{grid-column:1 / -1}
  .manistee-rich-popup.flow-detached .mrp-note{max-height:82px;overflow:auto}
  .manistee-rich-popup.flow-detached .mrp-facts{grid-template-columns:1fr 1fr}
  .manistee-rich-popup.flow-detached .mrp-actions{margin-top:10px;padding-top:8px;border-top:1px solid #e8ebe8}
  @media(max-width:860px){
    .manistee-rich-popup.flow-detached .leaflet-popup-content-wrapper{width:min(500px,calc(100vw - 30px));max-height:52vh}
    .manistee-rich-popup.flow-detached .leaflet-popup-content{max-height:52vh}
    .manistee-rich-popup.flow-detached .mrp-card{grid-template-columns:1fr 1fr;gap:0 10px}
    .manistee-rich-popup.flow-detached .mrp-card>.mrp-live{grid-column:1 / -1;grid-row:auto;border-left:0;border-top:1px solid #e1e6e2;margin-top:8px;padding:9px 0 0}
  }
  @media(max-width:560px){
    .manistee-key-toggle{left:10px;bottom:46px;min-height:40px}
    .manistee-river-key[data-flow-key="true"]{left:10px!important;bottom:94px!important;width:min(230px,calc(100vw - 20px))!important}
    .manistee-rich-popup.flow-detached .leaflet-popup-content-wrapper{width:calc(100vw - 24px);max-height:48vh}
    .manistee-rich-popup.flow-detached .leaflet-popup-content{max-height:48vh}
    .manistee-rich-popup.flow-detached .mrp-card{grid-template-columns:1fr;padding:12px 13px 11px}
    .manistee-rich-popup.flow-detached .mrp-card>*{grid-column:1!important;grid-row:auto!important}
    .manistee-rich-popup.flow-detached .mrp-live-grid,.manistee-rich-popup.flow-detached .mrp-river>.mrp-stat-list,.manistee-rich-popup.flow-detached .mrp-gauge>.mrp-stat-list{grid-template-columns:repeat(2,minmax(0,1fr))}
    .manistee-rich-popup.flow-detached .mrp-facts{grid-template-columns:1fr 1fr}
    .manistee-rich-popup.flow-detached .mrp-note{max-height:62px}
  }`;
  document.head.appendChild(style);
}

function closeKey(key,toggle){
  key.dataset.open='false';
  toggle.setAttribute('aria-expanded','false');
}
function enhanceKey(key){
  if(key.dataset.flowKey==='true')return;
  key.dataset.flowKey='true';
  key.dataset.open='false';
  key.setAttribute('role','dialog');
  key.setAttribute('aria-label','River map key');
  const wrap=key.parentElement;
  if(!wrap)return;
  const toggle=document.createElement('button');
  toggle.type='button';
  toggle.className='manistee-key-toggle';
  toggle.id='manistee-key-toggle';
  toggle.setAttribute('aria-controls','manistee-river-key');
  toggle.setAttribute('aria-expanded','false');
  toggle.textContent='Map key';
  toggle.addEventListener('click',event=>{
    event.stopPropagation();
    const open=key.dataset.open!=='true';
    key.dataset.open=open?'true':'false';
    toggle.setAttribute('aria-expanded',open?'true':'false');
  });
  key.addEventListener('click',event=>event.stopPropagation());
  wrap.appendChild(toggle);
  wrap.addEventListener('click',event=>{if(key.dataset.open==='true'&&!key.contains(event.target)&&event.target!==toggle)closeKey(key,toggle);});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&key.dataset.open==='true')closeKey(key,toggle);});
}

function popupMap(popup){return popup.closest('.leaflet-container')||$('#manistee-map');}
function layoutDetachedPopup(popup){
  if(!popup.isConnected)return;
  const map=popupMap(popup),wrapper=$('.leaflet-popup-content-wrapper',popup);
  if(!map||!wrapper)return;
  popup.style.marginLeft='0px';
  popup.style.marginBottom='0px';
  const mapRect=map.getBoundingClientRect();
  const popupRect=popup.getBoundingClientRect();
  const wrapperRect=wrapper.getBoundingClientRect();
  if(!wrapperRect.width||!wrapperRect.height)return;
  const anchorX=popupRect.left+popupRect.width/2;
  if(mapRect.width>860){
    const dockRight=anchorX < mapRect.left+mapRect.width/2;
    const horizontal=wrapperRect.width/2+18;
    popup.style.marginLeft=`${dockRight?horizontal:-horizontal}px`;
    popup.style.marginBottom=`${-(wrapperRect.height/2+8)}px`;
    popup.dataset.dock=dockRight?'right':'left';
  }else{
    const targetCenter=mapRect.left+mapRect.width/2;
    popup.style.marginLeft=`${targetCenter-anchorX}px`;
    popup.style.marginBottom=`${-(Math.min(wrapperRect.height*.42,150))}px`;
    popup.dataset.dock='center';
  }
}
function schedulePopupLayout(popup){
  cancelAnimationFrame(Number(popup.dataset.flowRaf)||0);
  const raf=requestAnimationFrame(()=>layoutDetachedPopup(popup));
  popup.dataset.flowRaf=String(raf);
}
function enhancePopup(popup){
  if(!popup.classList.contains('manistee-rich-popup')||popup.dataset.flowDetached==='true')return;
  popup.dataset.flowDetached='true';
  popup.classList.add('flow-detached');
  const content=$('.leaflet-popup-content',popup);
  if(content){
    const observer=new MutationObserver(()=>schedulePopupLayout(popup));
    observer.observe(content,{childList:true,subtree:true,characterData:true});
  }
  schedulePopupLayout(popup);
}
function scan(){
  const key=$('#manistee-river-key');if(key)enhanceKey(key);
  $$('.leaflet-popup.manistee-rich-popup').forEach(enhancePopup);
}
function observe(){
  const observer=new MutationObserver(()=>queueMicrotask(scan));
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('resize',()=>{
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(()=>$$('.leaflet-popup.manistee-rich-popup').forEach(schedulePopupLayout),80);
  });
  scan();
}
function init(){installStyles();observe();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.ManisteeMapFlowTest={enhanceKey,layoutDetachedPopup};
})();