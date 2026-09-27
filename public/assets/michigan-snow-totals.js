(function () {
  'use strict';
  var C = window.SnowCore;
  if (!C) return;
  var PAGE = 'https://chrisizworski.com/michigan-snow-totals/';
  var TABLE_STEP = 40;
  var params = C.parseParams(location.search);
  var state = {
    data: null, season: null, places: null, placesPromise: null,
    window: params.window || '24h', windowChosen: Boolean(params.window), region: params.region, town: params.town,
    geo: null, shareRow: null, tableLimit: TABLE_STEP, map: null, layer: null, markers: {}
  };

  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function color(n) { return n >= 12 ? '#0b2540' : n >= 6 ? '#1d4f7a' : n >= 3 ? '#3a7fb8' : '#8fbde0'; }
  function dataNow() { return state.data ? Date.parse(state.data.generatedAt) : Date.now(); }
  function place(r) { return C.prettyPlace(r.place); }
  function where(r) { var c = C.countyLabel(r.county); return place(r) + (c ? ', ' + c : ''); }
  function stamp(r) { return C.when(r.reportedAt) + ' ET (' + C.relTime(r.reportedAt, Date.now()) + ')'; }
  function kind(r) { return (r.measured ? 'measured' : 'estimated') + ', ' + (r.sourceLabel || C.sourceLabel(r.source)); }
  function windowLabel() { return C.WINDOW_LABEL[state.window]; }
  function regionLabel() { var r = C.regionById(state.region); return r ? r.label : 'Michigan'; }

  function allRows() { return state.data ? C.rowsFor(state.data.reports || [], state.window, dataNow()) : []; }
  function visibleRows() { var rows = allRows(); return state.region ? rows.filter(function (r) { return r.region === state.region; }) : rows; }

  // ---- Map ----
  function initMap() {
    if (state.map || typeof L === 'undefined') return;
    state.map = L.map('snowMap', { scrollWheelZoom: false }).setView([44.9, -85.9], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(state.map);
    state.layer = L.layerGroup().addTo(state.map);
  }
  function popup(r) {
    return '<b>' + esc(C.inches(r.inches)) + ' at ' + esc(where(r)) + '</b><br>' + esc(stamp(r)) + '<br>' + esc(kind(r)) +
      (r.remark ? '<br><i>' + esc(r.remark) + '</i>' : '') + (r.productUrl ? '<br><a href="' + esc(r.productUrl) + '" rel="noopener">Original NWS report</a>' : '');
  }
  function renderMap(rows, fit) {
    initMap();
    if (!state.layer) return;
    state.layer.clearLayers();
    state.markers = {};
    rows.forEach(function (r) {
      var m = L.circleMarker([r.lat, r.lon], { radius: Math.max(5, Math.min(18, 4 + r.inches)), color: '#fff', weight: 1, fillColor: color(r.inches), fillOpacity: 0.9 })
        .bindPopup(popup(r)).addTo(state.layer);
      state.markers[r.place + '|' + r.county] = m;
    });
    if (fit && rows.length) state.map.fitBounds(L.latLngBounds(rows.map(function (r) { return [r.lat, r.lon]; })).pad(0.25), { maxZoom: 9 });
    else if (fit) state.map.setView([44.9, -85.9], 6);
  }
  function focusRow(r) {
    if (!state.map || !r) return;
    var m = state.markers[r.place + '|' + r.county];
    state.map.setView([r.lat, r.lon], 9);
    if (m) m.openPopup();
  }

  // ---- Summary ----
  function renderSummary(rows) {
    var d = state.data, el = $('snowSummary');
    if (rows.length) {
      var top = rows[0];
      el.innerHTML = 'In ' + esc(windowLabel()) + ', <strong>' + rows.length + ' place' + (rows.length === 1 ? '' : 's') + ' in ' + esc(regionLabel()) + '</strong> reported snow to the National Weather Service. Largest: <strong>' +
        esc(C.inches(top.inches)) + ' at ' + esc(where(top)) + '</strong>, ' + esc(stamp(top)) + ', ' + esc(kind(top)) + '.';
      return;
    }
    var week = C.rowsFor(d.reports || [], '168h', dataNow());
    if (state.region) week = week.filter(function (r) { return r.region === state.region; });
    if (week.length) {
      el.innerHTML = 'No snow reported in ' + esc(regionLabel()) + ' in ' + esc(windowLabel()) + '. The last 7 days had <strong>' + week.length + '</strong> reporting place' + (week.length === 1 ? '' : 's') + ', led by ' +
        esc(C.inches(week[0].inches)) + ' at ' + esc(where(week[0])) + ' (' + esc(stamp(week[0])) + '). Choose 7 days to see them.';
      return;
    }
    if (d.lastSnow && d.lastSnow.latest) {
      var l = d.lastSnow.latest;
      el.innerHTML = '<strong>No snow has been reported anywhere in Michigan in the last 7 days.</strong> The most recent NWS snow report was <strong>' +
        esc(C.inches(l.inches)) + ' at ' + esc(where(l)) + '</strong> on ' + esc(C.when(l.reportedAt)) + ' ET. The map fills in as soon as the next snow is reported; the season section below shows when the first snow usually comes.';
      return;
    }
    el.textContent = 'No snow has been reported anywhere in Michigan in the last 7 days.';
  }

  function renderAlerts() {
    var a = (state.data && state.data.alerts) || [];
    $('alertList').innerHTML = a.map(function (x) {
      return '<div class="alert"><b>' + esc(x.event) + '</b>' + (x.headline ? ': ' + esc(x.headline) : '') + (x.areas ? '<br><small>' + esc(x.areas) + '</small>' : '') + '</div>';
    }).join('');
  }

  // ---- Regions ----
  function renderChips() {
    var counts = C.byRegion(allRows());
    var chips = ['<button type="button" data-region="" aria-pressed="' + String(!state.region) + '">All Michigan</button>'];
    counts.forEach(function (c) {
      chips.push('<button type="button" data-region="' + c.id + '" aria-pressed="' + String(state.region === c.id) + '"' + (c.places ? '' : ' class="empty"') + '>' +
        esc(c.label) + ' <span>' + (c.largest ? esc(C.inches(c.largest.inches)) : '0') + '</span></button>');
    });
    $('regionChips').innerHTML = chips.join('');
    var region = C.regionById(state.region), trails = $('regionTrails');
    if (region && region.trails.length) {
      trails.innerHTML = 'Riding in the ' + esc(region.label) + '? ' + region.trails.map(function (t) { return '<a href="' + t.href + '">' + esc(t.label) + '</a>'; }).join(' · ');
      trails.hidden = false;
    } else trails.hidden = true;
  }

  // ---- Table ----
  function renderTable(rows) {
    var body = $('snowTable').querySelector('tbody');
    $('snowTable').querySelector('caption').textContent = 'Largest report from each place in ' + regionLabel() + ', ' + windowLabel();
    if (!rows.length) { body.innerHTML = '<tr><td colspan="5">No snow reports in ' + esc(regionLabel()) + ' in ' + esc(windowLabel()) + '.</td></tr>'; $('showAll').hidden = true; return; }
    body.innerHTML = rows.slice(0, state.tableLimit).map(function (r, i) {
      return '<tr><td>' + (i + 1) + '</td><td class="in">' + esc(C.inches(r.inches)) + '<span class="tag">' + (r.measured ? 'measured' : 'estimated') + '</span></td>' +
        '<td>' + esc(where(r)) + (r.remark ? '<span class="rm">' + esc(r.remark) + '</span>' : '') + '</td>' +
        '<td>' + esc(C.when(r.reportedAt)) + '<span class="rm">' + esc(C.relTime(r.reportedAt, Date.now())) + '</span></td><td>' + esc(r.sourceLabel || C.sourceLabel(r.source)) +
        (r.productUrl ? ' · <a href="' + esc(r.productUrl) + '" rel="noopener">NWS text</a>' : '') + '</td></tr>';
    }).join('');
    $('showAll').hidden = rows.length <= state.tableLimit;
    $('showAll').textContent = 'Show all ' + rows.length + ' places';
  }

  // ---- Find your town ----
  function loadPlaces() {
    if (!state.placesPromise) {
      state.placesPromise = fetch('/assets/michigan-places.json').then(function (r) { return r.json(); })
        .then(function (j) { state.places = j.places || []; fillTownList(); return state.places; })
        .catch(function () { state.places = []; return state.places; });
    }
    return state.placesPromise;
  }
  function fillTownList() {
    var names = {};
    allRows().forEach(function (r) { names[C.baseTown(r.place)] = C.baseTown(r.place).replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); });
    (state.places || []).forEach(function (p) { if (p[3] !== 't') names[C.normName(p[0])] = p[3] === 'c' ? p[0] + ' County' : p[0]; });
    $('townList').innerHTML = Object.keys(names).sort().map(function (k) { return '<option value="' + esc(names[k]) + '">'; }).join('');
  }
  function reportLine(r, extra) {
    return '<li><strong>' + esc(C.inches(r.inches)) + '</strong> at ' + esc(where(r)) + (extra ? ', ' + esc(extra) : '') + ' <span class="when">' + esc(stamp(r)) + ', ' + esc(kind(r)) + '</span>' +
      (r.remark ? '<span class="rm">' + esc(r.remark) + '</span>' : '') + '</li>';
  }
  function nearLines(list) {
    return '<ul class="near">' + list.map(function (n) { return reportLine(n.row, Math.round(n.miles) + ' mi ' + n.dir); }).join('') + '</ul>';
  }
  function dateOnly(d) { return C.when(d + 'T16:00:00Z').replace(/^\w+, /, '').replace(/,[^,]*$/, ''); }
  function stationLines(lat, lon) {
    var x = C.stationContext(lat, lon, state.season);
    if (!x) return '';
    var parts = [];
    var at = esc(x.station) + ' (' + Math.round(x.miles) + ' mi ' + x.dir + ')';
    if (x.season && x.season.anySnow) {
      parts.push('Season so far at the nearest climate station, ' + at + ': <strong>' + esc(C.inches(x.season.total)) + '</strong>' + (x.season.pctOfNormal != null ? ', ' + x.season.pctOfNormal + '% of normal' : '') + '.');
    } else if (x.season) {
      parts.push('No measurable snow yet this season at the nearest climate station, ' + at + '.');
    }
    if (x.firstSnowNormal && !(x.season && x.season.first)) parts.push('First measurable snow there usually comes around <strong>' + esc(x.firstSnowNormal.median) + '</strong>' + (x.firstSnowNormal.station !== x.station ? ' (at ' + esc(x.firstSnowNormal.station) + ')' : '') + '.');
    if (x.season && x.season.first) parts.push('This season\'s first snow there: ' + esc(C.inches(x.season.first.inches)) + ' on ' + esc(dateOnly(x.season.first.date)) + '.');
    if (x.lastSeason) parts.push('Last winter (' + esc(x.lastSeason.label) + ') it finished with <strong>' + esc(C.inches(x.lastSeason.total)) + '</strong>' + (x.lastSeason.pctOfNormal != null ? ', ' + x.lastSeason.pctOfNormal + '% of normal' : '') + '.');
    return '<p class="season-line">' + parts.join(' ') + '</p>';
  }
  function emptyNote(radius, label) {
    var quiet = !C.rowsFor(state.data.reports || [], '168h', dataNow()).length;
    if (quiet) return '<p>No snow has been reported anywhere in Michigan in the last 7 days' + (label ? ', so nothing yet for <strong>' + esc(label) + '</strong>' : '') + '.</p>';
    return '<p>No snow reports within ' + radius + ' miles of ' + (label ? '<strong>' + esc(label) + '</strong>' : 'you') + ' in ' + esc(windowLabel()) + '. Try a longer window.</p>';
  }
  // keepMap: a region or window change owns the map view; the town answer does not pan it.
  function renderTown(keepMap) {
    var box = $('townResult'), share = $('shareBtn');
    state.shareRow = null;
    if (!state.data || (!state.town && !state.geo)) { box.hidden = true; share.hidden = true; return; }
    var rows = allRows(), html = '', result;
    if (state.geo) {
      var near = C.nearest(state.geo.lat, state.geo.lon, rows, 3, 40);
      html = near.length ? '<p><strong>Nearest reports to you</strong> in ' + esc(windowLabel()) + ':</p>' + nearLines(near) : emptyNote(40, '');
      html += stationLines(state.geo.lat, state.geo.lon);
      if (near.length) { state.shareRow = near[0].row; if (!keepMap) focusRow(near[0].row); }
    } else {
      result = C.findTown(state.town, rows, state.places);
      if (result.kind === 'town') {
        html = '<p><strong>' + esc(result.label) + '</strong>, ' + esc(windowLabel()) + ':</p><ul class="near">' + result.rows.slice(0, 3).map(function (r) { return reportLine(r); }).join('') + '</ul>';
        if (result.nearby && result.nearby.length) html += '<p class="also">Also nearby:</p>' + nearLines(result.nearby);
        state.shareRow = result.rows[0];
      } else if (result.kind === 'county') {
        html = result.rows.length ? '<p><strong>' + esc(result.label) + '</strong>, ' + esc(windowLabel()) + ' (' + result.rows.length + ' place' + (result.rows.length === 1 ? '' : 's') + '):</p><ul class="near">' + result.rows.slice(0, 5).map(function (r) { return reportLine(r); }).join('') + '</ul>'
          : emptyNote(0, result.label).replace(/within 0 miles of/, 'from');
        state.shareRow = result.rows[0] || null;
      } else if (result.kind === 'nearby') {
        html = result.nearby.length
          ? '<p><strong>' + esc(result.label) + '</strong> has no report of its own in ' + esc(windowLabel()) + '. Nearest reports:</p>' + nearLines(result.nearby)
          : emptyNote(result.radius, result.label);
        if (result.nearby.length) state.shareRow = result.nearby[0].row;
      } else if (result.kind === 'choose') {
        html = '<p>Which one did you mean?</p><p class="choices">' + result.choices.map(function (c) { return '<button type="button" class="ghost" data-town="' + esc(c) + '">' + esc(c) + '</button>'; }).join(' ') + '</p>';
      } else if (result.kind === 'unknown') {
        html = state.places ? '<p>Could not find "' + esc(result.label) + '" in Michigan. Try a nearby town or the county name.</p>' : '<p>Loading the town list.</p>';
      }
      if (result.place) html += stationLines(result.place.lat, result.place.lon);
      if (state.shareRow && !keepMap) focusRow(state.shareRow);
    }
    box.innerHTML = html;
    box.hidden = !html;
    share.hidden = !state.shareRow;
  }

  function share() {
    var r = state.shareRow;
    if (!r) return;
    var url = C.shareUrl(PAGE, { town: state.town || C.baseTown(r.place), window: state.window });
    var text = C.shareText(r);
    if (navigator.share) { navigator.share({ title: 'Michigan snow totals', text: text, url: url }).catch(function () {}); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text + ' ' + url).then(function () { $('shareBtn').textContent = 'Copied to clipboard'; setTimeout(function () { $('shareBtn').textContent = 'Share this report'; }, 2500); });
    }
  }

  function syncUrl() {
    var u = new URL(location.href);
    ['town', 'window', 'region'].forEach(function (k) { u.searchParams.delete(k); });
    if (state.town) u.searchParams.set('town', state.town);
    if (state.window !== '24h') u.searchParams.set('window', state.window);
    if (state.region) u.searchParams.set('region', state.region);
    history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
  }

  function render(fit) {
    var d = state.data; if (!d) return;
    var rows = visibleRows(), quiet = !(d.reports || []).length, mapRows = rows;
    if (quiet && d.lastSnow) mapRows = d.lastSnow.sameDay || [];
    renderSummary(rows); renderAlerts(); renderChips(); renderTable(rows); renderMap(mapRows, fit); renderTown(fit);
    $('mapNote').textContent = quiet && d.lastSnow
      ? 'Showing the last day snow was reported, ' + C.when(d.lastSnow.reportedAt).replace(/,[^,]*$/, '') + ', because nothing has been reported in the last 7 days.'
      : 'Each dot is one official report, larger and darker for more snow. Tap a dot for the time, source and remark.';
    $('snowStamp').textContent = 'Checked ' + C.when(d.generatedAt) + ' ET. Sources: NWS Local Storm Reports via the Iowa Environmental Mesonet archive, and active NWS alerts from api.weather.gov.' + (d.degraded ? ' Some sources did not respond; figures may be incomplete.' : '');
    document.querySelectorAll('.windows button').forEach(function (x) { x.setAttribute('aria-pressed', String(x.getAttribute('data-window') === state.window)); });
    syncUrl();
  }

  // ---- Season ----
  function renderSeason() {
    var s = state.season; if (!s) return;
    var cur = s.season, sum = $('seasonSummary'), box = $('seasonCurrent'), last = $('lastSeasonBox');
    var regionFilter = function (st) { return !state.region || st.region === state.region; };
    document.querySelectorAll('#lastSeasonTable tbody tr').forEach(function (tr) { tr.hidden = !regionFilter({ region: tr.getAttribute('data-region') }); });
    if (!cur) { sum.textContent = 'This season\'s station data did not load just now. Last winter\'s final totals are below.'; return; }
    var through = C.when(cur.through + 'T16:00:00Z').replace(/,[^,]*$/, '');
    if (!cur.anySnow) {
      sum.innerHTML = '<strong>No measurable snow yet this season</strong> at any of the ' + cur.stations.length + ' climate stations (since July 1, through ' + esc(through) + '). The first snow usually comes in mid-October in the Upper Peninsula snow belt and in November downstate; see the first-snow dates below. Last winter\'s final totals:';
      box.hidden = true; last.open = true;
      return;
    }
    var f = cur.firstOfSeason;
    sum.innerHTML = cur.label + ' season through ' + esc(through) + '.' + (f ? ' First measurable snow: <strong>' + esc(C.inches(f.inches)) + ' at ' + esc(f.station) + '</strong> on ' + esc(C.when(f.date + 'T16:00:00Z').replace(/,[^,]*$/, '')) + '.' : '');
    var rows = cur.stations.filter(regionFilter).sort(function (a, b) { return b.total - a.total; });
    $('seasonCaption').textContent = cur.label + ' season so far, ' + regionLabel();
    $('seasonTable').querySelector('tbody').innerHTML = rows.map(function (st) {
      var pct = st.pctOfNormal != null ? st.pctOfNormal + '%' + (st.missing ? '<span class="rm">' + st.missing + ' d missing</span>' : '') : esc(st.pctNote || 'n/a');
      var first = st.first ? C.when(st.first.date + 'T16:00:00Z').replace(/^\w+, /, '').replace(/,[^,]*$/, '') : 'not yet';
      return '<tr><td>' + esc(st.name) + '</td><td class="in">' + esc(st.total.toFixed(1)) + '</td><td>' + (st.normal == null ? 'n/a' : esc(st.normal.toFixed(1))) + '</td><td>' + pct + '</td><td>' + esc(first) +
        (st.firstSnowNormal ? '<span class="rm">median ' + esc(st.firstSnowNormal) + '</span>' : '') + '</td></tr>';
    }).join('');
    box.hidden = false; last.open = false;
  }

  // ---- Events ----
  document.querySelectorAll('.windows button').forEach(function (b) {
    b.addEventListener('click', function () { state.window = b.getAttribute('data-window'); state.windowChosen = true; state.tableLimit = TABLE_STEP; render(true); });
  });
  $('regionChips').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    state.region = b.getAttribute('data-region') || null; state.tableLimit = TABLE_STEP; render(true); renderSeason();
  });
  $('showAll').addEventListener('click', function () { state.tableLimit = 100000; renderTable(visibleRows()); });
  $('townForm').addEventListener('submit', function (e) {
    e.preventDefault();
    state.town = $('townSearch').value.trim().slice(0, 60); state.geo = null;
    loadPlaces().then(function () { render(false); });
  });
  $('townSearch').addEventListener('focus', loadPlaces, { once: true });
  $('nearMe').addEventListener('click', function () {
    if (!navigator.geolocation) { $('townResult').hidden = false; $('townResult').textContent = 'This browser cannot share its location. Type a town instead.'; return; }
    $('nearMe').textContent = 'Locating';
    navigator.geolocation.getCurrentPosition(function (pos) {
      $('nearMe').textContent = 'Near me';
      state.geo = { lat: pos.coords.latitude, lon: pos.coords.longitude }; state.town = ''; $('townSearch').value = '';
      render(false);
    }, function () {
      $('nearMe').textContent = 'Near me';
      $('townResult').hidden = false; $('townResult').textContent = 'Location was not shared. Type a town instead.';
    }, { timeout: 10000, maximumAge: 600000 });
  });
  $('shareBtn').addEventListener('click', share);
  $('townResult').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-town]'); if (!b) return;
    $('townSearch').value = b.getAttribute('data-town'); state.town = b.getAttribute('data-town').replace(/ Township,.*$/, ''); state.geo = null; render(false);
  });

  // ---- Load ----
  if (state.town) { $('townSearch').value = state.town; loadPlaces(); }
  fetch('/api/michigan-snow-totals', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (d) {
      state.data = d;
      if (!d.ok) { $('snowSummary').textContent = 'The NWS snow report archive did not respond just now. Try again in a few minutes.'; initMap(); return; }
      // Open on the shortest window that has snow, so a quiet day still shows the latest storm.
      if (!state.windowChosen) {
        var first = C.WINDOWS.filter(function (k) { return d.windows[k] && d.windows[k].placeCount; })[0];
        if (first) state.window = first;
      }
      if (state.places) fillTownList();
      (state.town ? loadPlaces() : Promise.resolve()).then(function () { render(Boolean(state.region)); });
    })
    .catch(function () { $('snowSummary').textContent = 'Snow reports did not load just now. Try again in a few minutes.'; initMap(); });
  fetch('/api/michigan-snow-totals?view=season', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.json(); })
    .then(function (s) { state.season = s; renderSeason(); if (state.data) renderTown(); })
    .catch(function () {});
})();
