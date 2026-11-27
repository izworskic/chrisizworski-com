/* Detroit River freighters page helpers. Page-local, no network.
 * 1. Season band: whether upper-lakes freighters are running through the Soo Locks
 *    (closed Jan 15 to Mar 25), so a quiet river in February reads as normal, not broken.
 * 2. Shows the engine's raw ISO report times (e.g. 2026-11-27T19:14:57.000Z) as Detroit clock
 *    times. The shared Detroit Outdoors client is left untouched. */
(function () {
  'use strict';
  var ZONE = 'America/Detroit';

  function partsNow(now) {
    var f = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, year: 'numeric', month: 'numeric', day: 'numeric' });
    var p = {}; f.formatToParts(now).forEach(function (x) { p[x.type] = +x.value || p[x.type]; });
    return { y: p.year, m: p.month, d: p.day };
  }
  function dayIndex(y, m, d) { return Math.round(Date.UTC(y, m - 1, d) / 86400000); }

  // Soo Locks: open Mar 25, close Jan 15 (the federal season). Returns a plain description.
  function season(now) {
    var t = partsNow(now), today = dayIndex(t.y, t.m, t.d);
    var openThis = dayIndex(t.y, 3, 25), closeThis = dayIndex(t.y, 1, 15);
    if (today >= closeThis && today < openThis) {
      var days = openThis - today;
      return { state: 'winter', kicker: 'Winter on the river',
        text: 'The Soo Locks are closed until March 25 (' + days + (days === 1 ? ' day' : ' days') + '), so fewer freighters pass Detroit. Winter tug-barges and salt and coal runs keep moving, so a quiet board is normal.' };
    }
    var close = today < closeThis ? closeThis : dayIndex(t.y + 1, 1, 15);
    var left = close - today;
    if (left <= 21) {
      return { state: 'final-weeks', kicker: 'Last weeks of the season',
        text: 'The Soo Locks close January 15 (' + left + (left === 1 ? ' day' : ' days') + '). Upper-lakes freighters are making their last runs past Detroit.' };
    }
    return { state: 'open', kicker: 'Shipping season is open',
      text: 'The Soo Locks are open until January 15, so lakers from Lake Superior and ocean-going salties pass Detroit.' };
  }

  if (typeof module === 'object' && module.exports) { module.exports = { season: season }; return; }
  var band = document.querySelector('[data-detroit-season]');
  if (band) {
    var s = season(new Date());
    band.setAttribute('data-state', s.state);
    var k = band.querySelector('[data-season-kicker]'), x = band.querySelector('[data-season-text]');
    if (k) k.textContent = s.kicker;
    if (x) x.textContent = s.text;
  }

  var ISO = /\b(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)Z\b/g;
  var clock = new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' });
  function tidy(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    var n;
    while ((n = walker.nextNode())) {
      if (!ISO.test(n.nodeValue)) continue;
      ISO.lastIndex = 0;
      n.nodeValue = n.nodeValue.replace(ISO, function (m) {
        var t = Date.parse(m);
        return Number.isFinite(t) ? clock.format(new Date(t)) : m;
      });
    }
    ISO.lastIndex = 0;
  }
  ['intent-reasons', 'intent-evidence', 'intent-watch', 'intent-editorial-copy'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    tidy(el);
    if ('MutationObserver' in window) new MutationObserver(function () { tidy(el); }).observe(el, { childList: true, subtree: true, characterData: true });
  });

})();
