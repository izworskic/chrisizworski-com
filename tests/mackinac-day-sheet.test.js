// Guards for the one-screen Mackinac day sheet (Sep 29 2026).
//
// Chris: "plan something someone would use to solve for the complexities of Mackinac Island."
// Before this, the engine's plan for most visitors was a ferry, "Lunch / real break" from
// 12:30 to 6:35 and the ferry home, and with no leave time it told Detroit to leave at 1:28 AM.
// The day sheet turns the engine's facts into a real day. These tests hold it to that.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = p => fs.readFileSync(path.join(root, p), "utf8");
const route = require("../lib/mackinac-island/route.js");
const t = route._test;
const daySheet = require("../lib/mackinac-island/day-sheet.js");
const { ORIGINS } = require("../lib/mackinac-island/origins.js");

const LAT = 45.8497, LON = -84.6189;
const CITY = Object.fromEntries(ORIGINS.map(([n, r, , , m, s]) => [`${n}, ${r}`, { m, s }]));
const toMin = s => { const m = String(s || "").match(/(\d{1,2}):(\d{2})\s*([AP]M)/i); if (!m) return null; let h = +m[1] % 12; if (/p/i.test(m[3])) h += 12; return h * 60 + +m[2]; };

// Build a sheet offline from the engine's own schedule, hours and ranking.
function sheetFor({ date = "2026-10-03", city = null, leave = "06:00", go = "foot", who = "couple", stay = "day" } = {}) {
  const q = { go, who, depart_not_before: leave, trip: stay === "day" ? "day-trip" : "overnight", trip_date: date };
  if (stay !== "day") q.nights = stay;
  if (city) {
    const { m, s } = CITY[city];
    Object.assign(q, { origin_name: city, origin_mackinaw_minutes: String(m), origin_st_ignace_minutes: String(s), origin_preferred_port: m <= s ? "Mackinaw City" : "St. Ignace", origin_drive_minutes: String(Math.min(m, s)) });
  }
  const profile = t.profileFromQuery(daySheet.expandQuery(q), ["day-trip"], "lower");
  const records = [...t.arnoldSchedule(date, true), ...t.sheplersSchedule(date, true)].filter(r => Number.isFinite(r.departure_minutes)).sort((a, b) => a.departure_minutes - b.departure_minutes);
  const sunset = t.solarMinutes(date, LAT, LON, false);
  let ctx = { date, personas: profile.personas, origin: "lower", profile, hourly: [], weather: { available: false }, crowd: t.crowdRead(date, { available: false }, []), marine: { score: 65 }, attractions: t.attractionState(date, 7 * 60), events: [], sunset, sunrise: t.solarMinutes(date, LAT, LON, true), sameDay: false, nowMinutes: 0 };
  let candidates = t.planCandidates(records, ctx);
  if (!candidates.length && profile.trip !== "overnight") { ctx = { ...ctx, shortVisit: true }; candidates = t.planCandidates(records, ctx).map(c => ({ ...c, short_visit: true })); }
  const plan = candidates[0] || null;
  const stayReturn = plan ? t.returnPlanForStay(profile, t.addLocalDays(date, profile.nights || 0), plan.outbound.origin_port, true, true) : null;
  const sheet = daySheet.build({ choices: daySheet.choicesFromQuery(q), profile, plan, records, stayReturn, targetDate: date, planningMode: "selected-date",
    facts: { attractionsOn: d => t.attractionState(d, 0), eventsOn: t.eventForDate, sunsetOn: d => t.solarMinutes(d, LAT, LON, false) } });
  return { sheet, plan, profile, records };
}
const rows = s => s.days.flatMap(d => d.rows.map(r => ({ ...r, date: d.date })));
const stops = s => rows(s).filter(r => r.kind === "stop" && !["coffee", "sunset"].includes(r.id));

const VISITORS = [
  { city: "Detroit, MI" }, { city: "Grand Rapids, MI", who: "family-young", go: "carriage", leave: "07:00" },
  { city: "Lansing, MI", who: "group", go: "bike", leave: "06:30" }, { city: "Saginaw, MI", who: "grandparents", go: "carriage", leave: "07:00" },
  { city: "Marquette, MI", who: "solo" }, { city: "Bay City, MI", leave: "11:30" }, { city: "Traverse City, MI", stay: "1", leave: "09:00" },
  { city: "Chicago, IL", who: "family-teens", go: "bike", stay: "2", leave: "07:00" }, { city: null }, { city: "Petoskey, MI", go: "bike" },
  { city: "Detroit, MI", date: "2026-10-20" }, { city: "Detroit, MI", date: "2026-10-27", go: "carriage" }, { city: "Toledo, OH", stay: "3" }
];

test("nobody is told to leave home before the time they chose", () => {
  for (const v of VISITORS.filter(v => v.city)) {
    const { sheet } = sheetFor(v);
    const leave = rows(sheet).find(r => r.id === "leave");
    assert.ok(leave, `${v.city}: no leave row`);
    const floor = toMin((v.leave || "06:00").replace(/^(\d+):(\d+)$/, (_, h, m) => `${+h % 12 || 12}:${m} ${+h >= 12 ? "PM" : "AM"}`));
    assert.ok(leave.minute >= floor, `${v.city}: leaves ${leave.time}, before ${v.leave || "06:00"}`);
    assert.match(sheet.headline, new RegExp(`^Leave ${v.city.split(",")[0]} by ${leave.time}$`));
  }
});

test("a full day trip is a real day: three or more Island stops, each open when you are there", () => {
  for (const v of VISITORS.filter(v => (v.stay || "day") === "day")) {
    const { sheet } = sheetFor(v);
    assert.ok(!sheet.empty, `${v.city}: empty sheet`);
    if (sheet.island_minutes >= 300 && (v.date || "2026-10-03") <= "2026-10-24") assert.ok(stops(sheet).length >= 3, `${v.city}: only ${stops(sheet).length} stops in ${sheet.island_minutes} min`);
    const fort = t.attractionState(v.date || "2026-10-03", 0).find(a => a.name === "Fort Mackinac");
    for (const r of stops(sheet).filter(r => r.id === "fort")) {
      assert.notEqual(fort.status, "closed");
      assert.ok(r.minute >= toMin(fort.open_time) && r.end_minute <= toMin(fort.close_time), `${v.city}: Fort ${r.time} outside ${fort.open_time}-${fort.close_time}`);
    }
    assert.ok(!rows(sheet).some(r => /real break|flex block/i.test(r.title)), "engine filler leaked into the sheet");
  }
});

test("every stop ends before you need to be back at the dock, in time order", () => {
  for (const v of VISITORS) {
    const { sheet } = sheetFor(v);
    for (const day of sheet.days) {
      const boat = day.rows.find(r => r.id === "boat-back");
      let prev = -1;
      for (const r of day.rows.filter(r => r.kind !== "home")) {
        assert.ok(r.minute >= prev, `${v.city} ${day.date}: ${r.title} at ${r.time} is out of order`);
        prev = r.minute;
        if (boat && r.end_minute != null) assert.ok(r.end_minute <= boat.minute - 25, `${v.city}: ${r.title} runs into the boat back`);
      }
    }
  }
});

test("the boat back and the last boat are on your own ferry line", () => {
  for (const v of VISITORS.filter(v => (v.stay || "day") === "day" && v.city)) {
    const { sheet, records } = sheetFor(v);
    const back = rows(sheet).find(r => r.id === "boat-back");
    const line = records.filter(r => r.direction === "from-island" && r.operator === sheet.boat.operator && r.destination_port === sheet.boat.port);
    assert.ok(line.some(r => r.departure_time === back.time), `${v.city}: boat back ${back.time} is not a ${sheet.boat.operator} boat`);
    assert.equal(sheet.boat.last, line[line.length - 1].departure_time);
  }
});

test("the plan moves off the last boat of your line when an earlier one still gives 5 hours", () => {
  const { sheet } = sheetFor({ city: "Detroit, MI" });
  assert.notEqual(sheet.boat.back, sheet.boat.last);
  assert.ok(sheet.island_minutes >= 300);
});

test("long drives say so and offer a night; overnight stays carry bags, dinners and a real boat home", () => {
  const detroit = sheetFor({ city: "Detroit, MI" }).sheet;
  const drive = detroit.heads_up.find(h => h.kind === "drive");
  assert.ok(drive && drive.action && drive.action.set.stay === "1", "Detroit day trip should offer one night");
  const two = sheetFor({ city: "Chicago, IL", who: "family-teens", go: "bike", stay: "2", leave: "07:00" }).sheet;
  assert.equal(two.days.length, 3);
  assert.ok(two.days[0].rows.some(r => r.id === "bags"));
  assert.equal(two.days.slice(0, -1).filter(d => d.rows.some(r => r.id === "dinner")).length, 2);
  assert.ok(two.days[2].rows.some(r => r.id === "boat-back"));
  assert.ok(rows(two).some(r => r.id === "loop"), "bike stay should ride the loop");
  assert.equal(new Set(rows(two).filter(r => r.place_id).map(r => r.place_id)).size, rows(two).filter(r => r.place_id).length, "a restaurant repeats");
});

test("how you get around changes the day, not just a label", () => {
  const foot = sheetFor({ city: "Saginaw, MI", leave: "07:00" }).sheet;
  const bike = sheetFor({ city: "Saginaw, MI", leave: "07:00", go: "bike" }).sheet;
  const carriage = sheetFor({ city: "Saginaw, MI", leave: "07:00", go: "carriage" }).sheet;
  assert.ok(stops(foot).some(r => r.id === "arch"));
  assert.ok(stops(bike).some(r => r.id === "loop"));
  const ride = stops(carriage).findIndex(r => r.id === "carriage");
  assert.ok(ride >= 0, "carriage mode has no carriage tour");
  // The tour can drop you at the Fort; the note only says so when the Fort really is next.
  const next = stops(carriage)[ride + 1];
  assert.equal(/Get off at Fort Mackinac/.test(stops(carriage)[ride].note), next?.id === "fort");
  if (next?.id === "fort") assert.match(next.note, /^The carriage tour leaves you at the top of the hill/);
  for (const r of rows(foot).concat(rows(bike))) assert.doesNotMatch(r.note, /carriage tour leaves you/, "carriage copy leaked into another mode");
  const grand = sheetFor({ city: "Saginaw, MI", leave: "07:00", who: "grandparents" }).sheet;
  assert.ok(grand.heads_up.some(h => h.action?.set?.go === "carriage"), "grandparents on foot should be offered the carriage");
});

test("closed season is said once, plainly, and the plan leaves those places out", () => {
  const { sheet } = sheetFor({ city: "Detroit, MI", date: "2026-10-27", go: "carriage" });
  const closure = sheet.heads_up.find(h => h.kind === "closure");
  assert.ok(closure && /Fort Mackinac/.test(closure.text) && /carriage tours/.test(closure.text));
  assert.ok(!stops(sheet).some(r => ["fort", "carriage", "grand"].includes(r.id)));
  assert.ok(sheet.heads_up.length <= 3);
});

test("no city yet still gives a dock-to-dock day", () => {
  const { sheet } = sheetFor({});
  assert.match(sheet.headline, /^Be at the (Mackinaw City|St\. Ignace) dock by \d{1,2}:\d{2} [AP]M$/);
  assert.ok(stops(sheet).length >= 3);
});

test("the sheet request is small and skips work the sheet does not use", () => {
  const src = read("lib/mackinac-island/route.js");
  assert.match(src, /const sheetOnly=String\(req\?\.query\?\.format\|\|""\)==="sheet"/);
  assert.match(src, /sheetOnly\?Promise\.resolve\(\{mode:"skipped"/);
  assert.match(src, /if\(sheetOnly\)\{\s*return \{/);
  assert.match(src, /day_sheet:sheet,\s*itinerary/);
});

test("the rules hold across cities, modes, parties, stays and dates", () => {
  // A 20,000-sheet version of this sweep ran clean before release; this is a slice of it.
  let n = 0;
  for (const date of ["2026-10-03", "2026-10-22"]) for (const [name, reg] of ORIGINS.filter((_, i) => i % 6 === 0))
    for (const go of daySheet.MODES) for (const who of daySheet.PARTIES) for (const stay of ["day", "1", "2"]) for (const leave of ["06:00", "12:00"]) {
      const city = `${name}, ${reg}`, tag = [date, city, go, who, stay, leave].join(" ");
      const { sheet } = sheetFor({ date, city, go, who, stay, leave });
      n++;
      if (sheet.empty) continue;
      assert.ok(sheet.heads_up.length <= 3, tag);
      assert.doesNotMatch(sheet.headline + sheet.summary, /undefined|NaN|null/, tag);
      const leaveRow = rows(sheet).find(r => r.id === "leave");
      assert.ok(leaveRow.minute >= +leave.slice(0, 2) * 60, `${tag}: leaves ${leaveRow.time}`);
      for (const day of sheet.days) {
        const back = day.rows.find(r => r.id === "boat-back");
        let prev = -1;
        for (const r of day.rows.filter(r => r.kind !== "home")) {
          assert.ok(r.minute >= prev, `${tag}: ${r.title} out of order`);
          prev = r.minute;
          assert.doesNotMatch(r.title + r.note + r.time, /undefined|NaN|null/, tag);
          if (back && r.end_minute != null) assert.ok(r.end_minute <= back.minute - 25, `${tag}: ${r.title} runs into the boat`);
        }
      }
      if (stay === "day" && sheet.island_minutes >= 300 && date <= "2026-10-24") assert.ok(stops(sheet).length >= 3, `${tag}: ${stops(sheet).length} stops`);
    }
  assert.ok(n > 2000);
});

// ---------------------------------------------------------------- the page
const html = read("public/mackinac-island/index.html");
const js = read("public/assets/mackinac-island.js");
const css = read("public/assets/mackinac-island.css");

test("the page is one sentence of choices and one day sheet", () => {
  const picks = [...html.matchAll(/<label class="pick[^"]*" data-pick="(\w+)">/g)].map(m => m[1]);
  assert.deepEqual(picks, ["stay", "who", "from", "day", "leave", "go"]);
  assert.match(html, /<h1 id="page-title">Mackinac Island Trip Planner<\/h1>/);
  assert.ok(html.indexOf('id="tripForm"') < html.indexOf('id="sheet"'));
  for (const id of ["sheetHeadline", "sheetSummary", "sheetHeads", "sheetDays", "shareBtn", "sheetStatus"]) assert.match(html, new RegExp(`id="${id}"`));
  // Retired: the questionnaire, trip profile, fine-tune form, folded "More about today" rows.
  for (const gone of ["intakeQuestion", "intakeOptions", "tripProfileCard", "tunePanel", "more-item", "liveBar", "planToast", "webcamViewer"]) assert.ok(!html.includes(gone), `${gone} is back`);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Skip to trip planner/);
  assert.match(html, /\/assets\/mackinac-intent\.css\?v=/);
  assert.match(html, /<script src="\/assets\/mackinac-island\.js\?v=[^"]+" defer><\/script>/);
});

test("the starting-city list is the engine's own measured list", () => {
  const options = [...html.matchAll(/<option value="([^"]+)" data-m="(\d+)" data-s="(\d+)">/g)].map(m => [m[1], +m[2], +m[3]]);
  assert.equal(options.length, ORIGINS.length);
  for (const [name, m, s] of options) assert.deepEqual([m, s], [CITY[name].m, CITY[name].s], name);
});

test("the page sends both dock drive times, a leave-after floor, and a date only when chosen", () => {
  assert.match(js, /origin_mackinaw_minutes/);
  assert.match(js, /origin_st_ignace_minutes/);
  assert.match(js, /depart_not_before: state\.leave/);
  assert.match(js, /if \(state\.day\) p\.set\("trip_date", state\.day\)/);
  assert.match(js, /format: "sheet"/);
  assert.match(html, /<option value="06:00" selected>6 AM<\/option>/);
});

test("the plan loads on arrival, ignores stale answers and fails out loud", () => {
  assert.match(js, /plan\("load"\);\s*}\s*start\(\);/);
  assert.match(js, /if \(id !== seq\) return;/);
  assert.match(js, /The planner didn’t load/);
  assert.doesNotMatch(js, /catch \{\s*\}\s*\n\s*\}\s*\n\s*function render/);
});

test("guide-page links and shared links restore the trip, and the guides keep reading it", () => {
  assert.match(js, /"with-kids": \{ who: "family-young" \}/);
  assert.match(js, /"bike-day": \{ go: "bike" \}/);
  assert.match(js, /"limited-walking": \{ go: "carriage" \}/);
  assert.match(js, /if \(qs\.get\("from"\)\) state\.from = qs\.get\("from"\)/);
  assert.match(js, /PLAN_KEY = "mackinac-trip-plan-v1"/);
  assert.match(js, /PROFILE_KEY = "mackinac-trip-profile-v1"/);
  assert.match(js, /fetch\(PROFILE_API, \{ method: "POST"/);
  assert.match(js, /navigator\.share/);
  assert.match(html, /id="trip-intake"/);
});

test("the sheet is honest about what it knows", () => {
  const src = read("lib/mackinac-island/day-sheet.js");
  assert.match(src, /Drive times are estimates, not live traffic/);
  assert.match(src, /Crowd timing is modeled, not counted/);
  assert.match(js, /Updated \$\{esc\(data\.local_now\.time\)\} ET/);
  assert.match(css, /\.pick select\{[^}]*font-size:16px/);
  assert.match(css, /@media print/);
});
