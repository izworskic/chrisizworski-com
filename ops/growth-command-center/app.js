(function () {
  "use strict";
  var E = window.GrowthEngine;
  if (!E) throw new Error("GrowthEngine was not loaded.");
  var sources = { gsc: null, previous: null, ga4: null, adsense: null };
  var family = "All";
  var sort = "score";
  var ids = { gsc: "gsc-file", previous: "previous-file", ga4: "ga4-file", adsense: "adsense-file" };
  var parsers = { gsc: E.gsc, previous: E.gsc, ga4: E.ga4, adsense: E.adsense };
  var currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
  var integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  function el(id) { return document.getElementById(id); }
  function set(id, value) { el(id).textContent = String(value); }
  function cash(n) { return n === null || !Number.isFinite(n) ? "—" : currency.format(n); }
  function fmt(n) { return n === null || !Number.isFinite(n) ? "—" : integer.format(n); }
  function percent(n) { return n === null || !Number.isFinite(n) ? "—" : n.toFixed(2) + "%"; }
  function status(name, message, type) {
    var node = el(name + "-status");
    node.textContent = message;
    node.className = "source-flag" + (type ? " " + type : "");
  }
  function dates() {
    return { start: el("from").value, end: el("to").value,
      prevStart: el("prev-from").value, prevEnd: el("prev-to").value,
      adsStart: el("ads-from").value, adsEnd: el("ads-to").value,
      adSenseComplete: el("complete-site").checked };
  }
  function setDates(values) {
    var map = { start: "from", end: "to", prevStart: "prev-from", prevEnd: "prev-to", adsStart: "ads-from", adsEnd: "ads-to" };
    Object.keys(map).forEach(function (key) { el(map[key]).value = String(values[key] || ""); });
    el("complete-site").checked = values.adSenseComplete === true;
  }
  function node(tag, cls, value) {
    var out = document.createElement(tag);
    if (cls) out.className = cls;
    if (value != null) out.textContent = String(value);
    return out;
  }
  function td(value, cls) {
    var cell = node("td", cls || "", value);
    return cell;
  }
  function displayName(url) {
    try { var u = new URL(url); return u.pathname === "/" ? u.hostname : u.pathname.replace(/\/$/, "").split("/").pop().replace(/[-_]/g, " "); }
    catch (_) { return url; }
  }
  function sourceSummary(result) {
    var pieces = [];
    if (sources.gsc) pieces.push("GSC " + sources.gsc.records.length + " pages");
    if (sources.ga4) pieces.push("GA4 " + sources.ga4.records.length + " paths");
    if (sources.adsense) pieces.push("AdSense " + (sources.adsense.sitewide ? "site-level" : "page-level") + " import");
    if (!pieces.length) return "No data loaded. Import current GSC Pages.csv first; add verified AdSense earnings and GA4 metrics when available.";
    if (sources.adsense && result.kpis.adsDaily === null) pieces.push("daily revenue withheld until reporting scope and dates are confirmed");
    if (sources.previous && !result.comparisonValid) pieces.push("growth rates withheld: the GSC periods must be consecutive and equally long");
    return pieces.join(" · ") + ".";
  }
  function addIntegrity(target, label, message, okay) {
    var line = node("div", "integrity-item");
    line.append(node("span", "", label), node("strong", okay ? "ready" : "warn", message));
    target.append(line);
  }
  function integrity(result) {
    var container = el("integrity"); container.replaceChildren();
    addIntegrity(container, "Search evidence", sources.gsc ? sources.gsc.records.length + " URL rows" : "Not connected", Boolean(sources.gsc));
    addIntegrity(container, "Organic period comparison", result.comparisonValid ? "Aligned 28/28 or equal-length periods" : "Not verified", result.comparisonValid);
    addIntegrity(container, "GA4 page engagement", sources.ga4 ? sources.ga4.records.length + " paths · " + (sources.ga4.dimension === "landing" ? "landings" : "page views") : "Not connected", Boolean(sources.ga4));
    addIntegrity(container, "AdSense earnings", sources.adsense ? "Measured export · " + (sources.adsense.sitewide ? "no URL attribution" : "page data") : "Not connected", Boolean(sources.adsense));
    addIntegrity(container, "Sitewide daily revenue", result.kpis.adsDaily === null ? "Unverified" : "Scope confirmed", result.kpis.adsDaily !== null);
    addIntegrity(container, "Returning visitors", sources.ga4 && sources.ga4.records.some(function (r) { return r.returningUsers !== null; }) ? "Explicit GA4 metric" : "Unavailable", Boolean(sources.ga4 && sources.ga4.records.some(function (r) { return r.returningUsers !== null; })));
    if (sources.ga4 && sources.ga4.caveat) {
      var p = node("p", "footnote", sources.ga4.caveat); container.append(p);
    }
    var note = node("p", "footnote", "All earnings are treated as USD: confirm AdSense account currency before interpreting dollars. GSC page-row totals may differ from Search Console's property total. GA4 exported rows may exclude low-volume pages.");
    container.append(note);
  }
  function recommendations(rows) {
    var area = el("recommendations"); area.replaceChildren();
    if (!rows.length) { area.append(node("p", "empty", "Import current GSC pages or GA4 pages to identify existing tools.")); return; }
    rows.slice(0, 3).forEach(function (r, i) {
      var card = node("article", "decision");
      card.append(node("span", "sequence", "INVESTIGATION 0" + (i + 1) + " / " + r.family.toUpperCase()));
      var heading = node("h3");
      var link = node("a", "", displayName(r.page));
      link.href = r.page; link.target = "_blank"; link.rel = "noopener noreferrer"; heading.append(link);
      card.append(heading, node("p", "", r.action));
      var signal = r.potentialClicks !== null && r.potentialClicks >= 20
        ? fmt(r.potentialClicks) + " peer-CTR gap clicks (not forecast)"
        : r.earnings !== null ? cash(r.earnings) + " attributed earnings"
        : r.impressions !== null ? fmt(r.impressions) + " search impressions" : fmt(r.views) + " GA4 views";
      card.append(node("p", "signal", signal)); area.append(card);
    });
  }
  function table(rows) {
    var body = el("rows"); body.replaceChildren();
    var list = rows.filter(function (r) { return family === "All" || r.family === family; });
    list.sort(function (a, b) {
      var av = a[sort], bv = b[sort];
      return (bv == null ? -Infinity : bv) - (av == null ? -Infinity : av) || b.score - a.score;
    });
    if (!list.length) {
      var r = node("tr"), cell = td("No pages in this selection. Import data or select another family.", "empty");
      cell.colSpan = 7; r.append(cell); body.append(r); return;
    }
    list.slice(0, 150).forEach(function (record) {
      var row = node("tr");
      var title = td(null, "page-cell");
      var link = node("a", "page-link", displayName(record.page));
      link.href = record.page; link.target = "_blank"; link.rel = "noopener noreferrer";
      title.append(link, node("div", "path-note", record.family + " / " + new URL(record.page).pathname), node("div", "action-note", record.action));
      row.append(title);
      row.append(td(fmt(record.clicks), "number-cell"));
      row.append(td(fmt(record.impressions), "number-cell strong-number"));
      row.append(td(percent(record.ctr) + " / " + (record.position === null ? "—" : record.position.toFixed(1)), "number-cell"));
      row.append(td(fmt(record.views), "number-cell"));
      row.append(td(cash(record.earnings), "number-cell strong-number"));
      row.append(td(fmt(record.potentialClicks), "number-cell"));
      body.append(row);
    });
  }
  function dashboard() {
    var result;
    try { result = E.analyze(sources, dates()); }
    catch (err) { set("source-guidance", "Cannot analyze input: " + err.message); return; }
    set("earnings", result.kpis.importedAdSenseEarnings === null ? "Unavailable" : cash(result.kpis.importedAdSenseEarnings));
    set("earnings-detail", sources.adsense ? (sources.adsense.sitewide ? "Site-level earnings; no page attribution" : "Revenue in imported URL rows") : "Requires actual AdSense export");
    set("daily", cash(result.kpis.adsDaily));
    set("daily-detail", result.kpis.adsDaily === null ? "Needs complete-site confirmation and report dates" : "Reported AdSense earnings / " + E.days(dates().adsStart, dates().adsEnd) + " days");
    set("clicks", fmt(result.kpis.importedGscClicks));
    set("views", fmt(result.kpis.importedGa4Views));
    if (result.kpis.adsDaily !== null) {
      var frac = Math.min(result.kpis.adsDaily / 300, 1);
      set("target-note", "Measured daily gap: " + cash(result.kpis.dailyGap) + ". No forecast is implied.");
      set("progress-text", cash(result.kpis.adsDaily) + " observed per day");
      set("progress-percent", (frac * 100).toFixed(1) + "%");
      el("target-fill").style.width = (frac * 100).toFixed(1) + "%";
    } else {
      set("target-note", "Import a complete AdSense report to measure the gap.");
      set("progress-text", "Pending actual AdSense data");
      set("progress-percent", "—"); el("target-fill").style.width = "0";
    }
    set("source-guidance", sourceSummary(result));
    integrity(result); recommendations(result.rows); table(result.rows);
  }
  Object.keys(ids).forEach(function (name) {
    el(ids[name]).addEventListener("change", async function (event) {
      var file = event.target.files && event.target.files[0]; if (!file) return;
      status(name, "Reading…", "");
      try {
        if (file.size > 15 * 1024 * 1024) throw new Error("CSV is too large (15 MB maximum).");
        var parsed = parsers[name](await file.text());
        sources[name] = parsed;
        status(name, parsed.records.length + " rows", "ready");
      } catch (error) {
        sources[name] = null;
        status(name, "Invalid file", "error");
        set("source-guidance", name.toUpperCase() + ": " + error.message);
      }
      dashboard();
    });
  });
  ["from", "to", "prev-from", "prev-to", "ads-from", "ads-to", "complete-site"].forEach(function (id) {
    el(id).addEventListener("change", dashboard);
  });
  document.querySelectorAll(".filter").forEach(function (btn) {
    btn.addEventListener("click", function () {
      family = btn.dataset.family;
      document.querySelectorAll(".filter").forEach(function (b) {
        var selected = b === btn;
        b.classList.toggle("active", selected);
        b.setAttribute("aria-pressed", String(selected));
      });
      dashboard();
    });
  });
  document.querySelector(".filter.active").setAttribute("aria-pressed", "true");
  el("sort").addEventListener("change", function (event) { sort = event.target.value; dashboard(); });
  el("save").addEventListener("click", function () {
    if (!Object.values(sources).some(Boolean)) { set("source-guidance", "Import at least one verified CSV before saving a snapshot."); return; }
    var snapshot = { version: 1, exportedAt: new Date().toISOString(), sources: sources, window: dates() };
    var blob = new Blob([JSON.stringify(snapshot)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href = url; a.download = "PRIVATE-growth-command-center-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click(); URL.revokeObjectURL(url);
  });
  el("restore-file").addEventListener("change", async function (event) {
    var file = event.target.files && event.target.files[0]; if (!file) return;
    try {
      if (file.size > 25 * 1024 * 1024) throw new Error("Snapshot exceeds 25 MB.");
      var snapshot = JSON.parse(await file.text());
      if (snapshot.version !== 1 || !snapshot.sources || !snapshot.window) throw new Error("Unsupported snapshot format.");
      var restored = {};
      Object.keys(ids).forEach(function (name) {
        var source = snapshot.sources[name];
        if (source != null) {
          if (!Array.isArray(source.records) || source.records.length > 30000) throw new Error("Invalid source rows in snapshot.");
          source.records.forEach(function (r) { if (!r || E.page(r.page) !== r.page) throw new Error("Snapshot has an invalid page URL."); });
          if (name === "adsense" && (typeof source.total !== "number" || !Number.isFinite(source.total))) throw new Error("Snapshot revenue is invalid.");
        }
        restored[name] = source || null;
      });
      sources = restored; setDates(snapshot.window);
      Object.keys(ids).forEach(function (name) { status(name, sources[name] ? sources[name].records.length + " rows" : "Not loaded", sources[name] ? "ready" : ""); });
      dashboard();
    } catch (error) { set("source-guidance", "Snapshot rejected: " + error.message); }
  });
  el("clear").addEventListener("click", function () {
    sources = { gsc: null, previous: null, ga4: null, adsense: null };
    setDates({});
    Object.keys(ids).forEach(function (name) { el(ids[name]).value = ""; status(name, "Not loaded", ""); });
    el("restore-file").value = "";
    dashboard();
  });
  dashboard();
})();
