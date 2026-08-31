(function(){
  const CURRENT_STORE="ci-national-location-v2";
  const LEGACY_STORE="ci-national-location-v1";
  const PLACES_STORE="ci-national-places-v1";

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
  function bind(form,onLocation){
    if(!form)return;
    const input=$("input",form),button=$("button",form),status=form.parentElement.querySelector(".status");
    const old=saved();if(old&&input&&!input.value)input.placeholder="Try "+label(old);
    form.addEventListener("submit",async e=>{
      e.preventDefault();const q=input.value.trim();if(!q)return;
      button.disabled=true;if(status)status.textContent="Finding "+q+"…";
      try{const loc=await geocode(q);if(status)status.textContent=label(loc);propagate(loc);await onLocation(loc)}
      catch(err){if(status)status.innerHTML='<span class="error">'+esc(err.message)+"</span>"}
      finally{button.disabled=false}
    });
  }
  window.NationalTools={
    $,fmtDate,fmtInZone,esc,readJsonResponse,geocode,label,bind,saved,savedPlaces,savePlace,removePlace,locationKey,remember,withQuery,propagate
  };
})();
