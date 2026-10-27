/* The Sleeping Fleet: the experiential layer for the Great Lakes winter layup page.
   Three parts share one clock:
   1. A living winter-harbor scene in the hero (canvas sky, ice, snow and dock light;
      the ship itself is drawn by lock-ship-art.js as SVG between two canvases).
   2. The shipping-year dial: where the season stands, days to the next milestone,
      and a scrub handle that moves the hero scene through the winter.
   3. To-scale dock and roster drawings from the archive's hull dimensions.
   Nothing here infers a ship's position. The scene is an illustration of the season,
   and the dial's dates are the published Soo Locks and Seaway schedule. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var Art = window.LockShipArt;

  /* ---------------- Season model ---------------- */
  // Annual milestones, Eastern time. Soo Locks: closed Jan 15 to Mar 25 (USACE).
  // Seaway: last Welland transits about Dec 26, canal clear by Jan 10 (2025-26 notice).
  var MILESTONES = [
    {id: 'seaway-last', m: 12, d: 26, label: 'the last Welland Canal transits', short: 'the Seaway winds down'},
    {id: 'welland-clear', m: 1, d: 10, label: 'the Welland Canal is clear', short: 'the Welland is clear'},
    {id: 'soo-close', m: 1, d: 15, label: 'Soo Locks close', short: 'Soo Locks close'},
    {id: 'fitout', m: 3, d: 1, label: 'fit-out season begins in the shipyards', short: 'fit-out begins'},
    {id: 'soo-open', m: 3, d: 25, label: 'Soo Locks reopen', short: 'Soo Locks reopen'}
  ];
  function eastern(date) {
    var p = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Detroit', year: 'numeric', month: 'numeric', day: 'numeric'}).formatToParts(date);
    var o = {}; p.forEach(function (x) { o[x.type] = +x.value; });
    return {y: o.year, m: o.month, d: o.day};
  }
  function dayOfYear(y, m, d) { return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000); }
  function phaseFor(date) {
    var e = eastern(date), doy = dayOfYear(e.y, e.m, e.d);
    var at = function (m, d) { return dayOfYear(e.y, m, d); };
    var id, label, blurb;
    if (doy >= at(3, 25) && doy < at(11, 15)) { id = 'running'; label = 'Shipping season'; blurb = 'The lakes are open. Ore, stone and grain are moving, and the fleet is spread across five lakes.'; }
    else if (doy >= at(11, 15) && doy < at(12, 26)) { id = 'closing', label = 'Closing weeks'; blurb = 'The last cargoes of the year. Ships squeeze in final trips before the Seaway and the Soo shut for winter.'; }
    else if (doy >= at(12, 26) || doy < at(1, 15)) { id = 'arriving'; label = 'The fleet comes in'; blurb = 'Welland transits end and ships make their final runs to winter berths. Lake Superior harbors fill up fast in the first two weeks of January.'; }
    else if (doy >= at(1, 15) && doy < at(3, 1)) { id = 'asleep'; label = 'Winter layup'; blurb = 'The Soo Locks are closed. Ships sit in ice at Superior, Sturgeon Bay, Toledo and a dozen other harbors while shipyards work through repair lists.'; }
    else { id = 'fitout'; label = 'Fit-out'; blurb = 'Crews return, engines turn over, icebreakers cut tracks. The whole fleet is waiting for the Soo Locks to open on March 25.'; }
    return {id: id, label: label, blurb: blurb, doy: doy, year: e.y};
  }
  function nextMilestone(date) {
    var e = eastern(date), today = Date.UTC(e.y, e.m - 1, e.d), best = null;
    MILESTONES.forEach(function (ms) {
      [e.y, e.y + 1].forEach(function (y) {
        var t = Date.UTC(y, ms.m - 1, ms.d);
        if (t >= today && (!best || t < best.t)) best = {t: t, ms: ms, days: Math.round((t - today) / 86400000)};
      });
    });
    return best;
  }
  // Fraction of a year since the Soo opening (Mar 25), for the dial.
  function yearFraction(date) {
    var e = eastern(date), doy = dayOfYear(e.y, e.m, e.d), open = dayOfYear(e.y, 3, 25), len = 365 + (isLeap(e.y) ? 1 : 0);
    return (((doy - open) % len) + len) % len / len;
  }
  function isLeap(y) { return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0; }
  function dateFromFraction(f, baseYear) {
    var open = Date.UTC(baseYear, 2, 25), len = (isLeap(baseYear + 1) || isLeap(baseYear)) ? 366 : 365;
    return new Date(open + f * len * 86400000 + 12 * 3600000);
  }
  function fmtDate(d) { return new Intl.DateTimeFormat('en-US', {timeZone: 'America/Detroit', month: 'long', day: 'numeric'}).format(d); }

  /* ---------------- Hero scene ---------------- */
  function Scene(root) {
    this.root = root;
    this.back = root.querySelector('canvas.scene-back');
    this.front = root.querySelector('canvas.scene-front');
    this.shipLayer = root.querySelector('svg.scene-ship');
    this.bc = this.back.getContext('2d');
    this.fc = this.front.getContext('2d');
    this.date = new Date();
    this.flakes = [];
    this.stars = [];
    this.t0 = performance.now();
    this.ship = {name: 'Mesabi Miner', len: 1004, beam: 105, type: 'aft-ender', hull: '#7a2b22', stack: ['#1c1c1c', '#f2a944', '#1c1c1c']};
    var self = this;
    for (var i = 0; i < 220; i++) this.flakes.push({x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.9, s: 0.4 + Math.random() * 0.9, w: Math.random() * 6.28});
    for (var j = 0; j < 160; j++) this.stars.push({x: Math.random(), y: Math.random() * 0.55, r: Math.random() * 1.3 + 0.2, p: Math.random() * 6.28});
    this.resize();
    window.addEventListener('resize', function () { self.resize(); self.drawShip(); self.draw(performance.now()); });
    this.drawShip();
    if (reduce) this.draw(this.t0); else requestAnimationFrame(function loop(now) { if (self.visible !== false) self.draw(now); requestAnimationFrame(loop); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { self.visible = es[0].isIntersecting; }).observe(root);
  }
  Scene.prototype.resize = function () {
    var w = this.root.clientWidth, h = this.root.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    [this.back, this.front].forEach(function (c) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0); });
    this.w = w; this.h = h;
    var stage = this.root.parentNode.querySelector('.hero-stage');
    this.horizon = stage ? stage.offsetTop + stage.offsetHeight * 0.3 : h * 0.62;
  };
  Scene.prototype.setDate = function (d) { this.date = d; this.phase = phaseFor(d); this.drawShip(); if (reduce) this.draw(performance.now()); };
  Scene.prototype.params = function () {
    var ph = this.phase || phaseFor(this.date), f = yearFraction(this.date);
    // Ice grows from late December, peaks in February, breaks up in March.
    var ice = ph.id === 'asleep' ? 1 : ph.id === 'arriving' ? 0.35 : ph.id === 'fitout' ? 0.7 : ph.id === 'closing' ? 0.08 : 0;
    var snow = ph.id === 'asleep' ? 0.9 : ph.id === 'arriving' ? 0.75 : ph.id === 'fitout' ? 0.4 : ph.id === 'closing' ? 0.3 : 0;
    var moving = ph.id === 'running' ? 1 : ph.id === 'closing' ? 0.6 : 0;
    var deckSnow = ph.id === 'asleep' ? 1 : ph.id === 'fitout' ? 0.5 : 0;
    var steam = ph.id === 'asleep' ? 0.6 : ph.id === 'fitout' ? 1 : 0;
    var lights = ph.id === 'running' ? 0.5 : 1;
    var aurora = ph.id === 'asleep' || ph.id === 'fitout' ? 1 : 0;
    return {ph: ph, ice: ice, snow: snow, moving: moving, deckSnow: deckSnow, steam: steam, lights: lights, aurora: aurora, f: f};
  };
  Scene.prototype.drawShip = function () {
    if (!Art || !this.shipLayer) return;
    var p = this.params(), w = this.w, h = this.h;
    // The hull is about 62% of the frame wide; vertical scale keeps her proportions.
    var L = w < 700 ? w * 0.78 : w * 0.62, k = L / this.ship.len * (w < 700 ? 1.5 : 1.05);
    var x = (w < 700 ? w * 0.42 : w * 0.46) - L / 2, y = this.horizon + 2;
    this.shipLayer.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    var svg = '<g transform="translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')">' +
      Art.ship(this.ship, {L: L, k: k, t: 0, moving: 0, lit: p.lights > 0.6}) + '</g>';
    // Snow on the hatches and deckhouse roof when she is laid up.
    if (p.deckSnow > 0) {
      var depth = Math.max(24, this.ship.len * 0.056), draft = depth * 0.55, deckY = y - (depth - draft) * k;
      svg += '<rect x="' + (x + L * 0.15).toFixed(1) + '" y="' + (deckY - 3.2 * k - 1.6).toFixed(1) + '" width="' + (L * 0.74).toFixed(1) + '" height="' + (1.6 + 1.4 * p.deckSnow).toFixed(1) + '" fill="#f3f6f8" opacity="' + (0.85 * p.deckSnow).toFixed(2) + '" rx="1"/>';
      svg += '<rect x="' + (x + L * 0.012).toFixed(1) + '" y="' + (deckY - (5 * 8.5 + 2) * k - 2).toFixed(1) + '" width="' + (L * 0.12).toFixed(1) + '" height="2.4" fill="#f3f6f8" opacity="' + (0.9 * p.deckSnow).toFixed(2) + '" rx="1"/>';
    }
    this.shipLayer.innerHTML = svg;
    this.shipBox = {x: x, L: L, k: k, y: y};
  };
  Scene.prototype.draw = function (now) {
    var t = (now - this.t0) / 1000, p = this.params(), w = this.w, h = this.h, hz = this.horizon, g = this.bc, f = this.fc;
    // Sky.
    var sky = g.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, '#040a14'); sky.addColorStop(0.55, '#0a1a2c'); sky.addColorStop(1, p.ph.id === 'running' ? '#2a3f56' : '#1b2f44');
    g.fillStyle = sky; g.fillRect(0, 0, w, hz);
    if (p.aurora) {
      var a = g.createLinearGradient(0, hz * 0.05, 0, hz * 0.6);
      var pulse = reduce ? 0.5 : 0.35 + 0.25 * Math.sin(t * 0.25);
      a.addColorStop(0, 'rgba(60,200,140,0)'); a.addColorStop(0.5, 'rgba(60,200,140,' + (0.16 * pulse).toFixed(3) + ')'); a.addColorStop(1, 'rgba(60,200,140,0)');
      g.fillStyle = a;
      g.beginPath(); g.moveTo(0, hz * 0.1);
      for (var ax = 0; ax <= w; ax += 20) g.lineTo(ax, hz * 0.1 + Math.sin(ax / 140 + t * 0.2) * 18);
      g.lineTo(w, hz * 0.6); g.lineTo(0, hz * 0.6); g.fill();
    }
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i], tw = reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t * 0.9 + s.p);
      g.fillStyle = 'rgba(255,255,255,' + (0.75 * tw * (1 - 0.4 * p.snow)).toFixed(3) + ')';
      g.fillRect(s.x * w, s.y * hz, s.r, s.r);
    }
    // Far shore: ore dock and town lights.
    g.fillStyle = '#060e18';
    g.beginPath(); g.moveTo(0, hz);
    for (var sx = 0; sx <= w; sx += 24) g.lineTo(sx, hz - 10 - 14 * Math.abs(Math.sin(sx * 0.013)) - 6 * Math.abs(Math.sin(sx * 0.047)));
    g.lineTo(w, hz); g.fill();
    g.fillStyle = '#0a1420'; g.fillRect(w * 0.62, hz - 44, w * 0.2, 44); g.fillRect(w * 0.66, hz - 58, 6, 14); g.fillRect(w * 0.74, hz - 58, 6, 14);
    for (var lx = w * 0.63; lx < w * 0.82; lx += 14) { g.fillStyle = 'rgba(255,196,110,' + (0.55 + 0.25 * Math.sin(t * 2 + lx)).toFixed(2) + ')'; g.fillRect(lx, hz - 40, 1.6, 1.6); }
    for (var tx = 10; tx < w * 0.6; tx += 37 + (tx * 7 % 23)) { g.fillStyle = 'rgba(255,220,160,.6)'; g.fillRect(tx, hz - 16 - (tx * 13 % 9), 1.4, 1.4); }
    // Water or ice.
    var water = g.createLinearGradient(0, hz, 0, h);
    water.addColorStop(0, '#0e2a3d'); water.addColorStop(1, '#061520');
    g.fillStyle = water; g.fillRect(0, hz, w, h - hz);
    if (p.ice <= 0) {
      // Open water: a long reflection of the dock light and the moon.
      for (var r = 0; r < 24; r++) { g.fillStyle = 'rgba(255,196,110,' + (0.16 - r * 0.006).toFixed(3) + ')'; g.fillRect(w * 0.9 - 12 + Math.sin(t * 2 + r) * 6, hz + 8 + r * 7, 24 + r * 2, 3); }
      g.strokeStyle = 'rgba(160,200,215,.12)'; for (var wv = 0; wv < 14; wv++) { g.beginPath(); var wy = hz + 12 + wv * 11; g.moveTo(0, wy); for (var wx = 0; wx <= w; wx += 16) g.lineTo(wx, wy + Math.sin(wx * 0.05 + t * 1.3 + wv) * 1.4); g.stroke(); }
    }
    // Pier on the right: a timber deck on pilings, bollards, a sodium lamp.
    var dockX = w * 0.84, deckY = hz - 10;
    for (var pi = 0; pi < 7; pi++) {
      var px0 = dockX + 10 + pi * ((w - dockX - 20) / 6), pl = 26 + (pi % 2) * 12;
      g.fillStyle = '#141a1e'; g.fillRect(px0 - 3, deckY, 6, pl);
      if (p.ice <= 0) { g.fillStyle = 'rgba(20,26,30,.45)'; g.fillRect(px0 - 2, deckY + pl, 4, 18 + Math.sin(t * 1.5 + pi) * 3); }
    }
    g.fillStyle = '#23282c'; g.fillRect(dockX, deckY - 6, w - dockX, 8);
    g.fillStyle = '#31373b'; g.fillRect(dockX, deckY - 6, w - dockX, 2);
    if (p.snow > 0.2) { g.fillStyle = 'rgba(243,246,248,' + Math.min(0.95, p.snow).toFixed(2) + ')'; g.fillRect(dockX, deckY - 9, w - dockX, 3.5); }
    [0.88, 0.94].forEach(function (bx) { g.fillStyle = '#0f1214'; g.fillRect(w * bx, deckY - 12, 7, 7); });
    var lampX = w * 0.93, lampY = deckY - 96;
    g.fillStyle = '#1b1f22'; g.fillRect(lampX - 1.5, lampY, 3, 96 - 6); g.fillRect(lampX - 16, lampY, 17, 3);
    var glow = g.createRadialGradient(lampX - 14, lampY + 4, 2, lampX - 14, lampY + 4, 170);
    glow.addColorStop(0, 'rgba(255,190,96,.5)'); glow.addColorStop(0.25, 'rgba(255,170,70,.16)'); glow.addColorStop(1, 'rgba(255,170,70,0)');
    g.fillStyle = glow; g.fillRect(lampX - 190, lampY - 60, 380, 280);
    g.fillStyle = '#fff1cf'; g.fillRect(lampX - 17, lampY + 2, 6, 4);

    // Front layer: steam, snow, breath of cold air.
    f.clearRect(0, 0, w, h);
    if (p.ice > 0) {
      var g = f; // ice is drawn in front of the hull so the ship sits in it
      var iceTop = hz + 5;
      var ig = g.createLinearGradient(0, iceTop, 0, h);
      ig.addColorStop(0, 'rgba(178,201,214,' + (0.85 * p.ice).toFixed(2) + ')'); ig.addColorStop(1, 'rgba(142,168,184,' + (0.95 * p.ice).toFixed(2) + ')');
      g.fillStyle = ig;
      if (p.ice >= 0.95) g.fillRect(0, iceTop, w, h - iceTop);
      else {
        // Pans and leads: ice breaking up or forming from the shore.
        g.beginPath(); g.moveTo(0, iceTop);
        for (var px = 0; px <= w; px += 18) g.lineTo(px, iceTop + (1 - p.ice) * 40 * Math.abs(Math.sin(px * 0.021 + 1)) + 6 * Math.sin(px * 0.11));
        g.lineTo(w, h); g.lineTo(0, h); g.fill();
        if (p.ice < 0.8) { g.fillStyle = 'rgba(6,21,32,.9)'; for (var lead = 0; lead < 4; lead++) { var ly = hz + 30 + lead * 36; g.fillRect(w * (0.1 + lead * 0.2), ly, w * 0.14 * (1 - p.ice), 6); } }
      }
      // Pressure cracks in the ice.
      g.strokeStyle = 'rgba(90,120,135,' + (0.55 * p.ice).toFixed(2) + ')'; g.lineWidth = 1;
      for (var c = 0; c < 9; c++) {
        g.beginPath(); var cx = w * (0.05 + c * 0.11), cy = hz + 18 + (c * 37 % 60);
        g.moveTo(cx, cy); g.lineTo(cx + 60 + c * 9, cy + 14 + (c % 3) * 10); g.lineTo(cx + 110 + c * 5, cy + 40); g.stroke();
      }
      // Snow drifts on the ice.
      g.fillStyle = 'rgba(245,248,250,' + (0.8 * p.ice).toFixed(2) + ')';
      for (var dr = 0; dr < 6; dr++) { g.beginPath(); g.ellipse(w * (0.08 + dr * 0.17), h - 30 - dr * 9, 70 + dr * 20, 6, 0, 0, 6.283); g.fill(); }
    }
    // The deckhouse lights spill onto the ice or water beside the ship.
    if (this.shipBox && p.lights > 0.6) { var sb = this.shipBox; var sg = f.createRadialGradient(sb.x + sb.L * 0.08, hz + 10, 4, sb.x + sb.L * 0.08, hz + 10, 110); sg.addColorStop(0, 'rgba(255,230,160,.3)'); sg.addColorStop(1, 'rgba(255,230,160,0)'); f.fillStyle = sg; f.fillRect(sb.x - 120, hz + 6, 260, 140); }
    if (p.steam > 0 && this.shipBox) {
      var sbx = this.shipBox, stackX = sbx.x + sbx.L * 0.06, stackY = hz - (5 * 8.5 + 2) * sbx.k - 16 * sbx.k;
      for (var st = 0; st < 9; st++) {
        var q = reduce ? st / 9 : ((t * 0.22 + st / 9) % 1);
        f.fillStyle = 'rgba(230,236,240,' + (0.28 * p.steam * (1 - q)).toFixed(3) + ')';
        f.beginPath(); f.arc(stackX + 8 - q * 70 - Math.sin(q * 6) * 10, stackY - q * 90, 6 + q * 26, 0, 6.283); f.fill();
      }
    }
    if (p.snow > 0) {
      var wind = reduce ? 0 : Math.sin(t * 0.3) * 0.6;
      for (var k = 0; k < this.flakes.length * Math.min(1, p.snow + 0.1); k++) {
        var fl = this.flakes[k];
        if (!reduce) { fl.y += fl.s * 0.0018 * (0.6 + p.snow); fl.x += (Math.sin(t + fl.w) * 0.0004 + wind * 0.0008) * fl.s; if (fl.y > 1.02) { fl.y = -0.02; fl.x = Math.random(); } if (fl.x > 1.02) fl.x = -0.02; if (fl.x < -0.02) fl.x = 1.02; }
        f.fillStyle = 'rgba(255,255,255,' + (0.35 + fl.r * 0.25).toFixed(2) + ')';
        f.beginPath(); f.arc(fl.x * w, fl.y * h, fl.r, 0, 6.283); f.fill();
      }
    }
    // Cold haze at the bottom.
    var haze = f.createLinearGradient(0, h * 0.8, 0, h);
    haze.addColorStop(0, 'rgba(4,10,20,0)'); haze.addColorStop(1, 'rgba(4,10,20,.55)');
    f.fillStyle = haze; f.fillRect(0, h * 0.8, w, h * 0.2);
  };

  /* ---------------- Season dial ---------------- */
  function Dial(root, onScrub) {
    this.root = root; this.onScrub = onScrub;
    this.svg = root.querySelector('svg');
    this.handle = root.querySelector('[data-dial-handle]');
    this.now = new Date();
    this.scrub = null;
    this.baseYear = eastern(this.now).m < 3 || (eastern(this.now).m === 3 && eastern(this.now).d < 25) ? eastern(this.now).y - 1 : eastern(this.now).y;
    this.build();
    this.bind();
    this.update();
  }
  var R = 150, CX = 170, CY = 170;
  function polar(f, r) { var a = f * 6.283 - 1.5708; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r]; }
  function arc(f0, f1, r, width, cls, dash) {
    var big = (f1 - f0 + 1) % 1 > 0.5 ? 1 : 0, a = polar(f0, r), b = polar(f1, r);
    return '<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' A' + r + ' ' + r + ' 0 ' + big + ' 1 ' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" fill="none" stroke-width="' + width + '" class="' + cls + '"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + ' stroke-linecap="butt"/>';
  }
  Dial.prototype.frac = function (m, d) { var y = (m < 3 || (m === 3 && d < 25)) ? this.baseYear + 1 : this.baseYear; return yearFraction(new Date(Date.UTC(y, m - 1, d, 17))); };
  Dial.prototype.build = function () {
    var self = this, s = '';
    var fSeawayLast = this.frac(12, 26), fSooClose = this.frac(1, 15), fFitout = this.frac(3, 1), fOpen = 0, fClosing = this.frac(11, 15);
    s += '<circle cx="' + CX + '" cy="' + CY + '" r="' + R + '" class="dial-track"/>';
    s += arc(fOpen, fClosing, R, 14, 'dial-open');
    s += arc(fClosing, fSeawayLast, R, 14, 'dial-closing');
    s += arc(fSeawayLast, fSooClose, R, 14, 'dial-arriving');
    s += arc(fSooClose, fFitout, R, 18, 'dial-asleep');
    s += arc(fFitout, 0.9999, R, 18, 'dial-fitout');
    // Month ticks and labels.
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (var m = 1; m <= 12; m++) {
      var f = this.frac(m, 1), a = polar(f, R + 14), b = polar(f, R + 20), c = polar(this.frac(m, 16), R + 32);
      s += '<path d="M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + ' L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1) + '" class="dial-tick"/>';
      s += '<text x="' + c[0].toFixed(1) + '" y="' + (c[1] + 4).toFixed(1) + '" text-anchor="middle" class="dial-month">' + months[m - 1] + '</text>';
    }
    // Milestone pips.
    MILESTONES.forEach(function (ms) {
      var f = self.frac(ms.m, ms.d), p = polar(f, R);
      s += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="5" class="dial-pip" data-ms="' + ms.id + '"><title>' + ms.label + ', ' + months[ms.m - 1] + ' ' + ms.d + '</title></circle>';
    });
    // Today marker.
    var ft = yearFraction(this.now), tp = polar(ft, R);
    s += '<g class="dial-today" transform="translate(' + tp[0].toFixed(1) + ' ' + tp[1].toFixed(1) + ')"><circle r="11" class="dial-today-glow"/><circle r="5.5" class="dial-today-dot"/></g>';
    s += '<text x="' + CX + '" y="' + (CY - 56) + '" text-anchor="middle" class="dial-phase" data-dial-phase></text>';
    s += '<text x="' + CX + '" y="' + (CY + 10) + '" text-anchor="middle" class="dial-number" data-dial-number></text>';
    s += '<text x="' + CX + '" y="' + (CY + 36) + '" text-anchor="middle" class="dial-unit" data-dial-unit></text>';
    s += '<text x="' + CX + '" y="' + (CY + 62) + '" text-anchor="middle" class="dial-date" data-dial-date></text>';
    this.svg.querySelector('[data-dial-ring]').innerHTML = s;
  };
  Dial.prototype.bind = function () {
    var self = this, svg = this.svg, dragging = false;
    function fracFromEvent(e) {
      // The dial's viewBox is "-14 -14 368 368" so the month labels outside the ring are not clipped.
      var r = svg.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * 368 - 14 - CX, y = (e.clientY - r.top) / r.height * 368 - 14 - CY;
      return ((Math.atan2(y, x) + 1.5708) / 6.283 + 1) % 1;
    }
    svg.addEventListener('pointerdown', function (e) { dragging = true; svg.setPointerCapture(e.pointerId); self.setScrub(fracFromEvent(e)); });
    svg.addEventListener('pointermove', function (e) { if (dragging) self.setScrub(fracFromEvent(e)); });
    svg.addEventListener('pointerup', function () { dragging = false; });
    svg.addEventListener('pointercancel', function () { dragging = false; });
    svg.addEventListener('keydown', function (e) {
      var step = e.shiftKey ? 30 / 365 : 7 / 365, f = self.scrub == null ? yearFraction(self.now) : self.scrub;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') { e.preventDefault(); self.setScrub((f + step) % 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') { e.preventDefault(); self.setScrub((f - step + 1) % 1); }
      else if (e.key === 'Home') { e.preventDefault(); self.setScrub(null); }
    });
    var back = this.root.querySelector('[data-dial-today]');
    if (back) back.addEventListener('click', function () { self.setScrub(null); });
    this.root.querySelectorAll('[data-dial-jump]').forEach(function (b) {
      b.addEventListener('click', function () { var ms = MILESTONES.filter(function (x) { return x.id === b.getAttribute('data-dial-jump'); })[0]; if (ms) self.setScrub(self.frac(ms.m, ms.d) + 0.0005); });
    });
  };
  Dial.prototype.setScrub = function (f) {
    this.scrub = f;
    this.update();
  };
  Dial.prototype.update = function () {
    var scrubbing = this.scrub != null, date = scrubbing ? dateFromFraction(this.scrub, this.baseYear) : this.now;
    var ph = phaseFor(date), nx = nextMilestone(date), f = yearFraction(date), hp = polar(f, R);
    this.handle.setAttribute('transform', 'translate(' + hp[0].toFixed(1) + ' ' + hp[1].toFixed(1) + ')');
    this.handle.classList.toggle('is-scrubbing', scrubbing);
    this.svg.querySelector('[data-dial-phase]').textContent = ph.label;
    this.svg.querySelector('[data-dial-number]').textContent = nx ? nx.days : '';
    this.svg.querySelector('[data-dial-unit]').textContent = nx ? (nx.days === 0 ? 'today: ' : nx.days === 1 ? 'day until ' : 'days until ') + nx.ms.short : '';
    this.svg.querySelector('[data-dial-date]').textContent = (scrubbing ? '' : 'Today, ') + fmtDate(date);
    this.svg.setAttribute('aria-valuetext', (scrubbing ? fmtDate(date) : 'Today, ' + fmtDate(date)) + ': ' + ph.label + '. ' + (nx ? nx.days + ' days until ' + nx.ms.label + '.' : ''));
    this.svg.setAttribute('aria-valuenow', String(Math.round(f * 365)));
    var story = this.root.querySelector('[data-dial-story]');
    if (story) story.textContent = ph.blurb;
    var when = this.root.querySelector('[data-dial-when]');
    if (when) when.textContent = scrubbing ? 'Scrubbed to ' + fmtDate(date) + '. The harbor scene follows.' : 'Drag the ring, or use the arrow keys, to move the harbor through the winter.';
    var back = this.root.querySelector('[data-dial-today]'); if (back) back.hidden = !scrubbing;
    this.root.setAttribute('data-phase', ph.id);
    if (this.onScrub) this.onScrub(date, ph, nx, scrubbing);
  };

  /* ---------------- To-scale drawings ---------------- */
  var specs = null;
  function specFor(id) { return specs && specs.vessels && specs.vessels[id] || null; }
  // Plan view of a harbor's recorded ships moored along one pier, to scale.
  function dockSVG(ships, harborName) {
    var rows = ships.map(function (v) { var s = specFor(v.id); return {v: v, len: s ? s.lengthFt : 700, beam: s ? s.beamFt : 78, known: !!s, hull: s ? s.hull : '#6b2b24'}; });
    var W = 640, pierW = 46, pad = 12, maxLen = Math.max(1000, Math.max.apply(null, rows.map(function (r) { return r.len; })));
    var sc = (W - pierW - pad - 104) / maxLen; // feet to px, true scale in both axes
    var top = 72, y = top, rowsOut = '';
    rows.forEach(function (r) {
      var len = r.len * sc, bw = Math.max(14, r.beam * sc), x = pierW + pad;
      rowsOut += '<g class="dock-ship" data-dock-ship="' + esc(r.v.id) + '" role="button" tabindex="0" aria-label="' + esc(r.v.name) + ', ' + (r.known ? r.len.toLocaleString() + ' feet' : 'length not recorded') + '">';
      rowsOut += '<text x="' + x + '" y="' + (y + 13) + '" class="dock-name">' + esc(r.v.name) + ' <tspan class="dock-len">' + (r.known ? r.len.toLocaleString() + ' ft' : 'length not recorded') + '</tspan></text>';
      var hy = y + 20;
      rowsOut += '<path d="M' + x + ' ' + hy + ' h' + (len - bw * 0.9).toFixed(1) + ' q' + (bw * 0.9).toFixed(1) + ' 0 ' + (bw * 0.9).toFixed(1) + ' ' + (bw / 2).toFixed(1) + ' q0 ' + (bw / 2).toFixed(1) + ' ' + (-bw * 0.9).toFixed(1) + ' ' + (bw / 2).toFixed(1) + ' h' + (-(len - bw * 0.9)).toFixed(1) + ' z" fill="' + r.hull + '"' + (r.known ? '' : ' stroke="#9fb8c4" stroke-dasharray="4 3" opacity=".6"') + '/>';
      rowsOut += '<rect x="' + (x + len * 0.14).toFixed(1) + '" y="' + (hy + bw * 0.3).toFixed(1) + '" width="' + (len * 0.74).toFixed(1) + '" height="' + (bw * 0.4).toFixed(1) + '" fill="#e9eff2" opacity=".85" rx="1"/>';
      rowsOut += '<rect x="' + (x + len * 0.015).toFixed(1) + '" y="' + (hy + bw * 0.18).toFixed(1) + '" width="' + (len * 0.11).toFixed(1) + '" height="' + (bw * 0.64).toFixed(1) + '" fill="#f3f6f8" rx="1"/>';
      rowsOut += '<path d="M' + (pierW - 2) + ' ' + (hy + bw * 0.5).toFixed(1) + ' l' + (pad + 2) + ' -' + (bw * 0.3).toFixed(1) + ' M' + (pierW - 2) + ' ' + (hy + bw * 0.5).toFixed(1) + ' l' + (pad + 2) + ' ' + (bw * 0.3).toFixed(1) + '" stroke="#c9d6dd" stroke-width="1" opacity=".7"/>';
      rowsOut += '</g>';
      y = hy + bw + 18;
    });
    var H = y + 30;
    var s = '<rect width="' + W + '" height="' + H + '" fill="#0a1f2e"/>';
    for (var i = 0; i < 36; i++) s += '<circle cx="' + (pierW + Math.random() * (W - pierW)).toFixed(0) + '" cy="' + (Math.random() * H).toFixed(0) + '" r="' + (8 + Math.random() * 22).toFixed(0) + '" fill="#d6e6ee" opacity=".05"/>';
    s += '<rect x="0" y="0" width="' + pierW + '" height="' + H + '" fill="#2c3134"/><rect x="' + (pierW - 3) + '" y="0" width="3" height="' + H + '" fill="#f3f6f8" opacity=".7"/>';
    for (var b = 40; b < H; b += 44) s += '<rect x="' + (pierW - 16) + '" y="' + b + '" width="8" height="8" fill="#0e0e0e"/><circle cx="' + (pierW - 12) + '" cy="' + (b - 14) + '" r="3" fill="#ffd27a" opacity=".9"/>';
    s += '<text x="' + (pierW + pad) + '" y="28" class="dock-title">' + esc(harborName) + ', drawn to scale</text>';
    var sx = pierW + pad, sy = 52;
    s += '<path d="M' + sx + ' ' + sy + ' l' + (1000 * sc).toFixed(1) + ' 0" stroke="#9fb8c4" stroke-width="1.5"/><path d="M' + sx + ' ' + (sy - 5) + ' l0 10 M' + (sx + 1000 * sc).toFixed(1) + ' ' + (sy - 5) + ' l0 10" stroke="#9fb8c4" stroke-width="1.5"/><text x="' + (sx + 1000 * sc + 8).toFixed(1) + '" y="' + (sy + 4) + '" class="dock-scale">1,000 ft</text>';
    s += rowsOut;
    var total = rows.reduce(function (a, r) { return a + (r.known ? r.len : 0); }, 0);
    s += '<text x="' + (pierW + pad) + '" y="' + (H - 12) + '" class="dock-foot">' + rows.length + ' recorded ' + (rows.length === 1 ? 'ship' : 'ships') + (total ? ', about ' + total.toLocaleString() + ' ft of steel end to end' : '') + '. Berth order is illustrative.</text>';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="dock-svg" role="img" aria-label="' + esc(harborName) + ' recorded ships drawn to scale">' + s + '</svg>';
  }
  // Side silhouette for a roster card: 1,000 ft spans the card.
  function cardArt(v) {
    if (!Art) return '';
    var s = specFor(v.id), len = s ? s.lengthFt : 700, W = 300, H = 92;
    var L = len / 1040 * (W - 16), k = L / len * 1.9, x = 8 + (W - 16 - L), y = 66;
    var spec = {name: '', len: len, beam: s ? s.beamFt : 78, type: s ? s.type : 'aft-ender', hull: s ? s.hull : '#6b2b24', stack: s ? s.stack : ['#1c1c1c', '#e2e2e2', '#1c1c1c']};
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="card-ship" aria-hidden="true">' +
      '<rect x="8" y="' + (y + 10) + '" width="' + (W - 16) + '" height="1" fill="#3b5566"/><path d="M8 ' + (y + 6) + ' l0 8 M' + (8 + 1000 / 1040 * (W - 16)).toFixed(1) + ' ' + (y + 6) + ' l0 8" stroke="#3b5566"/>' +
      '<text x="' + (8 + 1000 / 1040 * (W - 16)).toFixed(1) + '" y="' + (y + 26) + '" text-anchor="end" class="card-rule">1,000 ft</text>' +
      '<rect x="8" y="' + y + '" width="' + (W - 16) + '" height="10" fill="#0c2231"/>' +
      '<g transform="translate(' + x.toFixed(1) + ' ' + y + ')">' + Art.ship(spec, {L: L, k: k, t: 0, moving: 0, lit: true}) + '</g>' +
      (s ? '' : '<text x="12" y="14" class="card-rule">length not recorded; drawn at 700 ft</text>') + '</svg>';
  }
  function esc(str) { return String(str == null ? '' : str).replace(/[&<>"]/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[c]; }); }

  /* ---------------- Boot ---------------- */
  var sceneEl = document.getElementById('winter-scene'), dialEl = document.getElementById('season-dial');
  var scene = sceneEl && sceneEl.querySelector('canvas') ? new Scene(sceneEl) : null;
  if (scene) scene.setDate(new Date());
  var statusEl = document.querySelector('[data-season-status]');
  var dial = dialEl ? new Dial(dialEl, function (date, ph, nx, scrubbing) {
    if (scene) scene.setDate(date);
    if (statusEl && !scrubbing) statusEl.textContent = ph.label + (nx ? ': ' + (nx.days === 0 ? nx.ms.label + ' today' : nx.days + (nx.days === 1 ? ' day until ' : ' days until ') + nx.ms.label) : '');
    if (sceneEl) sceneEl.setAttribute('data-phase', ph.id);
  }) : null;
  if (!dial && statusEl) { var ph0 = phaseFor(new Date()), nx0 = nextMilestone(new Date()); statusEl.textContent = ph0.label + (nx0 ? ': ' + nx0.days + ' days until ' + nx0.ms.label : ''); }

  fetch('/assets/freighter-fleet-specs.json', {signal: AbortSignal.timeout(7000)}).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (d && d.schemaVersion === 1) { specs = d; document.dispatchEvent(new CustomEvent('fleetspecs:ready')); }
  }).catch(function () {});

  window.WinterFleet = {phaseFor: phaseFor, nextMilestone: nextMilestone, yearFraction: yearFraction, dockSVG: dockSVG, cardArt: cardArt, specFor: specFor, MILESTONES: MILESTONES, scene: scene, dial: dial};
})();
