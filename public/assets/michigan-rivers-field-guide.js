/**
 * Holy Waters & Cedar Bottoms: Michigan River Paddling & Fly-Fishing Field Guide
 * Interactive Leaflet Mapping with Dual Put-In & Take-Out GIS Coordinates,
 * USGS Flow Telemetry, and Multi-Persona Filtering.
 * Author: Chris Izworski
 */

(function () {
  'use strict';

  var RIVERS = [
    {
      id: 'au-sable-holy-water',
      name: "Au Sable 'Holy Water': Burton's Landing to Wakeley Bridge",
      river: "Au Sable River (Mainstream)",
      reach: "Burton's Landing to Wakeley Bridge",
      miles: 8.8,
      hours: "2.5–3.5 hrs",
      difficulty: "Class I · Gentle Gravel Runs",
      putIn: {
        name: "Burton's Landing DNR Access",
        lat: 44.6608,
        lon: -84.6297,
        type: "Timber canoe slide & carry-in steps",
        parking: "Gravel lot (12 vehicles) · DNR Recreation Passport",
        amenities: "Carry-in launch, info kiosk"
      },
      takeOut: {
        name: "Wakeley Bridge Landing",
        lat: 44.6467,
        lon: -84.5122,
        type: "Concrete boat ramp & floating kayak dock",
        parking: "Paved lot (25 vehicles + trailers)",
        amenities: "Vault toilet, trash receptacles"
      },
      shuttle: {
        roadMiles: "7.9 mi",
        driveMins: "11 min",
        route: "via North Down River Rd"
      },
      usgs: { site: '04135700', normalCfs: 190, name: 'Au Sable River at Grayling, MI' },
      watershed: 'ausable-huron',
      category: 'fly-water',
      personas: { trout: 10, family: 9, sup: 9, shuttle: 10, camping: 6, rapids: 3 }
    },
    {
      id: 'au-sable-mason-tract',
      name: "South Branch Au Sable: Chase Bridge to Smith Bridge",
      river: "South Branch Au Sable River",
      reach: "Chase Bridge to Smith Bridge (M-72)",
      miles: 9.5,
      hours: "3.5–4.5 hrs",
      difficulty: "Class I · Sweepers & Cedar Tunnels",
      putIn: {
        name: "Chase Bridge DNR Access",
        lat: 44.5244,
        lon: -84.4989,
        type: "Timber stairs & wooden canoe slide",
        parking: "Gravel lot (15 vehicles) · DNR Recreation Passport",
        amenities: "Carry-in stairs, informational kiosk"
      },
      takeOut: {
        name: "Smith Bridge Access (M-72)",
        lat: 44.6078,
        lon: -84.4442,
        type: "Wooden landing steps & roadside slide",
        parking: "Paved roadside lot (18 vehicles)",
        amenities: "Vault toilet, picnic tables"
      },
      shuttle: {
        roadMiles: "8.4 mi",
        driveMins: "12 min",
        route: "via Chase Bridge Rd & M-72"
      },
      usgs: { site: '04136500', normalCfs: 210, name: 'South Branch Au Sable River near Luzerne, MI' },
      watershed: 'ausable-huron',
      category: 'fly-water',
      personas: { trout: 10, family: 7, sup: 6, shuttle: 9, camping: 8, rapids: 4 }
    },
    {
      id: 'au-sable-lower-river',
      name: "Lower Au Sable National Scenic River: Foote Dam to Whirlpool",
      river: "Lower Au Sable River",
      reach: "Foote Dam Tailwater to Whirlpool DNR Access",
      miles: 11.0,
      hours: "3.5–5.0 hrs",
      difficulty: "Class I · Broad Scenic Tailwater",
      putIn: {
        name: "Foote Dam Tailwater Launch",
        lat: 44.4439,
        lon: -83.4561,
        type: "Concrete boat ramp & shoreline launch",
        parking: "Paved parking lot (30 vehicles + trailers)",
        amenities: "Restrooms, USFS day-use fee station"
      },
      takeOut: {
        name: "Whirlpool DNR Access",
        lat: 44.4286,
        lon: -83.3672,
        type: "Concrete boat ramp & floating boarding dock",
        parking: "Large gravel lot (40 vehicles + trailers)",
        amenities: "Vault toilet, DNR Recreation Passport"
      },
      shuttle: {
        roadMiles: "6.8 mi",
        driveMins: "10 min",
        route: "via River Rd National Scenic Byway"
      },
      usgs: { site: '04137500', normalCfs: 1350, name: 'Au Sable River near Oscoda, MI' },
      watershed: 'ausable-huron',
      category: 'beginner-family',
      personas: { trout: 8, family: 10, sup: 10, shuttle: 10, camping: 7, rapids: 2 }
    },
    {
      id: 'manistee-upper-deward',
      name: "Upper Manistee Wilderness: Deward to M-72 Bridge",
      river: "Upper Manistee River",
      reach: "Deward Co Rd 612 Bridge to M-72 Access",
      miles: 12.2,
      hours: "4.0–5.5 hrs",
      difficulty: "Class I · Tight Cedar Bends & Logs",
      putIn: {
        name: "Deward Tract Co Rd 612 Bridge",
        lat: 44.8211,
        lon: -84.8717,
        type: "Natural sand carry-in landing",
        parking: "Gravel road shoulder (8 vehicles)",
        amenities: "Remote carry-in, rustic wilderness"
      },
      takeOut: {
        name: "Manistee River M-72 Access",
        lat: 44.7578,
        lon: -84.9781,
        type: "DNR gravel boat ramp",
        parking: "Large gravel lot (20 vehicles)",
        amenities: "Vault toilet, DNR Recreation Passport"
      },
      shuttle: {
        roadMiles: "9.8 mi",
        driveMins: "14 min",
        route: "via Co Rd 612 & M-72"
      },
      usgs: { site: '04123500', normalCfs: 180, name: 'Manistee River near Grayling, MI' },
      watershed: 'manistee-west',
      category: 'fly-water',
      personas: { trout: 10, family: 6, sup: 5, shuttle: 8, camping: 8, rapids: 3 }
    },
    {
      id: 'manistee-middle-ccc-sharon',
      name: "Middle Manistee: CCC Bridge to Sharon (M-66)",
      river: "Middle Manistee River",
      reach: "CCC Bridge SFC to Sharon M-66 Access",
      miles: 14.0,
      hours: "4.5–6.0 hrs",
      difficulty: "Class I · Wide Bends & Gravel Flats",
      putIn: {
        name: "CCC Bridge State Forest Campground",
        lat: 44.5119,
        lon: -85.1275,
        type: "Gravel boat ramp & wooden canoe slide",
        parking: "Campground & day-use lot (25 vehicles)",
        amenities: "Rustic campsites, vault toilet, hand pump"
      },
      takeOut: {
        name: "Sharon DNR Access (M-66 Bridge)",
        lat: 44.5881,
        lon: -85.1831,
        type: "Concrete boat ramp & floating dock",
        parking: "Paved parking lot (20 vehicles + trailers)",
        amenities: "Vault toilet, DNR Recreation Passport"
      },
      shuttle: {
        roadMiles: "9.2 mi",
        driveMins: "13 min",
        route: "via Sunset Trail & M-66"
      },
      usgs: { site: '04124000', normalCfs: 820, name: 'Manistee River near Sherman, MI' },
      watershed: 'manistee-west',
      category: 'beginner-family',
      personas: { trout: 8, family: 9, sup: 8, shuttle: 10, camping: 10, rapids: 2 }
    },
    {
      id: 'manistee-lower-tippy-bear-creek',
      name: "Lower Big Manistee: High Bridge to Bear Creek",
      river: "Lower Big Manistee River",
      reach: "High Bridge Boat Launch to Bear Creek Access",
      miles: 16.5,
      hours: "5.0–7.0 hrs",
      difficulty: "Class I+ · Big Water & Heavy Current",
      putIn: {
        name: "High Bridge DNR Boat Launch",
        lat: 44.2750,
        lon: -85.9622,
        type: "Dual paved boat ramps & floating dock",
        parking: "Paved lot (45 vehicles + trailers)",
        amenities: "Vault toilets, trash receptacles, DNR Passport"
      },
      takeOut: {
        name: "Bear Creek DNR Access",
        lat: 44.3314,
        lon: -86.0597,
        type: "Gravel drift boat ramp & kayak beach",
        parking: "Gravel lot (25 vehicles + trailers)",
        amenities: "Vault toilet, DNR Passport"
      },
      shuttle: {
        roadMiles: "9.5 mi",
        driveMins: "15 min",
        route: "via High Bridge Rd & Coates Hwy"
      },
      usgs: { site: '04125550', normalCfs: 1850, name: 'Manistee River near Wellston, MI' },
      watershed: 'manistee-west',
      category: 'overnight-camp',
      personas: { trout: 8, family: 6, sup: 6, shuttle: 9, camping: 10, rapids: 4 }
    },
    {
      id: 'pine-river-elm-flats',
      name: "Pine National Scenic River: Elm Flats to Low Bridge",
      river: "Pine River",
      reach: "Elm Flats USFS Access to Low Bridge Access",
      miles: 8.5,
      hours: "2.5–3.5 hrs",
      difficulty: "Class I–II · Fast Chutes & Riffles",
      putIn: {
        name: "Elm Flats USFS Access",
        lat: 44.2189,
        lon: -85.7761,
        type: "Timber stairs & wooden canoe slide",
        parking: "Paved USFS parking lot (20 vehicles)",
        amenities: "USFS Permit Station, vault toilet"
      },
      takeOut: {
        name: "Low Bridge USFS Access",
        lat: 44.2250,
        lon: -85.8942,
        type: "Concrete boat ramp & kayak stairs",
        parking: "Large USFS paved lot (35 vehicles + trailers)",
        amenities: "Vault toilets, information kiosk"
      },
      shuttle: {
        roadMiles: "8.7 mi",
        driveMins: "14 min",
        route: "via S 9 Rd & M-55"
      },
      usgs: { site: '04125000', normalCfs: 275, name: 'Pine River near Hoxeyville, MI' },
      watershed: 'manistee-west',
      category: 'fly-water',
      personas: { trout: 9, family: 4, sup: 3, shuttle: 9, camping: 7, rapids: 10 }
    },
    {
      id: 'pere-marquette-holy-water',
      name: "Pere Marquette National Scenic: Green Cottage to Upper Branch",
      river: "Pere Marquette River",
      reach: "Green Cottage USFS Access to Upper Branch Bridge",
      miles: 10.5,
      hours: "3.5–4.5 hrs",
      difficulty: "Class I · Undammed Gravel Riffles",
      putIn: {
        name: "Green Cottage USFS Access",
        lat: 43.8647,
        lon: -85.9189,
        type: "Wooden stairs & timber canoe slide",
        parking: "Gravel USFS lot (15 vehicles)",
        amenities: "USFS Permit station, vault toilet"
      },
      takeOut: {
        name: "Upper Branch Bridge USFS Access",
        lat: 43.8964,
        lon: -86.0353,
        type: "Gravel boat ramp & wooden steps",
        parking: "Paved parking lot (20 vehicles + trailers)",
        amenities: "Vault toilet, info board"
      },
      shuttle: {
        roadMiles: "8.2 mi",
        driveMins: "12 min",
        route: "via US-10 & S Branch Rd"
      },
      usgs: { site: '04122500', normalCfs: 620, name: 'Pere Marquette River at Scottville, MI' },
      watershed: 'manistee-west',
      category: 'fly-water',
      personas: { trout: 10, family: 7, sup: 6, shuttle: 9, camping: 8, rapids: 4 }
    },
    {
      id: 'pere-marquette-gleasons-walhalla',
      name: "Lower Pere Marquette: Gleason's Landing to Walhalla",
      river: "Pere Marquette River (Lower)",
      reach: "Gleason's Landing SFC to Walhalla Road Bridge",
      miles: 12.0,
      hours: "4.0–5.5 hrs",
      difficulty: "Class I · Deep Clay Pools & Forest",
      putIn: {
        name: "Gleason's Landing USFS Campground",
        lat: 43.8906,
        lon: -86.0028,
        type: "Paved canoe slide & boat launch",
        parking: "Campground day-use lot (25 vehicles)",
        amenities: "Rustic campsites, vault toilet, hand pump"
      },
      takeOut: {
        name: "Walhalla Road Bridge DNR Access",
        lat: 43.9161,
        lon: -86.1189,
        type: "Concrete boat ramp & gravel shoreline",
        parking: "Large gravel lot (30 vehicles + trailers)",
        amenities: "Vault toilet, DNR Passport"
      },
      shuttle: {
        roadMiles: "8.5 mi",
        driveMins: "13 min",
        route: "via US-10 & Walhalla Rd"
      },
      usgs: { site: '04122500', normalCfs: 620, name: 'Pere Marquette River at Scottville, MI' },
      watershed: 'manistee-west',
      category: 'overnight-camp',
      personas: { trout: 9, family: 8, sup: 7, shuttle: 10, camping: 10, rapids: 3 }
    },
    {
      id: 'jordan-river-graves-crossing',
      name: "Jordan River Natural River: Graves Crossing to Rogers Road",
      river: "Jordan River",
      reach: "Graves Crossing DNR Access to Rogers Road Bridge",
      miles: 9.0,
      hours: "3.0–4.0 hrs",
      difficulty: "Class I · Crystal Springs & Cedar Bends",
      putIn: {
        name: "Graves Crossing DNR Access / SFC",
        lat: 45.1092,
        lon: -85.0883,
        type: "Wooden steps & timber launch chute",
        parking: "State Forest Campground lot (15 vehicles)",
        amenities: "Rustic camping, vault toilet, hand pump"
      },
      takeOut: {
        name: "Rogers Road Bridge Access",
        lat: 45.1611,
        lon: -85.1186,
        type: "Natural sand carry-out landing",
        parking: "Gravel turnaround clearing (10 vehicles)",
        amenities: "Rustic carry-out"
      },
      shuttle: {
        roadMiles: "5.6 mi",
        driveMins: "9 min",
        route: "via Graves Crossing Rd & Rogers Rd"
      },
      usgs: { site: '04127800', normalCfs: 200, name: 'Jordan River near East Jordan, MI' },
      watershed: 'manistee-west',
      category: 'beginner-family',
      personas: { trout: 9, family: 9, sup: 7, shuttle: 10, camping: 9, rapids: 3 }
    },
    {
      id: 'pigeon-river-elk-country',
      name: "Pigeon River Wild Waters: Sturgeon Divide to Webb Road",
      river: "Pigeon River",
      reach: "Sturgeon Divide / Red Bridge to Webb Road Bridge",
      miles: 7.2,
      hours: "2.5–3.5 hrs",
      difficulty: "Class I · Freestone Boulders & Snags",
      putIn: {
        name: "Sturgeon Divide / Red Bridge",
        lat: 45.1950,
        lon: -84.4817,
        type: "Rustic gravel carry-in launch",
        parking: "Dirt shoulder clearing (8 vehicles)",
        amenities: "Wilderness carry-in, no facilities"
      },
      takeOut: {
        name: "Webb Road Bridge Access",
        lat: 45.1389,
        lon: -84.4756,
        type: "Sand bank carry-in landing",
        parking: "Gravel parking area (10 vehicles)",
        amenities: "Informational kiosk"
      },
      shuttle: {
        roadMiles: "5.2 mi",
        driveMins: "9 min",
        route: "via Osmun Rd & Webb Rd"
      },
      usgs: { site: '04128900', normalCfs: 85, name: 'Pigeon River near Vanderbilt, MI' },
      watershed: 'ausable-huron',
      category: 'fly-water',
      personas: { trout: 10, family: 5, sup: 4, shuttle: 9, camping: 8, rapids: 4 }
    },
    {
      id: 'two-hearted-river-mouth',
      name: "Two Hearted Wilderness: High Bridge to Lake Superior Mouth",
      river: "Two Hearted River",
      reach: "High Bridge State Forest Access to Lake Superior Mouth",
      miles: 14.0,
      hours: "5.0–6.5 hrs",
      difficulty: "Class I · Remote Sand & Spruce Run",
      putIn: {
        name: "High Bridge State Forest Access",
        lat: 46.6433,
        lon: -85.4419,
        type: "Timber slide & gravel carry-in",
        parking: "Forest parking clearing (12 vehicles)",
        amenities: "Rustic wilderness access"
      },
      takeOut: {
        name: "Two Hearted River Mouth SFC",
        lat: 46.6989,
        lon: -85.4228,
        type: "Sandy beach river mouth landing",
        parking: "State Forest Campground lot (30 vehicles)",
        amenities: "Rustic camping, vault toilets, Lake Superior beach"
      },
      shuttle: {
        roadMiles: "8.8 mi",
        driveMins: "18 min",
        route: "via seasonal sand roads (4WD/AWD recommended)"
      },
      usgs: { site: '04044700', normalCfs: 130, name: 'Two Hearted River near Newberry, MI' },
      watershed: 'up-wild',
      category: 'overnight-camp',
      personas: { trout: 9, family: 6, sup: 6, shuttle: 7, camping: 10, rapids: 3 }
    },
    {
      id: 'fox-river-seney',
      name: "Hemingway's Fox River: Seney to Fox River SFC",
      river: "Fox River",
      reach: "Seney M-28 Bridge to Fox River SFC",
      miles: 10.5,
      hours: "3.5–5.0 hrs",
      difficulty: "Class I · Amber Peat Springs & Cedar",
      putIn: {
        name: "Fox River M-28 Bridge Launch",
        lat: 46.3497,
        lon: -85.9461,
        type: "Natural sand canoe landing under bridge",
        parking: "Paved highway shoulder turnout (10 vehicles)",
        amenities: "Highway roadside landing"
      },
      takeOut: {
        name: "Fox River State Forest Campground",
        lat: 46.4022,
        lon: -85.9614,
        type: "Wooden canoe steps & sandy landing",
        parking: "Campground parking lot (15 vehicles)",
        amenities: "Rustic campsites, hand pump, vault toilet"
      },
      shuttle: {
        roadMiles: "6.2 mi",
        driveMins: "11 min",
        route: "via Co Rd 450 (Fox River Rd)"
      },
      usgs: { site: '04059000', normalCfs: 160, name: 'Fox River near Seney, MI' },
      watershed: 'up-wild',
      category: 'fly-water',
      personas: { trout: 9, family: 7, sup: 7, shuttle: 9, camping: 9, rapids: 2 }
    },
    {
      id: 'platte-river-sleeping-bear',
      name: "Lower Platte River: Salmon Weir to Lake Michigan Mouth",
      river: "Platte River",
      reach: "Platte River Salmon Weir (M-22) to Lake Michigan Point",
      miles: 4.5,
      hours: "1.5–2.5 hrs",
      difficulty: "Class I · Pristine Shallow Sand",
      putIn: {
        name: "Platte River Salmon Weir / M-22",
        lat: 44.6983,
        lon: -86.1039,
        type: "Wooden boarding platform & canoe slide",
        parking: "Paved parking lot (25 vehicles)",
        amenities: "NPS park pass required, vault toilet"
      },
      takeOut: {
        name: "Platte River Point / Lake Michigan Mouth",
        lat: 44.7333,
        lon: -86.1517,
        type: "Sandy river spit beach landing",
        parking: "Expansive paved NPS lot (60 vehicles)",
        amenities: "Restrooms, outdoor rinse showers, picnic area"
      },
      shuttle: {
        roadMiles: "4.8 mi",
        driveMins: "8 min",
        route: "via Lake Michigan Rd"
      },
      usgs: { site: '04127200', normalCfs: 125, name: 'Platte River at Honor, MI' },
      watershed: 'manistee-west',
      category: 'beginner-family',
      personas: { trout: 7, family: 10, sup: 10, shuttle: 10, camping: 8, rapids: 1 }
    }
  ];

  // Leaflet map instance and layer groups
  var map = null;
  var markerGroup = null;
  var routeLineGroup = null;
  var riverLayers = {};

  // Custom SVG Markers
  function createIcon(type, number) {
    var isPutIn = type === 'in';
    var bgColor = isPutIn ? '#0d9488' : '#c2410c';
    var label = isPutIn ? 'IN' : 'OUT';
    var svg = '<svg width="30" height="38" viewBox="0 0 30 38" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 23 15 23s15-12.5 15-23c0-8.284-6.716-15-15-15z" fill="' + bgColor + '"/>' +
      '<circle cx="15" cy="15" r="10" fill="#ffffff"/>' +
      '<text x="15" y="19" font-family="Arial, sans-serif" font-size="9" font-weight="800" fill="' + bgColor + '" text-anchor="middle">' + label + '</text>' +
      '</svg>';
    return L.divIcon({
      className: 'wf-custom-pin',
      html: svg,
      iconSize: [30, 38],
      iconAnchor: [15, 38],
      popupAnchor: [0, -36]
    });
  }

  function initMap() {
    var mapEl = document.getElementById('rivers-map');
    if (!mapEl || typeof L === 'undefined') return;

    map = L.map('rivers-map', {
      center: [44.8, -85.2],
      zoom: 7,
      scrollWheelZoom: false
    });

    var cartoKey = "cb1_2y8f_1_1ee5e3a872c91d0ebf5d7b88";
    var cartoUri = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=" + encodeURIComponent(cartoKey);
    var cartoVoyager = L.tileLayer(cartoUri, {
      maxZoom: 19,
      attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      subdomains: 'abcd'
    });

    var osmFallback = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    });

    var cartoLoaded = 0, cartoErrors = 0;
    cartoVoyager.on('tileload', function () { cartoLoaded++; mapEl.dataset.tiles = 'carto'; });
    cartoVoyager.on('tileerror', function () {
      cartoErrors++;
      if (cartoErrors >= 3 && cartoLoaded === 0) {
        if (map.hasLayer(cartoVoyager)) map.removeLayer(cartoVoyager);
        osmFallback.addTo(map);
        mapEl.dataset.tiles = 'osm-fallback';
      }
    });

    cartoVoyager.addTo(map);
    mapEl.dataset.tiles = 'carto';

    fetch('/api/carto-basemap-config', { credentials: 'same-origin' }).then(function (res) {
      return res.ok ? res.json() : null;
    }).then(function (conf) {
      if (!conf || conf.provider !== 'CARTO' || typeof conf.key !== 'string' || !conf.key.trim()) return;
      var freshKey = conf.key.trim();
      if (freshKey === cartoKey) return;
      var freshUri = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(freshKey);
      var freshLayer = L.tileLayer(freshUri, {
        subdomains: 'abcd',
        maxZoom: 19,
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      });
      freshLayer.on('tileload', function () {
        if (map.hasLayer(cartoVoyager)) map.removeLayer(cartoVoyager);
        cartoVoyager = freshLayer;
        mapEl.dataset.tiles = 'carto';
      });
      freshLayer.addTo(map);
    }).catch(function () {});

    markerGroup = L.layerGroup().addTo(map);
    routeLineGroup = L.layerGroup().addTo(map);

    // Plot both Put-In and Take-Out for every river
    RIVERS.forEach(function (r, idx) {
      var num = idx + 1;
      var inCoords = [r.putIn.lat, r.putIn.lon];
      var outCoords = [r.takeOut.lat, r.takeOut.lon];

      var inMarker = L.marker(inCoords, { icon: createIcon('in', num) });
      var inPopup = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;line-height:1.4;">' +
        '<div style="font-size:10px;font-weight:800;color:#0d9488;text-transform:uppercase;">🟢 Put-In Launch</div>' +
        '<div style="font-size:14px;font-weight:800;color:#0f3d2e;margin:2px 0;">' + r.putIn.name + '</div>' +
        '<div style="color:#475569;margin-bottom:4px;">' + r.name + '</div>' +
        '<div style="font-size:11px;color:#64748b;margin-bottom:6px;"><strong>Type:</strong> ' + r.putIn.type + '<br><strong>Parking:</strong> ' + r.putIn.parking + '</div>' +
        '<div style="font-family:monospace;font-size:11px;background:#f1f5f9;padding:2px 4px;border-radius:3px;margin-bottom:8px;">' + r.putIn.lat.toFixed(4) + '° N, ' + Math.abs(r.putIn.lon).toFixed(4) + '° W</div>' +
        '<a href="https://www.google.com/maps/search/?api=1&query=' + r.putIn.lat + ',' + r.putIn.lon + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#0d9488;color:#fff;font-weight:700;font-size:11px;padding:4px 8px;border-radius:4px;text-decoration:none;">Navigate to Put-In &rarr;</a>' +
        '</div>';
      inMarker.bindPopup(inPopup);

      var outMarker = L.marker(outCoords, { icon: createIcon('out', num) });
      var outPopup = '<div style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;line-height:1.4;">' +
        '<div style="font-size:10px;font-weight:800;color:#c2410c;text-transform:uppercase;">🔴 Take-Out Landing</div>' +
        '<div style="font-size:14px;font-weight:800;color:#0f3d2e;margin:2px 0;">' + r.takeOut.name + '</div>' +
        '<div style="color:#475569;margin-bottom:4px;">' + r.name + '</div>' +
        '<div style="font-size:11px;color:#64748b;margin-bottom:6px;"><strong>Type:</strong> ' + r.takeOut.type + '<br><strong>Amenities:</strong> ' + r.takeOut.amenities + '</div>' +
        '<div style="font-family:monospace;font-size:11px;background:#f1f5f9;padding:2px 4px;border-radius:3px;margin-bottom:8px;">' + r.takeOut.lat.toFixed(4) + '° N, ' + Math.abs(r.takeOut.lon).toFixed(4) + '° W</div>' +
        '<a href="https://www.google.com/maps/search/?api=1&query=' + r.takeOut.lat + ',' + r.takeOut.lon + '" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#c2410c;color:#fff;font-weight:700;font-size:11px;padding:4px 8px;border-radius:4px;text-decoration:none;">Navigate to Take-Out &rarr;</a>' +
        '</div>';
      outMarker.bindPopup(outPopup);

      var routeLine = L.polyline([inCoords, outCoords], {
        color: '#0d9488',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.75
      });

      inMarker.addTo(markerGroup);
      outMarker.addTo(markerGroup);
      routeLine.addTo(routeLineGroup);

      riverLayers[r.id] = {
        inMarker: inMarker,
        outMarker: outMarker,
        routeLine: routeLine,
        inCoords: inCoords,
        outCoords: outCoords,
        river: r
      };
    });

    // Invalidate map size on window load and resize
    window.addEventListener('load', function () {
      setTimeout(function () { map.invalidateSize(); }, 200);
    });
  }

  // Focus and zoom to both Put-In and Take-Out
  window.showOnMap = function (id) {
    var item = riverLayers[id];
    if (!item || !map) return;
    var bounds = L.latLngBounds([item.inCoords, item.outCoords]);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    item.inMarker.openPopup();

    var card = document.getElementById(id);
    if (card) {
      document.querySelectorAll('.wf-story').forEach(function (c) { c.classList.remove('is-highlighted'); });
      card.classList.add('is-highlighted');
    }
  };

  // Multi-group Filtering
  function setupFilters() {
    var activeCategory = 'all';
    var activeWatershed = 'all';

    var pillBtns = document.querySelectorAll('.fg-pill-btn');
    pillBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var group = btn.getAttribute('data-filter-group');
        var value = btn.getAttribute('data-filter-value');

        // Update active class in group
        document.querySelectorAll('.fg-pill-btn[data-filter-group="' + group + '"]').forEach(function (b) {
          b.classList.remove('is-active');
        });
        btn.classList.add('is-active');

        if (group === 'category') activeCategory = value;
        if (group === 'watershed') activeWatershed = value;

        applyFilters();
      });
    });

    function applyFilters() {
      var cards = document.querySelectorAll('.wf-story');
      var visibleBounds = [];

      cards.forEach(function (card) {
        var cat = card.getAttribute('data-category');
        var water = card.getAttribute('data-watershed');
        var id = card.id;

        var catMatch = (activeCategory === 'all' || cat === activeCategory);
        var waterMatch = (activeWatershed === 'all' || water === activeWatershed);

        if (catMatch && waterMatch) {
          card.removeAttribute('hidden');
          if (riverLayers[id]) {
            riverLayers[id].inMarker.addTo(markerGroup);
            riverLayers[id].outMarker.addTo(markerGroup);
            riverLayers[id].routeLine.addTo(routeLineGroup);
            visibleBounds.push(riverLayers[id].inCoords);
            visibleBounds.push(riverLayers[id].outCoords);
          }
        } else {
          card.setAttribute('hidden', '');
          if (riverLayers[id]) {
            markerGroup.removeLayer(riverLayers[id].inMarker);
            markerGroup.removeLayer(riverLayers[id].outMarker);
            routeLineGroup.removeLayer(riverLayers[id].routeLine);
          }
        }
      });

      if (map && visibleBounds.length > 0) {
        map.fitBounds(L.latLngBounds(visibleBounds), { padding: [40, 40] });
      }
    }
  }

  // Handle URL hash navigation
  function handleHash() {
    var hash = window.location.hash.replace('#', '');
    if (hash && riverLayers[hash]) {
      setTimeout(function () {
        window.showOnMap(hash);
      }, 300);
    }
  }

  // Initialize on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      initMap();
      setupFilters();
      handleHash();
    });
  } else {
    initMap();
    setupFilters();
    handleHash();
  }

  window.addEventListener('hashchange', handleHash);
})();
