/* Shared drawing kit for the lock simulators (Soo Locks, Welland Canal).
   Draws a side-view lock scene and a detailed Great Lakes ship: shaded hull with
   sheer and a raked stem, boot-top below the waterline seen through the water,
   hatch coamings, rails, deckhouses with windows, a stack with drifting smoke,
   self-unloader booms or deck cranes, nav lights, bow wave and wake, mooring
   lines to the lock wall, swinging miter gates and boiling water while a chamber
   fills. Plain SVG strings, no dependencies. */
(function (global) {
  'use strict';
  var uid = 0;
  function n(v) { return Math.round(v * 10) / 10; }
  function rect(x, y, w, h, fill, extra) { return '<rect x="' + n(x) + '" y="' + n(y) + '" width="' + n(Math.max(0, w)) + '" height="' + n(Math.max(0, h)) + '" fill="' + fill + '"' + (extra || '') + '/>'; }

  // Ship types and their layout, as fractions of length (stern = 0, bow = 1).
  var TYPES = {
    'aft-ender': {house: [0.015, 0.13], decks: 5, fwdHouse: null, boom: true, cranes: 0},
    'classic': {house: [0.015, 0.12], decks: 3, fwdHouse: [0.9, 0.975], boom: false, cranes: 0},
    'classic-unloader': {house: [0.015, 0.12], decks: 3, fwdHouse: [0.9, 0.975], boom: true, cranes: 0},
    'saltie': {house: [0.02, 0.15], decks: 5, fwdHouse: null, boom: false, cranes: 4},
    'icebreaker': {house: [0.3, 0.72], decks: 4, fwdHouse: null, boom: false, cranes: 0}
  };

  /* Ship in local coordinates: stern at x=0, bow at x=L, waterline y=0, up is negative.
     o: {L (px), k (px per foot vertically), t (seconds), moving (0..1 speed), name, lit} */
  function ship(spec, o) {
    var id = 'ls' + (++uid);
    var L = o.L, k = o.k, t = o.t || 0, T = TYPES[spec.type] || TYPES['aft-ender'];
    var depth = spec.depth || Math.max(24, spec.len * 0.056);
    var draft = spec.draft || depth * 0.55;
    var f = (depth - draft) * k, d = draft * k;
    var ice = spec.type === 'icebreaker';
    var sheer = f * 0.35, bowX = L, stemTop = L * 0.995, stemWL = L * (ice ? 0.94 : 0.975), keelBow = L * (ice ? 0.86 : 0.93);
    var sternWL = L * 0.012, keelStern = L * 0.07;
    var deckY = -f;
    var hullPath = 'M0 ' + n(deckY) +
      ' L' + n(L * 0.86) + ' ' + n(deckY) +
      ' Q' + n(L * 0.95) + ' ' + n(deckY - sheer * 0.4) + ' ' + n(stemTop) + ' ' + n(deckY - sheer) +
      ' L' + n(stemWL) + ' 0' +
      ' Q' + n(L * (ice ? 0.9 : 0.955)) + ' ' + n(d * 0.85) + ' ' + n(keelBow) + ' ' + n(d) +
      ' L' + n(keelStern) + ' ' + n(d) +
      ' Q' + n(L * 0.025) + ' ' + n(d * 0.9) + ' ' + n(sternWL) + ' ' + n(d * 0.15) +
      ' L0 ' + n(deckY * 0.2) + ' Z';
    var hullColor = spec.hull || '#7a2b22';
    var s = '<defs>' +
      '<linearGradient id="' + id + 'h" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0" stop-color="' + shade(hullColor, 0.18) + '"/><stop offset=".45" stop-color="' + hullColor + '"/><stop offset="1" stop-color="' + shade(hullColor, -0.35) + '"/></linearGradient>' +
      '<linearGradient id="' + id + 'w" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#cfd5d8"/></linearGradient>' +
      '<clipPath id="' + id + 'c"><path d="' + hullPath + '"/></clipPath></defs>';
    // Hull, then antifouling below the waterline, then plating detail clipped to the hull.
    s += '<path d="' + hullPath + '" fill="url(#' + id + 'h)"/>';
    s += '<g clip-path="url(#' + id + 'c)">' +
      rect(0, 0, L, d + 2, spec.bottom || '#5b1714') +
      rect(0, -2.2, L, 2.2, spec.boot || '#1d1d1d') +
      plating(L, deckY, d) + '</g>';
    // Deck edge highlight and rail.
    s += '<path d="M0 ' + n(deckY) + ' L' + n(L * 0.86) + ' ' + n(deckY) + ' Q' + n(L * 0.95) + ' ' + n(deckY - sheer * 0.4) + ' ' + n(stemTop) + ' ' + n(deckY - sheer) + '" stroke="#f3efe6" stroke-width="1.2" fill="none" opacity=".85"/>';
    s += rail(L * 0.13, L * 0.88, deckY - 1, k);
    // Name on the bow.
    // When the whole ship is mirrored to face left, mirror the name back so it reads correctly.
    if (spec.name && L > 160) s += '<text x="' + n(o.flip ? -L * 0.955 : L * 0.955) + '" y="' + n(deckY + f * 0.45) + '" text-anchor="' + (o.flip ? 'start' : 'end') + '"' + (o.flip ? ' transform="scale(-1 1)"' : '') + ' font-family="Georgia,serif" font-size="' + n(Math.max(6, Math.min(10, f * 0.42))) + '" font-weight="700" fill="#f3efe6" opacity=".9" letter-spacing=".5">' + esc(spec.name.toUpperCase()) + '</text>';
    // Anchor.
    if (L > 120) s += '<path d="M' + n(L * 0.965) + ' ' + n(deckY + f * 0.25) + ' l-3 2 l3 2 l2 -2 z" fill="#2a2a2a"/>';
    // Cargo deck: hatch coamings, or ice-breaker deck.
    if (!ice) {
      var a = T.house[1] + 0.02, b = T.fwdHouse ? T.fwdHouse[0] - 0.02 : 0.9;
      var hatchN = Math.max(4, Math.round((b - a) * spec.len / 26));
      var hw = (b - a) * L / hatchN;
      for (var i = 0; i < hatchN; i++) s += rect(L * a + i * hw + hw * 0.18, deckY - 3 * k, hw * 0.64, 3 * k, '#8d8a82', ' rx="0.6"') + rect(L * a + i * hw + hw * 0.18, deckY - 3 * k, hw * 0.64, 0.9, '#b9b5ab');
    }
    if (T.boom) s += boom(L * T.house[1], deckY - 4 * k, L * 0.62, deckY - 5 * k, k);
    if (T.cranes) for (var c = 0; c < T.cranes; c++) s += crane(L * (0.26 + c * 0.17), deckY, k, c);
    // Deckhouses.
    s += house(L * T.house[0], L * T.house[1], deckY, T.decks, k, id, ice ? 'mid' : 'aft', o.lit);
    if (T.fwdHouse) s += house(L * T.fwdHouse[0], L * T.fwdHouse[1], deckY - sheer * 0.6, 3, k, id, 'fwd', o.lit);
    // Stack with company bands and smoke.
    var stackX = ice ? L * 0.52 : L * (T.house[0] + (T.house[1] - T.house[0]) * 0.35);
    var houseTop = deckY - (T.decks * 8.5 + 2) * k;
    var stackH = 16 * k, stackW = Math.max(5, 9 * k + L * 0.012);
    var stackTop = ice ? houseTop - 4 * k : houseTop + 2 * k;
    var bands = spec.stack || ['#1c1c1c', '#c8402f', '#f1ede3'];
    s += '<path d="M' + n(stackX) + ' ' + n(stackTop + stackH) + ' L' + n(stackX + 1.5 * k) + ' ' + n(stackTop) + ' L' + n(stackX + stackW + 1.5 * k) + ' ' + n(stackTop) + ' L' + n(stackX + stackW) + ' ' + n(stackTop + stackH) + ' Z" fill="' + bands[2] + '"/>';
    s += rect(stackX + 0.4 * k, stackTop + stackH * 0.3, stackW + 0.6 * k, stackH * 0.22, bands[1]);
    s += rect(stackX + 1.2 * k, stackTop, stackW + 0.3 * k, stackH * 0.2, bands[0]);
    s += smoke(stackX + stackW / 2 + 1.5 * k, stackTop, t, k, o.moving || 0);
    // Masts and lights.
    var mastX = T.fwdHouse ? L * 0.985 : L * 0.975;
    s += '<path d="M' + n(mastX) + ' ' + n(deckY - sheer) + ' l0 ' + n(-14 * k) + '" stroke="#e8e4da" stroke-width="1"/>';
    s += '<circle cx="' + n(mastX) + '" cy="' + n(deckY - sheer - 14 * k) + '" r="1.3" fill="#fffbe6"/>';
    var radarX = L * (T.house[0] + (T.house[1] - T.house[0]) * 0.75);
    s += '<path d="M' + n(radarX) + ' ' + n(houseTop) + ' l0 ' + n(-9 * k) + ' m-3 0 l6 0" stroke="#e8e4da" stroke-width="1"/>';
    var pilot = T.fwdHouse ? L * T.fwdHouse[1] : L * T.house[1];
    var pilotY = T.fwdHouse ? deckY - sheer * 0.6 - 3 * 8.5 * k : houseTop;
    s += '<circle cx="' + n(pilot) + '" cy="' + n(pilotY + 4 * k) + '" r="1.1" fill="#3ddc84"/>';
    // Bow wave and wake while under way.
    var mv = o.moving || 0;
    if (mv > 0.02) {
      var w = Math.sin(t * 6) * 0.6;
      s += '<path d="M' + n(stemWL - 6) + ' -0.5 q8 -' + n(3 + 3 * mv + w) + ' ' + n(16 + 8 * mv) + ' 0.5" stroke="#ffffff" stroke-width="' + n(1.4 + mv) + '" fill="none" opacity=".85"/>';
      for (var j = 0; j < 4; j++) {
        var off = ((t * 30 * mv + j * 18) % 72);
        s += '<path d="M' + n(-off) + ' ' + n(0.6 + j % 2) + ' l' + n(-14 - j * 3) + ' 0" stroke="#ffffff" stroke-width="1.2" opacity="' + n(Math.max(0, 0.8 - off / 80)) + '"/>';
      }
    }
    return s;
  }

  function plating(L, deckY, d) {
    var s = '', step = Math.max(14, L / 48);
    for (var x = step; x < L; x += step) s += '<path d="M' + n(x) + ' ' + n(deckY) + ' l0 ' + n(d - deckY) + '" stroke="#000" stroke-opacity=".07" stroke-width="1"/>';
    s += '<path d="M0 ' + n(deckY * 0.45) + ' L' + L + ' ' + n(deckY * 0.45) + '" stroke="#000" stroke-opacity=".08"/>';
    return s;
  }
  function rail(x0, x1, y, k) {
    var s = '<path d="M' + n(x0) + ' ' + n(y - 3.2 * k) + ' L' + n(x1) + ' ' + n(y - 3.2 * k) + '" stroke="#ddd8cc" stroke-width=".6" opacity=".8"/>';
    for (var x = x0; x < x1; x += Math.max(5, 8 * k)) s += '<path d="M' + n(x) + ' ' + n(y) + ' l0 ' + n(-3.2 * k) + '" stroke="#ddd8cc" stroke-width=".5" opacity=".6"/>';
    return s;
  }
  function house(x0, x1, deckY, decks, k, id, where, lit) {
    var w = x1 - x0, h = 8.5 * k, s = '';
    for (var i = 0; i < decks; i++) {
      var inset = where === 'aft' ? i * w * 0.04 : where === 'fwd' ? i * w * 0.07 : i * w * 0.05;
      var xa = x0 + (where === 'fwd' ? inset * 0.4 : inset * 0.5), xb = x1 - (where === 'aft' ? inset * 0.2 : inset * 0.6);
      var y = deckY - (i + 1) * h;
      s += rect(xa, y, xb - xa, h, 'url(#' + id + 'w)');
      s += '<path d="M' + n(xa) + ' ' + n(y) + ' L' + n(xb) + ' ' + n(y) + '" stroke="#9aa3a8" stroke-width=".6"/>';
      // Windows: portholes below, a band of glass on the top (pilothouse) deck.
      if (i === decks - 1) s += rect(xa + 1.5, y + h * 0.28, xb - xa - 3, h * 0.38, '#284454') + rect(xa + 1.5, y + h * 0.28, xb - xa - 3, h * 0.1, '#7fb6cf', ' opacity=".7"');
      else for (var x = xa + 3; x < xb - 3; x += Math.max(4, 5.5 * k)) {
        var on = lit && ((Math.floor(x * 7 + i * 13) % 5) < 2);
        s += rect(x, y + h * 0.35, Math.max(1.4, 2 * k), Math.max(1.4, 2.2 * k), on ? '#ffe7a3' : '#3c5563');
      }
    }
    // Bridge wings on the pilothouse.
    var top = deckY - decks * h;
    s += rect(x0 - 2, top + h * 0.15, (x1 - x0) + 4, 1.2, '#f1ede3');
    return s;
  }
  function boom(x0, y0, x1, y1, k) {
    var s = '<path d="M' + n(x0) + ' ' + n(y0) + ' L' + n(x1) + ' ' + n(y1) + '" stroke="#6b6b66" stroke-width="' + n(Math.max(1.6, 2.4 * k)) + '"/>';
    s += '<path d="M' + n(x0) + ' ' + n(y0 - 2 * k) + ' L' + n(x1) + ' ' + n(y1 - 2 * k) + '" stroke="#8a8a84" stroke-width=".8"/>';
    for (var i = 0; i <= 12; i++) { var x = x0 + (x1 - x0) * i / 12, y = y0 + (y1 - y0) * i / 12; s += '<path d="M' + n(x) + ' ' + n(y) + ' l' + n((x1 - x0) / 24) + ' ' + n(-2 * k) + '" stroke="#8a8a84" stroke-width=".6"/>'; }
    return s;
  }
  function crane(x, deckY, k, i) {
    var h = 26 * k, jib = 30 * k, ang = i % 2 ? -0.5 : -0.35;
    return rect(x - 2 * k, deckY - h, 4 * k, h, '#d9a52e') + rect(x - 3.5 * k, deckY - h - 4 * k, 7 * k, 5 * k, '#e7b84a') +
      '<path d="M' + n(x) + ' ' + n(deckY - h) + ' l' + n(jib * Math.cos(ang)) + ' ' + n(jib * Math.sin(ang)) + '" stroke="#d9a52e" stroke-width="' + n(Math.max(1.2, 1.8 * k)) + '"/>' +
      '<path d="M' + n(x + jib * Math.cos(ang)) + ' ' + n(deckY - h + jib * Math.sin(ang)) + ' l0 ' + n(h * 0.5) + '" stroke="#555" stroke-width=".5"/>';
  }
  function smoke(x, y, t, k, mv) {
    var s = '';
    for (var i = 0; i < 6; i++) {
      var p = ((t * 0.35 + i / 6) % 1);
      var r = (2 + p * 9) * Math.max(0.6, k);
      var dx = -p * (18 + 30 * mv) * Math.max(0.7, k), dy = -p * 26 * Math.max(0.7, k);
      s += '<circle cx="' + n(x + dx) + '" cy="' + n(y + dy) + '" r="' + n(r) + '" fill="#9aa1a6" opacity="' + n(0.38 * (1 - p)) + '"/>';
    }
    return s;
  }
  function esc(str) { return String(str).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }
  function shade(hex, amt) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex); if (!m) return hex;
    var v = parseInt(m[1], 16), r = v >> 16, g = (v >> 8) & 255, b = v & 255;
    var f = function (c) { return Math.max(0, Math.min(255, Math.round(amt > 0 ? c + (255 - c) * amt : c * (1 + amt)))); };
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }

  /* A side-view lock scene. Upper pool on the left, lower pool on the right.
     o: {W, H, cx, cw, upY, lowY, level, upGate (0 closed..1 open), lowGate, flow (+1 filling, -1 draining, 0),
         ship, shipX, shipY, shipL, k, t, moving, moored, flip, platform} */
  function scene(o) {
    var W = o.W, H = o.H, floor = H - 22, coping = o.upY - 22, t = o.t || 0;
    var s = '<defs><linearGradient id="lsSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b9d7e6"/><stop offset="1" stop-color="#e9f1f3"/></linearGradient>' +
      '<linearGradient id="lsWat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f86a8" stop-opacity=".78"/><stop offset="1" stop-color="#173b52" stop-opacity=".93"/></linearGradient>' +
      '<linearGradient id="lsWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b3ada1"/><stop offset="1" stop-color="#77716a"/></linearGradient></defs>';
    s += rect(0, 0, W, H, 'url(#lsSky)');
    // Distant shore: tree line and a few buildings.
    var tl = 'M0 ' + n(coping - 26);
    for (var x = 0; x <= W; x += 20) tl += ' L' + x + ' ' + n(coping - 26 - 8 - 7 * Math.abs(Math.sin(x * 0.07)) - 4 * Math.abs(Math.sin(x * 0.19)));
    s += '<path d="' + tl + ' L' + W + ' ' + n(coping) + ' L0 ' + n(coping) + ' Z" fill="#5f7f6a" opacity=".55"/>';
    s += rect(W * 0.62, coping - 30, 46, 22, '#c9c2b4', ' opacity=".8"') + rect(W * 0.62 + 8, coping - 42, 14, 12, '#bdb5a6', ' opacity=".8"');
    // Lock walls behind the water (far wall) with bollards.
    s += rect(0, coping, W, floor - coping, 'url(#lsWall)', ' opacity=".62"');
    // Concrete courses and joints, and the dark wet band a drained chamber leaves behind.
    for (var cy = coping + 12; cy < floor; cy += 13) s += '<path d="M0 ' + cy + ' L' + W + ' ' + cy + '" stroke="#5e5951" stroke-opacity=".25" stroke-width=".8"/>';
    for (var jx = 25; jx < W; jx += 58) s += '<path d="M' + jx + ' ' + coping + ' l0 ' + (floor - coping) + '" stroke="#5e5951" stroke-opacity=".18" stroke-width=".8"/>';
    if (o.level > Math.min(o.upY, o.lowY) + 1) s += rect(o.cx, Math.min(o.upY, o.lowY), o.cw, o.level - Math.min(o.upY, o.lowY), '#3d4a4a', ' opacity=".22"');
    s += rect(0, coping, W, 3, '#d6d0c3', ' opacity=".9"');
    for (var bx = o.cx + 30; bx < o.cx + o.cw - 20; bx += 60) s += rect(bx, coping - 4, 5, 5, '#3a3a3a', ' rx="1.5"');
    // Lock heads and gates sit behind the ship in this cutaway view, so she sails past them cleanly.
    s += rect(o.cx - 14, coping, 14, floor - coping + 4, 'url(#lsWall)') + rect(o.cx + o.cw, coping, 14, floor - coping + 4, 'url(#lsWall)');
    s += rect(o.cx - 14, coping, 14, 3, '#d6d0c3') + rect(o.cx + o.cw, coping, 14, 3, '#d6d0c3');
    // Miter gates: a closed leaf shows its face and braces; an open leaf folds into the wall recess.
    s += gate(o.cx - 3, coping + 3, floor, o.upGate) + gate(o.cx + o.cw - 5, coping + 3, floor, o.lowGate);
    // Mooring lines from ship to bollards (drawn before the ship so they pass behind the hull top).
    var shipDeck = null;
    if (o.ship) {
      var depth = o.ship.depth || Math.max(24, o.ship.len * 0.056), draft = o.ship.draft || depth * 0.55;
      shipDeck = o.shipY - (depth - draft) * o.k;
    }
    if (o.moored && o.ship) {
      var p1 = o.flip ? o.shipX + o.shipL * 0.9 : o.shipX + o.shipL * 0.1, p2 = o.flip ? o.shipX + o.shipL * 0.12 : o.shipX + o.shipL * 0.88;
      [[p1, p1 - 40], [p2, p2 + 40], [o.shipX + o.shipL * 0.5, o.shipX + o.shipL * 0.5 - 20]].forEach(function (l) {
        var midY = (shipDeck + coping) / 2 + 6;
        s += '<path d="M' + n(l[0]) + ' ' + n(shipDeck - 1) + ' Q' + n((l[0] + l[1]) / 2) + ' ' + n(midY) + ' ' + n(l[1]) + ' ' + n(coping - 1) + '" stroke="#e8d9a8" stroke-width="1" fill="none"/>';
      });
    }
    // Ship.
    if (o.ship) {
      var bob = Math.sin(t * 1.3) * 0.5;
      s += '<g transform="translate(' + n(o.flip ? o.shipX + o.shipL : o.shipX) + ' ' + n(o.shipY + bob) + ')' + (o.flip ? ' scale(-1 1)' : '') + '">' +
        ship(o.ship, {L: o.shipL, k: o.k, t: t, moving: o.moving, lit: o.lit, flip: o.flip}) + '</g>';
    }
    // Water in front (translucent, so the hull below the waterline shows through).
    s += rect(0, o.upY, o.cx, floor - o.upY, 'url(#lsWat)');
    s += rect(o.cx, o.level, o.cw, floor - o.level, 'url(#lsWat)');
    s += rect(o.cx + o.cw, o.lowY, W - o.cx - o.cw, floor - o.lowY, 'url(#lsWat)');
    s += surface(0, o.cx, o.upY, t) + surface(o.cx, o.cx + o.cw, o.level, t + 1) + surface(o.cx + o.cw, W, o.lowY, t + 2);
    // Filling boils up at the surface; draining pulls little whirls down.
    if (o.flow) {
      for (var i = 0; i < 7; i++) {
        var x0 = o.cx + o.cw * (0.08 + i * 0.13), ph = (t * 1.6 + i * 0.37) % 1;
        if (o.flow > 0) s += '<ellipse cx="' + n(x0) + '" cy="' + n(o.level + 1) + '" rx="' + n(6 + ph * 14) + '" ry="' + n(1.5 + ph * 2) + '" fill="#e8f6fb" opacity="' + n(0.7 * (1 - ph)) + '"/>' +
          '<circle cx="' + n(x0 + 4) + '" cy="' + n(floor - 8 - ph * (floor - o.level - 10)) + '" r="' + n(1.4 + ph) + '" fill="#d7f0f8" opacity=".55"/>';
        else s += '<path d="M' + n(x0 - 8) + ' ' + n(o.level + 2) + ' q8 ' + n(3 + ph * 3) + ' 16 0" stroke="#d7f0f8" stroke-width="1" fill="none" opacity="' + n(0.7 * (1 - ph)) + '"/>';
      }
      // Culvert ports in the floor.
      for (var c = 0; c < 6; c++) s += rect(o.cx + o.cw * (0.1 + c * 0.16), floor - 3, 10, 3, '#203845');
    }
    // Floor and the near lock walls.
    s += rect(0, floor, W, H - floor, '#5c574f');
    // Viewing platform with people (the Soo has a public observation deck).
    if (o.platform) {
      var px = o.cx + o.cw + 30, py = coping - 18;
      s += rect(px, py + 14, 120, 4, '#6d6a62') + '<path d="M' + px + ' ' + (py + 8) + ' l120 0" stroke="#3a3a3a" stroke-width="1"/>';
      [12, 30, 36, 70, 96].forEach(function (dx, i) {
        var h = 10 + (i % 2) * 2;
        s += '<circle cx="' + (px + dx) + '" cy="' + (py + 14 - h - 2) + '" r="2" fill="#2f3a40"/>' + rect(px + dx - 1.6, py + 14 - h, 3.2, h, ['#a33', '#2f5d8a', '#3a6b3a', '#7a5a2a', '#444'][i]);
      });
    }
    return s;
  }
  function surface(x0, x1, y, t) {
    if (x1 - x0 < 4) return '';
    var d = 'M' + n(x0) + ' ' + n(y);
    for (var x = x0; x <= x1; x += 10) d += ' L' + n(x) + ' ' + n(y + Math.sin(x * 0.08 + t * 2.2) * 0.8);
    return '<path d="' + d + '" stroke="#d9f1f8" stroke-width="1.2" fill="none" opacity=".8"/>';
  }
  function gate(x, top, bottom, open) {
    var w = 8 * (1 - open) + 1.5, h = bottom - top;
    var s = rect(x, top, w, h, open > 0.95 ? '#2c2c2c' : '#3b3f42');
    if (open < 0.9) {
      for (var y = top + 8; y < bottom - 4; y += 14) s += '<path d="M' + n(x) + ' ' + n(y) + ' l' + n(w) + ' 10" stroke="#5b6266" stroke-width=".8"/>';
      s += rect(x - 1, top - 4, w + 2, 4, '#c8402f');
    }
    return s;
  }

  global.LockShipArt = {ship: ship, scene: scene, shade: shade, TYPES: TYPES};
})(window);
