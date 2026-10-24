/* When will my soil be warm enough? The engine.
 *
 * Three sources, each labelled where it is shown:
 *   measured  MSU Enviroweather (MAWN) station soil temperature, 2 inches down, daily low and high.
 *             Fetched in the browser. Daily average = (low + high) / 2.
 *   forecast  Open-Meteo model soil temperature at 6 cm (about 2.4 inches), hourly, averaged per day,
 *             then shifted by the average gap between model and station over the last 7 days.
 *   history   The same MSU station's measured springs, 2016 to 2026 (michigan-soil-data.js).
 *
 * The temperatures are MSU's: beets, carrots, radishes and turnips germinate from 40°F; warm-season
 * seed needs soil above 60°F at planting depth. One rule is the site's own and is disclosed wherever
 * it is used: soil counts as warm enough from the first day its daily average stays at or above the
 * temperature for the rest of the data (the rest of the forecast, or through June 30 for past springs).
 *
 * Requires garden-kit.js (dates) and michigan-soil-data.js (stations and history).
 */
(function (root) {
  'use strict';
  var K = root.GardenKit, D = root.MISoilData;

  var THRESHOLDS = {
    40: { t: 40, strict: false, crops: 'beets, carrots, radishes and turnips', short: 'root crops', word: 'reaches 40°F', quote: 'Beets, carrots, radishes and turnips, on the other hand, will germinate at a minimum of 40°F.' },
    60: { t: 60, strict: true, crops: 'beans, squash, cucumbers and other warm-season seed', short: 'warm-season seed', word: 'is above 60°F', quote: 'Seeds of warm season crops germinate poorly in cool soil ... will not germinate well unless the soil temperature at planting depth exceeds 60°F.' }
  };
  var SOURCE = { title: 'How to Plant Vegetables', who: 'MSU Extension', date: 'updated April 29, 2009', url: 'https://www.canr.msu.edu/uploads/resources/pdfs/plantingveg.pdf' };
  var SPRING_END = K.parse('Jul 31'), MAR1 = K.parse('Mar 1'), JUN30 = K.parse('Jun 30');
  var FORECAST_DAYS = 16, BIAS_DAYS = 7, MIN_BIAS_DAYS = 3, TRUST_GAP = 8;

  function warm(v, th) { return v !== null && v !== undefined && (th.strict ? v > th.t : v >= th.t); }
  function round(v) { return Math.round(v); }
  function num(v) { if (v === null || v === undefined || v === '') return null; var n = Number(v); return isFinite(n) && n > -20 && n < 120 ? n : null; }
  function addDays(iso, n) { var p = iso.split('-').map(Number), d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + n)); return d.toISOString().slice(0, 10); }
  function dayOf(iso) { return K.fromISO(iso); }
  function diffDays(a, b) { var p = a.split('-').map(Number), q = b.split('-').map(Number); return Math.round((Date.UTC(q[0], q[1] - 1, q[2]) - Date.UTC(p[0], p[1] - 1, p[2])) / 864e5); }
  function fmtISO(iso) { return K.fmt(dayOf(iso)); }

  // ---------- places ----------
  function miles(a, b) { var R = 3958.8, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r; var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) * Math.sin(dLon / 2); return 2 * R * Math.asin(Math.sqrt(x)); }
  function nearest(pt) {
    var best = null, bm = Infinity;
    D.STATIONS.forEach(function (s) { var m = miles(pt, [s.lat, s.lon]); if (m < bm) { bm = m; best = s; } });
    return { station: best, miles: Math.round(bm) };
  }
  function station(id) { return D.STATIONS.filter(function (s) { return s.id === id; })[0] || null; }

  // ---------- turning responses into daily series ----------
  /* MSU soilconditions table rows -> [{iso, t, lo, hi, t4}] (2-inch daily average, low, high; 4-inch average). */
  function fromMSU(json) {
    var rows = json && json.data && json.data.Table;
    if (!rows || !rows.length) return [];
    return rows.map(function (r) {
      var lo = num(r.stmp_05cm_min), hi = num(r.stmp_05cm_max), lo4 = num(r.stmp_10cm_min), hi4 = num(r.stmp_10cm_max);
      return { iso: r.date, lo: lo, hi: hi, t: lo !== null && hi !== null && hi >= lo ? (lo + hi) / 2 : null, t4: lo4 !== null && hi4 !== null && hi4 >= lo4 ? (lo4 + hi4) / 2 : null };
    }).filter(function (r) { return /^\d{4}-\d{2}-\d{2}$/.test(r.iso); });
  }
  /* Open-Meteo hourly soil_temperature_6cm (already °F, local time) -> [{iso, t}] daily averages.
   * A day needs at least 20 of its 24 hours. */
  function fromModel(json) {
    var h = json && json.hourly, times = h && h.time, vals = h && h.soil_temperature_6cm;
    if (!times || !vals || times.length !== vals.length) return [];
    var unit = json.hourly_units && json.hourly_units.soil_temperature_6cm;
    var toF = unit && /C/.test(unit) && !/F/.test(unit) ? function (c) { return c * 9 / 5 + 32; } : function (f) { return f; };
    var days = {}, order = [];
    for (var i = 0; i < times.length; i++) {
      var iso = String(times[i]).slice(0, 10), v = num(vals[i]);
      if (!days[iso]) { days[iso] = []; order.push(iso); }
      if (v !== null) days[iso].push(toF(v));
    }
    return order.filter(function (iso) { return days[iso].length >= 20; }).map(function (iso) {
      var a = days[iso]; return { iso: iso, t: a.reduce(function (s, x) { return s + x; }, 0) / a.length };
    });
  }
  /* Average gap (station minus model) over the last BIAS_DAYS measured days that both have. */
  function bias(measured, model) {
    var m = {}; model.forEach(function (r) { m[r.iso] = r.t; });
    var pairs = measured.filter(function (r) { return r.t !== null && m[r.iso] !== undefined; }).slice(-BIAS_DAYS);
    if (pairs.length < MIN_BIAS_DAYS) return null;
    var gaps = pairs.map(function (r) { return r.t - m[r.iso]; });
    var off = gaps.reduce(function (s, x) { return s + x; }, 0) / gaps.length;
    return { offset: off, days: pairs.length, from: pairs[0].iso, to: pairs[pairs.length - 1].iso, gaps: gaps };
  }
  /* Measured days through yesterday, then adjusted model days after the last measured day. */
  function combine(measured, model, b, todayIso) {
    var out = measured.filter(function (r) { return r.iso < todayIso && r.t !== null; }).map(function (r) { return { iso: r.iso, t: r.t, kind: 'measured' }; });
    var last = out.length ? out[out.length - 1].iso : addDays(todayIso, -1);
    if (b) model.forEach(function (r) { if (r.iso > last) out.push({ iso: r.iso, t: r.t + b.offset, kind: 'forecast' }); });
    return out;
  }

  // ---------- the rule ----------
  /* First day from which every later day in the series is warm. Gaps in the series are skipped, not
   * counted as warm. The series must keep going at least 2 days past that day, so one warm day at the
   * very end of a forecast does not count. Returns the row or null. */
  function settled(series, th) {
    var start = null, run = 0;
    for (var i = 0; i < series.length; i++) {
      if (series[i].t === null) continue;
      if (warm(series[i].t, th)) { if (start === null) start = series[i]; run++; }
      else { start = null; run = 0; }
    }
    return start && run >= 3 ? start : null;
  }
  function firstWarm(series, th) { for (var i = 0; i < series.length; i++) if (warm(series[i].t, th)) return series[i]; return null; }

  // ---------- history ----------
  /* Past springs at a station: day of year each spring settled at the temperature (59 = on or before
   * Mar 1, -1 = not by June 30, null = no usable record that spring). */
  function outlook(st, t) {
    var hist = D.HISTORY[st.id], xs = hist ? hist['x' + t] : [];
    var years = [], reached = [], never = 0;
    xs.forEach(function (v, i) { if (v === null) return; years.push(D.Y0 + i); if (v === -1) never++; else reached.push({ d: v, y: D.Y0 + i }); });
    var ds = reached.map(function (r) { return r.d; }).sort(function (a, b) { return a - b; });
    var med = ds.length ? (ds.length % 2 ? ds[(ds.length - 1) / 2] : Math.round((ds[ds.length / 2 - 1] + ds[ds.length / 2]) / 2)) : null;
    var lastYear = reached.length || never ? years[years.length - 1] : null;
    return { n: years.length, reached: ds.length, never: never, median: med, earliest: ds.length ? ds[0] : null, latest: ds.length ? ds[ds.length - 1] : null, from: years[0] || null, to: lastYear, byMar1: ds.filter(function (d) { return d <= MAR1; }).length };
  }
  function dayText(d) { return d <= MAR1 ? 'by ' + K.fmt(MAR1) : K.fmt(d); }
  function outlookWords(o, t) {
    if (!o.n) return 'This station has no full spring of soil records yet.';
    var th = THRESHOLDS[t], head = 'In ' + (o.reached === o.n ? 'all ' + o.n : o.reached + ' of the ' + o.n) + ' springs measured here (' + o.from + ' to ' + o.to + '), the soil ' + (t === 40 ? 'stayed at 40°F or warmer' : 'stayed above 60°F') + ' by June 30';
    if (!o.reached) return 'In none of the ' + o.n + ' springs measured here (' + o.from + ' to ' + o.to + ') did the soil stay ' + (t === 40 ? 'at 40°F or warmer' : 'above 60°F') + ' by June 30.';
    return head + '. The middle date was ' + dayText(o.median) + (o.reached > 1 ? ', the earliest ' + dayText(o.earliest) + ' and the latest ' + dayText(o.latest) : '') + '.' + (th ? '' : '');
  }
  /* The typical curve: middle (median) and the middle half of past springs, every 5 days Mar 1 to Jun 30. */
  function typical(st) { var h = D.HISTORY[st.id]; return h && h.curve ? { days: h.curve.map(function (_, i) { return MAR1 + i * 5; }), mid: h.curve, lo: h.lo, hi: h.hi } : null; }

  // ---------- the answer ----------
  /* data: { measured: fromMSU(...), model: fromModel(...) } (either may be missing).
   * Returns everything the page shows for one station, one temperature, one day. */
  function assess(st, t, todayIso, data) {
    data = data || {};
    var th = THRESHOLDS[t], today = dayOf(todayIso), spring = today <= SPRING_END;
    var measured = (data.measured || []).filter(function (r) { return r.iso < todayIso; });
    var model = data.model || [];
    var lastM = null; for (var i = measured.length - 1; i >= 0; i--) if (measured[i].t !== null) { lastM = measured[i]; break; }
    var stale = lastM ? diffDays(lastM.iso, todayIso) > 3 : true;
    var b = lastM && !stale ? bias(measured, model) : null;
    var series = combine(stale ? [] : measured, model, b, todayIso);
    var end = series.length ? series[series.length - 1] : null;
    var hasForecast = series.some(function (r) { return r.kind === 'forecast'; });
    var o = outlook(st, t), out = { station: st, t: t, th: th, today: todayIso, spring: spring, measured: measured, model: model, bias: b, series: series, last: lastM, stale: stale, outlook: o, hasForecast: hasForecast, end: end };
    if (!lastM || stale) { out.code = 'NO_LIVE'; return out; }
    // Recent trend: last measured day against 7 days earlier.
    var wk = measured.filter(function (r) { return r.t !== null && r.iso <= addDays(lastM.iso, -6); }).slice(-1)[0];
    out.trend = wk ? lastM.t - wk.t : null;
    if (!spring) { out.code = 'OFFSEASON'; return out; }
    // This spring, measured only: did it already settle (and is it still warm)?
    var springMeasured = measured.filter(function (r) { return dayOf(r.iso) >= MAR1 || today < MAR1; }).map(function (r) { return { iso: r.iso, t: r.t, kind: 'measured' }; });
    var fullSeries = springMeasured.concat(series.filter(function (r) { return r.kind === 'forecast'; }));
    var s = settled(fullSeries, th);
    out.firstWarm = firstWarm(series, th);
    if (s && s.kind === 'measured') { out.code = 'READY'; out.since = s.iso; return out; }
    if (s && s.kind === 'forecast') { out.code = 'SOON'; out.on = s.iso; return out; }
    // Not settled within the data. Warm now but the forecast cools it again, or still cold.
    out.code = warm(lastM.t, th) ? 'DIPPING' : 'NOT_YET';
    out.dip = null;
    if (out.code === 'DIPPING') { for (var j = 0; j < series.length; j++) if (!warm(series[j].t, th)) { out.dip = series[j]; break; } }
    return out;
  }

  root.MISoil = {
    THRESHOLDS: THRESHOLDS, SOURCE: SOURCE, FORECAST_DAYS: FORECAST_DAYS, BIAS_DAYS: BIAS_DAYS, TRUST_GAP: TRUST_GAP, SPRING_END: SPRING_END, MAR1: MAR1, JUN30: JUN30,
    nearest: nearest, station: station, miles: miles, fromMSU: fromMSU, fromModel: fromModel, bias: bias, combine: combine,
    settled: settled, firstWarm: firstWarm, warm: warm, outlook: outlook, outlookWords: outlookWords, dayText: dayText, typical: typical, assess: assess,
    addDays: addDays, diffDays: diffDays, fmtISO: fmtISO, round: round
  };
})(typeof window !== 'undefined' ? window : globalThis);
