const MAPLIBRE_VERSION = "6.3.0";
const MAPLIBRE_MODULE = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.mjs`;
const MAPLIBRE_CSS = `https://cdn.jsdelivr.net/npm/maplibre-gl@${MAPLIBRE_VERSION}/dist/maplibre-gl.css`;
const OPENFREEMAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const ROUTE_ORDER = ["1","2","3","4","5","6","7","8","9","10","11","12","31","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];
const STOP_COORDINATES = {
  "1":[-92.1005,46.7867],"2":[-92.1041,46.7208],"3":[-90.8182,46.8108],"4":[-90.8838,46.5924],"5":[-90.171,46.4547],
  "6":[-89.6807,46.782],"7":[-89.314,46.8711],"8":[-87.8884,47.468],"9":[-88.4529,46.7566],"10":[-87.3954,46.5436],
  "11":[-86.651,46.411],"12":[-85.256,46.574],"31":[-84.957,46.771],"13":[-84.3453,46.4953],"14":[-84.3461,46.5219],
  "15":[-84.625,47.346],"16":[-84.7734,47.9935],"17":[-85.276,48.592],"18":[-86.37,48.74],"19":[-88.268,49.0125],
  "20":[-89.2477,48.3809],"21":[-89.5992,48.0042],"22":[-89.6844,47.9635],"23":[-90.3343,47.7504],"24":[-90.5223,47.7077],
  "25":[-90.874,47.554],"26":[-91.199,47.339],"27":[-91.367,47.2],"28":[-91.468,47.144],"29":[-91.6707,47.0227],
  "30":[-92.088,46.778]
};

// Simplified planning geometry generated once from OpenStreetMap road data. No live routing or geocoding request is made in the browser.
const ROUTE_GEOMETRY = [[-92.1005,46.7867],[-92.104004,46.7208],[-91.982202,46.647651],[-91.715885,46.647498],[-91.705388,46.676558],[-91.573132,46.676124],[-91.570355,46.747952],[-91.383149,46.77521],[-91.303744,46.823064],[-91.008526,46.891333],[-90.816213,46.869476],[-90.78887,46.854085],[-90.818198,46.810978],[-90.889986,46.756216],[-90.873926,46.684916],[-90.95489,46.600134],[-90.883823,46.592425],[-90.693074,46.611885],[-90.48182,46.501233],[-90.269948,46.493185],[-90.170981,46.454711],[-89.933579,46.478948],[-89.97543,46.695579],[-89.90392,46.725289],[-89.766822,46.70961],[-89.682214,46.756485],[-89.620242,46.7592],[-89.621571,46.818268],[-89.314079,46.871136],[-89.117302,46.785722],[-89.036895,46.782966],[-88.981431,46.846532],[-88.819882,46.915555],[-88.778953,46.992091],[-88.641924,47.060876],[-88.30251,47.377769],[-87.888413,47.467969],[-87.986926,47.427887],[-88.284507,47.388152],[-88.591242,47.130641],[-88.516758,47.103313],[-88.527146,47.021496],[-88.4509,46.950369],[-88.50036,46.759256],[-88.452944,46.756572],[-88.295187,46.575122],[-88.013859,46.535559],[-87.936335,46.496028],[-87.721594,46.485812],[-87.395408,46.543576],[-87.349906,46.486857],[-87.02426,46.497656],[-86.852246,46.431455],[-86.660418,46.440634],[-86.651296,46.411494],[-86.490091,46.348196],[-85.686499,46.339007],[-85.656101,46.310447],[-85.510872,46.303468],[-85.051623,46.333255],[-85.031349,46.362908],[-85.105919,46.480554],[-85.24382,46.484102],[-85.260305,46.571449],[-85.24382,46.484102],[-85.105919,46.480554],[-85.028994,46.559629],[-85.023923,46.712868],[-84.956953,46.770813],[-85.023923,46.712868],[-85.028994,46.559629],[-85.106817,46.478867],[-85.030867,46.345591],[-84.412927,46.373231],[-84.34551,46.495036],[-84.345542,46.521838],[-84.294138,46.599962],[-84.398535,46.801636],[-84.362652,46.891685],[-84.434116,46.930959],[-84.787465,46.992289],[-84.650723,47.23386],[-84.564166,47.262934],[-84.625536,47.34577],[-84.812996,47.493422],[-84.812478,47.728976],[-84.901454,47.795305],[-84.773397,47.9935],[-84.784196,47.970744],[-84.8251,48.007436],[-84.80718,48.151298],[-84.889754,48.287997],[-84.984404,48.29789],[-85.06684,48.355979],[-85.158217,48.529852],[-85.276095,48.592011],[-85.630365,48.724255],[-86.180916,48.681973],[-86.37079,48.737786],[-86.338716,48.748005],[-86.43865,48.797103],[-86.532623,48.762942],[-86.686632,48.817835],[-86.901974,48.77574],[-86.968399,48.857164],[-87.072083,48.832506],[-87.099903,48.78191],[-87.218694,48.793126],[-87.400739,48.840594],[-87.509328,48.836864],[-87.540087,48.879831],[-87.657554,48.908548],[-87.930494,48.937795],[-88.035167,49.021793],[-88.089344,49.001541],[-88.26794,49.012538],[-88.322814,49.009032],[-88.375499,48.905188],[-88.519124,48.852691],[-88.653515,48.664182],[-88.834742,48.569766],[-89.191386,48.481712],[-89.2477,48.380889],[-89.300876,48.380903],[-89.374448,48.30845],[-89.466583,48.302884],[-89.451274,48.116778],[-89.599705,48.000245],[-89.684409,47.963518],[-89.760779,47.906423],[-89.977894,47.831688],[-90.334557,47.750403],[-90.522158,47.70724],[-90.87449,47.554298],[-91.198459,47.338595],[-91.367279,47.201026],[-91.467834,47.14382],[-91.670701,47.022796],[-92.1005,46.7867]];

const REGION_COLORS = {wi:"#2d6b1a", mi:"#6b2d8a", on:"#c85c00", mn:"#1a6b8a", start:"#1a6b8a"};
const DAY_COLORS = ["#2c5f2d","#007f7b","#b04a35","#5c4fa3","#b27600","#2374ab","#8e4162","#397047","#a64b2a","#4d6c9a","#8a6d1d","#5d4c8a","#197278","#9b4a32","#4b6f44"];
const status = document.getElementById("mapStatus");
const page = window.CircleTourPage;
let map;
let selectedStopId = null;
let filterState = {region: window.circleTourRegion || "all", activity: window.circleTourActivity || "all"};
let presetState = readPresetState();

function readPresetState() {
  const days = Number(document.querySelector(".preset-btn.active")?.dataset.preset || 10);
  const direction = document.querySelector(".direction-btn.active")?.dataset.direction || "counterclockwise";
  const panel = document.getElementById(`itin-${days}`);
  let itinerary = Array.from(panel.querySelectorAll(".itin-day")).map((element) => ({
    day: Number(element.dataset.day),
    stops: element.dataset.stops.split(","),
    miles: Number(element.dataset.miles),
  }));
  if (direction === "clockwise") itinerary = itinerary.reverse().map((day, index) => ({...day, day:index + 1, stops:day.stops.reverse()}));
  return {days, direction, itinerary};
}

function addMapLibreCss() {
  if (document.querySelector("link[data-circle-tour-map-css]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = MAPLIBRE_CSS;
  link.dataset.circleTourMapCss = "";
  document.head.append(link);
}

function cardData(id) {
  const card = document.getElementById(`stop-${id}`);
  const rawRegion = card.dataset.seg;
  return {
    id,
    name: card.querySelector(".stop-name")?.textContent.trim() || `Stop ${id}`,
    subtitle: card.querySelector(".stop-sub")?.textContent.trim() || "",
    region: rawRegion === "start" ? "mn" : rawRegion,
    rawRegion,
    activities: (card.dataset.acts || "").split(" "),
  };
}

function stopDay(id) {
  const day = presetState.itinerary.find((item) => item.stops.includes(id));
  return day?.day || 0;
}

function stopFeatures() {
  return {
    type: "FeatureCollection",
    features: ROUTE_ORDER.map((id) => {
      const stop = cardData(id);
      const visible = (filterState.region === "all" || stop.rawRegion === "start" || stop.region === filterState.region) &&
        (filterState.activity === "all" || stop.activities.includes(filterState.activity));
      const day = stopDay(id);
      return {
        type: "Feature",
        geometry: {type: "Point", coordinates: STOP_COORDINATES[id]},
        properties: {
          id,
          number: Number(id),
          name: stop.name,
          subtitle: stop.subtitle,
          region: stop.region,
          color: REGION_COLORS[stop.rawRegion],
          day,
          dayColor: DAY_COLORS[(Math.max(day, 1) - 1) % DAY_COLORS.length],
          selected: page.hasStop(id) ? 1 : 0,
          visible: visible ? 1 : 0,
        },
      };
    }),
  };
}

function distanceSquared(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
}

function routeStopIndexes() {
  const indexes = {};
  let cursor = 0;
  ROUTE_ORDER.forEach((id, orderIndex) => {
    if (orderIndex === ROUTE_ORDER.length - 1) {
      indexes[id] = ROUTE_GEOMETRY.length - 1;
      return;
    }
    let best = cursor;
    for (let index = cursor; index < ROUTE_GEOMETRY.length; index += 1) {
      if (distanceSquared(ROUTE_GEOMETRY[index], STOP_COORDINATES[id]) < distanceSquared(ROUTE_GEOMETRY[best], STOP_COORDINATES[id])) best = index;
    }
    indexes[id] = best;
    cursor = best;
  });
  return indexes;
}

const STOP_INDEXES = routeStopIndexes();

function dayRouteFeatures() {
  return {
    type: "FeatureCollection",
    features: presetState.itinerary.flatMap((day) => {
      if (day.stops.length < 2) return [];
      const start = STOP_INDEXES[day.stops[0]];
      const end = STOP_INDEXES[day.stops.at(-1)];
      let coordinates;
      if (start <= end) coordinates = ROUTE_GEOMETRY.slice(start, end + 1);
      else coordinates = ROUTE_GEOMETRY.slice(end, start + 1).reverse();
      if (coordinates.length < 2) coordinates = [STOP_COORDINATES[day.stops[0]], STOP_COORDINATES[day.stops.at(-1)]];
      return [{
        type: "Feature",
        geometry: {type: "LineString", coordinates},
        properties: {day: day.day, color: DAY_COLORS[(day.day - 1) % DAY_COLORS.length]},
      }];
    }),
  };
}

function refreshSources() {
  map?.getSource("circle-stops")?.setData(stopFeatures());
  map?.getSource("day-routes")?.setData(dayRouteFeatures());
  if (selectedStopId) updateSelection(selectedStopId);
}

function updateSelection(id) {
  selectedStopId = String(id);
  const stop = cardData(selectedStopId);
  const day = stopDay(selectedStopId);
  const copy = document.querySelector("#mapSelection .map-selection-copy");
  copy.replaceChildren();
  const name = document.createElement("strong");
  name.textContent = stop.name;
  copy.append(name, document.createTextNode(`${stop.subtitle || "Circle Tour stop"}${day ? ` · Day ${day} on the selected route` : ""}`));
  const link = document.getElementById("mapStopLink");
  link.href = `#stop-${selectedStopId}`;
  link.textContent = "View full stop";
  const toggle = document.getElementById("mapStopToggle");
  toggle.hidden = false;
  const selected = page.hasStop(selectedStopId);
  toggle.classList.toggle("added", selected);
  toggle.textContent = selected ? "Remove from my trip" : "Add to my trip";
}

function selectStop(id, {move = true, measure = false} = {}) {
  updateSelection(id);
  if (move && map) {
    map.easeTo({center: STOP_COORDINATES[id], zoom: Math.max(map.getZoom(), 7), duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 550});
  }
  if (measure) page.track("map-marker-open", {stop: Number(id), days: presetState.days});
}

function showFallback(message) {
  status.classList.remove("hidden");
  status.innerHTML = `<div class="map-unavailable"><strong>The interactive map could not load.</strong>${message} Use the synchronized route preview, daily Google Maps links, and all 31 stop cards instead.</div>`;
}

try {
  addMapLibreCss();
  const maplibregl = await import(MAPLIBRE_MODULE);
  map = new maplibregl.Map({
    container: "circleTourMap",
    style: OPENFREEMAP_STYLE,
    bounds: [[-92.5,46.15],[-84.0,49.3]],
    fitBoundsOptions: {padding: 34},
    cooperativeGestures: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxPitch: 0,
    attributionControl: {compact: true, customAttribution: "Route overview"},
  });
  map.touchZoomRotate.disableRotation();
  map.addControl(new maplibregl.NavigationControl({showCompass: false}), "top-right");
  map.addControl(new maplibregl.ScaleControl({maxWidth: 100, unit: "imperial"}), "bottom-left");
  const loadTimeout = window.setTimeout(() => {
    if (!map.isStyleLoaded()) showFallback("The external basemap service did not respond in time.");
  }, 12000);

  map.on("load", () => {
    window.clearTimeout(loadTimeout);
    map.addSource("route-overview", {type: "geojson", data: {type:"Feature", geometry:{type:"LineString", coordinates:ROUTE_GEOMETRY}, properties:{}}});
    map.addSource("day-routes", {type: "geojson", data: dayRouteFeatures()});
    map.addSource("circle-stops", {type: "geojson", data: stopFeatures()});
    map.addLayer({id:"route-shadow",type:"line",source:"route-overview",paint:{"line-color":"#ffffff","line-width":8,"line-opacity":0.9}});
    map.addLayer({id:"route-line",type:"line",source:"route-overview",paint:{"line-color":"#294f3c","line-width":5,"line-opacity":0.72}});
    map.addLayer({id:"day-route-lines",type:"line",source:"day-routes",paint:{"line-color":["get","color"],"line-width":3,"line-opacity":0.95}});
    map.addLayer({
      id:"stop-circles",type:"circle",source:"circle-stops",filter:["==",["get","visible"],1],
      paint:{
        "circle-radius":["case",["==",["get","selected"],1],10,["interpolate",["linear"],["zoom"],4.5,6,8,9]],
        "circle-color":["get","color"],
        "circle-stroke-color":["case",["==",["get","selected"],1],"#172d22",["get","dayColor"]],
        "circle-stroke-width":["case",["==",["get","selected"],1],4,2],
      }
    });
    map.addLayer({
      id:"stop-labels",type:"symbol",source:"circle-stops",filter:["==",["get","visible"],1],
      layout:{"text-field":["to-string",["get","number"]],"text-size":10,"text-allow-overlap":true},
      paint:{"text-color":"#ffffff","text-halo-color":"rgba(0,0,0,.25)","text-halo-width":0.5}
    });

    map.on("click", "stop-circles", (event) => selectStop(String(event.features[0].properties.id), {measure: true}));
    for (const layer of ["stop-circles", "stop-labels"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
    status.classList.add("hidden");
    status.textContent = "";
  });
} catch (error) {
  showFallback("Your browser or network did not provide the map resources.");
}

document.getElementById("mapStopToggle").addEventListener("click", () => {
  if (!selectedStopId) return;
  page.toggleStop(selectedStopId);
  refreshSources();
});

document.getElementById("mapStopLink").addEventListener("click", (event) => {
  if (!selectedStopId) return;
  event.preventDefault();
  const card = document.getElementById(`stop-${selectedStopId}`);
  if (!card.classList.contains("open")) card.querySelector(".stop-header").click();
  card.scrollIntoView({behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start"});
  page.track("map-stop-detail", {stop: Number(selectedStopId)});
});

window.addEventListener("circle-tour:trip-change", refreshSources);
window.addEventListener("circle-tour:filter-change", (event) => {
  filterState = event.detail;
  refreshSources();
});
window.addEventListener("circle-tour:preset-change", (event) => {
  presetState = event.detail;
  refreshSources();
});
window.addEventListener("circle-tour:stop-open", (event) => selectStop(String(event.detail.id), {move: false}));

window.CircleTourMap = {focusStop: selectStop};
