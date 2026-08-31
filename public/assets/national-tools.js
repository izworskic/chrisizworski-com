(function(){
  const STORE="ci-national-location-v1";
  function $(sel,root){return (root||document).querySelector(sel)}
  function fmtDate(value){if(!value)return "Unknown";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString([], {dateStyle:"medium",timeStyle:"short"})}
  function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  async function geocode(q){
    const r=await fetch("/api/national-geocode?q="+encodeURIComponent(q));
    const data=await r.json();
    if(!r.ok)throw new Error(data.error||"Location lookup failed");
    try{localStorage.setItem(STORE,JSON.stringify(data))}catch(_){}
    return data;
  }
  function saved(){try{return JSON.parse(localStorage.getItem(STORE)||"null")}catch(_){return null}}
  function label(loc){return loc?.place&&loc?.stateCode?loc.place+", "+loc.stateCode:(loc?.displayName||"your location").split(",").slice(0,2).join(",")}
  function bind(form,onLocation){
    if(!form)return;
    const input=$("input",form),button=$("button",form),status=form.parentElement.querySelector(".status");
    const old=saved(); if(old&&input&&!input.value)input.placeholder="Try "+label(old);
    form.addEventListener("submit",async e=>{
      e.preventDefault(); const q=input.value.trim(); if(!q)return;
      button.disabled=true;if(status)status.textContent="Finding "+q+"…";
      try{const loc=await geocode(q);if(status)status.textContent=label(loc);await onLocation(loc)}
      catch(err){if(status)status.innerHTML='<span class="error">'+esc(err.message)+"</span>"}
      finally{button.disabled=false}
    });
  }
  window.NationalTools={$,fmtDate,esc,geocode,saved,label,bind};
})();
