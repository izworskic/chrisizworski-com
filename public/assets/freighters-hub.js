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
      shoreText:"Use the viewing-spot guide to choose a shoreline, then verify current AIS positions."}
  };
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
      link.href = "/great-lakes-freighter-tracking/#" + place.map;
      link.firstChild.textContent = "Show " + place.name + " traffic ";
    }
  }
  select.addEventListener("change", update);
  document.querySelectorAll('input[name="intent"]').forEach(function (radio) {
    radio.addEventListener("change", update);
  });
  update();
})();
