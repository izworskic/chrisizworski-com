(function(){
"use strict";

var RIVERS = [
  {
    id: "au-sable-holy-water",
    num: 1,
    name: "Au Sable River — The Holy Water",
    river: "Au Sable River",
    segment: "Burton's Landing to Wakeley Bridge",
    region: "ausable-huron",
    type: "fly-water",
    lat: 44.6644,
    lng: -84.6062,
    miles: "9.0 mi",
    hours: "3.5–4.5 hrs",
    gauge: "04135700",
    gaugeName: "Grayling, MI",
    medianCfs: 190,
    lowCfs: 140,
    highCfs: 290,
    putIn: "Burton's Landing (Grayling)",
    takeOut: "Wakeley Bridge",
    permit: "State Forest Landing / Flies-Only No-Kill Regs"
  },
  {
    id: "au-sable-mason-tract",
    num: 2,
    name: "Au Sable River — South Branch Mason Tract",
    river: "South Branch Au Sable",
    segment: "Chase Bridge to Smith Bridge",
    region: "ausable-huron",
    type: "fly-water",
    lat: 44.5208,
    lng: -84.5361,
    miles: "11.5 mi",
    hours: "4.5–5.0 hrs",
    gauge: "04136500",
    gaugeName: "near Luzerne, MI",
    medianCfs: 210,
    lowCfs: 150,
    highCfs: 340,
    putIn: "Chase Bridge (Roscommon)",
    takeOut: "Smith Bridge (M-72)",
    permit: "Mason Tract Wilderness Sanctuary · No Permanent Camps"
  },
  {
    id: "au-sable-lower-river",
    num: 3,
    name: "Au Sable River — Lower River Trophy Run",
    river: "Lower Au Sable River",
    segment: "Foote Dam to Whirlpool Access",
    region: "ausable-huron",
    type: "beginner-family",
    lat: 44.4372,
    lng: -83.4542,
    miles: "12.0 mi",
    hours: "4.5–5.5 hrs",
    gauge: "04137500",
    gaugeName: "near Au Sable, MI",
    medianCfs: 1350,
    lowCfs: 900,
    highCfs: 2100,
    putIn: "Foote Dam Tailwater",
    takeOut: "Whirlpool Access (Oscoda)",
    permit: "USFS Huron-Manistee / Public DNR Launches"
  },
  {
    id: "manistee-upper-deward",
    num: 4,
    name: "Upper Manistee River — Deward Tract to M-72",
    river: "Upper Manistee River",
    segment: "Deward Access to Manistee River Bridge",
    region: "manistee-west",
    type: "fly-water",
    lat: 44.8373,
    lng: -84.8324,
    miles: "13.5 mi",
    hours: "5.0–6.0 hrs",
    gauge: "04123500",
    gaugeName: "near Grayling, MI",
    medianCfs: 180,
    lowCfs: 130,
    highCfs: 260,
    putIn: "Deward Historic Access",
    takeOut: "Manistee River Bridge (M-72)",
    permit: "State Forest Landing / Artificials Only Upper Reach"
  },
  {
    id: "manistee-middle-ccc-sharon",
    num: 5,
    name: "Middle Manistee River — CCC Bridge to Sharon",
    river: "Middle Manistee River",
    segment: "CCC Bridge to Sharon Road Access",
    region: "manistee-west",
    type: "beginner-family",
    lat: 44.6146,
    lng: -84.9912,
    miles: "10.0 mi",
    hours: "3.5–4.0 hrs",
    gauge: "04124000",
    gaugeName: "at Sherman, MI",
    medianCfs: 820,
    lowCfs: 600,
    highCfs: 1300,
    putIn: "CCC Bridge State Forest",
    takeOut: "Sharon Road Landing",
    permit: "Public DNR / State Forest Access"
  },
  {
    id: "manistee-lower-tippy-bear-creek",
    num: 6,
    name: "Lower Manistee River — High Bridge to Bear Creek",
    river: "Lower Manistee River",
    segment: "High Bridge to Bear Creek / Rainbow Bend",
    region: "manistee-west",
    type: "overnight-camp",
    lat: 44.2750,
    lng: -86.0125,
    miles: "13.0 mi",
    hours: "5.0–6.0 hrs",
    gauge: "04125550",
    gaugeName: "near Wellston, MI",
    medianCfs: 1850,
    lowCfs: 1300,
    highCfs: 2800,
    putIn: "High Bridge Access",
    takeOut: "Bear Creek / Rainbow Bend",
    permit: "USFS Dispersed Camping Rules / High Bank Camps"
  },
  {
    id: "pine-river-elm-flats",
    num: 7,
    name: "Pine River — Elm Flats to Low Bridge",
    river: "Pine River",
    segment: "Elm Flats to Low Bridge Access",
    region: "manistee-west",
    type: "fly-water",
    lat: 44.2239,
    lng: -85.7486,
    miles: "8.5 mi",
    hours: "3.0–3.5 hrs",
    gauge: "04125000",
    gaugeName: "near Hoxeyville, MI",
    medianCfs: 275,
    lowCfs: 190,
    highCfs: 450,
    putIn: "Elm Flats Launch",
    takeOut: "Low Bridge Access",
    permit: "MANDATORY USFS Daily Permit (Memorial Day–Labor Day)"
  },
  {
    id: "pere-marquette-holy-water",
    num: 8,
    name: "Pere Marquette River — Green Cottage to Upper Branch",
    river: "Pere Marquette River",
    segment: "Green Cottage to Upper Branch Bridge",
    region: "manistee-west",
    type: "fly-water",
    lat: 43.9011,
    lng: -85.8972,
    miles: "10.0 mi",
    hours: "4.0 hrs",
    gauge: "04122500",
    gaugeName: "at Scottville, MI",
    medianCfs: 620,
    lowCfs: 450,
    highCfs: 950,
    putIn: "Green Cottage (Baldwin)",
    takeOut: "Upper Branch Bridge",
    permit: "MANDATORY USFS Watercraft Permit (M-37 to Gleason's)"
  },
  {
    id: "pere-marquette-gleasons-walhalla",
    num: 9,
    name: "Pere Marquette River — Gleason's to Walhalla",
    river: "Pere Marquette River",
    segment: "Gleason's Landing to Walhalla Bridge",
    region: "manistee-west",
    type: "overnight-camp",
    lat: 43.8967,
    lng: -85.9683,
    miles: "14.0 mi",
    hours: "5.5 hrs",
    gauge: "04122500",
    gaugeName: "at Scottville, MI",
    medianCfs: 620,
    lowCfs: 450,
    highCfs: 950,
    putIn: "Gleason's Landing",
    takeOut: "Walhalla Bridge (US-10)",
    permit: "USFS Primitive Paddle-In Camps / Free Flow Below Gleason's"
  },
  {
    id: "jordan-river-graves-crossing",
    num: 10,
    name: "Jordan River — Graves Crossing to Rogers Road",
    river: "Jordan River",
    segment: "Graves Crossing to Rogers Road Access",
    region: "manistee-west",
    type: "beginner-family",
    lat: 45.0683,
    lng: -85.0847,
    miles: "8.0 mi",
    hours: "3.5 hrs",
    gauge: "04127800",
    gaugeName: "near East Jordan, MI",
    medianCfs: 200,
    lowCfs: 150,
    highCfs: 300,
    putIn: "Graves Crossing State Forest",
    takeOut: "Rogers Road / Webster Bridge",
    permit: "Michigan Natural River Guidelines / No Motors"
  },
  {
    id: "pigeon-river-elk-country",
    num: 11,
    name: "Pigeon River — Sturgeon Divide to Webb Road",
    river: "Pigeon River",
    segment: "Sturgeon Divide to Webb Road Bridge",
    region: "ausable-huron",
    type: "fly-water",
    lat: 45.1436,
    lng: -84.4981,
    miles: "7.0 mi",
    hours: "3.0 hrs",
    gauge: "04128900",
    gaugeName: "near Vanderbilt, MI",
    medianCfs: 85,
    lowCfs: 55,
    highCfs: 150,
    putIn: "Sturgeon Divide Access",
    takeOut: "Webb Road Bridge",
    permit: "Pigeon River Country State Forest / Wild Elk Range"
  },
  {
    id: "two-hearted-river-mouth",
    num: 12,
    name: "Two Hearted River — High Bridge to Lake Superior",
    river: "Two Hearted River",
    segment: "High Bridge Road to Lake Superior Rivermouth",
    region: "up-wild",
    type: "overnight-camp",
    lat: 46.6578,
    lng: -85.3444,
    miles: "13.0 mi",
    hours: "5.5 hrs",
    gauge: "04044700",
    gaugeName: "near Newberry, MI",
    medianCfs: 130,
    lowCfs: 90,
    highCfs: 250,
    putIn: "High Bridge County Rd 407",
    takeOut: "Two Hearted Mouth State Forest Camp",
    permit: "State Forest Dispersed Camping / Superior Beach Finish"
  },
  {
    id: "fox-river-seney",
    num: 13,
    name: "Fox River — Seney to Fox River Campground",
    river: "Fox River & East Branch",
    segment: "M-28 Seney Launch to Fox River SFC",
    region: "up-wild",
    type: "fly-water",
    lat: 46.3486,
    lng: -85.9458,
    miles: "9.0 mi",
    hours: "4.0 hrs",
    gauge: "04059000",
    gaugeName: "near Seney, MI",
    medianCfs: 160,
    lowCfs: 110,
    highCfs: 290,
    putIn: "Seney Roadside Launch (M-28)",
    takeOut: "Fox River State Forest Camp",
    permit: "Hemingway Historic Water / State Forest Landings"
  },
  {
    id: "platte-river-sleeping-bear",
    num: 14,
    name: "Platte River — Platte Lake Weir to Lake Michigan",
    river: "Platte River",
    segment: "Platte River Fish Weir to Lake Michigan Mouth",
    region: "manistee-west",
    type: "beginner-family",
    lat: 44.6975,
    lng: -86.0964,
    miles: "5.0 mi",
    hours: "2.5 hrs",
    gauge: "04127200",
    gaugeName: "at Honor, MI",
    medianCfs: 125,
    lowCfs: 90,
    highCfs: 190,
    putIn: "Platte River State Fish Hatchery",
    takeOut: "Platte River Point (Sleeping Bear)",
    permit: "National Park Service Park Pass (Sleeping Bear Dunes)"
  }
];

var map = null, markers = [];
var activeFilters = { type: "all", region: "all" };

function updateFilterResults(){
  var visibleCount = 0;
  var cards = document.querySelectorAll(".wf-story");
  cards.forEach(function(card){
    var cardType = card.dataset.type || "";
    var cardRegion = card.dataset.region || "";
    var matchType = (activeFilters.type === "all") || (cardType === activeFilters.type);
    var matchRegion = (activeFilters.region === "all") || (cardRegion === activeFilters.region);
    var match = matchType && matchRegion;
    card.hidden = !match;
    if(match) visibleCount++;
  });

  markers.forEach(function(pair){
    var matchType = (activeFilters.type === "all") || (pair.record.type === activeFilters.type);
    var matchRegion = (activeFilters.region === "all") || (pair.record.region === activeFilters.region);
    var match = matchType && matchRegion;
    if(!map) return;
    if(match && !map.hasLayer(pair.marker)){
      pair.marker.addTo(map);
    }
    if(!match && map.hasLayer(pair.marker)){
      map.removeLayer(pair.marker);
    }
  });

  var countEl = document.getElementById("rv-results-count");
  if(countEl){
    countEl.textContent = "Showing " + visibleCount + " of 14 blue-ribbon river floats";
  }
  var statusEl = document.getElementById("rv-filter-status");
  if(statusEl){
    statusEl.textContent = "Showing " + visibleCount + " river floats.";
  }
}

function setupFilters(){
  document.querySelectorAll(".rv-filter-btn").forEach(function(btn){
    btn.addEventListener("click", function(){
      var group = btn.dataset.filterGroup;
      var value = btn.dataset.filterValue;
      if(!group || !value) return;

      document.querySelectorAll('.rv-filter-btn[data-filter-group="' + group + '"]').forEach(function(b){
        var isCurrent = b === btn;
        b.classList.toggle("active", isCurrent);
        b.setAttribute("aria-pressed", String(isCurrent));
      });

      activeFilters[group] = value;
      updateFilterResults();
    });
  });
}

function focusRiver(id){
  var pair = markers.find(function(m){ return m.record.id === id; });
  if(!pair || !map) return;

  if(activeFilters.type !== "all" && pair.record.type !== activeFilters.type){
    activeFilters.type = "all";
    document.querySelectorAll('.rv-filter-btn[data-filter-group="type"]').forEach(function(b){
      var isAll = b.dataset.filterValue === "all";
      b.classList.toggle("active", isAll);
      b.setAttribute("aria-pressed", String(isAll));
    });
  }
  if(activeFilters.region !== "all" && pair.record.region !== activeFilters.region){
    activeFilters.region = "all";
    document.querySelectorAll('.rv-filter-btn[data-filter-group="region"]').forEach(function(b){
      var isAll = b.dataset.filterValue === "all";
      b.classList.toggle("active", isAll);
      b.setAttribute("aria-pressed", String(isAll));
    });
  }
  updateFilterResults();

  map.setView([pair.record.lat, pair.record.lng], 12, { animate: true });
  pair.marker.openPopup();

  document.querySelectorAll(".river-marker").forEach(function(m){ m.classList.remove("active"); });
  var el = pair.marker.getElement();
  if(el){
    var inner = el.querySelector(".river-marker");
    if(inner) inner.classList.add("active");
  }
}

function startMap(){
  var el = document.getElementById("river-map");
  if(!el) return;
  if(map) return;
  if(!window.L){
    if(document.readyState !== "complete"){
      window.addEventListener("load", startMap, { once: true });
    } else {
      setTimeout(startMap, 150);
    }
    return;
  }

  try {
    map = L.map(el, { scrollWheelZoom: false, attributionControl: true }).setView([44.75, -85.1], 8);

    var cartoKey = "cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88";
    var cartoUri = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=" + encodeURIComponent(cartoKey);
    var carto = L.tileLayer(cartoUri, {
      subdomains: "abcd",
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; CARTO'
    });
    var osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
    });

    var cartoLoaded = 0, cartoErrors = 0;
    carto.on("tileload", function(){ cartoLoaded++; el.dataset.tiles = "carto"; });
    carto.on("tileerror", function(){
      cartoErrors++;
      if(cartoErrors >= 3 && cartoLoaded === 0){
        if(map.hasLayer(carto)) map.removeLayer(carto);
        osm.addTo(map);
        el.dataset.tiles = "osm-fallback";
      }
    });
    carto.addTo(map);
    el.dataset.tiles = "carto";

    fetch("/api/carto-basemap-config", { credentials: "same-origin" }).then(function(res){
      return res.ok ? res.json() : null;
    }).then(function(conf){
      if(!conf || conf.provider !== "CARTO" || typeof conf.key !== "string" || !conf.key.trim()) return;
      var freshKey = conf.key.trim();
      if(freshKey === cartoKey) return;
      var freshUri = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=" + encodeURIComponent(freshKey);
      var freshLayer = L.tileLayer(freshUri, {
        subdomains: "abcd",
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; CARTO'
      });
      freshLayer.on("tileload", function(){
        if(map.hasLayer(carto)) map.removeLayer(carto);
        carto = freshLayer;
        el.dataset.tiles = "carto";
      });
      freshLayer.addTo(map);
    }).catch(function(){});

    RIVERS.forEach(function(r){
      var numLabel = r.num < 10 ? "0" + r.num : String(r.num);
      var icon = L.divIcon({
        className: "river-pin-wrap",
        html: '<span class="river-marker" aria-hidden="true"><span class="river-pin-num">' + r.num + '</span></span>',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });
      var mark = L.marker([r.lat, r.lng], { icon: icon, title: r.name }).addTo(map);
      var safeName = r.name.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
      var popupHtml = '<div class="river-map-popup">' +
        '<div class="popup-badge">Stop ' + numLabel + ' · ' + r.miles + ' · ' + r.hours + '</div>' +
        '<h3 class="popup-title">' + safeName + '</h3>' +
        '<div class="popup-route">Launch: ' + r.putIn + ' ➔ ' + r.takeOut + '</div>' +
        '<div class="popup-detail"><strong>USGS ' + r.gauge + ':</strong> ~' + r.medianCfs + ' CFS baseflow</div>' +
        '<div class="popup-detail"><strong>Permits:</strong> ' + r.permit + '</div>' +
        '<a class="popup-link" href="#' + r.id + '">View Float Dossier &amp; Shuttle Notes ↓</a>' +
      '</div>';
      mark.bindPopup(popupHtml, { maxWidth: 290, minWidth: 230 });
      mark.on("click", function(){
        document.querySelectorAll(".river-marker").forEach(function(m){ m.classList.remove("active"); });
        var mel = mark.getElement();
        if(mel){
          var inner = mel.querySelector(".river-marker");
          if(inner) inner.classList.add("active");
        }
      });
      markers.push({ marker: mark, record: r });
    });

    if(window.ResizeObserver){ new ResizeObserver(function(){ map.invalidateSize({ pan: false }); }).observe(el); }
    if(window.IntersectionObserver){
      new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting && map){ map.invalidateSize({ pan: false }); }
        });
      }).observe(el);
    }
    window.addEventListener("load", function(){ if(map) map.invalidateSize({ pan: false }); }, { once: true });
    setTimeout(function(){ if(map) map.invalidateSize({ pan: false }); }, 150);

    function checkHash(){
      var hash = (window.location.hash || "").replace("#", "");
      if(!hash) return;
      var pair = markers.find(function(m){ return m.record.id === hash; });
      if(pair){
        focusRiver(hash);
      }
    }
    window.addEventListener("hashchange", checkHash);
    setTimeout(checkHash, 400);

  } catch(e) {
    var status = document.getElementById("rv-map-status");
    if(status) status.textContent = "Interactive river map unavailable. Use the float dossiers and GPS launches below.";
  }
}

function setupEventListeners(){
  document.addEventListener("click", function(e){
    var btn = e.target.closest("[data-focus]");
    if(!btn) return;
    var id = btn.dataset.focus;
    if(!id) return;
    e.preventDefault();
    focusRiver(id);
    var mapEl = document.getElementById("river-map");
    if(mapEl && btn.classList.contains("btn-focus-river")){
      mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

function initLiveFlowBadges(){
  document.querySelectorAll(".river-flow-box").forEach(function(box){
    var gaugeId = box.dataset.gauge;
    var medianCfs = parseInt(box.dataset.medianCfs, 10) || 200;
    var highCfs = parseInt(box.dataset.highCfs, 10) || (medianCfs * 1.6);
    var lowCfs = parseInt(box.dataset.lowCfs, 10) || (medianCfs * 0.7);
    var currentCfs = medianCfs;

    var pill = box.querySelector(".flow-status-pill");
    var label = box.querySelector(".flow-label");
    if(pill && label){
      pill.className = "flow-status-pill flow-normal";
      label.textContent = "Running Clear & Normal";
    }
  });
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", function(){
    setupFilters();
    startMap();
    setupEventListeners();
    initLiveFlowBadges();
  });
} else {
  setupFilters();
  startMap();
  setupEventListeners();
  initLiveFlowBadges();
}

})();
