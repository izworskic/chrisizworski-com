/* Porcupine Mountains visitor decision desk
 * Evidence mode: recommendations are candidates, not verified real-time routes.
 * Never infer road openings, parking supply, walking ETA or river conditions.
 */
(function (root) {
  "use strict";
  var DNR = "https://www.michigan.gov/recsearch/parks/porkies";
  var MAP = "https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/porcupine_mountains_map.pdf";
  var SKI = "https://www.michigan.gov/skitheporkies/the-mountain/trail-and-snow-report";
  var REFERENCES = {
    clouds: { name: "Lake of the Clouds overlook", zone: "east", url: DNR, detail: "The DNR describes a roughly 100-yard paved or boardwalk approach. It does not mean the Escarpment Trail is accessible." },
    falls: { name: "Presque Isle River waterfalls", zone: "west", url: "/upper-peninsula-waterfalls/manabezho-falls/", detail: "Choose among signed viewing paths. Stairs, rock and river hazards vary; Nawadaha has a separately documented accessible platform." },
    summit: { name: "Summit Peak", zone: "central", url: DNR, detail: "About a half-mile approach, then steps and a tower; not a step-free experience." },
    visitor: { name: "Union Bay / visitor center area", zone: "east", url: DNR, detail: "Visitor center operates seasonally; check posted hours before treating it as an indoor stop." },
    backcountry: { name: "A sourced wilderness hike", zone: "interior", url: MAP, detail: "Pick a specific trail and trailhead using the DNR map; distance, ford and return logistics must be independently verified." }
  };
  function seasonFor(iso) {
    var m = /^(\d{4})-(\d\d)-(\d\d)$/.exec(String(iso || ""));
    if (!m) return "unknown";
    var month = Number(m[2]), day = Number(m[3]);
    if (month < 1 || month > 12 || day < 1 || day > 31) return "unknown";
    var actual = new Date(Date.UTC(Number(m[1]), month - 1, day));
    if (actual.getUTCFullYear() !== Number(m[1]) || actual.getUTCMonth() !== month - 1 || actual.getUTCDate() !== day) return "unknown";
    if (month === 12 || month <= 4) return "winter";
    if (month === 5) return "reopening";
    if (month === 11) return "prewinter";
    return "ordinary";
  }
  function entryZone(arrival) { return arrival === "west" ? "west" : arrival === "east" ? "east" : "unknown"; }
  function recommend(input) {
    input = input || {};
    var hours = [2, 4, 8, 16].includes(Number(input.hours)) ? Number(input.hours) : 4;
    var arrival = ["west", "east", "inpark"].includes(input.arrival) ? input.arrival : "inpark";
    var ability = ["low", "moderate", "high"].includes(input.ability) ? input.ability : "moderate";
    var interest = ["views", "falls", "forest", "mix"].includes(input.interest) ? input.interest : "mix";
    var season = seasonFor(input.date);
    var note = "No driving ETA, actual road opening, parking vacancy or same-day trail conditions have been verified. Consult DNR road and trail notices before leaving.";
    var output = { mode: season, time: hours, stops: [], excluded: [], warnings: [note], sources: [{ name: "Official park information", url: DNR }, { name: "Official park & trail map", url: MAP }] };
    if (season === "unknown") {
      output.title = "Choose a valid travel date";
      output.intro = "The travel date must be supplied to distinguish regular visitor access from winter restrictions.";
      output.excluded.push("All specific route recommendations until a valid travel date is entered.");
      return output;
    }
    if (season === "winter" || season === "reopening") {
      output.title = season === "winter" ? "Plan around winter road access" : "Spring road reopening must be confirmed";
      output.intro = "The DNR closes portions of M-107 and South Boundary Road to vehicles starting December 1, reopening only when the county road commission deems them safe. Presque Isle has a separate County Road 519 approach, but individual parking and trails still need checking.";
      output.excluded.push("Lake of the Clouds summer road approach: not assumed available.");
      output.excluded.push("Summit Peak summer road approach: not assumed available.");
      output.excluded.push("Cross-park waterfall-to-overlook drive: not recommended without an official road-opening confirmation.");
      if (arrival === "west" || (arrival === "inpark" && interest === "falls")) {
        output.stops.push({ name: "Presque Isle River scenic-area access (County Road 519)", zone: "west", url: DNR, detail: "DNR identifies the County Road 519 approach as available despite the park's other road closures. The exact lot, walking surface, waterfall trails and current conditions are not confirmed." });
        if (ability === "low") output.warnings.push("Only Nawadaha's observation platform is separately documented as accessible; do not assume the entire waterfall walk is barrier-free.");
      } else if (season === "winter") {
        output.stops.push({ name: "Winter Sports Complex (eastern approach)", zone: "east", url: SKI, detail: "Potential winter activity area, approached from the east. Check operations, ski/snow report, parking and activities; no opening is inferred." });
        output.sources.push({ name: "Official Ski the Porkies conditions", url: SKI });
      } else {
        output.stops.push({ name: "Visitor Center Nature Trail area (eastern approach)", zone: "east", url: DNR, detail: "A conservative east-side reference while M-107 and South Boundary Road reopening is uncertain. Check whether the visitor center, trail parking and services have reopened." });
      }
      output.warnings.push("Do not use the closed sections of M-107 or South Boundary Road as a through-park vehicle shortcut. Check DNR/county notices and follow posted signs.");
      return output;
    }
    if (season === "prewinter") output.warnings.push("November travel can encounter weather-related restrictions ahead of the December seasonal closure; confirm the latest park and county road notices.");
    if (hours <= 4) {
      var zone = entryZone(arrival);
      var primary = zone === "west" ? "falls" : zone === "east" ? "clouds" :
        interest === "falls" ? "falls" : interest === "forest" && ability !== "low" ? "summit" : "clouds";
      if (ability === "low" && primary === "summit") primary = "clouds";
      output.stops.push(REFERENCES[primary]);
      if (hours === 4 && primary === "clouds") output.stops.push(REFERENCES.visitor);
      output.title = hours === 2 ? "Choose one district, not the whole park" : "Build around one anchor area";
      output.intro = "With limited time, staying near your approach is more honest than promising multiple park districts. These are suggested experiences, not confirmed trip-duration calculations.";
      if (zone === "west" && interest === "views") output.excluded.push("Lake of the Clouds is in a different area: no verified cross-park driving time to justify squeezing it into this visit.");
      if (zone === "east" && interest === "falls") output.excluded.push("Presque Isle falls require a separate west-side approach; no cross-park driving time has been verified.");
      output.excluded.push("Summit Peak plus both river and lake districts cannot be assumed feasible on this time budget.");
      if (ability === "low" && primary === "falls") output.warnings.push("Only the Nawadaha observation platform is specifically identified as accessible; the full waterfalls walking circuit is not.");
    } else if (hours === 8) {
      var east = arrival !== "west";
      output.stops.push(REFERENCES[east ? "clouds" : "falls"]);
      output.stops.push(REFERENCES.summit);
      output.title = "Two experience areas, with a driving check";
      output.intro = "A full day could support a signature view and a second distinct experience, but only after confirming access and actual road travel between them.";
      output.excluded.push(east ? "The western Presque Isle waterfalls are a separate drive and are not counted as a guaranteed third stop." : "Lake of the Clouds is a possible third stop only after confirming the whole route.");
      if (ability === "low") {
        output.stops = [REFERENCES[east ? "clouds" : "falls"], REFERENCES.visitor];
        output.excluded.push("Summit Peak tower excluded because its stairs do not match a short or accessible approach.");
      } else if (interest === "forest" && ability === "high") {
        output.stops = [REFERENCES.summit, REFERENCES.backcountry];
        output.excluded.push("No loop, ford, elevation, hiking-time or trail-distance claim until DNR geometry and return logistics are reconciled.");
      }
    } else {
      output.title = "Two days lets the park unfold";
      output.intro = "Divide the journey into separate western, central and eastern experiences, instead of treating all three as adjacent. Choose an overnight location through official park reservations.";
      var ids = arrival === "west" ? ["falls", "summit", "clouds"] : ["clouds", "summit", "falls"];
      if (ability === "low") ids = arrival === "west" ? ["falls", "clouds", "visitor"] : ["clouds", "visitor", "falls"];
      output.stops = ids.map(function (k) { return REFERENCES[k]; });
      if (interest === "forest" && ability === "high") output.stops.push(REFERENCES.backcountry);
      output.excluded.push("Backcountry lodging and camping availability are not checked or implied by this plan.");
      output.sources.push({ name: "DNR overnight information", url: DNR });
    }
    if (output.stops.some(function (s) { return s.zone === "interior"; })) {
      output.warnings.push("No crossing-dependent Big Carp, Little Carp, Government Peak or Presque Isle wilderness traverse has an individually confirmed safe bridge or ford. Do not turn these planning references into a hiking GPS route.");
      output.excluded.push("Unverified river-to-river or ridge-to-lakeshore wilderness through-routes: official 2025 map crossing symbols and source trail segments are not yet certified as passable.");
      output.sources.push({ name: "Official DNR map: unbridged crossing symbols", url: "https://www.michigan.gov/recsearch/-/media/Project/Websites/recsearch/documents/MapsO-S/Porcupine-Mountains-State-Park-Map-GPS.pdf" });
    }
    if (ability === "low") output.warnings.push("Shorter approaches are not all barrier-free. Check specific surface, steps and viewing-platform access directly with the DNR.");
    if (output.stops.some(function (s) { return s.zone === "west"; }) && output.stops.some(function (s) { return s.zone === "east"; })) {
      output.warnings.push("This plan crosses distinct western/eastern districts; validate driving route, vehicle-access rules and local-time arrangements before using it.");
    }
    return output;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { recommend: recommend, seasonFor: seasonFor };
  if (root.document) root.PorkiesEngine = { recommend: recommend, seasonFor: seasonFor };
  if (!root.document) return;
  var doc = root.document, form = doc.getElementById("planner"), results = doc.getElementById("results");
  if (!form || !results) return;
  function elt(tag, cls, text) {
    var e = doc.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function listBlock(heading, items, className) {
    var section = elt("section", className || "");
    section.appendChild(elt("h4", "", heading));
    var ul = elt("ul");
    items.forEach(function (item) {
      var li = elt("li");
      if (typeof item === "string") { li.textContent = item; }
      else {
        var a = elt("a", "", item.name);
        a.href = item.url;
        li.appendChild(a);
        if (item.detail) li.appendChild(elt("p", "", item.detail));
      }
      ul.appendChild(li);
    });
    section.appendChild(ul);
    return section;
  }
  function render() {
    var input = { date: doc.getElementById("travel-date").value, arrival: doc.getElementById("arrival").value, hours: Number(doc.getElementById("hours").value), ability: doc.getElementById("ability").value, interest: doc.getElementById("interest").value };
    var r = recommend(input);
    results.replaceChildren(elt("p", "eyebrow", "Your preliminary field plan · check official access"), elt("h3", "", r.title), elt("p", "result-intro", r.intro));
    if (r.stops.length) results.appendChild(listBlock("Suggested experiences", r.stops, "recommendations"));
    if (r.excluded.length) results.appendChild(listBlock("What to leave out, and why", r.excluded, "excluded"));
    results.appendChild(listBlock("What still needs verification", r.warnings, "warnings"));
    results.appendChild(listBlock("Verify before you go", r.sources, "sources-list"));
    var actions = elt("div", "result-actions");
    var share = elt("button", "copy", "Copy a summary");
    share.type = "button";
    share.addEventListener("click", function () {
      var text = "Porcupine Mountains preliminary plan\n" + r.title + "\n" + r.stops.map(function (s) { return "- " + s.name + ": " + s.detail; }).join("\n") + "\nCheck DNR access and the official park map: " + DNR + "\n" + MAP + "\nNo live access/ETA claims.";
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(text).then(function () { share.textContent = "Summary copied"; }).catch(function () { fallback(text); });
      } else fallback(text);
      function fallback(value) { root.prompt("Copy your field plan", value); }
    });
    var map = elt("a", "print-link", "Open official park map");
    map.href = MAP;
    actions.appendChild(share); actions.appendChild(map);
    results.appendChild(actions);
    var u = new URL(root.location.href);
    ["arrival","hours","ability","interest"].forEach(function (id) { u.searchParams.set(id, String(input[id])); });
    u.searchParams.set("date", input.date);
    root.history.replaceState(null, "", u.pathname + u.search + u.hash);
    if (typeof root.va === "function") root.va("event", { name: "Porkies field planner", data: { hours: String(input.hours), mode: r.mode, arrival: input.arrival, interest: input.interest } });
  }
  var params = new URLSearchParams(root.location.search);
  var todayParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  var getPart = function (type) { var p = todayParts.find(function (x) { return x.type === type; }); return p ? p.value : ""; };
  var today = getPart("year") + "-" + getPart("month") + "-" + getPart("day");
  doc.getElementById("travel-date").value = params.get("date") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date")) ? params.get("date") : today;
  ["arrival","hours","ability","interest"].forEach(function (id) {
    var x = params.get(id), select = doc.getElementById(id);
    if (x && Array.from(select.options).some(function (opt) { return opt.value === x; })) select.value = x;
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    render();
    results.scrollIntoView({ behavior: root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  render();
})(typeof window !== "undefined" ? window : globalThis);
