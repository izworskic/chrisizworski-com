// Shared logic for Michigan Snow Totals. The same file runs in the browser
// (window.SnowCore) and in the API and tests (require). Nothing here fetches
// or models anything: it ranks, filters, locates and words official reports.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.SnowCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var HOUR = 3600e3;
  var WINDOWS = ['24h', '48h', '72h', '168h'];
  var WINDOW_HOURS = { '24h': 24, '48h': 48, '72h': 72, '168h': 168 };
  var WINDOW_LABEL = { '24h': 'the last 24 hours', '48h': 'since midnight yesterday', '72h': 'the last 72 hours', '168h': 'the last 7 days' };

  // Nine regions covering all 83 counties, named the way Michigan people talk
  // about the state. The snow-belt regions share their county lists with the
  // snowmobile tool (lib/snowmobile/regions.mjs) so a region hand-off lands on
  // the same ground; tests keep the two from drifting.
  var REGIONS = [
    { id: 'keweenaw', label: 'Keweenaw & Copper Country', counties: ['Houghton', 'Keweenaw', 'Ontonagon', 'Baraga'],
      trails: [{ href: '/snowmobile/regions/keweenaw-copper-country.html', label: 'Keweenaw snowmobile conditions' }] },
    { id: 'central-western-up', label: 'Central & Western U.P.', counties: ['Marquette', 'Dickinson', 'Iron', 'Delta', 'Menominee', 'Gogebic'],
      trails: [{ href: '/snowmobile/regions/central-western-up.html', label: 'Central and Western U.P. snowmobile conditions' }] },
    { id: 'eastern-up', label: 'Eastern U.P.', counties: ['Chippewa', 'Mackinac', 'Luce', 'Schoolcraft', 'Alger'],
      trails: [{ href: '/snowmobile/regions/eastern-up.html', label: 'Eastern U.P. snowmobile conditions' }] },
    { id: 'northwest-lower', label: 'Northwest Lower Michigan', counties: ['Emmet', 'Charlevoix', 'Antrim', 'Leelanau', 'Benzie', 'Grand Traverse', 'Kalkaska', 'Manistee', 'Wexford', 'Missaukee'],
      trails: [{ href: '/snowmobile/regions/northwest-michigan.html', label: 'Northwest Michigan snowmobile conditions' }, { href: '/snowmobile/regions/west-michigan.html', label: 'Cadillac and Manistee area snowmobile conditions' }] },
    { id: 'northeast-lower', label: 'Northeast Lower & Gaylord', counties: ['Cheboygan', 'Presque Isle', 'Montmorency', 'Otsego', 'Crawford', 'Oscoda', 'Alpena', 'Alcona', 'Roscommon', 'Ogemaw', 'Iosco'],
      trails: [{ href: '/snowmobile/regions/grayling-gaylord.html', label: 'Grayling and Gaylord snowmobile conditions' }, { href: '/snowmobile/regions/northeast-sunrise.html', label: 'Sunrise Side snowmobile conditions' }] },
    { id: 'west-michigan', label: 'West Michigan', counties: ['Mason', 'Lake', 'Oceana', 'Newaygo', 'Osceola', 'Muskegon', 'Mecosta', 'Ottawa', 'Kent', 'Montcalm', 'Ionia', 'Allegan', 'Barry'],
      trails: [{ href: '/snowmobile/regions/west-michigan.html', label: 'Lake, Newaygo and Oceana snowmobile conditions' }] },
    { id: 'southwest', label: 'Southwest Michigan', counties: ['Van Buren', 'Kalamazoo', 'Calhoun', 'Berrien', 'Cass', 'St. Joseph', 'Branch'], trails: [] },
    { id: 'mid-thumb', label: 'Mid-Michigan & the Thumb', counties: ['Clare', 'Gladwin', 'Arenac', 'Isabella', 'Midland', 'Bay', 'Gratiot', 'Saginaw', 'Tuscola', 'Huron', 'Sanilac', 'Clinton', 'Shiawassee', 'Genesee', 'Lapeer', 'Eaton', 'Ingham'], trails: [] },
    { id: 'southeast', label: 'Southeast Michigan', counties: ['Livingston', 'Oakland', 'Macomb', 'St. Clair', 'Washtenaw', 'Wayne', 'Jackson', 'Hillsdale', 'Lenawee', 'Monroe'], trails: [] }
  ];

  function normCounty(c) { return String(c || '').toLowerCase().replace(/\bsaint\b/g, 'st').replace(/[^a-z]/g, ''); }
  var COUNTY_REGION = {};
  REGIONS.forEach(function (r) { r.counties.forEach(function (c) { COUNTY_REGION[normCounty(c)] = r.id; }); });
  function regionOf(county) { return COUNTY_REGION[normCounty(county)] || null; }
  function regionById(id) { for (var i = 0; i < REGIONS.length; i++) if (REGIONS[i].id === id) return REGIONS[i]; return null; }

  // IEM passes the NWS source field through with inconsistent casing.
  var SOURCES = {
    cocorahs: 'CoCoRaHS observer', coopobserver: 'Co-op observer', trainedspotter: 'Trained spotter', public: 'Public report',
    officialnwsobs: 'NWS observation', nwsemployee: 'NWS employee', broadcastmedia: 'Broadcast media', emergencymngr: 'Emergency manager',
    amateurradio: 'Amateur radio', lawenforcement: 'Law enforcement', socialmedia: 'Social media', countyofficial: 'County official',
    departmentofhighways: 'Road department', firedeptrescue: 'Fire department', mesonet: 'Mesonet station', asos: 'Airport weather station'
  };
  function sourceLabel(s) {
    var k = String(s || '').toLowerCase().replace(/[^a-z]/g, '');
    if (SOURCES[k]) return SOURCES[k];
    var t = String(s || '').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : 'Unknown source';
  }
  function countyLabel(c) {
    var t = String(c || '').trim();
    if (/^[A-Z]{3}\d{3}$/.test(t)) return 'on the Great Lakes';
    return t ? t + ' County' : '';
  }

  // Place keys: spotters update the same place through a storm, so each place ranks once.
  function placeKey(r) { return (r.place + '|' + r.county).toLowerCase(); }
  function largestPerPlace(reports) {
    var best = new Map();
    reports.forEach(function (r) {
      var k = placeKey(r), prior = best.get(k);
      if (!prior || r.inches > prior.inches || (r.inches === prior.inches && r.reportedAt > prior.reportedAt)) best.set(k, r);
    });
    return Array.from(best.values()).sort(function (a, b) { return b.inches - a.inches || b.reportedAt.localeCompare(a.reportedAt); });
  }
  // Calendar dates and midnights in Michigan (Eastern) time, DST-safe.
  function detroitDate(ms) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  }
  function detroitMidnight(dateStr) {
    var guess = Date.parse(dateStr + 'T05:00:00Z');
    var hour = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Detroit', hour: '2-digit', hourCycle: 'h23' }).format(new Date(guess));
    return guess - (+hour) * HOUR;
  }
  // "Since yesterday" starts at midnight yesterday, Eastern time, not 48 hours back:
  // at 10 a.m. Tuesday it covers Monday and Tuesday morning, never Sunday.
  function windowStart(win, nowMs) {
    if (win === '48h') return detroitMidnight(detroitDate(detroitMidnight(detroitDate(nowMs)) - HOUR));
    return nowMs - (WINDOW_HOURS[win] || 24) * HOUR;
  }
  function inWindow(reports, win, nowMs) {
    var start = typeof win === 'number' ? nowMs - win * HOUR : windowStart(win, nowMs);
    return reports.filter(function (r) { var t = Date.parse(r.reportedAt); return t >= start && t <= nowMs + HOUR; });
  }
  function rowsFor(reports, win, nowMs) { return largestPerPlace(inWindow(reports, win, nowMs)); }

  function byRegion(rows) {
    return REGIONS.map(function (r) {
      var mine = rows.filter(function (x) { return x.region === r.id; });
      return { id: r.id, label: r.label, places: mine.length, largest: mine[0] || null };
    });
  }

  // ---- Finding a town ----
  var DIR = '(?:n|nne|ne|ene|e|ese|se|sse|s|ssw|sw|wsw|w|wnw|nw|nnw)';
  var OFFSET = new RegExp('^\\d+(?:\\.\\d+)?\\s+' + DIR + '\\s+');
  function normName(s) {
    return String(s || '').toLowerCase().replace(/\bsaint\b/g, 'st').replace(/\bmount\b/g, 'mt').replace(/\bsault ste\b/g, 'sault st')
      .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  }
  // "4 NE Negaunee" is a report near Negaunee.
  function baseTown(place) { return normName(place).replace(OFFSET, ''); }
  // "4 WSW Bates" is NWS shorthand for 4 miles west-southwest of Bates.
  function prettyPlace(place) {
    var m = /^(\d+(?:\.\d+)?)\s+([NSEW]{1,3})\s+(.+)$/i.exec(String(place || '').trim());
    return m ? m[1] + ' mi ' + m[2].toUpperCase() + ' of ' + m[3] : String(place || '');
  }
  function cleanQuery(q) { return normName(q).replace(/\s+(mi|michigan)(\s+\d{5})?$/, '').trim(); }

  function milesBetween(lat1, lon1, lat2, lon2) {
    var R = 3958.8, rad = Math.PI / 180;
    var dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function compass(lat1, lon1, lat2, lon2) {
    var rad = Math.PI / 180, y = Math.sin((lon2 - lon1) * rad) * Math.cos(lat2 * rad);
    var x = Math.cos(lat1 * rad) * Math.sin(lat2 * rad) - Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos((lon2 - lon1) * rad);
    var deg = (Math.atan2(y, x) / rad + 360) % 360;
    return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
  }
  function nearest(lat, lon, rows, n, maxMiles) {
    return rows.map(function (r) { return { row: r, miles: milesBetween(lat, lon, r.lat, r.lon), dir: compass(lat, lon, r.lat, r.lon) }; })
      .filter(function (x) { return !maxMiles || x.miles <= maxMiles; })
      .sort(function (a, b) { return a.miles - b.miles; })
      .slice(0, n || 3);
  }
  // places: [[name, lat, lon, kind]] from the Census gazetteer (kind 'p' place, 'c' county).
  function placeLabel(p) { return p[3] === 't' ? p[0] + ' Township' + (p[4] ? ', ' + p[4] + ' County' : '') : p[3] === 'c' ? p[0] + ' County' : p[0]; }
  function lookupPlace(q, places) {
    if (!places || !q) return null;
    var exact = null, prefixes = [];
    for (var i = 0; i < places.length; i++) {
      var p = places[i], n = normName(p[0]);
      if (n === q) { if (!exact || p[3] === 'p') exact = p; }
      else if (q.length >= 3 && n.indexOf(q) === 0 && p[3] !== 'c') prefixes.push(p);
    }
    var hit = exact || (prefixes.length === 1 ? prefixes[0] : null);
    if (!hit) return prefixes.length ? { choices: prefixes.slice(0, 8).map(placeLabel) } : null;
    return { name: placeLabel(hit), lat: hit[1], lon: hit[2], kind: hit[3] };
  }

  // Answers "how much snow did <town> get?" from the rows of one window.
  function findTown(query, rows, places, opts) {
    var q = cleanQuery(query);
    var radius = (opts && opts.radius) || 25;
    if (!q) return { kind: 'empty' };
    var countyQ = q.replace(/\s+(county|co)$/, '');
    var isCountyAsk = /\s(county|co)$/.test(q);
    var place = isCountyAsk ? lookupPlace(countyQ, (places || []).filter(function (p) { return p[3] === 'c'; })) : lookupPlace(q, places);
    if (place && place.choices) {
      var named = rows.filter(function (r) { return baseTown(r.place) === q; });
      if (!named.length) return { kind: 'choose', label: query, choices: place.choices };
      place = null;
    }
    // Two towns can share a name (Bear Lake, Sand Lake): a report counts as the
    // town's own only when it is within 15 miles of the town the gazetteer found.
    var own = isCountyAsk ? [] : rows.filter(function (r) {
      return baseTown(r.place) === q && (!place || place.kind === 'c' || milesBetween(place.lat, place.lon, r.lat, r.lon) <= 15);
    });
    if (own.length) {
      return { kind: 'town', label: titleCase(q), rows: own, place: place,
        nearby: place ? nearest(place.lat, place.lon, rows.filter(function (r) { return own.indexOf(r) < 0; }), 3, radius) : [] };
    }
    var inCounty = rows.filter(function (r) { return normCounty(r.county) === countyQ.replace(/ /g, ''); });
    if (isCountyAsk || (inCounty.length && (!place || place.kind === 'c'))) {
      return { kind: 'county', label: titleCase(countyQ) + ' County', rows: inCounty, place: place && place.kind === 'c' ? place : null };
    }
    if (place) return { kind: 'nearby', label: place.name, place: place, nearby: nearest(place.lat, place.lon, rows, 3, radius), radius: radius };
    var partial = rows.filter(function (r) { return baseTown(r.place).indexOf(q) === 0; });
    var towns = {}; partial.forEach(function (r) { towns[baseTown(r.place)] = true; });
    if (Object.keys(towns).length === 1) return { kind: 'town', label: titleCase(Object.keys(towns)[0]), rows: partial, nearby: [] };
    if (partial.length) return { kind: 'choose', label: query, choices: Object.keys(towns).slice(0, 8).map(titleCase) };
    return { kind: 'unknown', label: query };
  }
  function titleCase(s) { return String(s).replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

  // ---- Wording ----
  function inches(n) { return (Math.round(n * 10) / 10).toFixed(1).replace(/\.0$/, '') + ' in.'; }
  function relTime(iso, nowMs) {
    var mins = Math.round((nowMs - Date.parse(iso)) / 60000);
    if (mins < 60) return mins <= 1 ? 'just now' : mins + ' min ago';
    var hrs = Math.round(mins / 60);
    if (hrs < 24) return hrs + ' hr ago';
    var days = Math.round(hrs / 24);
    return days === 1 ? '1 day ago' : days + ' days ago';
  }
  function when(iso) {
    return new Date(iso).toLocaleString('en-US', { timeZone: 'America/Detroit', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }
  function shareUrl(base, state) {
    var u = new URL(base);
    u.search = '';
    if (state.town) u.searchParams.set('town', state.town);
    if (state.window && state.window !== '24h') u.searchParams.set('window', state.window);
    if (state.region) u.searchParams.set('region', state.region);
    return u.toString();
  }
  function shareText(row) {
    return prettyPlace(row.place) + ', Michigan: ' + inches(row.inches) + ' of snow reported (' + (row.measured ? 'measured' : 'estimated') + ', ' +
      sourceLabel(row.source) + ') at ' + when(row.reportedAt) + ' ET. Official National Weather Service reports:';
  }
  function parseParams(search) {
    var p = new URLSearchParams(search || '');
    var win = p.get('window');
    var region = p.get('region');
    return {
      town: (p.get('town') || '').slice(0, 60),
      window: WINDOWS.indexOf(win) >= 0 ? win : null,
      region: regionById(region) ? region : null
    };
  }

  // ---- Season so far from NOAA ACIS daily snowfall ----
  function seasonStart(date) {
    var y = date.getUTCFullYear(), m = date.getUTCMonth() + 1;
    return (m >= 7 ? y : y - 1) + '-07-01';
  }
  function seasonLabel(start) { var y = +start.slice(0, 4); return y + '-' + String(y + 1).slice(2); }
  function acisValue(v) {
    if (v === 'M' || v == null) return null;
    if (v === 'T') return 0;
    var n = parseFloat(String(v).replace(/[A-Z]$/i, ''));
    return Number.isFinite(n) ? n : null;
  }
  // rows: [[date, snow, normal], ...]
  function seasonStation(rows) {
    var total = 0, normal = 0, missing = 0, snowDays = 0, first = null, biggest = null, normalKnown = true;
    rows.forEach(function (row) {
      var v = acisValue(row[1]), nv = acisValue(row[2]);
      // A missing July day cannot hide snow; only days in the snow season count against completeness.
      if (v == null) { if (nv == null || nv > 0) missing += 1; }
      else {
        total += v;
        if (v >= 0.1) { snowDays += 1; if (!first) first = { date: row[0], inches: v }; }
        if (!biggest || v > biggest.inches) biggest = { date: row[0], inches: v };
      }
      if (nv == null) normalKnown = false; else normal += nv;
    });
    total = Math.round(total * 10) / 10;
    normal = normalKnown ? Math.round(normal * 10) / 10 : null;
    // Under 2 in. of normal (early season) a percentage swings wildly on a single dusting.
    var complete = missing <= 5;
    return {
      total: total, normal: normal, missing: missing, days: rows.length, complete: complete, snowDays: snowDays,
      first: first, biggest: biggest && biggest.inches > 0 ? biggest : null,
      pctOfNormal: complete && normal != null && normal >= 2 ? Math.round((total / normal) * 100) : null,
      pctNote: !complete ? 'incomplete' : normal == null ? 'no normal' : normal < 2 ? 'too early' : missing ? missing + ' day' + (missing === 1 ? '' : 's') + ' missing' : ''
    };
  }

  // What the nearest climate station says about a place: this season, the usual
  // first snow and last winter. This is the whole answer before the first storm.
  function stationContext(lat, lon, seasonPayload, maxMiles) {
    if (!seasonPayload || lat == null) return null;
    var cur = seasonPayload.season, last = (seasonPayload.lastSeason && seasonPayload.lastSeason.stations) || [];
    var pool = cur && cur.stations && cur.stations.length ? cur.stations : last;
    var best = null;
    pool.forEach(function (st) { var mi = milesBetween(lat, lon, st.lat, st.lon); if (!best || mi < best.miles) best = { st: st, miles: mi }; });
    if (!best || best.miles > (maxMiles || 60)) return null;
    var id = best.st.id, lastRow = null;
    last.forEach(function (st) { if (st.id === id) lastRow = st; });
    var withFirst = (cur && cur.stations || []).filter(function (st) { return st.firstSnowNormal; })
      .map(function (st) { return { st: st, miles: milesBetween(lat, lon, st.lat, st.lon) }; }).sort(function (a, b) { return a.miles - b.miles; })[0];
    return {
      station: best.st.name, miles: best.miles, dir: compass(lat, lon, best.st.lat, best.st.lon),
      season: cur && cur.stations && cur.stations.length ? { label: cur.label, anySnow: cur.anySnow, total: best.st.total, pctOfNormal: best.st.pctOfNormal, first: best.st.first || null } : null,
      firstSnowNormal: withFirst && withFirst.miles <= (maxMiles || 60) ? { station: withFirst.st.name, median: withFirst.st.firstSnowNormal } : null,
      lastSeason: lastRow ? { label: seasonPayload.lastSeason.label, total: lastRow.total, pctOfNormal: lastRow.pctOfNormal } : null
    };
  }

  return {
    stationContext: stationContext,
    HOUR: HOUR, WINDOWS: WINDOWS, WINDOW_HOURS: WINDOW_HOURS, WINDOW_LABEL: WINDOW_LABEL, REGIONS: REGIONS,
    regionOf: regionOf, regionById: regionById, normCounty: normCounty, sourceLabel: sourceLabel, countyLabel: countyLabel,
    largestPerPlace: largestPerPlace, inWindow: inWindow, rowsFor: rowsFor, byRegion: byRegion, windowStart: windowStart, detroitDate: detroitDate, detroitMidnight: detroitMidnight,
    normName: normName, baseTown: baseTown, prettyPlace: prettyPlace, cleanQuery: cleanQuery, milesBetween: milesBetween, compass: compass,
    nearest: nearest, lookupPlace: lookupPlace, findTown: findTown,
    inches: inches, relTime: relTime, when: when, shareUrl: shareUrl, shareText: shareText, parseParams: parseParams,
    seasonStart: seasonStart, seasonLabel: seasonLabel, acisValue: acisValue, seasonStation: seasonStation
  };
});
