// The pre-trip read.
//
// This page composes five tools that already exist rather than adding a sixth source. Every value
// is fetched live at page load from this site's own APIs, and every card links to the tool that
// produced it, because the tool holds the detail and the caveats this summary deliberately omits.
//
// Fail-soft is the whole design: a card whose feed is unreachable says so plainly and keeps its
// link. A pre-trip page that silently shows a stale or invented number is worse than one that
// admits it cannot reach a feed, because someone may be deciding whether to tow a trailer over a
// bridge on the strength of it.
(function () {
  var setState = function (id, state, text, detail) {
    var v = document.getElementById("v-" + id);
    var d = document.getElementById("d-" + id);
    if (v) { v.setAttribute("data-state", state); v.textContent = text; }
    if (d) { d.textContent = detail; }
  };
  var out = function (id, why) { setState(id, "out", "unavailable", why); };

  var get = function (path) {
    return fetch(path, { headers: { accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
  };

  // Aurora. The honest read is the strongest Kp inside tonight's dark window, not the headline Kp,
  // which frequently peaks in daylight and is no use to anyone standing outside in Michigan.
  get("/api/aurora").then(function (a) {
    var peak = a && a.forecast ? a.forecast.peak_24h : null;
    if (peak == null) return out("aurora", "The NOAA feed did not return a forecast just now.");
    var moon = a.moon && a.moon.illumination_percent != null ? a.moon.illumination_percent : null;
    var state = peak >= 6 ? "go" : peak >= 5 ? "watch" : "low";
    var label = peak >= 6 ? "worth the drive" : peak >= 5 ? "worth watching" : "unlikely";
    var bits = ["Peak Kp " + peak + " forecast in the next 24 hours."];
    bits.push(peak >= 6
      ? "That is enough for northern Michigan on a clear night, and comfortably enough for the U.P."
      : peak >= 5
        ? "That is a U.P. night from a dark shoreline, not a northern Lower Michigan one."
        : "Below the level that puts the aurora on the horizon anywhere in Michigan.");
    if (moon != null) bits.push("Moon " + moon + "% lit" + (moon > 60 ? ", bright enough to wash out a weak display." : "."));
    setState("aurora", state, label, bits.join(" "));
  }).catch(function () { out("aurora", "Could not reach the aurora feed just now."); });

  // Fall colour. Off season the model says so rather than inventing a stage, which is the correct
  // behaviour for ten months of the year.
  get("/api/fall-color").then(function (f) {
    var regions = (f && f.regions) || [];
    var scored = regions.filter(function (r) { return r.ndvi && typeof r.ndvi.senescence === "number"; });
    if (!scored.length) return out("fall", "The fall colour model is not reporting regions right now.");
    scored.sort(function (a, b) { return b.ndvi.senescence - a.ndvi.senescence; });
    var top = scored[0];
    var pct = Math.round(top.ndvi.senescence * 100);
    if (pct < 5) {
      setState("fall", "out", "not started",
        "No measurable senescence yet in any of the eight regions. Michigan turns north to south from " +
        "late September, so the Upper Peninsula moves first and southeast Michigan last.");
      return;
    }
    var state = pct >= 60 ? "go" : pct >= 25 ? "watch" : "low";
    setState("fall", state, pct >= 60 ? "peak somewhere" : pct >= 25 ? "turning" : "starting",
      "Furthest along: " + String(top.id).toUpperCase() + " at about " + pct + "% turned by satellite. " +
      "Michigan runs north to south over roughly five weeks, so if your own trees have not gone, drive north.");
  }).catch(function () { out("fall", "Could not reach the fall colour feed just now."); });

  // Bridge. The advisory matters more than the wind speed, because the Authority's own restriction
  // is what actually stops a trailer crossing.
  get("/api/mackinac").then(function (m) {
    var off = m && m.official;
    var wind = m && m.current_wind ? m.current_wind : null;
    var mph = wind && wind.speed_mph != null ? Math.round(wind.speed_mph) : null;
    if (off && off.available && off.title) {
      var restrictive = /warning|restrict|closed|advisory/i.test(off.title);
      setState("bridge", restrictive ? "watch" : "go", restrictive ? off.title.toLowerCase() : "open",
        (off.message ? String(off.message).slice(0, 190) : off.title) +
        (mph != null ? " Wind at the bridge is about " + mph + " mph." : ""));
      return;
    }
    if (mph == null) return out("bridge", "Could not read bridge conditions just now.");
    setState("bridge", mph >= 35 ? "watch" : "go", mph >= 35 ? "high wind" : "no advisory",
      "No restriction posted. Wind at the bridge is about " + mph + " mph.");
  }).catch(function () { out("bridge", "Could not reach the bridge feed just now."); });

  // Water. One number that answers "can I get a boat out", taken from the roughest reporting buoy,
  // because the roughest is the one that decides the day.
  get("/api/buoys").then(function (b) {
    var st = (b && b.stations) || [];
    var waves = st.filter(function (s2) { return typeof s2.wave_ht === "number"; });
    if (!waves.length) return out("water", "No buoy is reporting wave height right now. Many are pulled for the winter.");
    waves.sort(function (x, y) { return y.wave_ht - x.wave_ht; });
    var worst = waves[0];
    var ft = worst.wave_ht * 3.28084;               // API reports metres
    var state = ft >= 4 ? "watch" : "go";
    setState("water", state, ft >= 4 ? "rough somewhere" : "workable",
      "Roughest reporting buoy: " + (worst.name || worst.id) + " on Lake " + (worst.lake || "?") +
      " at about " + ft.toFixed(1) + " ft. " +
      (ft >= 4 ? "Small craft should pick a lee shore." : "Reasonable across the reporting stations, but the lakes build fast on a wind shift.") +
      " " + waves.length + " buoys reporting wave height.");
  }).catch(function () { out("water", "Could not reach the buoy feed just now."); });

  // Ice. Deliberately conservative wording: the page never implies ice is safe, because no feed can
  // tell anyone that and the ice tool itself opens with "No ice is safe ice."
  get("/api/ice").then(function (i) {
    if (!i || i.ok === false) return out("ice", "Could not read the ice model just now.");
    var total = i.cover && typeof i.cover.total === "number" ? i.cover.total : null;
    var month = new Date().getMonth();
    if (month > 3 && month < 10 && (total == null || total < 1)) {
      setState("ice", "out", "out of season",
        "No meaningful ice. The report tracks accumulated cold from freeze-up through spring breakup.");
      return;
    }
    setState("ice", "watch", total != null ? Math.round(total) + "% cover" : "tracking",
      "Great Lakes satellite cover is a basin-wide figure, and neither it nor any camera can tell you " +
      "whether ice will hold weight. No ice is safe ice. Test it yourself, every trip.");
  }).catch(function () { out("ice", "Could not reach the ice feed just now."); });

  var stamp = document.getElementById("asOf");
  if (stamp) {
    stamp.textContent = "Read live " + new Date().toLocaleString("en-US", {
      timeZone: "America/Detroit", weekday: "long", hour: "numeric", minute: "2-digit",
    }) + " Michigan time.";
  }
})();
