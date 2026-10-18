/* First-party eagle map controller.
   Preferred: CARTO Voyager vector tiles with a domain-restricted Basemaps key.
   Key absent or rejected: OpenFreeMap Liberty vector basemap, never CARTO watermarks.
   Location pins are public watching corridors, NOT eagle nests or live sightings.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 if(root)root.EagleMap=api;
})(typeof window!=="undefined"?window:null,function(){
 "use strict";
 const CARTO_HOST="basemaps.cartocdn.com";
 const CARTO_STYLE="https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json";
 const FALLBACK_STYLE="https://tiles.openfreemap.org/styles/liberty";
 function cartoResourceUrl(url,key){
  if(!key||typeof url!=="string")return url;
  try{
   const u=new URL(url);
   if(u.protocol!=="https:"||u.hostname!==CARTO_HOST)return url;
   u.searchParams.set("key",key);
   return u.toString();
  }catch{return url}
 }
 function placeData(spots){
  return {type:"FeatureCollection",features:spots.map((s,i)=>({
    type:"Feature",id:s.id,geometry:{type:"Point",coordinates:[s.lon,s.lat]},
    properties:{id:s.id,number:String(s.number||i+1),name:s.name,region:s.city+", "+s.state,type:s.type,selected:!!s.selected}
  }))};
 }
 function init(opts){
  const {holder,caption,spots,onSelect,getSelected}=opts;
  const MapGL=opts.maplibregl||(typeof window!=="undefined"?window.maplibregl:null);
  if(!holder||!MapGL||!Array.isArray(spots)||!spots.length)return null;
  const byId=new Map(spots.map((s,i)=>[s.id,{...s,number:i+1}]));
  let visible=[...byId.values()],selectedId=getSelected()?.id||spots[0].id, map=null,ready=false,started=false;
  let provider="openfreemap",key="",loadTimer=null,retired=false,failedOver=false;
  let latestFocus=selectedId,focusedOnce=false;
  holder.replaceChildren();
  holder.classList.add("eagle-vector-map");
  holder.classList.remove("native-map");
  const viewport=document.createElement("div");viewport.className="eagle-vector-viewport";
  holder.append(viewport);
  const overlay=document.createElement("div");overlay.className="eagle-map-overlay";overlay.setAttribute("aria-live","polite");
  const strong=document.createElement("strong");const sub=document.createElement("span");
  const link=document.createElement("a");link.href="#location-details";link.textContent="View access & trip details ↓";
  overlay.append(strong,sub,link);holder.append(overlay);
  const buttons=document.createElement("div");buttons.className="eagle-map-extra-controls";
  const all=document.createElement("button");all.type="button";all.textContent="View all";all.setAttribute("aria-label","Show all matching eagle watching spots");
  const focus=document.createElement("button");focus.type="button";focus.textContent="Focus spot";focus.setAttribute("aria-label","Zoom to the currently selected eagle watching destination");
  buttons.append(all,focus);holder.append(buttons);
  const notice=document.createElement("div");notice.className="eagle-map-key";notice.textContent="Map locations mark publicly described viewing opportunities—not nests, cartwheels or current sightings.";
  holder.append(notice);
  function updateOverlay(){
    const s=byId.get(selectedId);if(!s)return;
    strong.textContent=s.name;sub.textContent=s.city+", "+s.state;
  }
  function featureCollection(){
    return placeData(visible.map(s=>({...s,selected:s.id===selectedId})));
  }
  function redraw(){
    if(!ready||!map)return;
    const source=map.getSource("eagle-sites");if(source)source.setData(featureCollection());
  }
  function allBounds(){
    const features=visible.length?visible:[...byId.values()];
    return features.reduce((bounds,s)=>{
      bounds[0][0]=Math.min(bounds[0][0],s.lon);bounds[0][1]=Math.min(bounds[0][1],s.lat);
      bounds[1][0]=Math.max(bounds[1][0],s.lon);bounds[1][1]=Math.max(bounds[1][1],s.lat);
      return bounds;
    },[[180,85],[-180,-85]]);
  }
  function fitAll(){
    if(!ready||!map)return;
    const b=allBounds();
    if(b[0][0]===b[1][0]){map.easeTo({center:b[0],zoom:8});return}
    map.fitBounds(b,{padding:{top:54,bottom:126,left:36,right:36},maxZoom:8,duration:500});
  }
  function centerSelected(){
    if(!ready||!map)return;
    const s=byId.get(selectedId);if(s)map.easeTo({center:[s.lon,s.lat],zoom:Math.max(8.3,map.getZoom()),duration:550});
  }
  all.addEventListener("click",fitAll);focus.addEventListener("click",centerSelected);
  function addSiteLayers(){
    if(!map||map.getSource("eagle-sites"))return;
    map.addSource("eagle-sites",{type:"geojson",data:featureCollection(),cluster:true,clusterMaxZoom:12,clusterRadius:43});
    map.addLayer({id:"eagle-cluster",type:"circle",source:"eagle-sites",
      filter:["has","point_count"],paint:{
       "circle-color":"#245a43","circle-opacity":.95,
       "circle-stroke-color":"#fffaf0","circle-stroke-width":2.5,
       "circle-radius":["step",["get","point_count"],18,5,24,12,29]
      }});
    map.addLayer({id:"eagle-cluster-count",type:"symbol",source:"eagle-sites",filter:["has","point_count"],
      layout:{"text-field":["get","point_count_abbreviated"],"text-size":13,"text-font":["Noto Sans Bold","Arial Unicode MS Bold"]},
      paint:{"text-color":"#ffffff"}});
    map.addLayer({id:"eagle-pin-halo",type:"circle",source:"eagle-sites",filter:["!",["has","point_count"]],
      paint:{
       "circle-radius":["case",["boolean",["get","selected"],false],14,11],
       "circle-color":["case",["boolean",["get","selected"],false],"#c78a37","#255841"],
       "circle-stroke-color":"#ffffff","circle-stroke-width":2.5
      }});
    map.addLayer({id:"eagle-pin-number",type:"symbol",source:"eagle-sites",filter:["!",["has","point_count"]],
      layout:{"text-field":["get","number"],"text-size":11,"text-font":["Noto Sans Bold","Arial Unicode MS Bold"]},
      paint:{"text-color":"#ffffff"}});
    map.on("click","eagle-pin-halo",e=>{
      const feature=e.features?.[0];const id=feature?.properties?.id,s=byId.get(id);
      if(s)onSelect(s);
    });
    map.on("click","eagle-cluster",e=>{
      const feature=e.features?.[0],clusterId=feature?.properties?.cluster_id;
      const source=map.getSource("eagle-sites");if(clusterId==null||!source)return;
      source.getClusterExpansionZoom(clusterId).then(z=>{
        if(!retired)map.easeTo({center:feature.geometry.coordinates,zoom:z,duration:350});
      }).catch(()=>{});
    });
    for(const id of ["eagle-pin-halo","eagle-cluster"]){
      map.on("mouseenter",id,()=>{map.getCanvas().style.cursor="pointer"});
      map.on("mouseleave",id,()=>{map.getCanvas().style.cursor=""});
    }
  }
  function stopTimer(){if(loadTimer){clearTimeout(loadTimer);loadTimer=null}}
  function degrade(reason){
    if(failedOver||retired)return;failedOver=true;stopTimer();
    if(map){map.remove();map=null}
    ready=false;provider="openfreemap";key="";
    if(caption)caption.textContent="OpenFreeMap vector map (CARTO temporarily unavailable). Zoom, pan and select public viewing spots.";
    load(FALLBACK_STYLE,false);
  }
  function load(style,isCarto){
    if(retired)return;
    ready=false;started=true;
    const MapConstructor=MapGL.Map;
    let instance;
    try{
      instance=new MapConstructor({
       container:viewport,style,center:[-89.3,43.5],zoom:4.7,minZoom:3,maxZoom:17,
       attributionControl:false,dragRotate:false,pitchWithRotate:false,
       transformRequest:(url)=>({url:isCarto?cartoResourceUrl(url,key):url})
      });
    }catch(err){if(isCarto){degrade("CARTO initialization failed");return}if(caption)caption.textContent="Interactive map unavailable. Use the location list and directions below.";return}
    map=instance;
    map.addControl(new MapGL.NavigationControl({showCompass:false,visualizePitch:false}),"top-right");
    map.addControl(new MapGL.AttributionControl({compact:true}),"bottom-right");
    if(isCarto){loadTimer=setTimeout(()=>{if(!ready)degrade("CARTO timeout")},12000)}
    instance.on("error",()=>{
      if(isCarto){degrade("CARTO vector request failed")}
      else if(!ready&&caption)caption.textContent="Basemap is loading slowly. The location list and driving directions remain usable.";
    });
    instance.on("load",()=>{
      if(retired||map!==instance)return;
      stopTimer();
      try{
       addSiteLayers();ready=true;redraw();
       if(caption)caption.textContent=(isCarto?"CARTO Voyager":"OpenFreeMap Liberty")+" vector map · zoom, drag or tap numbered eagle watching locations. © OpenStreetMap contributors"+(isCarto?", © CARTO":", OpenMapTiles")+".";
       if(!focusedOnce&&typeof location!=="undefined"&&location.hash&&byId.has(location.hash.slice(1))){focusedOnce=true;centerSelected()}
       else fitAll();
      }catch(err){if(isCarto)degrade("Map layer setup failed");else if(caption)caption.textContent="Map points unavailable. Choose a location from the accessible list."}
    });
  }
  function select(s){
    if(!s||!byId.has(s.id))return;
    const changed=selectedId!==s.id;selectedId=s.id;latestFocus=s.id;updateOverlay();redraw();
    if(changed&&ready)centerSelected();
  }
  function filter(matching){
    const set=new Set((matching||[]).map(s=>s.id));
    visible=[...byId.values()].filter(s=>set.has(s.id));
    redraw();
    if(ready&&visible.length)fitAll();
  }
  updateOverlay();
  if(caption)caption.textContent="Loading full geographic basemap and public eagle viewing locations…";
  // Never request an unkeyed CARTO style or watermarked raster tile.
  fetch("/api/eagle-basemap-config",{headers:{Accept:"application/json"},cache:"no-store"})
   .then(r=>{if(!r.ok)throw Error("Map config unavailable");return r.json()})
   .then(cfg=>{
     if(retired)return;
     if(cfg.provider==="carto"&&cfg.enabled===true&&typeof cfg.key==="string"&&cfg.key.length>=10){
       provider="carto";key=cfg.key;load(cartoResourceUrl(CARTO_STYLE,key),true);
     }else load(FALLBACK_STYLE,false);
   }).catch(()=>{if(!retired)load(FALLBACK_STYLE,false)});
  return {select,filter,fitAll,focus:centerSelected,getProvider:()=>provider,dispose:()=>{retired=true;stopTimer();if(map)map.remove()}};
 }
 return {init,cartoResourceUrl,placeData,CARTO_STYLE,FALLBACK_STYLE};
});
