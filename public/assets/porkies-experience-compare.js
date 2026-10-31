/* EXPERIENCE_OS_V1: two-outing decision lens.
 * Descriptive, DNR-sourced, never a certified route or open-trail status.
 * All rendered maps are source parking points, not directions.
 */
(function(root){
 "use strict";
 const DATA="/porcupine-mountains/experience-options.json";
 const ENTRY="/porcupine-mountains/experience-entry-evidence.json";
 const PARK="https://www.michigan.gov/recsearch/parks/porkies";
 const allowedIds=["clouds","summit","river","nature","escarpment","winter"];
 function validId(x){return allowedIds.includes(x);}
 function summary(option,inputs,seasonFor){
  inputs=inputs||{};
  const id=option?.id,zone=option?.zone;
  const iso=inputs.date||"";
  const mode=(typeof seasonFor==="function"?seasonFor(iso):"unknown");
  const arr=["west","east","inpark"].includes(inputs.arrival)?inputs.arrival:"inpark";
  const vehicle=["car","rv","trailer"].includes(inputs.vehicle)?inputs.vehicle:"car";
  const ability=["low","moderate","high"].includes(inputs.ability)?inputs.ability:"moderate";
  const hours=[2,4,8,16].includes(Number(inputs.hours))?Number(inputs.hours):4;
  const reasons=[];
  let key="verify",heading="Check access before visiting";
  if(mode==="unknown"){
   key="unknown";heading="Visit date needed";reasons.push("Select a valid date above before judging seasonal access.");
  }else{
   if((mode==="winter"||mode==="reopening")&&["clouds","summit","escarpment"].includes(id)){
    key="limited";heading="Scenic-road approach unverified";
    reasons.push("M-107 and interior South Boundary vehicle access are seasonally restricted; no current road-opening proof is available.");
   }else if(id==="river"){
    key="limited";heading="Western road access unresolved";
    reasons.push("County Road 519's M-28 work-zone reopening and the final signed entrance to DNR parking asset #841 remain unverified.");
   }else if(id==="winter"){
    key="verify";heading="Check the official ski report";
    reasons.push("No verified same-day snow, grooming, lift or parking operations.");
    if(!["winter","prewinter"].includes(mode))reasons.push("A winter-sports plan depends on seasonal snow and operations, not just your travel date.");
   }else reasons.push("A mapped parking point and historical trail description are not proof of an open road, lot or footpath.");
  }
  if(id==="nature" && mode!=="unknown" && /^(\d{4})-(\d\d)-(\d\d)$/.test(iso)){
   const md=iso.slice(5);
   if(md>="10-15"||md<"05-15")reasons.push("The visitor-center building is seasonally closed Oct 15–May 14. Outdoor trail access is a separate unknown.");
  }
  if((vehicle==="rv"||vehicle==="trailer")){
   if(["clouds","summit"].includes(id))reasons.push("DNR recommends a different lower staging area for campers/trailers; its exact navigation point is not verified here.");
   else reasons.push("RV/trailer turning and designated staging at this mapped lot have not been verified.");
  }
  if(zone!=="interior"&&arr!=="inpark"&&arr!==zone)reasons.push("This is a separate park district from the side where you arrive; cross-park driving time is not verified.");
  if(ability==="low"){
   if(id==="escarpment"){
    key="limited";heading="Not a short or accessible walk";
    reasons.push("Exposed steep ridge and one-way return logistics do not match a short approach.");
   }else if(id==="summit")reasons.push("The tower requires stairs; it is not a step-free overlook.");
   else if(id==="river")reasons.push("Only Nawadaha has a separately documented accessible platform; the full waterfall trails involve stairs, rocks and uneven ground.");
   else if(id==="nature")reasons.push("The full 1.4-mile loop has no verified step-free access description.");
   else if(id==="winter")reasons.push("Adaptive activity availability and the individual winter route need direct DNR confirmation.");
  }
  if(id==="escarpment"){
   reasons.push("DNR editions disagree on trail mileage (4.3 vs 3.7 miles); no full route or shuttle is certified.");
   if(hours<=4){key="limited";if(ability!=="low")heading="Poor fit for a short outing";reasons.push("The longer ridge traverse and its return logistics are not a quick scenic stop.");}
  }
  if(id==="river")reasons.push("The riverbank trails are not a certified loop; unbridged-crossing conditions must not be inferred.");
  return {key,heading,reasons,mode,roadOpenVerified:false,routeCertified:false,parkingOpenVerified:false};
 }
 function comparison(a,b,inputs){
  if(!a||!b)return "Select two DNR-documented outings to compare.";
  if(a.id===b.id)return "Choose two different outings to see their practical differences.";
  if(a.zone!==b.zone)return "Different park districts: do not assume a connected scenic drive or a verified travel time between these parking points.";
  if(a.parkingId===b.parkingId)return "These outings refer to the same DNR-mapped parking area but are very different walks; shared parking does not make the longer trail safe or open.";
  if(a.effort!==b.effort)return "The approaches demand different walking commitments. Published trail lengths are not estimates of your door-to-door outing or return time.";
  return "Different experiences in the same general park area. Compare the surfaces, seasonal access and official links before choosing.";
 }
 function elt(doc,tag,cls,value){const e=doc.createElement(tag);if(cls)e.className=cls;if(value!==undefined)e.textContent=value;return e;}
 function readInputs(doc){const v=id=>doc.getElementById(id)?.value||"";return {date:v("travel-date"),arrival:v("arrival"),vehicle:v("vehicle"),ability:v("ability"),hours:Number(v("hours"))};}
 function renderPanel(doc,node,option,entry,inputs,seasonFor){
  const verdict=summary(option,inputs,seasonFor);
  node.replaceChildren();
  node.dataset.option=option.id;
  node.dataset.verdict=verdict.key;
  const art=elt(doc,"div","experience-photo");
  if(option.photo){
   const f=elt(doc,"figure");const img=elt(doc,"img");
   img.src=option.photo.src;img.alt=option.photo.alt;img.width=900;img.height=600;img.loading="lazy";img.decoding="async";img.referrerPolicy="no-referrer";
   const caption=elt(doc,"figcaption");
   const link=elt(doc,"a","",option.photo.credit);link.href=option.photo.creditUrl;link.target="_blank";link.rel="noopener noreferrer";caption.appendChild(link);
   if(option.photo.licenseUrl){
    const lic=elt(doc,"a","experience-photo-license","Photo license");lic.href=option.photo.licenseUrl;lic.target="_blank";lic.rel="noopener noreferrer";caption.appendChild(lic);
   }
   if(option.photoAbout)caption.appendChild(elt(doc,"span","experience-photo-scope",option.photoAbout));
   f.append(img,caption);art.appendChild(f);
  }else{
   art.classList.add("experience-photo-empty");art.append(elt(doc,"span","experience-illustration","Field notes"),elt(doc,"p","",option.photoAbout));
  }
  node.appendChild(art);
  const body=elt(doc,"div","experience-body");
  body.append(elt(doc,"p","eyebrow",option.zone==="west"?"Western river country":option.zone==="central"?"Central highlands":"Eastern forest and escarpment"),elt(doc,"h3","",option.name),
    elt(doc,"p","experience-tagline",option.tagline),elt(doc,"p","experience-decision",verdict.heading));
  const dl=elt(doc,"dl","experience-facts");
  for(const [k,v] of [["The experience",option.experience],["Walking commitment",option.publishedDistance],["What the path is like",option.accessSurface]]){
   const dt=elt(doc,"dt","",k),dd=elt(doc,"dd","",v);dl.append(dt,dd);
  }
  body.appendChild(dl);
  // EXPERIENCE_OS_V1: interpretation belongs to the selected outing,
  // not to an unrelated photo gallery or a made-up live access verdict.
  if(typeof option.fieldNote==="string"&&option.fieldNote.trim()){
   const detail=elt(doc,"details","experience-fieldnote");
   const summary=elt(doc,"summary","experience-fieldnote-trigger","What to notice on this outing");
   const note=elt(doc,"p","experience-fieldnote-copy",option.fieldNote);
   detail.append(summary,note);
   if(typeof option.fieldNoteSource==="string"&&/^https:\/\/www\.michigan\.gov\//.test(option.fieldNoteSource)){
    const evidence=elt(doc,"a","experience-fieldnote-source","Why this landscape matters · Michigan DNR");
    evidence.href=option.fieldNoteSource;
    evidence.target="_blank";evidence.rel="noopener noreferrer";
    detail.appendChild(evidence);
   }
   body.appendChild(detail);
  }
  if(entry){
   const begin=elt(doc,"section","experience-entry");
   begin.setAttribute("aria-label","Mapped parking and trail-entry source check");
   begin.dataset.entryStatus=entry.signedEntryStatus;
   begin.append(elt(doc,"p","eyebrow","Where the DNR map places you"));
   begin.append(elt(doc,"p","experience-entry-relation",entry.relation));
   const next=elt(doc,"p","experience-entry-next");
   next.append(elt(doc,"strong","","At the park: "),doc.createTextNode(entry.nextAction));
   begin.appendChild(next);
   const proof=elt(doc,"details","experience-entry-source");
   const trigger=elt(doc,"summary","","Inspect parking-to-trail evidence");
   const detail=elt(doc,"p","", "DNR parking asset #"+entry.dnrParkingAssetId+
    " is "+entry.parkingToNamedRecreationPointMeters+" m in a straight line from DNR named recreation point #"+
    entry.dnrRecreationPointId+". This is a GIS point-to-point separation, NOT a walk, mapped signed entrance, passable trail, or open parking lot.");
   const source=elt(doc,"a","", "DNR recreation point source");source.href=entry.parkingRecordSource;source.target="_blank";source.rel="noopener noreferrer";
   proof.append(trigger,detail,source);begin.appendChild(proof);
   const locate=elt(doc,"button","experience-locate-parking","Locate this DNR parking point");locate.type="button";
   locate.addEventListener("click",()=>{
    if(root.PorkiesAtlas?.map){
     root.dispatchEvent(new CustomEvent("porkies:compare-parking",{detail:{ids:[entry.parkingId,entry.parkingId]}}));
    }else{
     const target=doc.querySelector('.parking-card[data-parking-id="'+entry.parkingId+'"]');
     if(target){target.scrollIntoView({block:"start",behavior:"auto"});target.querySelector("h4")?.setAttribute("tabindex","-1");target.querySelector("h4")?.focus({preventScroll:true});}
    }
   });
   begin.appendChild(locate);
   body.appendChild(begin);
  }
  const why=elt(doc,"div","experience-proof");why.append(elt(doc,"h4","","Before you choose"));
  const ul=elt(doc,"ul");
  for(const r of verdict.reasons.slice(0,6))ul.appendChild(elt(doc,"li","",r));
  ul.appendChild(elt(doc,"li","",option.limits));why.appendChild(ul);
  body.appendChild(why);
  const actions=elt(doc,"div","experience-actions");
  const source=elt(doc,"a","experience-source","Read official DNR evidence");
  source.href=option.source;source.target="_blank";source.rel="noopener noreferrer";actions.appendChild(source);
  if(option.trailId){
   const jump=elt(doc,"button","experience-trail-link","Inspect named trail evidence");jump.type="button";
   jump.addEventListener("click",()=>{
    const detail=doc.querySelector('details.trail-truth-card[data-trail="'+option.trailId+'"]');
    if(!detail)return;
    const filter=doc.getElementById("trail-truth-filter");
    if(filter){filter.value="all";filter.dispatchEvent(new Event("change",{bubbles:true}));}
    detail.open=true;detail.scrollIntoView({block:"start",behavior:"auto"});
    detail.querySelector("summary")?.focus({preventScroll:true});
   });
   actions.appendChild(jump);
  }
  body.appendChild(actions);node.appendChild(body);
  return verdict;
 }
 function init(doc){
  const section=doc.getElementById("experience-compare");
  if(!section)return;
  const slots=[doc.getElementById("experience-a"),doc.getElementById("experience-b")];
  const sels=[doc.getElementById("experience-choice-a"),doc.getElementById("experience-choice-b")];
  const status=doc.getElementById("experience-compare-status");
  const compare=doc.getElementById("experience-map-compare");
  const live=doc.getElementById("experience-compare-live");
  const engine=root.PorkiesEngine?.seasonFor;
  Promise.all([DATA,ENTRY].map(url=>root.fetch(url,{credentials:"same-origin"}).then(r=>{
   if(!r.ok)throw Error("Cannot read official source file: "+url);
   return r.json();
  }))).then(([data,ledger])=>{
   if(data.version!==1||data.policy?.accessVerified!==false||data.policy?.trailRouteCertified!==false||
      !Array.isArray(data.options)||data.options.length!==6||
      data.options.some(o=>!validId(o.id)||!o.parkingAssetId||!o.parkingId||!o.source||!o.limits||
        (o.photo&&(!o.photo.creditUrl||!o.photo.alt)))||
      new Set(data.options.map(o=>o.id)).size!==6)throw Error("Unreviewed experience evidence");
   if(ledger.schemaVersion!==1||ledger.signedTrailEntranceVerified!==false||
      !Array.isArray(ledger.records)||ledger.records.length!==6||
      ledger.records.some(e=>!validId(e.experienceId)||!e.matchedParkingToRecreationPoint||
        e.signedPedestrianEntranceIndependentlyVerified!==false||
        e.continuousParkingToTrailGeometryCertified!==false||
        e.openParkingVerified!==false||e.openRoadVerified!==false||
        e.openTrailVerified!==false||!e.officialRelationSource||!e.nextAction||
        !Number.isFinite(e.parkingToNamedRecreationPointMeters)))throw Error("Unverified trail-entry ledger");
   const byId=Object.fromEntries(data.options.map(o=>[o.id,o]));
   const entryById=Object.fromEntries(ledger.records.map(e=>[e.experienceId,e]));
   if(ledger.records.some(e=>!byId[e.experienceId]||
     byId[e.experienceId].parkingId!==e.parkingId||
     byId[e.experienceId].parkingAssetId!==e.dnrParkingAssetId))
    throw Error("Source parking identities changed");
   let first=false;
   function render(){
    const input=readInputs(doc);
    const selected=sels.map(x=>byId[x.value]||byId.clouds);
    const states=selected.map((o,i)=>renderPanel(doc,slots[i],o,entryById[o.id],input,engine));
    status.textContent=comparison(selected[0],selected[1],input);
    live.textContent=states.map((v,i)=>(i?"B: ":"A: ")+selected[i].name+" — "+v.heading).join(". ");
    compare.disabled=selected[0].id===selected[1].id;
    section.dataset.loaded="yes";
    if(first)root.dispatchEvent(new CustomEvent("porkies:experience-compared",{detail:{ids:selected.map(o=>o.id)}}));
    first=true;
   }
   sels.forEach(s=>s.addEventListener("change",render));
   ["travel-date","arrival","vehicle","hours","ability"].forEach(id=>{
    const e=doc.getElementById(id);
    e?.addEventListener("change",render);
   });
   doc.getElementById("planner")?.addEventListener("submit",()=>root.setTimeout(render,0));
   compare.addEventListener("click",()=>{
    const ids=sels.map(s=>byId[s.value]?.parkingId).filter(Boolean);
    if(ids.length===2&&root.PorkiesAtlas?.map){
     root.dispatchEvent(new CustomEvent("porkies:compare-parking",{detail:{ids}}));
    }else status.textContent="The interactive map is unavailable. Use the DNR parking details and official map below; no route is implied.";
   });
   render();
  }).catch(()=>{
   section.dataset.loaded="unavailable";
   status.textContent="Comparison updates are unavailable. The two DNR-sourced starting points remain readable below; use the official park links and parking map.";
   compare.disabled=true;sels.forEach(s=>s.disabled=true);
  });
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={summary,comparison,validId};
 if(root.document){
  if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",()=>init(root.document),{once:true});
  else init(root.document);
 }
})(typeof window!=="undefined"?window:globalThis);
