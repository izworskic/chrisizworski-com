"use strict";

// Keep the established specialist engines unchanged behind a thin composition
// layer. Regional discovery widens the candidate universe before JEV selects
// the board; it does not replace any specialist truth or safety gate.
const base=require("./expanded-engines-base.js");
const regional=require("./regional-discovery.js");
const daylight=require("./regional-daylight.js");

async function loadExpandedEngineStates(now=new Date()){
  const [states,regionalDiscovery]=await Promise.all([
    base.loadExpandedEngineStates(now),
    regional.loadRegionalDiscoveryState(now)
  ]);
  return{...states,regionalDiscovery:daylight.applyRegionalDaylightGate(regionalDiscovery,now)};
}

function emitExpandedCandidates({placeStates,expandedStates}){
  const existing=base.emitExpandedCandidates({placeStates,expandedStates});
  const regionalRows=regional.regionalDiscoveryCandidates(expandedStates&&expandedStates.regionalDiscovery);
  return{
    byEngine:{...(existing&&existing.byEngine||{}),"regional-discovery":regionalRows},
    candidates:[...(existing&&existing.candidates||[]),...regionalRows]
  };
}

function expandedSourceStatus(states){
  const existing=base.expandedSourceStatus(states||{});
  const state=states&&states.regionalDiscovery||null;
  return{
    ...existing,
    "regional-discovery":{
      ok:Boolean(state&&state.ok),
      state:(state&&state.state)||(state&&state.ok?"live":"error"),
      error:state&&state.error||null,
      discoveredCount:state&&state.data&&state.data.discoveredCount||0,
      evaluatedCount:state&&state.data&&state.data.evaluatedCount||0,
      candidateCount:state&&state.data&&state.data.candidateCount||0,
      daylightSuppressedCount:state&&state.data&&state.data.daylightSuppressedCount||0
    }
  };
}

module.exports={
  ...base,
  REGIONAL_DISCOVERY_API:regional.DISCOVERY_API,
  loadExpandedEngineStates,
  emitExpandedCandidates,
  expandedSourceStatus,
  _test:{...(base._test||{}),regionalDiscovery:regional._test,regionalDaylight:daylight._test}
};