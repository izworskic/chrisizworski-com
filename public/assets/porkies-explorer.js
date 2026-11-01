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
    clouds: { name: "Lake of the Clouds overlook", zone: "east", url: DNR, detail: "A short paved or boardwalk approach opens onto one of the park’s great views: Lake of the Clouds sheltered deep in the Carp River valley. The longer Escarpment Trail is rugged and should not be mistaken for an accessible walkway." },
    falls: { name: "Presque Isle River waterfalls", zone: "west", url: "/upper-peninsula-waterfalls/manabezho-falls/", detail: "Listen for the river before you reach the gorge. Signed paths lead toward the three falls, but expect stairs, rocks and uneven ground. The DNR separately identifies an accessible viewing platform at Nawadaha; the full river trail is not barrier-free." },
    summit: { name: "Summit Peak", zone: "central", url: DNR, detail: "Walk beneath hardwoods for about half a mile, then climb the tower for a view over forested ridges. The trail and stairs make this a more demanding stop than a roadside overlook." },
    visitor: { name: "Union Bay / visitor center area", zone: "east", url: DNR, detail: "Begin with the stories of the park at its visitor center and nearby nature trail, if seasonal hours and access allow. The forest along the eastern entrance offers a gentler introduction." },
    backcountry: { name: "A sourced wilderness hike", zone: "interior", url: MAP, detail: "There are quieter forests and river valleys beyond the scenic stops. Choose a named trail with the DNR map, and plan your return, distances and every stream crossing before stepping into the backcountry." }
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
  // 2025 DNR scenic-area guidance distinguishes lower camper/trailer staging
  // from upper scenic lots. No clearance, turn radius or available parking is certified.
  function vehicleCautions(vehicle,stops,season){
    if(vehicle!=="rv"&&vehicle!=="trailer")return [];
    var names=(stops||[]).map(function(x){return String(x.name||"").toLowerCase();}).join(" ");
    var notes=["RV, camper or trailer: turning room, parking capacity and the signed approach for your vehicle are NOT verified by this planner. Check Michigan DNR instructions before committing to a drive."];
    if(/lake of the clouds/.test(names))notes.push("Lake of the Clouds: the DNR recommends leaving campers and trailers at the middle ski hill parking area off M-107 during summer and fall. This is a staging recommendation, NOT a verified RV route, space or modern entrance coordinate.");
    if(/summit peak/.test(names))notes.push("Summit Peak: the DNR recommends leaving campers and trailers at the designated lot near the South Boundary Road turn-off before ascending the scenic-area entrance road. Its exact staging point and vehicle suitability are NOT independently mapped here.");
    if(/presque isle/.test(names))notes.push("Presque Isle: the day-use entry, contact booth, County Road 519 work-zone reopening and suitable RV/trailer turns remain unverified; the DNR river-trail parking point #841 is not a confirmed large-vehicle arrival point.");
    if(/winter sports/.test(names))notes.push("Winter Sports Complex: operating access and large-vehicle snow/parking clearance must be checked with the official winter-sports source, not inferred from the ski-trail GIS pin.");
    if((stops||[]).some(function(x){return x.zone==="west";})&&(stops||[]).some(function(x){return x.zone==="east"||x.zone==="central";}))notes.push("An RV or trailer cross-park itinerary is not verified. Treat east and west as separate approaches; do not use South Boundary Road as an assumed through-route.");
    if(season==="winter"||season==="reopening")notes.push("Seasonal M-107 and South Boundary restrictions still apply; no available winter parking or spring gate opening is claimed.");
    return notes;
  }
  function entryZone(arrival) { return arrival === "west" ? "west" : arrival === "east" ? "east" : "unknown"; }
  function recommend(input) {
    input = input || {};
    var hours = [2, 4, 8, 16].includes(Number(input.hours)) ? Number(input.hours) : 4;
    var arrival = ["west", "east", "inpark"].includes(input.arrival) ? input.arrival : "inpark";
    var ability = ["low", "moderate", "high"].includes(input.ability) ? input.ability : "moderate";
    var interest = ["views", "falls", "forest", "mix"].includes(input.interest) ? input.interest : "mix";
    var vehicle = ["car","rv","trailer"].includes(input.vehicle) ? input.vehicle : "car";
    var chosenPath = input.path==="desired" ? "desired" : "local";
    var season = seasonFor(input.date);
    var note = "No driving ETA, actual road opening, parking vacancy or same-day trail conditions have been verified. Consult DNR road and trail notices before leaving.";
    var output = { mode: season, time: hours, stops: [], excluded: [], warnings: [note], sources: [{ name: "Official park information", url: DNR }, { name: "Official park & trail map", url: MAP }] };
    function finalize(){
      output.vehicleWarnings=vehicleCautions(vehicle,output.stops,season);
      if(output.vehicleWarnings.length)output.sources.push({name:"DNR 2025 scenic-area vehicle staging guidance",url:"https://www.michigan.gov/dnr/-/media/Project/Websites/dnr/Documents/Education/visitorcenters/PMWSP-paper-23/PMWSP-Visitor-2025.pdf"});
      return output;
    }
    if (season === "unknown") {
      output.title = "Choose a valid travel date";
      output.intro = "The mountains wear a different face in every season. Choose a real travel date so we can separate ordinary scenic-road visits from winter restrictions.";
      output.excluded.push("All specific route recommendations until a valid travel date is entered.");
      return finalize();
    }
    if (season === "winter" || season === "reopening") {
      output.title = season === "winter" ? "Winter opens a different side of the Porkies" : "The forest is waking, but the scenic roads may still be closed";
      output.intro = "Snow quiets the forest and changes how you reach it. The DNR closes portions of M-107 and South Boundary Road beginning December 1 until the county road commission judges them safe. The western Presque Isle country has a separate County Road 519 approach; its parking and footpaths still need a current check.";
      output.excluded.push("Lake of the Clouds summer road approach: not assumed available.");
      output.excluded.push("Summit Peak summer road approach: not assumed available.");
      output.excluded.push("Cross-park waterfall-to-overlook drive: not recommended without an official road-opening confirmation.");
      if (arrival === "west" || (arrival === "inpark" && interest === "falls")) {
        output.stops.push({ name: "Presque Isle River scenic-area access (County Road 519)", zone: "west", url: DNR, detail: "Approach from the west on County Road 519 to seek the sound of the Presque Isle River. The DNR identifies this as a separate access corridor, but the parking area, trails and conditions on your date are not confirmed." });
        if (ability === "low") output.warnings.push("Only Nawadaha's observation platform is separately documented as accessible; do not assume the entire waterfall walk is barrier-free.");
      } else if (season === "winter") {
        output.stops.push({ name: "Winter Sports Complex (eastern approach)", zone: "east", url: SKI, detail: "When snow settles over the eastern ridges, the winter sports complex can offer a new way to experience the park. Arrive from the east and check the official snow report, operations and parking before traveling." });
        output.sources.push({ name: "Official Ski the Porkies conditions", url: SKI });
      } else {
        output.stops.push({ name: "Visitor Center Nature Trail area (eastern approach)", zone: "east", url: DNR, detail: "The eastern visitor-center area is a place to begin looking for spring forest walks, while the higher scenic roads await reopening. Confirm trail access, parking and visitor-center hours with the park." });
      }
      output.warnings.push("Do not use the closed sections of M-107 or South Boundary Road as a through-park vehicle shortcut. Check DNR/county notices and follow posted signs.");
      return finalize();
    }
    if (season === "prewinter") output.warnings.push("November can bring ice and early snow to the high roads. Enjoy the quieter season, but confirm current park and county road notices before following a scenic route.");
    if (hours <= 4) {
      var zone = entryZone(arrival);
      var primary = zone === "west" ? "falls" : zone === "east" ? "clouds" :
        interest === "falls" ? "falls" : interest === "forest" && ability !== "low" ? "summit" : "clouds";
      if (ability === "low" && primary === "summit") primary = "clouds";
      output.stops.push(REFERENCES[primary]);
      if (hours === 4 && primary === "clouds") output.stops.push(REFERENCES.visitor);
      output.title = hours === 2 ? "A little time can still hold a great view" : "Let one corner of the park be your day";
      output.intro = "The best short visit is often the one you do not rush. Stay close to the side of the park where you arrive, settle into a river walk or a high overlook, and leave the distant corners for a return trip. These suggestions are not measured driving-time routes.";
      // A short visit should never silently replace the experience a visitor asked for.
      // Offer two *different* paths, not an invented fast cross-park drive.
      if ((zone==="west"&&interest==="views")||(zone==="east"&&interest==="falls")){
        var desiredKey=interest==="views"?"clouds":"falls";
        var localRef=REFERENCES[primary],wantedRef=REFERENCES[desiredKey];
        output.tradeoff={
          active:chosenPath,local:localRef,desired:wantedRef,
          localId:primary==="falls"?"river":primary==="clouds"?"clouds":"summit",
          desiredId:desiredKey==="falls"?"river":"clouds",
          explanation:"Your arrival side and the "+(interest==="views"?"Lake of the Clouds view":"Presque Isle waterfalls")+" are in different park districts. No verified cross-park driving time, vehicle route or open gate is available. A two-hour visit cannot be guaranteed to reach the farther district.",
          source:DNR
        };
        output.warnings.push("Your requested attraction is in a different park district. Neither driving route nor a two-hour total visit is verified; choose whether to explore nearby or separately plan the experience you wanted.");
        if(chosenPath==="desired"){
          output.stops=[wantedRef];
          output.title=interest==="views"?"Make a separate trip for the mountain view":"Make a separate trip for the river falls";
          output.intro="The "+wantedRef.name+" is what drew you here. Keep it as your destination, but make this a separate trip whose road access and actual driving time must be checked; it is NOT confirmed within your "+hours+"-hour window.";
          output.excluded.push("Nearby alternative: "+localRef.name+". It matches the arrival side more closely, but is not the place you originally requested.");
        }else{
          output.excluded.push(wantedRef.name+" is on the other side of the park. Treat it as a separate trip, not a short-visit add-on.");
        }
      }
      output.excluded.push("Summit Peak plus both river and lake districts cannot be assumed feasible on this time budget.");
      if (ability === "low" && primary === "falls") output.warnings.push("Only the Nawadaha observation platform is specifically identified as accessible; the full waterfalls walking circuit is not.");
    } else if (hours === 8) {
      var east = arrival !== "west";
      output.stops.push(REFERENCES[east ? "clouds" : "falls"]);
      output.stops.push(REFERENCES.summit);
      output.title = "A day for two sides of the wilderness";
      output.intro = "With a full day, you may have time for the wide-open view from the ridges and the quieter world beneath the trees. Make room for the drive between districts; first confirm seasonal road access and actual travel time.";
      output.excluded.push(east ? "The western Presque Isle waterfalls are a separate drive and are not counted as a guaranteed third stop." : "Lake of the Clouds is a possible third stop only after confirming the whole route.");
      if (ability === "low") {
        output.stops = [REFERENCES[east ? "clouds" : "falls"], REFERENCES.visitor];
        output.excluded.push("Summit Peak tower excluded because its stairs do not match a short or accessible approach.");
      } else if (interest === "forest" && ability === "high") {
        output.stops = [REFERENCES.summit, REFERENCES.backcountry];
        output.excluded.push("No loop, ford, elevation, hiking-time or trail-distance claim until DNR geometry and return logistics are reconciled.");
      }
    } else {
      output.title = "Give the Porkies two days to tell their story";
      output.intro = "With two days, let the park change around you: follow the river on the western side, stand above the hardwood canopy near the summit, then look out across the Carp River valley from the eastern escarpment. These places are far apart, so plan the drives and arrange lodging through official park reservations.";
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
    return finalize();
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { recommend: recommend, seasonFor: seasonFor, vehicleCautions: vehicleCautions };
  if (root.document) root.PorkiesEngine = { recommend: recommend, seasonFor: seasonFor, vehicleCautions: vehicleCautions };
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
  var pathChoice=paramsNotYet(); 
  function paramsNotYet(){try{return new URLSearchParams(root.location.search).get("path")==="desired"?"desired":"local";}catch(e){return "local";}}
  function render() {
    var input = { date: doc.getElementById("travel-date").value, arrival: doc.getElementById("arrival").value, vehicle:doc.getElementById("vehicle").value, hours: Number(doc.getElementById("hours").value), ability: doc.getElementById("ability").value, interest: doc.getElementById("interest").value, path:pathChoice };
    var r = recommend(input);
    results.replaceChildren(elt("p", "eyebrow", "Your day in the Porkies · confirm access"), elt("h3", "", r.title), elt("p", "result-intro", r.intro));
    if(r.vehicleWarnings&&r.vehicleWarnings.length){
      results.appendChild(listBlock("Before driving a camper or trailer",r.vehicleWarnings,"vehicle-check"));
    }
    if(r.tradeoff){
      var fork=elt("section","plan-fork");
      fork.appendChild(elt("p","eyebrow","Your arrival and your chosen experience point in different directions"));
      fork.appendChild(elt("h4","plan-fork-title","Choose what matters most for this visit"));
      fork.appendChild(elt("p","plan-fork-explainer",r.tradeoff.explanation));
      var pair=elt("div","plan-fork-actions");
      [["local","Stay near my arrival · "+r.tradeoff.local.name],
       ["desired","Keep my chosen destination · "+r.tradeoff.desired.name]].forEach(function(choice){
        var button=elt("button","plan-fork-choice",choice[1]);
        button.type="button";button.dataset.planPath=choice[0];
        button.setAttribute("aria-pressed",r.tradeoff.active===choice[0]?"true":"false");
        button.addEventListener("click",function(){
          if(pathChoice===choice[0])return;
          pathChoice=choice[0];render();
          var current=results.querySelector('[data-plan-path="'+choice[0]+'"]');
          current?.focus({preventScroll:true});
          root.dispatchEvent(new CustomEvent("porkies:plan-picked",{detail:{
            primaryId:pathChoice==="desired"?r.tradeoff.desiredId:r.tradeoff.localId,
            alternativeId:pathChoice==="desired"?r.tradeoff.localId:r.tradeoff.desiredId,
            path:pathChoice
          }}));
        });
        pair.appendChild(button);
      });
      fork.appendChild(pair);results.appendChild(fork);
    }
    if (r.stops.length) results.appendChild(listBlock("Places worth exploring", r.stops, "recommendations"));
    if (r.excluded.length) results.appendChild(listBlock("Save these for another visit", r.excluded, "excluded"));
    results.appendChild(listBlock("Before you put on your walking shoes", r.warnings, "warnings"));
    results.appendChild(listBlock("Official maps and park information", r.sources, "sources-list"));
    var actions = elt("div", "result-actions");
    var share = elt("button", "copy", "Copy my park plan");
    share.type = "button";
    share.addEventListener("click", function () {
      var text = "Porcupine Mountains preliminary plan\n" + r.title + "\n" + (r.vehicleWarnings||[]).join("\n") + "\n" + (r.tradeoff?r.tradeoff.explanation+"\n":"") + r.stops.map(function (s) { return "- " + s.name + ": " + s.detail; }).join("\n") + "\nCheck DNR access and the official park map: " + DNR + "\n" + MAP + "\nRoad and parking status are not checked live.";
      if (root.navigator && root.navigator.clipboard && root.navigator.clipboard.writeText) {
        root.navigator.clipboard.writeText(text).then(function () { share.textContent = "Summary copied"; }).catch(function () { fallback(text); });
      } else fallback(text);
      function fallback(value) { root.prompt("Copy your field plan", value); }
    });
    var map = elt("a", "print-link", "Take the official park map");
    map.href = MAP;
    actions.appendChild(share); actions.appendChild(map);
    results.appendChild(actions);
    var u = new URL(root.location.href);
    ["arrival","vehicle","hours","ability","interest"].forEach(function (id) { u.searchParams.set(id, String(input[id])); });
    if(r.tradeoff)u.searchParams.set("path",r.tradeoff.active);else u.searchParams.delete("path");
    u.searchParams.set("date", input.date);
    root.history.replaceState(null, "", u.pathname + u.search + u.hash);
    if (typeof root.va === "function") root.va("event", { name: "Porkies field planner", data: { hours: String(input.hours), mode: r.mode, arrival: input.arrival, interest: input.interest } });
  }
  var params = new URLSearchParams(root.location.search);
  var todayParts = new Intl.DateTimeFormat("en-US", { timeZone: "America/Detroit", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  var getPart = function (type) { var p = todayParts.find(function (x) { return x.type === type; }); return p ? p.value : ""; };
  var today = getPart("year") + "-" + getPart("month") + "-" + getPart("day");
  doc.getElementById("travel-date").value = params.get("date") && /^\d{4}-\d{2}-\d{2}$/.test(params.get("date")) ? params.get("date") : today;
  ["arrival","vehicle","hours","ability","interest"].forEach(function (id) {
    var x = params.get(id), select = doc.getElementById(id);
    if (x && Array.from(select.options).some(function (opt) { return opt.value === x; })) select.value = x;
  });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    pathChoice="local";
    render();
    results.scrollIntoView({ behavior: root.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  });
  render();
})(typeof window !== "undefined" ? window : globalThis);
