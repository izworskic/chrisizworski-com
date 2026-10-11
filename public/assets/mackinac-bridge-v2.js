(function () {
  'use strict';
  var STORE = 'mackinac:watch:v2:local';
  var ENDPOINT = '/api/mackinac-watch';
  var riskRoot = document.getElementById('bridgeRiskStrip');
  var watchButton = document.getElementById('bridgeWatchButton');
  var watchNote = document.getElementById('bridgeWatchExplainer');
  var lastForecast = null;

  function track(action, more) {
    if (typeof window.va === 'function') {
      window.va('event', {
        name: 'Bridge V2 Interaction',
        data: Object.assign({ action: action }, more || {})
      });
    }
  }
  function loadWatch() {
    try {
      var item = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (item && item.watchId && item.manageToken && Date.parse(item.expiresAt) > Date.now()) return item;
    } catch (_) { /* local storage can be disabled */ }
    return null;
  }
  function saveWatch(value) {
    try {
      if (value) localStorage.setItem(STORE, JSON.stringify(value));
      else localStorage.removeItem(STORE);
    } catch (_) { /* private mode */ }
  }
  function describeTime(date) {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Detroit', hour: 'numeric', weekday: 'short'
    }).format(date);
  }
  function riskValue(wind) {
    if (wind >= 35) return { level: 'high', label: 'High', hint: '35+ mph: escort / closure reference range' };
    if (wind >= 20) return { level: 'elevated', label: 'Elevated', hint: '20–34 mph: advisory reference range' };
    return { level: 'low', label: 'Low', hint: 'Below 20 mph wind reference' };
  }
  function renderRisk(data) {
    if (!riskRoot) return;
    riskRoot.replaceChildren();
    var hours = data?.forecast?.hours || [];
    var generated = Date.parse(data?.forecast?.generated_at || '');
    if (!hours.length || (Number.isFinite(generated) && (Date.now() - generated > 6 * 60 * 60 * 1000 || generated > Date.now() + 60 * 60 * 1000))) {
      riskRoot.textContent = 'NWS planning outlook unavailable or stale. Check the official status above.';
      lastForecast = null;
      return;
    }
    lastForecast = data.forecast;
    var start = Date.now();
    var rendered = 0;
    for (var block = 0; block < 4; block++) {
      var from = start + block * 6 * 60 * 60 * 1000;
      var to = from + 6 * 60 * 60 * 1000;
      var winds = hours.filter(function (h) {
        var ts = Date.parse(h.start_time);
        return Number.isFinite(ts) && ts >= from - (block === 0 ? 60 * 60 * 1000 : 0) && ts < to &&
          h.wind_mph !== null && h.wind_mph !== undefined && Number.isFinite(Number(h.wind_mph));
      }).map(function (h) { return Number(h.wind_mph); });
      var cell = document.createElement('div');
      cell.className = 'bridge-risk-block';
      var label = document.createElement('span');
      label.className = 'bridge-risk-time';
      label.textContent = describeTime(new Date(from)) + ' – ' + describeTime(new Date(to));
      var grade = document.createElement('strong');
      var hint = document.createElement('small');
      if (winds.length === 0) {
        cell.dataset.risk = 'unavailable';
        grade.textContent = 'Unavailable';
        hint.textContent = 'No usable hourly wind forecast';
      } else {
        var max = Math.max.apply(null, winds);
        var risk = riskValue(max);
        cell.dataset.risk = risk.level;
        grade.textContent = risk.label;
        hint.textContent = 'Up to ' + Math.round(max) + ' mph sustained · ' + risk.hint;
        rendered++;
      }
      cell.append(label, grade, hint);
      riskRoot.appendChild(cell);
    }
    if (rendered) track('risk-outlook-render', { usable_blocks: rendered });
  }
  function supported() {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }
  function updateWatchUI() {
    var item = loadWatch();
    if (!supported()) {
      watchButton.disabled = true;
      watchButton.textContent = 'Push not supported';
      watchNote.textContent = 'This browser does not support background Web Push. Existing page alerts remain available where supported.';
      return;
    }
    watchButton.disabled = false;
    watchButton.textContent = item ? 'Stop watching' : 'Watch the bridge';
    watchButton.setAttribute('aria-pressed', String(Boolean(item)));
    if (item) {
      watchNote.textContent = 'Background alerts are on until ' +
        new Intl.DateTimeFormat('en-US', {
          timeZone: 'America/Detroit', month: 'short', day: 'numeric',
          hour: 'numeric', minute: '2-digit'
        }).format(new Date(item.expiresAt)) +
        ' ET. Only official restriction-level changes; up to 6 per day. Watch again to renew after 48 hours.';
    } else {
      watchNote.textContent = 'Get background alerts for official advisory, escort, closure and reopening changes for 48 hours, even after closing this tab. Requires notification permission.';
    }
  }
  function decodeKey(key) {
    var text = atob(String(key).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(text, function (c) { return c.charCodeAt(0); });
  }
  async function api(action, body) {
    var result = await fetch(ENDPOINT + '?action=' + action, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });
    var payload = await result.json();
    if (!result.ok || !payload.ok) throw new Error(payload.message || 'Bridge watching is temporarily unavailable.');
    return payload;
  }
  async function startWatch() {
    if (!supported()) return;
    watchButton.disabled = true;
    watchNote.textContent = 'Enabling background notifications…';
    try {
      var permission = Notification.permission;
      if (permission !== 'granted') permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notifications were not allowed in this browser.');
      var keyResponse = await fetch(ENDPOINT + '?action=vapid-key', { cache: 'no-store' });
      var key = await keyResponse.json();
      if (!keyResponse.ok || !key.ok || !key.publicKey) throw new Error('Bridge push is not configured on the server.');
      var registration = await navigator.serviceWorker.register('/mackinac-bridge-sw.js', {
        scope: '/mackinac-bridge-live/'
      });
      var subscription = await registration.pushManager.getSubscription();
      if (!subscription) subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: decodeKey(key.publicKey)
      });
      var result = await api('subscribe', { subscription: subscription.toJSON() });
      saveWatch(result);
      track('watch-bridge-start');
    } catch (error) {
      watchNote.textContent = String(error.message || error);
      track('watch-bridge-error');
    }
    updateWatchUI();
  }
  async function stopWatch() {
    var item = loadWatch();
    if (!item) return updateWatchUI();
    watchButton.disabled = true;
    try {
      await api('unsubscribe', { watchId: item.watchId, manageToken: item.manageToken });
      saveWatch(null);
      track('watch-bridge-stop');
      var registration = await navigator.serviceWorker.getRegistration('/mackinac-bridge-live/');
      var subscription = registration ? await registration.pushManager.getSubscription() : null;
      if (subscription) await subscription.unsubscribe();
    } catch (error) {
      watchNote.textContent = 'Could not stop the watch: ' + String(error.message || error);
      watchButton.disabled = false;
      return;
    }
    updateWatchUI();
  }
  function init() {
    if (!watchButton) return;
    watchButton.addEventListener('click', function () {
      if (loadWatch()) stopWatch();
      else startWatch();
    });
    updateWatchUI();
    window.addEventListener('mackinac:official-data', function (event) {
      renderRisk(event.detail);
    });
    document.querySelectorAll('[data-bridge-v2-link]').forEach(function (link) {
      link.addEventListener('click', function () {
        track('going-further-click', { destination: link.dataset.bridgeV2Link });
      });
    });
    // Revalidate persisted state when the page is visited again.
    var item = loadWatch();
    if (item) {
      api('status', { watchId: item.watchId, manageToken: item.manageToken })
        .then(function () { /* active; local expiry is unchanged */ })
        .catch(function () { /* temporary server outages must not wipe the watch */ });
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();