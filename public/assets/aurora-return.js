/*
 * Northern Lights Michigan: reasons to come back (return contract:
 * docs/return-contracts/northern-lights-michigan.md).
 *
 * 1. Since your last check: one computed line comparing this visit with the
 *    visitor's previous visit for the same region, stored only on the device.
 * 2. Share this region's outlook: a ?region= link that opens the same answer.
 * 3. Add the best time to my calendar: a one-event .ics built in the browser.
 *
 * No server, no account, no notifications. Every value shown comes from the
 * page's own NOAA/NWS decision (the aurora:decision event). Storage failures
 * leave the page exactly as it was.
 */
(function () {
  'use strict';

  var STORE_KEY = 'ciz:aurora:lastseen:v1';
  var PAGE_URL = 'https://chrisizworski.com/northern-lights-michigan/';
  var MIN_GAP_MS = 30 * 60 * 1000; // a reload a few minutes later is not a "last visit"
  var MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000; // older than three weeks says nothing useful
  var STATE_LABEL = {
    monitor: 'worth monitoring',
    borderline: 'borderline',
    low: 'low',
    unavailable: 'unavailable'
  };

  function readStore() {
    try {
      var raw = window.localStorage.getItem(STORE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function writeStore(store) {
    try { window.localStorage.setItem(STORE_KEY, JSON.stringify(store)); } catch (error) {}
  }

  function track(name, data) {
    try { if (typeof window.va === 'function') window.va('event', { name: name, data: data || {} }); } catch (error) {}
  }

  function michiganTime(date, withDay) {
    var options = { timeZone: 'America/Detroit', hour: 'numeric', minute: '2-digit' };
    if (withDay) options.weekday = 'long';
    return date.toLocaleString('en-US', options);
  }

  function kpText(value) {
    return typeof value === 'number' && isFinite(value) ? 'Kp ' + value.toFixed(1) : null;
  }

  // Pure: describe the change between a stored visit and the current decision.
  function describeChange(previous, current, now) {
    if (!previous || !current || !STATE_LABEL[previous.state] || !STATE_LABEL[current.state]) return null;
    if (current.state === 'unavailable' || previous.state === 'unavailable') return null;
    var age = now - previous.at;
    if (!(age >= MIN_GAP_MS && age <= MAX_AGE_MS)) return null;
    var when = michiganTime(new Date(previous.at), true);
    var before = 'Signal was ' + STATE_LABEL[previous.state] + (kpText(previous.kp) ? ' (' + kpText(previous.kp) + ')' : '');
    var after = STATE_LABEL[current.state] + (kpText(current.kp) ? ' (' + kpText(current.kp) + ')' : '');
    if (previous.state === current.state) {
      return 'Since your last check (' + when + '): still ' + after + '.';
    }
    return 'Since your last check (' + when + '): ' + before + ', now ' + after + '.';
  }

  function shareUrl(regionId) {
    return PAGE_URL + '?region=' + encodeURIComponent(regionId) + '&utm_source=share&utm_medium=aurora';
  }

  function shareText(decision) {
    var parts = ['Northern lights near ' + decision.regionLabel + ' tonight: ' + decision.headline + '.'];
    if (decision.bestTime) parts.push('Best time to look north: about ' + michiganTime(new Date(decision.bestTime)) + ' ET.');
    if (kpText(decision.kp)) parts.push('NOAA forecast ' + kpText(decision.kp) + ' against a local threshold of Kp ' + decision.threshold + '. No forecast guarantees visibility.');
    return parts.join(' ');
  }

  function icsStamp(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  function icsEscape(text) {
    return String(text).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  }

  // Pure: a single VEVENT for the best hour. Times in UTC, no alarm (calendar apps apply their own defaults).
  function buildIcs(decision, now) {
    var start = new Date(decision.bestTime);
    var end = new Date(start.getTime() + 60 * 60 * 1000);
    var day = start.toISOString().slice(0, 10);
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//chrisizworski.com//Northern Lights Michigan//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:aurora-' + decision.regionId + '-' + day + '@chrisizworski.com',
      'DTSTAMP:' + icsStamp(now),
      'DTSTART:' + icsStamp(start),
      'DTEND:' + icsStamp(end),
      'SUMMARY:' + icsEscape('Look for the northern lights near ' + decision.regionLabel),
      'DESCRIPTION:' + icsEscape(shareText(decision) + ' Check clouds and the live forecast before you go: ' + PAGE_URL + '?region=' + decision.regionId + '&utm_source=calendar'),
      'URL:' + PAGE_URL + '?region=' + decision.regionId,
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return lines.join('\r\n') + '\r\n';
  }

  function calendarWorthOffering(decision, now) {
    if (!decision || !decision.bestTime) return false;
    if (decision.state !== 'monitor' && decision.state !== 'borderline') return false;
    var start = Date.parse(decision.bestTime);
    return isFinite(start) && start > now && start - now < 36 * 60 * 60 * 1000;
  }

  // Exposed for tests; the page does not depend on it.
  window.AuroraReturn = { describeChange: describeChange, buildIcs: buildIcs, shareText: shareText, shareUrl: shareUrl, calendarWorthOffering: calendarWorthOffering };

  if (!window.document || typeof document.getElementById !== 'function') return;

  var lineEl = document.getElementById('sinceLastCheck');
  var shareBtn = document.getElementById('shareRegionBtn');
  var calBtn = document.getElementById('calendarBestBtn');
  var statusEl = document.getElementById('returnStatus');
  var select = document.getElementById('regionSelect');
  if (!lineEl || !shareBtn || !calBtn) return;

  // The previous visit is read once, before this visit overwrites it.
  var previousVisits = readStore();
  var shownFor = null;
  var latest = null;

  function setStatus(text) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.hidden = !text;
  }

  function onDecision(decision) {
    if (!decision || !decision.regionId) return;
    latest = decision;
    var now = Date.now();

    // Compare against the snapshot read at load, on every real decision; the page
    // sends an 'unavailable' placeholder before data arrives, which never fills the line.
    var message = decision.state === 'unavailable' ? null : describeChange(previousVisits[decision.regionId], decision, now);
    lineEl.textContent = message || '';
    lineEl.hidden = !message;
    if (message && shownFor !== decision.regionId) {
      track('Aurora Return Line', { region: decision.regionId });
      shownFor = decision.regionId;
    }

    if (decision.state !== 'unavailable') {
      var store = readStore();
      store[decision.regionId] = { state: decision.state, kp: typeof decision.kp === 'number' ? Math.round(decision.kp * 10) / 10 : null, at: now };
      writeStore(store);
    }

    shareBtn.hidden = decision.state === 'unavailable';
    calBtn.hidden = !calendarWorthOffering(decision, now);
    if (!calBtn.hidden) calBtn.textContent = 'Add ' + michiganTime(new Date(decision.bestTime)) + ' to my calendar';
  }

  window.addEventListener('aurora:decision', function (event) { onDecision(event.detail); });
  if (window.__auroraDecision) onDecision(window.__auroraDecision);

  // Keep the address bar on the visitor's chosen region so a copied link opens it.
  if (select && window.history && typeof window.history.replaceState === 'function') {
    select.addEventListener('change', function () {
      try {
        var url = new URL(window.location.href);
        url.searchParams.set('region', select.value);
        window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
      } catch (error) {}
    });
  }

  shareBtn.addEventListener('click', function () {
    if (!latest) return;
    var url = shareUrl(latest.regionId);
    var text = shareText(latest);
    track('Aurora Share', { region: latest.regionId });
    if (navigator.share) {
      navigator.share({ title: 'Northern lights near ' + latest.regionLabel, text: text, url: url }).catch(function () {});
      return;
    }
    var copy = text + ' ' + url;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(copy).then(function () { setStatus('Link copied. Paste it into a message.'); },
        function () { setStatus('Copy this link: ' + url); });
    } else {
      setStatus('Copy this link: ' + url);
    }
  });

  calBtn.addEventListener('click', function () {
    if (!latest || !calendarWorthOffering(latest, Date.now())) return;
    try {
      var blob = new Blob([buildIcs(latest, new Date())], { type: 'text/calendar;charset=utf-8' });
      var href = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = href;
      a.download = 'northern-lights-' + latest.regionId + '.ics';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(href); }, 4000);
      track('Aurora Calendar', { region: latest.regionId });
      setStatus('Calendar file downloaded. Open it to add the event.');
    } catch (error) {
      setStatus('Your browser blocked the calendar file.');
    }
  });
})();
