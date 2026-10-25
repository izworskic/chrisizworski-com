#!/usr/bin/env node
/**
 * Builds public/assets/garden-tools/michigan-soil-data.js from data/garden/msu-soil-2in-daily.json
 * (see scripts/fetch-msu-soil-history.mjs). Deterministic and offline; tests rebuild it in memory and
 * compare, so the page's history always matches the measured record it claims to come from.
 *
 *   node scripts/build-soil-history.mjs           write the data file
 *   node scripts/build-soil-history.mjs --check   fail if the committed file differs
 *
 * Quality checks, applied before any date is worked out:
 *   1. A day is dropped when its 2-inch daily average is outside 10 to 110°F.
 *   2. A day is dropped when it differs by more than 12°F from the median of the five nearest
 *      stations that reported that day (needs at least three). This catches stuck or failing sensors.
 *   3. A spring is used only with at least 110 of its 122 days (Mar 1 to Jun 30), no gap longer than
 *      7 days, and no more than 10 days dropped in step 2 (more means the sensor was unreliable that
 *      spring). Otherwise it is left out of the history, not filled in.
 * Each usable spring then gets the day the soil settled at 40°F and above 60°F, by the same rule the
 * page uses for live data (MISoil.settled): the first day from which every later day through June 30
 * is warm enough.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const RAW = path.join(root, 'data', 'garden', 'msu-soil-2in-daily.json');
const OUT = path.join(root, 'public', 'assets', 'garden-tools', 'michigan-soil-data.js');
const N = 122, MIN_DAYS = 110, MAX_GAP = 7, SPIKE = 12, NEIGHBOURS = 5, MAX_SPIKES = 10;

export function loadEngine() {
  const ctx = vm.createContext({ Math, Date, JSON, console });
  ctx.window = ctx;
  for (const f of ['garden-kit.js', 'michigan-soil.js']) vm.runInContext(fs.readFileSync(path.join(root, 'public', 'assets', 'garden-tools', f), 'utf8'), ctx);
  return { K: ctx.GardenKit, S: ctx.MISoil };
}
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
const quant = (a, q) => { const s = [...a].sort((x, y) => x - y), i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const r1 = v => Math.round(v * 10) / 10;

export function build(raw) {
  const { K, S } = loadEngine();
  const MAR1 = K.parse('Mar 1');
  const ids = raw.stations.map(s => s.id), byId = Object.fromEntries(raw.stations.map(s => [s.id, s]));
  const near = {};
  for (const s of raw.stations) near[s.id] = raw.stations.filter(o => o.id !== s.id).map(o => [o.id, S.miles([s.lat, s.lon], [o.lat, o.lon])]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
  const qc = { daysOutOfRange: 0, daysSpike: 0, springsKept: 0, springsDropped: 0 };
  // Step 1: range check.
  const clean = {};
  for (const id of ids) { clean[id] = {}; for (const y of raw.years) { const v = raw.daily[id] && raw.daily[id][y]; clean[id][y] = v ? v.map(x => { if (x === null) return null; const t = x / 10; if (t < 10 || t > 110) { qc.daysOutOfRange++; return null; } return t; }) : null; } }
  // Step 2: neighbour spike check (against the range-checked values).
  const checked = {}, spikes = {};
  for (const id of ids) {
    checked[id] = {}; spikes[id] = {};
    for (const y of raw.years) {
      const v = clean[id][y]; spikes[id][y] = 0; if (!v) { checked[id][y] = null; continue; }
      checked[id][y] = v.map((t, i) => {
        if (t === null) return null;
        const nb = []; for (const o of near[id]) { const w = clean[o][y]; if (w && w[i] !== null) nb.push(w[i]); if (nb.length === NEIGHBOURS) break; }
        if (nb.length >= 3 && Math.abs(t - median(nb)) > SPIKE) { qc.daysSpike++; spikes[id][y]++; return null; }
        return t;
      });
    }
  }
  // Step 3: usable springs, then settle dates and the typical curve.
  const HISTORY = {}, STATIONS = [];
  for (const id of ids) {
    const x40 = [], x60 = [], usable = [];
    for (const y of raw.years) {
      const v = checked[id][y];
      let ok = false;
      if (v) { const have = v.filter(t => t !== null).length; let gap = 0, maxGap = 0; for (const t of v) { gap = t === null ? gap + 1 : 0; maxGap = Math.max(maxGap, gap); } ok = have >= MIN_DAYS && maxGap <= MAX_GAP && spikes[id][y] <= MAX_SPIKES; }
      if (v && !ok) qc.springsDropped++;
      if (!ok) { x40.push(null); x60.push(null); continue; }
      qc.springsKept++; usable.push(v);
      const series = v.map((t, i) => ({ iso: K.toISO(MAR1 + i, y), t }));
      for (const [t, arr] of [[40, x40], [60, x60]]) { const s = S.settled(series, S.THRESHOLDS[t]); arr.push(s ? K.fromISO(s.iso) : -1); }
    }
    if (!usable.length) continue;
    const st = byId[id];
    STATIONS.push({ id, serial: st.serial, n: st.name, county: st.county, lat: st.lat, lon: st.lon });
    const h = { x40, x60 };
    if (usable.length >= 5) {
      h.curve = []; h.lo = []; h.hi = [];
      for (let p = 0; p < 25; p++) {
        const c = p * 5, vals = [];
        for (const v of usable) { const w = v.slice(Math.max(0, c - 2), Math.min(N, c + 3)).filter(t => t !== null); if (w.length >= 3) vals.push(w.reduce((a, b) => a + b, 0) / w.length); }
        h.curve.push(vals.length >= 5 ? r1(median(vals)) : null); h.lo.push(vals.length >= 5 ? r1(quant(vals, 0.25)) : null); h.hi.push(vals.length >= 5 ? r1(quant(vals, 0.75)) : null);
      }
    }
    HISTORY[id] = h;
  }
  STATIONS.sort((a, b) => a.n.localeCompare(b.n));
  return { Y0: raw.years[0], Y1: raw.years[raw.years.length - 1], fetched: raw.fetched, qc, STATIONS, HISTORY };
}

export function render(d) {
  return `/* Michigan soil temperature history for /michigan-soil-temperature/. GENERATED by
 * scripts/build-soil-history.mjs from data/garden/msu-soil-2in-daily.json; do not edit by hand.
 * Source: MSU Enviroweather (Michigan Automated Weather Network) station soil temperature at 2 inches,
 * daily average of the daily low and high, springs ${d.Y0} to ${d.Y1}, downloaded ${d.fetched}.
 * HISTORY[id].x40 / x60: for each spring from ${d.Y0}, the day of year (0 = Jan 1, common year) from which
 * the soil stayed at 40°F or warmer / above 60°F through June 30. 59 = already warm on Mar 1, -1 = not by
 * June 30, null = no usable record that spring. curve / lo / hi: median and middle half of past springs,
 * every 5 days from Mar 1. Quality checks: ${d.qc.springsKept} springs kept, ${d.qc.springsDropped} dropped for gaps or a faulty sensor; ${d.qc.daysSpike} days dropped as sensor spikes, ${d.qc.daysOutOfRange} out of range. */
(function (root) {
  'use strict';
  root.MISoilData = {
    Y0: ${d.Y0}, Y1: ${d.Y1}, FETCHED: ${JSON.stringify(d.fetched)},
    QC: ${JSON.stringify(d.qc)},
    STATIONS: ${JSON.stringify(d.STATIONS)},
    HISTORY: ${JSON.stringify(d.HISTORY)}
  };
})(typeof window !== 'undefined' ? window : globalThis);
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const text = render(build(JSON.parse(fs.readFileSync(RAW, 'utf8'))));
  if (process.argv.includes('--check')) {
    const same = fs.existsSync(OUT) && fs.readFileSync(OUT, 'utf8') === text;
    console.log(same ? 'michigan-soil-data.js matches the measured record' : 'michigan-soil-data.js is out of date: run node scripts/build-soil-history.mjs');
    if (!same) process.exitCode = 1;
  } else { fs.writeFileSync(OUT, text); console.log('wrote', path.relative(root, OUT), (text.length / 1024).toFixed(1) + ' KB'); }
}
