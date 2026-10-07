const test = require("node:test");
const assert = require("node:assert/strict");
const { decideWineRegion } = require("../lib/michigan-wine-day/engine");
const {
  TC_FALLBACKS,
  PETOSKEY_FALLBACK,
  SOUTHWEST_CONTRACT,
} = require("../lib/michigan-wine-day/regions");

const baseContracts = [
  TC_FALLBACKS["old-mission"],
  TC_FALLBACKS.leelanau,
  PETOSKEY_FALLBACK,
  SOUTHWEST_CONTRACT,
];

const statuses = {
  "old-mission": "live",
  leelanau: "live",
  petoskey: "live",
  southwest: "local",
};

function travel(values = {}) {
  return {
    "old-mission": 25,
    leelanau: 30,
    petoskey: 150,
    "southwest:south-berrien": 220,
    "southwest:st-joseph-coloma": 225,
    "southwest:fennville-south-haven": 220,
    "southwest:paw-paw-kalamazoo": 210,
    ...values,
  };
}

function decide(options = {}) {
  return decideWineRegion({
    contracts: options.contracts || baseContracts,
    adapterStatuses: options.adapterStatuses || statuses,
    date: options.date || "2026-10-10",
    intent: options.intent || "first-trip",
    window: options.window || { window: "full" },
    travelByTarget: options.travelByTarget || travel(),
    weatherByRegion: options.weatherByRegion || {},
  });
}

test("Case A — Traverse City first timer keeps both northern peninsulas legitimate", () => {
  const result = decide({
    intent: "first-trip",
    travelByTarget: travel({ "old-mission": 20, leelanau: 28 }),
  });
  assert.equal(result.state, "RECOMMENDATION");
  assert.ok(["old-mission", "leelanau"].includes(result.winner.regionId));
  const northern = [
    result.winner.regionId,
    ...result.alternatives.map((row) => row.regionId),
  ];
  assert.ok(northern.includes("old-mission"));
  assert.ok(northern.includes("leelanau"));
  assert.match(result.winner.tradeoff || "", /Choose (Old Mission Peninsula|Leelanau Peninsula)/);
});

test("Case B — five-hour Bay City window rejects implausible wine-country travel", () => {
  const result = decide({
    window: { window: "custom", start: "12:00", end: "17:00" },
    travelByTarget: travel({
      "old-mission": 165,
      leelanau: 180,
      petoskey: 150,
      "southwest:south-berrien": 245,
      "southwest:st-joseph-coloma": 235,
      "southwest:fennville-south-haven": 220,
      "southwest:paw-paw-kalamazoo": 205,
    }),
  });
  assert.equal(result.state, "NO_WORTHWHILE_REGION");
  assert.equal(result.winner, null);
});

test("Case C — wine style can causally change a close northern decision", () => {
  const equalTravel = travel({ "old-mission": 25, leelanau: 25 });
  const sparkling = decide({ intent: "sparkling", travelByTarget: equalTravel });
  const reds = decide({ intent: "reds", travelByTarget: equalTravel });
  assert.equal(sparkling.state, "RECOMMENDATION");
  assert.equal(reds.state, "RECOMMENDATION");
  assert.equal(sparkling.winner.regionId, "leelanau");
  assert.equal(reds.winner.regionId, "old-mission");
});

test("Case D — rain modifies outdoor value but does not erase wine regions", () => {
  const clear = decide({
    intent: "views",
    weatherByRegion: {
      "old-mission": { state: "forecast", rainy: false, outdoorFriendly: true },
      leelanau: { state: "forecast", rainy: false, outdoorFriendly: true },
    },
  });
  const rainy = decide({
    intent: "views",
    weatherByRegion: {
      "old-mission": { state: "forecast", rainy: true, outdoorFriendly: false },
      leelanau: { state: "forecast", rainy: true, outdoorFriendly: false },
    },
  });
  assert.equal(clear.state, "RECOMMENDATION");
  assert.equal(rainy.state, "RECOMMENDATION");
  assert.ok(!rainy.excluded.some((row) => ["old-mission", "leelanau"].includes(row.regionId)));
});

test("Case E — unknown hours lower confidence without becoming closed", () => {
  const uncertain = structuredClone(TC_FALLBACKS["old-mission"]);
  uncertain.inventory.knownHoursCount = 0;
  uncertain.inventory.unknownHoursCount = uncertain.inventory.wineryCount;
  uncertain.operatingByWeekday.Saturday = {
    knownOpen: 0,
    knownClosed: 0,
    unknown: uncertain.inventory.wineryCount,
  };
  const result = decide({
    contracts: [uncertain, TC_FALLBACKS.leelanau],
    adapterStatuses: { "old-mission": "live", leelanau: "live" },
    travelByTarget: { "old-mission": 10, leelanau: 80 },
  });
  assert.equal(result.state, "RECOMMENDATION");
  assert.equal(result.winner.regionId, "old-mission");
  assert.equal(result.winner.operating.knownOpen, 0);
  assert.ok(result.winner.operating.unknown >= 2);
  assert.equal(result.winner.confidence.class, "Limited evidence");
});

test("Case F — labeled fallback travel estimates still produce a qualified decision", () => {
  const result = decide({
    travelByTarget: travel({ "old-mission": 32, leelanau: 42 }),
  });
  assert.equal(result.state, "RECOMMENDATION");
  assert.ok(Number.isFinite(result.winner.travelMin));
  assert.ok(result.winner.handoff?.url);
});

test("Case G — regional adapter fallback is explicit in confidence evidence", () => {
  const result = decide({
    adapterStatuses: {
      ...statuses,
      leelanau: "snapshot-fallback",
    },
    intent: "sparkling",
    travelByTarget: travel({ "old-mission": 30, leelanau: 25 }),
  });
  const lee = result.winner.regionId === "leelanau"
    ? result.winner
    : result.alternatives.find((row) => row.regionId === "leelanau");
  assert.ok(lee);
  assert.equal(lee.adapterStatus, "snapshot-fallback");
  assert.ok(lee.confidence.reasons.some((reason) => /snapshot|adapter/i.test(reason)));
});

test("Case H — Southwest origin is not forced north by richer northern data", () => {
  const result = decide({
    intent: "reds",
    travelByTarget: travel({
      "old-mission": 170,
      leelanau: 180,
      petoskey: 205,
      "southwest:south-berrien": 70,
      "southwest:st-joseph-coloma": 60,
      "southwest:fennville-south-haven": 55,
      "southwest:paw-paw-kalamazoo": 25,
    }),
  });
  assert.equal(result.state, "RECOMMENDATION");
  assert.equal(result.winner.regionId, "southwest");
  assert.equal(result.winner.selectedCluster.id, "paw-paw-kalamazoo");
});

test("Case I — long origin plus short window can recommend against the trip", () => {
  const result = decide({
    window: { window: "quick" },
    travelByTarget: travel({
      "old-mission": 270,
      leelanau: 280,
      petoskey: 300,
      "southwest:south-berrien": 260,
      "southwest:st-joseph-coloma": 260,
      "southwest:fennville-south-haven": 260,
      "southwest:paw-paw-kalamazoo": 260,
    }),
  });
  assert.equal(result.state, "NO_WORTHWHILE_REGION");
  assert.match(result.message, /too much of the day|usable wine-country time/i);
});

test("handoff state preserves the decision without indexable query pages", () => {
  const result = decide({
    intent: "riesling",
    travelByTarget: travel({ "old-mission": 20, leelanau: 35 }),
  });
  assert.match(result.winner.handoff.url, /#plan=/);
  assert.ok(result.winner.handoff.preserves.includes("date"));
  assert.ok(result.winner.handoff.preserves.includes("intent"));
});

test("Southwest handoff remains cluster-level and no full-database duplicate is required", () => {
  const result = decide({
    intent: "first-trip",
    travelByTarget: travel({
      "old-mission": 200,
      leelanau: 210,
      petoskey: 230,
      "southwest:south-berrien": 35,
      "southwest:st-joseph-coloma": 55,
      "southwest:fennville-south-haven": 80,
      "southwest:paw-paw-kalamazoo": 90,
    }),
  });
  assert.equal(result.winner.regionId, "southwest");
  assert.match(result.winner.handoff.url, /michigan-wine-day\/southwest\/\?/);
  assert.match(result.winner.handoff.url, /cluster=south-berrien/);
});
