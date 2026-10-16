(function () {
  'use strict';
  var API = '/api/michigan-rockhounding';
  var RANK = {PRIME: 0, GOOD: 1, ANYTIME: 2, QUIET: 3, BUILDING: 4, STORM: 5, UNAVAILABLE: 6};
  var COLORS = {PRIME: '#1e6b55', GOOD: '#4f8794', QUIET: '#8b918e', STORM: '#b23f1c', BUILDING: '#b97a14', ANYTIME: '#6d5f8d', UNAVAILABLE: '#a7adaa'};
  var list = document.getElementById('beachList');
  var cards = Array.prototype.slice.call(document.querySelectorAll('.beach'));
  var answer = document.getElementById('answer');
  var stamp = document.getElementById('stamp');
  var state = {stone: 'all', collect: false, data: null};
  var map = null, markers = {};

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function nameOf(id) { var c = document.getElementById(id); return c ? c.querySelector('h3').textContent : id; }
  function when(t, tz) {
    try {
      return new Intl.DateTimeFormat('en-US', {weekday: 'short', hour: 'numeric', timeZone: tz || 'America/Detroit'}).format(new Date(t * 1000));
    } catch (e) { return new Date(t * 1000).toLocaleString(); }
  }
  function clock(t, tz) {
    try { return new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit', timeZone: tz || 'America/Detroit'}).format(new Date(t * 1000)); }
    catch (e) { return ''; }
  }

  function strip(series, nowS) {
    if (!series || !series.length) return '';
    var W = 600, H = 48, base = 48, n = series.length, bw = W / n;
    var max = 30; // mph of effective onshore wind that fills the strip
    var bars = series.map(function (r, i) {
      var u = r[1];
      if (u == null) return '';
      var h = Math.min(1, u / max) * (base - 4);
      var col = u >= 22 ? COLORS.STORM : u >= 10 ? '#2f6c78' : '#b9c4c2';
      var op = r[0] > nowS ? 0.45 : 1;
      return '<rect x="' + (i * bw).toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + Math.max(1, bw - 0.6).toFixed(1) + '" height="' + Math.max(1, h).toFixed(1) + '" fill="' + col + '" opacity="' + op + '"/>';
    }).join('');
    var nowI = series.findIndex(function (r) { return r[0] > nowS; });
    if (nowI < 0) nowI = n;
    var x = nowI * bw;
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="Onshore wind, last 3 days and next 2">' +
      '<line x1="0" y1="' + base + '" x2="' + W + '" y2="' + base + '" stroke="#d3d9d6"/>' + bars +
      '<line x1="' + x + '" y1="0" x2="' + x + '" y2="' + H + '" stroke="#263035" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>' +
      '<div class="strip-axis"><span>3 days ago</span><span style="left:' + (x / W * 100).toFixed(1) + '%">now</span><span>in 2 days</span></div>';
  }

  function render(site, card, data) {
    var v = site.verdict || {code: 'UNAVAILABLE', label: 'Conditions unavailable', headline: '', detail: ''};
    var tz = card.getAttribute('data-tz');
    card.setAttribute('data-code', v.code);
    card.querySelector('[data-verdict]').textContent = v.label;
    card.querySelector('[data-reading]').innerHTML = '<strong>' + esc(v.headline) + '</strong>' + esc(v.detail);
    var nowS = Date.parse(data.generatedAt) / 1000;
    card.querySelector('[data-strip]').innerHTML = site.series && site.series.length && site.storm ? strip(site.series, nowS) : '';
    var f = [];
    if (site.now) f.push(['Wind now', site.now.windMph + ' mph from the ' + (site.now.from || '?') + (site.now.gustMph ? ', gusts ' + site.now.gustMph : '')]);
    if (site.storm && site.storm.peakWindMph) f.push(['Strongest onshore blow', site.storm.peakWindMph + ' mph from the ' + site.storm.peakFrom + ', ' + when(site.storm.peakAt, tz)]);
    if (site.buoy) f.push(['Open-lake waves', site.buoy.wvhtFt + ' ft at buoy ' + site.buoy.id + ' (' + site.buoy.km + ' km)']);
    if (site.nextWindow) f.push(['Next after-storm window', when(site.nextWindow.t, tz)]);
    if (site.sunrise) f.push(['Sunrise', clock(site.sunrise, tz)]);
    card.querySelector('[data-facts]').innerHTML = f.map(function (p) { return '<div><dt>' + esc(p[0]) + '</dt><dd>' + esc(p[1]) + '</dd></div>'; }).join('');
    var notes = (site.alerts || []).map(function (a) {
      return '<li class="alert">NWS ' + esc(a.event) + (a.ends ? ' until ' + esc(when(Date.parse(a.ends) / 1000, tz)) : '') + '</li>';
    }).concat((site.notes || []).map(function (n) { return '<li>' + esc(n.text) + '</li>'; }));
    card.querySelector('[data-notes]').innerHTML = notes.join('');
  }

  function visible(card) {
    var stones = card.getAttribute('data-stones').split(' ');
    if (state.stone !== 'all' && stones.indexOf(state.stone) < 0) return false;
    if (state.collect && card.getAttribute('data-rule') === 'nps') return false;
    return true;
  }

  function order() {
    var d = state.data;
    var rank = d ? d.ranked : cards.map(function (c) { return c.id; });
    rank.forEach(function (id) { var c = document.getElementById(id); if (c) list.appendChild(c); });
  }

  function applyFilters() {
    var shown = 0;
    cards.forEach(function (c) { var ok = visible(c); c.hidden = !ok; if (ok) shown++; var m = markers[c.id]; if (m) m.setOpacity(ok ? 1 : 0.25); });
    document.getElementById('emptyFilter').hidden = shown > 0;
    summarize();
  }

  function summarize() {
    var d = state.data;
    if (!d) return;
    var pool = d.ranked.map(function (id) { return d.sites.find(function (s) { return s.id === id; }); })
      .filter(function (s) { var c = document.getElementById(s.id); return c && visible(c); });
    var link = function (s) { return '<a href="#' + s.id + '">' + esc(nameOf(s.id)) + '</a>'; };
    var go = pool.filter(function (s) { return s.verdict.code === 'PRIME' && document.getElementById(s.id).getAttribute('data-rule') !== 'nps'; });
    var good = pool.filter(function (s) { return s.verdict.code === 'GOOD' && document.getElementById(s.id).getAttribute('data-rule') !== 'nps'; });
    var storm = pool.filter(function (s) { return s.verdict.code === 'STORM'; }).concat(pool.filter(function (s) { return s.verdict.code === 'BUILDING'; }));
    var tzOf = function (s) { return document.getElementById(s.id).getAttribute('data-tz'); };
    var upcoming = pool.filter(function (s) { return s.nextWindow && document.getElementById(s.id).getAttribute('data-rule') !== 'nps'; })
      .sort(function (a, b) { return a.nextWindow.t - b.nextWindow.t; })[0];
    var windowLine = upcoming ? ' The next after-storm window opens around ' + esc(when(upcoming.nextWindow.t, tzOf(upcoming))) + ' at ' + link(upcoming) + '.' : '';
    var html, code;
    if (!pool.length) { html = 'No beach matches that filter.'; code = 'UNAVAILABLE'; }
    else if (go.length) {
      code = 'PRIME';
      html = 'Go to ' + link(go[0]) + '. A recent blow just turned it over and the waves have settled.' +
        (go.length > 1 ? ' Also freshly worked: ' + go.slice(1, 4).map(link).join(', ') + '.' : '');
    } else if (storm.length && !good.length) {
      code = 'STORM';
      html = 'Storm on: ' + storm.slice(0, 3).map(link).join(', ') + (storm.length > 3 ? ' and more are' : storm.length > 1 ? ' are' : ' is') + ' getting hit right now. Wait for it to pass.' + windowLine;
    } else if (good.length) {
      code = 'GOOD';
      html = 'No fresh storm beaches today. ' + link(good[0]) + ' had the most recent stir' + (good.length > 1 ? ', then ' + good.slice(1, 3).map(link).join(', ') : '') + '.' +
        (storm.length ? ' Stay off ' + storm.slice(0, 2).map(link).join(' and ') + (storm.length > 2 ? ' and the other storm beaches' : '') + ' until it calms.' + windowLine : '');
    } else {
      code = 'QUIET';
      html = 'Quiet lakes: no beach on this list has had real wave action in three days, so expect picked-over gravel.' +
        (upcoming ? ' The next blow should turn over ' + link(upcoming) + ' by ' + esc(when(upcoming.nextWindow.t, tzOf(upcoming))) + '.' : ' Hunt early and work the wet edge.');
    }
    answer.innerHTML = html;
    answer.setAttribute('data-code', code);
  }

  function initMap() {
    if (!window.L || map) return;
    map = L.map('map', {scrollWheelZoom: false}).setView([45.9, -86.3], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 13, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);
    cards.forEach(function (c) {
      var lat = +c.getAttribute('data-lat'), lon = +c.getAttribute('data-lon');
      var icon = L.divIcon({className: '', html: '<div class="pin ' + (c.getAttribute('data-rule') === 'nps' ? 'nps' : '') + '"></div>', iconSize: [18, 18], iconAnchor: [9, 9]});
      var m = L.marker([lat, lon], {icon: icon, title: nameOf(c.id), keyboard: true}).addTo(map);
      m.bindPopup('<strong>' + esc(nameOf(c.id)) + '</strong><br><span data-pop="' + c.id + '">Checking conditions</span><br><a href="#' + c.id + '">Details</a>');
      markers[c.id] = m;
    });
    map.fitBounds(L.latLngBounds(cards.map(function (c) { return [+c.getAttribute('data-lat'), +c.getAttribute('data-lon')]; })), {padding: [18, 18]});
  }
  function paintMap() {
    if (!map || !state.data) return;
    state.data.sites.forEach(function (s) {
      var m = markers[s.id]; if (!m) return;
      var c = document.getElementById(s.id);
      var el = m.getElement && m.getElement();
      if (el) { var pin = el.querySelector('.pin'); if (pin) pin.className = 'pin ' + s.verdict.code + (c.getAttribute('data-rule') === 'nps' ? ' nps' : ''); }
      m.setPopupContent('<strong>' + esc(nameOf(s.id)) + '</strong><br>' + esc(s.verdict.label) + '<br><a href="#' + s.id + '">Details</a>');
    });
  }

  function load() {
    fetch(API, {headers: {Accept: 'application/json'}}).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      state.data = d;
      d.sites.forEach(function (s) { var c = document.getElementById(s.id); if (c) render(s, c, d); });
      order();
      paintMap();
      applyFilters();
      var gen = new Date(d.generatedAt);
      var down = Object.keys(d.sources).filter(function (k) { return d.sources[k].status !== 'live'; }).map(function (k) { return d.sources[k].label; });
      stamp.textContent = 'Conditions as of ' + gen.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit', timeZone: 'America/Detroit'}) + ' Eastern.' + (down.length ? ' Not available right now: ' + down.join('; ') + '.' : '');
    }).catch(function () {
      answer.textContent = 'Live conditions did not load. The beach list, stone guide and collecting rules below still apply; check NWS marine forecasts before you go, and reload to try again.';
      answer.setAttribute('data-code', 'UNAVAILABLE');
    });
  }

  document.querySelectorAll('.chips button').forEach(function (b) {
    b.addEventListener('click', function () {
      state.stone = b.getAttribute('data-stone');
      document.querySelectorAll('.chips button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      applyFilters();
    });
  });
  document.getElementById('canCollect').addEventListener('change', function (e) { state.collect = e.target.checked; applyFilters(); });

  var hash = (location.hash || '').replace('#', '');
  var stoneFromUrl = new URLSearchParams(location.search).get('stone');
  if (stoneFromUrl) {
    var btn = document.querySelector('.chips button[data-stone="' + stoneFromUrl.replace(/[^a-z-]/g, '') + '"]');
    if (btn) btn.click();
  }
  initMap();
  load();
  if (hash && document.getElementById(hash)) setTimeout(function () { document.getElementById(hash).scrollIntoView(); }, 50);
})();
