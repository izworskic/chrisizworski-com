/* Soo Locks Lock Watch: line up the ships the live AIS engine says are heading for
 * the locks against the time a visitor can actually stand on the viewing platform.
 *
 * Everything here is derived. Arrival windows come unchanged from /api/soo-ais
 * (lib/soo-locks-next.js). Park hours and the Visitor Center season are the posted
 * USACE values (checked 2026-11-21). Sunrise and sunset are computed for Sault Ste.
 * Marie with the NOAA sunrise equation. Nothing here invents a ship, a time, a
 * probability or an open/closed status the sources do not state.
 *
 * The pure core is exported for Node tests; the renderer runs only in a browser. */
(function (root) {
  'use strict';

  var nearMotion = typeof module !== 'undefined' && module.exports ? require('./soo-near-lock-motion') : root.SooNearLockMotion;
  var changing = typeof module !== 'undefined' && module.exports ? require('./soo-changing-conditions') : root.SooChangingConditions;
  var memory = typeof module !== 'undefined' && module.exports ? require('./soo-visit-memory') : root.SooVisitMemory;
  var TZ = 'America/Detroit';
  var SAULT = { lat: 46.4953, lon: -84.3453 };
  var MIN = 60000;
  var HOUR = 60 * MIN;
  var BOATNERD = 'https://ais.boatnerd.com/passage/port/soo-locks';
  var USACE = 'https://www.lrd.usace.army.mil/Submit-ArticleCS/Recreation/Article/3833525/soo-locks-visitor-center/';
  // NWS Gaylord (APX) grid cell for the Soo Locks, resolved from /points/46.4953,-84.3453 on 2026-11-22.
  var NWS_POINT = 'https://api.weather.gov/points/46.4953,-84.3453';
  var NWS_HOURLY = 'https://api.weather.gov/gridpoints/APX/65,131/forecast/hourly';

  // ---- time in Sault Ste. Marie ----
  var partsFormat = null;
  function zonedParts(ms) {
    if (!partsFormat) {
      partsFormat = new Intl.DateTimeFormat('en-US', {
        timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric'
      });
    }
    var out = {};
    partsFormat.formatToParts(new Date(ms)).forEach(function (p) { if (p.type !== 'literal') out[p.type] = Number(p.value); });
    if (out.hour === 24) out.hour = 0;
    return { y: out.year, mo: out.month, d: out.day, h: out.hour, mi: out.minute };
  }
  // The instant at a Sault Ste. Marie wall-clock time.
  function zonedInstant(y, mo, d, h, mi) {
    var guess = Date.UTC(y, mo - 1, d, h, mi || 0);
    for (var i = 0; i < 2; i++) {
      var p = zonedParts(guess);
      var wall = Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
      guess += Date.UTC(y, mo - 1, d, h, mi || 0) - wall;
    }
    return guess;
  }
  function localMidnight(ms) { var p = zonedParts(ms); return zonedInstant(p.y, p.mo, p.d, 0, 0); }

  // ---- posted USACE park schedule (Soo Locks Park, checked 2026-11-21) ----
  // June-August 9 a.m.-10 p.m.; May, September, October 9 a.m.-9 p.m.;
  // November-April 9 a.m.-6 p.m. Visitor Center open May 1 to October 31, and the
  // boat-schedule hotline is maintained only while it is open.
  function parkHours(ms) {
    var p = zonedParts(ms);
    var close = p.mo >= 6 && p.mo <= 8 ? 22 : (p.mo === 5 || p.mo === 9 || p.mo === 10) ? 21 : 18;
    return {
      open: zonedInstant(p.y, p.mo, p.d, 9, 0),
      close: zonedInstant(p.y, p.mo, p.d, close, 0),
      label: '9 a.m. to ' + (close - 12) + ' p.m.',
      months: close === 22 ? 'June through August' : close === 21 ? 'May, September and October' : 'November through April'
    };
  }
  function visitorCenterOpen(ms) { var m = zonedParts(ms).mo; return m >= 5 && m <= 10; }

  // Same calendar the page's season strip uses: open March 25 until January 15.
  function navigationSeason(ms) {
    var p = zonedParts(ms);
    var md = p.mo * 100 + p.d;
    var open = md >= 325 || md < 115;
    var reopenYear = md >= 325 ? p.y + 1 : p.y;
    return { open: open, reopens: open ? null : zonedInstant(reopenYear, 3, 25, 0, 0) };
  }

  // ---- sunrise and sunset (NOAA / Almanac for Computers sunrise equation) ----
  var RAD = Math.PI / 180;
  function dayOfYear(y, mo, d) { return Math.round((Date.UTC(y, mo - 1, d) - Date.UTC(y, 0, 0)) / 86400000); }
  function sunEvent(y, mo, d, rising) {
    var N = dayOfYear(y, mo, d), lngHour = SAULT.lon / 15;
    var t = N + ((rising ? 6 : 18) - lngHour) / 24;
    var M = 0.9856 * t - 3.289;
    var L = (M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634 + 360) % 360;
    var RA = (Math.atan(0.91764 * Math.tan(L * RAD)) / RAD + 360) % 360;
    RA = (RA + (Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90)) / 15;
    var sinDec = 0.39782 * Math.sin(L * RAD), cosDec = Math.cos(Math.asin(sinDec));
    var cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(SAULT.lat * RAD)) / (cosDec * Math.cos(SAULT.lat * RAD));
    if (cosH > 1 || cosH < -1) return null;
    var H = (rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
    var T = H + RA - 0.06571 * t - 6.622;
    var UT = ((T - lngHour) % 24 + 24) % 24;
    return Date.UTC(y, mo - 1, d) + UT * HOUR;
  }
  function sunTimes(ms) {
    var p = zonedParts(ms);
    var start = zonedInstant(p.y, p.mo, p.d, 0, 0);
    var rise = sunEvent(p.y, p.mo, p.d, true), set = sunEvent(p.y, p.mo, p.d, false);
    if (rise !== null) { while (rise < start) rise += 24 * HOUR; while (rise >= start + 24 * HOUR) rise -= 24 * HOUR; }
    if (set !== null) { while (set < (rise || start)) set += 24 * HOUR; }
    return { sunrise: rise, sunset: set };
  }
  function isDark(ms) {
    var s = sunTimes(ms);
    if (s.sunrise === null || s.sunset === null) return false;
    return ms < s.sunrise || ms >= s.sunset;
  }

  // ---- formatting ----
  function clock(ms) {
    return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
  }
  function clockZone(ms) {
    return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ, timeZoneName: 'short' });
  }
  function hourLabel(ms) {
    return new Date(ms).toLocaleTimeString('en-US', { hour: 'numeric', timeZone: TZ });
  }
  function dayWord(ms, now) {
    var a = localMidnight(ms), b = localMidnight(now);
    var diff = Math.round((a - b) / (24 * HOUR));
    return diff === 0 ? '' : diff === 1 ? ' tomorrow' : ' on ' + new Date(ms).toLocaleDateString('en-US', { weekday: 'long', timeZone: TZ });
  }
  function duration(minutes) {
    var m = Math.max(0, Math.round(minutes));
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60), r = m % 60;
    return h + ' hr' + (r ? ' ' + r + ' min' : '');
  }
  function title(s) { return s.name || ('Vessel ' + s.mmsi); }
  function directionShort(d) { return d === 'upbound' ? 'Upbound' : d === 'downbound' ? 'Downbound' : 'Direction unknown'; }
  function directionLong(d) {
    return d === 'upbound' ? 'Upbound: coming up the St. Marys River from Lake Huron, rising 21 ft to Lake Superior'
      : d === 'downbound' ? 'Downbound: coming in from Lake Superior, dropping 21 ft toward the lower lakes'
      : 'Direction not reported';
  }
  function chamberText(s) {
    if (s.state === 'in-lock') return (s.chamberName || 'A lock chamber') + ' (last report)';
    if (s.lockCertain) return 'Poe Lock (too large for the MacArthur)';
    return 'Poe or MacArthur; the lockmaster assigns it';
  }

  // ---- the planner ----
  function overlapMinutes(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)) / MIN; }

  // Classifies a ship's estimated window against the visit. No probability is
  // claimed: the label says only how the estimated window and the visit overlap.
  function fitFor(win, visit) {
    var len = Math.max(1, (win.end - win.start) / MIN);
    var ov = overlapMinutes(win.start, win.end, visit.start, visit.end);
    if (ov <= 0) return 'outside';
    var mid = win.mid >= visit.start && win.mid <= visit.end;
    return mid && ov / len >= 0.6 ? 'mostly' : 'partly';
  }

  // Posted access is a planning constraint, not confirmation that the gates are open.
  // Use local calendar days, including DST transitions; intervals are half-open.
  var START_CHOICES = [0, 30, 60, 90, 120, 180, 240];
  var STAY_CHOICES = [45, 90, 180, 240];
  var REPORT_AGE_MS = 15 * MIN; // same conservative eligibility used by the Soo AIS engine
  function nextLocalDay(ms) {
    var p = zonedParts(ms);
    return zonedInstant(p.y, p.mo, p.d + 1, 0, 0);
  }
  function openSegments(start, end) {
    var result = [];
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 7 * 24 * HOUR) return result;
    for (var day = localMidnight(start); day < end; day = nextLocalDay(day)) {
      var hours = parkHours(day + 12 * HOUR);
      if (!navigationSeason(hours.open).open) continue;
      var a = Math.max(start, hours.open), b = Math.min(end, hours.close);
      if (b > a) result.push({ start: a, end: b });
    }
    return result;
  }
  function minutesIn(parts) {
    return parts.reduce(function (n, p) { return n + (p.end - p.start) / MIN; }, 0);
  }
  function coverage(win, visit) {
    return openSegments(Math.max(win.start, visit.start), Math.min(win.end, visit.end));
  }
  function accessibleFit(win, visit) {
    var parts = coverage(win, visit), amount = minutesIn(parts);
    if (!amount) return 'outside';
    var includesMid = parts.some(function (p) { return win.mid >= p.start && win.mid < p.end; });
    return includesMid && amount / Math.max(1, (win.end - win.start) / MIN) >= 0.6 ? 'mostly' : 'partly';
  }
  function freshReport(s, now) {
    if (!s || typeof s.seen !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(s.seen)) return false;
    var seen = Date.parse(s.seen), age = now - seen;
    return Number.isFinite(seen) && new Date(seen).toISOString().slice(0,19) === s.seen.slice(0,19) && age >= 0 && age <= REPORT_AGE_MS;
  }
  function shipEntry(s, now, visit) {
    if (!freshReport(s, now)) return null;
    var seen = Date.parse(s.seen), ageMinutes = Math.floor((now - seen) / MIN);
    if (s.state === 'in-lock') {
      var h = parkHours(now), accessible = navigationSeason(now).open && now >= h.open && now < h.close;
      return {
        id: String(s.id || s.mmsi), name: title(s), raw: s, inLock: true, direction: s.direction || null,
        sizeLabel: s.sizeLabel || null, lengthFeet: s.lengthFeet || null, ageMinutes: ageMinutes,
        start: seen, end: now, mid: now,
        fit: accessible && visit.start <= now && visit.end > now ? 'now' : 'gone',
        afterClose: !accessible, dark: isDark(now)
      };
    }
    var w = s.window || {};
    var start = Date.parse(w.start), end = Date.parse(w.end), mid = Date.parse(w.midpoint);
    if (![start, end, mid].every(Number.isFinite) || start > mid || mid > end || end <= start || end <= now || end - start > 7 * 24 * HOUR) return null;
    var hours = parkHours(mid), win = {start:start,end:end,mid:mid};
    var open = minutesIn(openSegments(start,end));
    var e = {
      id: String(s.id || s.mmsi), name: title(s), raw: s, inLock: false, direction: s.direction || null,
      sizeLabel: s.sizeLabel || null, lengthFeet: s.lengthFeet || null, ageMinutes: ageMinutes,
      start: start, end: end, mid: mid, fit: accessibleFit(win, visit),
      accessibleMinutes: minutesIn(coverage(win,visit)),
      afterClose: open === 0, runsPastClose: open > 0 && open < (end-start)/MIN,
      dark: isDark(start) && isDark(end) && isDark(mid),
      parkLabel: hours.label
    };
    return e;
  }
  // An alternative must respect the earliest arrival and the chosen stay.
  // Enumerate only controls the visitor can actually select; never extend the stay.
  function betterVisit(entries, visit, now, currentMinutes) {
    var stay = (visit.end-visit.start)/MIN, earliest = (visit.start-now)/MIN, best = null;
    if (STAY_CHOICES.indexOf(stay) < 0) return null;
    START_CHOICES.forEach(function (offset) {
      if (offset < earliest) return;
      var v = {start:now+offset*MIN,end:now+(offset+stay)*MIN};
      if (minutesIn(openSegments(v.start,v.end)) !== stay) return;
      entries.forEach(function (e) {
        if (e.inLock) return;
        var n = minutesIn(coverage(e,v));
        if (n <= currentMinutes || (best && n <= best.minutes)) return;
        best={id:e.id,name:e.name,start:v.start,end:v.end,startOffset:offset,stay:stay,minutes:n};
      });
    });
    return best;
  }

  var FIT_RANK = { now: 0, mostly: 1, partly: 2, outside: 3, gone: 4 };

  /* plan({ data, failed, now, startOffset (min), stay (min) })
   * data is the /api/soo-ais JSON (or null). Returns a description the renderer
   * paints and tests assert on. */
  function plan(opts) {
    var now = opts.now || Date.now();
    var visit = { start: now + (opts.startOffset || 0) * MIN, end: 0 };
    visit.end = visit.start + (opts.stay || 90) * MIN;
    var hours = parkHours(visit.start);
    var sun = sunTimes(visit.start);
    var season = navigationSeason(now);
    var vc = visitorCenterOpen(now);
    var out = {
      now: now, visit: visit, park: hours, sun: sun, visitorCenterOpen: vc, hotlineActive: vc,
      season: season, ships: [], best: null, status: '', headline: '', detail: [], notes: []
    };

    var openMinutes = minutesIn(openSegments(visit.start,visit.end));
    var outsideMinutes = (visit.end-visit.start)/MIN - openMinutes;
    out.openMinutes = openMinutes;
    if (outsideMinutes > 0) {
      out.notes.push('Soo Locks Park posted hours today are ' + hours.label + ' (' + hours.months + '), so ' +
        duration(outsideMinutes) + ' of this visit falls outside them. Confirm with USACE before planning around it.');
    }
    if (sun.sunset !== null && visit.end > sun.sunset && visit.start < sun.sunset + 12 * HOUR) {
      out.notes.push('Sunset is ' + clock(sun.sunset) + '. Ships after that pass in the dark.');
    }
    if (!vc) out.notes.push('The indoor Visitor Center and the USACE boat-schedule hotline run May 1 to October 31; the hotline is not maintained now.');

    if (!season.open) {
      out.status = 'season-closed';
      out.headline = 'The locks are closed for the winter shutdown';
      out.detail.push('No commercial ships lock through until the season reopens on ' +
        new Date(season.reopens).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ }) + '.');
      return out;
    }
    if (opts.loading) {
      out.status = 'loading';
      out.headline = 'Checking which ships are heading for the locks\u2026';
      out.detail.push('This lines up the live AIS arrival estimates with the time you can be on the viewing platform.');
      return out;
    }
    var n = opts.data && opts.data.nextShip;
    if (opts.failed || !opts.data || opts.data.ok !== true || !n || !n.ok) {
      out.status = 'unavailable';
      out.headline = 'Live ship reports are unavailable, so no visit can be lined up';
      out.detail.push((opts.failed && opts.data ? 'The latest refresh failed. Earlier windows are withheld until fresh reports return. The last-known positions may still be visible on the map. ' : '') + 'This is not a report of an empty river.' + (vc ? ' Call the boat hotline at 906-202-1333, or see the other ways to check below.' : ' See the other ways to check below.'));
      out.link = { href: '#soo-schedule-answer', label: 'Other ways to check \u2193' };
      return out;
    }
    var nearby = nearMotion ? nearMotion.visitorState(opts.data, opts.failed, now) : null;
    var entries = [];
    var reportedCount = (n.inLock || []).length + (n.candidates || []).length;
    (n.inLock || []).forEach(function (s) { var e = shipEntry(Object.assign({ state: 'in-lock' }, s), now, visit); if (e) entries.push(e); });
    (n.candidates || []).forEach(function (s) { var e = shipEntry(s, now, visit); if (e) entries.push(e); });
    // One row per ship even if a report somehow lands in both lists.
    var seenIds = {};
    entries = entries.filter(function (e) { if (seenIds[e.id]) return false; seenIds[e.id] = true; return true; });
    entries.sort(function (a, b) { return a.start - b.start; });
    out.ships = entries;
    out.notes.unshift('Planning windows describe a modeled arrival, not a confirmed lock time. A ship may slow or stop; check its movement before leaving.');

    var pickId = n.pick ? String(n.pick.id || n.pick.mmsi) : null;
    var ranked = entries.filter(function (e) { return e.fit === 'now' || e.fit === 'mostly' || e.fit === 'partly'; })
      .sort(function (a, b) {
        var r = FIT_RANK[a.fit] - FIT_RANK[b.fit];
        if (r) return r;
        if ((a.accessibleMinutes || 0) !== (b.accessibleMinutes || 0)) return (b.accessibleMinutes || 0) - (a.accessibleMinutes || 0);
        if (a.id === pickId) return -1;
        if (b.id === pickId) return 1;
        return a.start - b.start;
      });
    var best = ranked[0] || null;
    out.best = best;
    var future = entries.filter(function (e) { return !e.inLock && !e.afterClose && e.start >= visit.end; });
    var lookahead = 'Ships still out on open Lake Superior or Lake Huron are beyond this view, so a later visit can gain ships that are not listed yet.';

    if (!openMinutes) {
      out.status = 'park-hours';
      out.headline = 'Your visit falls outside posted park hours';
      out.detail.push('The viewing park is scheduled for '+hours.label+'. Choose a time during posted hours and confirm access with USACE before traveling.');
      if (nearby) out.notes.push(nearby.headline + '. ' + nearby.detail);
      out.suggestion = betterVisit(entries,visit,now,0) || undefined;
      return out;
    }
    if (!entries.length && nearby) {
      out.status = 'near-lock-motion';
      out.headline = nearby.headline;
      out.detail.push(nearby.detail, 'No arrival window can be lined up from this observation. Check the vessel on the live map before planning your visit.');
      out.link = { href: '#sooVesselMap', label: 'See nearby vessel reports on the map' };
      return out;
    }
    if (nearby) out.notes.push(nearby.headline + '. ' + nearby.detail);
    if (!entries.length && reportedCount) {
      out.status = 'stale-reports';
      out.headline = 'No current arrival estimate for your visit';
      out.detail.push('Earlier ship reports are too old, invalid or their modeled windows have ended. Refresh before planning around a ship. This is not proof of an empty river.');
      out.link = {href:'#sooVesselMap',label:'Check vessel reports on the map'};
      return out;
    }
    if (!entries.length) {
      out.status = 'no-ships';
      out.headline = 'No ship is clearly heading for the locks in the latest reports';
      out.detail.push('No current eligible AIS arrival estimate shows a freighter moving toward the locks. That is not proof of an empty river: ships wait at docks and anchorages, and coverage has gaps.');
      out.detail.push(lookahead);
      out.link = { href: '#soo-schedule-answer', label: 'Other ways to check \u2193' };
      return out;
    }
    if (!best) {
      out.status = 'none';
      out.headline = 'No modeled arrival overlaps your available platform time';
      var nextOne = future[0];
      if (nextOne) {
        out.detail.push('The next estimated window is ' + title(nextOne) + ', ' + clock(nextOne.start) + '–' + clockZone(nextOne.end) + dayWord(nextOne.start, now) + '.');
        // The window is informational; only feasible control choices become actions.
      }
      out.suggestion = betterVisit(entries,visit,now,0) || undefined;
      out.detail.push(lookahead);
      return out;
    }
    if (best.fit === 'now') {
      out.status = 'in-lock-now';
      out.headline = title(best) + ' last reported in the ' + (best.raw.chamberName || 'lock');
      out.detail.push('Reported in the chamber ' + best.ageMinutes + ' min ago. If you are already at the platform, look toward the chamber; the vessel may have moved since that report.');
      var after = ranked.filter(function (e) { return e !== best && e.fit !== 'gone'; })[0];
      if (after) out.detail.push('Also inside your visit: ' + title(after) + ', estimated ' + clock(after.start) + '–' + clockZone(after.end) + '.');
      else if (future[0]) {
        out.detail.push('After it, the next estimated window is ' + title(future[0]) + ', ' + clock(future[0].start) + '–' + clockZone(future[0].end) + dayWord(future[0].start, now) + '.');
        out.suggestion = betterVisit(entries,visit,now,0) || undefined;
      }
      return out;
    }
    out.status = best.fit === 'mostly' ? 'match' : 'partial';
    out.headline = (best.fit === 'mostly' ? 'Best bet: ' : 'Possible: ') + title(best) + ', about ' + clock(best.start) + '–' + clockZone(best.end);
    out.detail.push(duration(best.accessibleMinutes) + ' of its modeled arrival window overlaps your visit during posted park hours. This is timing overlap, not a sighting probability. Actual arrival may fall outside the window.');
    if (best.afterClose) out.detail.push('That window is outside the park’s posted hours (' + best.parkLabel + ').');
    else if (best.runsPastClose) out.detail.push('That window runs past the park’s posted closing time (' + best.parkLabel + ').');
    if (best.dark) out.detail.push('It falls after dark.');
    var others = ranked.filter(function (e) { return e !== best && e.fit !== 'gone'; }).length;
    if (others) out.detail.push(others + ' more ' + (others === 1 ? 'ship overlaps' : 'ships overlap') + ' this visit in the lineup below.');
    if (best.fit === 'partly') out.suggestion = betterVisit(entries,visit,now,best.accessibleMinutes) || undefined;
    return out;
  }

  // Summarize the NWS hourly forecast periods that overlap a visit. Values are the
  // forecaster's own numbers, never smoothed or blended; null when nothing covers the visit.
  function visitWeather(props, visit, now) {
    if (!props || !Array.isArray(props.periods)) return null;
    var hours = props.periods.filter(function (p) {
      var a = Date.parse(p.startTime), b = Date.parse(p.endTime);
      return Number.isFinite(a) && Number.isFinite(b) && b > visit.start && a < visit.end;
    });
    if (!hours.length) return null;
    var temps = hours.map(function (p) { return p.temperature; }).filter(Number.isFinite);
    var pops = hours.map(function (p) { return p.probabilityOfPrecipitation && p.probabilityOfPrecipitation.value; }).filter(Number.isFinite);
    var winds = hours.map(function (p) { var m = /(\d+)(?:\s*to\s*(\d+))?\s*mph/.exec(p.windSpeed || ''); return m ? { mph: Number(m[2] || m[1]), dir: p.windDirection } : null; }).filter(Boolean);
    var strongest = winds.sort(function (a, b) { return b.mph - a.mph; })[0] || null;
    var skies = [];
    hours.forEach(function (p) { var f = p.shortForecast; if (f && skies.indexOf(f) < 0) skies.push(f); });
    var issued = Date.parse(props.updateTime || props.generatedAt);
    return {
      lowF: temps.length ? Math.min.apply(null, temps) : null,
      highF: temps.length ? Math.max.apply(null, temps) : null,
      windMph: strongest ? strongest.mph : null, windDir: strongest ? strongest.dir : null,
      maxPop: pops.length ? Math.max.apply(null, pops) : null,
      skies: skies.slice(0, 2), hours: hours.length,
      issued: Number.isFinite(issued) ? issued : null,
      stale: Number.isFinite(issued) ? (now - issued) > 12 * HOUR : true
    };
  }
  function weatherLine(w) {
    if (!w) return null;
    var t = w.lowF === null ? '' : w.lowF === w.highF ? w.lowF + '\u00B0F' : w.lowF + '\u2013' + w.highF + '\u00B0F';
    var bits = [t, w.skies.join(', then ').toLowerCase(),
      w.windMph !== null ? 'wind ' + (w.windDir ? w.windDir + ' ' : '') + 'up to ' + w.windMph + ' mph' : '',
      w.maxPop !== null ? 'precipitation chance up to ' + w.maxPop + '%' : ''].filter(Boolean);
    return bits.join(', ');
  }

  // The page's lock simulator offers a few real hulls. Pick a same-size stand-in for a live
  // ship only when its reported size clearly matches one; otherwise leave the hull alone.
  function simShipFor(s) {
    var len = s && s.lengthFeet;
    if (!s) return null;
    if (s.sizeLabel === '1,000-footer' || (Number.isFinite(len) && len >= 900)) return 'tregurtha';
    if (s.sizeLabel === 'ocean-going saltie') return 'saltie';
    if (Number.isFinite(len) && len > 730) return 'anderson';
    return null;
  }

  var core = {
    TZ: TZ, SAULT: SAULT, BOATNERD: BOATNERD, USACE: USACE,
    zonedParts: zonedParts, zonedInstant: zonedInstant, parkHours: parkHours, visitorCenterOpen: visitorCenterOpen,
    navigationSeason: navigationSeason, sunTimes: sunTimes, isDark: isDark, fitFor: fitFor, openSegments: openSegments, accessibleFit: accessibleFit, freshReport: freshReport, plan: plan, simShipFor: simShipFor, visitWeather: visitWeather, weatherLine: weatherLine, NWS_HOURLY: NWS_HOURLY,
    clock: clock, clockZone: clockZone, duration: duration, directionLong: directionLong, chamberText: chamberText
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  root.SooLockWatchCore = core;
  if (typeof document === 'undefined') return;

  // =================== browser renderer ===================
  var section = document.getElementById('soo-lock-watch');
  if (!section) return;
  var els = {
    controls: section.querySelector('[data-lw-controls]'),
    verdict: section.querySelector('[data-lw-verdict]'),
    board: section.querySelector('[data-lw-board]'),
    axis: section.querySelector('[data-lw-axis]'),
    rows: section.querySelector('[data-lw-rows]'),
    legend: section.querySelector('[data-lw-legend]'),
    dossier: section.querySelector('[data-lw-dossier]'),
    status: section.querySelector('[data-lw-status]'),
    weather: section.querySelector('[data-lw-weather]'),
    changes: section.querySelector('[data-lw-changes]'),
    memory: section.querySelector('[data-lw-memory]'), memoryButton: section.querySelector('[data-lw-memory-button]'), memoryNote: section.querySelector('[data-lw-memory-note]')
  };
  var state = { data: null, failed: false, selected: null, userSelected: false, plan: null, wx: null, wxFailed: false, wxAt: 0, changes: changing ? changing.initial() : null, previousBest: null, saved: null, returnCheck: null, memoryMessage: '', memoryReady: false };

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  function choice(name) {
    var c = section.querySelector('input[name="' + name + '"]:checked');
    return c ? Number(c.value) : null;
  }

  // Local storage is optional; never read a remembered ship as a current report.
  function storage() { return root.localStorage; }
  function readMemory() { try { return memory.read(storage(),Date.now()); } catch (_) { return {ok:false,value:null}; } }
  function writeMemory(v) { try { return memory.write(storage(),v,Date.now()); } catch (_) { return {ok:false,value:null}; } }
  function forgetMemory() { try { return memory.clear(storage()); } catch (_) { return false; } }
  function renderMemory() {
    if(!memory||!els.memory||!state.memoryReady)return;
    els.memory.hidden=false;
    els.memoryButton.textContent=state.saved?'Forget saved visit choices':'Remember my visit choices';
    els.memoryNote.textContent=state.memoryMessage||(state.saved?'Saved on this device only. Choices are relative to the current time; ship reports must be checked again.':'Optional: save your arrival and stay choices on this device, plus a recent check for comparison.');
  }
  function prefsNow(){return {startOffset:choice('lw-start')||0,stay:choice('lw-stay')||90};}
  function persistMemory(preferences) {
    if(!state.saved)return;
    // A clear in another tab must not be undone by a background refresh.
    var current=readMemory();
    if(!current.ok){state.memoryMessage='Device storage is unavailable. Your saved choices may still be on this device.';renderMemory();return;}
    if(!current.value){state.saved=null;state.returnCheck=null;state.memoryMessage='Saved choices cleared.';renderMemory();return;}
    var record=current.value;
    if(preferences)record={...record,prefs:prefsNow(),savedAt:Date.now()};
    // Do not overwrite a newer check saved by another tab.
    if(state.changes?.last&&state.changes.last.checked>=(record.lastCheck||0)){
      record=memory.capture(record,state.changes,Date.now());
    }
    if(!record){state.saved=null;renderMemory();return;}
    if(JSON.stringify(record)===JSON.stringify(current.value)){state.saved=record;return;}
    var result=writeMemory(record);
    state.saved=result.ok?result.value:current.value;
    if(!result.ok){state.returnCheck=null;state.memoryMessage='Could not update saved choices on this device. You can still try to forget them.';}
    renderMemory();
  }
  function setupMemory() {
    if(!memory||!changing||!els.memory||!els.memoryButton)return;
    var got=readMemory();
    state.memoryReady=true;
    if(got.value){
      state.saved=got.value;
      [['lw-start',got.value.prefs.startOffset],['lw-stay',got.value.prefs.stay]].forEach(function(pair){
        var radio=section.querySelector('input[name="'+pair[0]+'"][value="'+pair[1]+'"]');if(radio)radio.checked=true;
      });
      state.returnCheck=got.value.lastCheck;
      state.changes=memory.restore(got.value,changing,Date.now());
      state.memoryMessage='Your saved visit choices are restored. Checking current reports.';
    }else if(!got.ok)state.memoryMessage='Device storage is unavailable; your visit planner still works.';
    els.memoryButton.addEventListener('click',function(){
      if(state.saved){
        if(!forgetMemory()){state.memoryMessage='Could not clear saved choices. Try again or clear site data in your browser.';renderMemory();return;}
        state.saved=null;state.returnCheck=null;
        // Drop the restored comparison, but keep the live plan and seed from current evidence.
        state.changes=changing.step(changing.initial(),state.failed?null:changing.snapshot(state.data,Date.now(),core,nearMotion),state.failed,Date.now());
        state.memoryMessage='Saved choices and remembered check cleared.';update();return;
      }
      var record=memory.create(prefsNow(),Date.now());
      if(record)record=memory.capture(record,state.changes,Date.now());
      var result=record?writeMemory(record):{ok:false};
      state.saved=result.ok?result.value:null;
      state.memoryMessage=result.ok?'Visit choices saved on this device only.':'Device storage is unavailable; choices have not been saved.';
      renderMemory();
    });
    root.addEventListener('storage',function(e){
      if(e.key!==memory.KEY&&e.key!==null)return;
      if(!state.saved)return;
      var latest=readMemory();
      if(!latest.ok){state.memoryMessage='Device storage is unavailable. Your saved choices may still be on this device.';renderMemory();return;}
      if(!latest.value){
        state.saved=null;state.returnCheck=null;state.memoryMessage='Saved choices cleared in another tab.';
        state.changes=changing.step(changing.initial(),state.failed?null:changing.snapshot(state.data,Date.now(),core,nearMotion),state.failed,Date.now());
        update();
      }else state.saved=latest.value;
    });
    renderMemory();
  }
  function noteReturn(next) {
    if(!state.saved||!state.returnCheck||!next||next.checked<=state.returnCheck||state.changes.failed)return;
    var previous=state.returnCheck;
    state.returnCheck=null;
    state.memoryMessage=next.checked-previous>memory.GAP?
      'First fresh check since '+clockZone(previous)+dayWord(previous,next.checked)+'. Earlier vessel reports are too old to compare.':
      'Fresh check received. Saved visit choices are restored; see any supported changes above.';
    renderMemory();
  }
  function axisRange(p) {
    var start = p.now - 15 * MIN;
    var end = Math.max(p.now + 4 * HOUR, p.visit.end + 30 * MIN);
    p.ships.forEach(function (s) { if (!s.inLock) end = Math.max(end, s.end + 15 * MIN); });
    end = Math.min(end, p.now + 10 * HOUR);
    return { start: start, end: end };
  }
  function pct(ms, r) { return Math.max(0, Math.min(100, (ms - r.start) / (r.end - r.start) * 100)); }
  function band(cls, a, b, r, label) {
    if (b <= r.start || a >= r.end) return null;
    var d = el('span', 'lw-band ' + cls);
    d.style.left = pct(a, r) + '%';
    d.style.width = (pct(b, r) - pct(a, r)) + '%';
    if (label) d.title = label;
    return d;
  }
  function backdrop(r, p, track, seen) {
    // Darkness and closed-park spans for every local day the axis touches.
    seen = seen || {};
    for (var day = localMidnight(r.start) - 24 * HOUR; day < r.end; day += 24 * HOUR) {
      var sun = sunTimes(day + 12 * HOUR), hrs = parkHours(day + 12 * HOUR);
      var dayStart = localMidnight(day + 12 * HOUR), dayEnd = dayStart + 24 * HOUR;
      [band('lw-dark', dayStart, sun.sunrise || dayStart, r, 'Before sunrise'), band('lw-dark', sun.sunset || dayEnd, dayEnd, r, 'After sunset'),
        band('lw-closed', dayStart, hrs.open, r, 'Outside posted park hours'), band('lw-closed', hrs.close, dayEnd, r, 'Outside posted park hours')]
        .forEach(function (b) { if (b) { track.append(b); seen[b.classList.contains('lw-dark') ? 'dark' : 'closed'] = true; } });
    }
    var v = band('lw-visit', p.visit.start, p.visit.end, r, 'Your visit');
    if (v) track.append(v);
    var nowLine = el('span', 'lw-now');
    nowLine.style.left = pct(p.now, r) + '%';
    track.append(nowLine);
  }

  function renderAxis(r, p) {
    els.axis.replaceChildren();
    var track = el('div', 'lw-axis-track');
    var seen = { visit: true };
    backdrop(r, p, track, seen);
    p.ships.forEach(function (s) { if (!s.inLock && s.direction) seen[s.direction === 'upbound' ? 'up' : 'down'] = true; });
    Array.prototype.forEach.call(els.legend.querySelectorAll('[data-key]'), function (k) { k.hidden = !seen[k.dataset.key]; });
    var first = Math.ceil(r.start / HOUR) * HOUR;
    var span = (r.end - r.start) / HOUR;
    var step = span > 7 ? 2 : 1;
    for (var t = first; t <= r.end; t += HOUR) {
      if (zonedParts(t).h % step) continue;
      if (Math.abs(pct(t, r) - pct(p.now, r)) < 7) continue;
      var tick = el('span', 'lw-tick', hourLabel(t));
      tick.style.left = pct(t, r) + '%';
      track.append(tick);
    }
    var nowTag = el('span', 'lw-now-tag', 'Now');
    nowTag.style.left = pct(p.now, r) + '%';
    track.append(nowTag);
    els.axis.append(track);
  }

  function rowLabel(s) {
    var bits = [s.sizeLabel, s.lengthFeet ? s.lengthFeet.toLocaleString('en-US') + ' ft' : null].filter(Boolean).join(', ');
    return bits;
  }
  function fitText(s) {
    return s.fit === 'now' ? 'Reported in a chamber'
      : s.fit === 'gone' ? 'Reported in a chamber; may move before your visit'
      : s.fit === 'mostly' ? 'Mostly inside available platform time'
      : s.fit === 'partly' ? 'Partly inside available platform time'
      : 'Outside available platform time';
  }

  function renderRows(r, p) {
    els.rows.replaceChildren();
    p.ships.forEach(function (s) {
      var li = el('li', 'lw-row lw-' + (s.direction || 'unknown') + ' lw-fit-' + s.fit);
      var b = el('button', 'lw-row-btn');
      b.type = 'button';
      b.dataset.shipId = s.id;
      b.setAttribute('aria-pressed', String(s.id === state.selected));
      var head = el('span', 'lw-row-head');
      var arrow = el('span', 'lw-dir', s.direction === 'upbound' ? '▲' : s.direction === 'downbound' ? '▼' : '●');
      arrow.setAttribute('aria-hidden', 'true');
      head.append(arrow, el('strong', 'lw-name', s.name));
      var size = rowLabel(s);
      if (size) head.append(el('span', 'lw-size', size));
      var when = el('span', 'lw-when', s.inLock ? 'Last reported in the ' + (s.raw.chamberName || 'lock') : clock(s.start) + '–' + clock(s.end) + dayWord(s.start, p.now));
      var fit = el('span', 'lw-fit', directionShort(s.direction) + ' · ' + fitText(s) + (s.afterClose ? ' · outside park hours' : '') + (s.dark ? ' · after dark' : ''));
      var track = el('span', 'lw-track');
      track.setAttribute('aria-hidden', 'true');
      backdrop(r, p, track);
      if (s.inLock) {
        var dot = el('span', 'lw-inlock');
        dot.style.left = pct(p.now, r) + '%';
        track.append(dot);
      } else {
        var bar = el('span', 'lw-bar');
        bar.style.left = pct(s.start, r) + '%';
        bar.style.width = Math.max(1.5, pct(s.end, r) - pct(s.start, r)) + '%';
        var mid = el('span', 'lw-mid');
        mid.style.left = pct(s.mid, r) + '%';
        track.append(bar, mid);
      }
      b.append(head, when, fit, track);
      b.addEventListener('click', function () { select(s.id, true); });
      li.append(b);
      els.rows.append(li);
    });
  }

  function fact(dl, k, v) { if (!v) return; dl.append(el('dt', null, k), el('dd', null, v)); }

  function renderDossier(p) {
    els.dossier.replaceChildren();
    var s = p.ships.filter(function (x) { return x.id === state.selected; })[0];
    if (!s) { els.dossier.hidden = true; return; }
    els.dossier.hidden = false;
    els.dossier.append(el('p', 'lw-dossier-kicker', s.inLock ? 'Reported in a lock chamber' : 'Selected ship'));
    var h = el('h3', 'lw-dossier-name', s.name);
    h.id = 'lw-dossier-title';
    els.dossier.append(h);
    var dl = el('dl', 'lw-facts');
    fact(dl, 'Size', rowLabel(s) || 'Length not reported');
    fact(dl, 'Direction', directionLong(s.direction));
    fact(dl, 'Chamber', chamberText(s.raw));
    if (s.inLock) {
      fact(dl, 'Last report', s.ageMinutes + ' min ago, inside the chamber');
    } else {
      fact(dl, 'Planning window at the locks', clock(s.start) + '–' + clockZone(s.end) + dayWord(s.start, p.now));
      var raw = s.raw;
      if (Number.isFinite(raw.channelMilesToLocks) && Number.isFinite(raw.speedKnots)) {
        fact(dl, 'Where it is', raw.channelMilesToLocks + ' river miles out at ' + (raw.speedKnots * 1.15078).toFixed(1) + ' mph, reported ' + s.ageMinutes + ' min ago');
      }
      fact(dl, 'Your visit', fitText(s) + ' (' + clock(p.visit.start) + '–' + clock(p.visit.end) + '); ' + duration(s.accessibleMinutes) + ' of the modeled window during posted hours');
      var light = [];
      light.push(s.afterClose ? 'Outside posted park hours (' + s.parkLabel + ')' : s.runsPastClose ? 'Partly outside posted hours (' + s.parkLabel + ')' : 'Inside posted park hours (' + s.parkLabel + ')');
      light.push(s.dark ? 'after dark' : 'in daylight');
      fact(dl, 'Park and light', light.join(', '));
    }
    els.dossier.append(dl);
    var act = el('div', 'lw-actions');
    var show = el('button', 'lw-primary', 'Show it on the live map');
    show.type = 'button';
    show.addEventListener('click', function () {
      if (root.SooAis && typeof root.SooAis.focusShip === 'function') root.SooAis.focusShip(s.raw);
      else { var m = document.getElementById('live-vessel-activity'); if (m) m.scrollIntoView(); }
    });
    act.append(show);
    if (document.getElementById('soo-lock-sim')) {
      var lock = el('button', 'lw-secondary', 'Watch it lock through \u2193');
      lock.type = 'button';
      lock.addEventListener('click', function () { watchLock(s); });
      act.append(lock);
    }
    els.dossier.append(act);
    els.dossier.append(el('p', 'lw-note', 'This planning window uses reported position, speed and river distance, not a lock schedule. A ship may slow or stop; the actual arrival can be outside this window. Recheck movement before leaving. Not for navigation.'));
  }

  // Hand the selected ship to the page's lock simulator: direction, a same-size hull and a note.
  function watchLock(s) {
    var sim = document.getElementById('soo-lock-sim');
    if (!sim) return;
    function pickRadio(name, value) {
      var r = value && sim.querySelector('input[name="' + name + '"][value="' + value + '"]');
      if (!r) return null;
      r.checked = true;
      r.dispatchEvent(new Event('change', { bubbles: true }));
      return r;
    }
    var dir = s.direction === 'upbound' ? 'up' : s.direction === 'downbound' ? 'down' : null;
    pickRadio('lock-dir', dir);
    var hull = pickRadio('lock-ship', simShipFor(s));
    var standIn = hull && hull.parentNode.querySelector('b');
    var size = s.lengthFeet ? s.lengthFeet.toLocaleString('en-US') + ' ft ' : '';
    var note = sim.querySelector('[data-lock-live]');
    if (note) {
      var words = (dir ? (dir === 'up' ? 'Upbound, rising 21 ft to Lake Superior. ' : 'Downbound, dropping 21 ft toward Lake Huron. ') : '') +
        (standIn ? 'Shown with the ' + standIn.textContent + ' as a same-size stand-in for this ' + size + 'ship. ' : 'Its reported size does not match one of these hulls, so pick the closest. ') +
        (s.inLock || s.raw.lockCertain ? '' : 'In real life the lockmaster may assign either chamber. ');
      note.replaceChildren(el('strong', null, 'Set up for ' + s.name + '. '), document.createTextNode(words + 'Press \u201CLock her through\u201D.'));
      note.hidden = false;
    }
    var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
    sim.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var play = sim.querySelector('[data-lock-play]');
    if (play) play.focus({ preventScroll: true });
  }

  function renderVerdict(p) {
    els.verdict.replaceChildren();
    els.verdict.className = 'lw-verdict lw-status-' + p.status;
    els.verdict.append(el('p', 'lw-verdict-head', p.headline));
    p.detail.forEach(function (d) { els.verdict.append(el('p', 'lw-verdict-detail', d)); });
    if (p.suggestion) {
      var b = el('button', 'lw-adjust', 'Try ' + clock(p.suggestion.start) + '–' + clock(p.suggestion.end) + ' (' + duration(p.suggestion.stay) + ')');
      b.type = 'button';
      b.addEventListener('click', function () { adjustTo(p.suggestion); });
      els.verdict.append(b);
    }
    if (p.link) {
      var a = el('a', 'lw-link', p.link.label);
      a.href = p.link.href;
      if (/^https?:/.test(p.link.href)) { a.target = '_blank'; a.rel = 'noopener'; }
      els.verdict.append(a);
    }
    if (p.notes.length) {
      var ul = el('ul', 'lw-notes');
      p.notes.forEach(function (n) { ul.append(el('li', null, n)); });
      els.verdict.append(ul);
    }
  }

  // Revalidate the displayed alternative before applying it; no silent duration change.
  function adjustTo(sugg) {
    var latest=plan({data:state.data,failed:state.failed,now:Date.now(),startOffset:choice('lw-start')||0,stay:choice('lw-stay')||90});
    var fresh=latest.suggestion;
    if (!fresh || fresh.id!==sugg.id || fresh.startOffset!==sugg.startOffset || fresh.stay!==sugg.stay) { update(); return; }
    var radio=section.querySelector('input[name="lw-start"][value="'+fresh.startOffset+'"]');
    if (!radio || choice('lw-stay')!==fresh.stay) { update(); return; }
    radio.checked=true;
    state.selected=fresh.id; state.userSelected=true;
    update(); persistMemory(true); els.verdict.focus({preventScroll:true});
  }

  function select(id, user) {
    state.selected = id;
    if (user) state.userSelected = true;
    Array.prototype.forEach.call(els.rows.querySelectorAll('.lw-row-btn'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.shipId === id));
    });
    renderDossier(state.plan);
  }

  function renderChanges(p) {
    if (!els.changes || !changing) return;
    var item = p.status === 'season-closed' || p.status === 'loading' || p.status === 'unavailable' ? null : changing.summary(state.changes,p.now,[p.best && p.best.id,state.previousBest].filter(Boolean));
    var message=item ? (item.kind==='recovered' ? clock(item.to)+' check: ' : 'Since the '+clock(item.from)+' check: ')+item.text : '';
    if (els.changes.textContent!==message) els.changes.textContent=message;
    els.changes.hidden=!item;
  }
  function update() {
    var p = plan({ data: state.data, failed: state.failed, loading: !state.data && !state.failed, now: Date.now(), startOffset: choice('lw-start') || 0, stay: choice('lw-stay') || 90 });
    state.plan = p;
    var ids = p.ships.map(function (s) { return s.id; });
    if (!state.selected || ids.indexOf(state.selected) < 0) {
      state.userSelected = false;
      state.selected = p.best ? p.best.id : (ids[0] || null);
    } else if (!state.userSelected && p.best) {
      state.selected = p.best.id;
    }
    renderVerdict(p);
    renderChanges(p);
    renderMemory();
    var showBoard = p.ships.length > 0;
    els.board.hidden = !showBoard;
    els.legend.hidden = !showBoard;
    if (showBoard) {
      var r = axisRange(p);
      renderAxis(r, p);
      renderRows(r, p);
    }
    renderDossier(p);
    renderWeather(p);
    scheduleDecisionAge();
    if (els.status) {
      els.status.textContent = state.data && state.data.checkedAt
        ? (state.failed ? 'Last successful AIS check: ' : 'Lined up from AIS reports checked ') + clockZone(Date.parse(state.data.checkedAt)) + (state.failed ? ' (latest refresh failed)' : '') + '.'
        : '';
    }
  }

  function renderWeather(p) {
    if (!els.weather) return;
    els.weather.replaceChildren();
    if (p.status === 'season-closed' || p.status === 'loading') { els.weather.hidden = true; return; }
    els.weather.hidden = false;
    var head = el('strong', null, 'Platform weather, ' + clock(p.visit.start) + '\u2013' + clock(p.visit.end) + ': ');
    if (!state.wx) {
      els.weather.append(head, document.createTextNode(state.wxFailed ? 'the NWS forecast is unavailable right now.' : 'checking the NWS forecast\u2026'));
      return;
    }
    var w = visitWeather(state.wx, p.visit, p.now);
    if (!w) { els.weather.append(head, document.createTextNode('outside the NWS hourly forecast range.')); return; }
    els.weather.append(head, document.createTextNode(weatherLine(w) + '. '));
    var src = el('a', null, 'NWS hourly forecast');
    src.href = 'https://forecast.weather.gov/MapClick.php?lat=46.4953&lon=-84.3453&FcstType=graphical';
    src.target = '_blank'; src.rel = 'noopener';
    els.weather.append(src, document.createTextNode(w.issued ? (w.stale ? ', last updated ' : ', updated ') + clockZone(w.issued) + dayWord(w.issued, p.now) + (w.stale ? ' (older than 12 hours)' : '') + '.' : '.'));
  }
  function getJson(url) {
    var opts = { headers: { Accept: 'application/geo+json' } };
    if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) opts.signal = AbortSignal.timeout(12000);
    return fetch(url, opts).then(function (r) { if (!r.ok) throw Error('HTTP ' + r.status); return r.json(); });
  }
  function loadWeather() {
    state.wxAt = Date.now();
    getJson(NWS_HOURLY)
      .catch(function () {
        // The grid cell can move when NWS re-grids; look it up again before giving up.
        return getJson(NWS_POINT).then(function (pt) { return getJson(pt.properties.forecastHourly); });
      })
      .then(function (j) { state.wx = j && j.properties; state.wxFailed = !state.wx; })
      .catch(function () { state.wxFailed = true; })
      .then(function () { if (state.plan) renderWeather(state.plan); });
  }

  function receive(detail) {
    if (!detail) return;
    if (detail.data) state.data = detail.data;
    state.failed = !!detail.failed;
    if (changing) {
      var now=Date.now(), next=state.failed?null:changing.snapshot(state.data,now,core,nearMotion);
      var prior=state.changes;
      state.changes=changing.step(prior,next,state.failed,now);
      if (state.changes!==prior) state.previousBest=state.plan && state.plan.best ? state.plan.best.id : null;
      noteReturn(next);
      if(state.saved&&state.failed)state.memoryMessage='Saved visit choices are available, but live reports are unavailable. Remembered reports are not used as current conditions.';
      if(state.saved&&state.changes!==prior)persistMemory(false);
    }
    update();
  }

  // Re-evaluate source age and elapsed windows even if a refresh stalls.
  var ageTimer;
  function scheduleDecisionAge() {
    clearTimeout(ageTimer);
    if (state.failed || !state.data || !state.data.nextShip) return;
    var now=Date.now(), n=state.data.nextShip, deadlines=[];
    (n.inLock||[]).concat(n.candidates||[]).forEach(function(s){
      if(!freshReport(s,now))return;
      deadlines.push(Date.parse(s.seen)+REPORT_AGE_MS+1);
      var end=Date.parse(s.window?.end);if(end>now)deadlines.push(end);
    });
    if (state.changes && state.changes.last) {
      var expiry=state.changes.last.checked+changing.MAX_GAP+1;
      if (expiry>now)deadlines.push(expiry);
      state.changes.events.forEach(function(e){var t=e.to+changing.MAX_GAP+1;if(t>now)deadlines.push(t);});
    }
    var h=parkHours(now);
    [h.open,h.close].forEach(function(t){if(t>now)deadlines.push(t);});
    if(deadlines.length) ageTimer=setTimeout(function(){update();},Math.max(1,Math.min.apply(null,deadlines)-now));
  }
  document.addEventListener('visibilitychange',function(){if(!document.hidden)update();});
  section.classList.add('lw-ready');
  loadWeather();
  setInterval(function () { if (!document.hidden && Date.now() - state.wxAt > 30 * MIN) loadWeather(); }, 5 * MIN);
  setupMemory();
  els.controls.hidden = false;
  section.addEventListener('change', function (e) {
    if (e.target && (e.target.name === 'lw-start' || e.target.name === 'lw-stay')) { update(); persistMemory(true); }
  });
  document.addEventListener('soo-ais:data', function (e) { receive(e.detail); });
  if (root.SooAis && root.SooAis.last) receive(root.SooAis.last);
  else update();
})(typeof window !== 'undefined' ? window : globalThis);
