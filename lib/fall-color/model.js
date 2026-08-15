// Shared climatology + live-blend model. Produces a grounded per-region snapshot.
const MONTHS = { 9: "Sep", 10: "Oct", 11: "Nov" }, OFF = { 9: 0, 10: 30, 11: 61 };
function dayIndex(m, d) { return OFF[m] + (d - 1); }
function idxToDate(i) { if (i < 30) return { m: 9, d: i + 1 }; if (i < 61) return { m: 10, d: i - 30 + 1 }; return { m: 11, d: i - 61 + 1 }; }
function fmt(i) { const o = idxToDate(i); return MONTHS[o.m] + " " + o.d; }
function lerp(a, b, t) { return a + (b - a) * Math.min(1, Math.max(0, t)); }

function stageOf(r, i) {
  const g = dayIndex(r.green[0], r.green[1]), ps = dayIndex(r.peakStart[0], r.peakStart[1]),
        pe = dayIndex(r.peakEnd[0], r.peakEnd[1]), b = dayIndex(r.bare[0], r.bare[1]);
  let pct, phase;
  if (i < g) { pct = 6; phase = "green"; }
  else if (i < ps) { pct = lerp(15, 88, (i - g) / (ps - g)); phase = "rising"; }
  else if (i <= pe) { pct = lerp(92, 100, (i - ps) / Math.max(1, pe - ps)); phase = "peak"; }
  else if (i <= b) { pct = lerp(88, 14, (i - pe) / (b - pe)); phase = "falling"; }
  else { pct = 7; phase = "down"; }
  return { pct: Math.round(pct), phase, ps, pe, b };
}
function labelOf(pct, phase) {
  if (phase === "green") return "Still green";
  if (phase === "peak") return "At peak";
  if (phase === "rising") return pct < 45 ? "Color starting" : pct < 78 ? "Approaching peak" : "Nearly peak";
  if (phase === "falling") return pct >= 78 ? "Just past peak" : pct >= 45 ? "Fading" : "Past peak";
  return "Leaves down";
}
function weatherAdjust(w) {
  if (!w) return { days: 0 };
  let days = Math.round((w.coolNights - 3) * 0.6);
  if (w.frostRecent) days += 1;
  if (w.hardFreezeRecent) days += 4;
  return { days: Math.max(-3, Math.min(6, days)) };
}
function ndviStage(s) {
  if (s <= 0.55) return { pct: Math.round(lerp(5, 98, s / 0.55)), phase: s < 0.12 ? "green" : "rising" };
  return { pct: Math.round(lerp(95, 15, (s - 0.55) / 0.45)), phase: "falling" };
}
function daysSince(dateStr) { return (Date.now() - new Date(dateStr + "T00:00:00Z").getTime()) / 86400000; }
function etParts() {
  const p = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Detroit" }));
  return { m: p.getMonth() + 1, d: p.getDate() };
}
function clampIdx(i) { if (!Number.isFinite(i)) return 0; return Math.max(0, Math.min(75, i)); }

function weatherFeel(forecast) {
  if (!forecast || !forecast.length) return null;
  const next = forecast.slice(0, 3);
  const codes = next.map((d) => d.code);
  const rainy = codes.some((c) => (c >= 51 && c <= 67) || (c >= 80 && c <= 82) || c >= 95);
  const clear = codes.filter((c) => c === 0 || c === 1).length >= 2;
  const his = next.map((d) => d.hi).filter((x) => typeof x === "number");
  const los = next.map((d) => d.lo).filter((x) => typeof x === "number");
  let s = rainy ? "some rain in the next few days" : clear ? "mostly clear skies" : "mixed skies";
  if (his.length) s += ", highs near " + Math.round(Math.max(...his));
  if (los.length) s += ", lows near " + Math.round(Math.min(...los));
  return s;
}

// How much a MODIS reading is allowed to move the number, by its age. The ORNL subset
// service runs 65 to 75 days behind, so in practice this is usually zero during the
// season. It is a ramp rather than the old hard 30 day cutoff so that a reading does not
// silently vanish the day it crosses a threshold, and so callers can report what actually
// drove the figure.
function ndviWeight(ageDays) {
  if (!Number.isFinite(ageDays) || ageDays < 0) return 0;
  if (ageDays <= 20) return 1;
  if (ageDays >= 45) return 0;
  return (45 - ageDays) / 25;
}

function snapshotFor(r, cond, anchor) {
  const t = etParts();
  // The PhenoCam anchor shifts the whole climatology curve by however many days this
  // autumn is running ahead of or behind its own history. Climatology cannot know that
  // about itself; two canopy cameras reporting at two days latency can.
  const shift = anchor && Number.isFinite(anchor.shift) ? anchor.shift : 0;
  const ti = clampIdx(dayIndex(t.m, t.d) + shift);
  const pred = stageOf(r, ti);
  const w = cond && cond.weather, nd = cond && cond.ndvi;
  const adj = weatherAdjust(w);
  const wAdj = stageOf(r, clampIdx(ti + adj.days));
  let pct = wAdj.pct, phase = wAdj.phase;

  const age = nd ? (Number.isFinite(nd.ageDays) ? nd.ageDays : daysSince(nd.date)) : null;
  const nw = nd && typeof nd.senescence === "number" ? ndviWeight(age) : 0;
  if (nw > 0) {
    const ns = ndviStage(nd.senescence);
    const share = 0.4 * nw;
    pct = Math.round((1 - share) * wAdj.pct + share * ns.pct);
    phase = (ns.phase === "falling" && pct >= 78) ? "falling" : wAdj.phase;
  }

  // What actually produced this number, so the page and the daily note can say so.
  const drivers = ["regional climatology"];
  if (adj.days) drivers.push("recent weather");
  if (shift) drivers.push("canopy camera anchor");
  if (nw > 0) drivers.push("MODIS canopy greenness");

  return {
    id: r.id, name: r.name, area: r.area, pct, phase, label: labelOf(pct, phase),
    canopyPct: nd ? nd.canopyPct : null,
    lowestRecent: w ? w.lowestRecent : null,
    frost: w ? !!w.frostRecent : false,
    hardFreeze: w ? !!w.hardFreezeRecent : false,
    peakWindow: fmt(pred.ps) + " to " + fmt(pred.pe),
    weatherFeel: weatherFeel(cond && cond.forecast),
    drive: r.drive, hike: r.hike, paddle: r.paddle, note: r.note,
    source: {
      drivers,
      anchorShiftDays: shift,
      anchorConfidence: (anchor && anchor.confidence) || "none",
      satelliteAgeDays: age,
      satelliteWeight: Math.round(nw * 100) / 100,
    },
  };
}

function isFallReportSeason(m, d) {
  if (m === 8) return d >= 20;
  if (m === 9 || m === 10) return true;
  if (m === 11) return d <= 15;
  return false;
}

function inSeason() {
  const { m, d } = etParts();
  return isFallReportSeason(m, d);
}

module.exports = { snapshotFor, inSeason, isFallReportSeason, etParts, ndviWeight };
