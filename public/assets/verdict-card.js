/*
 * Reusable visitor verdict component. No domain thresholds or network calls live here.
 *
 * window.VerdictCard.render(element, {
 *   verdict: 'GO' | 'WORTH A LOOK' | 'NO-GO' | 'UNCERTAIN',
 *   bestWindow: string,       // readable LOCAL time including timezone; no fabricated hours
 *   drivers: [{label:string, text:string}],  // sourced explanatory copy, not raw numbers
 *   locationNote: string,     // where the guidance applies
 *   asOf: string,             // ISO 8601 time of the last computed assessment
 *   reason?: string,          // required when verdict === 'UNCERTAIN'
 *   availability?: 'fresh' | 'stale' | 'missing'
 * }, {now?: number, maxAgeMs?: number})
 *
 * Missing, invalid, stale, future-dated, or incomplete inputs resolve to the
 * fifth visible state, 'Forecast currently unavailable', NEVER a retained verdict.
 * The caller owns feed freshness/rules; this renderer also guards the as-of age.
 * Use the same interface for ice caves, birding, or ski verdicts, supplying
 * their own sourced drivers and rules rather than copying aurora thresholds.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.VerdictCard = api;
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';
  const LABELS = Object.freeze({
    'GO': 'GO',
    'WORTH A LOOK': 'WORTH A LOOK',
    'NO-GO': 'NO-GO',
    'UNCERTAIN': 'UNCERTAIN',
    'UNAVAILABLE': 'Forecast currently unavailable'
  });
  const DEFAULT_MAX_AGE_MS = 20 * 60 * 1000;

  function resolve(input, options) {
    const value = input || {};
    const opts = options || {};
    const now = Number.isFinite(opts.now) ? opts.now : Date.now();
    const maxAgeMs = Number.isFinite(opts.maxAgeMs) && opts.maxAgeMs > 0 ? opts.maxAgeMs : DEFAULT_MAX_AGE_MS;
    const asOf = typeof value.asOf === 'string' ? value.asOf : null;
    const stamp = asOf ? Date.parse(asOf) : NaN;
    const stale = Number.isFinite(stamp) && (now - stamp > maxAgeMs || stamp > now + 60000);
    const valid = Object.prototype.hasOwnProperty.call(LABELS, value.verdict) && value.verdict !== 'UNAVAILABLE';
    const drivers = Array.isArray(value.drivers) ? value.drivers.filter(function (item) {
      return item && typeof item.label === 'string' && item.label.trim() &&
        typeof item.text === 'string' && item.text.trim();
    }) : [];
    const missing = !valid || !Number.isFinite(stamp) || !value.bestWindow ||
      !value.locationNote || drivers.length === 0 || (value.verdict === 'UNCERTAIN' && !value.reason);
    const unavailable = value.availability === 'missing' || value.availability === 'stale' || stale || missing;

    return {
      verdict: unavailable ? 'UNAVAILABLE' : value.verdict,
      label: unavailable ? LABELS.UNAVAILABLE : LABELS[value.verdict],
      bestWindow: unavailable ? 'No reliable window available' : String(value.bestWindow),
      locationNote: unavailable ? 'Michigan: check the official forecast before making a trip' : String(value.locationNote),
      drivers: unavailable ? [] : drivers,
      asOf: Number.isFinite(stamp) ? new Date(stamp).toISOString() : null,
      reason: unavailable ? (value.reason || (stale || value.availability === 'stale'
        ? 'The last assessment has expired. A current forecast is required.'
        : 'One or more required forecast inputs are missing.')) : (value.reason || ''),
    };
  }

  function formatAsOf(stamp) {
    if (!stamp) return 'As of: no current assessment';
    return 'As of: ' + new Date(stamp).toLocaleString('en-US', {
      timeZone: 'America/Detroit', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });
  }

  function render(element, input, options) {
    if (!element || typeof element.querySelector !== 'function') return null;
    const verdict = resolve(input, options);
    const set = function (selector, value) {
      const target = element.querySelector(selector);
      if (target) target.textContent = value;
    };
    element.dataset.verdict = verdict.verdict.toLowerCase().replace(/ /g, '-');
    set('[data-verdict-state]', verdict.label);
    set('[data-verdict-best]', verdict.bestWindow);
    set('[data-verdict-where]', verdict.locationNote);
    set('[data-verdict-asof]', formatAsOf(verdict.asOf));
    set('[data-verdict-reason]', verdict.reason || 'This is planning guidance, not a visibility guarantee.');
    const list = element.querySelector('[data-verdict-drivers]');
    if (list) {
      const doc = element.ownerDocument || (typeof document !== 'undefined' ? document : null);
      if (doc) {
        const items = verdict.drivers.map(function (driver) {
          const li = doc.createElement('li');
          const strong = doc.createElement('strong');
          strong.textContent = driver.label + ': ';
          li.appendChild(strong);
          li.appendChild(doc.createTextNode(driver.text));
          return li;
        });
        list.replaceChildren.apply(list, items);
      }
      list.hidden = verdict.verdict === 'UNAVAILABLE';
    }
    return verdict;
  }

  return { render: render, resolve: resolve, formatAsOf: formatAsOf };
});