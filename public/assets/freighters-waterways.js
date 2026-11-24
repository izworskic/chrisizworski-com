(function(){
  "use strict";
  const desk=document.getElementById("my-waterways"), list=document.getElementById("saved-waterways-list");
  const save=document.getElementById("save-waterway"), row=document.getElementById("save-waterway-row"), clear=document.getElementById("clear-waterways");
  const status=document.getElementById("save-waterway-status"), select=document.getElementById("corridor");
  if(!desk||!list||!save||!row||!clear||!status||!select)return;
  const key="ciz:freighters:spots:v1", tracker="/great-lakes-freighter-tracking/#";
  const mapped=["soo","duluth","detroit","saginaw","port-huron","mackinac"];
  const specialist={calumet:"/calumet-freighter-watch/",cuyahoga:"/cuyahoga-freighter-watch/",welland:"/welland-canal/",seaway:"/st-lawrence-seaway/"};
  const allowed=[...mapped,...Object.keys(specialist)];
  const sourceMaxAge=5*60000, comparisonMaxAge=30*60000;
  const labels=Object.fromEntries(Array.from(select.options).filter(o=>allowed.includes(o.value)).map(o=>[o.value,o.textContent.trim()]));
  let saved=[],previous=new Map(),current=null,storageAvailable=true;
  const validReading=r=>r&&Number.isSafeInteger(r.value)&&r.value>=0&&Number.isFinite(Date.parse(r.observedAt))&&Date.parse(r.observedAt)<=Date.now()+60000;
  try{
    const parsed=JSON.parse(window.localStorage.getItem(key)||"[]");
    if(Array.isArray(parsed))for(const spot of parsed.slice(0,10)){
      if(!spot||!allowed.includes(spot.id)||saved.some(x=>x.id===spot.id))continue;
      const clean={id:spot.id,label:labels[spot.id],savedAt:typeof spot.savedAt==="string"?spot.savedAt:new Date().toISOString(),lastSeen:validReading(spot.lastSeen)?spot.lastSeen:null};
      saved.push(clean);if(clean.lastSeen)previous.set(clean.id,clean.lastSeen);
    }
  }catch(_){storageAvailable=false;}
  function persist(next){
    try{window.localStorage.setItem(key,JSON.stringify(next));saved=next;return true;}
    catch(_){storageAvailable=false;status.textContent="This browser could not save changes. Your map and finder still work.";return false;}
  }
  function time(value){return new Date(value).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",timeZone:"America/Detroit",timeZoneName:"short"});}
  function reading(id){
    if(!current||current.failed||!current.counts||!mapped.includes(id))return null;
    const value=current.counts[id],stamp=Date.parse(current.checkedAt),age=Date.now()-stamp;
    if(!Number.isSafeInteger(value)||value<0||!Number.isFinite(stamp)||age>sourceMaxAge||age< -60000)return null;
    return {value,observedAt:current.checkedAt};
  }
  function describe(spot){
    if(!mapped.includes(spot.id))return "Open the specialist waterway for its own recent reports and viewing guidance.";
    const r=reading(spot.id);
    if(!r){
      if(validReading(spot.lastSeen))return "Last known (not live): "+spot.lastSeen.value+" recent reports at "+time(spot.lastSeen.observedAt)+". "+(current?"Fresh report unavailable.":"Checking current reports.");
      return current?"Current AIS reports unavailable or too old.":"Checking current AIS reports.";
    }
    const radius=spot.id==="saginaw"?60:35;
    let message=r.value+" recent AIS "+(r.value===1?"report":"reports")+" within about "+radius+" miles · checked "+time(r.observedAt)+".";
    const old=previous.get(spot.id);
    if(old&&Date.parse(r.observedAt)>Date.parse(old.observedAt)){
      const elapsed=Date.parse(r.observedAt)-Date.parse(old.observedAt),delta=r.value-old.value;
      message+=elapsed>comparisonMaxAge?" First check since "+time(old.observedAt)+".":delta===0?" Same report count as your previous check.":" "+Math.abs(delta)+" "+(delta>0?"more":"fewer")+" recent "+(Math.abs(delta)===1?"report":"reports")+" than your previous check.";
    }
    return message;
  }
  function make(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
  function render(){
    desk.hidden=saved.length===0;
    const focusId=document.activeElement&&document.activeElement.dataset.savedRemove;
    list.replaceChildren();
    for(const spot of saved){
      const li=make("li"),link=make("a",labels[spot.id]),detail=make("p",describe(spot)),remove=make("button","Remove");
      li.dataset.savedWaterway=spot.id;link.href=mapped.includes(spot.id)?tracker+spot.id:specialist[spot.id];
      link.addEventListener("click",event=>{
        if(!mapped.includes(spot.id)||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||!current)return;
        const tab=document.querySelector('.view-tab[data-freighter-view="'+spot.id+'"]'),map=document.getElementById("freighterMap");
        if(!tab||!map||!map.classList.contains("leaflet-container"))return;
        const input=document.getElementById("freighterNameSearch");
        if(input&&input.value)document.getElementById("freighterClearSearch").click();
        event.preventDefault();tab.click();document.getElementById("live-map").scrollIntoView({block:"start",behavior:"auto"});
      });
      remove.type="button";remove.dataset.savedRemove=spot.id;remove.setAttribute("aria-label","Remove "+labels[spot.id]);
      remove.addEventListener("click",()=>{
        if(persist(saved.filter(x=>x.id!==spot.id))){previous.delete(spot.id);render();if(saved.length)list.querySelector("button").focus();else save.focus();}
      });
      li.append(link,detail,remove);list.append(li);
    }
    if(focusId){const again=list.querySelector('[data-saved-remove="'+focusId+'"]');if(again)again.focus({preventScroll:true});}
  }
  function receive(event){
    current=event.detail||null;
    const next=saved.map(spot=>{
      const r=reading(spot.id);
      return r&&(!spot.lastSeen||Date.parse(r.observedAt)>Date.parse(spot.lastSeen.observedAt))?{...spot,lastSeen:r}:spot;
    });
    if(next.some((x,i)=>x!==saved[i])){
      // If storage becomes blocked, still show the current report; do not claim it persisted.
      if(storageAvailable)persist(next);
    }
    render();
  }
  desk.addEventListener("freighter-corridor-report",receive);
  save.addEventListener("click",()=>{
    const id=select.value;
    if(!allowed.includes(id))return;
    if(saved.some(x=>x.id===id)){status.textContent=labels[id]+" is already saved.";return;}
    const spot={id,label:labels[id],savedAt:new Date().toISOString(),lastSeen:reading(id)};
    if(persist([...saved,spot])){render();status.textContent=labels[id]+" saved to My waterways above the map.";}
  });
  clear.addEventListener("click",()=>{
    if(persist([])){previous.clear();render();status.textContent="Saved waterways cleared.";save.focus();}
  });
  // Display cached observations only as last-known, never as live. No worker or extra fetch.
  setInterval(()=>{if(current&&saved.length&&mapped.some(id=>!reading(id)))render();},60000);
  row.hidden=false;render();
  if(!storageAvailable)status.textContent="Saved waterways are unavailable in this browser. You can still use the finder.";
})();
