/* Standalone Split Rock River route decision engine. No predicted crossings. */
(function(root,factory){const e=factory();if(typeof module!=="undefined"&&module.exports)module.exports=e;if(root)root.SplitRockRiverEngine=e})(typeof window!=="undefined"?window:null,function(){
"use strict";
const RECORD={reviewed:"2026-10-12",bulletin:"2026-10-05",eastOpenSince:"2025-06-16",westOpenSince:"2026-07-10",bridge:false,official:"https://superiorhiking.org/trail-conditions/",route:"https://superiorhiking.org/trail-section/two-harbors-to-silver-bay/"};
function evaluate(i){
 const x=Object.assign({goal:"loop",time:"halfday",date:""},i||{});
 const out={code:"VERIFY_CURRENT_NOTICES",heading:"Use the signed highway-underpass alternate",summary:"Both renewed loop sides are reported open, but the former upstream river crossing still has no bridge. The official alternate uses spur trails and the paved trail/Highway 61 underpass.",facts:["Eastern loop renewed and reopened June 16, 2025.","Western loop renewed and reopened July 10, 2026.","No bridge at the former crossing. Do not assume a safe ford.","Check the latest SHTA bulletin and posted signs before hiking."],steps:[],source:RECORD,estimate:null};
 if(x.goal==="ford"){
  out.code="UNBRIDGED_CROSSING";out.heading="Do not plan on a bridge at the river crossing";out.summary="No bridge exists at the former loop crossing. Conditions at the water are not confirmed by this site; it cannot certify a ford. Use the official alternate or choose an out-and-back.";out.steps=["Do not rely on an assumed crossing.","Open the official SHTA trail-condition notice for the signed alternate.","Confirm your route and junctions using an authoritative trail map."];return out;
 }
 if(x.goal==="east"||x.goal==="west"){
  out.code="OUT_AND_BACK";out.heading=(x.goal==="east"?"Eastern":"Western")+" side: out-and-back option";
  out.summary="Stay on the chosen renewed side, turn around before the unbridged crossing, and return by the same route. This avoids relying on a river ford.";
  out.steps=["Begin at the Split Rock River Wayside trailhead (MN 61 milepost 43.5).","Use current SHTA mapping to reach the correct side; watch spur-trail junctions.","Turn back well before the former bridge crossing; follow the same route to your trailhead."];
 }else if(x.goal==="thru"){
  out.code="THROUGH_ROUTE";out.heading="Through-hike requires junction-by-junction verification";out.summary="Both sides are reported open but the unbridged river site prevents treating the upper crossing as a standard bridged connection.";
  out.steps=["Open the SHTA trail-condition bulletin and trail section map.","Follow the official spur-to-paved-path/Highway 61 underpass alternate where required.","Confirm through-route parking and any overnight restrictions independently."];
 }else{
  out.steps=["Begin at the Split Rock River Wayside trailhead (milepost 43.5; no overnight parking).","Follow signed SHT spur trails to the open loop segments.","To avoid the missing upstream bridge, follow the SHTA-specified alternate: the spur toward the wayside, paved path and Highway 61 underpass, then the other spur to the SHT.","Never improvise a road crossing or river crossing; follow current official signs."];
 }
 if(x.time==="short"){out.code="TIME_NOT_VERIFIED";out.heading="A short outing? Choose the out-and-back";out.summary="The published loop is about 5 miles including its 1.2 miles of access spur. The alternate route can add distance and has not been verified here as a measured shorter loop. A short time budget is better used on a partial out-and-back."}
 if(x.date){const d=new Date(x.date+"T12:00:00Z"),review=new Date(RECORD.bulletin+"T12:00:00Z");if(Number.isFinite(d.valueOf())&&(d-review)/86400000>21){out.facts.push("Your selected date is more than 21 days after the last bulletin used in this tool; source status needs reconfirmation.");out.code="RECHECK_BULLETIN";}}
 return out;
}
return {RECORD,evaluate};
});
