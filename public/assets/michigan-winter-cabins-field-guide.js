/**
 * Michigan Winter Cabins, Saunas & Hot-Tub Basecamps Field Guide Controller
 * Architecture: FIELD_GUIDE_V1
 * Persona: Northwoods Lodgekeeper & Winter Trail Scout
 */

(function () {
  'use strict';

  // Basecamp metadata and baseline snow telemetry
  const BASECAMPS = [
    {
      id: 1,
      name: "Keweenaw Shoreline Saunas & Cold Plunge",
      zone: "Keweenaw Peninsula",
      style: "wood-fired-sauna",
      styleLabel: "Wood-Fired Lake Superior Sauna",
      lat: 47.4690,
      lng: -87.8910,
      baselineSnow: 32,
      snowbelt: "Lake Superior Keweenaw Snowbelt",
      plowDifficulty: "High",
      awdNeeded: "Yes (AWD + Winter Tires)",
      trailhead: "Mount Bohemia / Swedetown Trails (0.5–8 mi)",
      color: "#c26b38"
    },
    {
      id: 2,
      name: "Porcupine Mountains Wilderness Yurts & Cabins",
      zone: "Ontonagon County / Porkies",
      style: "rustic-yurt-cabin",
      styleLabel: "Rustic State Park Yurt/Cabin",
      lat: 46.8042,
      lng: -89.7025,
      baselineSnow: 28,
      snowbelt: "Western U.P. High Ridge Snowbelt",
      plowDifficulty: "Severe (Ski-in Trailheads)",
      awdNeeded: "Yes (4WD/AWD for M-107)",
      trailhead: "Lake of the Clouds & Escarpment (1–4 mi ski-in)",
      color: "#854d0e"
    },
    {
      id: 3,
      name: "Boyne Mountain & Walloon Lake Chalets",
      zone: "Charlevoix County",
      style: "ski-in-chalet",
      styleLabel: "Ski-In/Ski-Out Chalet",
      lat: 45.1633,
      lng: -84.9317,
      baselineSnow: 18,
      snowbelt: "Northwest Lower Lake-Effect Belt",
      plowDifficulty: "Moderate (Continuous Resort Clearing)",
      awdNeeded: "Recommended for Steep Driveways",
      trailhead: "Boyne Slopes & Disciples Ridge (Direct Ski-In)",
      color: "#166534"
    },
    {
      id: 4,
      name: "Au Sable River 'Holy Water' Cedar Cabins",
      zone: "Crawford County / Grayling",
      style: "riverfront-cabin",
      styleLabel: "Riverfront Fireplace Cabin",
      lat: 44.6611,
      lng: -84.7139,
      baselineSnow: 12,
      snowbelt: "Northern Lower Pine Plains",
      plowDifficulty: "Moderate (County Roads Plowed)",
      awdNeeded: "Recommended for River Two-Tracks",
      trailhead: "Mason Tract Pathway (0.5–3 mi)",
      color: "#1b4965"
    },
    {
      id: 5,
      name: "Marquette Sandstone Shoreline & Presque Isle Saunas",
      zone: "Marquette County",
      style: "wood-fired-sauna",
      styleLabel: "Wood-Fired Lake Superior Sauna",
      lat: 46.5436,
      lng: -87.3954,
      baselineSnow: 24,
      snowbelt: "Marquette Iron Range Snowbelt",
      plowDifficulty: "Moderate to High (CR 550 Squalls)",
      awdNeeded: "Yes (Essential for Coastal CR 550)",
      trailhead: "Noquemanon Trail Network / Sugarloaf (1–5 mi)",
      color: "#c26b38"
    },
    {
      id: 6,
      name: "Munising & Pictured Rocks Backcountry Cabin Outposts",
      zone: "Alger County / Munising",
      style: "rustic-yurt-cabin",
      styleLabel: "Rustic State Park Yurt/Cabin",
      lat: 46.4111,
      lng: -86.6475,
      baselineSnow: 26,
      snowbelt: "Munising Lake Superior Snow Corridor",
      plowDifficulty: "High (Roads End at Snow Plow Berms)",
      awdNeeded: "Yes (High Clearance AWD)",
      trailhead: "Sand Point Ice Curtains & Valley Spur (0.5–6 mi)",
      color: "#854d0e"
    },
    {
      id: 7,
      name: "The Highlands at Harbor Springs & Nub's Nob Chalets",
      zone: "Emmet County",
      style: "ski-in-chalet",
      styleLabel: "Ski-In/Ski-Out Chalet",
      lat: 45.4319,
      lng: -84.9878,
      baselineSnow: 20,
      snowbelt: "Little Traverse Bay Snowbelt",
      plowDifficulty: "Moderate (Steep Chalet Grades)",
      awdNeeded: "Yes (Steep Private Hill Climbs)",
      trailhead: "Nub's Nob & Highlands Nordic Centers (Direct)",
      color: "#166534"
    },
    {
      id: 8,
      name: "Upper Manistee River & Jordan River Valley Hideaways",
      zone: "Antrim & Kalkaska Counties",
      style: "riverfront-cabin",
      styleLabel: "Riverfront Fireplace Cabin",
      lat: 44.9039,
      lng: -85.0611,
      baselineSnow: 16,
      snowbelt: "Jordan Valley Inland Snowbelt",
      plowDifficulty: "High (Valley Forest Roads Packed Snow)",
      awdNeeded: "Yes (AWD/4WD for Forest Lanes)",
      trailhead: "Jordan River Pathway & Deadman's Hill (1–18 mi)",
      color: "#1b4965"
    },
    {
      id: 9,
      name: "Crystal Mountain & Benzie County Alpine Chalets",
      zone: "Benzie County",
      style: "ski-in-chalet",
      styleLabel: "Ski-In/Ski-Out Chalet",
      lat: 44.5208,
      lng: -85.9961,
      baselineSnow: 18,
      snowbelt: "Crystal Lake & Benzie Snowbelt",
      plowDifficulty: "Low to Moderate (Resort Roads Cleared)",
      awdNeeded: "Recommended for Lake-Effect Squalls",
      trailhead: "Crystal FIS Nordic & Legacy Art Park (Direct)",
      color: "#166534"
    },
    {
      id: 10,
      name: "Tahquamenon Falls & Whitefish Bay Boreal Lodges",
      zone: "Chippewa & Luce Counties",
      style: "wood-fired-sauna",
      styleLabel: "Wood-Fired Lake Superior Sauna",
      lat: 46.5748,
      lng: -85.2568,
      baselineSnow: 26,
      snowbelt: "Eastern U.P. Whitefish Bay Belt",
      plowDifficulty: "High (Whitefish Point Drift Winds)",
      awdNeeded: "Yes (Heavy Drifting on M-123)",
      trailhead: "Tahquamenon River & Falls Snowshoe Trails (0.5–4 mi)",
      color: "#c26b38"
    },
    {
      id: 11,
      name: "Pine River & Manistee National Forest Rustic Yurts",
      zone: "Wexford & Lake Counties",
      style: "rustic-yurt-cabin",
      styleLabel: "Rustic State Park Yurt/Cabin",
      lat: 44.2483,
      lng: -85.8344,
      baselineSnow: 16,
      snowbelt: "Cadillac High Plateau Snowbelt",
      plowDifficulty: "High (USFS Roads Packed/Unplowed)",
      awdNeeded: "Yes (High-Clearance AWD/4WD)",
      trailhead: "Mackenzie XC Ski Trails & NCT Pine River (0.5–10 mi)",
      color: "#854d0e"
    },
    {
      id: 12,
      name: "Pere Marquette River 'Fly-Water' Retreats",
      zone: "Lake County / Baldwin",
      style: "riverfront-cabin",
      styleLabel: "Riverfront Fireplace Cabin",
      lat: 43.8967,
      lng: -85.8528,
      baselineSnow: 10,
      snowbelt: "West Michigan Transition Snowbelt",
      plowDifficulty: "Moderate (River Access Roads Ice Up)",
      awdNeeded: "Recommended (Freeze-Thaw Glaze)",
      trailhead: "Pere Marquette River Trail & Bowman's Bridge (1–6 mi)",
      color: "#1b4965"
    }
  ];

  const STYLE_INTEL = {
    "all": {
      title: "All 12 Michigan Winter Basecamp Zones",
      badge: "Peak Winter Network · Active",
      details: "Curated for authentic winter thermal comfort: wood-fired Finnish saunas, private ski chalets, DNR backcountry yurts, and spring-fed river cabins.",
      advisory: "Scout Advice: Always check MDOT MiDrive for real-time highway plow status and pack traction cleats plus snowshoes inside your vehicle."
    },
    "wood-fired-sauna": {
      title: "Wood-Fired Lake Superior Shoreline Saunas (3 Zones)",
      badge: "Finnish Heritage · Thermal Shock Ready",
      details: "Located on the frozen rock and sand shelves of Keweenaw, Marquette, and Whitefish Bay. Stoked with local sugar maple and birch up to 190°F–210°F with direct snowbank or Lake Superior plunge access.",
      advisory: "Sauna Scout Rule: Never plunge into open Lake Superior waves without a spotter, a clear shoveled pathway, and dry wool felt slippers ready on the timber deck."
    },
    "ski-in-chalet": {
      title: "Ski-In/Ski-Out Chalets with Private Hot Tubs (3 Zones)",
      badge: "Downhill & FIS Nordic · High Comfort",
      details: "Direct chairlift and groomed trail connections at Boyne Mountain, Nub's Nob / The Highlands, and Crystal Mountain. Outfitted with outdoor hot tubs under snowy hemlocks, boot dryers, and stone hearths.",
      advisory: "Hot Tub Scout Rule: Keep the insulated thermal cover clamped down until the exact minute you step in; sub-zero winds drop uncovered water temperature by 2°F every five minutes."
    },
    "rustic-yurt-cabin": {
      title: "Rustic State Park & Wilderness Yurts (3 Zones)",
      badge: "Backcountry Ski-In · Pure Wilderness",
      details: "Off-grid timber and canvas winter outposts in the Porcupine Mountains, Pictured Rocks, and Manistee National Forest. Heated exclusively with airtight woodstoves, with split firewood supplied by park rangers.",
      advisory: "Yurt Scout Rule: Bring your own headlamps, waterproof matches, firestarter nuggets, zero-degree sleeping bags, and a pulk gear sled to haul gear across the snow."
    },
    "riverfront-cabin": {
      title: "Riverfront Fireplace Cabins on Living Waters (3 Zones)",
      badge: "Spring-Fed Rivers · Never Freeze Solid",
      details: "Nestled along the Au Sable Holy Water, Jordan River Valley, and Pere Marquette. Michigan's premier trout rivers stay open and steam in sub-zero dawn air, framed by old-growth cedars and native stone hearths.",
      advisory: "River Scout Rule: Cedar bottomlands are silent and insulated from highway noise, but unplowed river two-tracks ice over quickly after daytime thawing."
    }
  };

  let activeStyle = "all";
  let mapInstance = null;
  let markersById = {};

  function initFilters() {
    const pills = document.querySelectorAll(".mc-style-pill");
    const stories = document.querySelectorAll(".wf-story");
    const intelTitle = document.getElementById("mc-snow-intel-title");
    const intelBadge = document.getElementById("mc-snow-intel-badge");
    const intelDetails = document.getElementById("mc-snow-intel-details");
    const intelAdvisory = document.getElementById("mc-snow-intel-advisory");

    pills.forEach(pill => {
      pill.addEventListener("click", () => {
        const style = pill.getAttribute("data-style");
        if (style === activeStyle) return;

        pills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeStyle = style;

        // Filter cards
        let visibleCount = 0;
        stories.forEach(story => {
          const cardStyle = story.getAttribute("data-style");
          if (style === "all" || cardStyle === style) {
            story.classList.remove("hidden");
            visibleCount++;
          } else {
            story.classList.add("hidden");
          }
        });

        // Update Intel Banner
        const intel = STYLE_INTEL[style] || STYLE_INTEL["all"];
        if (intelTitle) intelTitle.textContent = intel.title;
        if (intelBadge) intelBadge.textContent = `${visibleCount} Stops · ${intel.badge}`;
        if (intelDetails) intelDetails.textContent = intel.details;
        if (intelAdvisory) intelAdvisory.textContent = intel.advisory;

        // Update Map Markers visibility
        BASECAMPS.forEach(bc => {
          const marker = markersById[bc.id];
          if (!marker) return;
          if (style === "all" || bc.style === style) {
            if (!mapInstance.hasLayer(marker)) marker.addTo(mapInstance);
          } else {
            if (mapInstance.hasLayer(marker)) mapInstance.removeLayer(marker);
          }
        });
      });
    });
  }

  // Update snow depth badges dynamically
  async function loadSnowTelemetry() {
    for (const bc of BASECAMPS) {
      const badge = document.querySelector(`.mc-badge-snow[data-basecamp-id="${bc.id}"]`);
      if (!badge) continue;

      let depth = bc.baselineSnow;
      let status = depth >= 24 ? "Deep Lake-Effect Powder" : (depth >= 16 ? "Packed Trail Base" : "Moderate Cover");

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${bc.lat}&longitude=${bc.lng}&current=snow_depth&timezone=auto`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          if (data.current && typeof data.current.snow_depth === 'number') {
            const meters = data.current.snow_depth;
            const inches = Math.round(meters * 39.3701);
            if (inches > 0) {
              depth = inches;
              status = depth >= 24 ? "Deep Lake-Effect Powder" : (depth >= 16 ? "Packed Trail Base" : "Winter Basepack");
            }
          }
        }
      } catch (err) {
        // Graceful fallback to authentic baseline
      }

      badge.innerHTML = `❄️ ${depth}&quot; Snowpack · ${status}`;
    }
  }

  // Initialize Leaflet Map
  function initMap() {
    const mapEl = document.getElementById("cabin-map");
    if (!mapEl || typeof L === "undefined") return;

    mapInstance = L.map("cabin-map", {
      center: [45.6, -86.5],
      zoom: 7,
      scrollWheelZoom: false
    });

    const tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
    const osmUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

    const baseLayer = L.tileLayer(tileUrl, {
      maxZoom: 18,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
    });

    baseLayer.on("tileerror", () => {
      L.tileLayer(osmUrl, {
        maxZoom: 18,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      }).addTo(mapInstance);
    });

    baseLayer.addTo(mapInstance);

    // Add Markers
    BASECAMPS.forEach(bc => {
      const customIcon = L.divIcon({
        className: 'mc-map-marker',
        html: `<div style="background:${bc.color};color:#fff;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid #ffffff;box-shadow:0 3px 8px rgba(0,0,0,0.35);">${bc.id}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18]
      });

      const popupContent = `
        <div style="font-family:'DM Sans',sans-serif;padding:6px;max-width:240px;">
          <div style="font-size:11px;font-weight:700;color:${bc.color};text-transform:uppercase;letter-spacing:0.04em;">#${bc.id} · ${bc.styleLabel}</div>
          <div style="font-weight:700;font-size:14px;color:#0f251c;margin:3px 0 6px;">${bc.name}</div>
          <div style="font-size:12px;color:#475569;margin-bottom:6px;"><strong>Snowpack:</strong> ~${bc.baselineSnow}&quot; (${bc.snowbelt})</div>
          <div style="font-size:12px;color:#475569;margin-bottom:8px;"><strong>AWD:</strong> ${bc.awdNeeded}</div>
          <a href="#basecamp-${bc.id}" style="display:inline-block;background:${bc.color};color:#fff;text-decoration:none;font-size:11.5px;font-weight:600;padding:4px 10px;border-radius:4px;">Read Field Dossier ↓</a>
        </div>
      `;

      const marker = L.marker([bc.lat, bc.lng], { icon: customIcon }).bindPopup(popupContent);
      marker.addTo(mapInstance);
      markersById[bc.id] = marker;
    });

    // Wire "Center on Map" buttons
    document.querySelectorAll(".mc-center-map-btn").forEach(btn => {
      btn.addEventListener("click", e => {
        e.preventDefault();
        const id = parseInt(btn.getAttribute("data-basecamp-id"), 10);
        const bc = BASECAMPS.find(b => b.id === id);
        if (bc && mapInstance && markersById[id]) {
          mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => {
            mapInstance.setView([bc.lat, bc.lng], 9);
            markersById[id].openPopup();
          }, 350);
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initFilters();
      initMap();
      loadSnowTelemetry();
    });
  } else {
    initFilters();
    initMap();
    loadSnowTelemetry();
  }
})();
