'use strict';
/**
 * Read-only historical satellite layer UI. Never creates a parking/directions
 * link and never supplies imagery as real-time clearance evidence.
 */
(function(){
 const S=window.WinterHikeSatellite;
 if(!S)return;
 const $=id=>document.getElementById(id);
 const id='historic-modis',state={
  map:null,scene:null,initialised:false,selectedPoint:null,tileFailures:0
 };
 const safe=fn=>{try{fn()}catch(e){status('Satellite overlay unavailable; the trail map remains usable.')}};
 const status=t=>{if($('sat-status'))$('sat-status').textContent=t};
 function clear(map){
  if(!map)return;
  if(map.getLayer?.(id))map.removeLayer(id);
  if(map.getSource?.(id))map.removeSource(id);
 }
 function visible(){return $('sat-show')?.checked===true}
 function apply(){
  const map=state.map;
  if(!map||!map.isStyleLoaded?.())return;
  safe(()=>{
   clear(map);
   if(!visible()){
    status('Historical imagery hidden. Trail markers remain reference locations, not verified winter parking.');
    return;
   }
   const day=$('sat-date').value,mode=$('sat-mode').value;
   const scene=S.scene(mode,day);
   if(!scene){status('Choose a valid historical date, earlier than today. No satellite claim is available.');return;}
   state.scene=scene;state.tileFailures=0;
   map.addSource(id,{type:'raster',tiles:[scene.tile],tileSize:scene.tileSize,
    minzoom:0,maxzoom:scene.maxzoom,attribution:'NASA GIBS / NASA ESDIS · MODIS Terra'});
   map.addLayer({id,type:'raster',source:id,
    paint:{'raster-opacity':Number($('sat-opacity').value)/100,
      'raster-fade-duration':200}},'winter-area-ring');
   status('Requested '+scene.label+' for '+scene.date+
    '. Historic regional imagery, not a verified clear-sky observation. Cloud and missing tiles can conceal the land; no parking-plow conclusion.');
  });
 }
 function resetDate(day){
  if(!S.validHistoricalDay(day)){
   // Never leave yesterday's raster visible underneath an invalid/new date label.
   $('sat-show').checked=false;
   safe(()=>clear(state.map));
   status('Invalid date. Historical overlay hidden; choose a past day starting March 1, 2000.');
   return false;
  }
  $('sat-date').value=day;$('sat-show').checked=true;apply();
  $('sat-prev').disabled=!S.moveDay(day,-1);
  $('sat-next').disabled=!S.moveDay(day,1);
  return true;
 }
 function init(){
  if(state.initialised||!$('sat-mode')||!$('sat-date'))return;
  state.initialised=true;
  $('sat-date').min=S.START;
  $('sat-date').max=S.latestHistoricalDay();
  const dates=S.historicalPresets();
  $('sat-preset').replaceChildren();
  let o=document.createElement('option');o.value='';o.textContent='Choose a past winter';$('sat-preset').append(o);
  for(const d of dates){const opt=document.createElement('option');opt.value=d;
   opt.textContent=d.slice(0,4)+' · '+new Date(d+'T12:00:00Z').toLocaleString('en-US',{month:'short',day:'numeric',timeZone:'UTC'});
   $('sat-preset').append(opt)}
  $('sat-date').value=dates[0]||'2025-02-15';
  $('sat-show').addEventListener('change',apply);
  $('sat-mode').addEventListener('change',apply);
  $('sat-date').addEventListener('change',()=>resetDate($('sat-date').value));
  $('sat-preset').addEventListener('change',()=>{
   if($('sat-preset').value)resetDate($('sat-preset').value);
  });
  for(const [name,increment] of [['sat-prev',-1],['sat-next',1]]){
   $(name).addEventListener('click',()=>{
    const day=S.moveDay($('sat-date').value,increment);
    if(day)resetDate(day);
   });
  }
  $('sat-opacity').addEventListener('input',()=>{
   const v=Number($('sat-opacity').value);
   $('sat-opacity-text').textContent=v+'%';
   if(visible()&&state.map?.getLayer(id))state.map.setPaintProperty(id,'raster-opacity',v/100);
  });
  $('sat-focus').addEventListener('click',()=>{
   const point=state.selectedPoint;
   if(!point||!state.map)return;
   state.map.easeTo({center:[point.lon,point.lat],zoom:Math.max(7.2,Math.min(8,state.map.getZoom())),
    duration:350});
   status('Zoomed to a trail-area reference, not a plowed parking lot. Choose an image date to compare seasonal snow.');
  });
  $('sat-focus').disabled=true;
  resetDate($('sat-date').value);
  $('sat-show').checked=false;status('Historical scene selected. Turn on MODIS imagery to inspect a past winter.');
 }
 function attach(map){
  state.map=map;
  if(visible())apply();
 }
 function selected(route){
  const p=route?.point;
  state.selectedPoint=p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)?p:null;
  if($('sat-focus'))$('sat-focus').disabled=!state.selectedPoint;
 }
 function reportTileError(){
  if(!visible())return;
  state.tileFailures++;
  status('NASA imagery tile could not be retrieved for the selected date or area. Treat this scene as unavailable, not snow-free. The base map and route list remain available.');
 }
 function goToDate(day,mode='snowCover'){
  if(!S.validHistoricalDay(day))return false;
  if(!state.initialised)init();
  if(!state.initialised)return false;
  if(S.MODES[mode])$('sat-mode').value=mode;
  const ok=resetDate(day);
  if(ok)document.querySelector?.('.satellite-console')?.scrollIntoView({block:'nearest',behavior:'smooth'});
  return ok;
 }
 window.WinterHikeSatelliteUI={init,attach,selected,reportTileError,goToDate};
})();
