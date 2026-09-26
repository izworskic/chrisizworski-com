(function () {
  'use strict';
  var TZ = 'America/Detroit';
  var state = { data: null, window: '24h', map: null, layer: null };
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function when(isoTime) { return new Date(isoTime).toLocaleString('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  function inches(n) { return (Math.round(n * 10) / 10).toString() + '"'; }
  function label(w) { return { '24h': 'the last 24 hours', '48h': 'the last 48 hours', '72h': 'the last 72 hours', '168h': 'the last 7 days' }[w]; }
  function color(n) { return n >= 12 ? '#0b2540' : n >= 6 ? '#1d4f7a' : n >= 3 ? '#3a7fb8' : '#8fbde0'; }

  function initMap() {
    if (state.map || typeof L === 'undefined') return;
    state.map = L.map('snowMap', { scrollWheelZoom: false }).setView([44.9, -85.9], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(state.map);
    state.layer = L.layerGroup().addTo(state.map);
  }

  function renderMap(rows) {
    initMap();
    if (!state.layer) return;
    state.layer.clearLayers();
    rows.forEach(function (r) {
      L.circleMarker([r.lat, r.lon], { radius: Math.max(5, Math.min(18, 4 + r.inches)), color: '#fff', weight: 1, fillColor: color(r.inches), fillOpacity: 0.9 })
        .bindPopup('<b>' + esc(inches(r.inches)) + ' at ' + esc(r.place) + '</b><br>' + esc(r.county) + ' County · ' + esc(when(r.reportedAt)) + ' ET<br>' +
          esc(r.measured ? 'Measured' : 'Estimated') + ' · ' + esc(r.source) + (r.remark ? '<br><i>' + esc(r.remark) + '</i>' : '') +
          (r.productUrl ? '<br><a href="' + esc(r.productUrl) + '" rel="noopener">Original NWS report</a>' : ''))
        .addTo(state.layer);
    });
  }

  function renderTable(rows) {
    var body = $('snowTable').querySelector('tbody');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5">No snow reports in ' + esc(label(state.window)) + '.</td></tr>'; return; }
    body.innerHTML = rows.slice(0, 40).map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="in">' + esc(inches(r.inches)) + '<span class="tag">' + (r.measured ? 'measured' : 'estimated') + '</span></td>' +
        '<td>' + esc(r.place) + ', ' + esc(r.county) + ' Co.' + (r.remark ? '<span class="rm">' + esc(r.remark) + '</span>' : '') + '</td>' +
        '<td>' + esc(when(r.reportedAt)) + '</td><td>' + esc(r.source) + (r.productUrl ? ' · <a href="' + esc(r.productUrl) + '" rel="noopener">NWS text</a>' : '') + '</td></tr>';
    }).join('');
  }

  function renderOffices(w) {
    var offices = (state.data && state.data.offices) || {};
    $('officeGrid').innerHTML = (w.byOffice || []).map(function (o) {
      return '<div class="office"><b>' + esc(o.name || o.office) + '</b>' + esc((offices[o.office] || {}).area || '') + '<br>' +
        esc(o.places) + ' place' + (o.places === 1 ? '' : 's') + ' · largest ' + esc(inches(o.largest.inches)) + ' at ' + esc(o.largest.place) + '</div>';
    }).join('');
  }

  function renderSummary(w) {
    var d = state.data;
    if (w.placeCount) {
      var top = w.largest;
      $('snowSummary').innerHTML = 'In ' + esc(label(state.window)) + ', <strong>' + esc(w.placeCount) + ' Michigan place' + (w.placeCount === 1 ? '' : 's') + '</strong> reported snow to the National Weather Service. The largest report: <strong>' +
        esc(inches(top.inches)) + ' at ' + esc(top.place) + ', ' + esc(top.county) + ' County</strong>, ' + esc(when(top.reportedAt)) + ' ET (' + esc(top.measured ? 'measured' : 'estimated') + ', ' + esc(top.source) + ').';
      return;
    }
    var week = d.windows['168h'];
    if (week && week.placeCount) {
      $('snowSummary').innerHTML = 'No snow reports in ' + esc(label(state.window)) + '. The last 7 days had <strong>' + esc(week.placeCount) + '</strong>, led by ' +
        esc(inches(week.largest.inches)) + ' at ' + esc(week.largest.place) + ' (' + esc(when(week.largest.reportedAt)) + ' ET). Choose 7 days to see them.';
      return;
    }
    if (d.lastSnow && d.lastSnow.latest) {
      var l = d.lastSnow.latest;
      $('snowSummary').innerHTML = '<strong>No snow has been reported anywhere in Michigan in the last 7 days.</strong> The most recent NWS snow report was <strong>' +
        esc(inches(l.inches)) + ' at ' + esc(l.place) + ', ' + esc(l.county) + ' County</strong> on ' + esc(when(l.reportedAt)) + ' ET. This map fills in as soon as the next snow is reported.';
      return;
    }
    $('snowSummary').textContent = 'No snow has been reported anywhere in Michigan in the last 7 days.';
  }

  function renderAlerts() {
    var a = (state.data && state.data.alerts) || [];
    $('alertList').innerHTML = a.length ? a.map(function (x) {
      return '<div class="alert"><b>' + esc(x.event) + '</b>' + (x.headline ? ': ' + esc(x.headline) : '') + (x.areas ? '<br><small>' + esc(x.areas) + '</small>' : '') + '</div>';
    }).join('') : '';
  }

  function render() {
    var d = state.data; if (!d) return;
    var w = d.windows[state.window] || { ranked: [], byOffice: [], placeCount: 0 };
    var rows = w.ranked || [];
    // A quiet week plots the last day snow was reported, which the summary names.
    var quietWeek = !(d.windows['168h'] && d.windows['168h'].placeCount);
    if (!rows.length && quietWeek && d.lastSnow) rows = d.lastSnow.sameDay || [];
    renderSummary(w); renderAlerts(); renderOffices(w); renderTable(w.ranked || []); renderMap(rows);
    $('snowStamp').textContent = 'Checked ' + when(d.generatedAt) + ' ET. Sources: NWS Local Storm Reports via the Iowa Environmental Mesonet archive, and active NWS alerts from api.weather.gov.' + (d.degraded ? ' Some sources did not respond; figures may be incomplete.' : '');
  }

  document.querySelectorAll('.windows button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.window = b.getAttribute('data-window');
      document.querySelectorAll('.windows button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
    });
  });

  fetch('/api/michigan-snow-totals', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      state.data = d;
      if (!d.ok) { $('snowSummary').textContent = 'The NWS snow report archive did not respond just now. Try again in a few minutes.'; initMap(); return; }
      // Open on the shortest window that has snow, so a quiet day still shows the latest storm.
      var first = ['24h', '48h', '72h', '168h'].find(function (k) { return d.windows[k] && d.windows[k].placeCount; });
      if (first) { state.window = first; document.querySelectorAll('.windows button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-window') === first)); }); }
      render();
    })
    .catch(function () { $('snowSummary').textContent = 'Snow reports did not load just now. Try again in a few minutes.'; initMap(); });
})();
