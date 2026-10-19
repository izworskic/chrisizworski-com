/* Ride a ship over the Niagara Escarpment: a time-lapse of a full Welland Canal
   transit. Figures: 43.5 km canal, 99.5 m between Lake Ontario and Lake Erie,
   Locks 1 to 7 each lift about 14 m (the Seaway gives 13 to 15 m), Lock 8 at Port
   Colborne makes only a small regulating adjustment. Chambers are 233.5 x 24.4 m
   (766 x 80 ft); the largest ship allowed is 225.5 x 23.8 m (740 x 78 ft).
   A full transit averages about 11 hours. Lock positions come from this page's map. */
(function () {
  'use strict';
  var root = document.getElementById('welland-lock-sim');
  if (!root) return;
  var ONTARIO = 74.2, TOTAL_RISE = 99.5, LOCK8 = 0.5;
  var LIFT = (TOTAL_RISE - LOCK8) / 7;
  var N = 43.245, KM_SCALE = 43.5 / ((43.245 - 42.875) * 111);
  var LOCKS = [
    {id: '1', lat: 43.217484, place: 'Port Weller, St. Catharines'},
    {id: '2', lat: 43.193131, place: 'St. Catharines'},
    {id: '3', lat: 43.155230, place: 'St. Catharines, Welland Canals Centre'},
    {id: '4', lat: 43.1426, place: 'Thorold flight locks'},
    {id: '5', lat: 43.1379, place: 'Thorold flight locks'},
    {id: '6', lat: 43.134283, place: 'Thorold flight locks'},
    {id: '7', lat: 43.123446, place: 'Thorold, Lock 7 Viewing Centre'},
    {id: '8', lat: 42.899122, place: 'Port Colborne'}
  ].map(function (l, i) {
    l.km = Math.round((N - l.lat) * 111 * KM_SCALE * 10) / 10;
    l.lift = l.id === '8' ? LOCK8 : LIFT;
    l.below = ONTARIO + LIFT * Math.min(i, 7);
    l.above = l.below + l.lift;
    return l;
  });
  var SHIPS = {
    max: {name: 'Seaway-max laker', len: 740, beam: 78, fits: true, type: 'aft-ender', hull: '#7a2b22', stack: ['#1c1c1c', '#c8402f', '#f1ede3']},
    saltie: {name: 'Ocean saltie', len: 656, beam: 78, fits: true, type: 'saltie', hull: '#1f3e66', stack: ['#111111', '#f2c230', '#1f3e66']},
    small: {name: 'Small cargo ship', len: 450, beam: 60, fits: true, type: 'classic', hull: '#3d5a3a', stack: ['#1c1c1c', '#e2e2e2', '#3d5a3a']},
    thousand: {name: '1,000-footer (Paul R. Tregurtha)', len: 1013.5, beam: 105, fits: false, type: 'aft-ender', hull: '#7a2b22'}
  };
  var CHAMBER = {len: 766, beam: 80};
  var SPEED_KMH = 11; // a laden ship in the canal reaches, roughly 6 knots
  var LOCK_STEPS = [['enter', 9], ['close', 3], ['water', 12], ['open', 3], ['leave', 6]];
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Build the trip as a list of timed events in simulated minutes.
  function plan(dir) {
    var order = dir === 'up' ? LOCKS.slice() : LOCKS.slice().reverse();
    var ev = [], km = dir === 'up' ? 0 : 43.5, t = 0;
    order.forEach(function (l) {
      var sail = Math.abs(l.km - km) / SPEED_KMH * 60;
      ev.push({kind: 'sail', from: km, to: l.km, t0: t, dur: sail, level: dir === 'up' ? l.below : l.above}); t += sail;
      LOCK_STEPS.forEach(function (s) {
        var dur = s[0] === 'water' && l.id === '8' ? 4 : s[1];
        ev.push({kind: s[0], lock: l, t0: t, dur: dur}); t += dur;
      });
      km = l.km;
    });
    var end = dir === 'up' ? 43.5 : 0;
    var last = order[order.length - 1];
    var sailOut = Math.abs(end - km) / SPEED_KMH * 60;
    ev.push({kind: 'sail', from: km, to: end, t0: t, dur: sailOut, level: dir === 'up' ? last.above : last.below}); t += sailOut;
    // The Seaway's 11-hour average includes waiting for traffic and bridges; spread
    // that waiting across the reaches so the clock is honest about the whole trip.
    var wait = Math.max(0, 660 - t), sails = ev.filter(function (e) { return e.kind === 'sail'; });
    var per = wait / sails.length, shift = 0;
    ev.forEach(function (e) { e.t0 += shift; if (e.kind === 'sail') { e.dur += per; shift += per; } });
    return {events: ev, total: t + wait};
  }

  var state = {dir: 'up', ship: 'max', t: 0, playing: false, last: null, rate: 9};
  var trip = plan('up');
  var svg = root.querySelector('[data-wl-svg]');
  var close = root.querySelector('[data-wl-close]');
  var clock = 0, visible = true;
  var fit = root.querySelector('[data-wl-fit]');
  var out = {
    say: root.querySelector('[data-wl-say]'), lock: root.querySelector('[data-wl-lock]'),
    height: root.querySelector('[data-wl-height]'), clock: root.querySelector('[data-wl-clock]'),
    play: root.querySelector('[data-wl-play]'), fitText: root.querySelector('[data-wl-fittext]'),
    live: root.querySelector('[data-wl-live]')
  };

  // Broken x axis: the lock staircase gets most of the width, the long summit level is compressed.
  var W = 1000, H = 340, X_BREAK = 15, X_BREAK_PX = 690;
  function xOf(km) { return km <= X_BREAK ? 40 + km / X_BREAK * (X_BREAK_PX - 40) : X_BREAK_PX + (km - X_BREAK) / (43.5 - X_BREAK) * (W - 40 - X_BREAK_PX); }
  var Y_BOT = 290, Y_TOP = 110;
  function yOf(m) { return Y_BOT - (m - ONTARIO) / TOTAL_RISE * (Y_BOT - Y_TOP); }

  function stateAt(t) {
    var ev = trip.events, e = ev[ev.length - 1];
    for (var i = 0; i < ev.length; i++) if (t < ev[i].t0 + ev[i].dur) { e = ev[i]; break; }
    var p = e.dur ? Math.max(0, Math.min(1, (t - e.t0) / e.dur)) : 1;
    var s = {e: e, p: p, km: 0, level: ONTARIO, chamber: null, gate: null};
    if (e.kind === 'sail') { s.km = e.from + (e.to - e.from) * p; s.level = e.level; }
    else {
      var l = e.lock, up = state.dir === 'up';
      var start = up ? l.below : l.above, end = up ? l.above : l.below;
      s.km = l.km;
      s.level = e.kind === 'enter' || e.kind === 'close' ? start : e.kind === 'water' ? start + (end - start) * p : end;
      s.chamber = {lock: l, level: s.level};
      s.gate = e.kind;
    }
    return s;
  }

  function staircase() {
    var d = 'M0 ' + Y_BOT, lvl = ONTARIO, path = '';
    // Water surfaces for each reach between locks.
    var reaches = [];
    var prevKm = 0;
    LOCKS.forEach(function (l) { reaches.push({a: prevKm, b: l.km, m: l.below}); prevKm = l.km; });
    reaches.push({a: prevKm, b: 43.5, m: LOCKS[7].above});
    var ground = 'M0 ' + (H) + ' L0 ' + (yOf(ONTARIO) + 8);
    reaches.forEach(function (r) { ground += ' L' + xOf(r.a).toFixed(1) + ' ' + (yOf(r.m) + 8).toFixed(1) + ' L' + xOf(r.b).toFixed(1) + ' ' + (yOf(r.m) + 8).toFixed(1); });
    ground += ' L' + W + ' ' + (yOf(LOCKS[7].above) + 8) + ' L' + W + ' ' + H + ' Z';
    var water = reaches.map(function (r) {
      return '<rect x="' + xOf(r.a).toFixed(1) + '" y="' + yOf(r.m).toFixed(1) + '" width="' + Math.max(1, xOf(r.b) - xOf(r.a)).toFixed(1) + '" height="8" fill="#5fb0c9"/>';
    }).join('');
    return {ground: ground, water: water};
  }
  var base = staircase();

  function render() {
    var s = stateAt(state.t), ship = SHIPS[state.ship];
    var html = '<rect width="' + W + '" height="' + H + '" fill="#0d2738"/>' +
      '<path d="' + base.ground + '" fill="#4a3f33"/>' + base.water +
      '<rect x="0" y="' + yOf(ONTARIO).toFixed(1) + '" width="40" height="8" fill="#5fb0c9"/>' +
      // break mark and labels
      '<path d="M' + (X_BREAK_PX + 6) + ' ' + (Y_TOP - 18) + ' l8 -8 m-2 16 l8 -8" stroke="#9fc3cf" stroke-width="1.5"/>' +
      '<text x="' + ((X_BREAK_PX + W - 40) / 2) + '" y="' + (yOf(LOCKS[7].below) + 40) + '" text-anchor="middle" class="wl-t">summit level: about 25 km, no locks</text>' +
      '<text x="6" y="' + (yOf(ONTARIO) + 30) + '" class="wl-t">Lake Ontario</text>' +
      '<text x="' + (W - 6) + '" y="' + (yOf(LOCKS[7].above) + 70) + '" text-anchor="end" class="wl-t">Lake Erie</text>' +
      '<text x="' + ((xOf(LOCKS[3].km) + xOf(LOCKS[5].km)) / 2) + '" y="' + (yOf(LOCKS[6].above) - 34) + '" text-anchor="middle" class="wl-t wl-gold">Thorold flight</text>';
    // Lock chambers.
    LOCKS.forEach(function (l) {
      var x = xOf(l.km), active = s.chamber && s.chamber.lock === l;
      var lvl = active ? s.chamber.level : (state.dir === 'up' ? (l.km <= s.km ? l.above : l.below) : (l.km >= s.km ? l.below : l.above));
      if (!active) lvl = l.below; // idle chambers rest at their lower level
      html += '<rect x="' + (x - 7) + '" y="' + yOf(l.above).toFixed(1) + '" width="14" height="' + (yOf(l.below) - yOf(l.above) + 8).toFixed(1) + '" fill="#1b3b4f" stroke="' + (active ? '#e6ad53' : '#7fa5b3') + '" stroke-width="' + (active ? 2.5 : 1) + '"/>' +
        '<rect x="' + (x - 6) + '" y="' + yOf(lvl).toFixed(1) + '" width="12" height="' + (yOf(l.below) - yOf(lvl) + 7).toFixed(1) + '" fill="#5fb0c9"/>' +
        '<g class="wl-lockbtn" data-lock="' + l.id + '" role="button" tabindex="0" aria-label="Jump to Lock ' + l.id + '">' +
        '<circle cx="' + x + '" cy="' + (yOf(l.above) - 18).toFixed(1) + '" r="13" fill="' + (active ? '#e6ad53' : '#092b3e') + '" stroke="#e6ad53"/>' +
        '<text x="' + x + '" y="' + (yOf(l.above) - 13.5).toFixed(1) + '" text-anchor="middle" class="wl-n' + (active ? ' on' : '') + '">' + l.id + '</text></g>';
    });
    // The ship: a hull on the water at her current level.
    var sx = xOf(s.km), sy = yOf(s.level);
    var flip = state.dir === 'down' ? ' scale(-1 1)' : '';
    html += '<g transform="translate(' + sx.toFixed(1) + ' ' + sy.toFixed(1) + ') scale(1.6)' + flip + '">' +
      '<path d="M-22 -2 L16 -2 L22 -8 L22 -1 L18 4 L-20 4 Z" fill="#c8402f"/><rect x="-21" y="-12" width="9" height="10" fill="#f2efe6"/><rect x="-19" y="-16" width="3" height="4" fill="#111"/></g>';
    svg.innerHTML = html;
    renderClose(s, ship);
    // On narrow screens the profile scrolls sideways; keep the ship in view.
    var stage = svg.parentNode;
    if (stage.scrollWidth > stage.clientWidth + 4) {
      var px = sx / W * stage.scrollWidth;
      if (px < stage.scrollLeft + 40 || px > stage.scrollLeft + stage.clientWidth - 60) stage.scrollLeft = Math.max(0, px - stage.clientWidth / 2);
    }

    // Readouts.
    var e = s.e, l = e.lock;
    var up = state.dir === 'up';
    var rise = s.level - ONTARIO;
    out.height.textContent = Math.round(rise) + ' m (' + Math.round(rise * 3.281) + ' ft) above Lake Ontario';
    var h = Math.floor(state.t / 60), m = Math.floor(state.t % 60);
    out.clock.textContent = h + ' h ' + String(m).padStart(2, '0') + ' min of about 11 h';
    var next = trip.events.filter(function (x) { return x.lock && x.t0 >= state.t; })[0];
    out.lock.textContent = l ? 'Lock ' + l.id + ', ' + l.place : next ? 'Heading for Lock ' + next.lock.id : (up ? 'Into Lake Erie' : 'Into Lake Ontario');
    var lines = {
      sail: state.t >= trip.total ? (up ? 'She is out on Lake Erie, 99.5 m above where she started. Most of that climb happened in the first 14 km.' : 'She is out on Lake Ontario, 99.5 m below where she started.') :
        (next && next.lock.id === '8' && up ? 'The long, flat summit level: about 25 km with no locks, through Welland to Port Colborne.' :
         next && ['5', '6'].indexOf(next.lock.id) >= 0 ? 'Straight into the next chamber: in the Thorold flight, one lock opens directly into the next.' :
         'Steaming slowly up the reach. Bridges lift ahead of her as she comes.'),
      enter: 'Lines out: she inches into Lock ' + (l && l.id) + ((CHAMBER.beam - ship.beam) / 2 <= 1.5 ? ' with about a foot of clearance on each side.' : '.'),
      close: 'The gates swing shut behind her.',
      water: l && l.id === '8' ? 'Lock 8 is the regulating lock: only a small adjustment for Lake Erie\'s level.' :
        (up ? 'Water flows in by gravity from the reach above. She rises about 14 m, the height of a four-storey building.' : 'Water drains by gravity to the reach below. She drops about 14 m.'),
      open: 'Levels match. The ' + (up ? 'upper' : 'lower') + ' gates open.',
      leave: 'Engines ahead: she sails out of Lock ' + (l && l.id) + '.'
    };
    out.say.textContent = lines[e.kind];
    out.play.textContent = state.playing ? 'Pause' : state.t >= trip.total ? 'Ride it again' : state.t > 0 ? 'Resume' : (up ? 'Start the climb' : 'Start the descent');
    out.play.setAttribute('aria-pressed', String(state.playing));
    out.play.disabled = !ship.fits;
    var watchId = l ? l.id : next ? next.lock.id : null;
    out.live.hidden = !watchId;
    if (watchId) { out.live.textContent = 'See ships near Lock ' + watchId + ' on the live map'; out.live.setAttribute('data-lock', watchId); }
  }


  // Close-up camera on the lock the ship is in or heading for: the ship eases in,
  // the gates swing shut, water boils in (or drains out) and she rises or falls with it.
  var CW = 1000, CH = 280, CCX = 200, CCW = 600, CK = 1.25, C_UP = 100;
  function renderClose(s, ship) {
    if (!close || !window.LockShipArt) return;
    var e = s.e, up = state.dir === 'up';
    var lock = e.lock || (trip.events.filter(function (x) { return x.lock && x.t0 >= state.t; })[0] || {}).lock;
    if (!lock) { lock = up ? LOCKS[7] : LOCKS[0]; }
    var liftPx = Math.max(2, lock.lift * 3.281 * CK);
    var upY = C_UP, lowY = C_UP + liftPx;
    var scale = CCW / CHAMBER.len, L = ship.len * scale;
    var inX = CCX + (CCW - L) / 2;
    // Upbound ships rise, so they enter from the low side (right) and leave to the high side (left).
    var outsideIn = up ? CCX + CCW + 16 : CCX - 16 - L, offIn = up ? CW + 30 : -L - 30, offOut = up ? -L - 30 : CW + 30;
    var p = s.p, k = e.kind, x, y, mv = 0, level, upGate = 0, lowGate = 0;
    var start = up ? lowY : upY, end = up ? upY : lowY;
    var entryGate = function (v) { if (up) lowGate = v; else upGate = v; };
    var exitGate = function (v) { if (up) upGate = v; else lowGate = v; };
    if (k === 'sail') {
      var gone = e.lock == null && e.t0 > 0 && trip.events.indexOf(e) === trip.events.length - 1;
      level = start; entryGate(1);
      var q = Math.max(0, (p - 0.55) / 0.45);
      x = gone ? offOut : offIn + (outsideIn - offIn) * q; y = start; mv = q > 0 ? 0.8 : 0;
      if (gone) { level = start; }
    } else {
      level = k === 'enter' || k === 'close' ? start : k === 'water' ? start + (end - start) * ease(p) : end;
      if (k === 'enter') { entryGate(1); x = outsideIn + (inX - outsideIn) * ease(p); mv = 0.6 * (1 - p) + 0.1; }
      else if (k === 'close') { entryGate(1 - p); x = inX; }
      else if (k === 'water') { x = inX; }
      else if (k === 'open') { exitGate(p); x = inX; }
      else { exitGate(1); x = inX + (offOut - inX) * ease(p); mv = 0.2 + 0.7 * p; }
      y = level;
    }
    var html = window.LockShipArt.scene({
      W: CW, H: CH, cx: CCX, cw: CCW, upY: upY, lowY: lowY, level: level, upGate: upGate, lowGate: lowGate,
      flow: k === 'water' && p > 0 && p < 1 ? (up ? 1 : -1) : 0,
      ship: ship.fits ? ship : null, shipX: x, shipY: y, shipL: L, k: CK, t: clock / 1000, moving: mv,
      moored: k === 'close' || k === 'water' || k === 'open', flip: up
    });
    html += '<rect x="10" y="10" width="190" height="26" rx="13" fill="rgba(7,28,44,.78)"/><text x="105" y="28" text-anchor="middle" class="wl-cl">Lock ' + lock.id + ' close-up</text>' +
      '<text x="14" y="' + (CH - 30) + '" class="wl-cw">toward Lake Erie</text>' +
      '<text x="' + (CW - 14) + '" y="' + (CH - 30) + '" text-anchor="end" class="wl-cw">toward Lake Ontario</text>' +
      '<path d="M' + (CCX + 24) + ' ' + upY + ' l0 ' + liftPx + '" stroke="#fee0a2" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<text x="' + (CCX + 30) + '" y="' + (upY + liftPx / 2 + 4) + '" class="wl-cl">' + (lock.id === '8' ? 'small lift' : 'about 14 m') + '</text>';
    close.innerHTML = html;
    follow(close, x + L / 2, CW);
  }
  function follow(svgEl, cx, width) {
    var box = svgEl.parentNode;
    if (box.scrollWidth <= box.clientWidth + 4) return;
    var px = Math.max(0, Math.min(width, cx)) / width * box.scrollWidth;
    if (px < box.scrollLeft + 40 || px > box.scrollLeft + box.clientWidth - 40) box.scrollLeft = Math.max(0, px - box.clientWidth / 2);
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }
  function renderFit() {
    var ship = SHIPS[state.ship];
    var w = 1000, h = 150, s = 1.2;
    var cw = CHAMBER.len * s, ch = CHAMBER.beam * 1.2, cx = (w - cw) / 2, cy = 14;
    var hl = Math.min(ship.len * s, w - 20), hb = ship.beam * 1.2;
    var hx = ship.fits ? cx + (cw - hl) / 2 : (w - hl) / 2, hy = cy + (ch - hb) / 2;
    fit.innerHTML = '<rect width="' + w + '" height="' + h + '" fill="#0d2738"/>' +
      '<rect x="' + cx + '" y="' + cy + '" width="' + cw + '" height="' + ch + '" fill="#1b3b4f" stroke="#7fa5b3" stroke-width="2"/>' +
      '<path d="M' + hx + ' ' + hy + ' h' + (hl - hb / 2) + ' q' + hb / 2 + ' 0 ' + hb / 2 + ' ' + hb / 2 + ' q0 ' + hb / 2 + ' ' + (-hb / 2) + ' ' + hb / 2 + ' h' + (-(hl - hb / 2)) + 'z" fill="' + (ship.fits ? '#c8402f' : 'rgba(200,64,47,.55)') + '" stroke="' + (ship.fits ? 'none' : '#ff9b8a') + '" stroke-dasharray="6 4"/>' +
      '<text x="' + (w / 2) + '" y="' + (h - 8) + '" text-anchor="middle" class="wl-t">Welland lock chamber, ' + CHAMBER.len + ' x ' + CHAMBER.beam + ' ft</text>';
    if (ship.fits) {
      var side = (CHAMBER.beam - ship.beam) / 2;
      out.fitText.innerHTML = '<strong>' + ship.name + '</strong>, ' + ship.len + ' x ' + ship.beam + ' ft: ' +
        (side <= 1.5 ? '<strong>' + side.toFixed(0) + ' foot of room on each side</strong> and ' : side.toFixed(0) + ' ft of room on each side and ') + Math.round(CHAMBER.len - ship.len) + ' ft of length to spare.';
    } else {
      out.fitText.innerHTML = '<strong>' + ship.name + '</strong>, ' + ship.len.toLocaleString() + ' x ' + ship.beam + ' ft, does not fit: the Seaway limit is 740 x 78 ft. That is why the biggest lakers never leave the upper lakes.';
    }
  }

  function tick(now) {
    clock = now;
    if (!state.playing) return;
    if (state.last != null) state.t = Math.min(trip.total, state.t + (now - state.last) / 1000 * state.rate);
    state.last = now; render();
    if (state.t >= trip.total) { state.playing = false; state.last = null; render(); return; }
    requestAnimationFrame(tick);
  }
  function play() {
    if (!SHIPS[state.ship].fits) return;
    if (state.t >= trip.total) state.t = 0;
    if (reduce) { // jump to the next lock instead of animating
      var next = trip.events.filter(function (e) { return e.kind === 'water' && e.t0 > state.t + 0.01; })[0];
      state.t = next ? next.t0 + next.dur : trip.total; render(); return;
    }
    state.playing = !state.playing; state.last = null;
    if (state.playing) requestAnimationFrame(tick); else render();
  }
  function jumpTo(id) {
    var e = trip.events.filter(function (x) { return x.kind === 'water' && x.lock.id === id; })[0];
    if (e) { state.t = e.t0 + e.dur * 0.5; state.playing = false; state.last = null; render(); }
  }
  function reset() { trip = plan(state.dir); state.t = 0; state.playing = false; state.last = null; renderFit(); render(); }

  out.play.addEventListener('click', play);
  root.querySelectorAll('[name="wl-dir"]').forEach(function (r) { r.addEventListener('change', function () { state.dir = r.value; reset(); }); });
  root.querySelector('[name="wl-ship"]').addEventListener('change', function (e) { state.ship = e.target.value; reset(); });
  root.querySelector('[name="wl-rate"]').addEventListener('change', function (e) { state.rate = +e.target.value; });
  root.querySelector('[data-wl-flight]').addEventListener('click', function () { jumpTo(state.dir === 'up' ? '4' : '6'); });
  svg.addEventListener('click', function (e) { var g = e.target.closest('[data-lock]'); if (g) jumpTo(g.getAttribute('data-lock')); });
  svg.addEventListener('keydown', function (e) { var g = e.target.closest('[data-lock]'); if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); jumpTo(g.getAttribute('data-lock')); } });
  out.live.addEventListener('click', function () {
    var sel = document.getElementById('lockSelect'), id = out.live.getAttribute('data-lock');
    if (sel && id) { sel.value = id; sel.dispatchEvent(new Event('change', {bubbles: true})); }
    var map = document.getElementById('ship-watch'); if (map) map.scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
  });
  reset();
  if (!reduce) {
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    var lastAmb = 0;
    (function ambient(now) {
      if (visible && !state.playing && now - lastAmb > 60) { clock = now; render(); lastAmb = now; }
      requestAnimationFrame(ambient);
    })(0);
  }
  root._plan = plan; root._locks = LOCKS;
})();
