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
 const CARTO_DARK_STYLE="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";
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
  let userLocation=null,activeStyle="day",handlersBound=false,errorCount=0;
  // Capture the URL before app.js calls pick(), which writes an initial #detroit hash.
  // Only incoming shared links should auto-zoom; ordinary visits need a full-region view.
  const incomingDeepLink=typeof location!=="undefined" && location.hash ? location.hash.slice(1) : "";
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
  const near=document.createElement("button");near.type="button";near.textContent="Near me";near.setAttribute("aria-label","Find the nearest listed public eagle viewing location using your location");
  const theme=document.createElement("button");theme.type="button";theme.textContent="Night map";theme.setAttribute("aria-label","Switch CARTO between day and night basemaps");theme.hidden=true;
  buttons.append(all,focus,near,theme);holder.append(buttons);
  const notice=document.createElement("div");notice.className="eagle-map-key";notice.textContent="Green = grouped viewing locations · Blue = individual spot · Amber = selected spot. Numbers are location IDs or groups, NOT eagle counts.";
  holder.append(notice);
  const positionNote=document.createElement("div");positionNote.className="eagle-location-note";positionNote.setAttribute("role","status");positionNote.hidden=true;holder.append(positionNote);
  const milesBetween=(a,b)=>{
    const rad=n=>n*Math.PI/180,dlat=rad(a.lat-b.lat),dlon=rad(a.lon-b.lon);
    const h=Math.sin(dlat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dlon/2)**2;
    return 3958.76*2*Math.asin(Math.min(1,Math.sqrt(h)));
  };
  function updateOverlay(){
    const s=byId.get(selectedId);if(!s)return;
    strong.textContent=s.name;sub.textContent=s.city+", "+s.state;
    if(userLocation){
      const miles=Math.round(milesBetween({lat:userLocation.latitude,lon:userLocation.longitude},s));
      positionNote.hidden=false;positionNote.textContent="Your position (approx.) · "+miles+" mi straight-line to selected overlook. Not driving distance.";
    }
  }

  // MapLibre popup follows the actual map coordinate, unlike the fixed overlay.
  let popup=null,showSelectedPopup=false;
  function clearPopup(){const old=popup;popup=null;if(old)old.remove()}
  function markerPopup(){
    if(!ready||!map||!showSelectedPopup||typeof MapGL.Popup!=="function")return;
    const s=byId.get(selectedId);
    if(!s||!visible.some(v=>v.id===s.id)){clearPopup();return}
    clearPopup();
    const card=document.createElement("div");card.className="eagle-pin-card";
    const heading=document.createElement("strong");heading.textContent=s.name;
    const where=document.createElement("small");where.textContent=s.city+", "+s.state+" · public viewing site";
    const guidance=document.createElement("p");guidance.textContent=s.look||s.water||"Check posted access information before visiting.";
    card.append(heading,where,guidance);
    if(userLocation){
      const dist=document.createElement("small");
      dist.textContent=Math.round(milesBetween({lat:userLocation.latitude,lon:userLocation.longitude},s))+" straight-line miles from your location";
      card.append(dist);
    }
    const links=document.createElement("div");links.className="eagle-pin-links";
    const details=document.createElement("a");details.href="#location-details";details.textContent="Full spot guide ↓";
    const official=document.createElement("a");official.href=s.source||"#location-details";official.textContent="Official access ↗";official.target="_blank";official.rel="noopener";
    links.append(details,official);card.append(links);
    const active=new MapGL.Popup({closeButton:true,closeOnClick:false,className:"eagle-pin-popup",offset:22,maxWidth:"300px"})
      .setLngLat([s.lon,s.lat]).setDOMContent(card).addTo(map);
    popup=active;
    if(typeof active.on==="function")active.on("close",()=>{if(popup===active){popup=null;showSelectedPopup=false}});
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
    if(!ready||!map||!visible.length)return;
    const b=allBounds();
    if(b[0][0]===b[1][0]){map.easeTo({center:b[0],zoom:8});return}
    map.fitBounds(b,{padding:{top:54,bottom:126,left:36,right:36},maxZoom:8,duration:500});
  }
  function centerSelected(){
    if(!ready||!map)return;
    const s=byId.get(selectedId);if(s)map.easeTo({center:[s.lon,s.lat],zoom:Math.max(8.3,map.getZoom()),offset:[0,70],duration:450});
  }
  all.addEventListener("click",()=>{showSelectedPopup=false;clearPopup();fitAll()});focus.addEventListener("click",()=>{showSelectedPopup=true;centerSelected();markerPopup()});
  near.addEventListener("click",()=>{if(typeof opts.onLocate==="function")opts.onLocate()});
  theme.addEventListener("click",()=>{
    if(!ready||provider!=="carto"||!map||typeof map.setStyle!=="function")return;
    activeStyle=activeStyle==="day"?"night":"day";
    theme.textContent=activeStyle==="day"?"Night map":"Day map";
    try{map.setStyle(cartoResourceUrl(activeStyle==="day"?CARTO_STYLE:CARTO_DARK_STYLE,key))}
    catch{degrade("CARTO style switch failed")}
  });
  function addUserLocation(){
    if(!map||!userLocation)return;
    const geo={type:"FeatureCollection",features:[{type:"Feature",geometry:{type:"Point",coordinates:[userLocation.longitude,userLocation.latitude]},properties:{}}]};
    const source=map.getSource("eagle-visitor");
    if(source){source.setData(geo);return}
    map.addSource("eagle-visitor",{type:"geojson",data:geo});
    map.addLayer({id:"eagle-visitor-ring",type:"circle",source:"eagle-visitor",
      paint:{"circle-radius":14,"circle-color":"#fff","circle-opacity":.48,"circle-stroke-color":"#183f73","circle-stroke-width":2}});
    map.addLayer({id:"eagle-visitor-center",type:"circle",source:"eagle-visitor",
      paint:{"circle-radius":5,"circle-color":"#163e8d","circle-stroke-color":"#fff","circle-stroke-width":2}});
  }
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
       "circle-color":["case",["boolean",["get","selected"],false],"#a86119","#286382"],
       "circle-stroke-color":"#ffffff","circle-stroke-width":2.5
      }});
    map.addLayer({id:"eagle-pin-number",type:"symbol",source:"eagle-sites",filter:["!",["has","point_count"]],
      layout:{"text-field":["get","number"],"text-size":11,"text-font":["Noto Sans Bold","Arial Unicode MS Bold"]},
      paint:{"text-color":"#ffffff"}});
    if(!handlersBound){
    let lastNativeClick=null;
    const tapPin=e=>{
      // Number label and circle are separate GL layers but one pointer action.
      if(e.originalEvent&&e.originalEvent===lastNativeClick)return;
      if(e.originalEvent)lastNativeClick=e.originalEvent;
      const id=e.features?.[0]?.properties?.id,s=byId.get(id);
      if(s)onSelect(s);
    };
    map.on("click","eagle-pin-halo",tapPin);
    map.on("click","eagle-pin-number",tapPin);
    map.on("click","eagle-cluster",e=>{
      showSelectedPopup=false;clearPopup();
      const feature=e.features?.[0],clusterId=feature?.properties?.cluster_id;
      const source=map.getSource("eagle-sites");if(clusterId==null||!source)return;
      source.getClusterExpansionZoom(clusterId).then(z=>{
        if(!retired)map.easeTo({center:feature.geometry.coordinates,zoom:z,duration:350});
      }).catch(()=>{});
    });
    handlersBound=true;
    for(const id of ["eagle-pin-halo","eagle-pin-number","eagle-cluster"]){
      map.on("mouseenter",id,()=>{map.getCanvas().style.cursor="pointer"});
      map.on("mouseleave",id,()=>{map.getCanvas().style.cursor=""});
    }
    }
    addUserLocation();
  }
  function stopTimer(){if(loadTimer){clearTimeout(loadTimer);loadTimer=null}}
  function failNative(){
    if(retired)return;
    clearPopup();stopTimer();ready=false;
    if(map){map.remove();map=null}
    if(caption)caption.textContent="Basemap unavailable. Using the accessible local reference map and location list.";
    if(typeof opts.onFatal==="function"){retired=true;opts.onFatal()}
  }
  function degrade(reason){
    if(failedOver||retired)return;failedOver=true;clearPopup();stopTimer();
    if(map){map.remove();map=null}
    ready=false;provider="openfreemap";key="";activeStyle="day";theme.hidden=true;
    if(caption)caption.textContent="OpenFreeMap vector map (CARTO temporarily unavailable). Zoom, pan and select public viewing spots.";
    load(FALLBACK_STYLE,false);
  }
  function load(style,isCarto){
    if(retired)return;
    ready=false;started=true;handlersBound=false;errorCount=0;
    const MapConstructor=MapGL.Map;
    let instance;
    try{
      instance=new MapConstructor({
       container:viewport,style,center:[-89.3,43.5],zoom:4.7,minZoom:3,maxZoom:17,
       attributionControl:false,dragRotate:false,pitchWithRotate:false,
       transformRequest:(url)=>({url:isCarto?cartoResourceUrl(url,key):url})
      });
    }catch(err){if(isCarto)degrade("CARTO initialization failed");else failNative();return}
    map=instance;
    theme.hidden=!isCarto;
    map.addControl(new MapGL.NavigationControl({showCompass:false,visualizePitch:false}),"top-right");
    map.addControl(new MapGL.AttributionControl({compact:true}),"bottom-right");
    loadTimer=setTimeout(()=>{if(!ready){if(isCarto)degrade("CARTO timeout");else failNative()}},12000);
    instance.on("error",()=>{
      if(retired||map!==instance)return;
      if(isCarto){degrade("CARTO vector request failed");return}
      errorCount++;
      if(!ready||errorCount>=3)failNative();
    });
    instance.on("style.load",()=>{
      if(retired||map!==instance||!ready)return;
      try{addSiteLayers();redraw();markerPopup()}catch{if(isCarto)degrade("CARTO restyle failed");else failNative()}
    });
    instance.on("load",()=>{
      if(retired||map!==instance)return;
      stopTimer();
      try{
       addSiteLayers();ready=true;redraw();
       if(caption)caption.textContent=(isCarto?"CARTO Voyager":"OpenFreeMap Liberty")+" vector map · zoom, drag or tap numbered eagle watching locations. © OpenStreetMap contributors"+(isCarto?", © CARTO":", OpenMapTiles")+".";
       if(!focusedOnce&&incomingDeepLink&&byId.has(incomingDeepLink)){focusedOnce=true;showSelectedPopup=true;centerSelected();markerPopup()}
       else{fitAll();markerPopup()}
      }catch(err){if(isCarto)degrade("Map layer setup failed");else failNative()}
    });
  }
  function select(s){
    if(!s||!byId.has(s.id))return;
    const changed=selectedId!==s.id;selectedId=s.id;latestFocus=s.id;updateOverlay();redraw();
    if(ready){showSelectedPopup=true;if(changed)centerSelected();markerPopup()}
  }
  function showUserLocation(coords){
    if(retired||!coords||!Number.isFinite(coords.latitude)||!Number.isFinite(coords.longitude))return;
    if(Math.abs(coords.latitude)>90||Math.abs(coords.longitude)>180)return;
    userLocation={latitude:coords.latitude,longitude:coords.longitude};
    updateOverlay();if(ready){try{addUserLocation()}catch{}markerPopup()}
  }
  function filter(matching){
    const set=new Set((matching||[]).map(s=>s.id));
    visible=[...byId.values()].filter(s=>set.has(s.id));
    redraw();
    if(!visible.some(s=>s.id===selectedId)){showSelectedPopup=false;clearPopup()}
    else if(showSelectedPopup)markerPopup();
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
  return {select,filter,fitAll,focus:centerSelected,showUserLocation,getProvider:()=>provider,dispose:()=>{retired=true;stopTimer();clearPopup();if(map)map.remove()}};
 }
 return {init,cartoResourceUrl,placeData,CARTO_STYLE,CARTO_DARK_STYLE,FALLBACK_STYLE};
});
