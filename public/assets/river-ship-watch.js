/* River Ship Watch: turn recent public AIS reports into tested passage windows for riverbank
 * viewpoints on any corridor model built by scripts/build-passage-model.mjs.
 *
 * Every window comes from the inline model: median travel times from NOAA passages plus
 * split-conformal half-widths for the (viewpoint, lead time) pairs that met the release bar on
 * held-out days. A ship gets a window only when its newest report is fresh and moving along the
 * channel, and only within a published lead time. Never a schedule or promise.
 * Requires RiverPassage (river-passage.js), #rswModel and a #rswBoard with data-api. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.RiverShipWatch = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const root = typeof self !== 'undefined' ? self : globalThis;
  const ZONE = 'America/Detroit';
  const COMMERCIAL = t => t === null || t === undefined || (t >= 60 && t <= 89);
  const bucketOf = h => h < 2 ? '0-2h' : h < 6 ? '2-6h' : h < 12 ? '6-12h' : '12h+';

  function forecasts(model, vessels, now, corridor) {
    const out = [];
    const nowMs = now instanceof Date ? now.getTime() : now;
    for (const v of vessels || []) {
      const motion = v.motion || {};
      if (motion.approachEligible !== true) continue;
      if (!COMMERCIAL(v.shipType)) continue;
      if (Number.isFinite(v.lengthMeters) && v.lengthMeters < 50) continue;
      const seen = Date.parse(v.seen);
      if (!Number.isFinite(seen)) continue;
      const pr = corridor.project(v.lat, v.lon);
      if (!pr || pr.offsetKm > corridor.MAX_OFFSET_KM) continue;
      const course = Number.isFinite(motion.courseOverGround) ? motion.courseOverGround : v.course;
      const dir = corridor.directionFromCourse(pr.km, course);
      if (!dir) continue;
      for (const [vid, view] of Object.entries(model.viewpoints)) {
        const vkm = view.km;
        if (dir > 0 ? pr.km >= vkm - 0.5 : pr.km <= vkm + 0.5) continue;
        const c = Math.round(pr.km / model.checkpointKm) * model.checkpointKm;
        if (dir > 0 ? c >= vkm : c <= vkm) continue;
        const med = model.medians[(dir > 0 ? 'up' : 'down') + '|' + c + '|' + vid];
        if (!med) continue;
        const pace = med.m / Math.abs(vkm - c);
        const minutes = med.m + (dir > 0 ? c - pr.km : pr.km - c) * pace;
        if (!(minutes > 0)) continue;
        const bucket = bucketOf(minutes / 60);
        const w = model.windows[vid] && model.windows[vid][bucket];
        if (!w) continue;
        const median = seen + minutes * 60000;
        const earliest = median - w.halfWidthMin * 60000, latest = median + w.halfWidthMin * 60000;
        if (latest < nowMs) continue;
        out.push({ viewpoint: vid, mmsi: String(v.mmsi), name: v.name || null, dir, earliest, latest, median,
          reportSeen: seen, bucket, hitRate: w.hitRate, testPassages: w.testPassages,
          lengthFt: Number.isFinite(v.lengthMeters) ? Math.round(v.lengthMeters * 3.28084) : null });
      }
    }
    return out.sort((a, b) => a.earliest - b.earliest);
  }

  const clock = ms => new Intl.DateTimeFormat('en-US', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' }).format(new Date(ms));
  function windowText(f) {
    const a = clock(f.earliest), b = clock(f.latest);
    const [ah, ap] = a.split(' '), [bh, bp] = b.split(' ');
    return ap === bp ? ah + '–' + bh + ' ' + bp : a + ' – ' + b;
  }
  function relative(f, nowMs) {
    if (f.earliest <= nowMs) return 'Could be passing now';
    const m = Math.round((f.earliest - nowMs) / 60000);
    if (m < 1) return 'Any minute now';
    if (m < 60) return 'In about ' + m + ' min';
    const h = Math.floor(m / 60), r = m % 60;
    return 'In about ' + h + ' h' + (r ? ' ' + r + ' min' : '');
  }
  const horizonHours = (model, vid) => (model.windows[vid] && model.windows[vid]['2-6h']) ? 6 : 2;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function renderList(rows, nowMs, labels) {
    return rows.map((f, i) => '<li class="rsw-pass' + (i === 0 ? ' is-next' : '') + '">' +
      '<p class="rsw-when"><strong>' + esc(windowText(f)) + '</strong><span>' + esc(relative(f, nowMs)) + '</span></p>' +
      '<p class="rsw-ship">' + esc(f.name || 'Unnamed vessel (MMSI ' + f.mmsi + ')') + '</p>' +
      '<p class="rsw-meta">' + esc(f.dir > 0 ? labels.positive : labels.negative) + (f.lengthFt ? ' · ' + f.lengthFt + ' ft' : '') +
      ' · from its ' + esc(clock(f.reportSeen)) + ' report</p>' +
      '<p class="rsw-basis">' + Math.round(f.hitRate * 100) + '% of ' + f.testPassages + ' tested 2025 passages fell inside a window like this.</p></li>').join('');
  }

  function mount(doc, opts) {
    const o = Object.assign({ fetch: root.fetch && root.fetch.bind(root), now: () => Date.now(), refreshMs: 180000 }, opts || {});
    const el = doc.getElementById('rswBoard'), holder = doc.getElementById('rswModel');
    if (!el || !holder || !root.RiverPassage) return null;
    let model;
    try { model = JSON.parse(holder.textContent); } catch (_) { return null; }
    const corridor = root.RiverPassage.create({ channel: model.geometry.channel, viewpoints: model.geometry.viewpoints, refLat: model.geometry.refLat, maxOffsetKm: model.geometry.maxOffsetKm });
    const labels = { positive: model.geometry.positiveLabel, negative: model.geometry.negativeLabel };
    el.setAttribute('data-js', '');
    const list = el.querySelector('[data-rsw-list]'), status = el.querySelector('[data-rsw-status]');
    const tabs = Array.from(el.querySelectorAll('[data-rsw-view]'));
    const first = tabs[0] && tabs[0].dataset.rswView;
    const asked = new URL(root.location.href).searchParams.get('view');
    let view = model.viewpoints[asked] ? asked : first;
    let latest = null, timer = null;

    function paint() {
      tabs.forEach(t => t.setAttribute('aria-pressed', String(t.dataset.rswView === view)));
      el.setAttribute('data-view', view);
      if (!latest) return;
      const nowMs = o.now();
      if (latest.error) {
        list.innerHTML = '';
        el.setAttribute('data-state', 'error');
        status.textContent = 'Ship reports are unavailable right now, so no window can be shown. Try again in a few minutes.';
        return;
      }
      const rows = latest.rows.filter(r => r.viewpoint === view && r.latest >= nowMs);
      const horizon = 'the next ' + horizonHours(model, view) + ' hours';
      list.innerHTML = renderList(rows, nowMs, labels);
      if (rows.length) {
        el.setAttribute('data-state', 'windows');
        status.textContent = rows.length + (rows.length === 1 ? ' ship' : ' ships') + ' forecast within ' + horizon + '. Checked ' + clock(latest.checkedAt) + '.';
      } else {
        el.setAttribute('data-state', 'empty');
        status.textContent = 'No ship is forecast to pass within ' + horizon + ' from the reports received at ' + clock(latest.checkedAt) +
          '. A ship can still appear: one may be anchored, out of receiver range, or not yet reporting a steady course.';
      }
    }
    async function load() {
      status.textContent = 'Checking recent ship reports…';
      try {
        const res = await o.fetch(el.dataset.api, { headers: { Accept: 'application/json' } });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        if (!data || data.ok === false || !Array.isArray(data.vessels)) throw new Error('unavailable');
        latest = { rows: forecasts(model, data.vessels, o.now(), corridor), checkedAt: Date.parse(data.checkedAt || data.generatedAt) || o.now() };
      } catch (_) {
        latest = { error: true, rows: [], checkedAt: o.now() };
      }
      paint();
    }
    tabs.forEach(t => t.addEventListener('click', () => {
      view = t.dataset.rswView;
      const u = new URL(root.location.href);
      if (view === first) u.searchParams.delete('view'); else u.searchParams.set('view', view);
      root.history.replaceState(null, '', u);
      paint();
    }));
    const refresh = el.querySelector('[data-rsw-refresh]');
    if (refresh) refresh.addEventListener('click', load);
    const schedule = () => { clearInterval(timer); if (o.refreshMs && doc.visibilityState !== 'hidden') timer = setInterval(load, o.refreshMs); };
    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'visible') load(); schedule(); });
    paint(); load(); schedule();
    return { load, paint, get view() { return view; } };
  }

  if (typeof document !== 'undefined') {
    const run = () => { try { mount(document); } catch (_) { /* static explanation stays */ } };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  }
  return { forecasts, windowText, relative, horizonHours, mount };
});
