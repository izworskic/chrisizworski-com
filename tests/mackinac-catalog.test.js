const test=require("node:test");
const assert=require("node:assert/strict");
const catalog=require("../lib/mackinac-island/catalog");

test("quiet special-occasion profiles favor Stonecliffe/Iroquois style stays",()=>{
  const p={answers:{trip_duration:"two-three"},vector:{crowd_avoidance:.95,special_occasion:.9,food:.8,photography:.9,history:.5,kids_priority:.05,budget_sensitivity:.15,outdoors:.6,iconic_priority:.6}};
  const r=catalog.recommendations(p,"2026-09-20");
  assert.equal(r.lodging.relevant,true);
  assert.ok(["inn-at-stonecliffe","hotel-iroquois"].includes(r.lodging.recommended[0].id));
  assert.match(r.lodging.truth,/No room availability/);
});

test("family value profiles surface practical meal options",()=>{
  const p={answers:{trip_duration:"day"},vector:{kids_priority:.95,budget_sensitivity:.95,crowd_avoidance:.65,food:.45,special_occasion:.1,photography:.2,shopping:.4,outdoors:.7,history:.3}};
  const r=catalog.recommendations(p,"2026-09-20");
  const top=r.dining.recommended.slice(0,3).map(x=>x.id);
  assert.ok(top.includes("douds-picnic")||top.includes("mighty-mac"));
  assert.equal(r.lodging.relevant,false);
});

test("history-first regional profiles favor verified gateway history stops",()=>{
  const p={answers:{trip_duration:"four-plus"},vector:{regional_exploration:.98,history:.98,kids_priority:.5,outdoors:.45,photography:.4,iconic_priority:.8}};
  const r=catalog.recommendations(p,"2026-09-20");
  assert.equal(r.regional.relevant,true);
  assert.ok(["colonial-michilimackinac","ojibwa-culture"].includes(r.regional.recommended[0].id));
});

test("known 2026 closing dates never remain season-eligible afterward",()=>{
  const woods=catalog.DINING.find(x=>x.id==="woods");
  const mission=catalog.LODGING.find(x=>x.id==="mission-point");
  assert.equal(catalog._test.activeForDate(woods,"2026-10-25"),false);
  assert.equal(catalog._test.activeForDate(mission,"2026-10-26"),false);
  assert.equal(catalog._test.activeForDate(mission,"2026-10-20"),true);
});

test("catalog never represents fit as live availability",()=>{
  const r=catalog.recommendations({answers:{trip_duration:"one-night"},vector:{}},"2026-09-20");
  assert.match(r.lodging.truth,/Fit ranking only/);
  assert.match(r.dining.truth,/availability must be checked/i);
  assert.ok(r.lodging.recommended.every(x=>x.source_url));
  assert.ok(r.dining.recommended.every(x=>x.source_url));
});
