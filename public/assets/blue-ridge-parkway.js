(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const esc=value=>String(value==null?"":value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const fmtMile=value=>Number.isFinite(Number(value))?`MP ${Number(value).toFixed(Number(value)%1?1:0)}`:"";
  const safeUrl=value=>{try{const u=new URL(String(value),location.origin);return ["http:","https:"].includes(u.protocol)?u.href:"#";}catch{return"#";}};
  const track=(name,params={})=>{try{if(typeof window.gtag==="function")window.gtag("event",name,params);}catch{}};
  const gatewayOptions=[
    ["asheville","Asheville"],["boone","Boone / Blowing Rock"],["roanoke","Roanoke"],["floyd","Floyd / Meadows of Dan"],["afton","Afton / Waynesboro"],["cherokee","Cherokee"]
  ];
  const gatewayMileposts={asheville:384.1,boone:290.8,roanoke:121.4,floyd:167.2,afton:0,cherokee:469.1};
  const interestLabels={scenery:"Big views","fall-color":"Fall color","short-walk":"Short walks",waterfall:"Waterfalls",photography:"Photography",history:"History",picnic:"Picnic",sunset:"Sunset","high-elevation":"High elevation"};
  let map=null,corridorLayer=null,markerLayer=null,lastPayload=null,mapInteractionTracked=false,corridorRequest=null;
  let selectedStop=0,stopPins=[];

  function ensureLeafletCss(){
    const expected='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    const current=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>link.href===expected);
    if(current&&current.integrity==='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=')return;
    if(current)current.remove();
    const link=document.createElement('link');link.rel='stylesheet';link.href=expected;link.integrity='sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';link.crossOrigin='';link.dataset.blueRidgeLeaflet='true';document.head.appendChild(link);
  }
  function installPlannerUpgrade(){
    const gateway=$("gateway"),grid=gateway?.closest(".form-grid");if(!gateway||!grid||$("finish"))return;
    const field=document.createElement("div");field.className="field";field.innerHTML=`<label for="finish">Finish</label><select id="finish"><option value="return">Back where I started</option>${gatewayOptions.map(([id,label])=>`<option value="${id}">${esc(label)}</option>`).join("")}</select>`;gateway.closest(".field").after(field);
    const style=document.createElement("style");style.textContent=`@media(min-width:901px){.planner .form-grid{grid-template-columns:1.15fr 1.15fr .8fr .8fr .72fr}}@media(max-width:900px){.planner .form-grid{grid-template-columns:1fr 1fr}}@media(max-width:560px){.planner .form-grid{grid-template-columns:1fr}}`;document.head.appendChild(style);
    syncFinishOptions();syncHours();
  }
  function syncFinishOptions(){const start=$("gateway")?.value,finish=$("finish");if(!finish)return;[...finish.options].forEach(o=>{o.disabled=o.value!=="return"&&o.value===start;});if(finish.value===start)finish.value="return";}
  function corridorDriveHours(){const start=$("gateway")?.value,finish=$("finish")?.value;if(!start||!finish||finish==="return")return 0;return Math.abs(gatewayMileposts[finish]-gatewayMileposts[start])/32+.25;}
  function renderCorridorBudget(){const note=$("corridorBudget"),finish=$("finish")?.value||"return";if(!note)return;if(finish==="return"){note.textContent="";return;}const drive=corridorDriveHours(),available=Number($("hours")?.value||0),stop=Math.max(0,available-drive);note.textContent=`Parkway drive alone: about ${drive.toFixed(1)} hr · sightseeing budget at ${available} hr: about ${stop.toFixed(1)} hr.`;}
  function syncHours(autoFit=false){const finish=$("finish")?.value||"return",hours=$("hours");if(!hours)return;const long=[7,9,10,11,12,13,14,15,16];for(const n of long){let option=[...hours.options].find(o=>o.value===String(n));if(finish!=="return"&&!option){option=document.createElement("option");option.value=String(n);option.textContent=`${n} hours`;hours.appendChild(option);}else if(finish==="return"&&option){if(hours.value===String(n))hours.value="8";option.remove();}}if(finish!=="return"&&autoFit){const required=corridorDriveHours(),choices=[...hours.options].map(o=>Number(o.value)).filter(Number.isFinite).sort((a,b)=>a-b),current=Number(hours.value);if(current<required){const fit=choices.find(n=>n>=required);hours.value=String(fit||choices[choices.length-1]||16);}}renderCorridorBudget();
  }
  // The route engine remains authoritative. This layer only guides how people ask for and read its answer.
  function syncFlowChoices(){
    const gateway=$("gateway")?.value||"",hours=$("hours")?.value||"";
    document.querySelectorAll(".flow-gateway").forEach(button=>{
      const chosen=button.dataset.gateway===gateway;
      button.classList.toggle("is-selected",chosen);button.setAttribute("aria-pressed",String(chosen));
    });
    document.querySelectorAll(".flow-time-choice").forEach(button=>{
      const chosen=button.dataset.hours===hours;
      button.classList.toggle("is-selected",chosen);button.setAttribute("aria-pressed",String(chosen));
    });
  }
  function showFlowStep(step,{focus=false,scroll=false}={}){
    const planner=$("planner");if(!planner)return;
    planner.classList.add("flow-enhanced");planner.dataset.activeStep=String(step);
    const progress=$("flowProgress");if(progress)progress.hidden=false;
    document.querySelectorAll("[data-flow-step]").forEach(section=>{
      const active=Number(section.dataset.flowStep)===step;
      section.classList.toggle("is-active",active);
      section.setAttribute("aria-hidden",String(!active));
    });
    document.querySelectorAll("[data-progress]").forEach(item=>{
      const current=Number(item.dataset.progress)===step;
      if(current)item.setAttribute("aria-current","step");else item.removeAttribute("aria-current");
      item.classList.toggle("is-current",current);
    });
    const picked=$("flowPicked"),selected=$( "gateway" )?.selectedOptions?.[0]?.textContent||"";
    if(picked)picked.textContent=selected?("Starting near "+selected):"Choose your starting area";
    syncFlowChoices();
    if(scroll){const target=step===3?$("results"):planner;target?.scrollIntoView({block:"start",behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth"});}
    if(focus){const heading=step===1?$("flow-start-title"):step===2?$("flow-day-title"):$("flowResultTitle");if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
  }
  function continueFromStart(){
    if(!$("gateway")?.value){if($("flowStartError"))$("flowStartError").hidden=false;return;}
    if($("flowStartError"))$("flowStartError").hidden=true;
    showFlowStep(2,{focus:true,scroll:true});
    track("blue_ridge_flow_step",{step:2,gateway:$("gateway").value});
  }
  function todayParkway(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
  function setDefaults(){if($("tripDate")&&!$("tripDate").value)$("tripDate").value=todayParkway();}
  function selectedInterests(){return [...document.querySelectorAll('input[name="interest"]:checked')].map(el=>el.value);}
  function params(){return new URLSearchParams({gateway:$("gateway").value,finish:$("finish")?.value||"return",hours:$("hours").value,date:$("tripDate").value||todayParkway(),start:$("startTime").value||"09:00",interests:selectedInterests().join(",")||"scenery"});}
  function setBusy(busy){const btn=$("buildDrive");if(btn){btn.disabled=busy;btn.textContent=busy?"Checking the Parkway…":"Show my Parkway drive";}$("plannerStatus").textContent=busy?"Reading current road status and mountain weather…":"";}
  function weatherLine(weather){if(!weather?.ok)return"Mountain forecast unavailable.";const bits=[];if(Number.isFinite(Number(weather.tempMin))&&Number.isFinite(Number(weather.tempMax)))bits.push(`${weather.tempMin}–${weather.tempMax}°F`);if(Number.isFinite(Number(weather.precipMax)))bits.push(`precipitation up to ${weather.precipMax}%`);if(Number.isFinite(Number(weather.windMax)))bits.push(`wind up to ${weather.windMax} mph`);if(weather.forecast?.length)bits.push(weather.forecast.slice(0,2).join(" / "));return bits.join(" · ")||"NWS hourly forecast loaded.";}
  function roadBadge(payload,plan){if(!payload.road?.ok)return`<span class="state warn">Verify NPS road status</span>`;if(plan?.cautions?.length)return`<span class="state warn">Road note on this stretch</span>`;return`<span class="state good">No hard closure on route</span>`;}
  function renderTop(payload){const plan=payload.selected,strip=$("liveStrip");strip.classList.toggle("warn",!payload.road?.ok||plan?.cautions?.length>0);$("roadUpdate").textContent=payload.road?.ok?`NPS road table: ${payload.road.updatedLabel||"current update loaded"}`:"NPS road table unavailable — verify before leaving";$("generatedAt").textContent=`Checked ${new Date(payload.generatedAt).toLocaleTimeString([], {hour:"numeric",minute:"2-digit"})}`;}
  function bullets(items){return`<ul class="reason-list">${(items||[]).map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`;}
  function renderDecision(payload){
    const plan=payload.selected;if(!plan){$("decision").innerHTML=`<div class="source-warning"><strong>No usable route was returned.</strong><p>Check the official NPS road table before traveling.</p></div>`;$("whyCard").innerHTML="";$("watchCard").innerHTML="";$("planB").innerHTML="";return;}
    const pointToPoint=plan.tripMode==="point-to-point",direction=plan.direction==="northbound"?"North on the Parkway":"South on the Parkway",routeLine=pointToPoint?`${direction} · finish ${esc(plan.finishLabel||payload.finishGateway?.label||"")} near ${fmtMile(plan.mileTurn)}`:`${direction} · turn around near ${fmtMile(plan.mileTurn)}`,timeLabel=pointToPoint?"Arrive about":"Back about",endLabel=pointToPoint?"Stop budget":"Turn point",endValue=pointToPoint?`${Math.round(Number(plan.stopBudgetMinutes)||0)} min`:fmtMile(plan.mileTurn);
    $("decision").innerHTML=`<div class="decision-top"><div><div class="eyebrow">TODAY'S ANSWER</div><h2>${esc(plan.name)}</h2><p class="route-line">${routeLine}</p></div></div><div class="fit-badges">${roadBadge(payload,plan)}<span class="state">${esc(plan.fit)}</span><span class="state">View outlook: ${esc(plan.viewOutlook?.label||"unknown")}</span></div><p class="editorial-read">${esc(plan.editorial?.text||plan.character)}</p><div class="stat-grid"><div class="stat"><span>Modeled outing</span><strong>${esc(plan.durationHours)} hr</strong></div><div class="stat"><span>Parkway miles</span><strong>${esc(plan.routeMiles)}</strong></div><div class="stat"><span>${timeLabel}</span><strong>${esc(plan.timeline?.arrivalBy||plan.timeline?.returnBy||"—")}</strong></div><div class="stat"><span>${endLabel}</span><strong>${endValue}</strong></div></div><div class="decision-actions"><a class="primary-link" id="mapsHandoff" href="${esc(safeUrl(plan.directionsUrl))}" target="_blank" rel="noopener">Open full drive in Google Maps</a><button class="secondary-button" id="sharePlan" type="button">Share plan</button><button class="secondary-button" id="printPlan" type="button">Print</button></div>${plan.mapsHandoff?`<div class="model-label maps-handoff-note">Google Maps handoff: ${esc(plan.mapsHandoff.plannedStopCount||0)} planned stop${Number(plan.mapsHandoff.plannedStopCount)===1?"":"s"}${plan.mapsHandoff.routeAnchorCount?` + ${esc(plan.mapsHandoff.routeAnchorCount)} Parkway routing anchor${Number(plan.mapsHandoff.routeAnchorCount)===1?"":"s"}`:""}. Stop order stays fixed.</div>`:""}`;
    $("whyCard").innerHTML=`<div class="eyebrow">WHY THIS PLAN</div><h3>${pointToPoint?"Your finish stays in the plan.":"Why this stretch fits your day."}</h3>${bullets(plan.why)}`;
    $("watchCard").innerHTML=`<div class="eyebrow">WHAT CHANGES THE PLAN</div><h3>Check these before setting out.</h3>${bullets(plan.changeTriggers)}`;
    const b=payload.planB;$("planB").innerHTML=b?`<div class="eyebrow">PLAN B</div><h3>${esc(b.name)}</h3><p>${esc(b.fallbackReason||b.character)}</p><div class="planb-meta"><span>${esc(b.durationHours)} hr</span><span>${esc(b.routeMiles)} Parkway mi</span><span>${pointToPoint?esc(b.finishLabel||""):fmtMile(b.mileTurn)}</span></div>`:`<div class="eyebrow">PLAN B</div><h3>No clean fallback in this set.</h3><p>${pointToPoint?"Keep your destination, but allow more time or choose fewer stops along the way.":"If conditions change, try a shorter outing or begin from another Parkway entrance."}</p>`;
    $("mapsHandoff")?.addEventListener("click",()=>track("blue_ridge_maps_handoff",{route_id:plan.id,gateway:payload.input?.gateway||"",finish:payload.input?.finish||"return",planned_stops:plan.mapsHandoff?.plannedStopCount||0,route_anchors:plan.mapsHandoff?.routeAnchorCount||0,handoff_complete:plan.mapsHandoff?.complete!==false}));$("sharePlan")?.addEventListener("click",sharePlan);$("printPlan")?.addEventListener("click",()=>{track("blue_ridge_print",{route_id:plan.id});window.print();});
  }
  async function sharePlan(){const plan=lastPayload?.selected;if(!plan)return;const pointToPoint=plan.tripMode==="point-to-point",time=plan.timeline?.arrivalBy||plan.timeline?.returnBy||"",text=pointToPoint?`Blue Ridge Parkway: ${plan.name} — about ${plan.durationHours} hr / ${plan.routeMiles} Parkway miles, arrive about ${time}.`:`Blue Ridge Parkway: ${plan.name} — about ${plan.durationHours} hr / ${plan.routeMiles} Parkway miles, back about ${time}.`;try{if(navigator.share){await navigator.share({title:"Blue Ridge Parkway drive",text,url:location.href});track("blue_ridge_share",{route_id:plan.id,method:"native"});return;}await navigator.clipboard.writeText(`${text}\n${location.href}`);track("blue_ridge_share",{route_id:plan.id,method:"clipboard"});const btn=$("sharePlan");if(btn){const old=btn.textContent;btn.textContent="Copied";setTimeout(()=>btn.textContent=old,1400);}}catch(_){}}
  function renderTimeline(payload){const plan=payload.selected;if(!plan)return;const pointToPoint=plan.tripMode==="point-to-point",end=plan.timeline?.arrivalBy||plan.timeline?.returnBy||"";$("timelineWindow").textContent=`${plan.timeline?.start||""} → ${end}`;$("timeline").innerHTML=(plan.timeline?.items||[]).map((item,index)=>`<div class="timeline-item"><div class="timeline-time">${esc(item.arrival)}</div><div class="timeline-node"></div><div class="timeline-copy"><strong>${index+1}. ${esc(item.name)}</strong><div class="timeline-meta">${fmtMile(item.milepost)} · ${item.elevationFt?`${Number(item.elevationFt).toLocaleString()} ft · `:""}${esc(item.dwellMinutes)} min stop</div></div></div>`).join("")||`<div class="source-warning"><strong>${pointToPoint?"No optional stops selected.":"No timed stops returned."}</strong><p>${pointToPoint?"The model is protecting the destination and arrival window.":""}</p></div>`;$("timelineReturn").innerHTML=pointToPoint?`Leave near <strong>${esc(plan.timeline?.start||"")}</strong> · modeled arrival in <strong>${esc(plan.finishLabel||payload.finishGateway?.label||"your destination")}</strong> around <strong>${esc(end)}</strong>. The time is a planning model, not traffic navigation.`:`Leave near <strong>${esc(plan.timeline?.start||"")}</strong> · aim to be back around <strong>${esc(end)}</strong>. The time is a planning model, not traffic navigation.`;}
  function renderSelectedStopDetails(payload){
    const plan=payload.selected,grid=$("selectedStopDetails"),summary=$("selectedStopSummary");if(!plan||!grid)return;
    const responseInterests=Array.isArray(payload.input?.interests)?payload.input.interests:[],checkedInterests=selectedInterests(),chosenList=responseInterests.length?responseInterests:checkedInterests,chosen=new Set(chosenList),chosenLabels=[...chosen].map(x=>interestLabels[x]||x);
    const items=plan.timeline?.items||[],servedIds=[...new Set(items.flatMap(item=>(item.tags||[]).filter(tag=>chosen.has(tag))))],unservedIds=[...chosen].filter(tag=>!servedIds.includes(tag)),servedLabels=servedIds.map(tag=>interestLabels[tag]||tag),unservedLabels=unservedIds.map(tag=>interestLabels[tag]||tag);
    if(summary)summary.innerHTML=`<strong>${items.length} recommended stop${items.length===1?"":"s"}</strong><span>Serves ${servedIds.length} of ${chosen.size} selected interests${servedLabels.length?`: ${esc(servedLabels.join(" · "))}`:""}</span>${unservedLabels.length?`<span><b>Not covered:</b> ${esc(unservedLabels.join(" · "))}</span>`:""}`;
    if(!items.length){grid.innerHTML=`<article class="stop-detail-card"><div class="stop-detail-title"><h3>No sightseeing stop fits this window yet.</h3><div class="stop-detail-block"><span>What that means</span><p>The distance itself takes most of your available hours. Add time or choose a shorter stretch if you want room to step out and discover something along the way.</p></div></div></article>`;return;}
    grid.innerHTML=items.map((item,index)=>{
      const matches=(item.tags||[]).filter(tag=>chosen.has(tag)),labels=matches.map(tag=>interestLabels[tag]||tag);
      const why=labels.length>=2?`You asked for ${labels.slice(0,-1).join(", ")}${labels.length>2?",":""} and ${labels[labels.length-1]}. Here you can experience both without adding another long drive.`:labels.length===1?`You came for ${labels[0]}. Give this place time to show you why it belongs in your drive.`:`This stop gives you a useful pause along your chosen route, even if it was not among your original interests.`;
      const chips=labels.length?labels.map(label=>`<span class="stop-match">${esc(label)}</span>`).join(""):`<span class="stop-match">Route fit</span>`;
      return `<article class="stop-detail-card"><div class="stop-detail-head"><div class="stop-detail-number">${index+1}</div><div class="stop-detail-title"><h3>${esc(item.name)}</h3><div class="stop-detail-meta">${esc(item.arrival||"Time flexible")} · ${fmtMile(item.milepost)}${item.elevationFt?` · ${Number(item.elevationFt).toLocaleString()} ft`:""} · ${esc(item.dwellMinutes)} min</div></div></div><div class="stop-match-row">${chips}</div><div class="stop-detail-block"><span>Why stop here?</span><p>${esc(why)}</p></div><div class="stop-detail-block"><span>What to notice</span><p>${esc(item.practical||"Use the milepost to get your bearings, then look around and leave room for the next part of the drive.")}</p></div>${item.source?`<div class="stop-detail-block"><span>Official details</span><p><a href="${esc(safeUrl(item.source))}" target="_blank" rel="noopener">NPS stop information ↗</a></p></div>`:""}</article>`;
    }).join("");
  }

  function stopItems(){return lastPayload?.selected?.timeline?.items||[];}
  function selectedItem(index){return {...(lastPayload?.selected?.stops?.[index]||{}),...(stopItems()[index]||{})};}
  function showRoadbook(){
    const panel=$("stopFocus"),items=stopItems();if(!panel)return;
    if(!items.length){panel.innerHTML='<div class="stop-kicker">YOUR ROADBOOK</div><h3>No sightseeing stops fit this drive.</h3><p>The road itself takes the time you have. Follow the mileposts and enjoy the changing mountain landscape without rushing toward an extra stop; check the official NPS map before leaving.</p>';return;}
    const item=selectedItem(selectedStop),matches=(item.tags||[]).filter(tag=>(lastPayload?.input?.interests||[]).includes(tag)).map(tag=>interestLabels[tag]||tag);
    const official=item.source?safeUrl(item.source):"https://www.nps.gov/blri/planyourvisit/maps.htm";
    const search=window.VisitorMapLinks?.placeSearch({role:"public-place",query:item.name+" Blue Ridge Parkway"})||"";
    panel.innerHTML=`<div class="stop-focus-top"><span class="stop-kicker">STOP ${selectedStop+1} OF ${items.length} · FIELD NOTE</span><strong class="stop-milepost">${fmtMile(item.milepost)}</strong></div>
      <h3>${esc(item.name)}</h3>
      <div class="stop-focus-facts"><span>Arrive about <strong>${esc(item.arrival||"Time flexible")}</strong></span><span>Allow <strong>${esc(item.dwellMinutes)} min</strong></span>${Number(item.elevationFt)>0?`<span>Elevation <strong>${Number(item.elevationFt).toLocaleString()} ft</strong></span>`:""}</div>
      <p class="stop-interpretation">${esc(item.practical||"Use the Parkway milepost to orient this planned stop.")}</p>
      <p class="stop-match-note">${esc(matches.length?"Look for: "+matches.join(", ")+".":"A worthwhile pause within the time you have set aside.")}</p>
      <div class="stop-focus-links"><a href="${esc(official)}" target="_blank" rel="noopener">${item.source?"Official stop information":"Official NPS map"}</a>${search?`<a href="${esc(search)}" target="_blank" rel="noopener">Locate named place in Google Maps</a>`:""}</div>
      <p class="stop-map-note">Google Maps place search is for orientation, not verified parking or driving directions. Check current NPS road notices.</p>
      <div class="stop-focus-nav"><button type="button" data-stop-index="${selectedStop-1}" ${selectedStop===0?"disabled":""}>Previous stop</button><button type="button" data-stop-index="${selectedStop+1}" ${selectedStop===items.length-1?"disabled":""}>Next stop</button></div>`;
  }
  function updateStopSelection(){
    document.querySelectorAll("#results button[data-stop-index]").forEach(button=>{const active=Number(button.dataset.stopIndex)===selectedStop;button.classList.toggle("is-selected",active);if(button.hasAttribute("aria-pressed"))button.setAttribute("aria-pressed",String(active));});
    document.querySelectorAll("#results [data-stop-row]").forEach(row=>row.classList.toggle("is-selected",Number(row.dataset.stopRow)===selectedStop));
    stopPins.forEach((marker,index)=>marker?.getElement?.()?.querySelector(".number-pin")?.classList.toggle("is-active",index===selectedStop));
  }
  function selectStop(index,origin="list"){
    if(!Number.isInteger(index)||index<0||index>=stopItems().length)return;
    selectedStop=index;showRoadbook();updateStopSelection();const announcement=$("stopSelectionStatus");if(announcement&&origin!=="initial")announcement.textContent=`Stop ${index+1} of ${stopItems().length}: ${selectedItem(index).name}, ${fmtMile(selectedItem(index).milepost)}.`;
    if(origin!=="map"&&origin!=="initial"&&map&&stopPins[index])map.panTo(stopPins[index].getLatLng(),{animate:false});
    if(origin==="detail"||((origin==="timeline"||origin==="list")&&window.matchMedia?.("(max-width:900px)")?.matches))$("stopFocus")?.scrollIntoView({behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth",block:"nearest"});
    if(origin!=="initial")track("blue_ridge_stop_explore",{route_id:lastPayload?.selected?.id||"",stop_index:index+1,origin});
  }
  function prepareStopControls(){
    const items=stopItems(),strip=$("stopRouteStrip");if(strip){strip.hidden=!items.length;strip.innerHTML=items.map((item,index)=>`<button type="button" class="route-step" data-stop-index="${index}" aria-pressed="false"><span class="route-step-num">${index+1}</span><span class="route-step-copy"><strong>${esc(item.name)}</strong><small>${fmtMile(item.milepost)} · ${esc(item.arrival)}</small></span></button>`).join("");}
    $("timeline")?.querySelectorAll(".timeline-item").forEach((row,index)=>{row.dataset.stopRow=index;const strong=row.querySelector(".timeline-copy strong");if(!strong)return;const button=document.createElement("button");button.type="button";button.className="timeline-stop-action";button.dataset.stopIndex=index;button.setAttribute("aria-pressed","false");button.textContent=strong.textContent;strong.replaceWith(button);});
    $("selectedStopDetails")?.querySelectorAll(".stop-detail-card").forEach((card,index)=>{if(index>=items.length)return;card.dataset.stopRow=index;const button=document.createElement("button");button.type="button";button.className="stop-map-action";button.dataset.stopIndex=index;button.textContent="Explore on the route map";card.appendChild(button);});
    selectedStop=0;showRoadbook();updateStopSelection();
  }

  function renderConditions(payload){const p=payload.selected;if(!p)return;$("weatherCard").innerHTML=p.weather?.ok?`<div class="kicker">MOUNTAIN WEATHER</div><strong>${p.weather.tempMin!=null&&p.weather.tempMax!=null?`${esc(p.weather.tempMin)}–${esc(p.weather.tempMax)}°F`:"NWS loaded"}</strong><p>${esc(weatherLine(p.weather))}</p><div class="model-label">${p.weather?.checkpointCount>1?`NWS hourly forecast across ${esc(p.weather.checkpointCount)} Parkway checkpoints${p.weather.partial?" · partial":""}`:"NWS hourly forecast near high terrain"}</div>`:`<div class="kicker">MOUNTAIN WEATHER</div><strong>Unavailable</strong><p>The high-country forecast could not be loaded. Conditions above the valley can be very different, so check NWS before climbing.</p><div class="model-label">Verify before leaving</div>`;$("viewCard").innerHTML=`<div class="kicker">VIEW OUTLOOK</div><strong>${esc(p.viewOutlook?.label||"Unavailable")}</strong><p>${esc(p.viewOutlook?.detail||"No view outlook available.")}</p><div class="model-label">Forecast-derived · not measured visibility</div>`;$("foliageCard").innerHTML=`<div class="kicker">FALL COLOR</div><strong>${esc(p.foliage?.label||"Not active")}</strong><p>${esc(p.foliage?.detail||"")}</p><div class="model-label">${p.foliage?.active?`Seasonal estimate · ${esc(p.foliage.basis||"")}`:"Seasonal model inactive"}</div>`;}
  function renderRoad(payload){const p=payload.selected;if(!p)return;const notes=[],urgent=[];(p.blocks||[]).forEach(x=>{const n=`<div class="road-note blocked"><strong>Closed ${fmtMile(x.start)}–${fmtMile(x.end).replace("MP ","")}</strong><span>${esc(x.note)}</span></div>`;notes.push(n);urgent.push(n);});(p.cautions||[]).forEach(x=>{const n=`<div class="road-note"><strong>${fmtMile(x.start)}–${fmtMile(x.end).replace("MP ","")}</strong><span>${esc(x.note)}</span></div>`;notes.push(n);urgent.push(n);});if(!notes.length){const n=payload.road?.ok?`<div class="road-note clear"><strong>No route-specific hard closure</strong><span>The current NPS road table did not return a hard closure or construction caution across this selected stretch when checked.</span></div>`:`<div class="road-note blocked"><strong>Road source unavailable</strong><span>Do not assume the section is open. Use the official NPS source before leaving.</span></div>`;notes.push(n);if(!payload.road?.ok)urgent.push(n);}$("roadReality").innerHTML=notes.join("");const alert=$("roadAlertSection"),target=$("roadAlert");if(alert&&target){alert.hidden=!urgent.length;target.innerHTML=urgent.join("");}}
  function renderAlternatives(payload){const pointToPoint=payload.selected?.tripMode==="point-to-point";$("alternatives").innerHTML=(payload.alternatives||[]).map(p=>`<article class="alt-card ${p.blocked?"blocked":""}"><div class="alt-top"><div><div class="eyebrow">${esc(p.fit)}</div><h3>${esc(p.name)}</h3></div><span class="alt-state ${p.blocked?"blocked":p.cautions?.length?"caution":""}">${p.blocked?"Blocked":p.cautions?.length?"Road note":"Valid plan"}</span></div><p>${esc(p.character)}</p><div class="alt-meta"><span>${esc(p.durationHours)} hr</span><span>${esc(p.routeMiles)} mi</span><span>${pointToPoint?esc(p.finishLabel||""):`turn ${fmtMile(p.mileTurn)}`}</span><span>view: ${esc(p.viewOutlook?.label||"unknown")}</span></div>${p.whyNotSelected?`<p class="alt-reason"><strong>${esc(p.whyNotSelected)}</strong></p>`:p.blocked?`<p style="margin-top:8px;color:#8a3f37">An official closure overlaps this drive, so it cannot be selected.</p>`:""}</article>`).join("")||`<div class="source-warning"><strong>No additional route candidates returned.</strong></div>`;}
  function renderFieldNotes(payload){$("fieldNotes").innerHTML=(payload.fieldNotes||[]).map(n=>`<article class="field-note"><strong>${esc(n.label)}</strong><p>${esc(n.text)} <a href="${esc(safeUrl(n.source))}" target="_blank" rel="noopener">NPS ↗</a></p></article>`).join("");}
  function renderSources(payload){$("sources").innerHTML=(payload.sources||[]).map(s=>`<article class="source-card"><div class="source-top"><strong>${esc(s.name)}</strong><span>${esc(s.status)}</span></div><p>${esc(s.note)}</p>${s.updated?`<small>${esc(s.updated)}</small>`:""}<a href="${esc(safeUrl(s.url))}" target="_blank" rel="noopener" data-source-name="${esc(s.name)}">Open source ↗</a></article>`).join("");$("method").innerHTML=Object.values(payload.truth||{}).map(x=>`<p>${esc(x)}</p>`).join("");}
  function ensureMap(){
    if(map||!window.L)return;
    map=L.map("parkwayMap",{scrollWheelZoom:false,zoomControl:true}).setView([35.8,-81.8],6);
    const tiles=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
    let errors=0,loaded=false;
    tiles.on("tileerror",()=>{if(++errors>=3&&!loaded)mapUnavailable("Map tiles failed to load.");});
    tiles.on("tileload",()=>{loaded=true;errors=0;const el=$("parkwayMapFallback");if(el)el.hidden=true;const holder=$("parkwayMap");if(holder?.hidden){holder.hidden=false;map?.invalidateSize();}});
    tiles.addTo(map);markerLayer=L.layerGroup().addTo(map);
    const trackMap=()=>{if(mapInteractionTracked)return;mapInteractionTracked=true;track("blue_ridge_map_interaction",{route_id:lastPayload?.selected?.id||""});};
    map.on("dragstart",trackMap);map.on("zoomstart",trackMap);
  }
  function mapUnavailable(message){const el=$("parkwayMapFallback"),label=$("parkwayMapFailure");if(el)el.hidden=false;if(label)label.textContent=message;if($("parkwayMap"))$("parkwayMap").hidden=true;}
  function pin(label,kind="stop"){const bg=kind==="start"?"#163f50":kind==="finish"?"#865f16":"#1c5853";return L.divIcon({className:"leaflet-div-icon",html:`<div class="number-pin" style="background:${bg}">${esc(label)}</div>`,iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-16]});}
  function drawMap(payload){
    ensureMap();if(!map){mapUnavailable("The interactive map library could not load.");return;}
    markerLayer.clearLayers();stopPins=[];const plan=payload.selected;if(!plan)return;
    const valid=place=>place&&Number.isFinite(Number(place.lat))&&Number.isFinite(Number(place.lon))&&Math.abs(Number(place.lat))<=90&&Math.abs(Number(place.lon))<=180;
    const points=[];
    if(valid(payload.gateway)){const start=L.marker([payload.gateway.lat,payload.gateway.lon],{icon:pin("S","start"),title:"Starting gateway",keyboard:true}).addTo(markerLayer);points.push(start);}
    (plan.stops||[]).forEach((stop,index)=>{
      if(!valid(stop))return;
      const marker=L.marker([stop.lat,stop.lon],{icon:pin(String(index+1)),title:`Stop ${index+1}: ${stop.name}`,keyboard:true}).addTo(markerLayer);
      marker.on("click",()=>selectStop(index,"map"));stopPins[index]=marker;points.push(marker);
    });
    if(plan.tripMode==="point-to-point"&&valid(payload.finishGateway)){const end=L.marker([payload.finishGateway.lat,payload.finishGateway.lon],{icon:pin("F","finish"),title:"Finish gateway",keyboard:true}).addTo(markerLayer);points.push(end);}
    if(points.length)map.fitBounds(L.featureGroup(points).getBounds().pad(.24),{maxZoom:10});
    updateStopSelection();setTimeout(()=>map?.invalidateSize(),80);
    if(!corridorLayer&&!corridorRequest&&payload.parkwayGeoJsonUrl){
      corridorRequest=fetch(payload.parkwayGeoJsonUrl,{headers:{accept:"application/geo+json,application/json"}}).then(response=>{if(!response.ok)throw Error("No Parkway geometry");return response.json();}).then(geo=>{if(!map)return;corridorLayer=L.geoJSON(geo,{style:{weight:3,opacity:.42,color:"#1c5853",interactive:false}}).addTo(map);corridorLayer.bringToBack();}).catch(()=>{const note=$("parkwayCorridorNote");if(note)note.textContent="Corridor geometry unavailable; the numbered stops still work.";});
    }
  }
  function render(payload){lastPayload=payload;mapInteractionTracked=false;renderTop(payload);renderDecision(payload);renderTimeline(payload);renderSelectedStopDetails(payload);renderConditions(payload);renderRoad(payload);renderAlternatives(payload);renderFieldNotes(payload);renderSources(payload);$("results").hidden=false;prepareStopControls();drawMap(payload);showFlowStep(3);const intro=$("flowResultSummary"),plan=payload.selected;if(intro){const gateway=payload.gateway?.label||$("gateway")?.selectedOptions?.[0]?.textContent||"your starting area",stops=plan?.timeline?.items?.length||0,finish=plan?.tripMode==="point-to-point"?` · finish at ${plan.finishLabel||"your destination"}`:" · return to your start";intro.textContent=plan?`From ${gateway} · about ${plan.durationHours} hours · ${stops} planned stop${stops===1?"":"s"}${finish}. ${payload.road?.ok?"Road table checked; verify notices before you go.":"Official road status could not be verified. Check NPS before you go."}`:"No usable drive was returned. Check the NPS road table before traveling.";}$("results").scrollIntoView({block:"start",behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches?"auto":"smooth"});history.replaceState(null,"",`${location.pathname}?${params().toString()}`);track("blue_ridge_planner_complete",{gateway:payload.input?.gateway||"",finish:payload.input?.finish||"return",trip_mode:payload.input?.tripMode||"round-trip",route_id:payload.selected?.id||"",hours:payload.input?.hours||0,road_source:payload.road?.ok?"live":"unavailable",weather_source:payload.selected?.weather?.ok?"live":"unavailable",decision_mode:payload.decisionMeta?.mode||"deterministic"});}
  async function build(){setBusy(true);try{const response=await fetch(`/api/blue-ridge-parkway?${params().toString()}`,{headers:{accept:"application/json"}}),payload=await response.json().catch(()=>null);if(!response.ok||!payload?.ok)throw new Error(payload?.detail||payload?.error||`HTTP ${response.status}`);render(payload);$("plannerStatus").textContent="";}catch(error){track("blue_ridge_planner_error",{message:String(error?.message||error).slice(0,120)});$("plannerStatus").innerHTML=`<span class="error">Live refresh failed: ${esc(error.message||error)}.</span>`;$("results").hidden=true;showFlowStep(2);}finally{setBusy(false);}}
  function applyQuery(){const q=new URLSearchParams(location.search);for(const [id,key] of [["gateway","gateway"],["hours","hours"],["tripDate","date"],["startTime","start"]])if(q.get(key)&&$(id))$(id).value=q.get(key);syncFinishOptions();if(q.get("finish")&&$("finish")){const allowed=[...$("finish").options].some(o=>o.value===q.get("finish")&&!o.disabled);$("finish").value=allowed?q.get("finish"):"return";}syncHours();if(q.get("hours")&&$("hours")&&[...$("hours").options].some(o=>o.value===q.get("hours")))$("hours").value=q.get("hours");if(q.get("interests")){const set=new Set(q.get("interests").split(","));document.querySelectorAll('input[name="interest"]').forEach(el=>el.checked=set.has(el.value));}}
  document.addEventListener("DOMContentLoaded",()=>{
    ensureLeafletCss();installPlannerUpgrade();setDefaults();applyQuery();
    const q=new URLSearchParams(location.search);
    showFlowStep(q.get("gateway")&&$("gateway")?.value?2:1);
    $("plannerForm")?.addEventListener("submit",e=>{
      e.preventDefault();
      if(!$("gateway")?.value){showFlowStep(1,{focus:true,scroll:true});if($("flowStartError"))$("flowStartError").hidden=false;return;}
      if(!selectedInterests().length){showFlowStep(2,{focus:true,scroll:true});$("plannerStatus").textContent="Choose at least one thing you want to experience.";return;}
      build();
    });
    $("flowStartNext")?.addEventListener("click",continueFromStart);
    $("flowBack")?.addEventListener("click",()=>showFlowStep(1,{focus:true,scroll:true}));
    $("flowEdit")?.addEventListener("click",()=>{if($("results"))$("results").hidden=true;showFlowStep(2,{focus:true,scroll:true});track("blue_ridge_flow_edit");});
    $("results")?.addEventListener("click",event=>{
      const button=event.target.closest("button[data-stop-index]");
      if(!button||button.disabled||!$("results").contains(button))return;
      if(button.closest("#selectedStopDetails")&&$("flowAllStops"))$("flowAllStops").open=true;
      selectStop(Number(button.dataset.stopIndex),button.closest("#selectedStopDetails")?"detail":button.closest("#timeline")?"timeline":"list");
    });
    $("gateway")?.addEventListener("change",()=>{
      syncFinishOptions();syncHours(true);syncFlowChoices();
      if($("flowStartError"))$("flowStartError").hidden=true;
      track("blue_ridge_gateway_change",{gateway:$("gateway").value});
      if($("planner")?.dataset.activeStep==="1")continueFromStart();
    });
    $("finish")?.addEventListener("change",()=>{syncHours(true);syncFlowChoices();track("blue_ridge_finish_change",{gateway:$("gateway").value,finish:$("finish").value});});
    $("hours")?.addEventListener("change",()=>{renderCorridorBudget();syncFlowChoices();});
    document.querySelectorAll(".quick-gateway").forEach(button=>button.addEventListener("click",()=>{
      $("gateway").value=button.dataset.gateway;
      $("gateway").dispatchEvent(new Event("change",{bubbles:true}));
      syncFlowChoices();
      if($("planner")?.dataset.activeStep!=="2")showFlowStep(2,{focus:true,scroll:true});
    }));
    document.querySelectorAll(".flow-time-choice").forEach(button=>button.addEventListener("click",()=>{
      const value=button.dataset.hours,select=$("hours");
      if(select&&[...select.options].some(option=>option.value===value)){select.value=value;select.dispatchEvent(new Event("change",{bubbles:true}));}
      syncFlowChoices();
    }));
    $("sources")?.addEventListener("click",event=>{const link=event.target.closest("a[data-source-name]");if(link)track("blue_ridge_source_click",{source_name:link.dataset.sourceName||""});});
  });
})();
