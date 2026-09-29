"use strict";
// Mackinac Island day sheet (Sep 29 2026).
//
// Chris: "plan something someone would use to solve for the complexities of Mackinac Island."
// The engine already knows the hard facts: which ferry you can make from your city, every
// published boat back, Fort hours, the crowd windows, weather, events, sunset and which
// restaurants are still open. This module turns those facts into the one thing a visitor
// follows on the day: when to leave, where to park, which boat, what to do in what order,
// the boat back, the last boat on your line and when you get home.
//
// Guarantees (tests/mackinac-day-sheet.test.js):
//  - nobody is told to leave home before the time they chose (the page defaults to 6 AM);
//  - a day trip that gets a full plan has at least 3 Island stops, each open when you are there;
//  - every stop ends before you need to be back at the dock;
//  - "last boat" means the last boat of the ferry line you bought tickets for;
//  - at most 3 heads-ups, each about something that changes the day.

const catalog = require("./catalog");

const MODES = ["foot", "bike", "carriage"];
const PARTIES = ["solo", "couple", "group", "family-young", "family-teens", "grandparents"];
const DOCK_BUFFER = 25;       // be back at the Island dock this long before the boat home
const WALK_OFF = 10;          // step off the boat and get going
const CAR_BUFFER = 10;        // mainland dock to the car
const ROAD_BUFFER = 15;       // same road buffer the engine adds to drive estimates
const MICT_URL = "https://www.mict.com/carriage-tours/";
const GRAND = catalog.LODGING.find(x => x.id === "grand-hotel");

function pad2(n) { return String(n).padStart(2, "0"); }
function clock(minutes) {
  const n = ((Math.round(Number(minutes)) % 1440) + 1440) % 1440;
  let h = Math.floor(n / 60); const m = n % 60;
  const suffix = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${h}:${pad2(m)} ${suffix}`;
}
function parseClock(value) {
  const m = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]) % 12; if (m[3].toUpperCase() === "PM") h += 12;
  return h * 60 + Number(m[2]);
}
function span(minutes) {
  const m = Math.max(0, Math.round(Number(minutes) / 5) * 5);
  const h = Math.floor(m / 60), r = m % 60;
  if (!h) return `${r} min`;
  return r ? `${h} hr ${r} min` : `${h} hr`;
}
function hours(minutes) {
  const h = Math.round(Number(minutes) / 30) / 2;
  return `${h % 1 ? h.toFixed(1) : h} hour${h === 1 ? "" : "s"}`;
}
function addDays(date, days) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days, 12));
  return `${dt.getUTCFullYear()}-${pad2(dt.getUTCMonth() + 1)}-${pad2(dt.getUTCDate())}`;
}
function dateLabel(date, style = "long") {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: style, month: style === "long" ? "long" : "short", day: "numeric" }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
function shortPlace(label) { return String(label || "").replace(/,\s*[A-Z]{2}$/, ""); }

function choicesFromQuery(q = {}) {
  const mode = MODES.includes(String(q.go)) ? String(q.go) : "foot";
  const party = PARTIES.includes(String(q.who)) ? String(q.who) : "couple";
  return { mode, party };
}

// The engine fields the simple choices imply, filled only where the request left them unset,
// so the ferry choice itself responds (kids and easy pace favor a shorter day, bikes weigh wind).
function expandQuery(q = {}) {
  if (q.go == null && q.who == null) return q;
  const { mode, party } = choicesFromQuery(q);
  const out = { ...q };
  const set = (k, v) => { if (out[k] == null || out[k] === "") out[k] = v; };
  if (mode === "bike") set("bikes", "rent");
  if (mode === "carriage") set("must_do", "carriage");
  set("adults", String({ solo: 1, couple: 2, group: 4, "family-young": 2, "family-teens": 4, grandparents: 4 }[party]));
  if (party === "family-young") { set("children", "2"); set("pace", "easy"); }
  if (party === "grandparents") set("pace", "easy");
  if (party === "family-teens" || party === "group") set("pace", "active");
  return out;
}

// Mackinac Island Carriage Tours publishes an "early May - late October" season.
// Treated as running May 8 to Oct 25, with the last week flagged to check.
function carriageSeason(date) {
  const md = date.slice(5);
  if (md < "05-08" || md > "10-25") return "closed";
  return md >= "10-19" || md < "05-15" ? "check" : "open";
}
function grandOpen(date) {
  if (!GRAND || !GRAND.closing_2026 || !date.startsWith("2026-")) return true;
  return date <= GRAND.closing_2026;
}
function diningOpen(item, date) {
  if (!item.closing_2026 || !date.startsWith("2026-")) return true;
  return date <= item.closing_2026;
}

// ---------- Island stops ----------
// Each block: title, note, dur (minutes including getting there), min (shortest useful
// version), window [earliest start, latest end], prio (1 keep, 2 good, 3 if time), zone.
function blockLibrary({ date, mode, party, attractions, sunset, beforeBoat = true }) {
  const fortRow = (attractions || []).find(a => a.name === "Fort Mackinac");
  const fortOpen = fortRow && fortRow.status !== "closed" ? parseClock(fortRow.open_time) : null;
  const fortClose = fortRow && fortRow.status !== "closed" ? parseClock(fortRow.close_time) : null;
  const holmesRow = (attractions || []).find(a => a.name === "Fort Holmes Blockhouse");
  const holmesOpen = holmesRow && holmesRow.status !== "closed" ? [parseClock(holmesRow.open_time), parseClock(holmesRow.close_time)] : null;
  const kids = party === "family-young";
  const easy = party === "grandparents" || kids;
  const dusk = Number.isFinite(sunset) ? sunset : 19 * 60;
  const tours = carriageSeason(date);
  const lib = {};
  if (Number.isFinite(fortOpen) && Number.isFinite(fortClose)) {
    lib.fort = {
      id: "fort", title: "Fort Mackinac", zone: "fort", prio: 1,
      dur: kids ? 75 : 90, min: 60, window: [fortOpen, fortClose],
      // Only true when the carriage tour really is the stop before (see fillWindow).
      after_carriage: `The carriage tour leaves you at the top of the hill. Open ${clock(fortOpen)}–${clock(fortClose)} today; walk down to town when you’re done.`,
      note: party === "grandparents" || mode === "carriage"
          ? `Up a steep ramp from Marquette Park, about 0.4 mile. Open ${clock(fortOpen)}–${clock(fortClose)} today. Allow about 1½ hours.`
          : `Walk up from Marquette Park, about 0.4 mile and steep. Open ${clock(fortOpen)}–${clock(fortClose)} today. Allow about ${kids ? "1¼ hours with kids" : "1½ hours"}.`
    };
  }
  if (mode !== "carriage" && party !== "grandparents") {
    lib.arch = {
      id: "arch", title: "Arch Rock", zone: "east-bluff", prio: 2, dur: kids ? 75 : 65, min: 50, window: [0, dusk],
      note: mode === "bike"
        ? "Leave the bikes at the bottom of the stairs on the shore road and climb up to the arch."
        : "Follow the signs uphill through the state park to the arch above the lake. Allow about an hour there and back."
    };
  }
  if (mode === "bike") {
    lib.loop = {
      id: "loop", title: "Bike the shore loop (M-185)", zone: "shore", prio: 1,
      dur: kids ? 125 : party === "family-teens" || party === "group" ? 100 : 115, min: 90, window: [8 * 60, dusk - 30],
      note: `Rent bikes by the docks. 8.2 flat miles with no cars, about 2 hours with stops at British Landing and the Arch Rock stairs.${kids ? " Shops rent trailers and tag-alongs." : ""}`
    };
    delete lib.arch;
  }
  if (mode === "carriage" && tours !== "closed") {
    lib.carriage = {
      id: "carriage", title: "Carriage tour", zone: Number.isFinite(fortOpen) ? "fort" : "downtown", prio: 1,
      dur: 110, min: 105, window: [9 * 60, 17 * 60 + 30],
      note: `Tickets on Main Street; board the next carriage (no reservations). About 1¾ hours with stops at Surrey Hills, the butterfly conservatory and Arch Rock.${Number.isFinite(fortOpen) ? " Get off at Fort Mackinac." : ""}${tours === "check" ? " Tours run into late October; check the day’s times." : ""}`,
      source_url: MICT_URL
    };
  }
  if (grandOpen(date) && party !== "grandparents") {
    lib.grand = {
      id: "grand", title: "Grand Hotel porch and the West Bluff", zone: "west-bluff", prio: 3, dur: 60, min: 45, window: [10 * 60, 17 * 60 + 30],
      note: mode === "bike"
        ? "Ride or walk up the hill west of town. Non-guests pay to visit the porch; the cottages on West Bluff Road are free to see."
        : "About 15 minutes uphill west of town. Non-guests pay to visit the porch; the cottages on West Bluff Road are free to see."
    };
  }
  lib.main = {
    id: "main", title: kids ? "Main Street, fudge and Marquette Park" : "Main Street, fudge and the harbor", zone: "downtown", prio: 1, dur: 60, min: 30, max: 90, window: [0, 24 * 60],
    note: kids
      ? `Flat, close to the docks, and the park below the Fort is a good place for kids to run around.${beforeBoat ? " Buy fudge on the way to the boat." : ""}`
      : beforeBoat
      ? "Flat and close to the docks, so it’s the easy last stop. Buy fudge on the way to the boat."
      : "Flat and close to the hotels. Downtown gets quieter once the last day boats leave."
  };
  lib.mission = {
    id: "mission", title: "Mission Point and the east shore", zone: "east-shore", prio: 3, dur: 60, min: 45, window: [8 * 60, dusk],
    note: "A flat walk east along the water from downtown to the lawn at Mission Point."
  };
  if (holmesOpen && !easy && mode !== "carriage") {
    lib.holmes = {
      id: "holmes", title: mode === "bike" ? "Ride the interior: Fort Holmes and Sugar Loaf" : "Fort Holmes, the Island’s high point",
      zone: "interior", prio: 3, dur: mode === "bike" ? 105 : 90, min: 75, window: [holmesOpen[0], holmesOpen[1]],
      note: mode === "bike"
        ? "Hillier than the shore loop: inland roads past Sugar Loaf to the old fort at the top of the Island."
        : `A climb through the woods behind Fort Mackinac to the highest point on the Island. Blockhouse open ${clock(holmesOpen[0])}–${clock(holmesOpen[1])}.`
    };
  }
  return lib;
}

function mealPick(meal, zone, party, date, used) {
  const pool = catalog.DINING.filter(d => d.meal.includes(meal) && diningOpen(d, date) && !used.has(d.id));
  if (meal === "lunch" && zone === "fort") { const f = pool.find(d => d.id === "fort-tea-room"); if (f) return f; }
  const order = party === "family-young"
    ? ["mighty-mac", "douds-picnic", "great-turtle"]
    : meal === "dinner"
      ? (party === "group" || party === "family-teens" ? ["pink-pony", "great-turtle", "mighty-mac"] : ["carriage-house", "1852-grill-room", "great-turtle", "pink-pony"])
      : (party === "group" || party === "family-teens" ? ["pink-pony", "great-turtle", "mighty-mac"] : ["great-turtle", "pink-pony", "douds-picnic"]);
  for (const id of order) { const d = pool.find(x => x.id === id && x.id !== "fort-tea-room"); if (d) return d; }
  return pool.find(d => d.id !== "fort-tea-room" && d.id !== "woods") || null;
}
function mealBlock(meal, zone, party, date, used) {
  const d = mealPick(meal, zone, party, date, used);
  const kids = party === "family-young";
  const dur = meal === "dinner" ? 80 : kids ? 65 : 55;
  if (!d) {
    return { id: meal, title: meal === "dinner" ? "Dinner downtown" : "Lunch downtown", zone: "downtown", dur, note: "Fewer places are open this time of year. Doud’s Market is open year-round." };
  }
  const where = d.id === "fort-tea-room" ? "At the Fort, looking over the harbor" : d.district;
  const easyWithKids = kids && Number(d.fit?.kids_priority) >= .8 ? " Easy with kids." : "";
  const closing = d.closing_2026 && date.startsWith("2026-") ? ` Open through ${dateLabel(d.closing_2026, "short").replace(/^\w+, /, "")}.` : d.season_status === "check" ? " Check hours for your date." : "";
  return { id: meal, title: `${meal === "dinner" ? "Dinner" : "Lunch"}: ${d.name}`, zone: d.id === "fort-tea-room" ? "fort" : "downtown", dur, place_id: d.id, source_url: d.source_url, note: `${where}. ${d.style[0].toUpperCase()}${d.style.slice(1)}.${easyWithKids}${closing}${meal === "dinner" ? " Book ahead on weekends." : ""}` };
}

// Greedy placement through one window of Island time. At each step, take the first queued
// stop that is open now and fits; lunch goes first once it's lunchtime; Main Street is kept
// for the end, next to the boat. A gap before something opens becomes coffee on Main Street.
function fillWindow({ start, end, queue, party, date, used, lunch = true, maxStops = 99, breakfast = false }) {
  const rows = [];
  let t = start, zone = "downtown", stops = 0;
  const pending = queue.slice();
  const tailId = pending.some(b => b.id === "main") ? "main" : null;
  let lunchDone = !lunch;
  // Lunch at the Fort Tea Room keeps you at the top of the hill, so it doesn't break the chain.
  const atFortAfterRide = () => { const r = rows.filter(x => x.place_id !== "fort-tea-room"); return r.length > 0 && r[r.length - 1].id === "carriage"; };
  const place = (b, dur) => { if (b.place_id) used.add(b.place_id); if (b.id !== "lunch" && b.id !== "dinner" && b.id !== "breakfast") stops++; rows.push({ minute: t, time: clock(t), kind: b.id === "lunch" || b.id === "dinner" ? "meal" : "stop", id: b.id, title: b.title, note: b.after_carriage && atFortAfterRide() ? b.after_carriage : b.note, end_minute: t + dur, ...(b.place_id ? { place_id: b.place_id } : {}), ...(b.source_url ? { source_url: b.source_url } : {}) }); t += dur; zone = b.zone || zone; };
  // An early boat lands before anything opens: breakfast first, then up the hill.
  if (breakfast && t < 8 * 60 + 30 && end - t > 240) place({ id: "breakfast", title: "Breakfast downtown", zone: "downtown", note: "The Island is at its quietest before the day boats arrive." }, 45);
  for (let guard = 0; guard < 40 && t < end; guard++) {
    const tailReserve = tailId && pending.some(b => b.id === tailId) ? pending.find(b => b.id === tailId).min : 0;
    const limit = end - tailReserve;
    // Lunch goes first once it's lunchtime, unless eating now would lose a must-see stop that
    // closes soon (a 2 PM arrival sees the Fort before it closes, then eats).
    const closing = pending.some(b => b.id !== tailId && b.prio === 1 && t >= b.window[0] - 5 && t + b.min <= Math.min(limit, b.window[1]) && t + 55 + b.min > Math.min(limit, b.window[1]));
    if (!lunchDone && !closing && t >= 11 * 60 + 15 && t <= 14 * 60 + 15 && t + 45 <= limit) {
      const m = mealBlock("lunch", zone, party, date, used);
      const dur = Math.min(m.dur, limit - t);
      if (dur >= 40) { place(m, dur); lunchDone = true; continue; }
    }
    let chosen = null, dur = 0;
    for (const b of pending) {
      if (b.id === tailId || stops >= maxStops) continue;
      if (t < b.window[0] - 5) continue;
      const stop = Math.min(limit, b.window[1]);
      const fit = Math.min(b.dur, stop - Math.max(t, b.window[0]));
      if (fit >= b.min) { chosen = b; dur = fit; break; }
    }
    if (chosen) {
      if (t < chosen.window[0]) t = chosen.window[0];
      pending.splice(pending.indexOf(chosen), 1);
      place(chosen, dur);
      continue;
    }
    // Nothing can start now. Wait for the next opening if it is soon; otherwise finish.
    const next = pending.filter(b => b.id !== tailId && b.window[0] > t && b.window[0] + b.min <= Math.min(limit, b.window[1])).sort((a, b) => a.window[0] - b.window[0])[0];
    if (next && next.window[0] - t <= 150) {
      const gap = next.window[0] - t;
      if (gap >= 25) rows.push({ minute: t, time: clock(t), kind: "stop", id: "coffee", title: "Coffee and a quiet Main Street", note: "The Island is at its calmest before the first day boats arrive.", end_minute: next.window[0] });
      t = next.window[0];
      continue;
    }
    break;
  }
  const tail = tailId && pending.find(b => b.id === tailId);
  if (tail && end - t >= tail.min) {
    const dur = Math.min(tail.max || tail.dur, end - t);
    pending.splice(pending.indexOf(tail), 1);
    place(tail, dur);
  }
  // The carriage tour can drop you at the Fort. Only say so when the Fort is the next stop.
  const ride = rows.findIndex(r => r.id === "carriage");
  const nextStop = ride >= 0 ? rows.slice(ride + 1).find(r => r.place_id !== "fort-tea-room") : null;
  if (ride >= 0 && nextStop?.id !== "fort") rows[ride].note = rows[ride].note.replace(" Get off at Fort Mackinac.", " Ride it back to town.");
  return { rows, t, remaining: pending, lunchDone };
}

function queueFor(lib, mode, { arrivalDay = true, early = false } = {}) {
  const pick = ids => ids.map(id => lib[id]).filter(Boolean);
  if (mode === "bike") return pick(["loop", "fort", "grand", "holmes", "mission", "main"]);
  if (mode === "carriage") return lib.carriage ? pick(["carriage", "fort", "grand", "mission", "main"]) : pick(["fort", "mission", "grand", "main"]);
  // On foot, an early start does Arch Rock first (always open) and comes down past the Fort.
  return early && lib.arch && lib.fort ? pick(["arch", "fort", "grand", "mission", "holmes", "main"]) : pick(["fort", "arch", "grand", "mission", "holmes", "main"]);
}

function lastOnLine(options, operator) {
  const mine = (options || []).filter(r => r.operator === operator);
  return mine.length ? mine.reduce((a, b) => (a.departure_minutes > b.departure_minutes ? a : b)) : null;
}

function weatherNote(hourly, date, from, to, localParts) {
  if (!Array.isArray(hourly) || !hourly.length || typeof localParts !== "function") return null;
  const rows = hourly.filter(h => { const p = localParts(new Date(h.start)); return p.date === date && p.hour * 60 >= from - 59 && p.hour * 60 <= to; });
  if (!rows.length) return null;
  const wet = rows.filter(h => Number(h.precipitation_probability) >= 50);
  const windy = rows.reduce((a, h) => Math.max(a, Number(h.wind_mph) || 0), 0);
  return { wet_from: wet.length ? localParts(new Date(wet[0].start)).hour * 60 : null, pop: Math.max(0, ...rows.map(h => Number(h.precipitation_probability) || 0)), wind: windy };
}

function build(input = {}) {
  const { choices = {}, profile = {}, plan = null, records = [], stayReturn = null, targetDate, planningMode, planningReason, facts = {} } = input;
  const mode = MODES.includes(choices.mode) ? choices.mode : "foot";
  const party = PARTIES.includes(choices.party) ? choices.party : "couple";
  const overnight = profile.trip === "overnight";
  const nights = overnight ? Math.max(1, Number(profile.nights) || 1) : 0;
  const origin = profile.origin_preset ? { label: profile.origin_preset.label, short: shortPlace(profile.origin_preset.label) } : null;
  const sheet = { version: 1, choices: { mode, party, stay: overnight ? String(nights) : "day" }, date: targetDate, date_label: targetDate ? dateLabel(targetDate) : null, notice: planningMode === "tomorrow" ? planningReason : null, origin: origin ? origin.label : null, days: [], heads_up: [], sources: [] };
  if (!plan || !plan.outbound) {
    sheet.headline = "No boat works for this day";
    sheet.summary = planningReason || "The published schedule has no trip that fits. Try an earlier start or another day.";
    sheet.empty = true;
    return sheet;
  }
  const out = plan.outbound;
  const port = out.origin_port;
  const operator = out.operator;
  const drive = Number.isFinite(plan.mainland_drive_minutes) ? plan.mainland_drive_minutes : null;
  const leave = origin && Number.isFinite(plan.trip_start_minutes) ? plan.trip_start_minutes : null;
  const dockBy = out.departure_minutes - (out.checkin_buffer_minutes || 30);
  const arrival = out.arrival_minutes;
  const used = new Set();
  const heads = [];
  const say = (prio, kind, text, action) => heads.push({ prio, kind, text, ...(action ? { action } : {}) });
  const firstDay = [];

  if (leave != null) firstDay.push({ minute: leave, time: clock(leave), kind: "drive", id: "leave", title: `Leave ${origin.short}`, note: `About ${span(drive)} to the ${port} dock. Drive times are estimates, not live traffic.` });
  firstDay.push({ minute: dockBy, time: clock(dockBy), kind: "dock", id: "dock", title: `At the ${operator} dock in ${port}`, note: overnight ? `Park in the ${operator} lot (ask for overnight parking) and buy tickets; they’re good on any ${operator} boat.` : `Park in the ${operator} lot and buy tickets; they’re good on any ${operator} boat.` });
  firstDay.push({ minute: out.departure_minutes, time: out.departure_time, kind: "boat", id: "boat-out", title: "Boat to the Island", note: `${operator}, about ${out.crossing_duration} minutes across. You land downtown at ${out.arrival_time}.` });

  const sunsetOn = typeof facts.sunsetOn === "function" ? facts.sunsetOn : () => 19 * 60 + 15;
  const attractionsOn = typeof facts.attractionsOn === "function" ? facts.attractionsOn : () => [];
  const eventsOn = typeof facts.eventsOn === "function" ? facts.eventsOn : () => [];

  let returnRow = null, homeMinute = null, islandMinutes = null, back = null, last = null, lastIsBack = false;

  if (!overnight) {
    // Day trip: start from the engine's return, then two corrections a local would make.
    // 1. Don't plan on the last boat of your own line when an earlier one still leaves 5+ hours.
    // 2. A long drive home: get home by 11 PM if an earlier boat still leaves 4.5+ hours (4 with young kids).
    const backs = records.filter(r => r.direction === "from-island" && r.destination_port === port && r.operator === operator).sort((a, b) => a.departure_minutes - b.departure_minutes);
    last = lastOnLine(backs, operator);
    back = plan.return || null;
    const homeFor = r => (drive != null ? r.arrival_minutes + CAR_BUFFER + drive + ROAD_BUFFER : null);
    if (back && last && back.departure_minutes === last.departure_minutes) {
      const earlier = backs.filter(r => r.departure_minutes < last.departure_minutes && r.departure_minutes - arrival >= 300);
      if (earlier.length) back = earlier[earlier.length - 1];
    }
    const floor = party === "family-young" ? 240 : 270;
    if (back && drive != null && homeFor(back) > 23 * 60) {
      const better = backs.filter(r => r.departure_minutes - arrival >= floor && r.departure_minutes <= back.departure_minutes && homeFor(r) <= 23 * 60);
      if (better.length) back = better[better.length - 1];
    }
    if (!back) {
      sheet.headline = "No boat back works for this day";
      sheet.summary = "Every boat back leaves too early for a real visit. Try an earlier start or stay the night.";
      sheet.empty = true;
      return sheet;
    }
    islandMinutes = back.departure_minutes - arrival;
    const lib = blockLibrary({ date: targetDate, mode, party, attractions: attractionsOn(targetDate), sunset: sunsetOn(targetDate) });
    const start = arrival + WALK_OFF;
    const end = back.departure_minutes - DOCK_BUFFER;
    const filled = fillWindow({ start, end, queue: queueFor(lib, mode, { early: start < 9 * 60 + 15 }), party, date: targetDate, used, breakfast: true });
    firstDay.push(...filled.rows);
    lastIsBack = last && last.departure_minutes === back.departure_minutes;
    const earlier = backs.filter(r => r.departure_minutes < back.departure_minutes && r.departure_minutes - DOCK_BUFFER >= (filled.rows.length ? filled.rows[filled.rows.length - 1].end_minute : start)).pop();
    returnRow = { minute: back.departure_minutes, time: back.departure_time, kind: "boat", id: "boat-back", title: "Boat back", note: lastIsBack ? `Be at the dock by ${clock(end)}. This is the last ${operator} boat today.` : `Be at the dock by ${clock(end)}. Last ${operator} boat: ${last ? last.departure_time : "see schedule"}.${earlier ? ` Done early? The ${earlier.departure_time} goes too.` : ""}` };
    firstDay.push(returnRow);
    if (drive != null) {
      homeMinute = homeFor(back);
      firstDay.push({ minute: homeMinute, time: clock(homeMinute), kind: "home", id: "home", title: homeMinute >= 24 * 60 ? `Home around ${clock(homeMinute)} (after midnight)` : `Home around ${clock(homeMinute)}`, note: `About ${span(drive)} from ${port}.` });
    }
    sheet.days.push({ date: targetDate, label: dateLabel(targetDate), rows: firstDay });

    const longDrive = drive != null && drive >= 225 && (homeMinute > 22 * 60 + 30 || islandMinutes < 330);
    if (longDrive) {
      say(2, "drive", `That’s about ${span(drive * 2 + 2 * ROAD_BUFFER)} of driving for ${hours(islandMinutes)} on the Island. A night here makes it a much better trip.`, { label: "Make it one night", set: { stay: "1" } });
    } else if (plan.short_visit || islandMinutes < 240) {
      const lateToday = facts.sameDay && Number.isFinite(facts.nowMinutes) && (leave != null ? leave - facts.nowMinutes < 45 : dockBy - facts.nowMinutes < 45);
      say(1, "short", `A short visit: about ${hours(islandMinutes)} on the Island.${lateToday ? " Tomorrow gives you a full day." : leave != null ? " Leaving earlier gives you a full day." : " An earlier boat gives you a full day."}`,
        lateToday ? { label: "Plan tomorrow", set: { day: addDays(targetDate, 1) } } : leave != null && Number(profile.not_before_minutes) > 6 * 60 ? { label: "Leave at 6 AM", set: { leave: "06:00" } } : null);
    }
    if (lastIsBack) say(1, "last-boat", `${back.departure_time} is the last ${operator} boat back today. Don’t miss it.`);
  } else {
    // Overnight: arrival day, full middle days, and a return day ending on a real boat back.
    const returnDate = stayReturn?.return_date || addDays(targetDate, nights);
    const options = (stayReturn?.options || []).filter(r => r.operator === operator).sort((a, b) => a.departure_minutes - b.departure_minutes);
    last = lastOnLine(options, operator);
    const homeFor = r => (drive != null ? r.arrival_minutes + CAR_BUFFER + drive + ROAD_BUFFER : null);
    const target = drive != null ? Math.min(16 * 60, Math.max(12 * 60, 20 * 60 - drive - ROAD_BUFFER - CAR_BUFFER - 20)) : 15 * 60;
    back = options.filter(r => r.departure_minutes <= target && r.departure_minutes >= 11 * 60).pop() || options.find(r => r.departure_minutes >= 11 * 60) || options[options.length - 1] || null;
    let queueState = null;
    const dates = Array.from({ length: nights + 1 }, (_, i) => addDays(targetDate, i));
    dates.forEach((date, i) => {
      const isFirst = i === 0, isLast = i === dates.length - 1;
      const sunset = sunsetOn(date);
      const lib = blockLibrary({ date, mode, party, attractions: attractionsOn(date), sunset, beforeBoat: isLast });
      // Carry what's still unseen into the next day, refreshing hours for that date.
      const base = queueFor(lib, mode, { early: !isFirst });
      const queue = queueState ? base.filter(b => queueState.has(b.id) || b.id === "main") : base;
      const rows = isFirst ? firstDay : [];
      // Mornings on the Island start after hotel breakfast, still ahead of the first day boats.
      let start = isFirst ? arrival + WALK_OFF : 9 * 60;
      if (isFirst) {
        rows.push({ minute: start, time: clock(start), kind: "stay", id: "bags", title: "Drop your bags at the hotel", note: "There are no cars. Ask your hotel about dock porters when you book; many meet the boats.", end_minute: start + 20 });
        start += 20;
      }
      const dayEnd = isLast ? (back ? back.departure_minutes - DOCK_BUFFER : 14 * 60) : 17 * 60 + 30;
      // Spread the Island across the stay: a light arrival day, full-but-not-crammed middle
      // days, and whatever is left for the last morning.
      const filled = fillWindow({ start, end: dayEnd, queue: isLast ? queue : queue.filter(b => b.id !== "main" || isFirst), party, date, used, maxStops: isLast ? 99 : isFirst ? 3 : 4 });
      rows.push(...filled.rows);
      queueState = new Set(filled.remaining.map(b => b.id));
      if (!isLast) {
        const dinner = mealBlock("dinner", "downtown", party, date, used);
        if (dinner.place_id) used.add(dinner.place_id);
        const dinnerAt = Math.max(filled.t, 17 * 60 + 45);
        const evening = [{ minute: dinnerAt, time: clock(dinnerAt), kind: "meal", id: "dinner", title: dinner.title, note: dinner.note, end_minute: dinnerAt + dinner.dur, ...(dinner.place_id ? { place_id: dinner.place_id } : {}) }];
        const ss = sunset - 15;
        if (ss >= filled.t && ss + 30 <= dinnerAt) evening.unshift({ minute: ss, time: clock(ss), kind: "stop", id: "sunset", title: "Sunset at Windermere Point", note: `Sunset is at ${clock(sunset)}, at the west end of the harbor.`, end_minute: ss + 30 });
        else if (ss >= dinnerAt + dinner.dur - 10) evening.push({ minute: ss, time: clock(ss), kind: "stop", id: "sunset", title: "Sunset at Windermere Point", note: `Sunset is at ${clock(sunset)}, at the west end of the harbor.`, end_minute: ss + 30 });
        rows.push(...evening);
      }
      if (isLast && back) {
        lastIsBack = last && last.departure_minutes === back.departure_minutes;
        returnRow = { minute: back.departure_minutes, time: back.departure_time, kind: "boat", id: "boat-back", title: "Boat back", note: `Be at the dock by ${clock(back.departure_minutes - DOCK_BUFFER)}. ${lastIsBack ? `This is the last ${operator} boat that day.` : `Last ${operator} boat: ${last ? last.departure_time : "see schedule"}.`}` };
        rows.push(returnRow);
        if (drive != null) {
          homeMinute = homeFor(back);
          rows.push({ minute: homeMinute, time: clock(homeMinute), kind: "home", id: "home", title: `Home around ${clock(homeMinute)}`, note: `About ${span(drive)} from ${port}.` });
        }
      }
      sheet.days.push({ date, label: dateLabel(date), title: isFirst ? "Arrive" : isLast ? "Last morning" : "Full Island day", rows });
    });
    if (!back) say(1, "no-return", `No published ${operator} boat back is listed for ${dateLabel(returnDate)} yet. Check the schedule before you go.`);
  }

  // ---------- Heads-ups ----------
  const tripDates = sheet.days.map(d => d.date);
  const closed = [];
  if (tripDates.some(d => !(attractionsOn(d) || []).some(a => a.name === "Fort Mackinac" && a.status !== "closed"))) closed.push("Fort Mackinac");
  if (mode === "carriage" && tripDates.every(d => carriageSeason(d) === "closed")) closed.push("the carriage tours");
  if (tripDates.some(d => !grandOpen(d))) closed.push("the Grand Hotel");
  if (closed.length) say(1, "closure", `${closed.length > 1 ? closed.slice(0, -1).join(", ") + " and " + closed[closed.length - 1] : closed[0]} ${closed.length > 1 ? "are" : "is"} closed for the season on your dates, so this plan leaves ${closed.length > 1 ? "them" : "it"} out.${mode === "carriage" && closed.includes("the carriage tours") ? " Downtown and the shore road are flat; the Fort and Arch Rock are uphill." : ""}`.replace(/^the /, "The "));
  const events = tripDates.flatMap(d => eventsOn(d)).filter((e, i, a) => a.findIndex(x => x.id === e.id) === i);
  for (const e of events) say(e.impact === "major" ? 2 : 4, "event", e.impact === "major" ? `${e.title} is on. Expect a busier Island, most of all 11:30 AM–3 PM.` : `${e.title} is on.`);
  const w = weatherNote(facts.hourly, targetDate, arrival, returnRow ? returnRow.minute : 20 * 60, facts.localParts);
  if (w && w.wet_from != null) say(2, "weather", `Rain chance up to ${w.pop}% from about ${clock(w.wet_from)}.${mode === "bike" ? " The shore loop has no cover; ride early." : " Bring a rain layer."}`);
  if (w && w.wind >= 22) say(2, "weather", `Wind up to ${w.wind} mph: a bumpy crossing${mode === "bike" ? " and a hard ride on the windward side" : ""}.`);
  if (facts.marine && facts.marine.comfort === "ROUGHER") say(2, "water", `Rough water on the Straits right now. Ferries rarely cancel, but check with ${operator} before you drive.`);
  if (party === "grandparents" && mode === "foot") say(2, "hills", "The Fort and Arch Rock are up a steep hill. The carriage tour takes you up instead.", { label: "Go by carriage", set: { go: "carriage" } });
  const closings = catalog.DINING.concat(catalog.LODGING).map(x => x.closing_2026).filter(Boolean).filter(c => tripDates.some(d => d.startsWith("2026-") && c >= d && c <= addDays(d, 7)));
  if (closings.length) say(3, "season", `Late season: many Island places close around ${dateLabel(closings.sort()[0], "short").replace(/^\w+, /, "")}. Check hours before you go.`);
  sheet.heads_up = heads.sort((a, b) => a.prio - b.prio).slice(0, 3).map(({ prio, ...h }) => h);

  // ---------- Headline ----------
  const lastDate = sheet.days[sheet.days.length - 1].date;
  sheet.headline = leave != null ? `Leave ${origin.short} by ${clock(leave)}` : `Be at the ${port} dock by ${clock(dockBy)}`;
  const parts = [`${operator} ${out.departure_time} boat from ${port}`];
  if (!overnight) parts.push(`about ${hours(islandMinutes)} on the Island`);
  else {
    parts.push(`${nights} night${nights === 1 ? "" : "s"}`);
    if (back) parts.push(`${back.departure_time} boat home ${dateLabel(lastDate).split(",")[0]}`);
  }
  if (homeMinute != null) parts.push(`home around ${clock(homeMinute)}`);
  sheet.summary = parts.join(" · ");
  sheet.boat = { operator, port, out: out.departure_time, lands: out.arrival_time, back: back ? back.departure_time : null, back_date: overnight ? lastDate : targetDate, last: last ? last.departure_time : null, dock_by: clock(dockBy) };
  sheet.leave_time = leave != null ? clock(leave) : null;
  sheet.home_time = homeMinute != null ? clock(homeMinute) : null;
  sheet.island_minutes = islandMinutes;
  sheet.stop_count = sheet.days.reduce((n, d) => n + d.rows.filter(r => r.kind === "stop" && r.id !== "coffee" && r.id !== "sunset").length, 0);
  sheet.sources = [
    { label: `${operator} 2026 schedule`, url: out.source_url || null },
    { label: "Fort Mackinac hours", url: "https://www.mackinacparks.com/visit/plan/seasonal-hours/" },
    ...(mode === "carriage" ? [{ label: "Carriage tours", url: MICT_URL }] : []),
    { label: "Island dining", url: "https://www.mackinacisland.org/dining/" }
  ].filter(s => s.url);
  sheet.truth = "Boat times come from the operators’ published 2026 schedules. Drive times are estimates, not live traffic. Crowd timing is modeled, not counted.";
  return sheet;
}

module.exports = { build, choicesFromQuery, expandQuery, carriageSeason, MODES, PARTIES, _test: { fillWindow, blockLibrary, mealPick, clock, span, hours } };
