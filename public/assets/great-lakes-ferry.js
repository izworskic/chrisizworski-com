/* Shared interactive engine for eight independent Great Lakes ferry planners.
   Operator schedules and fares are dated reference data, never live ticket inventory. */
(() => {
  "use strict";
  const dataNode=document.getElementById("ferry-config");
  if(!dataNode)return;
  const config=JSON.parse(dataNode.textContent);
  const $=id=>document.getElementById(id);
  const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const currency=(n,code)=>new Intl.NumberFormat(code==="CAD"?"en-CA":"en-US",{style:"currency",currency:code||"USD"}).format(n);
  const localToday=()=>{const d=new Date();return [d.getFullYear(),String(d.getMonth()+1).padStart(2,"0"),String(d.getDate()).padStart(2,"0")].join("-")};
  const currentDate=$("trip-date");currentDate.value=localToday();
  if(config.childLabel)$("child-label").textContent=config.childLabel;
  if(config.vehicleAllowed===false){$("vehicle-field").hidden=true;$("vehicle-count").value="0"}
  if(config.note)$("individual-note").textContent=config.note;
  const dateIn=(date,start,end)=>date>=start&&date<=end;
  function season(date){
    if(config.id==="manitou")return{state:date.slice(0,4)==="2026"?"no":"unknown",text:date.slice(0,4)==="2026"?"No regular ferry service to North or South Manitou in 2026. NPS dock construction prevents service. No current fare or sailing is offered.":"Manitou ferry restart, timetable and fares are not confirmed here. NPS expects dock reopening in 2027; confirm with NPS and the ferry operator."};
    if(!/^2026-\d{2}-\d{2}$/.test(date))return{state:"unknown",text:"This tool currently has verified 2026 reference information only. For another year, check the operator before traveling."};
    if(config.id==="toronto"){return{state:"yes",text:date>="2026-10-14"?"Winter service: Ward’s Island only on the city's published winter schedule; Centre and Hanlan’s routes are seasonal.":"Toronto Islands summer routes operate seasonally; check the city’s exact sailing calendar."}};
    if(config.id==="pelee"){
      if(!dateIn(date,"2026-04-01","2026-12-07"))return{state:"no",text:"Outside the published 2026 Pelee Island ferry season. Winter air service is separate."};
      return{state:"yes",text:date<"2026-07-29"?"Canadian mainland ferry gateway: Leamington.":"Canadian mainland ferry gateway: Kingsville on the published seasonal schedule. Some special sailings use Leamington; confirm the exact booking and terminal."};
    }
    if(config.season){
      const active=dateIn(date,config.season[0],config.season[1]);
      return{state:active?"yes":"no",text:active?"Inside the operator's published 2026 sailing-season window. This does not confirm a departure, seat, vehicle space or weather clearance.":"Outside the operator's stated 2026 sailing-season window. Do not plan a crossing without a newly published schedule."};
    }
    return{state:"unknown",text:"The 2026 timetable is date-specific. Consult the operator calendar for a confirmed departure."};
  }
  function eligibleOption(o,date){
    if(config.id==="toronto"&&(date>="2026-10-14"||date<="2026-04-15")&&o.id!=="wards")return false;
    return true;
  }
  function tariff(o,date){
    if(!o.pricing)return null;
    if(date.slice(0,4)!=="2026")return null;
    if(o.priceStart&&date<o.priceStart)return null;
    if(o.priceEnd&&date>o.priceEnd)return null;
    if(o.id==="badger"&&dateIn(date,"2026-06-19","2026-09-07"))return o.summerPricing||o.pricing;
    if(o.id==="chi"&&dateIn(date,"2026-06-19","2026-09-07"))return o.summerPricing||o.pricing;
    if(config.id==="toronto"&&dateIn(date,"2026-08-01","2026-08-31"))return {...o.pricing,childRT:0};
    return o.pricing;
  }
  function estimate(o,date,adults,kids,vehicle,roundtrip){
    const t=tariff(o,date);if(!t)return {text:"Published fare lookup required",complete:false};
    const s=roundtrip?"RT":"OW";
    if(t["adult"+s]==null||(kids>0&&t["child"+s]==null)||(vehicle>0&&t["vehicle"+s]==null)){
      return {text:"A complete quote needs operator pricing",complete:false};
    }
    const base=adults*t["adult"+s]+(kids ? kids*t["child"+s] : 0)+(vehicle ? vehicle*t["vehicle"+s] : 0);
    const surcharge=(t["feePerson"+s]||0)*(adults+kids)+(t["feeVehicle"+s]||0)*vehicle;
    return {text:currency(base+surcharge,config.currency),complete:true,base,fee:surcharge};
  }
  function render(){
    const date=currentDate.value,adults=Math.min(20,Math.max(1,Number($("adult-count").value)||1)),kids=Math.min(20,Math.max(0,Number($("child-count").value)||0)),vehicle=Math.min(1,Math.max(0,Number($("vehicle-count").value)||0)),roundtrip=$("trip-type").value==="roundtrip";
    const seasonInfo=season(date);const outside=seasonInfo.state==="no";
    let html='<div class="result '+(outside?'warning':'')+'"><h3>'+ (outside?'Outside the published season':seasonInfo.state==="unknown"?'Schedule verification needed':'Your crossing outlook')+'</h3><p>'+escapeHtml(seasonInfo.text)+'</p></div>';
    if(config.id==="isle-royale"&&roundtrip)html+='<div class="note">Ranger III cannot provide a same-day round trip. Island visits require matching inbound and outbound dates; the calculator does not verify ferry inventory.</div>';
    if(config.id==="put-in-bay"&&vehicle)html+='<div class="note">Miller Ferry transports vehicles; Jet Express is passenger-only. For a vehicle, only Miller is a possible option. Island car traffic can be restricted on busy weekends.</div>';
    if(config.id==="toronto"&&dateIn(date,"2026-08-01","2026-08-31"))html+='<div class="note">Toronto City Council waived children, youth and older-adult round-trip ferry fares for August 2026. The junior (ages 2–14) category is discounted to free here; youth/senior ticket types require operator selection.</div>';
    if(config.id==="pelee"&&date.slice(0,4)==="2026")html+='<div class="note">Pelee–Sandusky international trips use distinct fares, specific travel dates and border documents. This estimate is for the Canadian mainland–Pelee crossing only.</div>';
    if(config.id==="lake-express"&&date.slice(0,4)==="2026")html+='<div class="note">The published 2026 rates shown here took effect August 11. Late-season sailings end October 19 and have weekday exceptions. Verify the exact date and remaining space.</div>';
    if(config.id==="ss-badger"&&date.slice(0,4)==="2026")html+='<div class="note">Ludington is in Eastern Time and Manitowoc is in Central Time. Crossing time is four hours, not the wall-clock difference between published departure and arrival.</div>';
    html+='<div class="compare">';
    const available=(config.options||[]).filter(o=>eligibleOption(o,date)&&!(vehicle&&o.noVehicle));
    if(!available.length)html+='<div class="option">No eligible route for these settings. Change the vehicle or seasonal route selection.</div>';
    for(const o of available){
      const v=estimate(o,date,adults,kids,vehicle,roundtrip);
      html+='<div class="option"><b>'+escapeHtml(o.name)+'</b><p>'+escapeHtml(o.description)+'</p>';
      html+='<span class="cost">'+escapeHtml(outside?'Fares not applicable outside season':v.text)+'</span>';
      if(v.complete&&!outside)html+='<p class="fine">Published '+(roundtrip?'round-trip':'one-way')+' fare arithmetic for specified age bands and standard vehicle only'+(v.fee?' including the stated fuel/port surcharges':'')+'. Not a live checkout quote.</p>';
      if(o.tripTime)html+='<p class="fine">Typical one-way crossing: '+escapeHtml(o.tripTime)+'</p>';
      if(o.notice)html+='<p class="fine">'+escapeHtml(o.notice)+'</p>';
      html+='</div>';
    }
    html+='</div>';
    html+='<p class="fine">Prices and calendars are dated 2026 public references, not guarantees. No live capacity, cancellation or seat-availability feed is connected. Vehicle size, senior/youth categories, special tickets, parking, tax and other fees may require operator pricing. Check official booking before departure.</p>';
    $("ferry-results").innerHTML=html;
  }
  $("ferry-form").addEventListener("submit",event=>{event.preventDefault();render();$("ferry-results").scrollIntoView({behavior:"smooth",block:"nearest"});});
  for(const input of $("ferry-form").querySelectorAll("input,select"))input.addEventListener("change",render);
  render();

  // Optional near-port NWS context: never treated as a ferry go/no-go recommendation.
  const weatherHost=$("shore-outlook");
  if(weatherHost){
    const supported=new Set(["put-in-bay","lake-express","ss-badger","isle-royale","beaver"]);
    const official=config.currency==="CAD"?"https://weather.gc.ca/marine/":"https://www.weather.gov/marine/";
    if(config.id==="manitou"){
      weatherHost.innerHTML='<h3>Access comes first</h3><p class="fine">Regular ferry service is suspended for 2026. Check the NPS access notice and ferry operator before considering weather for a future crossing.</p>';
    }else if(supported.has(config.id)&&typeof fetch==="function"){
      weatherHost.innerHTML='<h3>Near-port wind outlook</h3><p class="fine">Loading NWS conditions near the U.S. mainland terminal…</p>';
      fetch("/api/great-lakes-ferry-conditions?id="+encodeURIComponent(config.id),{headers:{Accept:"application/json"}})
      .then(r=>{if(!r.ok)throw Error("Forecast unavailable");return r.json()})
      .then(data=>{
        if(data.type!=="shore-hourly-forecast"||!Array.isArray(data.periods)||!data.periods.length)throw Error("Invalid forecast");
        const entries=data.periods.slice(0,8).map(p=>{
          const time=new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",hour:"numeric"}).format(new Date(p.starts));
          const temp=Number.isFinite(p.temperature)?p.temperature+"°"+(p.temperatureUnit||"F"):"";
          return '<div class="wind-hour"><strong>'+escapeHtml(time)+'</strong><span>'+escapeHtml(p.windSpeed)+'</span><small>'+escapeHtml(p.windDirection||"")+' · '+escapeHtml(temp)+'</small></div>'
        }).join("");
        weatherHost.innerHTML='<h3>NWS shore forecast · next 8 hours</h3><p class="fine">Near '+escapeHtml(data.gateway)+'; Eastern Time. This is land-port weather, <strong>not</strong> a marine crossing forecast or a ferry cancellation notice.</p><div class="wind-strip">'+entries+'</div><p class="fine">Source: National Weather Service hourly forecast · <a href="'+official+'" target="_blank" rel="noopener noreferrer">Official marine forecasts and warnings ↗</a></p>';
      })
      .catch(()=>{weatherHost.innerHTML='<h3>Near-port weather</h3><p class="fine">NWS hourly forecast is currently unavailable. Check <a href="'+official+'" target="_blank" rel="noopener noreferrer">official marine forecasts and warnings</a> and operator advisories before traveling.</p>'});
    }else{
      weatherHost.innerHTML='<h3>Marine weather and sailing decisions</h3><p class="fine">No verified near-port hourly feed is connected for this route. Check the <a href="'+official+'" target="_blank" rel="noopener noreferrer">official Canadian marine forecast</a> and operator sailing alerts. Forecast weather is not a ferry cancellation announcement.</p>';
    }
  }
})();