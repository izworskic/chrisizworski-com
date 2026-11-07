// Interpretive trip guidance: FL511 is operational authority; weather is never a closure trigger.
// Corridor is a geographic planning example, not an FDOT-designated detour.
const SkywayCompanion = (function companionFactory() {
  "use strict";
  const DIRECTIONS = {
    northbound: {
      label: "Northbound · Bradenton to St. Petersburg",
      origin: "Bradenton, Florida", destination: "St. Petersburg, Florida",
      steps: ["I-75 north on the east side of Tampa Bay", "I-4 west toward Tampa", "I-275 west via the Howard Frankland Bridge", "Continue into St. Petersburg"],
      waypoints: ["I-4 and I-75 Interchange, Florida", "Howard Frankland Bridge, Florida"]
    },
    southbound: {
      label: "Southbound · St. Petersburg to Bradenton",
      origin: "St. Petersburg, Florida", destination: "Bradenton, Florida",
      steps: ["I-275 east via the Howard Frankland Bridge", "I-4 east toward the I-75 interchange", "I-75 south toward Bradenton", "Continue toward your actual destination"],
      waypoints: ["Howard Frankland Bridge, Florida", "I-4 and I-75 Interchange, Florida"]
    }
  };
  const VEHICLES = {car:"Car / SUV / pickup",motorcycle:"Motorcycle",rv:"RV / motorhome",trailer:"Trailer / towing",high_profile:"High-profile vehicle"};
  function routeFor(direction) {
    const selected = DIRECTIONS[direction] || DIRECTIONS.northbound;
    const params = new URLSearchParams({api:"1",origin:selected.origin,destination:selected.destination,travelmode:"driving",waypoints:selected.waypoints.join("|")});
    return {...selected,url:`https://www.google.com/maps/dir/?${params.toString()}`};
  }
  function decision(snapshot) {
    const status=snapshot?.officialStatus?.state || "UNKNOWN", vehicle=snapshot?.vehicle?.state || "UNKNOWN",
      wind=snapshot?.windContext?.level || "UNAVAILABLE",flow=snapshot?.traffic?.flow?.selected?.state || "UNAVAILABLE";
    if(status==="CLOSED") return {tone:"closed",title:"Official closure reported. Do not attempt this crossing.",detail:"FL511 reports a Sunshine Skyway closure. Follow road signs and law enforcement. Before choosing another route, check live conditions on the entire alternate corridor."};
    if(status==="UNKNOWN") return {tone:"unknown",title:"Current bridge status could not be verified.",detail:"Live operational evidence is missing, partial or stale. Do not assume the bridge is open; confirm the crossing directly with FL511 before departing."};
    if(status==="IMPACTED") return {tone:"impacted",title:"The bridge has a reported traffic impact.",detail:"FL511 reports a Skyway-specific issue, but not an explicit full closure. Check the current event and directional road picture before committing to the crossing."};
    if(status!=="NO_CLOSURE_SIGNAL_FOUND") return {tone:"unknown",title:"Current crossing status is unclear.",detail:"The available official evidence does not establish a reliable status. Verify directly with FL511."};
    if(vehicle==="CAUTION"||wind==="HIGH_WIND_CLOSURE_RISK_CONTEXT") return {tone:"caution",title:"No closure signal found. Wind deserves extra attention.",detail:"The official feeds checked do not report a Skyway closure. Forecast wind can be significant for motorcycles, trailers, RVs and high-profile vehicles, but it is not itself a closure or vehicle restriction."};
    if(snapshot?.sourceHealth?.trafficSpeeds?.state==="ok" && (flow==="STOP_AND_GO"||flow==="HEAVY_SLOWING")) return {tone:"impacted",title:"No closure signal found, but traffic is slow.",detail:"The live FL511 Traffic Speeds layer suggests significant slowing in your selected direction. It does not provide a verified travel-time estimate."};
    return {tone:"informational",title:"No official Skyway closure signal found.",detail:"The official FL511 sources checked did not return a bridge closure. This is not an affirmative open or safe-to-cross certification. Conditions can change quickly."};
  }
  function outlook(snapshot,now=Date.now()) {
    const periods=Array.isArray(snapshot?.windContext?.periods)?snapshot.windContext.periods:[];
    return periods.filter(period=>{
      if(!period||!period.windSpeed)return false;
      if(!period.startTime)return true;
      const when=Date.parse(period.startTime);
      return Number.isFinite(when)&&when>=now-30*60_000&&when<=now+12*60*60_000;
    }).slice(0,4).map(period=>{
      const when=period.startTime?Date.parse(period.startTime):NaN;
      return {label:Number.isFinite(when)?new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"numeric",timeZoneName:"short"}).format(when):(period.name||"NWS forecast period"),wind:period.windSpeed,direction:period.windDirection||"",source:snapshot?.windContext?.sourceLabel||"National Weather Service"};
    });
  }
  function shareHref(direction,vehicle) {
    const d=DIRECTIONS[direction]?direction:"northbound",v=VEHICLES[vehicle]?vehicle:"car";
    return `/sunshine-skyway-bridge/?${new URLSearchParams({direction:d,vehicle:v}).toString()}`;
  }
  return {decision,routeFor,outlook,shareHref,DIRECTIONS,VEHICLES};
})();
if(typeof window!=="undefined")window.SkywayCompanion=SkywayCompanion;
if(typeof module!=="undefined"&&module.exports)module.exports=SkywayCompanion;
