"use strict";

const crypto = require("node:crypto");
const { decideClosedSet } = require("../mackinac-island/harness.js");
const { snapshotFor } = require("../fall-color/model.js");
const { REGIONS } = require("../fall-color/regions.js");
const {
  loadSpecialistEngineStates,
  normalizeOpportunityCandidate,
  emitSpecialistCandidates,
  hardGateSpecialistCandidates,
  dedupeMixedPool,
  bundleCandidatesByPlace,
  countByEngine,
  engineDiagnostics
} = require("./engines.js");

const OUTDOORS_NOW = "https://michiganoutdoorsnow.chrisizworski.com";
const FALL_CONDITIONS = "https://chrisizworski.com/api/fall-color-conditions";

const PLACES = [
  {
    id:"belle-isle", name:"Belle Isle Park", area:"Detroit", lat:42.3433, lon:-82.9743,
    setting:"Detroit River island", drive:"15–25 min", driveClass:"near",
    activities:["scenic","hiking","birding"],
    officialUrl:"https://www.michigan.gov/recsearch/parks/belleisle"
  },
  {
    id:"lake-st-clair-metropark", name:"Lake St. Clair Metropark", area:"Harrison Township", lat:42.5755, lon:-82.8075,
    setting:"Lake St. Clair shoreline and marsh", drive:"35–50 min", driveClass:"near",
    activities:["paddling","birding","scenic","hiking"],
    officialUrl:"https://www.metroparks.com/lake-st-clair-metropark/"
  },
  {
    id:"kensington-metropark", name:"Kensington Metropark", area:"Milford", lat:42.5341, lon:-83.6464,
    setting:"Inland lake and rolling woodland", drive:"45–65 min", driveClass:"near",
    activities:["hiking","birding","paddling","scenic"],
    officialUrl:"https://www.metroparks.com/kensington-metropark/"
  },
  {
    id:"waterloo", name:"Waterloo Recreation Area", area:"Chelsea", lat:42.3378, lon:-84.1830,
    setting:"Glacial lakes and hardwood forest", drive:"60–80 min", driveClass:"mid",
    activities:["hiking","paddling","birding","scenic"],
    officialUrl:"https://www.michigan.gov/recsearch/parks/waterloo"
  },
  {
    id:"shiawassee-nwr", name:"Shiawassee National Wildlife Refuge", area:"Saginaw", lat:43.3498, lon:-84.0061,
    setting:"River floodplain and managed wetland", drive:"90–115 min", driveClass:"far",
    activities:["birding","hiking","scenic"],
    officialUrl:"https://www.fws.gov/refuge/shiawassee"
  },
  {
    id:"port-crescent-state-park", name:"Port Crescent State Park", area:"Port Austin", lat:44.0047, lon:-83.0550,
    setting:"Lake Huron shoreline, river, and dark-sky preserve", drive:"110–135 min", driveClass:"far",
    activities:["dark-sky","scenic","birding","paddling","hiking"],
    officialUrl:"https://www.michigan.gov/recsearch/parks/portcrescent"
  }
];

const APPROVED_BOARD_IMAGES = [
  {
    id:"belle-isle-cc0",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Belle_Isle_Park.jpg?width=1600",
    alt:"Belle Isle Park in Detroit, Michigan",
    credit:"WMrapids / Wikimedia Commons",
    license:"CC0",
    licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:Belle_Isle_Park.jpg",
    placeIds:["belle-isle"]
  },
  {
    id:"belle-isle-skyline-cc-by-sa-4",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Detroit_from_Belle_Isle.jpg?width=1600",
    alt:"Detroit skyline viewed from Belle Isle",
    credit:"ACRaider / Wikimedia Commons",
    license:"CC BY-SA 4.0",
    licenseUrl:"https://creativecommons.org/licenses/by-sa/4.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:Detroit_from_Belle_Isle.jpg",
    placeIds:["belle-isle"]
  },
  {
    id:"detroit-riverwalk-cc-by-4",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Walking_Path_on_the_Detroit_Riverwalk.jpg?width=1600",
    alt:"Walking path on the Detroit Riverwalk",
    credit:"RuralResurrection / Wikimedia Commons",
    license:"CC BY 4.0",
    licenseUrl:"https://creativecommons.org/licenses/by/4.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:Walking_Path_on_the_Detroit_Riverwalk.jpg",
    placeIds:["detroit-riverfront"]
  },
  {
    id:"huron-river-ann-arbor-cc-by-3",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/HuronRiverAnnArbor.JPG?width=1600",
    alt:"Huron River in the Ann Arbor area",
    credit:"AndrewHorne / Wikimedia Commons",
    license:"CC BY 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by/3.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:HuronRiverAnnArbor.JPG",
    placeIds:["huron-river-ann-arbor"]
  },
  {
    id:"pointe-mouillee-public-domain",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Pointe_Mouillee.jpg?width=1500",
    alt:"Aerial view of Pointe Mouillee Wildlife Refuge on western Lake Erie",
    credit:"U.S. Army Corps of Engineers / Wikimedia Commons",
    license:"Public domain",
    licenseUrl:"https://commons.wikimedia.org/wiki/File:Pointe_Mouillee.jpg",
    creditUrl:"https://commons.wikimedia.org/wiki/File:Pointe_Mouillee.jpg",
    placeIds:["western-lake-erie"]
  },
  {
    id:"sterling-state-park-cc-by-3",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Sterling_State_Park_Michigan_pedestrian_bridge_over_lagoon.JPG?width=1600",
    alt:"Pedestrian bridge over a lagoon at Sterling State Park",
    credit:"Dwight Burdette / Wikimedia Commons",
    license:"CC BY 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by/3.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:Sterling_State_Park_Michigan_pedestrian_bridge_over_lagoon.JPG",
    placeIds:["sterling-state-park"]
  },
  {
    id:"lake-st-clair-cc0",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/View_of_Lake_St._Clair_from_Lake_St._Clair_Metropark%E2%80%99s_trail_2025-09-17.jpg?width=1280",
    alt:"Lake St. Clair from Lake St. Clair Metropark",
    credit:"TheWxResearcher / Wikimedia Commons",
    license:"CC0",
    licenseUrl:"https://creativecommons.org/publicdomain/zero/1.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:View_of_Lake_St._Clair_from_Lake_St._Clair_Metropark%E2%80%99s_trail_2025-09-17.jpg",
    placeIds:["lake-st-clair-metropark","lake-st-clair-ice"]
  },
  {
    id:"kensington-cc-by-sa",
    src:"https://commons.wikimedia.org/wiki/Special:Redirect/file/Kensington_MetroPark_by_Joshua_Young.png?width=1280",
    alt:"Kensington Metropark in southeast Michigan",
    credit:"Joshua Young / Wikimedia Commons",
    license:"CC BY-SA 3.0",
    licenseUrl:"https://creativecommons.org/licenses/by-sa/3.0/",
    creditUrl:"https://commons.wikimedia.org/wiki/File:Kensington_MetroPark_by_Joshua_Young.png",
    placeIds:["kensington-metropark"]
  }
];

const HARD_ALERT = /(Tornado Warning|Severe Thunderstorm Warning|Flash Flood Warning|Extreme Wind Warning|Blizzard Warning|Ice Storm Warning|Hurricane Warning|Tropical Storm Warning)/i;
const SOFT_ALERT = /(Watch|Advisory|Statement|Warning)/i;
const WRITER_MODEL_DEFAULT = "claude-haiku-4-5-20251001";
const EDITORIAL_TREATMENTS = {
  PLACE_CONTEXT: "Explain what is distinctive and useful about this specific place for the activity shown on the card.",
  WHY_TODAY: "Explain why today's verified conditions make this outing distinct enough to notice.",
  DRIVE_DECISION: "Translate the evidence into whether the travel friction is justified for this specific outing.",
  NEXT_CHECK: "Explain the one specialist check that should decide whether the user commits.",
  MIGRATION_CONTEXT: "Explain what the migration signal actually means at this place and time, using verified place and regional birding context.",
  SEASONAL_CONTEXT: "Explain the verified seasonal signal without pretending it proves conditions at the exact place."
};

const PLACE_CONTEXT = {
  "belle-isle":{
    sourceLabel:"Michigan DNR — Belle Isle Park",
    sourceUrl:"https://www.michigan.gov/recsearch/parks/belleisle",
    facts:[
      "Belle Isle is a 985-acre island park in the Detroit River near downtown Detroit.",
      "The island provides views toward Detroit and Canada and mixes natural shoreline with major cultural attractions.",
      "Belle Isle is the official southern trailhead of Michigan's Iron Belle Trail."
    ]
  },
  "lake-st-clair-metropark":{
    sourceLabel:"Huron-Clinton Metroparks — Lake St. Clair Metropark",
    sourceUrl:"https://www.metroparks.com/lake-st-clair-metropark/lake-st-clair-metropark-nature-center/",
    facts:[
      "The nature-center trail system moves through wet woods, shrublands and marsh habitat.",
      "The Main Trail is about 0.75 mile and follows cottonwoods, meadow and South Marsh habitat.",
      "A raised marsh walkway and observation deck provide wetland views, while the Meadow Loop uses wet shrubland habitat."
    ]
  },
  "kensington-metropark":{
    sourceLabel:"Huron-Clinton Metroparks — Kensington Nature Center",
    sourceUrl:"https://www.metroparks.com/kensington-metropark/kensington-metropark-nature-center/",
    facts:[
      "Kensington's nature-center area spans more than 700 acres of forests, fields, fens and swamps.",
      "Nature trails range from roughly 1.5 to 2 miles and combine compact gravel, boardwalks, wetlands and mixed forest.",
      "The Wildwing Trail follows water and marshland and includes an extensive boardwalk with views toward a heron rookery."
    ]
  },
  "waterloo":{
    sourceLabel:"Michigan DNR — Waterloo Recreation Area",
    sourceUrl:"https://www.michigan.gov/recsearch/parks/waterloo",
    facts:[
      "Waterloo Recreation Area contains 11 inland lakes, giving the park a much broader water-and-woods landscape than a single trail stop.",
      "The park includes the Eddy Discovery Center and a bog trail in addition to its larger trail network.",
      "Portage Lake and Crooked Lake both have day-use areas, making the park suitable for a longer half-day or full-day outing."
    ]
  },
  "shiawassee-nwr":{
    sourceLabel:"U.S. Fish & Wildlife Service — Shiawassee NWR",
    sourceUrl:"https://www.fws.gov/refuge/shiawassee/visit-us",
    facts:[
      "Shiawassee National Wildlife Refuge offers more than 12 miles of trails through wetland, floodplain and river habitat.",
      "The Ferguson Bayou Trail borders the restored 1,000-acre Maankiki Marsh.",
      "Seasonal flooding and hunting periods can close trails or the wildlife drive, so access should be checked before a long trip."
    ]
  },
  "port-crescent-state-park":{
    sourceLabel:"Michigan DNR — Port Crescent State Park",
    sourceUrl:"https://www.michigan.gov/dnr/places/state-parks/dark-sky-events",
    facts:[
      "Port Crescent is one of Michigan's state-designated dark sky preserves.",
      "The park sits along roughly three miles of sandy Lake Huron shoreline near the tip of the Thumb.",
      "Its protected-sky setting makes the trip qualitatively different from a normal Metro Detroit park outing when clouds cooperate."
    ]
  },
  "detroit-riverfront":{
    sourceLabel:"Detroit Riverfront Conservancy — Detroit Riverwalk",
    sourceUrl:"https://www.detroitriverfront.org/plan-your-visit/parks-greenways/the-riverwalk",
    facts:[
      "The Detroit Riverwalk is a public riverfront corridor stretching almost five miles from Gabriel Richard Park east of downtown to Ralph C. Wilson Park west of downtown.",
      "The Riverwalk supports walking, biking and direct Detroit River viewing, with multiple parks and plazas along the route.",
      "Detroit Riverfront Conservancy spaces are generally open from 6 a.m. to 10 p.m."
    ]
  }
};

const EDITORIAL_CONTEXT = {
  migration:{
    statewide:{
      sourceLabel:"Michigan DNR Fall Birding",
      sourceUrl:"https://www.michigan.gov/dnr/things-to-do/wildlife-viewing/birding/fall",
      facts:[
        "Fall is one of Michigan's strongest birding seasons as birds from Canada and the north-central United States move south.",
        "The Great Lakes and the region's wetlands function as important migration stopover and refueling habitat.",
        "A migration-season signal describes timing and habitat potential, not a live count or a guarantee that birds are present."
      ]
    },
    "belle-isle":{
      sourceLabel:"Michigan DNR Fall Birding",
      sourceUrl:"https://www.michigan.gov/dnr/things-to-do/wildlife-viewing/birding/fall",
      facts:[
        "Michigan DNR describes the Detroit River corridor as a fall migration funnel.",
        "The corridor can concentrate ducks on the water, hawks and eagles following shorelines, and songbirds using brushy cover during migration.",
        "This is corridor-level migration context, not evidence of a current sighting on Belle Isle."
      ]
    },
    "lake-st-clair-metropark":{
      sourceLabel:"Huron-Clinton Metroparks",
      sourceUrl:"https://www.metroparks.com/lake-st-clair-metropark/lake-st-clair-metropark-nature-center/",
      facts:[
        "Lake St. Clair Metropark's nature trails cross wet woods, shrublands and marsh habitat used by migrating birds.",
        "Metroparks specifically identifies its Main Trail as good for warblers in spring and fall.",
        "The Meadow Loop wet shrubland provides habitat for migrating warblers."
      ]
    },
    "shiawassee-nwr":{
      sourceLabel:"U.S. Fish & Wildlife Service",
      sourceUrl:"https://www.fws.gov/refuge/shiawassee/visit-us",
      facts:[
        "U.S. Fish & Wildlife Service identifies September and October as the best months for fall migratory birds at Shiawassee National Wildlife Refuge.",
        "The refuge's wetland and floodplain habitats support waterfowl, shorebirds, wading birds, songbirds and raptors.",
        "Large waterfowl concentrations are a defining feature of the refuge during spring and fall migration.",
        "More than 270 species of migratory birds use the refuge.",
        "The refuge recommends morning and evening for wildlife viewing and recommends checking recent sightings before a visit."
      ]
    }
  }
};

function clamp(n,min=0,max=100){ return Math.max(min,Math.min(max,n)); }
function finite(v){ return typeof v==="number"&&Number.isFinite(v)?v:null; }
function monthDetroit(){
  return Number(new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",month:"numeric"}).format(new Date()));
}
function safeText(value,max=240){
  return String(value==null?"":value).replace(/[<>\u0000-\u001f]/g," ").replace(/\s+/g," ").trim().slice(0,max);
}
function round(v,step=1){
  const n=finite(v); return n===null?null:Math.round(n/step)*step;
}
async function fetchJson(url,options={},timeoutMs=6500){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const res=await fetch(url,{...options,signal:controller.signal,redirect:"error"});
    if(!res.ok) throw new Error(`${new URL(url).hostname} returned ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}
async function loadPlace(place){
  try{
    const data=await fetchJson(`${OUTDOORS_NOW}/api/conditions/${encodeURIComponent(place.id)}`,{headers:{accept:"application/json"}},7000);
    return {place,ok:true,weather:data&&data.weather||null,specialistSignals:Array.isArray(data&&data.specialistSignals)?data.specialistSignals:[],generatedAt:data&&data.generatedAt||null};
  }catch(error){
    return {place,ok:false,weather:null,specialistSignals:[],error:safeText(error&&error.message||error)};
  }
}
async function loadAlerts(place){
  try{
    const data=await fetchJson(`https://api.weather.gov/alerts/active?point=${place.lat},${place.lon}`,{
      headers:{accept:"application/geo+json","user-agent":"ChrisIzworski.com Detroit Outdoors opportunity desk"}
    },4500);
    const alerts=(data&&Array.isArray(data.features)?data.features:[]).map(f=>({
      event:safeText(f&&f.properties&&f.properties.event,100),
      severity:safeText(f&&f.properties&&f.properties.severity,40),
      urgency:safeText(f&&f.properties&&f.properties.urgency,40),
      certainty:safeText(f&&f.properties&&f.properties.certainty,40),
      headline:safeText(f&&f.properties&&f.properties.headline,180)
    })).filter(a=>a.event);
    return {ok:true,alerts};
  }catch(error){
    return {ok:false,alerts:[],error:safeText(error&&error.message||error)};
  }
}
async function loadStandouts(){
  try{
    const data=await fetchJson(`${OUTDOORS_NOW}/api/opportunities?scope=all`,{headers:{accept:"application/json"}},8000);
    const rows=Array.isArray(data&&data.opportunities)?data.opportunities:[];
    return {ok:true,rows};
  }catch(error){
    return {ok:false,rows:[],error:safeText(error&&error.message||error)};
  }
}
async function loadFallColor(){
  const m=monthDetroit();
  if(m<9||m>11) return {ok:true,season:false,snapshot:null};
  try{
    const data=await fetchJson(FALL_CONDITIONS,{headers:{accept:"application/json"}},8500);
    const region=REGIONS.find(r=>r.id==="sel");
    const cond=Array.isArray(data&&data.regions)?data.regions.find(r=>r.id==="sel"):null;
    if(!region||!cond) return {ok:false,season:true,snapshot:null,error:"Southeast Lower fall-color region unavailable"};
    return {ok:true,season:true,snapshot:snapshotFor(region,cond,data&&data.anchor)};
  }catch(error){
    return {ok:false,season:true,snapshot:null,error:safeText(error&&error.message||error)};
  }
}
function hazardState(alertResult){
  const alerts=alertResult&&Array.isArray(alertResult.alerts)?alertResult.alerts:[];
  const hard=alerts.find(a=>HARD_ALERT.test(a.event)||(a.severity==="Extreme"&&/Observed|Likely/i.test(a.certainty)));
  const soft=alerts.find(a=>SOFT_ALERT.test(a.event));
  return {hard:hard||null,soft:soft||null};
}
function baseWeatherScore(weather){
  if(!weather) return null;
  let score=55;
  const pop=finite(weather.precipitationProbability);
  const gust=finite(weather.windGust);
  const high=finite(weather.high);
  const aqi=finite(weather.aqi);
  if(pop!==null) score += pop<=10?15:pop<=25?10:pop<=40?3:pop>=75?-22:pop>=55?-12:-3;
  if(gust!==null) score += gust<=10?11:gust<=16?7:gust<=22?2:gust>=35?-22:gust>=28?-12:-4;
  if(high!==null) score += high>=55&&high<=78?10:high>=45&&high<=85?5:high<32||high>92?-10:-2;
  if(aqi!==null) score += aqi<=50?8:aqi<=75?3:aqi>125?-24:aqi>100?-16:aqi>85?-8:0;
  return clamp(score);
}
function auroraActive(signals){
  return (signals||[]).some(s=>s&&s.id==="aurora"&&/(worth watching|space weather is active)/i.test(String(s.headline||"")));
}
function scoreActivity(activity,weather,signals,fallSnapshot,standout,softAlert){
  const base=baseWeatherScore(weather);
  if(base===null) return {score:null,hardStop:true,reasons:["Live weather unavailable"]};
  const pop=finite(weather.precipitationProbability);
  const gust=finite(weather.windGust);
  const clouds=finite(weather.cloudCover);
  let score=base;
  const reasons=[];
  let hardStop=false;

  if(activity==="paddling"){
    if((gust!==null&&gust>22)||(pop!==null&&pop>45)) hardStop=true;
    score += gust!==null&&gust<=12?10:gust!==null&&gust<=16?5:0;
    reasons.push("weather-only paddling lead; waves, currents and launch status still require verification");
  }else if(activity==="dark-sky"){
    if((clouds!==null&&clouds>55)||(pop!==null&&pop>35)) hardStop=true;
    score = 50;
    if(clouds!==null) score += clouds<=15?30:clouds<=25?22:clouds<=40?10:clouds>55?-25:0;
    if(pop!==null) score += pop<=15?10:pop<=30?4:-8;
    if(auroraActive(signals)){ score+=10; reasons.push("NOAA space-weather signal is active enough to verify"); }
  }else if(activity==="birding"){
    const m=monthDetroit();
    if(m===4||m===5||m===9||m===10){ score+=6; reasons.push("migration-season timing"); }
  }else if(activity==="scenic"||activity==="hiking"){
    if(fallSnapshot&&["rising","peak","falling"].includes(fallSnapshot.phase)){
      score += Math.min(12,Math.max(2,Math.round(fallSnapshot.pct/10)));
      reasons.push(`Southeast Lower fall-color model: ${fallSnapshot.label.toLowerCase()} (~${fallSnapshot.pct}%)`);
    }
  }

  if(standout){ score+=8; reasons.push("Michigan Outdoors Now also flags an unusually strong short-lived weather-fit window"); }
  if(softAlert){ score-=10; reasons.push(`active NWS ${softAlert.event}`); }
  if(pop!==null&&pop<=25) reasons.push(`${Math.round(pop)}% peak rain chance`);
  if(gust!==null&&gust<=18) reasons.push(`gusts around ${Math.round(gust)} mph`);
  if(activity==="dark-sky"&&clouds!==null) reasons.push(`${Math.round(clouds)}% average cloud cover`);
  if(finite(weather.aqi)!==null&&weather.aqi<=75) reasons.push(`AQI ${Math.round(weather.aqi)}`);

  return {score:clamp(Math.round(score)),hardStop,reasons};
}
function activityTitle(activity){
  return {
    hiking:"Trail weather",
    scenic:"Scenic window",
    birding:"Birding weather window",
    paddling:"Calm-weather paddling lead",
    "dark-sky":"Night-sky window",
    "fall-color":"Fall-color walk window",
    photography:"Sunset / photography window",
    "freighter-watching":"Live freighter window",
    beach:"Lake Erie beach window",
    foraging:"Seasonal foraging window",
    "ice-watching":"Ice-season watch",
    "xc-ski":"XC snow screen"
  }[activity]||"Outdoor window";
}
function quality(score){
  if(score>=86) return "Exceptional";
  if(score>=78) return "Strong";
  if(score>=68) return "Good";
  if(score>=58) return "Workable";
  return "Weak";
}
function activityPlain(activity){
  return {
    hiking:"hiking",
    scenic:"a scenic walk",
    birding:"birding",
    paddling:"paddling",
    "dark-sky":"night-sky watching",
    "fall-color":"a fall-color walk",
    photography:"sunset photography",
    "freighter-watching":"freighter watching",
    beach:"a Lake Erie beach outing",
    foraging:"a seasonal foraging check",
    "ice-watching":"an ice-season observation",
    "xc-ski":"a cross-country ski check"
  }[activity]||"time outside";
}
function decisionCall(candidate){
  if(candidate.activity==="paddling"||candidate.activity==="dark-sky"){
    return candidate.score>=72?"CHECK + GO":"CHECK FIRST";
  }
  if(candidate.score>=82) return "GO";
  if(candidate.score>=72) return "GOOD BET";
  if(candidate.score>=64) return "MAYBE";
  return "LOCAL ONLY";
}
function humanReason(reason){
  const r=String(reason||"");
  if(/migration-season timing/i.test(r)) return "Fall migration is in season, so birding has more upside than an ordinary late-summer stop.";
  if(/Southeast Lower fall-color model:/i.test(r)) return r.replace("Southeast Lower fall-color model:","Fall color is").replace(/\(~(\d+)%\)/,"(model ~$1%).");
  if(/unusually strong short-lived weather-fit window/i.test(r)) return "The statewide comparison sees the same thing: this is one of the better short-window fits right now.";
  if(/weather-only paddling lead/i.test(r)) return "The weather is calm enough to investigate a paddle; the water-specific check still gets the final say.";
  if(/NOAA space-weather signal is active enough to verify/i.test(r)) return "Space weather is active enough to make tonight worth a live sky check.";
  if(/active NWS /i.test(r)) return r.replace(/^active NWS /i,"An NWS ")+" is active, so treat this as a conditional choice.";
  if(/^(\d+)% peak rain chance$/i.test(r)) return r.replace(" peak rain chance"," rain chance keeps the weather risk modest.");
  if(/^gusts around /i.test(r)) return r.charAt(0).toUpperCase()+r.slice(1)+" keeps wind from being the main problem.";
  if(/^AQI /i.test(r)) return r+" keeps air quality on the favorable side.";
  if(/average cloud cover/i.test(r)) return r.charAt(0).toUpperCase()+r.slice(1)+" is the key sky constraint.";
  return r;
}
function worthDrive(candidate){
  const a=activityPlain(candidate.activity);
  if(candidate.place.driveClass==="near") return "Yes. This is an easy local outing.";
  if(candidate.place.driveClass==="mid"){
    return candidate.score>=72?"Yes — if you want a half-day outside.":"Only if you were already leaning that direction.";
  }
  if(candidate.score>=82) return `Yes, if ${a} is the reason you are going.`;
  if(candidate.score>=72) return `Maybe. The drive only makes sense if ${a} is the point.`;
  return "No special trip. Keep it closer to home.";
}
function storyFor(candidate,index){
  const name=candidate.place.name;
  const setting=String(candidate.place.setting||"the park").toLowerCase();
  const bundledSignals=Array.isArray(candidate.bundleSignals)?candidate.bundleSignals:[];
  const isBundle=bundledSignals.length>1;
  let headline;
  if(isBundle){
    headline=`${name} has ${bundledSignals.length} separate reasons to go today.`;
  }else if(index===0){
    headline={
      hiking:`${name} is today's easiest trail call.`,
      scenic:`${name} is the simplest good outing today.`,
      birding:`${name} is the birding play today.`,
      paddling:`${name} has a water-weather opening — verify the lake first.`,
      "dark-sky":`${name} is the place to check for tonight.`,
      "fall-color":`${name} has the seasonal window worth using today.`,
      photography:`${name} has the evening-light window worth watching.`,
      "freighter-watching":`${name} has a live ship-watching case right now.`
    }[candidate.activity]||`${name} is the best outdoor call on today's board.`;
  }else if(candidate.activity==="dark-sky"){
    headline=`Keep ${name} in your pocket for tonight.`;
  }else if(candidate.place.driveClass==="far"){
    headline=`${name} is the long-drive option that still has a case.`;
  }else if(candidate.place.driveClass==="near"){
    headline=`${name} is the close-to-home option that still works.`;
  }else{
    headline=`If ${candidate.place.area} is your direction, ${name} works today.`;
  }

  const move={
    hiking:"Make it a trail outing. The weather is doing enough of the work that you do not need a complicated plan.",
    scenic:"Go to walk, look around and linger. This is an easy-outside day, not an all-day mission.",
    birding:`Bring binoculars and give the ${setting} a focused hour or two.`,
    paddling:"Only load the boat after the water check agrees with the weather.",
    "dark-sky":"Save the decision until later today, then check the live sky page before committing to the drive.",
    "fall-color":"Use the regional color signal as timing context, then let the actual trees at the park set expectations.",
    photography:"Aim for the riverfront before golden hour, then let the actual western sky decide how long you stay.",
    "freighter-watching":"Open the live ship tracker before leaving; AIS can move quickly enough that this is a now decision."
  }[candidate.activity]||"Keep the plan simple and let the conditions decide how long you stay.";

  const label=index===0?"LEAD STORY"
    :candidate.activity==="dark-sky"?"TONIGHT"
    :candidate.place.driveClass==="far"?"WORTH THE DRIVE?"
    :candidate.place.driveClass==="near"?"CLOSE TO HOME"
    :"ALSO ON THE BOARD";

  const whyToday=isBundle
    ?bundledSignals.map(signal=>{
      const detail=signal.whyNow||(signal.reasons||[])[0]||"Live evidence cleared the current gate.";
      return `${signal.title||signal.opportunityType||signal.activity}: ${detail}`;
    }).filter(Boolean).slice(0,4)
    :(candidate.reasons||[]).map(humanReason).filter(Boolean).slice(0,3);
  const specialistNote=isBundle
    ?"This location has multiple independent live signals. Use each linked specialist check that applies before you leave."
    :candidate.specialist
    ? candidate.activity==="dark-sky"
      ? "There is an extra sky signal in the live specialist feed. Use the aurora page as the final check."
      : candidate.activity==="paddling"
        ? "There is an extra water-side signal in the specialist feed. Open the buoy/water page before launch."
        : ""
    : "";

  return {
    label,
    call:decisionCall(candidate),
    headline,
    move,
    worthIt:worthDrive(candidate),
    whyToday,
    specialistNote
  };
}
function frontPageFor(candidates,hold,verdict){
  if(!candidates.length){
    return {
      headline:"Keep today simple.",
      subhead:"There is not enough live evidence to justify sending you across Southeast Michigan.",
      quickTake:"Use the closer parks you already know and check back when the board refreshes."
    };
  }
  const lead=candidates[0];
  const next=candidates[1]||null;
  if(hold){
    return {
      headline:"No big destination earns a special trip today.",
      subhead:`${lead.place.name} is still the best available option, but the advantage is small.`,
      quickTake:"If you want outside time, stay closer to home and keep the plan flexible."
    };
  }
  return {
    headline:lead.story.headline,
    subhead:`${lead.story.call}. ${lead.story.worthIt}`,
    quickTake:next
      ? `If that is not your kind of day, the next move is ${next.place.name.toLowerCase()} for ${activityPlain(next.activity)}.`
      : `If you only make one outdoor decision today, make it ${lead.place.name}.`
  };
}
function safeCandidatesFrom(placeState,alertResult,standouts,fallSnapshot){
  const {place,weather,specialistSignals}=placeState;
  if(!weather) return {candidates:[],suppressed:null};
  const hazard=hazardState(alertResult);
  if(hazard.hard) return {candidates:[],suppressed:{suppressed:true,placeId:place.id,hazard:hazard.hard}};
  const candidates=[];
  for(const activity of place.activities){
    const standout=standouts.some(o=>o&&o.destination&&o.destination.id===place.id&&o.activity===activity);
    const scored=scoreActivity(activity,weather,specialistSignals,fallSnapshot,standout,hazard.soft);
    if(scored.hardStop||scored.score===null) continue;
    const specialist=(specialistSignals||[]).find(s=>
      (activity==="dark-sky"&&s.id==="aurora")||
      (activity==="paddling"&&s.id==="beach")
    )||null;
    const verifyUrl=activity==="paddling"
      ?"https://chrisizworski.com/great-lakes-buoys/"
      :activity==="dark-sky"
        ?"https://chrisizworski.com/northern-lights-michigan/"
        :activity==="birding"
          ?"https://michiganbirdingreport.com/"
          :`${OUTDOORS_NOW}/places/${place.id}`;
    candidates.push(normalizeOpportunityCandidate({
      id:`${place.id}-${activity}`,
      sourceEngine:"park-weather",
      opportunityType:activity,
      place:{id:place.id,name:place.name,area:place.area,setting:place.setting,drive:place.drive,driveClass:place.driveClass,officialUrl:place.officialUrl},
      activity,
      title:activityTitle(activity),
      score:scored.score,
      quality:quality(scored.score),
      reasons:scored.reasons.slice(0,4),
      weather:{
        high:round(weather.high),
        low:round(weather.low),
        rainChance:round(weather.precipitationProbability),
        gust:round(weather.windGust),
        cloudCover:round(weather.cloudCover),
        aqi:round(weather.aqi)
      },
      standout,
      specialist:specialist?{
        label:safeText(specialist.label,60),
        headline:safeText(specialist.headline,160),
        detail:safeText(specialist.detail,220),
        sourceLabel:safeText(specialist.sourceLabel,100),
        sourceUrl:safeText(specialist.sourceUrl,400),
        toolUrl:safeText(specialist.toolUrl,400)
      }:null,
      verifyUrl,
      caveat:activity==="paddling"
        ?"This is a weather lead, not a water-safety clearance. Verify waves, marine hazards, currents and launch status."
        :activity==="dark-sky"
          ?"Clouds and Kp are planning signals, not a visibility guarantee. Confirm darkness, access and the live aurora view."
          :"Check current park access, closures and local conditions before leaving.",
      timeWindow:{label:activity==="dark-sky"?"Tonight":"Today",start:null,end:null},
      whyNow:scored.reasons.slice(0,3).join("; "),
      verifiedEvidence:[{
        source:"Michigan Outdoors Now",
        sourceLabel:`${place.name} live place conditions`,
        sourceUrl:`${OUTDOORS_NOW}/places/${place.id}`,
        text:`Weather and specialist packet supporting ${activityPlain(activity)}: ${scored.reasons.slice(0,4).join("; ")}.`
      }],
      confidence:{level:standout?"high":"medium",reason:"Live place weather plus deterministic activity fit; specialist verification remains required where shown."},
      hardStops:[],
      specialistHandoff:specialist?{label:safeText(specialist.label,80),url:verifyUrl,requiredBeforeAction:activity==="paddling"||activity==="dark-sky"}:null,
      travel:{origin:"central Detroit",driveBand:place.drive,class:place.driveClass},
      uncertainty:[activity==="paddling"
        ?"Park candidate does not itself establish current waves, currents or launch status."
        :activity==="dark-sky"
          ?"Park candidate does not itself establish actual sky visibility."
          :"Park access and exact on-site conditions can change after this update."]
    }));
  }
  return {candidates,suppressed:null};
}
function deterministicLabel(index,candidate,leadScore){
  if(index===0) return leadScore>=68?"Best now":"Best available";
  if(candidate.activity==="dark-sky") return "Tonight";
  if(candidate.place.driveClass==="far"&&candidate.score>=72) return "Worth the drive";
  if(candidate.standout) return "Emerging";
  return "Also good";
}
function plannedNoteIds(plan){
  return new Set(((plan&&plan.cardNotes)||[]).map(x=>x&&x.candidateId).filter(Boolean));
}
function deterministicEdition(candidates,fallSnapshot,hold,plan){
  if(!candidates.length){
    return {
      headline:"A quiet day around Detroit.",
      read:"There is no strong reason to spend a long drive on the outdoors today. If you want an hour outside, keep it close to home and let the day be ordinary. The useful answer is sometimes that nothing is asking much of you.",
      notes:{}
    };
  }
  const lead=candidates[0];
  const next=candidates[1]||null;
  const w=lead.weather||{};
  const rain=finite(w.rainChance);
  const gust=finite(w.gust);
  const weatherBits=[];
  if(rain!==null) weatherBits.push(rain<=20
    ? `${Math.round(rain)} percent rain chance keeps showers from driving the plan`
    : rain<=45
      ? `${Math.round(rain)} percent rain chance leaves some uncertainty`
      : `${Math.round(rain)} percent rain chance is a real constraint`);
  if(gust!==null) weatherBits.push(gust<=15
    ? `light wind, with gusts near ${Math.round(gust)} mph`
    : gust<=24
      ? `a noticeable breeze, with gusts near ${Math.round(gust)} mph`
      : `wind that will be felt, with gusts near ${Math.round(gust)} mph`);
  const season=fallSnapshot&&fallSnapshot.phase!=="pre"
    ? ` The Southeast Lower is ${fallSnapshot.label.toLowerCase()} on the fall-color model, about ${Math.round(fallSnapshot.pct)} percent.`
    :"";
  const opening=hold||lead.score<68
    ? `${lead.place.name} is the best of a modest board. It is not a day to rearrange everything for, but it is enough for a local outing.`
    : `${lead.place.name} has the best case this morning: ${activityPlain(lead.activity)} without much weather friction.`;
  const conditions=weatherBits.length?` ${weatherBits.join(". ")}.`:"";
  const second=next
    ? ` If you want more room or a different kind of day, ${next.place.name} is the next place to consider.`
    :"";
  return {
    headline:hold?"Keep the day close to home.":`${lead.place.name} makes the most sense today.`,
    read:`${opening}${conditions}${season}${second}`,
    notes:{}
  };
}
function cleanEdition(raw,candidates,fallback,plan){
  let parsed=null;
  try{
    const body=String(raw||"").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
    parsed=JSON.parse(body);
  }catch{}
  if(!parsed||typeof parsed!=="object") return fallback;
  const headline=safeText(parsed.headline,140).replace(/\u2014/g,", ");
  const read=safeText(parsed.read,2400).replace(/\u2014/g,", ");
  const notes={};
  const allowed=plannedNoteIds(plan);
  const supplied=parsed.notes&&typeof parsed.notes==="object"?parsed.notes:{};
  for(const candidate of candidates){
    if(!allowed.has(candidate.id)) continue;
    const note=safeText(supplied[candidate.id],520).replace(/\u2014/g,", ");
    if(note) notes[candidate.id]=note;
  }
  if(!headline||!read) return fallback;
  return {headline,read,notes};
}
function dayVerdict(candidates,hold){
  if(!candidates.length) return {label:"HOLD",detail:"Not enough live evidence to publish a useful recommendation."};
  const s=candidates[0].score;
  if(hold||s<64) return {label:"QUIET",detail:"Nothing exceptional cleared the feature threshold. These are the best available windows, not must-go recommendations."};
  if(s>=84) return {label:"VERY GOOD",detail:"At least one unusually strong window is worth a closer look."};
  if(s>=72) return {label:"GOOD",detail:"A few outdoor windows are lining up well around Southeast Michigan."};
  return {label:"MIXED",detail:"There are usable windows, but conditions are not broadly favorable."};
}
function fallbackUtility(candidate,selected=[]){
  let value=Number(candidate&&candidate.score)||0;
  const engine=candidate&&candidate.sourceEngine||"unknown";
  const evidence=Array.isArray(candidate&&candidate.verifiedEvidence)?candidate.verifiedEvidence:[];
  const confidence=candidate&&candidate.confidence&&candidate.confidence.level||"";
  if(engine!=="park-weather") value+=7;
  if(confidence==="high") value+=3;
  if(evidence.length>=2) value+=2;
  if(candidate&&candidate.standout===true) value+=2;

  if((selected||[]).some(x=>x&&x.activity===candidate.activity)) value-=10;
  if((selected||[]).some(x=>x&&x.sourceEngine===engine)) value-=6;
  if((selected||[]).some(x=>x&&x.place&&candidate&&candidate.place&&x.place.id===candidate.place.id)) value-=5;
  return value;
}
function fallbackBoardOrder(candidates,selected=[]){
  const driveRank=value=>{
    const index=["near","mid","far"].indexOf(value);
    return index<0?3:index;
  };
  return [...candidates].sort((a,b)=>
    fallbackUtility(b,selected)-fallbackUtility(a,selected)||
    (Number(b.score)||0)-(Number(a.score)||0)||
    driveRank(a&&a.place&&a.place.driveClass)-driveRank(b&&b.place&&b.place.driveClass)
  );
}
function boardOption(candidate){
  const engines=Array.isArray(candidate.sourceEngines)&&candidate.sourceEngines.length?candidate.sourceEngines:[candidate.sourceEngine||"unknown"];
  const signals=Array.isArray(candidate.bundleSignals)?candidate.bundleSignals:[];
  const window=candidate.timeWindow&&candidate.timeWindow.label||"today";
  const why=candidate.whyNow||(candidate.reasons||[]).join("; ")||"verified live evidence";
  const bundle=signals.length>1?` bundled location with ${signals.length} separate safe signals: ${signals.map(signal=>signal.title||signal.opportunityType||signal.activity).join(" + ")};`:"";
  return `${candidate.place.name}: ${candidate.opportunityType||candidate.activity}; source engines ${engines.join(", ")};${bundle} time window ${window}; heuristic evidence score ${candidate.score}/100; drive planning band ${candidate.place.drive}; why now: ${why}.`;
}
function boardEvidence(candidates){
  return candidates.map(c=>({
    id:c.id,
    source:"hard-safe normalized Detroit Outdoors candidate",
    text:JSON.stringify({
      candidateId:c.id,
      sourceEngine:c.sourceEngine,
      sourceEngines:c.sourceEngines||[c.sourceEngine],
      opportunityType:c.opportunityType,
      bundleSignals:c.bundleSignals||[],
      place:c.place,
      activity:c.activity,
      timeWindow:c.timeWindow,
      whyNow:c.whyNow,
      heuristicScore:c.score,
      quality:c.quality,
      reasons:c.reasons,
      weather:c.weather,
      standout:c.standout,
      specialist:c.specialist,
      specialistHandoff:c.specialistHandoff,
      verifiedEvidence:c.verifiedEvidence,
      confidence:c.confidence,
      travel:c.travel,
      uncertainty:c.uncertainty,
      caveat:c.caveat
    })
  }));
}
async function editBoard(candidates,maxCards=4){
  if(!candidates.length){
    return {
      mode:"deterministic",
      hold:true,
      selected:[],
      candidateCount:0,
      lead:{mode:"deterministic",choiceId:null,confidence:0,reason:"No hard-safe candidates"},
      posture:{mode:"deterministic",choiceId:"QUIET",confidence:1,reason:"No hard-safe candidates"},
      slots:[]
    };
  }

  const fallback=fallbackBoardOrder(candidates);
  const leadOptions={};
  for(const c of candidates) leadOptions[c.id]=boardOption(c);
  const commonConstraints=[
    "Choose only from the supplied closed set.",
    "Every candidate in this pool has already passed deterministic hard-safety and required-data gates.",
    "Do not invent weather, access, wildlife sightings, water safety, closures, crowd levels, travel time or events.",
    "The heuristic score is evidence, not an instruction or ranking.",
    "Use the full evidence packet. Favor actual decision value, evidence strength, distinctiveness, timing and travel friction.",
    "Each option represents one physical location. When several hard-safe engines support the same location, they are already bundled into that single option; reward the combined case without treating it as multiple board slots."
  ];
  const commonContext={
    market:"Detroit / Southeast Michigan",
    purpose:"live opportunity board",
    center:"downtown Detroit",
    hardSafeCandidateCount:candidates.length,
    candidateCountByEngine:countByEngine(candidates)
  };

  const [lead,posture]=await Promise.all([
    decideClosedSet({
      task:"You are the Detroit Outdoors board editor. From every hard-safe candidate, choose the single opportunity that deserves card position 1 today.",
      options:leadOptions,
      context:{...commonContext,boardPosition:1},
      constraints:[
        ...commonConstraints,
        "Choose the best editorial lead for a human deciding what to do outside today, not merely the highest numeric score."
      ],
      evidence:boardEvidence(candidates),
      fallbackId:fallback[0].id,
      minConfidence:.52,
      timeoutMs:2400
    }),
    decideClosedSet({
      task:"Decide the overall posture of today's Detroit Outdoors board after reviewing the complete hard-safe candidate pool.",
      options:{
        FEATURE:"At least one opportunity has enough evidence and distinctiveness to deserve an affirmative feature posture.",
        QUIET:"The board is useful, but nothing warrants a special-trip or must-do posture today."
      },
      context:commonContext,
      constraints:[
        ...commonConstraints,
        "This is an editorial posture decision, not a safety decision.",
        "Choose QUIET when the available opportunities are ordinary, heavily qualified or not worth meaningful travel friction."
      ],
      evidence:boardEvidence(candidates),
      fallbackId:fallback[0].score>=64?"FEATURE":"QUIET",
      minConfidence:.52,
      timeoutMs:2400
    })
  ]);

  const leadCandidate=candidates.find(c=>c.id===lead.choiceId)||fallback[0];
  const selected=[leadCandidate];
  let remaining=candidates.filter(c=>c.id!==leadCandidate.id);
  const slots=[];

  for(let slotIndex=1;slotIndex<maxCards&&remaining.length;slotIndex++){
    const orderedFallback=fallbackBoardOrder(remaining,selected);
    const options={STOP:"Stop the board here because no remaining candidate adds enough distinct decision value to earn another card."};
    for(const c of remaining) options[c.id]=boardOption(c);
    const decision=await decideClosedSet({
      task:`You are the Detroit Outdoors board editor choosing card position ${slotIndex+1}. Select the remaining hard-safe candidate that adds the most useful new option to the board, or STOP.`,
      options,
      context:{
        ...commonContext,
        boardPosition:slotIndex+1,
        selected:selected.map(c=>({id:c.id,place:c.place.name,activity:c.activity,drive:c.place.drive}))
      },
      constraints:[
        ...commonConstraints,
        "Judge incremental value against the cards already selected.",
        "Variety of place, activity, distance and time-of-day is useful when it improves the board, but variety is not a quota.",
        "No second card for the same physical location is available: multiple signals at one place are intentionally combined into one location card.",
        "Choose STOP only when another location would mostly repeat the board or would not help a user make a better decision."
      ],
      evidence:boardEvidence(remaining),
      fallbackId:orderedFallback[0]?orderedFallback[0].id:"STOP",
      minConfidence:.52,
      timeoutMs:2200
    });
    slots.push({position:slotIndex+1,...decision});
    if(decision.choiceId==="STOP") break;
    const picked=remaining.find(c=>c.id===decision.choiceId)||orderedFallback[0];
    if(!picked) break;
    selected.push(picked);
    remaining=remaining.filter(c=>c.id!==picked.id);
  }

  const decisions=[lead,posture,...slots];
  const jevCount=decisions.filter(d=>d&&d.mode==="shared-harness-jev").length;
  const mode=jevCount===decisions.length?"shared-harness-jev":jevCount?"mixed":"deterministic";
  return {
    mode,
    hold:posture.choiceId==="QUIET",
    selected,
    candidateCount:candidates.length,
    lead,
    posture,
    slots
  };
}
function hasMigrationSignal(candidate){
  return candidate&&candidate.activity==="birding"&&(candidate.reasons||[]).some(r=>/migration-season/i.test(String(r)));
}
function hasPlaceSpecificMigrationContext(candidate){
  return Boolean(candidate&&candidate.place&&EDITORIAL_CONTEXT.migration[candidate.place.id]);
}
function fallbackTreatment(candidate,index){
  if(candidate&&Array.isArray(candidate.bundleSignals)&&candidate.bundleSignals.length>1) return "WHY_TODAY";
  if(candidate&&candidate.sourceEngine==="fall-color-phenology") return "SEASONAL_CONTEXT";
  if(candidate&&candidate.sourceEngine==="sunset-photography") return "WHY_TODAY";
  if(candidate&&candidate.sourceEngine==="great-lakes-ais") return "NEXT_CHECK";
  if(candidate&&candidate.specialist) return "NEXT_CHECK";
  if(hasMigrationSignal(candidate)&&hasPlaceSpecificMigrationContext(candidate)) return "MIGRATION_CONTEXT";
  if((candidate&&candidate.reasons||[]).some(r=>/fall-color/i.test(String(r)))) return "SEASONAL_CONTEXT";
  if(candidate&&candidate.place&&candidate.place.driveClass==="far") return "DRIVE_DECISION";
  if(index===0) return "WHY_TODAY";
  return "PLACE_CONTEXT";
}
async function judgeEditorialTreatment(candidate,index,hold){
  const options={...EDITORIAL_TREATMENTS};
  const fallbackId=fallbackTreatment(candidate,index);
  return decideClosedSet({
    task:"Choose the single best additive editorial job for this one Detroit Outdoors card. Every displayed card gets its own Haiku writer after this decision, so choose what useful information that writer should add beyond the visible deterministic card.",
    options,
    context:{
      market:"Detroit / Southeast Michigan",
      cardPosition:index+1,
      hold,
      place:candidate.place.name,
      driveClass:candidate.place.driveClass,
      activity:candidate.activity,
      sourceEngine:candidate.sourceEngine,
      opportunityType:candidate.opportunityType,
      bundleSignals:candidate.bundleSignals||[],
      sourceEngines:candidate.sourceEngines||[candidate.sourceEngine],
      timeWindow:candidate.timeWindow,
      confidence:candidate.confidence,
      migrationSignal:hasMigrationSignal(candidate),
      placeSpecificMigrationContext:hasPlaceSpecificMigrationContext(candidate)
    },
    constraints:[
      "Choose exactly one supplied treatment.",
      "Do not create facts, rank a different card, change the score, or override any safety decision.",
      "Every card must receive one additive editorial job. Do not choose a no-op treatment.",
      "Use PLACE_CONTEXT when the main missing value is what is distinctive about this place or how to use it, including birding cards that have only generic statewide migration timing.",
      "Use NEXT_CHECK only when the candidate has a real specialist handoff.",
      "Use MIGRATION_CONTEXT only when placeSpecificMigrationContext is true. Generic statewide migration timing alone is not enough.",
      "For a bundled location card with multiple independent live signals, prefer WHY_TODAY unless one unresolved specialist gate clearly dominates the decision.",
      "Use SEASONAL_CONTEXT for non-migration seasonal signals such as fall color.",
      "Use DRIVE_DECISION when travel friction is the main unresolved question.",
      "The writer will receive only this treatment brief and sealed verified facts."
    ],
    evidence:[{
      id:candidate.id,
      source:"sealed Detroit Outdoors candidate",
      text:JSON.stringify({
        sourceEngine:candidate.sourceEngine,
        opportunityType:candidate.opportunityType,
        place:candidate.place,
        activity:candidate.activity,
        timeWindow:candidate.timeWindow,
        whyNow:candidate.whyNow,
        score:candidate.score,
        quality:candidate.quality,
        reasons:candidate.reasons,
        weather:candidate.weather,
        specialist:candidate.specialist,
        specialistHandoff:candidate.specialistHandoff,
        verifiedEvidence:candidate.verifiedEvidence,
        confidence:candidate.confidence,
        travel:candidate.travel,
        uncertainty:candidate.uncertainty,
        caveat:candidate.caveat
      })
    }],
    fallbackId,
    minConfidence:.55,
    timeoutMs:2600
  });
}
function treatmentBrief(treatment){
  return {
    PLACE_CONTEXT:"Write 60 to 90 words that make this specific place more usable. Explain what kind of outing the place actually offers, which supplied physical features or trail/habitat facts matter for this activity, and how that changes the plan today. If birding is in migration season but there is no place-specific migration evidence, treat migration only as broad timing and focus the paragraph on the verified local habitat/setting.",
    WHY_TODAY:"Write 55 to 85 words that explain the non-obvious reason this deserves attention today. Synthesize verified live conditions with useful place context instead of paraphrasing the card.",
    DRIVE_DECISION:"Write 60 to 90 words that resolve the travel tradeoff. Explain what the user gains for the drive, what weakens the case, and who should actually make the trip today. Use place context when supplied.",
    NEXT_CHECK:"Write 50 to 80 words around the unresolved specialist gate. Explain what is already encouraging, what could still flip the decision, and exactly what the user should verify before committing.",
    MIGRATION_CONTEXT:"Write 80 to 115 words that make the migration signal understandable. Explain why this place matters during migration, which bird groups or habitats are relevant from the supplied evidence, what the current date/season changes, and what is still unknown without a live sightings check.",
    SEASONAL_CONTEXT:"Write 60 to 90 words that translate the supplied seasonal signal into realistic expectations for this outing. Tie the seasonal signal to this specific place and explain what it does not prove."
  }[treatment]||"";
}
function editorialQuestion(candidate,treatment){
  if(!candidate) return "";
  if(Array.isArray(candidate.bundleSignals)&&candidate.bundleSignals.length>1){
    const labels=candidate.bundleSignals.map(signal=>signal.title||signal.opportunityType||signal.activity).filter(Boolean).join(" + ");
    return `Why do these separate live reasons combine into one useful trip to ${candidate.place.name} today (${labels}), and what should the user verify for each before leaving?`;
  }
  if(treatment==="PLACE_CONTEXT") return `What does ${candidate.place.name} actually offer for ${activityPlain(candidate.activity)}, and how should someone use the place today rather than just knowing its score?`;
  if(treatment==="DRIVE_DECISION") return `Is ${candidate.place.drive} in the car justified for ${activityPlain(candidate.activity)} today, and what is the honest reason to skip it?`;
  if(treatment==="NEXT_CHECK") return `What unresolved specialist condition could still change this from a good idea to a bad one, and what exactly should be checked?`;
  if(treatment==="MIGRATION_CONTEXT") return `What does "migration season" actually mean at ${candidate.place.name} right now, what might a birder reasonably target, and what still needs a recent-sightings check?`;
  if(treatment==="SEASONAL_CONTEXT") return `How should today's seasonal signal change what someone expects at ${candidate.place.name} without pretending it proves exact on-site conditions?`;
  if(treatment==="WHY_TODAY") return `What is the non-obvious reason ${candidate.place.name} deserves attention today instead of merely being acceptable?`;
  return "";
}
function editorialEvidence(candidate,treatment,fallSnapshot){
  const evidence={
    treatment,
    live:{
      place:{name:candidate.place.name,area:candidate.place.area,setting:candidate.place.setting,drive:candidate.place.drive},
      activity:candidate.activity,
      weather:candidate.weather,
      reasons:candidate.reasons,
      specialist:candidate.specialist,
      bundleSignals:candidate.bundleSignals||[],
      caveat:candidate.caveat
    },
    contextFacts:[],
    sources:[]
  };
  if(Array.isArray(candidate.bundleSignals)&&candidate.bundleSignals.length>1){
    evidence.contextFacts.push(`This is one physical-location card combining ${candidate.bundleSignals.length} independent hard-safe signals; do not write them as separate destinations.`);
    for(const signal of candidate.bundleSignals){
      evidence.contextFacts.push(`Bundled signal: ${safeText(signal.title||signal.opportunityType||signal.activity,140)}. Why now: ${safeText(signal.whyNow||(signal.reasons||[])[0]||"",420)}`);
    }
  }
  for(const item of candidate.verifiedEvidence||[]){
    if(item&&item.text) evidence.contextFacts.push(safeText(item.text,600));
    if(item&&item.sourceUrl) evidence.sources.push({label:safeText(item.sourceLabel||item.source||candidate.sourceEngine,120),url:safeText(item.sourceUrl,500)});
  }
  if(candidate.timeWindow&&candidate.timeWindow.label) evidence.contextFacts.push(`Opportunity time window: ${safeText(candidate.timeWindow.label,120)}.`);
  if(candidate.whyNow) evidence.contextFacts.push(`Why now: ${safeText(candidate.whyNow,500)}`);
  for(const uncertainty of candidate.uncertainty||[]) evidence.contextFacts.push(`Uncertainty: ${safeText(uncertainty,320)}`);
  const placeContext=PLACE_CONTEXT[candidate.place.id];
  if(placeContext){
    evidence.contextFacts.push(...placeContext.facts);
    evidence.sources.push({label:placeContext.sourceLabel,url:placeContext.sourceUrl});
  }
  if(treatment==="MIGRATION_CONTEXT"){
    const base=EDITORIAL_CONTEXT.migration.statewide;
    const local=EDITORIAL_CONTEXT.migration[candidate.place.id];
    evidence.contextFacts.push(...base.facts);
    evidence.sources.push({label:base.sourceLabel,url:base.sourceUrl});
    if(local){
      evidence.contextFacts.push(...local.facts);
      evidence.sources.push({label:local.sourceLabel,url:local.sourceUrl});
    }
    evidence.contextFacts.push("No live bird count or verified same-day sighting feed is included in this card; recent sightings remain a separate verification step.");
  }else if(treatment==="SEASONAL_CONTEXT"&&fallSnapshot){
    evidence.contextFacts.push(`Southeast Lower fall-color model: ${fallSnapshot.label}, about ${Math.round(fallSnapshot.pct)} percent, phase ${fallSnapshot.phase}.`);
    if(fallSnapshot.peakWindow) evidence.contextFacts.push(`Climatological peak window: ${fallSnapshot.peakWindow}.`);
  }else if(treatment==="DRIVE_DECISION"){
    evidence.contextFacts.push(`Setting: ${candidate.place.setting}.`);
    evidence.contextFacts.push(`The drive band is ${candidate.place.drive} from central Detroit; it is a planning band rather than live traffic.`);
  }else if(treatment==="NEXT_CHECK"){
    if(candidate.specialist) evidence.contextFacts.push(`Specialist signal: ${candidate.specialist.label}: ${candidate.specialist.headline}. ${candidate.specialist.detail||""}`);
    evidence.contextFacts.push(candidate.caveat);
  }else if(treatment==="WHY_TODAY"){
    evidence.contextFacts.push(`Setting: ${candidate.place.setting}.`);
  }
  const seen=new Set();
  evidence.sources=evidence.sources.filter(src=>{
    const key=src.url;
    if(!key||seen.has(key)) return false;
    seen.add(key); return true;
  });
  return evidence;
}
async function planEditorialPlacement(candidates,hold,fallSnapshot){
  if(!candidates.length) return {mode:"deterministic",cardNotes:[],decisions:[]};
  const decisions=await Promise.all(candidates.map((candidate,index)=>judgeEditorialTreatment(candidate,index,hold)));
  const mapped=decisions.map((decision,index)=>({
    candidateId:candidates[index].id,
    treatment:decision.choiceId&&EDITORIAL_TREATMENTS[decision.choiceId]?decision.choiceId:fallbackTreatment(candidates[index],index),
    mode:decision.mode||"deterministic",
    confidence:finite(decision.confidence)===null?0:decision.confidence,
    reason:safeText(decision.reason,240)
  }));
  const cardNotes=mapped.map(x=>{
    const candidate=candidates.find(c=>c.id===x.candidateId);
    return {...x,placement:`card:${x.candidateId}:after-weather`,question:editorialQuestion(candidate,x.treatment),brief:treatmentBrief(x.treatment),evidence:editorialEvidence(candidate,x.treatment,fallSnapshot)};
  });
  return {
    mode:mapped.some(x=>x.mode==="shared-harness-jev")?"shared-harness-jev":"deterministic",
    cardNotes,
    decisions:mapped
  };
}
function imagePoolForBoard(candidates){
  const placeIds=new Set((candidates||[]).map(c=>c&&c.place&&c.place.id).filter(Boolean));
  return APPROVED_BOARD_IMAGES.filter(image=>(image.placeIds||[]).some(id=>placeIds.has(id)));
}
function detroitDayKey(now=new Date()){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Detroit",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(now);
  const row=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${row.year}-${row.month}-${row.day}`;
}
function imageCycleKey(board){
  const signature=(board||[]).map(c=>c&&c.id).filter(Boolean).sort().join("|");
  const hash=crypto.createHash("sha1").update(signature).digest("hex").slice(0,12);
  return `detroit-outdoors:image-choice:v2:${detroitDayKey()}:${hash}`;
}
async function recentImageHistory(){
  try{
    const raw=await redis(["GET","detroit-outdoors:image-history:v2"]);
    const parsed=JSON.parse(raw||"[]");
    return Array.isArray(parsed)?parsed.filter(x=>x&&x.id).slice(0,6):[];
  }catch{return[];}
}
async function rememberImage(image){
  if(!image)return;
  try{
    const history=await recentImageHistory();
    const next=[{id:image.id,at:new Date().toISOString()},...history.filter(x=>x.id!==image.id)].slice(0,6);
    await redis(["SET","detroit-outdoors:image-history:v2",JSON.stringify(next),"EX",60*60*24*10]);
  }catch{}
}
async function cachedImageChoice(board,pool){
  try{
    const raw=await redis(["GET",imageCycleKey(board)]);
    const parsed=JSON.parse(raw||"null");
    const selected=parsed&&pool.find(image=>image.id===parsed.id);
    if(!selected)return null;
    return {
      selection:selected,
      decision:{
        mode:"cached-jev-image",
        choiceId:selected.id,
        confidence:finite(parsed.confidence)===null?0:parsed.confidence,
        reason:safeText(parsed.reason||"Reusing today's JEV image choice for the same board.",240),
        originalMode:parsed.mode||null
      },
      pool:pool.map(x=>x.id),
      recentIds:Array.isArray(parsed.recentIds)?parsed.recentIds:[]
    };
  }catch{return null;}
}
async function rememberImageChoice(board,image,result,recentIds){
  if(!image)return;
  try{
    await redis(["SET",imageCycleKey(board),JSON.stringify({
      id:image.id,
      mode:result&&result.mode||null,
      confidence:result&&result.confidence||0,
      reason:result&&result.reason||null,
      recentIds,
      chosenAt:new Date().toISOString()
    }),"EX",60*60*36]);
  }catch{}
}
async function judgeImageUnsafe(candidates){
  const board=(candidates||[]).filter(Boolean);
  if(!board.length) return {selection:null,decision:{mode:"deterministic",choiceId:"NONE",confidence:0,reason:"No board"},pool:[],recentIds:[]};
  const pool=imagePoolForBoard(board);
  if(!pool.length) return {selection:null,decision:{mode:"deterministic",choiceId:"NONE",confidence:1,reason:"No approved image for today's selected opportunities"},pool:[],recentIds:[]};

  const cached=await cachedImageChoice(board,pool);
  if(cached)return cached;

  const history=await recentImageHistory();
  const recentIds=history.slice(0,3).map(x=>x.id);
  const options={};
  for(const image of pool){
    const matchedPlaces=board.filter(c=>(image.placeIds||[]).includes(c.place&&c.place.id)).map(c=>c.place.name);
    const freshness=recentIds.includes(image.id)?" Recently used.":" Not recently used.";
    options[image.id]=`Licensed file photo relevant to ${matchedPlaces.join(", ")}. Alt text: ${image.alt}. License: ${image.license}.${freshness}`;
  }
  options.NONE="Use no image only if every available file photo would misrepresent today's selected opportunities.";
  const freshFallback=pool.find(image=>!recentIds.includes(image.id))||pool[0];
  const result=await decideClosedSet({
    task:"Choose the single best hero file photo for today's Detroit Outdoors board. This is a board-level visual decision, not a lead-card illustration. Prefer a relevant photo that has not been used recently when it is comparably useful.",
    options,
    context:{
      selectedOpportunities:board.map(c=>({id:c.id,place:c.place&&c.place.name,placeId:c.place&&c.place.id,activity:c.activity,sourceEngine:c.sourceEngine,title:c.title})),
      recentlyUsedImageIds:recentIds
    },
    constraints:[
      "Choose only from the supplied options.",
      "The photo must correspond to a place represented on today's selected board.",
      "Relevance is more important than novelty; do not rotate to a less relevant image merely to force change.",
      "When two or more images are similarly relevant, prefer one that is not in recentlyUsedImageIds.",
      "Prefer an approved relevant image over NONE when it can be clearly labeled as a historical file photo.",
      "Never treat a historical file photo as evidence of current weather, crowds, foliage, wildlife, vessel position, water conditions or access.",
      "Choose NONE only when every available photo would imply a current condition not established by the board."
    ],
    evidence:pool.map(image=>({id:image.id,source:image.creditUrl,text:`Approved licensed file image: ${image.alt}; ${image.credit}; ${image.license}.`})),
    fallbackId:freshFallback.id,
    minConfidence:.50,
    timeoutMs:3000
  });
  const selected=pool.find(image=>image.id===result.choiceId)||null;
  if(selected){
    await rememberImage(selected);
    await rememberImageChoice(board,selected,result,recentIds);
  }
  return {selection:selected,decision:result,pool:pool.map(x=>x.id),recentIds};
}
async function judgeImage(candidates){
  try{
    return await judgeImageUnsafe(candidates);
  }catch(error){
    const board=(candidates||[]).filter(Boolean);
    const pool=imagePoolForBoard(board);
    const history=await recentImageHistory().catch(()=>[]);
    const recentIds=(history||[]).slice(0,3).map(x=>x&&x.id).filter(Boolean);
    const fallback=pool.find(image=>!recentIds.includes(image.id))||pool[0]||null;
    return {
      selection:fallback,
      decision:{
        mode:"deterministic-image-fallback",
        choiceId:fallback?fallback.id:"NONE",
        confidence:0,
        reason:"Image selector runtime fallback: "+safeText(error&&error.message||error,180)
      },
      pool:pool.map(x=>x.id),
      recentIds
    };
  }
}
function fingerprint(candidates,fallSnapshot,hold,plan){
  const bucket=Math.floor(Date.now()/(6*60*60*1000));
  const compact={
    bucket,
    hold,
    fall:fallSnapshot?{label:fallSnapshot.label,pct:Math.round(fallSnapshot.pct/5)*5}:null,
    c:candidates.slice(0,3).map(x=>({id:x.id,s:Math.round(x.score/5)*5,w:{h:round(x.weather.high,5),r:round(x.weather.rainChance,10),g:round(x.weather.gust,5),c:round(x.weather.cloudCover,10)}})),
    p:((plan&&plan.cardNotes)||[]).map(x=>({id:x.candidateId,t:x.treatment}))
  };
  return crypto.createHash("sha256").update(JSON.stringify(compact)).digest("hex").slice(0,20);
}
const REDIS_URL=process.env.UPSTASH_REDIS_REST_URL||process.env.KV_REST_API_URL||"";
const REDIS_TOKEN=process.env.UPSTASH_REDIS_REST_TOKEN||process.env.KV_REST_API_TOKEN||"";
async function redis(cmd){
  if(!REDIS_URL||!REDIS_TOKEN) throw new Error("redis unavailable");
  const res=await fetch(REDIS_URL,{method:"POST",headers:{authorization:`Bearer ${REDIS_TOKEN}`,"content-type":"application/json"},body:JSON.stringify(cmd),signal:AbortSignal.timeout(3500)});
  if(!res.ok) throw new Error(`redis ${res.status}`);
  const data=await res.json();
  return data&&data.result;
}
const BIRD_TERM_RULES=[
  ["warbler",/\bwarblers?\b/i],
  ["thrush",/\bthrush(?:es)?\b/i],
  ["shorebird",/\bshorebirds?\b/i],
  ["waterfowl",/\bwaterfowl\b/i],
  ["wading bird",/\bwading birds?\b/i],
  ["songbird",/\bsongbirds?\b/i],
  ["raptor",/\braptors?\b/i],
  ["duck",/\bducks?\b/i],
  ["hawk",/\bhawks?\b/i],
  ["eagle",/\beagles?\b/i],
  ["heron",/\bherons?\b/i],
  ["crane",/\bcranes?\b/i],
  ["sparrow",/\bsparrows?\b/i],
  ["swallow",/\bswallows?\b/i],
  ["gull",/\bgulls?\b/i],
  ["tern",/\bterns?\b/i],
  ["swan",/\bswans?\b/i],
  ["owl",/\bowls?\b/i],
  ["woodpecker",/\bwoodpeckers?\b/i]
];
function evidenceVocabulary(slot){
  const evidence=((slot&&slot.evidence&&slot.evidence.contextFacts)||[]).join(" ");
  return {
    allowedBirdTerms:BIRD_TERM_RULES.filter(([,re])=>re.test(evidence)).map(([label])=>label),
    allowedStrengthWords:["peak","ideal","critical","exceptional"].filter(word=>new RegExp(`\\b${word}\\b`,"i").test(evidence))
  };
}
function unsupportedSpecificClaims(note,slot){
  const evidence=((slot&&slot.evidence&&slot.evidence.contextFacts)||[]).join(" ");
  const unsupported=[];
  for(const [label,re] of BIRD_TERM_RULES){
    if(re.test(note)&&!re.test(evidence)) unsupported.push(label);
  }
  for(const word of ["peak","ideal","critical","exceptional"]){
    const re=new RegExp(`\\b${word}\\b`,"i");
    if(re.test(note)&&!re.test(evidence)) unsupported.push(word);
  }
  return unsupported;
}
async function reviewEditorialNote(candidate,slot,note){
  if(!candidate||!slot||!note) return {candidateId:candidate&&candidate.id||null,accepted:false,mode:"deterministic",reason:"No draft to review"};
  const unsupported=unsupportedSpecificClaims(note,slot);
  if(unsupported.length) return {candidateId:candidate.id,accepted:false,mode:"deterministic-evidence-gate",confidence:1,reason:`Unsupported specific claim(s): ${unsupported.join(", ")}`};
  const visible=candidate.story?{headline:candidate.story.headline,move:candidate.story.move,worthIt:candidate.story.worthIt,whyToday:candidate.story.whyToday}:null;
  const decision=await decideClosedSet({
    task:"Decide whether this drafted card paragraph genuinely earns space on Detroit Outdoors Today. ACCEPT only if it adds decision value beyond the visible deterministic card while staying fully supported by the sealed facts.",
    options:{
      ACCEPT:"The paragraph answers the assigned editorial question, adds a useful synthesis or tradeoff beyond the visible card, and stays within the verified evidence.",
      REJECT:"The paragraph mostly paraphrases visible facts, is generic or padded, fails to answer the assigned question, or makes an unsupported inference."
    },
    context:{place:candidate.place.name,activity:candidate.activity,treatment:slot.treatment,question:slot.question},
    constraints:[
      "Choose exactly one supplied option.",
      "Reject generic encouragement, weather restatement, score restatement, travel-time restatement, or prose that could fit almost any park.",
      "Reject unsupported claims about crowds, sightings, trail conditions, access, water safety, closures or exact on-site seasonal conditions.",
      "Reject any named bird species or bird group that does not appear in additiveEvidence.contextFacts.",
      "Reject words such as peak, ideal, critical or exceptional when the evidence does not explicitly support that strength.",
      "Accept only when the paragraph materially helps a person decide, prepare, set expectations or know what could change the decision.",
      "Do not rewrite the paragraph."
    ],
    evidence:[{
      id:candidate.id,
      source:"sealed candidate plus drafted prose",
      text:JSON.stringify({facts:{sourceEngine:candidate.sourceEngine,opportunityType:candidate.opportunityType,place:candidate.place,activity:candidate.activity,timeWindow:candidate.timeWindow,whyNow:candidate.whyNow,weather:candidate.weather,reasons:candidate.reasons,specialist:candidate.specialist,verifiedEvidence:candidate.verifiedEvidence,confidence:candidate.confidence,travel:candidate.travel,uncertainty:candidate.uncertainty,caveat:candidate.caveat},additiveEvidence:slot.evidence,visibleCard:visible,draft:note})
    }],
    fallbackId:"REJECT",
    minConfidence:.58,
    timeoutMs:2600
  });
  if(decision.mode==="shared-harness-jev"){
    return {candidateId:candidate.id,accepted:decision.choiceId==="ACCEPT",mode:decision.mode,confidence:decision.confidence||0,reason:safeText(decision.reason,240)};
  }
  return {
    candidateId:candidate.id,
    accepted:true,
    mode:"deterministic-evidence-review-fallback",
    confidence:decision.confidence||0,
    reason:"JEV semantic review was unavailable or below confidence threshold; deterministic evidence gate passed."
  };
}
async function validateEditorialNotes(edition,candidates,plan){
  const slots=((plan&&plan.cardNotes)||[]).filter(x=>edition.notes&&edition.notes[x.candidateId]);
  if(!slots.length) return {...edition,reviews:[]};
  const reviews=await Promise.all(slots.map(slot=>{
    const candidate=candidates.find(c=>c.id===slot.candidateId);
    return reviewEditorialNote(candidate,slot,edition.notes[slot.candidateId]);
  }));
  const notes={};
  for(const review of reviews){
    if(review.accepted&&edition.notes[review.candidateId]) notes[review.candidateId]=edition.notes[review.candidateId];
  }
  return {...edition,notes,reviews};
}
function parseWriterJson(raw){
  try{
    const body=String(raw||"").trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
    const parsed=JSON.parse(body);
    return parsed&&typeof parsed==="object"?parsed:null;
  }catch{return null;}
}
async function anthropicWrite(system,prompt,maxTokens=360){
  const model=process.env.OUTDOORS_WRITER_MODEL||WRITER_MODEL_DEFAULT;
  const response=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"content-type":"application/json","x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({
      model,
      max_tokens:maxTokens,
      temperature:.3,
      system,
      messages:[{role:"user",content:prompt}]
    }),
    signal:AbortSignal.timeout(9000)
  });
  const data=await response.json().catch(()=>null);
  const raw=((data&&data.content)||[]).filter(x=>x&&x.type==="text").map(x=>x.text).join("\n").trim();
  if(!response.ok||!raw) throw new Error(`writer ${response.status}`);
  return {raw,model};
}
function cardFingerprint(candidate,slot){
  const bucket=Math.floor(Date.now()/(6*60*60*1000));
  const compact={
    bucket,
    id:candidate.id,
    treatment:slot.treatment,
    score:Math.round(candidate.score/5)*5,
    weather:candidate.weather,
    reasons:candidate.reasons,
    evidence:slot.evidence&&slot.evidence.contextFacts
  };
  return crypto.createHash("sha256").update(JSON.stringify(compact)).digest("hex").slice(0,20);
}
async function writeDeskEditorial(candidates,fallSnapshot,hold,plan){
  const fallback=deterministicEdition(candidates,fallSnapshot,hold,plan);
  const fp=fingerprint(candidates,fallSnapshot,hold,plan);
  const key=`detroit-outdoors:desk:v8:${fp}`;
  try{
    const cached=await redis(["GET",key]);
    if(cached){
      const parsed=JSON.parse(cached);
      if(parsed&&parsed.headline&&parsed.read) return {...parsed,mode:"cached-ai",fingerprint:fp};
    }
  }catch{}
  const date=new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date());
  const facts={
    date,
    market:"Detroit and Southeast Michigan",
    hold,
    candidates:candidates.map(c=>({
      id:c.id,
      sourceEngine:c.sourceEngine,
      opportunityType:c.opportunityType,
      place:{name:c.place.name,area:c.place.area,drive:c.place.drive,driveClass:c.place.driveClass},
      activity:c.activity,
      timeWindow:c.timeWindow,
      whyNow:c.whyNow,
      score:c.score,
      weather:c.weather,
      reasons:c.reasons
    })),
    fallColor:fallSnapshot?{label:fallSnapshot.label,pct:fallSnapshot.pct,phase:fallSnapshot.phase,peakWindow:fallSnapshot.peakWindow}:null
  };
  const system=[
    "You write only the short daily desk read for Detroit Outdoors Today. Card explanations are written separately by independent card writers.",
    "Write like a strong local outdoor editor: clear, specific, understated, useful.",
    "Use only supplied facts. Do not invent access, sightings, crowds, trail conditions or firsthand observations.",
    "Do not write card-by-card detail. Summarize the shape of the day and why the lead belongs at the top.",
    "No first person, slogans, em dashes or exclamation points.",
    "Return JSON only: {\"headline\":\"...\",\"read\":\"...\"}. Read should be 75 to 110 words."
  ].join(" ");
  try{
    const out=await anthropicWrite(system,`Verified desk packet:\n${JSON.stringify(facts)}`,360);
    const parsed=parseWriterJson(out.raw);
    const headline=safeText(parsed&&parsed.headline,140).replace(/\u2014/g,", ");
    const read=safeText(parsed&&parsed.read,2200).replace(/\u2014/g,", ");
    if(!headline||!read) throw new Error("invalid desk JSON");
    const result={headline,read,model:out.model};
    try{await redis(["SET",key,JSON.stringify(result),"EX",60*60*6]);}catch{}
    return {...result,mode:"anthropic",fingerprint:fp};
  }catch(error){
    return {...fallback,mode:"deterministic",reason:safeText(error&&error.message||error),fingerprint:fp};
  }
}
async function recoverEditorialSlot(candidate,slot,fallSnapshot){
  const options={};
  for(const [id,label] of Object.entries(EDITORIAL_TREATMENTS)){
    if(id===slot.treatment) continue;
    if(id==="NEXT_CHECK"&&!candidate.specialist) continue;
    if(id==="MIGRATION_CONTEXT"&&!(hasMigrationSignal(candidate)&&hasPlaceSpecificMigrationContext(candidate))) continue;
    if(id==="SEASONAL_CONTEXT"&&!(candidate.sourceEngine==="fall-color-phenology"||(candidate.reasons||[]).some(r=>/fall-color/i.test(String(r))))) continue;
    options[id]=label;
  }
  const ids=Object.keys(options);
  const fallbackId=ids.includes("DRIVE_DECISION")&&candidate.place&&candidate.place.driveClass==="far"
    ?"DRIVE_DECISION"
    :ids.includes("PLACE_CONTEXT")?"PLACE_CONTEXT":ids[0];
  const decision=await decideClosedSet({
    task:"The originally assigned Detroit Outdoors card-writing job has repeatedly failed editorial review. Choose a DIFFERENT editorial job that can add specific decision value from the same sealed evidence without changing the card selection, safety result, score or facts.",
    options,
    context:{
      candidateId:candidate.id,
      place:candidate.place.name,
      activity:candidate.activity,
      originalTreatment:slot.treatment,
      driveClass:candidate.place.driveClass,
      sourceEngine:candidate.sourceEngine,
      migrationSignal:hasMigrationSignal(candidate),
      placeSpecificMigrationContext:hasPlaceSpecificMigrationContext(candidate)
    },
    constraints:[
      "Choose exactly one supplied treatment and do not choose the original treatment.",
      "Prefer a treatment that can use concrete place-specific facts rather than repeating visible weather, score, drive band or generic seasonal language.",
      "For a far-drive candidate, DRIVE_DECISION is useful when the unresolved question is whether the distinctive place is worth the trip.",
      "Do not create facts or weaken any deterministic safety decision."
    ],
    evidence:[{
      id:candidate.id,
      source:"sealed Detroit Outdoors candidate and original editorial evidence",
      text:JSON.stringify({
        candidate:{place:candidate.place,activity:candidate.activity,sourceEngine:candidate.sourceEngine,opportunityType:candidate.opportunityType,reasons:candidate.reasons,specialist:candidate.specialist,confidence:candidate.confidence,travel:candidate.travel,uncertainty:candidate.uncertainty,caveat:candidate.caveat},
        originalTreatment:slot.treatment,
        originalQuestion:slot.question,
        contextFacts:slot.evidence&&slot.evidence.contextFacts
      })
    }],
    fallbackId,
    minConfidence:.52,
    timeoutMs:2200
  });
  const treatment=options[decision.choiceId]?decision.choiceId:fallbackId;
  return {
    ...slot,
    treatment,
    question:editorialQuestion(candidate,treatment),
    brief:treatmentBrief(treatment),
    evidence:editorialEvidence(candidate,treatment,fallSnapshot),
    reassignedFrom:slot.treatment,
    reassignmentMode:decision.mode||"deterministic",
    reassignmentReason:safeText(decision.reason,240)
  };
}
function cardWriterSystem(){
  return [
    "You write one and only one Detroit Outdoors card explanation. A bounded JEV classifier already selected the editorial job and evidence for this card.",
    "Your paragraph must be additive. Do not restate the score, weather chips, title, drive band or visible bullets unless a number is necessary to explain a consequence.",
    "Use the supplied place context. Explain what the place means for the activity, what the seasonal or specialist signal means when relevant, and how the person should use that information.",
    "Use only supplied verified facts. Never invent wildlife sightings, crowds, trail conditions, closures, water safety, events or firsthand observations.",
    "Do not name a bird species or bird group unless that exact kind of bird appears in additiveEvidence.contextFacts. Generic words such as birds or migrants are allowed.",
    "Do not call migration peak, ideal, critical or exceptional unless the supplied evidence explicitly supports that strength claim.",
    "The packet includes allowedSpecificLanguage. Treat that list as a hard whitelist for named bird groups and strength words.",
    "When local migration evidence exists, lead with the place-specific fact rather than a generic statewide migration sentence.",
    "Migration timing is not a live bird report. Fall-color modeling is not proof of exact trees. Weather-based paddling is not a water-safety clearance.",
    "Write like a knowledgeable local editor, not a chatbot. No first person, slogans, em dashes, exclamation points or canned AI phrasing.",
    "Return JSON only: {\"note\":\"...\"}."
  ].join(" ");
}
async function writeCardEditorial(candidate,slot,date,fallSnapshot){
  const fp=cardFingerprint(candidate,slot);
  const key=`detroit-outdoors:card:v10:${fp}`;
  try{
    const cached=await redis(["GET",key]);
    if(cached){
      const parsed=JSON.parse(cached);
      if(parsed&&parsed.note) return {...parsed,mode:"cached-ai",fingerprint:fp};
    }
  }catch{}
  const visible=candidate.story?{
    headline:candidate.story.headline,
    move:candidate.story.move,
    worthIt:candidate.story.worthIt,
    whyToday:candidate.story.whyToday
  }:null;
  let activeSlot=slot;
  let packet={
    date,
    candidateId:candidate.id,
    sourceEngine:candidate.sourceEngine,
    opportunityType:candidate.opportunityType,
    place:candidate.place,
    activity:candidate.activity,
    timeWindow:candidate.timeWindow,
    whyNow:candidate.whyNow,
    confidence:candidate.confidence,
    travel:candidate.travel,
    uncertainty:candidate.uncertainty,
    treatment:activeSlot.treatment,
    question:activeSlot.question,
    brief:activeSlot.brief,
    additiveEvidence:activeSlot.evidence,
    allowedSpecificLanguage:evidenceVocabulary(activeSlot),
    live:{weather:candidate.weather,reasons:candidate.reasons,specialist:candidate.specialist,verifiedEvidence:candidate.verifiedEvidence,caveat:candidate.caveat},
    visibleCard:visible
  };
  let prompt=`This is an independent card-writing job. Directly answer the assigned question.\n\n${JSON.stringify(packet)}`;
  try{
    let out=await anthropicWrite(cardWriterSystem(),prompt,320);
    let parsed=parseWriterJson(out.raw);
    let note=safeText(parsed&&parsed.note,900).replace(/\u2014/g,", ");
    if(!note) throw new Error("empty card note");
    let review=await reviewEditorialNote(candidate,activeSlot,note);
    let attempt=1;
    if(!review.accepted){
      attempt=2;
      const vocabulary=evidenceVocabulary(activeSlot);
      const repairPrompt=`${prompt}\n\nThe reviewer rejected the first draft for this reason: ${safeText(review.reason,240)}. Rewrite it so it materially adds value and directly answers the question. Named bird terms may come only from this whitelist: ${JSON.stringify(vocabulary.allowedBirdTerms)}. Strength words such as peak/ideal/critical/exceptional may come only from this whitelist: ${JSON.stringify(vocabulary.allowedStrengthWords)}. If a whitelist is empty, do not use those specific terms. Return only JSON with note.`;
      out=await anthropicWrite(cardWriterSystem(),repairPrompt,340);
      parsed=parseWriterJson(out.raw);
      note=safeText(parsed&&parsed.note,900).replace(/\u2014/g,", ");
      if(!note) throw new Error("empty repaired card note");
      review=await reviewEditorialNote(candidate,activeSlot,note);
    }
    if(!review.accepted){
      attempt=3;
      const vocabulary=evidenceVocabulary(activeSlot);
      const rescuePrompt=`Write a restrained evidence-only card explanation for ${candidate.place.name}. Use only facts contained in additiveEvidence.contextFacts plus the live weather/reasons in this packet. Do not introduce any named bird group except this exact whitelist: ${JSON.stringify(vocabulary.allowedBirdTerms)}. Do not use peak, ideal, critical or exceptional unless present in this whitelist: ${JSON.stringify(vocabulary.allowedStrengthWords)}. Prefer plain factual implications over persuasive language. Directly answer: ${activeSlot.question}. Keep it 45 to 70 words. Return JSON only as {"note":"..."}.

Packet:
${JSON.stringify(packet)}`;
      out=await anthropicWrite(cardWriterSystem(),rescuePrompt,300);
      parsed=parseWriterJson(out.raw);
      note=safeText(parsed&&parsed.note,900).replace(/\u2014/g,", ");
      if(!note) throw new Error("empty evidence-only card note");
      review=await reviewEditorialNote(candidate,activeSlot,note);
    }
    if(!review.accepted){
      attempt=4;
      const vocabulary=evidenceVocabulary(activeSlot);
      const finalPrompt=`The previous drafts were rejected because they did not add enough specific decision value. Write exactly two short sentences, 35 to 55 words total.

Sentence 1: use one concrete place-specific fact from additiveEvidence.contextFacts and explain why that fact matters for this activity today.
Sentence 2: use one seasonal or specialist fact from additiveEvidence.contextFacts and set one realistic expectation or next decision.

Do not mention the score, drive time, temperature, rain chance, wind, generic encouragement, or facts not in the packet. Named bird terms may come only from this exact whitelist: ${JSON.stringify(vocabulary.allowedBirdTerms)}. Strength words peak/ideal/critical/exceptional may come only from this whitelist: ${JSON.stringify(vocabulary.allowedStrengthWords)}. Return JSON only as {"note":"..."}.

Question to answer: ${activeSlot.question}

Packet:
${JSON.stringify(packet)}`;
      out=await anthropicWrite(cardWriterSystem(),finalPrompt,260);
      parsed=parseWriterJson(out.raw);
      note=safeText(parsed&&parsed.note,900).replace(/\u2014/g,", ");
      if(!note) throw new Error("empty final-rescue card note");
      review=await reviewEditorialNote(candidate,activeSlot,note);
    }
    if(!review.accepted){
      attempt=5;
      activeSlot=await recoverEditorialSlot(candidate,slot,fallSnapshot);
      packet={
        date,
        candidateId:candidate.id,
        sourceEngine:candidate.sourceEngine,
        opportunityType:candidate.opportunityType,
        place:candidate.place,
        activity:candidate.activity,
        timeWindow:candidate.timeWindow,
        whyNow:candidate.whyNow,
        confidence:candidate.confidence,
        travel:candidate.travel,
        uncertainty:candidate.uncertainty,
        treatment:activeSlot.treatment,
        question:activeSlot.question,
        brief:activeSlot.brief,
        additiveEvidence:activeSlot.evidence,
        allowedSpecificLanguage:evidenceVocabulary(activeSlot),
        live:{weather:candidate.weather,reasons:candidate.reasons,specialist:candidate.specialist,verifiedEvidence:candidate.verifiedEvidence,caveat:candidate.caveat},
        visibleCard:visible
      };
      prompt=`The original editorial job was repeatedly rejected. JEV has reassigned this card to a different job. Write 45 to 75 words that directly answer the NEW question using concrete place-specific evidence. Do not mention that a reassignment happened. Do not restate the score, drive band, temperature, rain chance or generic card bullets. Return JSON only as {"note":"..."}.

${JSON.stringify(packet)}`;
      out=await anthropicWrite(cardWriterSystem(),prompt,300);
      parsed=parseWriterJson(out.raw);
      note=safeText(parsed&&parsed.note,900).replace(/\u2014/g,", ");
      if(!note) throw new Error("empty reassigned card note");
      review=await reviewEditorialNote(candidate,activeSlot,note);
    }
    if(!review.accepted){
      return {candidateId:candidate.id,note:null,mode:"anthropic-rejected",model:out.model,review,attempt,fingerprint:fp,treatment:activeSlot.treatment,reassignedFrom:activeSlot.reassignedFrom||null,sources:activeSlot.evidence&&activeSlot.evidence.sources||[]};
    }
    const result={candidateId:candidate.id,note,model:out.model,review,attempt,treatment:activeSlot.treatment,reassignedFrom:activeSlot.reassignedFrom||null,reassignmentMode:activeSlot.reassignmentMode||null,sources:activeSlot.evidence&&activeSlot.evidence.sources||[]};
    try{await redis(["SET",key,JSON.stringify(result),"EX",60*60*6]);}catch{}
    return {...result,mode:"anthropic",fingerprint:fp};
  }catch(error){
    return {candidateId:candidate.id,note:null,mode:"deterministic",reason:safeText(error&&error.message||error),review:null,fingerprint:fp};
  }
}
async function writeEditorial(candidates,fallSnapshot,hold,plan){
  const fallback=deterministicEdition(candidates,fallSnapshot,hold,plan);
  if(!process.env.ANTHROPIC_API_KEY) return {...fallback,text:fallback.read,mode:"deterministic",reason:"missing ANTHROPIC_API_KEY",cardWriters:[]};
  if(!candidates.length) return {...fallback,text:fallback.read,mode:"deterministic",reason:"no candidates",cardWriters:[]};
  const date=new Intl.DateTimeFormat("en-US",{timeZone:"America/Detroit",weekday:"long",month:"long",day:"numeric",year:"numeric"}).format(new Date());
  const deskPromise=writeDeskEditorial(candidates,fallSnapshot,hold,plan);
  const cardPromise=Promise.all((plan.cardNotes||[]).map(slot=>{
    const candidate=candidates.find(c=>c.id===slot.candidateId);
    return writeCardEditorial(candidate,slot,date,fallSnapshot);
  }));
  const [desk,cardResults]=await Promise.all([deskPromise,cardPromise]);
  const notes={};
  const reviews=[];
  const noteSources={};
  const actualPlacements=[];
  for(const result of cardResults){
    if(result.note) notes[result.candidateId]=result.note;
    if(result.review) reviews.push(result.review);
    if(result.sources) noteSources[result.candidateId]=result.sources;
    const planned=(plan.cardNotes||[]).find(x=>x.candidateId===result.candidateId);
    actualPlacements.push({
      candidateId:result.candidateId,
      treatment:result.treatment||planned&&planned.treatment||null,
      placement:planned&&planned.placement||`card:${result.candidateId}:after-weather`,
      question:result.treatment?editorialQuestion(candidates.find(c=>c.id===result.candidateId),result.treatment):planned&&planned.question||null,
      reassignedFrom:result.reassignedFrom||null
    });
  }
  const writerModes=cardResults.map(x=>x.mode);
  const mode=desk.mode==="anthropic"||writerModes.includes("anthropic")?"anthropic"
    :desk.mode==="cached-ai"||writerModes.includes("cached-ai")?"cached-ai"
      :"deterministic";
  const model=(cardResults.find(x=>x.model)||desk).model||null;
  return {
    headline:desk.headline||fallback.headline,
    read:desk.read||fallback.read,
    text:desk.read||fallback.read,
    notes,
    noteSources,
    actualPlacements,
    reviews,
    mode,
    model,
    reason:desk.reason||null,
    cardWriters:cardResults.map(x=>({
      candidateId:x.candidateId,
      mode:x.mode,
      model:x.model||null,
      attempt:x.attempt||null,
      accepted:Boolean(x.note),
      reason:x.reason||x.review&&x.review.reason||null,
      treatment:x.treatment||null,
      reassignedFrom:x.reassignedFrom||null,
      reassignmentMode:x.reassignmentMode||null
    }))
  };
}
function intentSnapshot(intent,{safePool,gated,specialistStates,placeStates,alertStates}){
  const key=String(intent||"").toLowerCase();
  const configs={
    freighter:{
      label:"Detroit River freighters",
      engine:"great-lakes-ais",
      activity:"freighter-watching",
      deeperUrl:"https://chrisizworski.com/great-lakes-freighter-tracking/",
      noSignal:"No named commercial vessel currently clears the fresh-AIS Detroit River window."
    },
    birding:{
      label:"Detroit birding",
      activity:"birding",
      deeperUrl:"https://michiganbirdingreport.com/",
      noSignal:"No birding window currently clears the Detroit Outdoors weather and hazard filters."
    },
    water:{
      label:"Lake St. Clair outdoors",
      engine:"great-lakes-water",
      activity:"paddling",
      deeperUrl:"https://chrisizworski.com/great-lakes-buoys/",
      noSignal:"Lake St. Clair does not currently clear the conservative calm-water gate."
    },
    sunset:{
      label:"Detroit sunset",
      engine:"sunset-photography",
      activity:"photography",
      deeperUrl:"https://chrisizworski.com/detroit-sunset-tonight/",
      noSignal:"No Detroit sunset/photography window currently clears the weather and sky-cover gate."
    }
  };
  const config=configs[key];
  if(!config) return null;
  const rows=(safePool||[]).filter(candidate=>{
    if(config.engine&&candidate.sourceEngine!==config.engine) return false;
    if(config.activity&&candidate.activity!==config.activity) return false;
    return true;
  }).sort((a,b)=>(b.score||0)-(a.score||0));
  const candidate=rows[0]||null;
  const rejected=(gated&&gated.rejected||[]).filter(row=>{
    if(config.engine&&row.sourceEngine!==config.engine) return false;
    if(config.activity&&row.activity!==config.activity) return false;
    return true;
  });
  const sourceOk=key==="freighter"
    ?Boolean(specialistStates&&specialistStates.freighterAis&&specialistStates.freighterAis.ok)
    :key==="water"
      ?Boolean(specialistStates&&specialistStates.water&&specialistStates.water.ok&&specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.ok)
      :key==="sunset"
        ?Boolean(specialistStates&&specialistStates.nightSky&&specialistStates.nightSky.ok)
        :Boolean((placeStates||[]).some(x=>x&&x.ok)&&(alertStates||[]).some(x=>x&&x.ok));
  return {
    id:key,
    label:config.label,
    available:Boolean(candidate),
    status:candidate?"live-window":sourceOk?"no-window":"source-unavailable",
    sourceOk,
    noSignal:config.noSignal,
    deeperUrl:config.deeperUrl,
    candidate:candidate?{...candidate,slot:"Live now",story:storyFor(candidate,0)}:null,
    rejected:rejected.map(row=>({id:row.id,sourceEngine:row.sourceEngine,reasons:row.reasons||[]})).slice(0,3)
  };
}

module.exports = async function detroitOutdoors(req,res){
  res.setHeader("X-Robots-Tag","noindex, nofollow");
  res.setHeader("Cache-Control","public, s-maxage=300, stale-while-revalidate=900");
  res.setHeader("Content-Type","application/json; charset=utf-8");
  if(req.method&&req.method!=="GET"){
    res.status(405).json({error:"method-not-allowed"});
    return;
  }

  const started=Date.now();
  const [placeStates,alertStates,standoutState,fallState,specialistStates]=await Promise.all([
    Promise.all(PLACES.map(loadPlace)),
    Promise.all(PLACES.map(loadAlerts)),
    loadStandouts(),
    loadFallColor(),
    loadSpecialistEngineStates()
  ]);

  const standouts=standoutState.rows||[];
  const fallSnapshot=fallState.snapshot||null;
  const suppressed=[];
  const parkSafePool=[];
  for(let i=0;i<PLACES.length;i++){
    const result=safeCandidatesFrom(placeStates[i],alertStates[i],standouts,fallSnapshot);
    if(result.suppressed) suppressed.push(result.suppressed);
    parkSafePool.push(...result.candidates);
  }

  const emitted=emitSpecialistCandidates({placeStates,alertStates,fallSnapshot,specialistStates});
  const specialistGate=hardGateSpecialistCandidates(emitted.candidates);
  const mixed=dedupeMixedPool(parkSafePool,specialistGate.safe,specialistGate.rejected);
  const safePool=mixed.candidates;
  const boardPool=bundleCandidatesByPlace(safePool);

  const query=new URL(req.url||"/","https://chrisizworski.com").searchParams;
  const requestedIntent=query.get("intent");
  if(requestedIntent){
    const intent=intentSnapshot(requestedIntent,{safePool,gated:specialistGate,specialistStates,placeStates,alertStates});
    if(!intent){
      res.status(400).json({ok:false,error:"unknown-intent",allowed:["freighter","birding","water","sunset"]});
      return;
    }
    res.status(200).json({
      ok:true,
      market:"Detroit / Southeast Michigan",
      generatedAt:new Date().toISOString(),
      elapsedMs:Date.now()-started,
      intent
    });
    return;
  }

  const requestedBoardIds=String(query.get("board")||"").split(",").map(x=>x.trim()).filter(Boolean).slice(0,4);
  if(query.get("mode")==="image"&&requestedBoardIds.length){
    const byId=new Map(boardPool.map(candidate=>[candidate.id,candidate]));
    const imageBoard=requestedBoardIds.map(id=>byId.get(id)).filter(Boolean);
    if(imageBoard.length!==requestedBoardIds.length){
      res.status(409).json({
        ok:false,
        error:"board-changed",
        requestedBoardIds,
        availableBoardIds:boardPool.map(x=>x.id)
      });
      return;
    }
    const imageResult=await judgeImage(imageBoard);
    res.status(200).json({
      ok:true,
      mode:"hero-image",
      market:"Detroit / Southeast Michigan",
      generatedAt:new Date().toISOString(),
      elapsedMs:Date.now()-started,
      runtime:{
        commitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,
        vercelEnv:process.env.VERCEL_ENV||process.env.VERCEL_TARGET_ENV||null
      },
      boardIds:imageBoard.map(x=>x.id),
      image:imageResult.selection,
      decision:{
        image:{
          mode:imageResult.decision.mode,
          choiceId:imageResult.decision.choiceId,
          confidence:imageResult.decision.confidence,
          reason:imageResult.decision.reason||null,
          pool:imageResult.pool||[],
          recentIds:imageResult.recentIds||[]
        }
      }
    });
    return;
  }

  const boardDecision=await editBoard(boardPool,4);
  const hold=boardDecision.hold;
  let ranked=boardDecision.selected.map((x,index)=>{
    const withSlot={...x,slot:deterministicLabel(index,x,boardDecision.selected[0]&&boardDecision.selected[0].score||0)};
    return {...withSlot,story:storyFor(withSlot,index)};
  });
  const verdict=dayVerdict(ranked,hold);
  const frontPage=frontPageFor(ranked,hold,verdict);
  const opportunityEngineDiagnostics=engineDiagnostics({
    parkCandidates:parkSafePool,
    emitted,
    gated:specialistGate,
    mixedPool:safePool,
    boardPool,
    selected:ranked,
    specialistStates,
    replaced:mixed.replaced,
    vetoedLegacy:mixed.vetoedLegacy
  });

  if(query.get("mode")==="image"){
    const imageResult=await judgeImage(hold?[]:ranked);
    res.status(200).json({
      ok:true,
      mode:"hero-image",
      market:"Detroit / Southeast Michigan",
      generatedAt:new Date().toISOString(),
      elapsedMs:Date.now()-started,
      runtime:{
        commitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,
        vercelEnv:process.env.VERCEL_ENV||process.env.VERCEL_TARGET_ENV||null
      },
      boardIds:ranked.map(x=>x.id),
      image:imageResult.selection,
      decision:{
        image:{
          mode:imageResult.decision.mode,
          choiceId:imageResult.decision.choiceId,
          confidence:imageResult.decision.confidence,
          reason:imageResult.decision.reason||null,
          pool:imageResult.pool||[],
          recentIds:imageResult.recentIds||[]
        }
      }
    });
    return;
  }

  if(query.get("mode")==="core"){
    res.status(200).json({
      ok:true,
      mode:"core-board",
      market:"Detroit / Southeast Michigan",
      generatedAt:new Date().toISOString(),
      elapsedMs:Date.now()-started,
      runtime:{
        commitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,
        vercelEnv:process.env.VERCEL_ENV||process.env.VERCEL_TARGET_ENV||null
      },
      verdict,
      frontPage,
      editorial:frontPage.subhead,
      edition:{headline:frontPage.headline,read:frontPage.subhead,notes:{},noteSources:{},placements:[]},
      opportunities:ranked,
      image:null,
      fallColor:fallSnapshot?{
        label:fallSnapshot.label,
        modeledPercent:fallSnapshot.pct,
        phase:fallSnapshot.phase,
        peakWindow:fallSnapshot.peakWindow,
        drivers:fallSnapshot.source&&fallSnapshot.source.drivers||[]
      }:null,
      suppressed:suppressed.map(x=>({placeId:x.placeId,event:x.hazard&&x.hazard.event,headline:x.hazard&&x.hazard.headline})),
      decision:{
        lead:{mode:boardDecision.lead.mode,choiceId:boardDecision.lead.choiceId,confidence:boardDecision.lead.confidence,model:boardDecision.lead.model||null,reason:boardDecision.lead.reason||null},
        boardEditor:{
          mode:boardDecision.mode,
          candidateCount:boardDecision.candidateCount,
          candidateCountByEngine:countByEngine(boardPool),
          selectedCount:ranked.length,
          selectedIds:ranked.map(x=>x.id),
          selectedEngineDiversity:Object.keys(countByEngine(ranked)).length,
          selectedEngineCountByEngine:countByEngine(ranked),
          posture:{mode:boardDecision.posture.mode,choiceId:boardDecision.posture.choiceId,confidence:boardDecision.posture.confidence,model:boardDecision.posture.model||null,reason:boardDecision.posture.reason||null},
          slots:boardDecision.slots.map(x=>({position:x.position,mode:x.mode,choiceId:x.choiceId,confidence:x.confidence,model:x.model||null,reason:x.reason||null}))
        },
        editorial:{mode:"deferred",plannerMode:"deferred",placements:[],reviews:[],cardWriters:[]}
      },
      sourceHealth:{
        outdoorsNowPlaces:{ok:placeStates.filter(x=>x.ok).length,total:placeStates.length},
        outdoorsNowOpportunityLayer:{ok:standoutState.ok},
        nwsAlerts:{ok:alertStates.filter(x=>x.ok).length,total:alertStates.length},
        fallColor:{ok:fallState.ok,season:fallState.season},
        greatLakesWater:{
          ok:Boolean(specialistStates.water&&specialistStates.water.ok&&specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.ok),
          error:specialistStates.water&&(specialistStates.water.error||(specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.error))||null
        },
        nightSkyAurora:{ok:Boolean(specialistStates.nightSky&&specialistStates.nightSky.ok),error:specialistStates.nightSky&&specialistStates.nightSky.error||null},
        greatLakesAis:{ok:Boolean(specialistStates.freighterAis&&specialistStates.freighterAis.ok),error:specialistStates.freighterAis&&specialistStates.freighterAis.error||null},
        reusedOpportunitySources:opportunityEngineDiagnostics.sourceStatus
      },
      diagnostics:{opportunityEngines:opportunityEngineDiagnostics}
    });
    return;
  }

  const editorialPlan=await planEditorialPlacement(ranked,hold,fallSnapshot);
  const editorial=await writeEditorial(ranked,fallSnapshot,hold,editorialPlan);
  const imageResult={
    selection:null,
    decision:{mode:"independent-image-endpoint",choiceId:null,confidence:0,reason:"Hero image is loaded independently from mode=image."},
    pool:[],
    recentIds:[]
  };

  res.status(200).json({
    ok:true,
    market:"Detroit / Southeast Michigan",
    generatedAt:new Date().toISOString(),
    elapsedMs:Date.now()-started,
    runtime:{
      commitSha:process.env.VERCEL_GIT_COMMIT_SHA||null,
      vercelEnv:process.env.VERCEL_ENV||process.env.VERCEL_TARGET_ENV||null,
      anthropicKeyConfigured:Boolean(process.env.ANTHROPIC_API_KEY),
      writerModel:process.env.OUTDOORS_WRITER_MODEL||WRITER_MODEL_DEFAULT
    },
    verdict,
    frontPage,
    editorial:editorial.text,
    edition:{
      headline:editorial.headline,
      read:editorial.read,
      notes:editorial.notes||{},
      noteSources:Object.keys(editorial.noteSources||{}).length?editorial.noteSources:Object.fromEntries(editorialPlan.cardNotes.map(x=>[x.candidateId,(x.evidence&&x.evidence.sources)||[]])),
      placements:editorial.actualPlacements&&editorial.actualPlacements.length?editorial.actualPlacements:editorialPlan.cardNotes.map(x=>({candidateId:x.candidateId,treatment:x.treatment,placement:x.placement}))
    },
    opportunities:ranked,
    image:imageResult.selection,
    fallColor:fallSnapshot?{
      label:fallSnapshot.label,
      modeledPercent:fallSnapshot.pct,
      phase:fallSnapshot.phase,
      peakWindow:fallSnapshot.peakWindow,
      drivers:fallSnapshot.source&&fallSnapshot.source.drivers||[]
    }:null,
    suppressed:suppressed.map(x=>({placeId:x.placeId,event:x.hazard&&x.hazard.event,headline:x.hazard&&x.hazard.headline})),
    decision:{
      lead:{mode:boardDecision.lead.mode,choiceId:boardDecision.lead.choiceId,confidence:boardDecision.lead.confidence,model:boardDecision.lead.model||null,reason:boardDecision.lead.reason||null},
      boardEditor:{
        mode:boardDecision.mode,
        candidateCount:boardDecision.candidateCount,
        candidateCountByEngine:countByEngine(boardPool),
        selectedCount:ranked.length,
        selectedIds:ranked.map(x=>x.id),
        selectedEngineDiversity:Object.keys(countByEngine(ranked)).length,
        selectedEngineCountByEngine:countByEngine(ranked),
        posture:{mode:boardDecision.posture.mode,choiceId:boardDecision.posture.choiceId,confidence:boardDecision.posture.confidence,model:boardDecision.posture.model||null,reason:boardDecision.posture.reason||null},
        slots:boardDecision.slots.map(x=>({position:x.position,mode:x.mode,choiceId:x.choiceId,confidence:x.confidence,model:x.model||null,reason:x.reason||null}))
      },
      image:{mode:imageResult.decision.mode,choiceId:imageResult.decision.choiceId,confidence:imageResult.decision.confidence,reason:imageResult.decision.reason||null,pool:imageResult.pool||[],recentIds:imageResult.recentIds||[]},
      editorial:{
        mode:editorial.mode,
        model:editorial.model||null,
        reason:editorial.reason||null,
        plannerMode:editorialPlan.mode,
        placements:editorial.actualPlacements&&editorial.actualPlacements.length?editorial.actualPlacements:editorialPlan.cardNotes.map(x=>({
          candidateId:x.candidateId,
          treatment:x.treatment,
          placement:x.placement,
          question:x.question,
          confidence:x.confidence
        })),
        reviews:editorial.reviews||[],
        cardWriters:editorial.cardWriters||[]
      }
    },
    sourceHealth:{
      outdoorsNowPlaces:{ok:placeStates.filter(x=>x.ok).length,total:placeStates.length},
      outdoorsNowOpportunityLayer:{ok:standoutState.ok},
      nwsAlerts:{ok:alertStates.filter(x=>x.ok).length,total:alertStates.length},
      fallColor:{ok:fallState.ok,season:fallState.season},
      greatLakesWater:{
        ok:Boolean(specialistStates.water&&specialistStates.water.ok&&specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.ok),
        error:specialistStates.water&&(specialistStates.water.error||(specialistStates.water.marineAlerts&&specialistStates.water.marineAlerts.error))||null
      },
      nightSkyAurora:{ok:Boolean(specialistStates.nightSky&&specialistStates.nightSky.ok),error:specialistStates.nightSky&&specialistStates.nightSky.error||null},
      greatLakesAis:{ok:Boolean(specialistStates.freighterAis&&specialistStates.freighterAis.ok),error:specialistStates.freighterAis&&specialistStates.freighterAis.error||null},
      reusedOpportunitySources:opportunityEngineDiagnostics.sourceStatus
    },
    diagnostics:{
      opportunityEngines:opportunityEngineDiagnostics
    },
    notes:[
      "Hard logic handles NWS hazard suppression, missing required weather, and activity-specific hard stops before JEV sees the pool.",
      "Park/weather, Great Lakes water, night-sky/aurora, fall-color/phenology, sunset-photography, Great Lakes AIS, live birding, Lake Erie beach, USGS river-change, morel, cleaner-air, Michigan ice, and XC snow-screen engines can emit normalized opportunity candidates. Deterministic safety and validity gates run before the mixed pool reaches JEV.",
      "JEV receives every surviving mixed-engine candidate and acts as the board editor: it chooses the lead, the board posture, which additional cards earn space, and their order. The deterministic score is evidence only.",
      "Drive times are broad planning bands from central Detroit, not live traffic estimates.",
      "File photos are selected only from a small licensed allowlist and never used as evidence of current conditions."
    ]
  });
};