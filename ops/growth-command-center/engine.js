/* Revenue Command Center. Browser + Node, no dependencies. All inputs stay on the user's device. */
(function (root, factory) {
  var engine = factory();
  if (typeof module === "object" && module.exports) module.exports = engine;
  if (root) root.GrowthEngine = engine;
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  var HOST = "chrisizworski.com";
  function parseCSV(text) {
    var src = String(text || "").replace(/^\uFEFF/, "");
    var first = src.split(/\r?\n/, 1)[0] || "";
    var delimiter = first.indexOf("\t") !== -1 ? "\t" : ",";
    var rows = [], row = [], field = "", quoted = false;
    for (var i = 0; i < src.length; i++) {
      var c = src[i];
      if (c === '"') {
        if (quoted && src[i + 1] === '"') { field += '"'; i++; }
        else quoted = !quoted;
      } else if (c === delimiter && !quoted) {
        row.push(field); field = "";
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && src[i + 1] === "\n") i++;
        row.push(field); if (row.some(function (v) { return v.trim() !== ""; })) rows.push(row);
        row = []; field = "";
      } else field += c;
    }
    if (quoted) throw new Error("CSV contains an unmatched quote.");
    row.push(field);
    if (row.some(function (v) { return v.trim() !== ""; })) rows.push(row);
    return rows;
  }
  function heading(s) { return String(s || "").toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").trim(); }
  function locate(rows, requiredGroups) {
    for (var i = 0; i < Math.min(rows.length, 35); i++) {
      var head = rows[i].map(heading);
      if (requiredGroups.every(function (alternatives) { return alternatives.some(function (v) { return head.includes(v); }); })) {
        return { start: i + 1, names: head };
      }
    }
    throw new Error("Required column headers not found. Please use a Google export, not a screenshot.");
  }
  function col(names, options) {
    for (var i = 0; i < options.length; i++) {
      var at = names.indexOf(options[i]);
      if (at !== -1) return at;
    }
    return -1;
  }
  function number(v) {
    var s = String(v == null ? "" : v).trim();
    if (!s || s === "-" || s === "—") return null;
    var negative = /^\(.*\)$/.test(s);
    var n = Number(s.replace(/[$£€,%()\s,]/g, ""));
    return Number.isFinite(n) ? (negative ? -n : n) : null;
  }
  function page(raw) {
    var s = String(raw || "").trim();
    if (!s || /^(\(not set\)|not set|total|grand total)$/i.test(s)) return null;
    try {
      var u = new URL(/^https?:\/\//i.test(s) ? s : s.charAt(0) === "/" ? "https://" + HOST + s : "https://" + s);
      var host = u.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== HOST && !host.endsWith("." + HOST)) return null;
      var pathname = u.pathname.replace(/\/+/g, "/");
      if (!pathname.endsWith("/")) pathname += "/";
      return "https://" + host + pathname;
    } catch (_) { return null; }
  }
  function getRows(text, types) {
    var rows = parseCSV(text);
    var loc = locate(rows, types);
    return { rows: rows.slice(loc.start), names: loc.names };
  }
  function gsc(text) {
    var d = getRows(text, [["top pages", "page", "pages", "url", "landing page"], ["clicks"], ["impressions"]]);
    var ix = col(d.names, ["top pages", "page", "pages", "url", "landing page"]);
    var clicks = col(d.names, ["clicks"]), impressions = col(d.names, ["impressions"]);
    var pos = col(d.names, ["position", "average position"]);
    var out = new Map(), dropped = 0;
    d.rows.forEach(function (r) {
      var url = page(r[ix]), c = number(r[clicks]), im = number(r[impressions]);
      if (!url || c === null || im === null || c < 0 || im < 0) { dropped++; return; }
      var prev = out.get(url) || { page: url, clicks: 0, impressions: 0, positionWeight: 0, positionImpressions: 0 };
      prev.clicks += c; prev.impressions += im;
      var p = pos < 0 ? null : number(r[pos]);
      if (p !== null && p >= 0 && im > 0) { prev.positionWeight += p * im; prev.positionImpressions += im; }
      out.set(url, prev);
    });
    var records = Array.from(out.values()).map(function (r) {
      return { page: r.page, clicks: r.clicks, impressions: r.impressions,
        ctr: r.impressions ? 100 * r.clicks / r.impressions : 0,
        position: r.positionImpressions ? r.positionWeight / r.positionImpressions : null };
    });
    if (!records.length) throw new Error("No first-party page rows in this Search Console file.");
    return { records: records, dropped: dropped, kind: "gsc" };
  }
  function ga4(text) {
    var d = getRows(text, [["page path", "page path and screen class", "landing page", "landing page query string", "full page url", "page location", "page"], ["views", "screen page views", "sessions", "active users"]]);
    var p = col(d.names, ["page path", "page path and screen class", "landing page", "landing page query string", "full page url", "page location", "page"]);
    var v = col(d.names, ["views", "screen page views"]), sessions = col(d.names, ["sessions"]);
    var active = col(d.names, ["active users"]), returning = col(d.names, ["returning users"]);
    var host = col(d.names, ["hostname", "host name"]);
    var out = new Map(), dropped = 0;
    d.rows.forEach(function (r) {
      var raw = String(r[p] || "");
      if (raw.charAt(0) === "/" && host !== -1 && r[host] && String(r[host]).replace(/^www\./, "") !== HOST) { dropped++; return; }
      var url = page(raw);
      if (!url) { dropped++; return; }
      var old = out.get(url) || { page: url, views: null, sessions: null, activeUsers: null, returningUsers: null };
      [["views", v], ["sessions", sessions], ["activeUsers", active], ["returningUsers", returning]].forEach(function (entry) {
        var n = entry[1] < 0 ? null : number(r[entry[1]]);
        if (n !== null && n >= 0) old[entry[0]] = (old[entry[0]] || 0) + n;
      });
      out.set(url, old);
    });
    if (!out.size) throw new Error("No first-party page rows in this GA4 file.");
    return { records: Array.from(out.values()), dropped: dropped, kind: "ga4",
      dimension: d.names[p].indexOf("landing") !== -1 ? "landing" : "page",
      caveat: active >= 0 || returning >= 0 ? "User counts summed by page are non-additive across pages." : null };
  }
  function adsense(text) {
    var d = getRows(text, [["estimated earnings", "earnings", "estimated revenue"]]);
    var e = col(d.names, ["estimated earnings", "earnings", "estimated revenue"]);
    var p = col(d.names, ["page url", "url", "page", "page path", "requested url"]);
    var views = col(d.names, ["page views", "pageviews"]);
    var date = col(d.names, ["date", "day"]);
    var site = col(d.names, ["site", "site url", "domain"]);
    var rows = d.rows.filter(function (r) { return r.some(function (v) { return String(v).trim() !== ""; }); });
    var detail = rows.filter(function (r) { return !r.some(function (v) { return /^(grand )?total$/i.test(String(v).trim()); }); });
    var actual = detail.length ? detail : rows;
    var by = new Map(), revenue = 0, valid = 0, dated = 0, dropped = 0;
    actual.forEach(function (r) {
      var val = number(r[e]);
      if (val === null || val < 0) { dropped++; return; }
      if (site !== -1 && r[site]) {
        var claimed = String(r[site]).trim();
        if (claimed !== HOST && claimed !== "www." + HOST && !claimed.includes("://" + HOST) && !claimed.includes("://www." + HOST)) { dropped++; return; }
      }
      revenue += val; valid++;
      if (date !== -1 && String(r[date] || "").trim()) dated++;
      var key = p < 0 ? null : page(r[p]);
      if (key) {
        var old = by.get(key) || { page: key, earnings: 0, adPageviews: null };
        old.earnings += val;
        var n = views < 0 ? null : number(r[views]);
        if (n !== null && n >= 0) old.adPageviews = (old.adPageviews || 0) + n;
        by.set(key, old);
      }
    });
    if (!valid) throw new Error("No valid first-party estimated earnings found.");
    return { records: Array.from(by.values()), total: revenue, sitewide: p === -1,
      partialAttribution: p !== -1 && by.size < valid, kind: "adsense", datedRows: dated, dropped: dropped };
  }
  function days(start, end) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start || "") || !/^\d{4}-\d{2}-\d{2}$/.test(end || "")) return null;
    var a = Date.parse(start + "T00:00:00Z"), b = Date.parse(end + "T00:00:00Z");
    if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
    return Math.floor((b - a) / 86400000) + 1;
  }
  function comparable(w) {
    var a = days(w.start, w.end), b = days(w.prevStart, w.prevEnd);
    return a !== null && a === b && Date.parse(w.prevEnd + "T00:00:00Z") + 86400000 === Date.parse(w.start + "T00:00:00Z");
  }
  function bucket(n) {
    if (n === null) return null;
    return n <= 3 ? "1–3" : n <= 5 ? "4–5" : n <= 10 ? "6–10" : n <= 20 ? "11–20" : "21+";
  }
  function median(values) {
    if (!values.length) return null;
    var arr = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(arr.length / 2);
    return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
  }
  function family(url) {
    var path = new URL(url).pathname;
    return /(freighter|soo-locks|welland|duluth|seaway|ballard-locks|ship-tracker)/i.test(path)
      ? "Shipping" : /(snow|winter|ice-cave|freeze|ski|lake-effect|white-christmas)/i.test(path)
      ? "Winter" : "Other";
  }
  function analyze(sources, window) {
    sources = sources || {}; window = window || {};
    var current = sources.gsc || null, previous = sources.previous || null;
    var analytics = sources.ga4 || null, ads = sources.adsense || null;
    var validComparison = Boolean(current && previous && comparable(window));
    var currentMap = new Map((current ? current.records : []).map(function (r) { return [r.page, r]; }));
    var prevMap = new Map((previous ? previous.records : []).map(function (r) { return [r.page, r]; }));
    var gaMap = new Map((analytics ? analytics.records : []).map(function (r) { return [r.page, r]; }));
    var adMap = new Map((ads ? ads.records : []).map(function (r) { return [r.page, r]; }));
    var benchmarks = {};
    ["1–3", "4–5", "6–10", "11–20", "21+"].forEach(function (id) {
      var peers = Array.from(currentMap.values()).filter(function (r) { return r.impressions >= 100 && bucket(r.position) === id; }).map(function (r) { return r.ctr; });
      benchmarks[id] = peers.length >= 3 ? median(peers) : null;
    });
    var urls = new Set([].concat(Array.from(currentMap.keys()), Array.from(gaMap.keys()), Array.from(adMap.keys())));
    var rows = Array.from(urls).map(function (url) {
      var g = currentMap.get(url), prev = prevMap.get(url), a = gaMap.get(url), ad = adMap.get(url);
      var expected = g ? benchmarks[bucket(g.position)] : null;
      var potential = g && expected !== null && g.impressions >= 100 && g.position > 3 && g.position <= 20
        ? Math.max(0, Math.round(g.impressions * (expected - g.ctr) / 100)) : null;
      var growth = validComparison && g && prev && prev.impressions >= 50 ? (g.impressions / prev.impressions - 1) * 100 : null;
      var revenue = ad ? ad.earnings : null;
      var metric = revenue !== null && ad.adPageviews > 0 ? 1000 * revenue / ad.adPageviews : null;
      var action = "Gather matched source evidence";
      if (potential !== null && potential >= 20) action = "Inspect page-filtered queries, title and search intent";
      else if (growth !== null && growth <= -30) action = "Investigate decline, seasonality and indexing";
      else if (revenue !== null && revenue > 0 && (a && a.views > 100)) action = "Protect earning experience; test return use";
      else if (family(url) !== "Other" && g && g.impressions >= 150) action = "Improve useful next step and repeat visits";
      var score = (potential || 0) * 2 + Math.min(g ? g.impressions / 50 : 0, 50) + (revenue !== null ? Math.min(revenue * 5, 50) : 0);
      return { page: url, family: family(url), clicks: g ? g.clicks : null, impressions: g ? g.impressions : null,
        ctr: g ? g.ctr : null, position: g ? g.position : null, expectedCtr: expected, potentialClicks: potential,
        impressionChangePct: growth, views: a ? a.views : null, sessions: a ? a.sessions : null,
        earnings: revenue, adPageviews: ad ? ad.adPageviews : null, pageRpm: metric,
        action: action, score: score };
    }).sort(function (a, b) { return b.score - a.score || (b.impressions || 0) - (a.impressions || 0); });
    var sum = function (items, field) { return items.reduce(function (v, r) { return v + (r[field] || 0); }, 0); };
    var adsDays = days(window.adsStart, window.adsEnd);
    var reportingRevenue = ads && adsDays !== null && window.adSenseComplete === true ? ads.total / adsDays : null;
    return { rows: rows, benchmarks: benchmarks, comparisonValid: validComparison,
      kpis: { importedGscClicks: current ? sum(current.records, "clicks") : null,
        importedGscImpressions: current ? sum(current.records, "impressions") : null,
        importedGa4Views: analytics && analytics.records.some(function (r) { return r.views !== null; }) ? sum(analytics.records, "views") : null,
        importedAdSenseEarnings: ads ? ads.total : null, adsDaily: reportingRevenue,
        dailyGap: reportingRevenue === null ? null : Math.max(0, 300 - reportingRevenue),
        pageAttributedRevenue: ads && !ads.sitewide && !ads.partialAttribution },
      sourceSummary: {
        gsc: current ? current.records.length : null,
        previous: previous ? previous.records.length : null,
        ga4: analytics ? analytics.records.length : null,
        adsense: ads ? ads.records.length : null
      } };
  }
  return { parseCSV: parseCSV, gsc: gsc, ga4: ga4, adsense: adsense, page: page, days: days, comparable: comparable, analyze: analyze };
});
