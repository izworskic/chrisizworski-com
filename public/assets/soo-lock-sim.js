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
    tregurtha: {name: 'Paul R. Tregurtha', kind: 'The longest laker: a 1,000-footer', len: 1013.5, beam: 105, hull: '#7a2b22', house: 'stern', type: 'aft-ender', stack: ['#1c1c1c', '#c8402f', '#f1ede3']},
    anderson: {name: 'Arthur M. Anderson', kind: 'Classic 767-foot laker', len: 767, beam: 70, hull: '#55595c', house: 'stern', pilot: true, type: 'classic-unloader', stack: ['#1c1c1c', '#b9bcbf', '#1c1c1c']},
    saltie: {name: 'Seaway-size saltie', kind: 'Ocean ship at the St. Lawrence Seaway limit', len: 740, beam: 78, hull: '#1f3e66', house: 'stern', cranes: true, type: 'saltie', stack: ['#111111', '#f2c230', '#1f3e66']},
    fitzgerald: {name: 'Edmund Fitzgerald', kind: 'Historic laker, lost November 10, 1975', len: 729, beam: 75, hull: '#5a1f1b', house: 'stern', pilot: true, type: 'classic', depth: 39, stack: ['#1c1c1c', '#e2e2e2', '#1c1c1c']},
    mackinaw: {name: 'USCGC Mackinaw', kind: 'Coast Guard icebreaker', len: 240, beam: 58, hull: '#b3261e', house: 'mid', type: 'icebreaker', depth: 30, draft: 16, stack: ['#1c1c1c', '#e2e2e2', '#b3261e']}
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
  var clock = 0, visible = true;
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
    var moving = id === 'enter' ? 0.3 + 0.5 * (1 - ph.p) : id === 'exit' ? 0.3 + 0.6 * ph.p : 0;
    var html = window.LockShipArt.scene({
      W: W, H: H, cx: chX, cw: chW, upY: upY, lowY: lowY, level: level,
      upGate: upGateOpen, lowGate: lowGateOpen,
      flow: id === 'water' && ph.p > 0 && ph.p < 1 ? (down ? -1 : 1) : 0,
      ship: ship, shipX: x, shipY: shipY, shipL: shipL, k: 1, t: clock / 1000, moving: moving,
      moored: id === 'close' || id === 'water' || id === 'open', flip: !down, platform: true
    }) +
      '<text x="12" y="' + (H - 34) + '" class="lsf">Lake Superior side</text>' +
      '<text x="' + (W - 12) + '" y="' + (H - 34) + '" text-anchor="end" class="lsf">Lower St. Marys River</text>' +
      '<path d="M' + (W - 30) + ' ' + upY + ' l0 ' + LIFT_PX + '" stroke="#16324a" stroke-width="1.5" stroke-dasharray="3 3"/>' +
      '<text x="' + (W - 36) + '" y="' + (upY + LIFT_PX / 2 + 4) + '" text-anchor="end" class="lsl">21 ft</text>' +
      '<text x="' + (chX + chW / 2) + '" y="' + (H - 6) + '" text-anchor="middle" class="lsf">' + lock.name + ', ' + lock.len.toLocaleString() + ' ft</text>';
    svg.innerHTML = html;
    // Phones scroll the scene sideways; keep the ship centred.
    var box = svg.parentNode;
    if (box.scrollWidth > box.clientWidth + 4) {
      var px = Math.max(0, Math.min(W, x + shipL / 2)) / W * box.scrollWidth;
      if (px < box.scrollLeft + 40 || px > box.scrollLeft + box.clientWidth - 40) box.scrollLeft = Math.max(0, px - box.clientWidth / 2);
    }
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
    clock = now;
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
  // Ambient motion (smoke, ripples, a gentle bob) while the scene is on screen.
  if (!reduce) {
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(root);
    var lastAmb = 0;
    (function ambient(now) {
      if (visible && !state.playing && now - lastAmb > 50) { clock = now; render(); lastAmb = now; }
      requestAnimationFrame(ambient);
    })(0);
  }
  root._lockFor = function (len, beam) { return lockFor({len: len, beam: beam}); };
})();
