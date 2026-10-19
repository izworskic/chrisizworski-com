/* Aurora sky preview: what a given Kp looks like from a Michigan region.
   Geometry: the aurora oval's equatorward edge moves south as Kp rises (about
   66.5 degrees geomagnetic latitude at Kp 0 to about 49 degrees at Kp 9). Curtains glow
   from roughly 110 km up (lower border) to 300 km (ray tops), so an observer south
   of the edge sees them a set number of degrees above the northern horizon, from
   plain spherical geometry. Brightness falls off with distance from the oval edge.
   It is an illustration of the forecast, not a prediction of any one night. */
(function () {
  'use strict';
  var root = document.getElementById('aurora-sky-sim');
  if (!root) return;
  var R = 6371, LOW = 110, TOP = 300;
  // Geomagnetic latitude from a centred-dipole pole near 80.8 N, 72.6 W (IGRF 2025).
  var REGIONS = {
    'keweenaw': {name: 'Keweenaw Peninsula', lat: 47.47, lon: -87.89, water: true, glow: 0.05},
    'marquette': {name: 'Marquette', lat: 46.55, lon: -87.40, water: true, glow: 0.2},
    'munising': {name: 'Munising', lat: 46.41, lon: -86.65, water: true, glow: 0.1},
    'sault-ste-marie': {name: 'Sault Ste. Marie', lat: 46.50, lon: -84.35, water: true, glow: 0.2},
    'mackinaw-city': {name: 'Mackinaw City / Straits', lat: 45.78, lon: -84.73, water: true, glow: 0.15},
    'traverse-city': {name: 'Traverse City', lat: 44.76, lon: -85.62, water: true, glow: 0.3},
    'bay-city': {name: 'Bay City / Saginaw Bay', lat: 43.59, lon: -83.89, water: true, glow: 0.4},
    'detroit': {name: 'Detroit / southern Michigan', lat: 42.33, lon: -83.05, water: false, glow: 0.7}
  };
  function magLat(lat, lon) {
    var d = Math.PI / 180, pl = 80.8 * d, plo = -72.6 * d;
    return Math.asin(Math.sin(lat * d) * Math.sin(pl) + Math.cos(lat * d) * Math.cos(pl) * Math.cos(lon * d - plo)) / d;
  }
  function ovalEdge(kp) { return 66.5 - 1.9 * kp; }
  function elevation(distKm, h) {
    if (distKm <= 0) return 90;
    var t = distKm / R;
    return Math.atan((Math.cos(t) - R / (R + h)) / Math.sin(t)) * 180 / Math.PI;
  }
  // Returns the sky picture for a region, Kp and conditions.
  function model(regionId, kp, opts) {
    var r = REGIONS[regionId];
    var m = magLat(r.lat, r.lon);
    var dist = Math.max(0, (ovalEdge(kp) - m) * 111);
    var low = elevation(dist, LOW), top = elevation(dist, TOP);
    var strength = Math.max(0, Math.min(1, (kp - 1) / 6));
    var reach = Math.exp(-dist / 250);
    var intensity = strength * reach;
    if (low < 0) intensity *= Math.max(0, 1 + low / 6); // lower border below the horizon
    if (top <= 0) intensity = 0;
    var lightLoss = (opts.dark ? r.glow * 0.25 : r.glow) * 0.6 + (opts.moon ? 0.25 : 0);
    var eye = intensity * (1 - lightLoss) * (1 - opts.clouds / 100);
    var camera = intensity * 3.2 * (1 - opts.clouds / 100) * (1 - 0.35 * (opts.moon ? 1 : 0));
    return {region: r, magLat: m, dist: dist, low: low, top: top, intensity: intensity, eye: eye, camera: camera};
  }

  var canvas = root.querySelector('canvas');
  var ctx = canvas.getContext('2d');
  var els = {
    region: root.querySelector('[name="sim-region"]'), kp: root.querySelector('[name="sim-kp"]'),
    kpOut: root.querySelector('[data-sim-kp]'), clouds: root.querySelector('[name="sim-clouds"]'),
    cloudsOut: root.querySelector('[data-sim-clouds]'), moon: root.querySelector('[name="sim-moon"]'),
    dark: root.querySelector('[name="sim-dark"]'), view: root.querySelectorAll('[name="sim-view"]'),
    verdict: root.querySelector('[data-sim-verdict]'), detail: root.querySelector('[data-sim-detail]'),
    tonight: root.querySelector('[data-sim-tonight]'), scale: root.querySelector('[data-sim-scale]')
  };
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = {region: 'mackinaw-city', kp: 5, clouds: 0, moon: false, dark: true, view: 'eye', liveKp: null};
  var stars = [];
  for (var i = 0; i < 140; i++) stars.push([Math.random(), Math.random() * 0.82, Math.random() * 1.2 + 0.2, Math.random() * 6.28]);

  function fmtKp(k) { return (Math.round(k * 10) / 10).toFixed(1); }
  function fists(deg) { var f = deg / 10; return f < 0.75 ? 'less than a fist' : f < 1.5 ? 'about one fist' : 'about ' + Math.round(f) + ' fists'; }

  function describe(p) {
    var v = state.view === 'eye' ? p.eye : p.camera;
    var where;
    if (p.dist === 0) where = 'The oval sits over you: curtains can cross the whole sky, so look south and straight up too.';
    else if (p.top <= 0) where = 'The oval is ' + Math.round(p.dist) + ' km to the north, below your horizon.';
    else where = 'The oval edge is about ' + Math.round(p.dist) + ' km north. The lower border sits ' + (p.low < 1 ? 'right on' : Math.round(p.low) + ' degrees above') +
      ' the northern horizon (' + (p.low < 1 ? 'on the waterline' : fists(p.low) + ' at arm\'s length') + '), with rays up to about ' + Math.max(1, Math.round(p.top)) + ' degrees.';
    var headline, tone;
    if (state.view === 'eye') {
      if (v >= 0.55) { headline = 'Bright, moving curtains with real color'; tone = 'strong'; }
      else if (v >= 0.25) { headline = 'A pale gray-green arc your eyes can see'; tone = 'fair'; }
      else if (p.camera >= 0.2) { headline = 'Camera only: your eyes may see nothing'; tone = 'faint'; }
      else { headline = 'Not reaching your sky'; tone = 'none'; }
    } else {
      if (v >= 0.8) { headline = 'Vivid greens and reds on a short exposure'; tone = 'strong'; }
      else if (v >= 0.2) { headline = 'A green glow shows on a long exposure'; tone = 'fair'; }
      else { headline = 'Even a camera will struggle'; tone = 'none'; }
    }
    var tips = [];
    if (state.clouds >= 60) tips.push('With ' + state.clouds + '% cloud, the sky is mostly blocked whatever the Kp.');
    if (state.moon && tone !== 'none') tips.push('A bright moon washes out faint aurora; it hurts eyes more than cameras.');
    if (!state.dark && p.region.glow >= 0.3) tips.push('Town light costs you the faint stuff. A 20-minute drive away from lights matters more than Kp half a point.');
    if (state.view === 'camera' && tone !== 'none') tips.push('Phone night mode or a camera on a tripod: about f/2.8, ISO 1600 to 3200, ' + (p.camera > 0.8 ? '3 to 8' : '10 to 20') + ' seconds.');
    return {headline: headline, tone: tone, text: where + (tips.length ? ' ' + tips.join(' ') : '')};
  }

  function draw(t) {
    var w = canvas.clientWidth, h = canvas.clientHeight, dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var p = model(state.region, state.kp, state);
    var horizon = h * 0.8, skyH = horizon, maxEl = 60;
    var yOf = function (el) { return horizon - Math.min(1, Math.max(0, el) / maxEl) * skyH; };
    var g = ctx.createLinearGradient(0, 0, 0, horizon);
    var glow = (state.dark ? p.region.glow * 0.25 : p.region.glow) + (state.moon ? 0.35 : 0);
    g.addColorStop(0, '#04070f'); g.addColorStop(0.7, state.moon ? '#121c33' : '#08101f');
    g.addColorStop(1, 'rgba(' + Math.round(20 + 120 * glow) + ',' + Math.round(24 + 70 * glow) + ',' + Math.round(40 + 40 * glow) + ',1)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, horizon);
    // Stars fade with moon and town glow.
    var starA = Math.max(0.15, 1 - glow * 0.8);
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i], tw = reduce ? 1 : 0.7 + 0.3 * Math.sin(t / 900 + s[3]);
      ctx.fillStyle = 'rgba(255,255,255,' + (starA * tw * (0.4 + s[2] / 2)).toFixed(3) + ')';
      ctx.fillRect(s[0] * w, s[1] * horizon, s[2], s[2]);
    }
    // Aurora curtains.
    var v = state.view === 'eye' ? p.eye : Math.min(1.3, p.camera);
    if (v > 0.02 && p.top > 0) {
      var y0 = yOf(p.low), y1 = yOf(Math.min(p.top, maxEl + 5));
      if (p.dist === 0) { y0 = horizon; y1 = 0; }
      var sat = state.view === 'eye' ? Math.min(1, Math.max(0, (v - 0.2) * 1.6)) : 1;
      var green = [Math.round(120 + (60 - 120) * sat), Math.round(150 + (255 - 150) * sat), Math.round(140 + (150 - 140) * sat)];
      var redOn = state.kp >= 6 && (state.view === 'camera' || v > 0.6);
      var cols = Math.max(40, Math.round(w / 6));
      for (var c = 0; c < cols; c++) {
        var x = c / cols * w;
        var phase = reduce ? 0 : t / 2600;
        var wave = Math.sin(c / cols * 9 + phase) * 0.5 + Math.sin(c / cols * 23 - phase * 1.7) * 0.3 + Math.sin(c / cols * 3 + phase * 0.4) * 0.2;
        var a = Math.max(0, Math.min(1, v * (0.55 + 0.45 * wave)));
        var lift = (y0 - y1) * (0.15 * Math.sin(c / cols * 5 + phase * 0.8));
        var top = y1 + lift, bot = y0 + (p.dist === 0 ? 0 : 0);
        var lg = ctx.createLinearGradient(0, top, 0, bot);
        if (redOn) lg.addColorStop(0, 'rgba(220,70,110,' + (a * 0.45).toFixed(3) + ')');
        else lg.addColorStop(0, 'rgba(' + green.join(',') + ',0)');
        lg.addColorStop(0.55, 'rgba(' + green.join(',') + ',' + (a * 0.55).toFixed(3) + ')');
        lg.addColorStop(0.92, 'rgba(' + green.join(',') + ',' + (a * 0.9).toFixed(3) + ')');
        lg.addColorStop(1, 'rgba(' + green.join(',') + ',0)');
        ctx.fillStyle = lg;
        ctx.fillRect(x, top, w / cols + 1, Math.max(2, bot - top));
      }
    }
    // Clouds.
    if (state.clouds > 0) {
      ctx.fillStyle = 'rgba(40,46,58,' + (state.clouds / 100 * 0.92).toFixed(3) + ')';
      var drift = reduce ? 0 : (t / 120) % (w + 300);
      for (var k = 0; k < 9; k++) {
        var cx = ((k * 173 + drift) % (w + 300)) - 150, cy = horizon * (0.15 + (k % 4) * 0.17);
        ctx.beginPath(); ctx.ellipse(cx, cy, 150 + (k % 3) * 60, 34 + (k % 2) * 18, 0, 0, 6.283); ctx.fill();
      }
      if (state.clouds >= 60) { ctx.fillStyle = 'rgba(30,34,44,' + ((state.clouds - 50) / 50 * 0.85).toFixed(3) + ')'; ctx.fillRect(0, 0, w, horizon); }
    }
    // Elevation ticks.
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '11px system-ui,sans-serif';
    [10, 30, 50].forEach(function (el) { var y = yOf(el); ctx.fillRect(0, y, 8, 1); ctx.fillText(el + '°', 11, y + 4); });
    // Ground: water horizon for lakeshore regions, treeline for inland.
    ctx.fillStyle = p.region.water ? '#05080d' : '#04060a';
    ctx.fillRect(0, horizon, w, h - horizon);
    if (p.region.water && v > 0.05) {
      ctx.fillStyle = 'rgba(80,200,140,' + Math.min(0.25, v * 0.2).toFixed(3) + ')';
      ctx.fillRect(0, horizon + 2, w, Math.min(18, (h - horizon) / 3));
    }
    ctx.fillStyle = '#020305';
    ctx.beginPath(); ctx.moveTo(0, horizon + (p.region.water ? 26 : 0));
    for (var x2 = 0; x2 <= w; x2 += 14) {
      var tree = p.region.water ? (x2 < w * 0.18 || x2 > w * 0.86 ? 22 + (x2 * 7 % 11) : 0) : 10 + (x2 * 13 % 17);
      ctx.lineTo(x2, horizon - tree + (p.region.water && !tree ? 26 : 0));
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.font = '600 12px system-ui,sans-serif';
    ctx.fillText('N', w / 2 - 4, h - 8);
  }

  function update() {
    var p = model(state.region, state.kp, state);
    var d = describe(p);
    els.kpOut.textContent = fmtKp(state.kp);
    els.cloudsOut.textContent = state.clouds + '%';
    els.verdict.textContent = d.headline;
    els.verdict.setAttribute('data-tone', d.tone);
    els.detail.textContent = d.text;
    var marks = root.querySelectorAll('[data-sim-scale] span');
    for (var i = 0; i < marks.length; i++) marks[i].classList.toggle('on', Math.floor(state.kp) === +marks[i].getAttribute('data-k'));
    if (reduce) draw(0);
  }

  function loop(t) { draw(t); if (!reduce) requestAnimationFrame(loop); }

  els.region.addEventListener('change', function () { state.region = els.region.value; update(); });
  els.kp.addEventListener('input', function () { state.kp = +els.kp.value; update(); });
  els.clouds.addEventListener('input', function () { state.clouds = +els.clouds.value; update(); });
  els.moon.addEventListener('change', function () { state.moon = els.moon.checked; update(); });
  els.dark.addEventListener('change', function () { state.dark = els.dark.checked; update(); });
  for (var v = 0; v < els.view.length; v++) els.view[v].addEventListener('change', function (e) { state.view = e.target.value; update(); });
  els.tonight.addEventListener('click', function () { if (state.liveKp != null) { state.kp = state.liveKp; els.kp.value = state.liveKp; update(); } });

  // Follow the page's own region picker and live peak Kp, so the preview starts from tonight.
  var pagePicker = document.getElementById('regionSelect');
  function syncRegion() { if (pagePicker && REGIONS[pagePicker.value]) { state.region = pagePicker.value; els.region.value = pagePicker.value; update(); } }
  if (pagePicker) pagePicker.addEventListener('change', syncRegion);
  var touched = false;
  els.kp.addEventListener('input', function () { touched = true; });
  // The page renders its live peak into #swKpPeak .sw-val once NOAA data arrives.
  function readPeak() {
    var node = document.querySelector('#swKpPeak .sw-val') || document.getElementById('swKpPeak');
    if (!node) return false;
    var m = String(node.textContent).match(/\d+(?:\.\d+)?/);
    var k = m ? parseFloat(m[0]) : NaN;
    if (!(isFinite(k) && k >= 0 && k <= 9)) return false;
    state.liveKp = Math.round(k * 10) / 10;
    els.tonight.hidden = false;
    els.tonight.textContent = 'Use tonight\'s forecast peak (Kp ' + fmtKp(state.liveKp) + ')';
    if (!touched) { state.kp = state.liveKp; els.kp.value = state.liveKp; update(); }
    return true;
  }
  var tries = 0;
  (function poll() { if (readPeak() || ++tries > 40) return; setTimeout(poll, 1500); })();
  syncRegion();
  update();
  if (!reduce) requestAnimationFrame(loop);
  window.addEventListener('resize', function () { if (reduce) draw(0); });
  root._model = model;
})();
