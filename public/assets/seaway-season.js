/* Seaway navigation-season state, evergreen. Reads reviewed values that
 * scripts/generate-seaway.mjs inlines as #seawaySeasonData. Official per-season dates
 * win; a season without them falls back to the recent typical schedule and says so.
 * No fetch, no storage. Pure state function exported for Node tests. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SeawaySeason = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ZONE = 'America/Toronto';
  var DAY = 86400000;

  function parts(instant) {
    var out = {};
    new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(instant).forEach(function (p) { out[p.type] = p.value; });
    return out;
  }
  function easternDate(instant) {
    var p = parts(instant);
    return p.year + '-' + p.month + '-' + p.day;
  }
  // Wall-clock Eastern time -> instant (handles EST/EDT).
  function easternInstant(y, m, d, h, min) {
    var want = Date.UTC(y, m - 1, d, h, min), guess = want;
    for (var i = 0; i < 2; i++) {
      var p = parts(new Date(guess));
      guess += want - Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute);
    }
    return guess;
  }
  function calendarDays(fromYmd, toYmd) {
    return Math.round((Date.parse(toYmd + 'T00:00:00Z') - Date.parse(fromYmd + 'T00:00:00Z')) / DAY);
  }
  function longDate(ms, withYear) {
    var opts = { timeZone: ZONE, month: 'long', day: 'numeric' };
    if (withYear) opts.year = 'numeric';
    return new Intl.DateTimeFormat('en-US', opts).format(new Date(ms));
  }
  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }
  function md(s) { var a = String(s).split('-'); return [+a[0], +a[1]]; }

  // Dates for the season that opens in `year`. Each date is official or typical.
  function seasonDates(data, year) {
    var official = (data.seasons && data.seasons[year]) || {};
    var t = data.typical, o = md(t.openingMonthDay), c = md(t.regularEntryEndsMonthDay), k = md(t.allClearMonthDay);
    function pick(key, fallback) {
      return official[key] ? { ms: Date.parse(official[key]), official: true } : { ms: fallback, official: false };
    }
    return {
      year: year,
      opening: pick('opening', easternInstant(year, o[0], o[1], 8, 0)),
      cutoff: pick('regularEntryEnds', easternInstant(year, c[0], c[1], 23, 59)),
      clear: pick('allClearBy', easternInstant(year + 1, k[0], k[1], 12, 0)),
      source: official.source || null
    };
  }

  function seasonState(data, now) {
    if (!data || !data.typical || !data.section) throw new Error('Seaway season data incomplete');
    var t = (now instanceof Date ? now : new Date(now)).getTime();
    var today = easternDate(new Date(t));
    var year = +today.slice(0, 4);
    var prev = seasonDates(data, year - 1), cur = seasonDates(data, year), next = seasonDates(data, year + 1);
    var notices = { title: 'Seaway notices', url: data.noticesIndex };
    var section = data.section;

    // The live season, if any; otherwise the opening we are waiting for.
    var s = t < prev.clear.ms ? prev : (t >= cur.opening.ms && t < cur.clear.ms ? cur : null);
    if (!s) {
      var waitFor = t < cur.opening.ms ? cur : next;
      var wait = Math.max(1, calendarDays(today, easternDate(new Date(waitFor.opening.ms))));
      return {
        state: 'closed', season: waitFor.year, daysUntilOpening: wait, official: waitFor.opening.official,
        kicker: 'Winter closure · ' + section,
        headline: 'The Seaway locks are closed for winter.',
        detail: (waitFor.opening.official
          ? 'Target reopening: ' + longDate(waitFor.opening.ms, true) + ' (' + plural(wait, 'day') + ' away). Ice can delay the first ships.'
          : 'Seaway seasons usually open around ' + longDate(waitFor.opening.ms, false) + ' (about ' + plural(wait, 'day') + ' away). The official ' + waitFor.year + ' date usually comes out in February.') +
          ' Some ports east of St. Lambert Lock stay open in winter, so a ship on the map near Montreal may be in harbour rather than in the Seaway.',
        source: waitFor.opening.official && waitFor.source ? waitFor.source : notices
      };
    }

    var cutoffDay = longDate(s.cutoff.ms, false), clearDay = longDate(s.clear.ms, true);
    var datesOfficial = s.cutoff.official && s.clear.official;
    // Official: exact clock times. Typical: approximate wording only.
    var endAt = datesOfficial ? 'at 11:59 p.m. on ' + cutoffDay : 'around ' + cutoffDay;
    var endOn = datesOfficial ? cutoffDay : 'around ' + cutoffDay;
    var clearBy = datesOfficial ? 'by noon on ' + clearDay : 'by early January';
    var src = datesOfficial && s.source ? s.source : notices;
    var kicker = s.year + ' shipping season · ' + section;
    var typicalNote = datesOfficial ? '' : ' These are typical dates from recent seasons; the official ' + s.year + ' closing dates are in the Seaway notices, usually from October.';

    if (t <= s.cutoff.ms) {
      var sinceOpen = calendarDays(easternDate(new Date(s.opening.ms)), today);
      if (sinceOpen >= 0 && sinceOpen < data.openingWeekDays) return {
        state: 'opening-week', season: s.year, official: s.opening.official, kicker: kicker,
        headline: 'The ' + s.year + ' season ' + (s.opening.official ? 'was scheduled to open' : 'usually opens around') + ' ' + longDate(s.opening.ms, false) + '.',
        detail: 'Early ships can still be held by ice, so check the order of turn before you drive. Regular transits then run until ' + endOn + '.' + typicalNote,
        source: s.opening.official && s.source ? s.source : src
      };
      var left = calendarDays(today, easternDate(new Date(s.cutoff.ms))) + 1;
      if (left <= 1) return {
        state: 'last-day', season: s.year, daysLeft: 1, official: datesOfficial, kicker: kicker,
        headline: datesOfficial ? 'Today is the last day of regular Seaway entries.' : 'Today is about the last day of regular Seaway entries.',
        detail: (datesOfficial ? 'Ships can enter (' + data.entryPoints + ') until 11:59 p.m. tonight. ' : 'Regular entries usually end tonight. ') + 'After that, a transit needs prior written agreement, and every ship must be clear ' + clearBy + '.' + typicalNote,
        source: src
      };
      if (left <= data.finalWeeksDays) return {
        state: 'final-weeks', season: s.year, daysLeft: left, official: datesOfficial, kicker: kicker,
        headline: (datesOfficial ? '' : 'About ') + plural(left, 'day') + ' left of regular Seaway transits this season.',
        detail: 'Regular entries end ' + endAt + '. After that, a ship needs prior written agreement, and all must be clear ' + clearBy + '. For the best chance of seeing a ship in a lock this year, go before ' + cutoffDay + '.' + typicalNote,
        source: src
      };
      return {
        state: 'open', season: s.year, daysLeft: left, official: datesOfficial, kicker: kicker,
        headline: 'The ' + s.year + ' season is open. Regular transits run until ' + endOn + '.',
        detail: 'After that, a ship needs prior written agreement, and all must be clear ' + clearBy + '.' + typicalNote,
        source: src
      };
    }
    return {
      state: 'clearing', season: s.year, daysLeft: 0, official: datesOfficial, kicker: kicker,
      headline: 'Final ships are clearing the Seaway.',
      detail: 'Regular entries ended ' + (datesOfficial ? 'on ' : '') + endOn + '. Any remaining transit needs prior written agreement, and all ships must be clear ' + clearBy + '. Check the order of turn before you drive.' + typicalNote,
      source: src
    };
  }

  function mount(doc, now) {
    var holder = doc.getElementById('seawaySeasonData');
    if (!holder) return null;
    var data;
    try { data = JSON.parse(holder.textContent); } catch (_) { return null; }
    var r = seasonState(data, now || new Date());
    var nodes = doc.querySelectorAll('[data-seaway-season]');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      el.setAttribute('data-season-state', r.state);
      var set = function (sel, text) { var n = el.querySelector(sel); if (n) n.textContent = text; };
      set('[data-season-kicker]', r.kicker);
      set('[data-season-headline]', r.headline);
      set('[data-season-detail]', r.detail);
      var a = el.querySelector('[data-season-source]');
      if (a && r.source) {
        a.href = r.source.url;
        set('[data-season-source-label]', r.source.url === data.noticesIndex ? 'Seaway notices' : 'Official Seaway notice');
      }
    }
    return r;
  }

  if (typeof document !== 'undefined') {
    var run = function () { try { mount(document); } catch (_) { /* static fallback text stays */ } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run);
    else run();
  }
  return { seasonState: seasonState, seasonDates: seasonDates, mount: mount, easternDate: easternDate, easternInstant: easternInstant };
});
