const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const path = require("node:path");

const read = (file) => readFileSync(path.join(__dirname, "..", file), "utf8");

// Mirror of the date rule in public/assets/mackinac-bridge-walk.js. The walk is
// always the first Monday in September, so the page never needs a yearly edit.
function laborDay(year) {
  const day = new Date(Date.UTC(year, 8, 1));
  while (day.getUTCDay() !== 1) day.setUTCDate(day.getUTCDate() + 1);
  return { year, month: 9, day: day.getUTCDate() };
}

function key(p) {
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function upcomingWalk(today) {
  const thisYear = laborDay(today.year);
  return key(today) <= key(thisYear) ? thisYear : laborDay(today.year + 1);
}

test("Labor Day is computed as the first Monday in September", () => {
  assert.equal(key(laborDay(2026)), "2026-09-07");
  assert.equal(key(laborDay(2027)), "2027-09-06");
  assert.equal(key(laborDay(2028)), "2028-09-04");
  assert.equal(key(laborDay(2029)), "2029-09-03");
  // September 1 falling on a Monday is the edge case worth pinning.
  assert.equal(key(laborDay(2031)), "2031-09-01");
});

test("the section rolls to the next year on its own once the walk has passed", () => {
  // Day before, day of, and day after the 2026 walk.
  assert.equal(key(upcomingWalk({ year: 2026, month: 9, day: 6 })), "2026-09-07");
  assert.equal(key(upcomingWalk({ year: 2026, month: 9, day: 7 })), "2026-09-07");
  assert.equal(key(upcomingWalk({ year: 2026, month: 9, day: 8 })), "2027-09-06");
  // Deep in the off season it still points at the next one, with no edit.
  assert.equal(key(upcomingWalk({ year: 2027, month: 1, day: 15 })), "2027-09-06");
  assert.equal(key(upcomingWalk({ year: 2030, month: 12, day: 31 })), "2031-09-01");
});

test("the static answer is correct with no JavaScript and carries no hardcoded year", () => {
  const html = read("public/mackinac-bridge-live/index.html");

  assert.ok(html.includes('id="bridge-walk"'));
  assert.ok(html.includes("Is the Mackinac Bridge Closed on Labor Day?"));
  // The recurring facts, which are true in any year.
  assert.ok(html.includes("6:30 a.m. to noon every Labor Day"));
  assert.ok(html.includes("Bridge View Park"));
  assert.ok(html.includes("Jamet Street ramp"));
  assert.ok(html.includes("nobody is allowed to start after 11:30 a.m."));
  assert.ok(html.includes("906-643-7600"));
  assert.ok(html.includes("https://www.mackinacbridge.org/events/walk/"));
  assert.ok(html.includes("/assets/mackinac-bridge-walk.js"));

  // A hardcoded year in the section is exactly what would rot. The dated line
  // is filled in by the module instead.
  const section = html.slice(html.indexOf('id="bridge-walk"'), html.indexOf('id="faqHeading"'));
  assert.ok(!/20\d\d/.test(section), "the Bridge Walk section must not hardcode a year");
  assert.ok(section.includes("data-walk-date"));
  assert.ok(section.includes("data-walk-countdown"));
});

test("the walk module computes dates rather than storing them", () => {
  const js = read("public/assets/mackinac-bridge-walk.js");
  assert.ok(js.includes("getUTCDay() !== 1"), "must derive the first Monday");
  assert.ok(js.includes("America/Detroit"), "must resolve today in Michigan time");
  assert.ok(js.includes('"@type": "Event"') || js.includes('"@type":"Event"') || js.includes('"Event"'));
  // No stored walk dates anywhere in the module.
  assert.ok(!/20\d\d-09-\d\d/.test(js), "the module must not hardcode a walk date");
});

test("the Bridge Walk is answered in the FAQ without disturbing the existing entries", () => {
  const html = read("public/mackinac-bridge-live/index.html");
  assert.ok(html.includes("Is the Mackinac Bridge closed for the Bridge Walk?"));
  assert.ok(html.includes("Can I drive across during the Bridge Walk?"));
  // Pre-existing answers must survive.
  assert.ok(html.includes("Is the Mackinac Bridge closed right now?"));
  assert.ok(html.includes("What counts as a high-profile vehicle?"));
  assert.ok(html.includes("What happens during falling-ice closures?"));
});
