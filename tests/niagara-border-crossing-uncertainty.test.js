const test = require("node:test");
const assert = require("node:assert/strict");

const {
  CROSSINGS,
  compareNiagaraCrossings,
  evaluateEligibility,
} = require("../lib/niagara-border-crossings");

const NOW = new Date("2026-10-03T01:30:00.000Z");

function lane(wait, updatedAt) {
  return {
    available: true,
    status: "reported",
    wait_minutes: wait,
    display: wait === 0 ? "No delay" : `${wait} min`,
    lanes_open: 1,
    updated_at: updatedAt,
  };
}

function crossing(id, wait, updatedAt, options = {}) {
  const base = CROSSINGS.find((item) => item.id === id);
  const selectedLane = lane(wait, updatedAt);
  const empty = { available: false, status: "unavailable", wait_minutes: null, display: "Not reported", lanes_open: null, updated_at: null };
  return {
    ...base,
    status: { to_us: options.status || "open", cbp_text: options.status || "Open" },
    waits: {
      to_us: {
        source: { kind: options.sourceKind || "cbp", name: options.sourceName || "U.S. Customs and Border Protection" },
        operator_source: { kind: "operator", name: base.operator },
        passenger: { standard: selectedLane, nexus: options.nexusLane || empty },
        commercial: { standard: base.eligibility.commercial ? selectedLane : empty },
        operator_validation: options.operator_validation || {},
      },
      to_canada: {
        source: { kind: options.sourceKind || "cbsa", name: options.sourceName || "Canada Border Services Agency" },
        operator_source: { kind: "operator", name: base.operator },
        passenger: { standard: selectedLane, nexus: options.nexusLane || empty },
        commercial: { standard: base.eligibility.commercial ? selectedLane : empty },
        operator_validation: options.operator_validation || {},
      },
    },
  };
}

test("fresh alternate alone never justifies a detour when the normal bridge wait is stale", () => {
  const stale = new Date(NOW.getTime() - 180 * 60_000).toISOString();
  const fresh = new Date(NOW.getTime() - 5 * 60_000).toISOString();
  const crossings = [
    crossing("peace", 40, stale),
    crossing("rainbow", 0, fresh),
  ];
  const decision = compareNiagaraCrossings(
    crossings,
    { direction: "to_us", traveler: "passenger", preferred: "peace" },
    NOW,
  );
  assert.equal(decision.state, "INSUFFICIENT_DATA");
  assert.equal(decision.recommended_id, null);
  assert.match(decision.reason, /not enough evidence|does not have fresh|cannot/i);
});

test("Whirlpool operator-only wait context can inform the card but never justify a bridge switch", () => {
  const fresh = new Date(NOW.getTime() - 5 * 60_000).toISOString();
  const whirlpool = crossing("whirlpool", 0, fresh, {
    sourceKind: "operator",
    sourceName: "Niagara Falls Bridge Commission",
    nexusLane: lane(0, fresh),
    operator_validation: { nexus: lane(0, fresh) },
  });
  const peace = crossing("peace", 45, fresh);
  const decision = compareNiagaraCrossings(
    [peace, whirlpool],
    { direction: "to_us", traveler: "nexus", preferred: "peace" },
    NOW,
  );
  const wp = decision.results.find((item) => item.id === "whirlpool");
  assert.equal(wp.context_only, true);
  assert.equal(wp.usable_for_recommendation, false);
  assert.notEqual(decision.recommended_id, "whirlpool");
});

test("Global Entry is Whirlpool-eligible only in the U.S.-bound direction", () => {
  const whirlpool = CROSSINGS.find((item) => item.id === "whirlpool");
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_us", vehicle: "passenger", program: "global_entry" }).eligible, true);
  assert.equal(evaluateEligibility(whirlpool, { direction: "to_canada", vehicle: "passenger", program: "global_entry" }).eligible, false);
});
