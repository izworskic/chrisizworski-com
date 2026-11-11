(function () {
  "use strict";

  var views = {
    overview: {
      label: "All Great Lakes",
      lat: 44.8,
      lng: -84.7,
      zoom: 5,
      description: "The lake-wide view shows AIS-equipped traffic across all five Great Lakes. Zoom in or choose a corridor for a faster read on a known commercial route.",
      watch: "Start here when you do not know which lake a vessel is on. For named passage activity, open BoatNerd's lake-wide map.",
      passage: "https://ais.boatnerd.com/",
      passageLabel: "Open BoatNerd lake-wide map",
      conditions: false
    },
    soo: {
      label: "Soo Locks",
      lat: 46.5036,
      lng: -84.36,
      zoom: 13,
      description: "This view centers on the Soo Locks and the St. Marys River approaches. Downbound vessels arrive from Lake Superior; upbound vessels approach from the lower river.",
      watch: "Best shore view: the Soo Locks Visitor Center observation deck. Use the passage list to see recent named-vessel activity without guessing from the map alone.",
      passage: "https://ais.boatnerd.com/passage/port/soo-locks",
      passageLabel: "Open Soo Locks passage list",
      conditions: true
    },
    mackinac: {
      label: "Straits of Mackinac",
      lat: 45.817,
      lng: -84.74,
      zoom: 11,
      description: "This view covers the Straits of Mackinac, where Lake Michigan and Lake Huron traffic converges beneath and around the bridge corridor.",
      watch: "Best shore views: the Mackinaw City waterfront and Bridge View Park in St. Ignace. Check bridge conditions separately if your trip includes a crossing.",
      passage: "https://ais.boatnerd.com/passage/port/straits-of-mackinac",
      passageLabel: "Open Straits passage list",
      conditions: true
    },
    duluth: {
      label: "Duluth–Superior",
      lat: 46.779,
      lng: -92.087,
      zoom: 12,
      description: "This view centers on Duluth–Superior harbor and the Aerial Lift Bridge approach, a major western Lake Superior cargo gateway.",
      watch: "Best shore view: Canal Park beside the Aerial Lift Bridge. Port timing can change, so use the live map and current passage activity together.",
      passage: "https://ais.boatnerd.com/passage/port/duluth-superior",
      passageLabel: "Open Duluth–Superior passage list",
      conditions: true
    },
    "port-huron": {
      label: "Port Huron",
      lat: 42.987,
      lng: -82.424,
      zoom: 12,
      description: "This view follows the Blue Water Bridge and upper St. Clair River, a narrow corridor used by vessels moving between Lake Huron and the lower lakes.",
      watch: "Best shore view: Vantage Point and the riverwalk south of the Blue Water Bridge. Current and traffic direction are easiest to read here at close range.",
      passage: "https://ais.boatnerd.com/passage/port/port-huron",
      passageLabel: "Open Port Huron passage list",
      conditions: true
    },
    detroit: {
      label: "Detroit River",
      lat: 42.255,
      lng: -83.02,
      zoom: 11,
      description: "This view follows the Detroit River between Lake St. Clair and Lake Erie, including the downtown reach and the Rouge River industrial corridor.",
      watch: "Best broad view: Belle Isle. Riverfront parks provide closer looks, but vessel speed and sight lines vary through the corridor.",
      passage: "https://ais.boatnerd.com/passage/port/detroit",
      passageLabel: "Open Detroit passage list",
      conditions: true
    },
    saginaw: {
      label: "Saginaw Bay",
      lat: 43.657,
      lng: -83.874,
      zoom: 10,
      description: "This view covers the lower Saginaw River and Inner Saginaw Bay, where freighters serving Bay City and Saginaw move between the dredged channel and Lake Huron.",
      watch: "Best shore views: Bay City's riverfront parks and bridge approaches. Traffic is less continuous than at the Soo or St. Clair River, so the passage list matters.",
      passage: "https://ais.boatnerd.com/passage/port/saginaw-river",
      passageLabel: "Open Saginaw River passage list",
      conditions: true
    }
  };

  var mapFrame = document.getElementById("freighterMap");
  if (!mapFrame) return;

  var statusText = document.getElementById("mapStatusText");
  var statusDot = document.getElementById("mapStatusDot");
  var refreshButton = document.getElementById("mapRefresh");
  var corridorLabel = document.getElementById("corridorLabel");
  var corridorTitle = document.getElementById("corridorTitle");
  var corridorCopy = document.getElementById("corridorCopy");
  var watchNote = document.getElementById("watchNote");
  var passageLink = document.getElementById("passageLink");
  var stationTitle = document.getElementById("stationTitle");
  var stationSource = document.getElementById("stationSource");
  var windValue = document.getElementById("windValue");
  var waveValue = document.getElementById("waveValue");
  var waterValue = document.getElementById("waterValue");
  var conditionTime = document.getElementById("conditionTime");
  var activeView = "overview";
  var stationsPromise = null;

  var map = typeof L !== "undefined" ? L.map(mapFrame, {scrollWheelZoom:false}).setView([44.8,-84.7],5) : null;
  var layer = map ? L.layerGroup().addTo(map) : null;
  if (map) L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
  else {mapFrame.textContent = "Map unavailable; recent vessel reports are listed below.";mapFrame.parentElement.classList.add("map-stage-unavailable");}
  var reports = null, busy = false, lastFailed = false;
  var initialReports = document.getElementById("freighter-initial-reports");
  if(initialReports){
    try {
      var seed=JSON.parse(initialReports.textContent);
      if(seed.ok && Array.isArray(seed.vessels) && Array.isArray(seed.attribution))reports=seed;
    } catch (_) { /* Normal browser fetch remains available. */ }
  }
  var vesselSearch = document.getElementById("freighterNameSearch");
  var vesselSearchStatus = document.getElementById("freighterSearchStatus");
  var searchAllButton = document.getElementById("freighterSearchAll");
  var clearSearchButton = document.getElementById("freighterClearSearch");
  var vesselList = document.getElementById("freighterVessels");
  var sourceCredits = document.getElementById("freighterCredits");
  var activityGrid=document.getElementById("activity-grid"), activityChecked=document.getElementById("activity-checked");
  var inspector=document.getElementById("ship-inspector"), inspectorTitle=document.getElementById("ship-inspector-title");
  var inspectorStatus=document.getElementById("ship-inspector-status"), inspectorFacts=document.getElementById("ship-inspector-facts");
  var inspectorClose=document.getElementById("ship-inspector-close"), selectedMmsi=null, selectedName=null;
  var storyBox=document.getElementById("ship-story"), storyPromise=null;
  var corridorKeys=["soo","mackinac","duluth","port-huron","detroit","saginaw"];
  function recent(v,now){ var seen=Date.parse(v.seen); return Number.isFinite(seen) && now-seen>=-60000 && now-seen<=1800000; }
  function corridorRadius(key){return key==="saginaw"?60:35;}
  function inCorridor(v,key){var view=views[key];return distanceMiles(view.lat,view.lng,v.lat,v.lon)<=corridorRadius(key);}
  function updateActivity(now){
    if(!activityGrid)return;
    var fresh=reports.vessels.filter(function(v){return recent(v,now);});
    corridorKeys.forEach(function(key){
      var n=fresh.filter(function(v){return inCorridor(v,key);}).length;
      var button=activityGrid.querySelector('[data-activity-key="'+key+'"]');
      if(!button){button=node("button","");button.type="button";button.className="activity-button";button.dataset.activityKey=key;
        button.addEventListener("click",function(){selectView(key,{updateHash:true,track:true});document.getElementById("live-map").scrollIntoView({block:"start",behavior:"smooth"});});activityGrid.append(button);}
      button.replaceChildren();
      button.setAttribute("aria-pressed",key===activeView?"true":"false");
      button.setAttribute("aria-label",views[key].label+": "+n+" recent vessel reports within about "+corridorRadius(key)+" miles. Show corridor.");
      button.append(node("strong",views[key].label),node("span",n+" recent "+(n===1?"report":"reports")),node("small","within ~"+corridorRadius(key)+" miles"));
    });
    activityChecked.textContent=(lastFailed?"Refresh failed; showing retained reports. ":"")+"Feed checked "+new Date(reports.checkedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Detroit",timeZoneName:"short"})+" · reports at most 30 min old";
  }
  function normalizedShipName(value){return String(value||"").toUpperCase().replace(/[^A-Z0-9]/g,"");}
  function storyFor(catalog,v,now){
    if(!catalog||catalog.schemaVersion!==1||!Array.isArray(catalog.stories))return null;
    var checked=Date.parse(catalog.checkedOn+"T00:00:00Z"), age=now-checked;
    if(!Number.isFinite(checked)||age<0||age>180*86400000)return null;
    var matches=catalog.stories.filter(function(x){return x.mmsi===String(v.mmsi) && normalizedShipName(x.aisName)===normalizedShipName(v.name);});
    return matches.length===1?matches[0]:null;
  }
  function renderStory(v){
    if(!storyBox)return;
    var id=String(v.mmsi), storyKey=id+":"+normalizedShipName(v.name);
    if(!storyBox.hidden && storyBox.dataset.storyKey===storyKey)return;
    storyBox.hidden=true;storyBox.replaceChildren();
    if(!storyPromise)storyPromise=fetch("/assets/freighter-card-stories.json").then(function(r){if(!r.ok)throw Error("stories unavailable");return r.json();}).catch(function(){return null;});
    storyPromise.then(function(catalog){
      if(selectedMmsi!==id||selectedName!==normalizedShipName(v.name)||inspector.hidden)return;
      var story=storyFor(catalog,v,Date.now());if(!story)return;
      var picture=document.createElement("img");picture.src=story.image;picture.alt=story.imageAlt;picture.loading="lazy";picture.addEventListener("error",function(){picture.hidden=true;});
      var figure=document.createElement("figure"), caption=document.createElement("figcaption"), credit=node("a",story.photoCredit);
      credit.href=story.photoSource;credit.target="_blank";credit.rel="noopener";caption.append(credit);
      if(story.licenseUrl){var license=node("a","License");license.href=story.licenseUrl;license.target="_blank";license.rel="noopener";caption.append(document.createTextNode(" · "),license);}
      caption.append(document.createTextNode(" · Historical photograph, not live"));figure.append(picture,caption);
      var content=document.createElement("div"), eyebrow=node("p","SHIP STORY"), heading=node("h4",story.headline), text=node("p",story.history), link=node("a","Read this ship’s full story →"), source=node("a","History source");
      eyebrow.className="activity-kicker";link.href=story.storyUrl;link.className="ship-story-link";source.href=story.historySource;source.target="_blank";source.rel="noopener";
      var note=node("p","Identity cross-check reviewed "+catalog.checkedOn+" · AIS details can change.");note.className="ship-story-note";content.append(eyebrow,heading,text,link,document.createTextNode(" · "),source,note);storyBox.replaceChildren(figure,content);storyBox.dataset.storyKey=storyKey;storyBox.hidden=false;
    });
  }
  function showShip(v,now){
    if(!inspector)return;
    selectedMmsi=String(v.mmsi);selectedName=normalizedShipName(v.name);inspector.hidden=false;inspectorTitle.textContent=v.name||("Vessel "+v.mmsi);
    renderStory(v);
    inspectorStatus.textContent="Last reported "+Math.max(0,Math.round((now-Date.parse(v.seen))/60000))+" min ago · "+v.source+" · MMSI "+v.mmsi;
    inspectorFacts.replaceChildren();
    var fields=[["Speed",v.speedKnots===null?"Not reported":(v.speedKnots*1.15078).toFixed(1)+" mph ("+v.speedKnots.toFixed(1)+" kn)"],
      ["Course",v.course===null?"Not reported":Math.round(v.course)+"°"],
      ["AIS destination",v.destination||"Not reported"],
      ["Reported length",v.lengthMeters===null?"Not reported":Math.round(v.lengthMeters*3.28084)+" ft"]];
    fields.forEach(function(field){var div=document.createElement("div");div.append(node("dt",field[0]),node("dd",field[1]));inspectorFacts.append(div);});
  }
  function clearShip(){selectedMmsi=null;selectedName=null;if(inspector)inspector.hidden=true;if(storyBox){storyBox.hidden=true;storyBox.replaceChildren();delete storyBox.dataset.storyKey;}}
  if(inspectorClose)inspectorClose.addEventListener("click",function(){clearShip();vesselSearch.focus();});
  function node(tag, value) {var el=document.createElement(tag);el.textContent=value;return el;}
  // AIS type codes describe broad vessel categories, not an exact hull or identity.
  function vesselShape(v) {
    var t=typeof v.shipType==="number"?v.shipType:0;
    if(t>=70&&t<80)return {kind:"cargo",label:"Cargo vessel"};
    if(t>=80&&t<90)return {kind:"tanker",label:"Tanker"};
    if(t>=60&&t<70)return {kind:"passenger",label:"Passenger vessel"};
    if(t===31||t===32||t===52)return {kind:"tug",label:"Tug or towing vessel"};
    if(t===30)return {kind:"fishing",label:"Fishing vessel"};
    return {kind:"other",label:"Vessel type not shown"};
  }
  function shipIcon(v) {
    var shape=vesselShape(v), length=typeof v.lengthMeters==="number"?v.lengthMeters:null;
    var size=length>0?(length>=200?"large":length>=80?"medium":"small"):"unknown";
    var width=size==="large"?60:size==="medium"?50:size==="small"?40:44, height=32;
    var state=v.speedKnots===null?"unknown":v.speedKnots>0.5?"moving":"stopped";
    var details={
      cargo:'<path class="ship-house" d="M8 19 V9 H20 V19 Z"/><rect class="ship-stack" x="12" y="5" width="4" height="4"/><path class="ship-detail" d="M25 16h8m4 0h8m4 0h7"/>',
      tanker:'<path class="ship-house" d="M8 19 V9 H20 V19 Z"/><rect class="ship-stack" x="12" y="5" width="4" height="4"/><path class="ship-detail" d="M23 16h34 M28 13v6m13-6v6m13-6v6"/>',
      passenger:'<path class="ship-house" d="M10 19 V10 H53 L60 19 Z"/><path class="ship-detail dark" d="M15 13h4m4 0h4m4 0h4m4 0h4m4 0h4"/><rect class="ship-stack" x="24" y="6" width="5" height="4"/>',
      tug:'<path class="ship-house" d="M18 19 V9 H39 L44 19 Z"/><rect class="ship-stack" x="27" y="5" width="4" height="4"/><path class="ship-detail dark" d="M22 12h6m4 0h6"/>',
      fishing:'<path class="ship-house" d="M12 19 V11 H27 V19 Z"/><path class="ship-detail" d="M40 19V7m0 1 13 9M37 8h8"/>',
      other:'<path class="ship-house" d="M12 19 V11 H29 V19 Z"/><path class="ship-detail dark" d="M16 14h5m3 0h3"/>'
    };
    var html='<svg viewBox="0 0 72 32" aria-hidden="true" focusable="false"><path class="ship-hull" d="M3 19 H62 L69 15 L66 21 L58 25 H11 Z"/>'+details[shape.kind]+'</svg>';
    return L.divIcon({className:"tracker-ship-marker is-"+state+" type-"+shape.kind+" size-"+size,html:html,iconSize:[width,height],iconAnchor:[width/2,height/2],popupAnchor:[0,-height/2]});
  }
  function vesselMatchesSearch(vessel,rawQuery) {
    var raw=String(rawQuery||"").trim();
    if(!raw)return true;
    if(/^\d+$/.test(raw) && String(vessel.mmsi==null?"":vessel.mmsi).includes(raw))return true;
    function words(value){
      return String(value||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);
    }
    var terms=words(raw), name=words(vessel.name);
    if(!terms.length || !name.length)return false;
    return terms.every(function(term){return name.some(function(part){return part.startsWith(term);});});
  }
  function renderVessels() {
    if (!reports) return;
    var initialCheck=document.getElementById("freighterInitialCheck");
    if(initialCheck)initialCheck.hidden=true;
    var view=views[activeView], now=Date.now();
    var current=reports.vessels.filter(function(v){return recent(v,now) && (activeView === "overview" || inCorridor(v,activeView));});
    updateActivity(now);
    var query=vesselSearch.value.trim();
    var vessels=current.filter(function(v){return vesselMatchesSearch(v,query);});
    if(query){
      vesselSearchStatus.textContent=vessels.length+" of "+current.length+" recent "+view.label+" AIS reports match “"+query+"”. Search only includes reports received within 30 minutes.";
    }else{
      vesselSearchStatus.textContent=current.length+" recent AIS reports available in "+view.label+". Enter a ship name or MMSI to narrow the map.";
    }
    var selected=vessels.find(function(v){return String(v.mmsi)===selectedMmsi;});
    if(selected)showShip(selected,now);else clearShip();
    vesselList.replaceChildren(); if(layer) layer.clearLayers();
    vessels.forEach(function(v){
      var name=v.name || "Vessel " + v.mmsi;
      var detail=(v.speedKnots===null?"Speed unavailable":(v.speedKnots*1.15078).toFixed(1)+" mph ("+v.speedKnots.toFixed(1)+" kn)")+" · reported "+Math.max(0,Math.round((Date.now()-Date.parse(v.seen))/60000))+" min ago · "+v.source;
      var item=document.createElement("li"), popup=document.createElement("div");
      popup.append(node("strong",name),node("p",detail),node("p","MMSI "+v.mmsi));
      popup.append(node("p",vesselShape(v).label+(v.lengthMeters===null?" · length not reported":" · reported length "+Math.round(v.lengthMeters*3.28084)+" ft")));
      if(v.course!==null) popup.append(node("p","Course "+Math.round(v.course)+"°"));
      if(map){
        var marker=L.marker([v.lat,v.lon],{icon:shipIcon(v),title:name,alt:name,keyboard:true}).addTo(layer).bindTooltip(node("span",name)).bindPopup(popup);
        marker.on("click",function(){showShip(v,Date.now());if(inspector)inspector.scrollIntoView({block:"nearest",behavior:"smooth"});});
        var markerElement=marker.getElement();
        if(markerElement)markerElement.addEventListener("keydown",function(event){if(event.key==="Enter"||event.key===" "){event.preventDefault();showShip(v,Date.now());marker.openPopup();}});
        var button=node("button",name);button.type="button";button.addEventListener("click",function(){showShip(v,Date.now());map.setView([v.lat,v.lon],13);marker.openPopup();if(inspector)inspector.scrollIntoView({block:"nearest",behavior:"smooth"});else mapFrame.scrollIntoView({block:"center",behavior:"smooth"});});item.append(button);
      }else {var fallback=node("button",name);fallback.type="button";fallback.addEventListener("click",function(){showShip(v,Date.now());});item.append(fallback);}
      item.append(node("span",detail));vesselList.append(item);
    });
    if(!vessels.length) vesselList.append(node("li",query
      ? "No matching recent AIS reports in "+view.label+". Try All Great Lakes, a different name, or the passage source below. A missing report is not evidence the ship is absent."
      : "No recent reports returned for this view. This does not mean there are no ships; check the passage source below."));
    setStatus((lastFailed?"Refresh unavailable; retained ":"")+vessels.length+" recent reports · "+view.label+" · checked "+new Date(reports.checkedAt).toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",timeZone:"America/Detroit",timeZoneName:"short"})+(map?"":" · map unavailable"),lastFailed?"slow":vessels.length?"loaded":"");
    sourceCredits.textContent="Source credits: "+reports.attribution.map(function(a){return a.credit;}).join(" · ");
  }
  async function loadVessels() {
    if(busy)return;busy=true;refreshButton.disabled=true;
    try{
      var r=await fetch("/api/freighter-ais",{signal:AbortSignal.timeout(12000)}), data=await r.json();
      if(!r.ok||!data.ok||!Array.isArray(data.vessels))throw new Error("AIS unavailable");
      reports=data;lastFailed=false;renderVessels();
    }catch(_){lastFailed=true;if(reports)renderVessels();else{if(activityChecked)activityChecked.textContent="AIS unavailable; no corridor counts can be shown.";setStatus("Vessel reports unavailable. Try refresh or the passage links below.","slow");vesselList.replaceChildren(node("li","The feed did not return usable data. This is not a zero-traffic report."));vesselSearchStatus.textContent="Search unavailable: no current AIS reports loaded. Try refresh or the external passage sources."; }}
    finally{busy=false;refreshButton.disabled=false;}
  }

  function cleanHash(value) {
    return String(value || "").replace(/^#/, "").toLowerCase();
  }

  function selectedFromHash() {
    var requested = cleanHash(window.location.hash);
    return Object.prototype.hasOwnProperty.call(views, requested) ? requested : "overview";
  }

  function setStatus(message, state) {
    statusText.textContent = message;
    statusDot.className = "map-state-dot" + (state ? " " + state : "");
  }

  function markButtons(key) {
    document.querySelectorAll("[data-freighter-view]").forEach(function (button) {
      var selected = button.getAttribute("data-freighter-view") === key;
      if (button.classList.contains("view-tab")) {
        button.setAttribute("aria-selected", selected ? "true" : "false");
        button.setAttribute("tabindex", selected ? "0" : "-1");
      }
    });
  }

  function trackView(key) {
    if (typeof window.va !== "function") return;
    window.va("event", {
      name: "Freighter Map View",
      data: { corridor: key }
    });
  }

  function toRad(value) {
    return value * Math.PI / 180;
  }

  function distanceMiles(lat1, lng1, lat2, lng2) {
    var radius = 3958.8;
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function finite(value) {
    if (value === null || value === undefined || value === "" || typeof value === "boolean") return null;
    var number = Number(value);
    return Number.isFinite(number) ? number : null;
  }

  function knots(value) {
    var number = finite(value);
    return number === null ? "—" : Math.round(number * 1.94384) + " kt";
  }

  function feet(value) {
    var number = finite(value);
    return number === null ? "—" : (number * 3.28084).toFixed(1) + " ft";
  }

  function fahrenheit(value) {
    var number = finite(value);
    return number === null ? "—" : Math.round(number * 9 / 5 + 32) + "°F";
  }

  function resetConditions(message) {
    stationTitle.textContent = "Choose a corridor";
    stationSource.textContent = message || "Nearby NOAA observations appear after you choose a corridor.";
    windValue.textContent = "—";
    waveValue.textContent = "—";
    waterValue.textContent = "—";
    conditionTime.textContent = "AIS positions and NOAA station reports update on different schedules.";
  }

  function loadStations() {
    if (!stationsPromise) {
      stationsPromise = fetch("/api/buoys", { headers: { Accept: "application/json" } })
        .then(function (response) {
          if (!response.ok) throw new Error("NOAA endpoint returned " + response.status);
          return response.json();
        })
        .then(function (payload) {
          return Array.isArray(payload.stations) ? payload.stations : [];
        });
    }
    return stationsPromise.catch(function (error) {
      // A temporary NOAA failure must not poison all later corridor selections.
      stationsPromise = null;
      throw error;
    });
  }

  function renderNearestCondition(key) {
    var view = views[key];
    if (!view.conditions) {
      resetConditions();
      return;
    }

    stationTitle.textContent = "Loading nearby NOAA station…";
    stationSource.textContent = "Finding the nearest station with a current wind, wave, or water reading.";
    windValue.textContent = "…";
    waveValue.textContent = "…";
    waterValue.textContent = "…";
    conditionTime.textContent = "";

    loadStations().then(function (stations) {
      if (activeView !== key) return;
      var candidates = stations
        .filter(function (station) {
          return finite(station.lat) !== null && finite(station.lng) !== null &&
            [station.wind_spd, station.wave_ht, station.water_t].some(function (value) { return finite(value) !== null; });
        })
        .map(function (station) {
          return {
            station: station,
            distance: distanceMiles(view.lat, view.lng, finite(station.lat), finite(station.lng))
          };
        })
        .sort(function (a, b) { return a.distance - b.distance; });

      if (!candidates.length) throw new Error("No nearby station observation");
      var nearest = candidates[0];
      var station = nearest.station;
      var observed = station.obs_time ? new Date(station.obs_time) : null;
      var ageHours = observed && !Number.isNaN(observed.getTime()) ? (Date.now() - observed.getTime()) / 3600000 : null;
      var freshness = ageHours !== null && ageHours <= 6 ? "Latest nearby NOAA observation" : "Latest available NOAA observation";

      stationTitle.textContent = station.name || ("Station " + station.id);
      stationSource.textContent = freshness + " · about " + Math.round(nearest.distance) + " miles from the map center";
      windValue.textContent = knots(station.wind_spd);
      waveValue.textContent = feet(station.wave_ht);
      waterValue.textContent = fahrenheit(station.water_t);
      conditionTime.textContent = observed && !Number.isNaN(observed.getTime())
        ? "Reported " + observed.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" }) + ". This is nearby lake context, not a condition report for a vessel."
        : "Observation time unavailable. Use the NOAA dashboard before making a weather-sensitive decision.";
    }).catch(function () {
      if (activeView !== key) return;
      resetConditions("The nearby NOAA observation could not be loaded. The full buoy dashboard remains available.");
    });
  }

  function selectView(key, options) {
    var view = views[key] || views.overview;
    var settings = options || {};
    activeView = key;
    markButtons(key);
    corridorLabel.textContent = "Current map: " + view.label;
    corridorTitle.textContent = view.label;
    corridorCopy.textContent = view.description;
    watchNote.textContent = view.watch;
    passageLink.href = view.passage;
    passageLink.textContent = view.passageLabel + " ↗";
    if(map) map.setView([view.lat,view.lng],view.zoom);
    if(reports) renderVessels(); else loadVessels();
    renderNearestCondition(key);

    if (settings.updateHash !== false) {
      var nextHash = key === "overview" ? window.location.pathname : window.location.pathname + "#" + key;
      window.history.replaceState(null, "", nextHash);
    }
    if (settings.track !== false) trackView(key);
  }

  vesselSearch.addEventListener("input", function () {if(reports)renderVessels();});
  clearSearchButton.addEventListener("click",function(){vesselSearch.value="";if(reports)renderVessels();vesselSearch.focus();});
  searchAllButton.addEventListener("click",function(){selectView("overview",{updateHash:true,track:true});});
  refreshButton.addEventListener("click", function () {loadVessels(); stationsPromise=null;renderNearestCondition(activeView);});
  setInterval(function(){if(!document.hidden)loadVessels();},60000);

  document.querySelectorAll("[data-freighter-view]").forEach(function (button) {
    button.addEventListener("click", function () {
      var key = button.getAttribute("data-freighter-view");
      if (!views[key]) return;
      selectView(key, { updateHash: true, track: true });
      if (button.classList.contains("corridor-jump")) {
        document.getElementById("live-map").scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  });

  document.querySelectorAll(".view-tab").forEach(function (tab) {
    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var tabs = Array.prototype.slice.call(document.querySelectorAll(".view-tab"));
      var index = tabs.indexOf(tab);
      var next = event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
      tabs[next].focus();
      tabs[next].click();
    });
  });

  window.addEventListener("hashchange", function () {
    var key = selectedFromHash();
    if (key !== activeView) selectView(key, { updateHash: false, track: false });
  });

  selectView(selectedFromHash(), { updateHash: false, track: false });
  // Seeded reports work immediately, including when the next refresh fails.
  loadVessels();
  function expireReports(){
    if(!reports || document.hidden)return;
    var now=Date.now(), fresh=reports.vessels.filter(function(v){return recent(v,now);});
    if(fresh.length!==reports.vessels.length){reports.vessels=fresh;renderVessels();}
  }
  setInterval(expireReports,15000);
  document.addEventListener("visibilitychange",expireReports);
})();
