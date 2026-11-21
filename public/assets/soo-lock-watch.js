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

  var TZ = 'America/Detroit';
  var SAULT = { lat: 46.4953, lon: -84.3453 };
  var MIN = 60000;
  var HOUR = 60 * MIN;
  var BOATNERD = 'https://ais.boatnerd.com/passage/port/soo-locks';
  var USACE = 'https://www.lrd.usace.army.mil/Submit-ArticleCS/Recreation/Article/3833525/soo-locks-visitor-center/';

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
    if (s.state === 'in-lock') return (s.chamberName || 'A lock chamber') + ', now';
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

  function shipEntry(s, now, visit) {
    if (s.state === 'in-lock') {
      var seen = Date.parse(s.seen);
      return {
        id: String(s.id || s.mmsi), name: title(s), raw: s, inLock: true, direction: s.direction || null,
        sizeLabel: s.sizeLabel || null, lengthFeet: s.lengthFeet || null, ageMinutes: s.ageMinutes,
        start: Number.isFinite(seen) ? seen : now, end: now, mid: now,
        fit: visit.start - now <= 15 * MIN ? 'now' : 'gone',
        afterClose: false, dark: isDark(now)
      };
    }
    var w = s.window || {};
    var start = Date.parse(w.start), end = Date.parse(w.end), mid = Date.parse(w.midpoint);
    if (![start, end, mid].every(Number.isFinite)) return null;
    var hours = parkHours(mid);
    var e = {
      id: String(s.id || s.mmsi), name: title(s), raw: s, inLock: false, direction: s.direction || null,
      sizeLabel: s.sizeLabel || null, lengthFeet: s.lengthFeet || null, ageMinutes: s.ageMinutes,
      start: start, end: end, mid: mid, fit: fitFor({ start: start, end: end, mid: mid }, visit),
      afterClose: start >= hours.close || end <= hours.open,
      runsPastClose: start < hours.close && end > hours.close,
      dark: isDark(start) && isDark(end) && isDark(mid),
      parkLabel: hours.label
    };
    return e;
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

    var outsideBefore = overlapMinutes(visit.start, visit.end, visit.start - 24 * HOUR, hours.open);
    var outsideAfter = overlapMinutes(visit.start, visit.end, hours.close, visit.end + 24 * HOUR);
    if (outsideBefore > 0 || outsideAfter > 0) {
      out.notes.push('Soo Locks Park posted hours today are ' + hours.label + ' (' + hours.months + '), so ' +
        duration(outsideBefore + outsideAfter) + ' of this visit falls outside them. Confirm with USACE before planning around it.');
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
    if (!opts.data || (opts.failed && !n) || !n || !n.ok) {
      out.status = 'unavailable';
      out.headline = 'Live ship reports are unavailable, so no visit can be lined up';
      out.detail.push('This is not a report of an empty river. Check the BoatNerd Soo passage list' + (vc ? ' or call the boat hotline at 906-202-1333.' : '.'));
      out.link = { href: BOATNERD, label: 'Open the BoatNerd Soo passage list \u2197' };
      return out;
    }
    var entries = [];
    (n.inLock || []).forEach(function (s) { var e = shipEntry(Object.assign({ state: 'in-lock' }, s), now, visit); if (e) entries.push(e); });
    (n.candidates || []).forEach(function (s) { var e = shipEntry(s, now, visit); if (e) entries.push(e); });
    // One row per ship even if a report somehow lands in both lists.
    var seenIds = {};
    entries = entries.filter(function (e) { if (seenIds[e.id]) return false; seenIds[e.id] = true; return true; });
    entries.sort(function (a, b) { return a.start - b.start; });
    out.ships = entries;
    if (opts.failed) out.notes.unshift('The latest refresh failed; these are the windows from the earlier check.');

    var pickId = n.pick ? String(n.pick.id || n.pick.mmsi) : null;
    var ranked = entries.filter(function (e) { return e.fit === 'now' || e.fit === 'mostly' || e.fit === 'partly'; })
      .sort(function (a, b) {
        var r = FIT_RANK[a.fit] - FIT_RANK[b.fit];
        if (r) return r;
        if (a.afterClose !== b.afterClose) return a.afterClose ? 1 : -1;
        if (a.id === pickId) return -1;
        if (b.id === pickId) return 1;
        return a.start - b.start;
      });
    var best = ranked[0] || null;
    out.best = best;
    var future = entries.filter(function (e) { return !e.inLock && e.start >= visit.end; });
    var lookahead = 'Ships still out on open Lake Superior or Lake Huron are beyond this view, so a later visit can gain ships that are not listed yet.';

    if (!entries.length) {
      out.status = 'no-ships';
      out.headline = 'No ship is clearly heading for the locks in the latest reports';
      out.detail.push('Nothing in AIS reports under 30 minutes old shows a freighter moving toward the locks. That is not proof of an empty river: ships wait at docks and anchorages, and coverage has gaps.');
      out.detail.push(lookahead);
      out.link = { href: BOATNERD, label: 'Open the BoatNerd Soo passage list \u2197' };
      return out;
    }
    if (!best) {
      out.status = 'none';
      out.headline = 'No reported ship is due during that visit';
      var nextOne = future[0];
      if (nextOne) {
        out.detail.push('The next estimated window is ' + title(nextOne) + ', ' + clock(nextOne.start) + '–' + clockZone(nextOne.end) + dayWord(nextOne.start, now) + '.');
        out.suggestion = { start: nextOne.start, end: nextOne.end, id: nextOne.id };
      }
      out.detail.push(lookahead);
      return out;
    }
    if (best.fit === 'now') {
      out.status = 'in-lock-now';
      out.headline = title(best) + ' is in the ' + (best.raw.chamberName || 'lock') + ' right now';
      out.detail.push('Seen in the chamber ' + best.ageMinutes + ' min ago. A ship in a chamber is on its way out, so go straight to the platform if you are close.');
      var after = ranked.filter(function (e) { return e !== best && e.fit !== 'gone'; })[0];
      if (after) out.detail.push('Also inside your visit: ' + title(after) + ', estimated ' + clock(after.start) + '–' + clockZone(after.end) + '.');
      else if (future[0]) {
        out.detail.push('After it, the next estimated window is ' + title(future[0]) + ', ' + clock(future[0].start) + '–' + clockZone(future[0].end) + dayWord(future[0].start, now) + '.');
        out.suggestion = { start: future[0].start, end: future[0].end, id: future[0].id };
      }
      return out;
    }
    out.status = best.fit === 'mostly' ? 'match' : 'partial';
    out.headline = (best.fit === 'mostly' ? 'Best bet: ' : 'Possible: ') + title(best) + ', about ' + clock(best.start) + '–' + clockZone(best.end);
    out.detail.push(best.fit === 'mostly'
      ? 'Its estimated window falls mostly inside your visit (' + clock(visit.start) + '–' + clock(visit.end) + ').'
      : 'Its estimated window only partly overlaps your visit (' + clock(visit.start) + '–' + clock(visit.end) + '). Being on the platform ' + clock(best.start) + '–' + clock(best.end) + ' covers all of it.');
    if (best.afterClose) out.detail.push('That window is outside the park’s posted hours (' + best.parkLabel + ').');
    else if (best.runsPastClose) out.detail.push('That window runs past the park’s posted closing time (' + best.parkLabel + ').');
    if (best.dark) out.detail.push('It falls after dark.');
    var others = ranked.filter(function (e) { return e !== best && e.fit !== 'gone'; }).length;
    if (others) out.detail.push(others + ' more ' + (others === 1 ? 'ship overlaps' : 'ships overlap') + ' this visit in the lineup below.');
    if (best.fit === 'partly') out.suggestion = { start: best.start, end: best.end, id: best.id };
    return out;
  }

  var core = {
    TZ: TZ, SAULT: SAULT, BOATNERD: BOATNERD, USACE: USACE,
    zonedParts: zonedParts, zonedInstant: zonedInstant, parkHours: parkHours, visitorCenterOpen: visitorCenterOpen,
    navigationSeason: navigationSeason, sunTimes: sunTimes, isDark: isDark, fitFor: fitFor, plan: plan,
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
    status: section.querySelector('[data-lw-status]')
  };
  var state = { data: null, failed: false, selected: null, userSelected: false, plan: null };

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
    return s.fit === 'now' ? 'In a chamber now'
      : s.fit === 'gone' ? 'In a chamber now; likely gone before you arrive'
      : s.fit === 'mostly' ? 'Mostly inside your visit'
      : s.fit === 'partly' ? 'Partly inside your visit'
      : 'Outside your visit';
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
      var when = el('span', 'lw-when', s.inLock ? 'In the ' + (s.raw.chamberName || 'lock') + ' now' : clock(s.start) + '–' + clock(s.end) + dayWord(s.start, p.now));
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
    els.dossier.append(el('p', 'lw-dossier-kicker', s.inLock ? 'In a lock chamber now' : 'Selected ship'));
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
      fact(dl, 'Estimated at the locks', clock(s.start) + '–' + clockZone(s.end) + dayWord(s.start, p.now));
      var raw = s.raw;
      if (Number.isFinite(raw.channelMilesToLocks) && Number.isFinite(raw.speedKnots)) {
        fact(dl, 'Where it is', raw.channelMilesToLocks + ' river miles out at ' + (raw.speedKnots * 1.15078).toFixed(1) + ' mph, reported ' + raw.ageMinutes + ' min ago');
      }
      fact(dl, 'Your visit', fitText(s) + ' (' + clock(p.visit.start) + '–' + clock(p.visit.end) + ')');
      var light = [];
      light.push(s.afterClose ? 'Outside posted park hours (' + s.parkLabel + ')' : s.runsPastClose ? 'Runs past posted closing (' + s.parkLabel + ')' : 'Inside posted park hours (' + s.parkLabel + ')');
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
    var bn = el('a', 'lw-secondary', 'BoatNerd Soo passage list ↗');
    bn.href = BOATNERD; bn.target = '_blank'; bn.rel = 'noopener';
    act.append(show, bn);
    els.dossier.append(act);
    els.dossier.append(el('p', 'lw-note', 'An estimate from the ship’s latest AIS position, speed and river distance, not a lock schedule. Ships can wait for a chamber or stop at a dock. Not for navigation.'));
  }

  function renderVerdict(p) {
    els.verdict.replaceChildren();
    els.verdict.className = 'lw-verdict lw-status-' + p.status;
    els.verdict.append(el('p', 'lw-verdict-head', p.headline));
    p.detail.forEach(function (d) { els.verdict.append(el('p', 'lw-verdict-detail', d)); });
    if (p.suggestion) {
      var b = el('button', 'lw-adjust', 'Plan around ' + clock(p.suggestion.start) + '–' + clock(p.suggestion.end));
      b.type = 'button';
      b.addEventListener('click', function () { adjustTo(p.suggestion); });
      els.verdict.append(b);
    }
    if (p.link) {
      var a = el('a', 'lw-link', p.link.label);
      a.href = p.link.href; a.target = '_blank'; a.rel = 'noopener';
      els.verdict.append(a);
    }
    if (p.notes.length) {
      var ul = el('ul', 'lw-notes');
      p.notes.forEach(function (n) { ul.append(el('li', null, n)); });
      els.verdict.append(ul);
    }
  }

  // Snap the two choices to the smallest visit that covers a window.
  function adjustTo(sugg) {
    var now = Date.now();
    var offsets = Array.prototype.map.call(section.querySelectorAll('input[name="lw-start"]'), function (i) { return Number(i.value); });
    var stays = Array.prototype.map.call(section.querySelectorAll('input[name="lw-stay"]'), function (i) { return Number(i.value); });
    var want = (sugg.start - now) / MIN;
    var start = offsets.filter(function (o) { return o <= Math.max(0, want); }).pop();
    if (start === undefined) start = offsets[0];
    var needed = (sugg.end - (now + start * MIN)) / MIN;
    var stay = stays.filter(function (st) { return st >= needed; })[0];
    if (stay === undefined) stay = stays[stays.length - 1];
    section.querySelector('input[name="lw-start"][value="' + start + '"]').checked = true;
    section.querySelector('input[name="lw-stay"][value="' + stay + '"]').checked = true;
    state.selected = sugg.id; state.userSelected = true;
    update();
    els.verdict.focus({ preventScroll: true });
  }

  function select(id, user) {
    state.selected = id;
    if (user) state.userSelected = true;
    Array.prototype.forEach.call(els.rows.querySelectorAll('.lw-row-btn'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.shipId === id));
    });
    renderDossier(state.plan);
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
    var showBoard = p.ships.length > 0;
    els.board.hidden = !showBoard;
    els.legend.hidden = !showBoard;
    if (showBoard) {
      var r = axisRange(p);
      renderAxis(r, p);
      renderRows(r, p);
    }
    renderDossier(p);
    if (els.status) {
      els.status.textContent = state.data && state.data.checkedAt
        ? 'Lined up from AIS reports checked ' + clockZone(Date.parse(state.data.checkedAt)) + (state.failed ? ' (latest refresh failed)' : '') + '.'
        : '';
    }
  }

  function receive(detail) {
    if (!detail) return;
    if (detail.data) state.data = detail.data;
    state.failed = !!detail.failed;
    update();
  }

  section.classList.add('lw-ready');
  els.controls.hidden = false;
  section.addEventListener('change', function (e) {
    if (e.target && (e.target.name === 'lw-start' || e.target.name === 'lw-stay')) update();
  });
  document.addEventListener('soo-ais:data', function (e) { receive(e.detail); });
  if (root.SooAis && root.SooAis.last) receive(root.SooAis.last);
  else update();
})(typeof window !== 'undefined' ? window : globalThis);
