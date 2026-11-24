(function () {
  "use strict";
  const select = document.getElementById("corridor");
  const title = document.getElementById("finder-heading");
  const reason = document.getElementById("finder-reason");
  const caveat = document.getElementById("finder-caveat");
  const link = document.getElementById("finder-go");
  if (!select || !title || !reason || !caveat || !link) return;

  // This guide only routes people to source pages. It does NOT infer vessel arrivals or live status.
  const places = {
    soo: {name:"Soo Locks", map:"soo", shore:"/soo-locks/", location:"the Soo Locks observation deck",
      track:"Use the live AIS corridor to locate ships, then confirm named passages with Soo Locks sources.",
      shoreText:"Use the locks' dedicated ship and visitor page for passage resources before visiting."},
    duluth: {name:"Duluth–Superior", map:"duluth", shore:"/duluth-canal-park/", location:"Canal Park",
      track:"Check vessel positions in western Lake Superior and the ship canal approaches.",
      shoreText:"Use the Canal Park ship-watch planner for evidence-bounded passage windows and cameras."},
    detroit: {name:"Detroit River", map:"detroit", shore:"/detroit-river-freighters/", location:"the Detroit Riverfront",
      track:"Follow current AIS vessel reports on the river corridor.",
      shoreText:"Check the Detroit tool for a fresh moving-vessel watch opportunity and safety gates."},
    saginaw: {name:"Saginaw Bay", map:"saginaw", shore:"/great-lakes-ship-watching-spots/", location:"Bay City's riverfront",
      track:"Check the Saginaw Bay corridor and river approach for reported ship positions.",
      shoreText:"Find public Bay City viewing locations, then confirm a ship is actually inbound on the AIS map."},
    "port-huron": {name:"Port Huron", map:"port-huron", shore:"/great-lakes-ship-watching-spots/", location:"Vantage Point",
      track:"Use the upper St. Clair River corridor view to spot reported vessel movements.",
      shoreText:"Compare public waterfront viewing locations, then check the upper St. Clair River AIS reports."},
    mackinac: {name:"Straits of Mackinac", map:"mackinac", shore:"/great-lakes-ship-watching-spots/", location:"Mackinaw City or St. Ignace",
      track:"Check the Straits of Mackinac map for ships between lakes Michigan and Huron.",
      shoreText:"Use the viewing-spot guide to choose a shoreline, then verify current AIS positions."},
    calumet: {name:"Calumet River", shore:"/calumet-freighter-watch/", location:"the 95th Street Bridge area",
      track:"Chicago's working river has its own recent AIS map and bridge guide. Check the report time before heading out.",
      shoreText:"Watch for the drawbridge and industrial channel near 95th Street. Confirm public sidewalk access before visiting."},
    cuyahoga: {name:"Cuyahoga River", shore:"/cuyahoga-freighter-watch/", location:"Scranton Flats Pier or Wendy Park",
      track:"Check Cleveland's river-specific AIS reports and follow the bends toward Lake Erie.",
      shoreText:"Compare documented public riverfront parks and harbor views. A ship may not pass during your visit."},
    welland: {name:"Welland Canal", shore:"/welland-canal/", location:"Lock 3 viewing platform in St. Catharines",
      track:"Check recent canal AIS reports alongside the official lock order of turn on the Welland tool.",
      shoreText:"Start at the museum viewing platform at Lock 3, or compare Lock 7 and Port Colborne on the canal guide."},
    seaway: {name:"St. Lawrence Seaway", shore:"/st-lawrence-seaway/", location:"Eisenhower Lock or Iroquois Point",
      track:"Follow recent ship reports along the Montreal to Lake Ontario corridor on the Seaway tool.",
      shoreText:"Compare documented public viewing locations on both sides of the river, then check access and ship reports."}
  };
  const aliases = {
    soo:["soo","soo locks","sault ste marie","st marys river"], duluth:["duluth","superior","canal park","duluth ship canal"],
    detroit:["detroit","belle isle","detroit riverfront"], saginaw:["saginaw","bay city","saginaw bay"],
    "port-huron":["port huron","blue water bridge","st clair river","vantage point"],
    mackinac:["mackinac","mackinaw city","st ignace"], calumet:["calumet","chicago","95th street","calumet park"],
    cuyahoga:["cuyahoga","cleveland","scranton flats","wendy park","rivergate park","heritage park"],
    welland:["welland","st catharines","thorold","lock 3","lock 7","port colborne","niagara"],
    seaway:["st lawrence","seaway","eisenhower lock","iroquois point","massena","montreal"]
  };
  const normalize = value => String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  function matchingPlaces(value) {
    const query = normalize(value);
    if (!query) return [];
    const padded = " " + query + " ";
    return Object.keys(aliases).filter(key => aliases[key].some(alias => padded.includes(" " + alias + " ")));
  }
  const search = document.getElementById("finder-search");
  const query = document.getElementById("finder-query");
  const searchGo = document.getElementById("finder-search-go");
  const searchStatus = document.getElementById("finder-search-status");
  if (search && query && searchGo && searchStatus) {
    search.hidden = false;
    const find = () => {
      const matches = matchingPlaces(query.value);
      if (matches.length !== 1) {
        searchStatus.textContent = matches.length ? "More than one corridor matches. Try one place name or choose below." : "No matching corridor. Try a city, river or lock name, or choose below.";
        return;
      }
      select.value = matches[0];
      update();
      searchStatus.textContent = "Selected " + places[matches[0]].name + ".";
    };
    searchGo.addEventListener("click", find);
    query.addEventListener("keydown", event => { if (event.key === "Enter") { event.preventDefault(); find(); } });
    select.addEventListener("change", () => { query.value = ""; searchStatus.textContent = ""; });
  }
  function update() {
    const place = places[select.value] || places.soo;
    const checked = document.querySelector('input[name="intent"]:checked');
    const intent = checked ? checked.value : "track";
    if (intent === "shore") {
      title.textContent = place.name + ": plan a shore watch";
      reason.textContent = place.shoreText + " Suggested shore area: " + place.location + ".";
      caveat.textContent = "A shore view is not a scheduled vessel arrival. Verify fresh AIS before traveling.";
      link.href = place.shore;
      link.firstChild.textContent = "Plan a viewing stop ";
    } else if (intent === "news") {
      title.textContent = "Read recent Great Lakes ship reports";
      reason.textContent = "The Great Lakes Gazette publishes reported vessel movements and port activity. For a current position near " + place.name + ", also check the AIS tracker.";
      caveat.textContent = "A published report is not a continuous live vessel position.";
      link.href = "https://gazette.chrisizworski.com/";
      link.firstChild.textContent = "Read the Gazette ";
    } else {
      title.textContent = place.name + ": locate the ships";
      reason.textContent = place.track;
      caveat.textContent = "Check the vessel's last reported AIS timestamp. Public coverage can be delayed or incomplete.";
      link.href = place.map ? "/great-lakes-freighter-tracking/#" + place.map : place.shore;
      link.firstChild.textContent = "Show " + place.name + " traffic ";
    }
  }
  select.addEventListener("change", update);
  document.querySelectorAll('input[name="intent"]').forEach(function (radio) {
    radio.addEventListener("change", update);
  });

  // Live tracking remains with the proven shared AIS map engine.
  // Choose the already-rendered corridor in place; the dedicated tracker is
  // the fallback when Leaflet or the embedded map cannot initialize.
  link.addEventListener("click", function (event) {
    const intentInput = document.querySelector('input[name="intent"]:checked');
    if (!intentInput || intentInput.value !== "track") return;
    const place = places[select.value] || places.soo;
    if (!place.map) return; // Specialist corridors own their own map and data.
    const mapNode = document.getElementById("freighterMap");
    const tab = document.querySelector('.view-tab[data-freighter-view="' + place.map + '"]');
    if (!mapNode || !tab || typeof window.L === "undefined" || !mapNode.classList.contains("leaflet-container")) return;
    event.preventDefault();
    tab.click();
    document.getElementById("live-map").scrollIntoView({
      behavior: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start"
    });
  });

  update();
})();
