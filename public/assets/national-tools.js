(function(){
  const CURRENT_STORE="ci-national-location-v2";
  const LEGACY_STORE="ci-national-location-v1";
  const PLACES_STORE="ci-national-places-v1";

  const ANALYTICS_BLOCKED_KEYS=new Set(["query","q","latitude","longitude","displayName","place","state","postalCode","postcode","location"]);

  function currentSurface(){
    const path=(window.location.pathname||"/").replace(/\/+$/,"")||"/";
    if(path==="/national-tools")return "hub";
    const match=path.match(/^\/national-tools\/([^/]+)/);
    return match?match[1]:"national-tools";
  }
  function ensureAnalytics(){
    window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
    if(document.querySelector('script[data-national-analytics="1"]'))return;
    const script=document.createElement("script");
    script.defer=true;
    script.src="/_vercel/insights/script.js";
    script.dataset.nationalAnalytics="1";
    document.head.appendChild(script);
  }
  function eventData(data){
    const safe={surface:currentSurface()};
    Object.entries(data||{}).forEach(function(entry){
      const key=entry[0],value=entry[1];
      if(ANALYTICS_BLOCKED_KEYS.has(key)||value==null)return;
      if(typeof value==="number"||typeof value==="boolean")safe[key]=value;
      else safe[key]=String(value).slice(0,48);
    });
    return safe;
  }
  function track(name,data){
    ensureAnalytics();
    window.va("event",{name:name,data:eventData(data)});
  }
  function inputType(value){
    return /^\d{5}(?:-\d{4})?$/.test(String(value||"").trim())?"zip":"place";
  }

  function $(sel,root){return (root||document).querySelector(sel)}
  function fmtDate(value){
    if(!value)return "Unknown";
    const d=new Date(value);
    return Number.isNaN(d.getTime())?String(value):d.toLocaleString([], {dateStyle:"medium",timeStyle:"short"});
  }
  function fmtInZone(value,timeZone,options){
    if(!value)return "Unknown";
    const d=new Date(value);if(Number.isNaN(d.getTime()))return String(value);
    const base=options||{dateStyle:"medium",timeStyle:"short"};
    try{return d.toLocaleString([],{...base,timeZone:timeZone||undefined})}catch(_){return d.toLocaleString([],base)}
  }
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function read(key){try{return JSON.parse(localStorage.getItem(key)||"null")}catch(_){return null}}
  function write(key,value){try{localStorage.setItem(key,JSON.stringify(value));return true}catch(_){return false}}
  function locationKey(loc){
    const lat=Number(loc?.latitude),lon=Number(loc?.longitude);
    if(Number.isFinite(lat)&&Number.isFinite(lon))return lat.toFixed(3)+","+lon.toFixed(3);
    return String(loc?.query||loc?.displayName||"").toLowerCase().trim();
  }
  function label(loc){
    return loc?.place&&loc?.stateCode?loc.place+", "+loc.stateCode:(loc?.displayName||"your location").split(",").slice(0,2).join(",");
  }
  function remember(loc){
    if(!loc)return;
    write(CURRENT_STORE,loc);
  }
  function saved(){
    const current=read(CURRENT_STORE);
    if(current)return current;
    const legacy=read(LEGACY_STORE);
    if(legacy){remember(legacy);return legacy}
    return null;
  }
  function savedPlaces(){
    const rows=read(PLACES_STORE);
    return Array.isArray(rows)?rows.filter(Boolean).slice(0,6):[];
  }
  function savePlace(loc){
    if(!loc)return savedPlaces();
    const key=locationKey(loc);
    const next=[loc,...savedPlaces().filter(item=>locationKey(item)!==key)].slice(0,6);
    write(PLACES_STORE,next);
    remember(loc);
    track("National Saved Place",{saved_count:next.length});
    return next;
  }
  function removePlace(locOrKey){
    const key=typeof locOrKey==="string"?locOrKey:locationKey(locOrKey);
    const next=savedPlaces().filter(item=>locationKey(item)!==key);
    write(PLACES_STORE,next);
    return next;
  }
  function withQuery(path,loc){
    const q=loc?.query||label(loc);
    const base=String(path||"").split("?")[0];
    return base+"?q="+encodeURIComponent(q);
  }
  function propagate(loc,root){
    if(!loc)return;
    (root||document).querySelectorAll('a[href^="/national-tools/"]').forEach(function(anchor){
      const href=anchor.getAttribute("href")||"";
      if(href.startsWith("/national-tools/"))anchor.setAttribute("href",withQuery(href,loc));
    });
  }
  async function readJsonResponse(response,fallback){
    const text=await response.text();
    const type=(response.headers.get("content-type")||"").toLowerCase();
    let data=null;
    if(text){
      if(type.includes("application/json")||type.includes("+json")){
        try{data=JSON.parse(text)}catch(_){}
      }else{
        try{data=JSON.parse(text)}catch(_){}
      }
    }
    if(!data){
      const status=response.status?("HTTP "+response.status):"";
      throw new Error((fallback||"Data source unavailable")+(status?" · "+status:""));
    }
    if(!response.ok)throw new Error(data.error||data.detail||fallback||"Request failed");
    return data;
  }
  async function geocode(q){
    const r=await fetch("/api/national-geocode?q="+encodeURIComponent(q));
    const data=await readJsonResponse(r,"Location lookup unavailable");
    remember(data);
    return data;
  }
  async function reverseGeocode(latitude,longitude){
    const roundedLatitude=Number(Number(latitude).toFixed(3));
    const roundedLongitude=Number(Number(longitude).toFixed(3));
    const r=await fetch("/api/national-geocode",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({latitude:roundedLatitude,longitude:roundedLongitude})
    });
    const data=await readJsonResponse(r,"Current location lookup unavailable");
    remember(data);
    return data;
  }
  function geolocationMessage(error){
    if(error&&error.code===1)return "Location permission was not granted";
    if(error&&error.code===2)return "Your location could not be determined";
    if(error&&error.code===3)return "Location lookup timed out";
    return "Your browser could not provide a location";
  }
  async function deviceLocation(){
    if(!navigator.geolocation)throw new Error("This browser does not support device location");
    const position=await new Promise(function(resolve,reject){
      navigator.geolocation.getCurrentPosition(resolve,reject,{
        enableHighAccuracy:false,
        timeout:10000,
        maximumAge:300000
      });
    }).catch(function(error){throw new Error(geolocationMessage(error))});
    return reverseGeocode(position.coords.latitude,position.coords.longitude);
  }
  function bind(form,onLocation){
    if(!form)return;
    const input=$("input",form),button=$(".btn",form),geoButton=$("[data-use-location]",form),status=form.parentElement.querySelector(".status");
    const old=saved();if(old&&input&&!input.value)input.placeholder="Try "+label(old);
    form.addEventListener("submit",async e=>{
      e.preventDefault();const q=input.value.trim();if(!q)return;
      button.disabled=true;if(status)status.textContent="Finding "+q+"…";
      try{const loc=await geocode(q);track("National Location Resolved",{input_type:inputType(q)});if(status)status.textContent=label(loc);propagate(loc);await onLocation(loc)}
      catch(err){track("National Location Error",{input_type:inputType(q)});if(status)status.innerHTML='<span class="error">'+esc(err.message)+"</span>"}
      finally{button.disabled=false}
    });
    if(geoButton){
      if(!navigator.geolocation)geoButton.hidden=true;
      else geoButton.addEventListener("click",async function(){
        geoButton.disabled=true;if(status)status.textContent="Using your device location…";
        try{
          const loc=await deviceLocation();
          track("National Device Location Resolved",{precision:"rounded-0.001deg"});
          if(input)input.value=loc.query||label(loc);
          if(status)status.textContent=label(loc);
          propagate(loc);
          await onLocation(loc);
        }catch(err){
          track("National Device Location Error",{reason:String(err&&err.message||"unavailable").slice(0,48)});
          if(status)status.innerHTML='<span class="error">'+esc(err.message)+"</span>";
        }finally{geoButton.disabled=false}
      });
    }
  }
  document.addEventListener("click",function(event){
    const origin=event.target;
    if(!origin||typeof origin.closest!=="function")return;
    const anchor=origin.closest('a[href^="/national-tools/"]');
    if(!anchor)return;
    let target="national-tools";
    try{
      const path=new URL(anchor.href,window.location.href).pathname.replace(/\/+$/,"");
      if(path==="/national-tools")target="hub";
      else{
        const match=path.match(/^\/national-tools\/([^/]+)/);
        if(match)target=match[1];
      }
    }catch(_){}
    if(target===currentSurface())return;
    let placement="in-tool";
    if(anchor.closest(".desk-card"))placement="decision-card";
    else if(anchor.closest(".tool-card"))placement="tool-grid";
    else if(anchor.closest(".nav"))placement="nav";
    track("National Tool Open",{target:target,placement:placement});
  });
  ensureAnalytics();

  window.NationalTools={
    $,fmtDate,fmtInZone,esc,readJsonResponse,geocode,reverseGeocode,deviceLocation,label,bind,saved,savedPlaces,savePlace,removePlace,locationKey,remember,withQuery,propagate,track
  };
})();
