"use strict";

const DETROIT_ENGINE_REGISTRY = Object.freeze([
  {id:"great-lakes-ais",family:"maritime",role:"candidate",status:"live",source:"Great Lakes Ship Tracker",handoff:"/great-lakes-freighter-tracking/"},
  {id:"great-lakes-water",family:"water",role:"candidate+veto",status:"live",source:"Great Lakes Buoys",handoff:"/great-lakes-buoys/"},
  {id:"night-sky-aurora",family:"sky",role:"candidate",status:"live",source:"Northern Lights Michigan",handoff:"/northern-lights-michigan/"},
  {id:"sunset-photography",family:"sky",role:"candidate",status:"live",source:"shared solar + NWS sky engine",handoff:"/detroit-sunset-tonight/"},
  {id:"fall-color-phenology",family:"seasonal",role:"candidate",status:"live",source:"Michigan Fall Color",handoff:"/fall-color/"},
  {id:"bird-migration-live",family:"wildlife",role:"candidate",status:"live",source:"Michigan Birding Report",handoff:"/detroit-birding-today/"},
  {id:"great-lakes-beach",family:"water",role:"candidate+veto",status:"live",source:"Great Lakes Beach Conditions",handoff:"/great-lakes-beaches/sterling-state-park/"},
  {id:"southeast-river",family:"water",role:"candidate",status:"live",source:"USGS Water Data",handoff:"/national-tools/rivers/"},
  {id:"morel-phenology",family:"seasonal",role:"candidate",status:"seasonal",source:"Michigan Morel Report",handoff:"https://morel.chrisizworski.com/"},
  {id:"clean-air-window",family:"environment",role:"candidate+veto",status:"live",source:"Michigan Outdoors Now air-quality field",handoff:"/national-tools/smoke/"},
  {id:"lake-st-clair-ice",family:"seasonal",role:"candidate",status:"seasonal",source:"Michigan Ice Report",handoff:"/michigan-ice/regions/lake-st-clair.html"},
  {id:"xc-snow-screen",family:"winter",role:"candidate",status:"seasonal",source:"Midwest XC Ski Conditions",handoff:"https://xcski.chrisizworski.com/"},
  {id:"monarch-migration",family:"wildlife",role:"registered-not-enabled",status:"rights-review",source:"Monarch Migration Live",handoff:"/national-tools/monarch-migration-live"},
  {id:"park-weather",family:"general",role:"candidate",status:"live",source:"Michigan Outdoors Now",handoff:"https://michiganoutdoorsnow.chrisizworski.com/"}
]);

function registryById(){
  return Object.fromEntries(DETROIT_ENGINE_REGISTRY.map(engine=>[engine.id,engine]));
}
function enabledEngineIds(){
  return DETROIT_ENGINE_REGISTRY.filter(engine=>engine.status==="live"||engine.status==="seasonal").map(engine=>engine.id);
}

module.exports={DETROIT_ENGINE_REGISTRY,registryById,enabledEngineIds};
