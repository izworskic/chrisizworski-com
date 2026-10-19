/* Holiday Travel "Will I make it?" engine.
 * Pure functions over public/holiday-travel/data/national.json and routes/<ORIGIN>.json
 * (built by scripts/holiday-travel/build-flight-history.py from BTS flight records).
 * Times are minutes from 00:00 local on the holiday (Thanksgiving Thursday or Dec 25):
 * offset * 1440 + clock minutes. Probabilities are fractions 0..1.
 * No DOM, no network: the page fetches data and NWS responses and passes them in. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HolidayTravelEngine = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var MCT = 35; // minutes: a typical domestic minimum connection
  var CAP = 0.97;
  var DAY = 1440;
  var HAZARDS = ['Blizzard Warning', 'Winter Storm Warning', 'Winter Storm Watch', 'Ice Storm Warning', 'Winter Weather Advisory',
    'Lake Effect Snow Warning', 'Lake Effect Snow Watch', 'High Wind Warning', 'High Wind Watch', 'Dense Fog Advisory',
    'Freezing Rain Advisory', 'Severe Thunderstorm Warning', 'Tornado Warning', 'Hurricane Warning', 'Tropical Storm Warning',
    'Extreme Cold Warning', 'Wind Chill Warning', 'Flood Warning', 'Flash Flood Warning'];
  var SEVERE = /blizzard|winter storm|ice storm|lake effect|hurricane|tropical storm|tornado/i;
  var WX_WORDS = /snow|blizzard|freezing|ice|sleet|thunderstorm|fog|heavy rain|high wind/i;

  function clamp01(x) { return Math.max(0, Math.min(CAP, x)); }

  // Survival curve lookup with log-linear interpolation between grid points.
  function interp(grid, vals, x, scale) {
    if (x <= grid[0]) return vals[0] / scale;
    for (var i = 1; i < grid.length; i++) {
      if (x <= grid[i]) {
        var a = vals[i - 1] / scale, b = vals[i] / scale, t = (x - grid[i - 1]) / (grid[i] - grid[i - 1]);
        if (a <= 0 || b <= 0) return a + (b - a) * t;
        return Math.exp(Math.log(a) + (Math.log(b) - Math.log(a)) * t);
      }
    }
    return vals[vals.length - 1] / scale;
  }

  function median(v) {
    v = v.filter(function (x) { return x !== null && isFinite(x); }).sort(function (a, b) { return a - b; });
    if (!v.length) return null;
    var m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  function create(nat) {
    var meta = nat.meta, S = meta.scale, X = meta.xgrid, H = meta.hgrid, edges = meta.bandEdges, groups = meta.bandGroups;
    var byCode = {}, shards = {};
    nat.airports.forEach(function (a) { byCode[a.code] = a; });

    function band(clock) {
      var h = Math.floor(((clock % DAY) + DAY) % DAY / 60);
      for (var i = 0; i < edges.length - 1; i++) if (h >= edges[i] && h < edges[i + 1]) return i;
      return edges.length - 1;
    }
    function dayOf(t) { return Math.floor(t / DAY); }
    function clockOf(t) { return ((t % DAY) + DAY) % DAY; }

    function addShard(shard) { shards[shard.origin] = shard; }
    function hasShard(code) { return !!shards[code]; }
    function route(o, d) { var s = shards[o]; return s && s.routes[d] ? s.routes[d] : null; }
    function nonstopExists(o, d) { return (nat.routes[o] || []).indexOf(d) >= 0; }
    function hubs(o, d, limit) {
      var out = (nat.routes[o] || []).filter(function (h) { return h !== d && (nat.routes[h] || []).indexOf(d) >= 0; });
      out.sort(function (a, b) { return (byCode[b] ? byCode[b].flights : 0) - (byCode[a] ? byCode[a].flights : 0); });
      return out.slice(0, limit || 6);
    }

    // National surfaces for one holiday-relative day and band, either averaged over seasons or one season.
    function surface(hol, off, b, season) {
      var list = nat.holidays[hol].seasons, i = Math.max(-6, Math.min(6, off)) + 6;
      var use = season === null || season === undefined ? list : [list[season]];
      var cd = 0, sop = X.map(function () { return 0; });
      use.forEach(function (s) {
        cd += s.cd[i][b] / S;
        for (var k = 0; k < X.length; k++) sop[k] += s.sop[i][b][k];
      });
      return { cd: cd / use.length, sop: sop.map(function (v) { return v / use.length; }) };
    }

    // One flight leg leaving `o` for `d` at absolute time t.
    function leg(hol, o, d, t, season) {
      var r = route(o, d);
      if (!r) return null;
      var b = band(clockOf(t)), a = byCode[o];
      var di = Math.max(-6, Math.min(6, dayOf(t))) + 6, sh = shards[o];
      var stretch = season !== null && season !== undefined && sh && sh.recScale ? sh.recScale[hol][season][di] : 1;
      var f = (a ? a.f[hol][groups[b]] : 1) * r.r;
      var s = surface(hol, dayOf(t), b, season);
      var cd = clamp01(s.cd * f);
      var sop = s.sop.map(function (v) { return v * f; });
      var room = 1 - cd;
      if (sop[0] / S > room) { var k = room / (sop[0] / S); sop = sop.map(function (v) { return v * k; }); }
      return {
        from: o, to: d, depart: t, arrive: t + r.shift, band: b, factor: f, route: r,
        cd: cd,
        late: function (min) { return interp(X, sop, min, S); },
        rec: function (hours) { var g = r.rec[groups[b]]; return hours <= 0 ? 1 : interp(H, g.surv, hours / stretch, S); },
        // One stranded passenger (a missed connection) usually gets the next flight with a seat;
        // a whole cancelled planeload queues (rec). Both stretch in bad seasons.
        recOne: function (hours) { var g = r.rec[groups[b]]; return hours <= 0 ? 1 : interp(H, g.survOpt || g.surv, hours / stretch, S); },
        stretch: stretch,
        recInfo: r.rec[groups[b]]
      };
    }

    // P(arrive after the deadline) for one plan, for one season (index) or the season average (null).
    function missOnce(p, season) {
      if (!p.via) {
        var l = leg(p.hol, p.from, p.to, p.depart, season);
        if (!l) return null;
        var slack = p.deadline - l.arrive;
        if (slack < 0) return { p: 1, tooLate: true, arrive: l.arrive, slack: slack, legs: [l], parts: { cancel: 0, delay: 0, misconnect: 0 } };
        var c = l.cd * l.rec(slack / 60), dl = l.late(slack);
        return { p: Math.min(1, c + dl), arrive: l.arrive, slack: slack, legs: [l], parts: { cancel: c, delay: dl, misconnect: 0 } };
      }
      var l1 = leg(p.hol, p.from, p.via, p.depart, season);
      if (!l1) return null;
      var t2 = l1.arrive + p.layover, l2 = leg(p.hol, p.via, p.to, t2, season);
      if (!l2) return null;
      var sl = p.deadline - l2.arrive;
      if (sl < 0) return { p: 1, tooLate: true, arrive: l2.arrive, slack: sl, legs: [l1, l2], parts: { cancel: 0, delay: 0, misconnect: 0 } };
      var h = sl / 60;
      var mis = l1.late(Math.max(0, p.layover - MCT));
      var made = Math.max(0, 1 - l1.cd - mis);
      var cancel = l1.cd * Math.max(l1.rec(h), l2.rec(h)) + made * l2.cd * l2.rec(h);
      var misconnect = mis * l2.recOne(h);
      var delay = made * l2.late(sl);
      return { p: Math.min(1, cancel + misconnect + delay), arrive: l2.arrive, slack: sl, legs: [l1, l2], misconnectChance: mis, parts: { cancel: cancel, delay: delay, misconnect: misconnect } };
    }

    // Each past season is evaluated with its own day-by-day rates and its own rebooking conditions;
    // the headline is the average across seasons, so a meltdown year counts fully once.
    function evaluate(p) {
      var runs = meta.seasons.map(function (_, k) { return missOnce(p, k); });
      if (runs.some(function (r) { return !r; })) return null;
      var perSeason = runs.map(function (r) { return r.p; });
      var avg = function (f) { return runs.reduce(function (a, r) { return a + f(r); }, 0) / runs.length; };
      var worst = Math.max.apply(null, perSeason), r0 = missOnce(p, null), first = r0.legs[0];
      return {
        plan: p, p: avg(function (r) { return r.p; }), tooLate: !!r0.tooLate, arrive: r0.arrive, slack: r0.slack, legs: r0.legs,
        parts: { cancel: avg(function (r) { return r.parts.cancel; }), delay: avg(function (r) { return r.parts.delay; }), misconnect: avg(function (r) { return r.parts.misconnect; }) },
        misconnectChance: avg(function (r) { return r.misconnectChance || 0; }),
        perSeason: perSeason, median: median(perSeason), worst: worst, worstSeason: meta.seasons[perSeason.indexOf(worst)],
        ifCancelled: { optimisticHours: first.recInfo.opt, realisticHours: first.recInfo.real, overnight: first.recInfo.night / S, perDay: first.route.perDay, carriers: first.route.carriers,
          worstStretch: Math.max.apply(null, runs.map(function (r) { return r.legs[0].stretch; })),
          worstStretchSeason: meta.seasons[runs.map(function (r) { return r.legs[0].stretch; }).indexOf(Math.max.apply(null, runs.map(function (r) { return r.legs[0].stretch; })))] }
      };
    }

    // Cheapest changes that lower the chance of missing the deadline.
    function fixes(p, base) {
      base = base || evaluate(p);
      if (!base) return [];
      var dayStart = Math.floor(p.depart / DAY) * DAY, clock = clockOf(p.depart), out = [];
      function tryPlan(change, kind, label) {
        var q = {}; for (var k in p) q[k] = p[k];
        for (var c in change) q[c] = change[c];
        if (Math.floor(q.depart / DAY) < -6) return null;
        if (q.via && !(route(q.from, q.via) && route(q.via, q.to))) return null;
        if (!q.via && !route(q.from, q.to)) return null;
        var e = evaluate(q);
        if (!e || e.tooLate) return null;
        return { kind: kind, label: label, plan: q, result: e, p: e.p, gain: base.p - e.p };
      }
      function best(list) { list = list.filter(Boolean).filter(function (x) { return x.gain >= 0.01 && x.p < base.p * 0.85; }); list.sort(function (a, b) { return a.p - b.p; }); return list[0] || null; }
      var sameDay = [360, 420, 480, 540, 600, 720, 840, 960, 1080, 1200].filter(function (c) { return c !== clock; })
        .map(function (c) { return tryPlan({ depart: dayStart + c }, 'time', c); });
      var earlier = [1, 2].map(function (n) {
        return [420, clock].map(function (c) { return tryPlan({ depart: dayStart - n * DAY + c }, 'day', n); });
      }).reduce(function (a, b) { return a.concat(b); }, []);
      var routing = [];
      if (p.via && route(p.from, p.to)) routing.push(tryPlan({ via: null }, 'route', null));
      hubs(p.from, p.to, 6).forEach(function (h) {
        if (h !== p.via && shards[h]) routing.push(tryPlan({ via: h, layover: Math.max(p.layover || 0, 75) }, 'route', h));
      });
      [best(sameDay), best(earlier), best(routing)].forEach(function (x) { if (x) out.push(x); });
      out.sort(function (a, b) { return a.p - b.p; });
      return out;
    }

    function firstFlight(code, clock) {
      var b = band(clock), n = meta.firstFlightNational.byBand[b], a = byCode[code];
      return { band: b, troubleFirst: n[0] / S, troubleLater: n[1] / S, shareNational: n[2] / S,
        shareHere: a && a.firstShare[b] !== null ? a.firstShare[b] / S : null,
        byBand: meta.firstFlightNational.byBand.map(function (r, i) { return { band: i, first: r[0] / S, later: r[1] / S, share: r[2] / S, shareHere: a && a.firstShare[i] !== null ? a.firstShare[i] / S : null }; }) };
    }

    return {
      evaluate: evaluate, fixes: fixes, firstFlight: firstFlight, route: route, nonstopExists: nonstopExists, hubs: hubs,
      addShard: addShard, hasShard: hasShard, band: band, airport: function (c) { return byCode[c] || null; },
      airports: nat.airports, seasons: meta.seasons, bands: meta.bands, meta: meta, MCT: MCT
    };
  }

  /* ---------- live layer: National Weather Service responses ---------- */
  // alerts: api.weather.gov/alerts/active?point=lat,lon JSON. Keep hazards overlapping [startISO, endISO).
  function hazards(alerts, startISO, endISO) {
    var s = Date.parse(startISO), e = Date.parse(endISO);
    return ((alerts && alerts.features) || []).map(function (f) { return f.properties || {}; }).filter(function (p) {
      if (HAZARDS.indexOf(p.event) < 0) return false;
      var on = Date.parse(p.onset || p.effective || p.sent), off = Date.parse(p.ends || p.expires);
      return (isNaN(on) || on < e) && (isNaN(off) || off > s);
    }).map(function (p) { return { event: p.event, headline: p.headline || p.event, severe: SEVERE.test(p.event), ends: p.ends || p.expires || null }; });
  }
  // forecast: api.weather.gov/gridpoints/.../forecast JSON. Periods that start on dateISO (YYYY-MM-DD, local).
  function forecastFor(forecast, dateISO) {
    var periods = ((forecast && forecast.properties && forecast.properties.periods) || []).filter(function (p) { return String(p.startTime).slice(0, 10) === dateISO; });
    return periods.map(function (p) { return { name: p.name, text: p.shortForecast, detail: p.detailedForecast || '', flag: WX_WORDS.test(p.shortForecast + ' ' + (p.detailedForecast || '')) }; });
  }
  function liveState(todayISO, travelISO) {
    var d = Math.round((Date.parse(travelISO + 'T12:00:00Z') - Date.parse(todayISO + 'T12:00:00Z')) / 864e5);
    return { daysUntil: d, active: d >= 0 && d <= 7, past: d < 0 };
  }

  return { create: create, hazards: hazards, forecastFor: forecastFor, liveState: liveState, interp: interp, median: median, MCT: MCT, HAZARDS: HAZARDS };
});
