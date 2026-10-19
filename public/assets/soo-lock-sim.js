/* Lock a ship through the Soo: an interactive, to-scale lockage.
   Chamber sizes are the U.S. Army Corps of Engineers figures shown on this page
   (Poe 1,200 x 110 ft, MacArthur 800 x 80 ft, both with the 21-foot lift between
   Lake Superior and the lower St. Marys River). Water moves by gravity through
   valves in the lock walls: there are no pumps. */
(function () {
  'use strict';
  var root = document.getElementById('soo-lock-sim');
  if (!root) return;
  var LOCKS = {
    poe: {name: 'Poe Lock', len: 1200, beam: 110},
    macarthur: {name: 'MacArthur Lock', len: 800, beam: 80}
  };
  var MAC_MAX = {len: 730, beam: 76}; // largest vessel the Corps routes through the MacArthur
  var LIFT = 21;
  var SHIPS = {
    tregurtha: {name: 'Paul R. Tregurtha', kind: 'The longest laker: a 1,000-footer', len: 1013.5, beam: 105, hull: '#7a2b22', house: 'stern'},
    anderson: {name: 'Arthur M. Anderson', kind: 'Classic 767-foot laker', len: 767, beam: 70, hull: '#3d4a2c', house: 'stern', pilot: true},
    saltie: {name: 'Seaway-size saltie', kind: 'Ocean ship at the St. Lawrence Seaway limit', len: 740, beam: 78, hull: '#1f3e66', house: 'stern', cranes: true},
    fitzgerald: {name: 'Edmund Fitzgerald', kind: 'Historic laker, lost November 10, 1975', len: 729, beam: 75, hull: '#5a1f1b', house: 'stern', pilot: true},
    mackinaw: {name: 'USCGC Mackinaw', kind: 'Coast Guard icebreaker', len: 240, beam: 58, hull: '#b3261e', house: 'mid'}
  };
  var PHASES = [
    {id: 'enter', label: 'Ease in', secs: 7},
    {id: 'close', label: 'Gates close', secs: 3},
    {id: 'water', label: 'Water moves', secs: 9},
    {id: 'open', label: 'Gates open', secs: 3},
    {id: 'exit', label: 'Sail out', secs: 7}
  ];
  var TOTAL = PHASES.reduce(function (a, p) { return a + p.secs; }, 0);
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var state = {ship: 'tregurtha', dir: 'down', t: 0, playing: false, speed: 1, last: null};
  var svg = root.querySelector('[data-lock-svg]');
  var plan = root.querySelector('[data-lock-plan]');
  var say = root.querySelector('[data-lock-say]');
  var facts = root.querySelector('[data-lock-facts]');
  var steps = root.querySelectorAll('[data-lock-step]');
  var playBtn = root.querySelector('[data-lock-play]');

  function lockFor(ship) { return ship.len <= MAC_MAX.len && ship.beam <= MAC_MAX.beam ? 'macarthur' : 'poe'; }
  function gallons(lock) { return Math.round(lock.len * lock.beam * LIFT * 7.48052 / 100000) / 10; }
  function phaseAt(t) {
    var acc = 0;
    for (var i = 0; i < PHASES.length; i++) { if (t < acc + PHASES[i].secs) return {i: i, p: (t - acc) / PHASES[i].secs}; acc += PHASES[i].secs; }
    return {i: PHASES.length - 1, p: 1};
  }
  function ease(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

  // Side view coordinates. Upstream (Lake Superior) is on the left.
  var W = 1000, H = 300, CH_X = 200, CH_W = 600, TOPY = 120, LIFT_PX = 70;
  function shipShape(ship, scale) {
    var L = ship.len * scale, hh = 26, x0 = 0;
    var hull = '<path d="M' + x0 + ' 0 L' + (L - 14) + ' 0 Q' + L + ' 0 ' + L + ' ' + (hh * 0.6) + ' L' + (L - 10) + ' ' + hh + ' L' + (x0 + 6) + ' ' + hh + ' Z" fill="' + ship.hull + '"/>' +
      '<rect x="' + x0 + '" y="-3" width="' + L + '" height="4" fill="#d9d4c7"/>';
    var house = '';
    if (ship.house === 'stern') {
      house += '<rect x="' + (x0 + 6) + '" y="-34" width="' + Math.min(60, L * 0.08 + 22) + '" height="31" fill="#f1ede3"/>' +
        '<rect x="' + (x0 + 14) + '" y="-46" width="8" height="12" fill="#222"/>';
      if (ship.pilot) house += '<rect x="' + (L - 46) + '" y="-24" width="30" height="21" fill="#f1ede3"/>';
      if (ship.cranes) for (var c = 1; c <= 3; c++) house += '<path d="M' + (L * c / 4.2 + 40) + ' -3 l0 -30 l26 18" stroke="#e0b23a" stroke-width="4" fill="none"/>';
      else for (var h = 0; h < Math.floor(L / 34); h++) { var hx = x0 + 80 + h * 30; if (hx < L - 60) house += '<rect x="' + hx + '" y="-6" width="20" height="4" fill="#8c8c84"/>'; }
    } else {
      house += '<rect x="' + (L * 0.3) + '" y="-30" width="' + (L * 0.4) + '" height="27" fill="#f1ede3"/><rect x="' + (L * 0.45) + '" y="-44" width="10" height="14" fill="#222"/>';
    }
    return '<g>' + hull + house + '</g>';
  }

  function render() {
    var ship = SHIPS[state.ship], lockId = lockFor(ship), lock = LOCKS[lockId];
    var scale = CH_W / 1200; // the Poe is the full drawing width; MacArthur is drawn shorter
    var chW = lock.len * scale, chX = CH_X + (CH_W - chW) / 2;
    var down = state.dir === 'down';
    var ph = phaseAt(state.t), id = PHASES[ph.i].id, p = ease(ph.p);
    var upY = TOPY, lowY = TOPY + LIFT_PX;
    var startLevel = down ? upY : lowY, endLevel = down ? lowY : upY;
    var level = id === 'enter' || id === 'close' ? startLevel : id === 'water' ? startLevel + (endLevel - startLevel) * p : endLevel;
    var shipL = ship.len * scale;
    var inX = chX + (chW - shipL) / 2;
    var fromX = down ? Math.max(20 - shipL * 0.6, chX - 14 - shipL) : Math.min(W - 20 - shipL * 0.4, chX + chW + 14), toX = down ? W + 20 : -shipL - 20;
    var x = id === 'enter' ? fromX + (inX - fromX) * p : id === 'exit' ? inX + (toX - inX) * p : inX;
    var shipY = id === 'enter' ? startLevel : id === 'exit' ? endLevel : level;
    // Gates: the one the ship passes is open at the start (entry gate) and at the end (exit gate).
    var entryOpen = id === 'enter' ? 1 : id === 'close' ? 1 - p : 0;
    var exitOpen = id === 'open' ? p : id === 'exit' ? 1 : 0;
    var upGateOpen = down ? entryOpen : exitOpen, lowGateOpen = down ? exitOpen : entryOpen;
    var flip = down ? '' : ' transform="translate(' + (2 * x + shipL) + ' 0) scale(-1 1)"';
    var drawShip = '<g transform="translate(' + x.toFixed(1) + ' ' + (shipY - 18).toFixed(1) + ')"><g' + (down ? '' : ' transform="translate(' + shipL.toFixed(1) + ' 0) scale(-1 1)"') + '>' + shipShape(ship, scale) + '</g></g>';
    var waterMove = id === 'water' && ph.p > 0 && ph.p < 1;
    var html =
      '<defs><linearGradient id="lsw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f7fa6"/><stop offset="1" stop-color="#1d3f5a"/></linearGradient></defs>' +
      '<rect width="' + W + '" height="' + H + '" fill="#e9eef1"/>' +
      // Upper pool, chamber water, lower pool.
      '<rect x="0" y="' + upY + '" width="' + chX + '" height="' + (H - upY) + '" fill="url(#lsw)"/>' +
      '<rect x="' + chX + '" y="' + level.toFixed(1) + '" width="' + chW + '" height="' + (H - level).toFixed(1) + '" fill="url(#lsw)"/>' +
      '<rect x="' + (chX + chW) + '" y="' + lowY + '" width="' + (W - chX - chW) + '" height="' + (H - lowY) + '" fill="url(#lsw)"/>' +
      // Lock walls and floor.
      '<rect x="0" y="' + (H - 20) + '" width="' + W + '" height="20" fill="#6d6a62"/>' +
      '<rect x="' + (chX - 10) + '" y="' + (upY - 30) + '" width="10" height="' + (H - upY + 30) + '" fill="#8b877c"/>' +
      '<rect x="' + (chX + chW) + '" y="' + (upY - 30) + '" width="10" height="' + (H - upY + 30) + '" fill="#8b877c"/>' +
      // Gates swing up out of the way in this side view.
      '<rect x="' + (chX - 6) + '" y="' + (upY - 30 - upGateOpen * 0) + '" width="6" height="' + ((H - 20 - upY + 30) * (1 - upGateOpen)).toFixed(1) + '" fill="#2b2b2b"/>' +
      '<rect x="' + (chX + chW) + '" y="' + (upY - 30) + '" width="6" height="' + ((H - 20 - upY + 30) * (1 - lowGateOpen)).toFixed(1) + '" fill="#2b2b2b"/>' +
      (waterMove ? valves(chX, chW, down) : '') +
      drawShip +
      '<text x="12" y="' + (H - 34) + '" class="lsf">Lake Superior side</text>' +
      '<text x="' + (W - 12) + '" y="' + (H - 34) + '" text-anchor="end" class="lsf">Lower St. Marys River</text>' +
      '<path d="M' + (W - 30) + ' ' + upY + ' l0 ' + LIFT_PX + '" stroke="#16324a" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<text x="' + (W - 36) + '" y="' + (upY + LIFT_PX / 2 + 4) + '" text-anchor="end" class="lsl">21 ft</text>' +
      '<text x="' + (chX + chW / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="lsf">' + lock.name + ', ' + lock.len.toLocaleString() + ' ft</text>';
    svg.innerHTML = html;
    // Narration.
    var g = gallons(lock);
    var lines = {
      enter: ship.name + ' eases into the ' + lock.name + ' at a crawl, lines out to the wall.',
      close: 'The ' + (down ? 'upper' : 'lower') + ' gates swing shut behind her.',
      water: (down ? 'Valves open and about ' + g + ' million gallons drain out by gravity. She drops 21 feet to the river level.' :
        'Valves open and about ' + g + ' million gallons pour in by gravity, lifting her 21 feet to Lake Superior.') + ' No pumps: just valves and the level difference.',
      open: 'Levels match, so the ' + (down ? 'lower' : 'upper') + ' gates open.',
      exit: down ? 'She heads downbound for Lake Huron and the lower lakes.' : 'She heads upbound for Whitefish Bay and Lake Superior.'
    };
    say.textContent = lines[id];
    for (var i = 0; i < steps.length; i++) {
      steps[i].classList.toggle('on', i === ph.i);
      steps[i].classList.toggle('done', i < ph.i || (state.t >= TOTAL));
    }
    playBtn.textContent = state.playing ? 'Pause' : state.t >= TOTAL ? 'Lock her through again' : state.t > 0 ? 'Resume' : 'Lock her through';
    playBtn.setAttribute('aria-pressed', String(state.playing));
  }

  function valves(chX, chW, down) {
    var out = '';
    for (var i = 0; i < 4; i++) {
      var x = chX + 40 + i * (chW - 80) / 3;
      out += '<circle cx="' + x.toFixed(0) + '" cy="' + (H - 32) + '" r="5" fill="' + (down ? '#bfe3f5' : '#ffffff') + '" opacity=".85"><animate attributeName="r" values="3;7;3" dur="1s" repeatCount="indefinite"/></circle>';
    }
    return out;
  }

  // Plan view: does the hull fit the chamber?
  function renderPlan() {
    var ship = SHIPS[state.ship], lockId = lockFor(ship), lock = LOCKS[lockId], mac = LOCKS.macarthur;
    var pw = 1000, ph = 200, s = 0.75;
    function chamber(l, y, label, active) {
      var w = l.len * s * 0.95, h = l.beam * 0.9, x = (pw - w) / 2;
      return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + (active ? '#cfe3ee' : '#eef2f4') + '" stroke="' + (active ? '#16324a' : '#a8b3ba') + '" stroke-width="2"/>' +
        '<text x="' + (x - 8) + '" y="' + (y + h / 2 + 4) + '" text-anchor="end" class="lsl">' + label + '</text>';
    }
    var lockW = lock.len * s * 0.95, lockH = lock.beam * 0.9, lx = (pw - lockW) / 2;
    var y0 = lockId === 'poe' ? 8 : 120;
    var hullL = ship.len * s * 0.95, hullB = ship.beam * 0.9;
    var hx = lx + (lockW - hullL) / 2, hy = y0 + (lockH - hullB) / 2;
    var fitsMac = ship.len <= MAC_MAX.len && ship.beam <= MAC_MAX.beam;
    plan.innerHTML = '<rect width="' + pw + '" height="' + ph + '" fill="#fff"/>' +
      chamber(LOCKS.poe, 8, 'Poe', lockId === 'poe') + chamber(mac, 120, 'MacArthur', lockId === 'macarthur') +
      '<path d="M' + hx + ' ' + hy + ' h' + (hullL - hullB / 2) + ' q' + (hullB / 2) + ' 0 ' + (hullB / 2) + ' ' + (hullB / 2) + ' q0 ' + (hullB / 2) + ' ' + (-hullB / 2) + ' ' + (hullB / 2) + ' h' + (-(hullL - hullB / 2)) + 'z" fill="' + ship.hull + '" opacity=".9"/>';
    var side = (lock.beam - ship.beam) / 2;
    facts.innerHTML =
      '<div><dt>Ship</dt><dd>' + ship.len.toLocaleString() + ' ft long, ' + ship.beam + ' ft wide</dd></div>' +
      '<div><dt>Lock</dt><dd>' + lock.name + (fitsMac ? '' : ': too big for the MacArthur') + '</dd></div>' +
      '<div><dt>Room to spare</dt><dd>' + (side < 4 ? '<strong>' + side.toFixed(1) + ' ft</strong> each side' : side.toFixed(0) + ' ft each side') + ', ' + Math.round(lock.len - ship.len) + ' ft of length</dd></div>' +
      '<div><dt>Water moved</dt><dd>about ' + gallons(lock) + ' million gallons</dd></div>';
    root.querySelector('[data-lock-kind]').textContent = ship.kind;
  }

  function tick(now) {
    if (!state.playing) return;
    if (state.last != null) state.t = Math.min(TOTAL, state.t + (now - state.last) / 1000 * state.speed);
    state.last = now;
    render();
    if (state.t >= TOTAL) { state.playing = false; state.last = null; render(); return; }
    requestAnimationFrame(tick);
  }
  function play() {
    if (state.t >= TOTAL) state.t = 0;
    if (reduce) { // step through phases instead of animating
      var ph = phaseAt(state.t);
      var acc = 0; for (var i = 0; i <= ph.i; i++) acc += PHASES[i].secs;
      state.t = Math.min(TOTAL, acc + (ph.p >= 1 ? PHASES[Math.min(ph.i + 1, PHASES.length - 1)].secs : 0) - 0.001);
      if (state.t >= TOTAL - 0.01) state.t = TOTAL;
      render(); return;
    }
    state.playing = !state.playing; state.last = null;
    if (state.playing) requestAnimationFrame(tick); else render();
  }
  function reset() { state.t = 0; state.playing = false; state.last = null; renderPlan(); render(); }

  playBtn.addEventListener('click', play);
  root.querySelectorAll('[name="lock-ship"]').forEach(function (r) { r.addEventListener('change', function () { state.ship = r.value; reset(); }); });
  root.querySelectorAll('[name="lock-dir"]').forEach(function (r) { r.addEventListener('change', function () { state.dir = r.value; reset(); }); });
  root.querySelector('[name="lock-speed"]').addEventListener('change', function (e) { state.speed = +e.target.value; });
  steps.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var acc = 0; for (var k = 0; k < i; k++) acc += PHASES[k].secs;
      state.t = acc + PHASES[i].secs * (PHASES[i].id === 'water' ? 0.5 : 0.6); state.playing = false; state.last = null; render();
    });
  });
  reset();
  root._lockFor = function (len, beam) { return lockFor({len: len, beam: beam}); };
})();
