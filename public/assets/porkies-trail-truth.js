/* Source-led 21-trail crosswalk. Cards themselves remain readable without JS.
 * Never convert source descriptions to hiking ETA or safe route directions.
 */
(function(root){
 "use strict";
 function filterCards(value,doc){
  const cards=[...doc.querySelectorAll(".trail-truth-card")];
  let shown=0;
  for(const card of cards){
   const show=value==="all"||
    value==="short"&&card.dataset.short==="yes"||
    ["west","east","central","interior"].includes(value)&&card.dataset.region===value||
    value==="river"&&card.dataset.category==="river-crossing"||
    value==="editions"&&card.querySelector(".trail-edition-warning")!==null;
   card.hidden=!show;
   if(show)shown++;
  }
  const line=doc.getElementById("trail-truth-count");
  if(line)line.textContent="Showing "+shown+" of 21 DNR-described trails. Distances are historical references, not validated hiking routes.";
  return shown;
 }
 function init(doc){
  const select=doc.getElementById("trail-truth-filter");
  if(!select)return;
  select.addEventListener("change",()=>filterCards(select.value,doc));
  doc.querySelectorAll(".trail-see-map").forEach(button=>button.addEventListener("click",()=>{
   const detail=button.closest(".trail-truth-card");
   if(!detail)return;
   const name=button.getAttribute("data-source-trail");
   if(typeof name!=="string"||name.length>150)return;
   root.dispatchEvent(new CustomEvent("porkies:trail-reference",{detail:{name}}));
   doc.getElementById("parking-map")?.scrollIntoView({block:"center",behavior:"smooth"});
  }));
 }
 if(typeof module!=="undefined"&&module.exports)module.exports={filterCards};
 if(root.document){
  if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",()=>init(root.document),{once:true});
  else init(root.document);
 }
})(typeof window!=="undefined"?window:globalThis);
