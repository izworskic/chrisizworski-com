(() => {
  "use strict";

  const DAYS = {"1":1.5,"2":0.5,"3":1.5,"4":0.5,"5":0.75,"6":1.5,"7":0.25,"8":2,"9":0.5,"10":1,"11":2,"12":0.75,"13":0.75,"14":1,"15":1,"16":0.5,"17":0.25,"18":0.75,"19":0.5,"20":1.5,"21":0.25,"22":0.75,"23":0.75,"24":0.5,"25":0.5,"26":0.75,"27":0.5,"28":0.5,"29":0.5,"30":0,"31":0.5};
  const VALID_PRESETS = new Set(["7", "10", "15"]);
  const TRIP = new Map();
  let tripPresetDays = null;
  let tripDirection = null;
  let activePreset = "10";
  let activeDirection = "counterclockwise";
  let lastFocus = null;

  const byId = (id) => document.getElementById(id);
  const stopCard = (id) => byId(`stop-${id}`);
  const stopName = (id) => stopCard(id)?.querySelector(".stop-name")?.textContent.trim() || `Stop ${id}`;
  const shortStopName = (id) => stopName(id).replace(/, (Wisconsin|Michigan|Minnesota|Ontario.*)$/i, "").replace(/, Trip Complete$/, "");
  const selectedIds = () => Array.from(TRIP.keys());

  function trackCircleTour(action, data = {}) {
    if (typeof window.va === "function") {
      window.va("event", {name: "Circle Tour Planner", data: {action, ...data}});
    }
  }

  function setButtonState(id, selected) {
    const button = document.querySelector(`.add-btn[data-id="${id}"]`);
    if (!button) return;
    button.classList.toggle("added", selected);
    button.textContent = selected ? "✓ Added" : "+ Add";
    button.setAttribute("aria-pressed", String(selected));
  }

  function estimatedDays() {
    if (tripPresetDays) return tripPresetDays;
    return Math.ceil(selectedIds().reduce((sum, id) => sum + (DAYS[id] || 0), 0));
  }

  function updatePlanQuery() {
    const url = new URL(window.location.href);
    const ids = selectedIds();
    if (ids.length) {
      url.searchParams.set("plan", ids.join(","));
      if (tripPresetDays) {
        url.searchParams.set("itinerary", String(tripPresetDays));
        url.searchParams.set("direction", tripDirection || "counterclockwise");
      } else {
        url.searchParams.delete("itinerary");
        url.searchParams.delete("direction");
      }
    } else {
      url.searchParams.delete("plan");
      url.searchParams.delete("itinerary");
      url.searchParams.delete("direction");
    }
    history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function renderTripList(container, emptyCopy) {
    container.replaceChildren();
    const ids = selectedIds();
    if (!ids.length) {
      const empty = document.createElement("p");
      empty.className = "trip-empty";
      empty.textContent = emptyCopy;
      container.append(empty);
      return;
    }
    ids.forEach((id) => {
      const item = document.createElement("div");
      item.className = "trip-item";
      const name = document.createElement("span");
      name.className = "trip-item-name";
      name.textContent = TRIP.get(id);
      const remove = document.createElement("button");
      remove.className = "trip-remove";
      remove.type = "button";
      remove.dataset.id = id;
      remove.setAttribute("aria-label", `Remove ${TRIP.get(id)} from my trip`);
      remove.textContent = "×";
      remove.addEventListener("click", () => removeFromTrip(id));
      item.append(name, remove);
      container.append(item);
    });
  }

  function renderTrip({syncUrl = true} = {}) {
    const ids = selectedIds();
    const days = estimatedDays();
    renderTripList(byId("tripList"), "Click + Add on any stop, or use a complete route from the map.");
    renderTripList(byId("mobileTripList"), "Add individual stops or use a complete route from the map above.");

    byId("tripTotals").style.display = ids.length ? "block" : "none";
    byId("mobileTripTotals").style.display = ids.length ? "block" : "none";
    byId("tripCount").textContent = ids.length;
    byId("mobileTripCount").textContent = ids.length;
    const duration = tripPresetDays
      ? `${days}-day published route (includes driving)`
      : `~${days} visit days plus driving (not routed)`;
    byId("tripDays").textContent = days ? duration : "–";
    byId("mobileTripDays").textContent = days ? duration : "–";
    byId("mobileTripSummary").textContent = ids.length ? `${ids.length} stops · ${duration}` : "0 stops · start building";

    document.querySelectorAll(".add-btn").forEach((button) => setButtonState(button.dataset.id, TRIP.has(button.dataset.id)));
    if (syncUrl) updatePlanQuery();
    window.dispatchEvent(new CustomEvent("circle-tour:trip-change", {detail: {ids}}));
  }

  function addToTrip(id, name = stopName(id), {measure = true} = {}) {
    id = String(id);
    if (!stopCard(id) || TRIP.has(id)) return;
    const isFirstStop = TRIP.size === 0;
    tripPresetDays = null;
    tripDirection = null;
    TRIP.set(id, name);
    renderTrip();
    if (measure && isFirstStop) trackCircleTour("planner-start");
    if (measure) trackCircleTour("stop-add", {stops: TRIP.size});
  }

  function removeFromTrip(id, {measure = true} = {}) {
    id = String(id);
    if (!TRIP.has(id)) return;
    TRIP.delete(id);
    tripPresetDays = null;
    tripDirection = null;
    renderTrip();
    if (measure) trackCircleTour("stop-remove", {stops: TRIP.size});
  }

  function setTrip(ids, {preset = null, direction = activeDirection, measure = true} = {}) {
    const wasEmpty = TRIP.size === 0;
    TRIP.clear();
    Array.from(new Set(ids.map(String))).forEach((id) => {
      if (stopCard(id)) TRIP.set(id, stopName(id));
    });
    tripPresetDays = preset ? Number(preset) : null;
    tripDirection = tripPresetDays ? direction : null;
    renderTrip();
    if (measure && wasEmpty && TRIP.size) trackCircleTour("planner-start");
    if (measure) trackCircleTour("preset-use", {days: tripPresetDays, direction, stops: TRIP.size});
  }

  function clearTrip({measure = true} = {}) {
    const stops = TRIP.size;
    TRIP.clear();
    tripPresetDays = null;
    tripDirection = null;
    renderTrip();
    if (measure && stops) trackCircleTour("planner-clear", {stops});
  }

  function itinerary(days) {
    const panel = byId(`itin-${days}`);
    return Array.from(panel.querySelectorAll(".itin-day")).map((element) => {
      const label = element.querySelector(".day-label")?.textContent.trim() || "";
      return {
        day: Number(element.dataset.day),
        stops: element.dataset.stops.split(","),
        miles: element.dataset.miles === undefined || element.dataset.miles.trim() === ""
          ? null : Number(element.dataset.miles),
        summary: element.textContent.replace(label, "").trim(),
      };
    });
  }

  function displayedItinerary(days = activePreset, direction = activeDirection) {
    const route = itinerary(days);
    if (direction === "counterclockwise") return route;
    return route.slice().reverse().map((day, index) => ({
      ...day,
      day: index + 1,
      stops: day.stops.slice().reverse(),
      // Do not carry counterclockwise day prose into a clockwise itinerary.
      summary: `Clockwise: ${shortStopName(day.stops.at(-1))} → ${shortStopName(day.stops[0])}. Confirm stops, opening hours and actual drive time for this direction.`,
    }));
  }

  // Fixed, named routing destinations for ambiguous attraction names, not invented GPS coordinates.
  // The core North Shore directions intentionally follow the main Hwy 61 corridor:
  // state park side trips belong to the individual stop's verified arrival desk.
  const ROUTE_POINTS = Object.freeze({
    "1":"Duluth, Minnesota, USA",
    "8":"Houghton, Michigan, USA",
    "11":"Munising Falls Visitor Center, 1505 Sand Point Road, Munising, MI 49862, USA",
    "12":"Tahquamenon Falls Upper Falls, Paradise, Michigan, USA",
    "13":"Sault Ste. Marie, Michigan, USA",
    "14":"Sault Ste. Marie, Ontario, Canada",
    "16":"Wawa, Ontario, Canada",
    "17":"White River, Ontario, Canada",
    "18":"Marathon, Ontario, Canada",
    "19":"Nipigon, Ontario, Canada",
    "20":"Thunder Bay, Ontario, Canada",
    "21":"Pigeon River Border Crossing, Ontario, Canada",
    "22":"Grand Portage, Minnesota, USA",
    "23":"Grand Marais, Minnesota, USA",
    "29":"Two Harbors, Minnesota, USA",
    "30":"Duluth, Minnesota, USA",
    "31":"Great Lakes Shipwreck Museum, 18335 N Whitefish Point Road, Paradise, MI 49768, USA"
  });
  function routePoint(id) {
    return ROUTE_POINTS[String(id)] || `${shortStopName(id)}, Lake Superior`;
  }
  function isNorthShoreDay(ids) {
    return ["20","21","30"].every(id => ids.map(String).includes(id));
  }
  function routeWaypoints(ids, options = {}) {
    const stops = Array.isArray(ids) ? ids.map(String) : [];
    if (!stops.length) return [];
    if (isNorthShoreDay(stops)) {
      // Never silently drop arbitrary stops to satisfy Google's 8-waypoint URL limit.
      // Label this a corridor; the individual park visits are separate navigational choices.
      const corridor = ["20","21","22","23","29","30"];
      return (stops.indexOf("20") < stops.indexOf("30") ? corridor : corridor.slice().reverse()).map(routePoint);
    }
    return stops.flatMap((id, index) => {
      if (id !== "8") return [routePoint(id)];
      // A 15-day overnight in Copper Country (7 → 8) is Houghton. The
      // following day's 8 → 9 → 10 begins at Copper Harbor, not Houghton.
      const copperAtEndpoint = stops.includes("10") && (index === 0 || index === stops.length - 1);
      if (copperAtEndpoint) return ["Copper Harbor, Michigan, USA"];
      if (options.viaCopperHarbor !== true) return [routePoint(id)];
      const goingClockwise = index > 0 && stops[index - 1] === "9";
      return goingClockwise
        ? ["Copper Harbor, Michigan, USA", "Houghton, Michigan, USA"]
        : ["Houghton, Michigan, USA", "Copper Harbor, Michigan, USA"];
    });
  }
  function googleMapsUrl(ids, options = {}) {
    const names = routeWaypoints(ids, options);
    if (!names.length) return "";
    if (names.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(names[0])}`;
    }
    // This is a route query, not proof that Google resolved a location or measured mileage.
    if (names.length > 10) return "";
    const params = new URLSearchParams({
      api:"1", origin:names[0], destination:names[names.length-1], travelmode:"driving"
    });
    if (names.length > 2) params.set("waypoints", names.slice(1,-1).join("|"));
    return `https://www.google.com/maps/dir/?${params}`;
  }

  // Source-backed road facts, deliberately separate from unverified full-day mileages.
  // Dates are source-review dates, NOT live open/closed or traffic observations.
  const ROAD_EVIDENCE = Object.freeze({
    keweenaw: {
      title:"Keweenaw: Houghton is not Copper Harbor",
      text:"The normal map route uses Houghton. Copper Harbor is an extra scenic drive, and Brockway Mountain Drive is seasonal. The optional route does not inherit the published day's mileage.",
      url:"https://www.visitkeweenaw.com/things-to-do/scenic-drives/brockway-mountain-drive/",
      source:"Visit Keweenaw · Brockway Mountain Drive",
      check:"https://www.michigan.gov/drive"
    },
    pictured: {
      title:"Pictured Rocks: choose the right entrance",
      text:"NPS identifies Munising Falls Visitor Center at 1505 Sand Point Road as the reliable navigation destination. The H-58 park corridor is 52 miles between the M-28 and M-77 intersections, not the distance of this full day. H-58 is not fully plowed in winter.",
      url:"https://www.nps.gov/piro/planyourvisit/directions.htm",
      source:"National Park Service · driving directions",
      check:"https://www.nps.gov/piro/planyourvisit/winter-road-closures.htm"
    },
    whitefish: {
      title:"Whitefish Point: a spur off M-123",
      text:"From Paradise, Whitefish Point Road runs 11 miles north to the Shipwreck Museum. It is a separate side trip; the next leg returns toward Paradise. This 11-mile approach is not a full Tahquamenon-to-Sault distance.",
      url:"https://shipwreckmuseum.com/visit/admission-hours-location/",
      source:"Great Lakes Shipwreck Museum · arrival directions",
      check:"https://www.michigan.gov/drive"
    },
    ontario17: {
      title:"Northern Ontario: Highway 17, not a guaranteed ETA",
      text:"Wawa, White River, Marathon, Nipigon and Thunder Bay form a long Highway 17 corridor. Pukaskwa's Hattie Cove is a separate park approach. Check Ontario 511 for current closures and roadwork; the day-mile figure is not independently routed.",
      url:"https://511on.ca/",
      source:"Ontario 511 · road conditions and closures",
      check:"https://news.ontario.ca/en/release/1008058/ontario_expanding_trans_canada_highway_near_nipigon"
    },
    northshore: {
      title:"Thunder Bay to Duluth: the Highway 61 corridor",
      text:"Destination Ontario reports about 38 miles from Thunder Bay to Pigeon River. NPS separately places Grand Portage about 50 miles from Thunder Bay and 150 from Duluth; another touring guide publishes about 190 miles Thunder Bay–Duluth. These are approximate references with different endpoints, not additive measured legs. The route link uses core towns and the border, not every park trailhead.",
      url:"https://www.destinationontario.com/en-ca/travel-resources/ontario-lake-superior-road-trip",
      source:"Destination Ontario · Pigeon River approach",
      check:"https://www.nps.gov/grpo/planyourvisit/directions.htm"
    }
  });
  function roadEvidenceForDay(day) {
    const ids = Array.isArray(day?.stops) ? day.stops.map(String) : [];
    const evidence=[];
    if (ids.includes("8")) evidence.push(ROAD_EVIDENCE.keweenaw);
    if (ids.includes("11")) evidence.push(ROAD_EVIDENCE.pictured);
    if (ids.includes("31")) evidence.push(ROAD_EVIDENCE.whitefish);
    if (ids.length > 1 && ids.some(id => ["17","18","19"].includes(id))) evidence.push(ROAD_EVIDENCE.ontario17);
    if (isNorthShoreDay(ids)) evidence.push(ROAD_EVIDENCE.northshore);
    return evidence;
  }

  function allRouteIds(route) {
    const ids = [];
    route.forEach((day) => day.stops.forEach((id) => {
      if (!ids.includes(id)) ids.push(id);
    }));
    return ids;
  }

  // These are editorial day estimates, not map-provider routed distances.
  // Fail closed on broken continuity, missing miles, or a loop that does not return to Duluth.
  function publishedRouteMiles(route) {
    if (!Array.isArray(route) || !route.length) return null;
    let total = 0;
    for (let index = 0; index < route.length; index++) {
      const day = route[index];
      if (!day || !Array.isArray(day.stops) || !day.stops.length
        || day.stops.some(id => !/^([1-9]|[12][0-9]|3[01])$/.test(String(id)))
        || !Number.isSafeInteger(day.miles) || day.miles < 0 || day.miles > 600
        || (day.miles === 0 && day.stops[0] !== day.stops.at(-1))
        || (index > 0 && route[index - 1].stops.at(-1) !== day.stops[0])) return null;
      total += day.miles;
    }
    const first = route[0].stops[0], last = route.at(-1).stops.at(-1);
    return (first === "1" && last === "30") || (first === "30" && last === "1") ? total : null;
  }

  function renderRoutePreview() {
    const route = displayedItinerary();
    const directionLabel = activeDirection === "counterclockwise" ? "counterclockwise" : "clockwise";
    byId("routePreviewTitle").textContent = `${activePreset}-Day ${activePreset === "7" ? "Highlights" : activePreset === "10" ? "Balanced Route" : "Chris's Route"}`;
    const editorialTotal = publishedRouteMiles(route);
    const total = window.CircleTourRust?.verifyPreset
      ? window.CircleTourRust.verifyPreset(route, editorialTotal, activeDirection)
      : editorialTotal;
    const summary = byId("routePreviewMeta");
    summary.replaceChildren(document.createTextNode(total === null
      ? `A ${directionLabel} Duluth loop · mileage not reconciled; check daily directions. `
      : `A ${directionLabel} Duluth loop · ~${total.toLocaleString("en-US")} mi from published day estimates, not a routed distance. The signed Circle Tour is about 1,300 mi; detours add mileage. `));
    const official = document.createElement("a");
    official.href = "https://superiorcountry.ca/touring/drive-and-rv-tours/lake-superior-circle-tour/";
    official.target = "_blank";
    official.rel = "noopener noreferrer";
    official.textContent = "Official route reference";
    summary.append(official);
    byId("usePresetRoute").textContent = `Use this ${activePreset}-day route`;
    byId("routeDetailLink").href = `#itin-${activePreset}`;
    byId("routeDetailLink").textContent = activeDirection === "clockwise"
      ? "Read the original counterclockwise guide"
      : "Read the full itinerary";

    const list = byId("routeDayList");
    list.replaceChildren();
    route.forEach((day) => {
      const item = document.createElement("div");
      item.className = "route-day";
      const number = document.createElement("span");
      number.className = "route-day-number";
      number.textContent = day.day;
      const copy = document.createElement("div");
      const heading = document.createElement("strong");
      heading.textContent = day.miles === 0 ? `Day ${day.day} · stay day`
        : Number.isFinite(day.miles) && day.miles > 0 ? `Day ${day.day} · ~${day.miles} mi`
        : `Day ${day.day} · mileage unverified`;
      const endpoints = document.createElement("span");
      endpoints.textContent = day.stops.length > 1 ? `${shortStopName(day.stops[0])} → ${shortStopName(day.stops.at(-1))}` : shortStopName(day.stops[0]);
      const directions = document.createElement("a");
      directions.href = googleMapsUrl(day.stops);
      directions.target = "_blank";
      directions.rel = "noopener";
      directions.textContent = day.stops.length > 1
        ? (isNorthShoreDay(day.stops) ? "Map the Hwy 61 driving corridor →" : "Open day waypoints in Google Maps →")
        : "Open this stop in Google Maps →";
      directions.addEventListener("click", () => trackCircleTour("directions-open", {days: Number(activePreset), day: day.day, direction: activeDirection}));
      copy.append(heading, endpoints);
      if (Number.isFinite(day.miles) && day.miles >= 250) {
        const longDrive = document.createElement("small");
        longDrive.textContent = "Long driving day. Choose one main outing and verify actual travel time.";
        copy.append(document.createElement("br"), longDrive);
      }
      if (activeDirection === "clockwise") {
        const note = document.createElement("small");
        note.textContent = "Reversed route; daily descriptions below are written counterclockwise.";
        copy.append(document.createElement("br"), note);
      }
      copy.append(document.createElement("br"), directions);
      const roadNotes = roadEvidenceForDay(day);
      if (roadNotes.length) {
        const details = document.createElement("details");
        details.className = "route-road-evidence";
        const summary = document.createElement("summary");
        summary.textContent = "Road reality · verified sources and detours";
        details.append(summary);
        for (const entry of roadNotes) {
          const note = document.createElement("div");
          note.className = "route-road-note";
          const heading = document.createElement("strong");
          heading.textContent = entry.title;
          const copyText = document.createElement("p");
          copyText.textContent = entry.text;
          const official = document.createElement("a");
          official.href = entry.url;
          official.target = "_blank";
          official.rel = "noopener noreferrer";
          official.textContent = entry.source;
          const status = document.createElement("a");
          status.href = entry.check;
          status.target = "_blank";
          status.rel = "noopener noreferrer";
          status.textContent = "Check the controlling road/park source";
          note.append(heading, copyText, official, document.createTextNode(" · "), status);
          if (entry === ROAD_EVIDENCE.keweenaw && !(
            day.stops.includes("10") && (day.stops[0] === "8" || day.stops.at(-1) === "8")
          )) {
            const extra = document.createElement("a");
            extra.href = googleMapsUrl(day.stops, {viaCopperHarbor:true});
            extra.target = "_blank";
            extra.rel = "noopener noreferrer";
            extra.textContent = "Map Copper Harbor detour (extra mileage)";
            note.append(document.createTextNode(" · "), extra);
          }
          details.append(note);
        }
        copy.append(details);
      }
      item.append(number, copy);
      list.append(item);
    });
    window.dispatchEvent(new CustomEvent("circle-tour:preset-change", {detail: {days: Number(activePreset), direction: activeDirection, itinerary: route}}));
  }

  function activatePreset(days, {measure = true} = {}) {
    days = String(days);
    if (!VALID_PRESETS.has(days)) return;
    activePreset = days;
    document.querySelectorAll(".preset-btn").forEach((button) => {
      const active = button.dataset.preset === days;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    document.querySelectorAll(".itin-tab").forEach((tab) => {
      const active = tab.dataset.itin === days;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    document.querySelectorAll(".itin-panel").forEach((panel) => panel.classList.toggle("active", panel.id === `itin-${days}`));
    renderRoutePreview();
    if (measure) trackCircleTour("sample-itinerary", {days: Number(days), source: "planner"});
  }

  function activateDirection(direction, {measure = true} = {}) {
    if (!new Set(["counterclockwise", "clockwise"]).has(direction)) return;
    activeDirection = direction;
    document.querySelectorAll(".direction-btn").forEach((button) => {
      const active = button.dataset.direction === direction;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    renderRoutePreview();
    if (measure) trackCircleTour("direction-change", {direction, days: Number(activePreset)});
  }

  function setShareStatus(message) {
    document.querySelectorAll("[data-share-status]").forEach((element) => { element.textContent = message; });
  }

  async function shareTrip() {
    if (!TRIP.size) {
      setShareStatus("Add a stop or choose a complete route first.");
      return;
    }
    updatePlanQuery();
    const url = window.location.href;
    const payload = {title: "My Lake Superior Circle Tour", text: `${TRIP.size}-stop Lake Superior Circle Tour plan`, url};
    try {
      if (navigator.share) {
        await navigator.share(payload);
        setShareStatus("Trip shared.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareStatus("Shareable trip link copied.");
      } else {
        window.prompt("Copy this shareable trip link:", url);
        setShareStatus("Shareable trip link ready.");
      }
      trackCircleTour("trip-share", {stops: TRIP.size, days: estimatedDays()});
    } catch (error) {
      if (error?.name !== "AbortError") setShareStatus("Could not share automatically. Copy the page URL instead.");
    }
  }

  function openMobileTrip() {
    const sheet = byId("mobileTripSheet");
    lastFocus = document.activeElement;
    sheet.removeAttribute("inert");
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    byId("mobileTripBackdrop").classList.add("open");
    byId("mobileTripTrigger").setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    byId("mobileTripClose").focus();
    trackCircleTour("mobile-trip-open", {stops: TRIP.size});
  }

  function closeMobileTrip() {
    const sheet = byId("mobileTripSheet");
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    sheet.setAttribute("inert", "");
    byId("mobileTripBackdrop").classList.remove("open");
    byId("mobileTripTrigger").setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocus?.focus) lastFocus.focus();
  }

  function applyFilters() {
    let shown = 0;
    document.querySelectorAll(".stop-card").forEach((card) => {
      const activities = (card.dataset.acts || "").split(" ");
      const hide = (window.circleTourRegion !== "all" && card.dataset.seg !== window.circleTourRegion && card.dataset.seg !== "start") ||
        (window.circleTourActivity !== "all" && !activities.includes(window.circleTourActivity));
      card.classList.toggle("hidden", hide);
      if (!hide) shown += 1;
    });
    document.querySelectorAll(".seg-section").forEach((section) => {
      const region = section.id.replace("seg-", "");
      section.classList.toggle("hidden", window.circleTourRegion !== "all" && region !== window.circleTourRegion && region !== "start");
    });
    byId("resultBar").textContent = `Showing ${shown} of 31 stops`;
    window.dispatchEvent(new CustomEvent("circle-tour:filter-change", {detail: {region: window.circleTourRegion, activity: window.circleTourActivity}}));
  }

  function restoreSharedPlan() {
    const params = new URLSearchParams(window.location.search);
    const restoredPreset = params.get("itinerary");
    const restoredDirection = params.get("direction");
    if (VALID_PRESETS.has(restoredPreset)) activePreset = restoredPreset;
    if (["counterclockwise", "clockwise"].includes(restoredDirection)) activeDirection = restoredDirection;
    const ids = (params.get("plan") || "").split(",").filter((id, index, all) => stopCard(id) && all.indexOf(id) === index);
    ids.forEach((id) => TRIP.set(id, stopName(id)));
    if (ids.length && VALID_PRESETS.has(restoredPreset)) {
      tripPresetDays = Number(restoredPreset);
      tripDirection = activeDirection;
    }
  }

  window.CircleTourPage = {
    addStop: addToTrip,
    removeStop: removeFromTrip,
    toggleStop(id) { TRIP.has(String(id)) ? removeFromTrip(id) : addToTrip(id); },
    setTrip,
    hasStop(id) { return TRIP.has(String(id)); },
    selectedIds,
    track: trackCircleTour,
  };

  restoreSharedPlan();
  renderTrip({syncUrl: false});
  activateDirection(activeDirection, {measure: false});
  activatePreset(activePreset, {measure: false});

  document.querySelectorAll(".stop-header").forEach((header) => {
    const control = header.querySelector(".stop-main");
    control.tabIndex = 0;
    control.setAttribute("role", "button");
    control.setAttribute("aria-expanded", "false");
    const toggle = () => {
      const card = header.closest(".stop-card");
      card.classList.toggle("open");
      const open = card.classList.contains("open");
      control.setAttribute("aria-expanded", String(open));
      header.querySelector(".stop-toggle").textContent = open ? "▲" : "▼";
      if (open) window.dispatchEvent(new CustomEvent("circle-tour:stop-open", {detail: {id: card.id.replace("stop-", "")}}));
    };
    header.addEventListener("click", (event) => { if (!event.target.classList.contains("add-btn")) toggle(); });
    control.addEventListener("keydown", (event) => {
      if (["Enter", " "].includes(event.key)) {
        event.preventDefault();
        toggle();
      }
    });
  });

  document.querySelectorAll(".add-btn").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.id;
    TRIP.has(id) ? removeFromTrip(id) : addToTrip(id);
  }));

  window.circleTourRegion = "all";
  window.circleTourActivity = "all";
  document.querySelectorAll(".seg-tab").forEach((tab) => tab.addEventListener("click", () => {
    document.querySelectorAll(".seg-tab").forEach((item) => item.classList.remove("active"));
    tab.classList.add("active");
    window.circleTourRegion = tab.dataset.seg;
    applyFilters();
    trackCircleTour("region-filter", {region: window.circleTourRegion});
  }));
  document.querySelectorAll(".ftag").forEach((tag) => tag.addEventListener("click", () => {
    document.querySelectorAll(".ftag").forEach((item) => item.classList.remove("on"));
    tag.classList.add("on");
    window.circleTourActivity = tag.dataset.act;
    applyFilters();
    trackCircleTour("activity-filter", {activity: window.circleTourActivity});
  }));

  document.querySelectorAll(".preset-btn").forEach((button) => button.addEventListener("click", () => activatePreset(button.dataset.preset)));
  document.querySelectorAll(".itin-tab").forEach((tab) => tab.addEventListener("click", () => activatePreset(tab.dataset.itin)));
  document.querySelectorAll(".direction-btn").forEach((button) => button.addEventListener("click", () => activateDirection(button.dataset.direction)));
  byId("usePresetRoute").addEventListener("click", () => setTrip(allRouteIds(displayedItinerary()), {preset: Number(activePreset), direction: activeDirection}));
  document.querySelectorAll("[data-share-trip]").forEach((button) => button.addEventListener("click", shareTrip));
  byId("clearTrip").addEventListener("click", clearTrip);
  document.querySelectorAll("[data-clear-trip]").forEach((button) => button.addEventListener("click", clearTrip));
  byId("mobileTripTrigger").addEventListener("click", openMobileTrip);
  byId("mobileTripClose").addEventListener("click", closeMobileTrip);
  byId("mobileTripBackdrop").addEventListener("click", closeMobileTrip);
  document.addEventListener("keydown", (event) => {
    const sheet = byId("mobileTripSheet");
    if (!sheet.classList.contains("open")) return;
    if (event.key === "Escape") {
      closeMobileTrip();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = Array.from(sheet.querySelectorAll('button:not([disabled]),a[href]')).filter((element) => !element.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  // Live Lake Superior water level from NOAA Tides & Currents, Duluth station 9099064.
  (async function loadLiveLevel() {
    try {
      const url = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?date=latest&station=9099064&product=water_level&datum=LWD&time_zone=lst&units=english&format=json";
      const response = await fetch(url);
      const data = await response.json();
      if (!data?.data?.[0]?.v) throw new Error("No current water level");
      const value = Number.parseFloat(data.data[0].v).toFixed(2);
      const date = (data.data[0].t || "").split(" ")[0];
      byId("liveData").textContent = `${value} ft above LWD at Duluth · ${date}`;
    } catch (error) {
      byId("liveData").innerHTML = '<a href="https://greatlakeslevels.org" target="_blank" rel="noopener" style="color:#7bc8e8">Check current level →</a>';
    }
  })();

  function escapeHtml(value) {
    return value.replace(/[&<>"']/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
  }

  window.printTrip = function printTrip() {
    const ids = selectedIds();
    if (!ids.length) {
      window.alert("Add stops to your trip first, or use one of the complete routes above.");
      return;
    }
    const days = estimatedDays();
    const printDuration = tripPresetDays
      ? `${days}-day published itinerary, including driving`
      : `~${days} indicative visit days plus driving (not optimized)`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Pop-up blocked. Please allow pop-ups and try again.");
      return;
    }
    trackCircleTour("print-itinerary", {stops: ids.length, days});
    const stops = ids.map((id, index) => {
      const card = stopCard(id);
      const name = card.querySelector(".stop-name")?.textContent || "";
      const sub = card.querySelector(".stop-sub")?.textContent || "";
      const description = card.querySelector(".stop-desc")?.textContent || "";
      return `<div class="stop"><h2><span class="num">${index + 1}</span>${escapeHtml(name)}</h2>${sub ? `<p class="sub">${escapeHtml(sub)}</p>` : ""}${description ? `<p class="desc">${escapeHtml(description)}</p>` : ""}</div>`;
    }).join("");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>My Lake Superior Circle Tour</title><style>body{font-family:Georgia,Times,serif;max-width:720px;margin:30px auto;padding:0 20px;color:#222;line-height:1.7}h1{font-size:24px;border-bottom:2px solid #2c5f2d;padding-bottom:10px;color:#2c5f2d;margin-bottom:6px}.meta{font-size:11px;color:#888;letter-spacing:.5px;text-transform:uppercase;margin-bottom:24px}.stop{margin-bottom:22px;break-inside:avoid;border-left:3px solid #b8d8b8;padding:8px 14px;background:#fafaf6}.stop h2{font-size:16px;margin:0 0 4px;color:#2c5f2d;font-weight:normal}.num{display:inline-block;width:24px;height:24px;background:#2c5f2d;color:#fff;border-radius:50%;text-align:center;font-size:12px;line-height:24px;margin-right:8px;vertical-align:middle}.sub{margin:0 0 6px;font-size:13px;color:#666;font-style:italic}.desc{margin:0;font-size:13px;color:#333}.footer{margin-top:30px;font-size:11px;color:#888;border-top:1px solid #ccc;padding-top:12px}@media print{body{margin:0;font-size:11pt}}</style></head><body><h1>My Lake Superior Circle Tour</h1><div class="meta">${ids.length} selected stops · ${escapeHtml(printDuration)} · built at chrisizworski.com/lake-superior-circle-tour/</div>${stops}<div class="footer">Compiled by Chris Izworski · Updated November 2026. Verify destination access and road directions before travel.</div></body></html>`);
    printWindow.document.close();
    window.setTimeout(() => { try { printWindow.print(); } catch (error) {} }, 400);
  };

  const mapFrame = document.querySelector(".map-frame");
  const loadMap = () => import("/assets/lake-superior-circle-tour-map.js").catch(() => {
    byId("mapStatus").innerHTML = '<div class="map-unavailable"><strong>The interactive map could not load.</strong>Use the synchronized itinerary preview, Google Maps day links, and all 31 stop cards on this page.</div>';
  });
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      loadMap();
    }, {rootMargin: "400px"});
    observer.observe(mapFrame);
  } else {
    loadMap();
  }
})();
