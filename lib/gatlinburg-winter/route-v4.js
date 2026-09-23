"use strict";

const v3 = require("./route-v3.js");
const v2 = require("./route-v2.js");

const V = v2._test;

const URLS = Object.freeze({
  trolley: "https://www.gatlinburg.com/things-to-do/trolley/",
  trolleyLocator: "https://gatlinburg.connexionz.net/",
  parkingGuide: "https://www.gatlinburg.com/plan/parking/",
  cityParking: "https://www.gatlinburgtn.gov/page/parking",
  npsConditions: "https://www.nps.gov/grsm/planyourvisit/conditions.htm"
});

const DOWNTOWN_ZONES = new Set([
  "downtown-core",
  "downtown-north",
  "skypark",
  "anakeesta"
]);

function mins(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function winterTrolleySeason(date) {
  const md = String(date || "").slice(5);
  return Boolean(md && (md >= "11-01" || md <= "04-30"));
}

function stopFacts(itinerary = []) {
  return itinerary.map(row => {
    const c = V.candidateById(row.id);
    return {
      id: row.id,
      name: row.name,
      zone: row.zone || c?.zone || null,
      category: c?.category || null
    };
  });
}

function deriveOperations(data) {
  const input = data?.input || {};
  const stops = stopFacts(data?.itinerary || []);
  const downtown = stops.filter(s => DOWNTOWN_ZONES.has(s.zone));
  const nps = stops.filter(s => String(s.zone || "").startsWith("nps-"));
  const outlying = stops.filter(s => !DOWNTOWN_ZONES.has(s.zone));
  const hasOber = stops.some(s => s.zone === "ober");
  const hasArtsCrafts = stops.some(s => s.zone === "arts-crafts");
  const hasTrolleyStop = stops.some(s => s.id === "trolley-lights");
  const hasMajorEvent = stops.some(s => ["parade", "new-years"].includes(s.id));
  const start = mins(input.start);
  const end = mins(input.end);
  const inWinterTrolley = winterTrolleySeason(input.date);
  const generalWinterStart = 10 * 60 + 30;
  const generalWinterEnd = 22 * 60;

  let movement;
  let movementMode;
  if (stops.length && outlying.length === 0) {
    movementMode = "downtown-cluster";
    movement = "This is a downtown-heavy plan. Park once, then keep the downtown stops together instead of moving the car between them.";
  } else if (downtown.length && outlying.length) {
    movementMode = "mixed";
    movement = "Treat the outlying segment as a separate drive, then consolidate the downtown stops into one parked/walk-or-trolley block.";
  } else if (outlying.length) {
    movementMode = "vehicle-led";
    movement = "This plan depends more on separated destinations than a downtown cluster. Keep the vehicle segment explicit and avoid assuming trolley coverage for the full sequence.";
  } else {
    movementMode = "unknown";
    movement = "No complete stop sequence is available yet, so an arrival strategy cannot be grounded.";
  }

  let trolley;
  let trolleyState = "published";
  if (!inWinterTrolley) {
    trolley = "The selected date is outside the published November 1–April 30 winter schedule. Check the official trolley page for the applicable seasonal hours.";
  } else if (end != null && end > generalWinterEnd) {
    trolleyState = "late-finish";
    trolley = "The visit extends past the published general winter trolley window of 10:30 AM–10:00 PM. Do not depend on the trolley for the final leg.";
  } else if (start != null && start < generalWinterStart) {
    trolleyState = "early-start";
    trolley = "The visit starts before the published general winter trolley window of 10:30 AM–10:00 PM. The early part of the plan needs another movement assumption.";
  } else {
    trolleyState = "window-fit";
    trolley = "The selected time window sits inside the published general winter trolley schedule of 10:30 AM–10:00 PM. Route and special-event service still require an official same-day check.";
  }
  if (hasTrolleyStop) trolley += " The selected itinerary explicitly uses the trolley, so route-specific service becomes a commit-time check.";

  let parking;
  if (downtown.length >= 2) {
    parking = "Use the City of Gatlinburg live parking information before entering downtown, then keep this downtown cluster parked once. The planner does not invent live stall counts.";
  } else if (downtown.length === 1) {
    parking = "Check the City of Gatlinburg live parking information before the downtown stop. The planner does not claim a space is available until the official source does.";
  } else {
    parking = "Downtown parking is not a major dependency in this sequence, but use official city parking information if the route changes toward downtown.";
  }

  const special = [];
  if (nps.length) special.push("The Smokies segment is operationally separate from downtown; recheck NPS conditions before that segment.");
  if (hasOber) special.push("Ober is a separate mountain-operating decision; verify current mountain/tram/snow operations directly before committing.");
  if (hasArtsCrafts) special.push("The Arts & Crafts Community is geographically separate from the downtown cluster; keep it as its own movement block.");
  if (hasMajorEvent) special.push("A major downtown event is in the selected plan; parking, traffic circulation and trolley operations can change for the event.");
  if (!special.length) special.push("No separate mountain, park or major-event operating block is driving this itinerary.");

  const recheck = [
    "Live downtown parking availability before entering the core.",
    "Official trolley route or special-event changes if transit is part of the plan."
  ];
  if (nps.length) recheck.push("NPS road and park conditions before the Smokies segment.");
  if (hasOber) recheck.push("Ober mountain operations and snow/tubing status before the mountain segment.");
  if (hasMajorEvent) recheck.push("Event-day traffic, street and parking notices before arrival.");

  return {
    movementMode,
    movement,
    trolleyState,
    trolley,
    parking,
    special: special.join(" "),
    downtownStops: downtown.length,
    outlyingStops: outlying.length,
    npsStops: nps.length,
    hasOber,
    hasMajorEvent,
    sources: {
      trolley: URLS.trolley,
      trolleyLocator: URLS.trolleyLocator,
      parking: URLS.parkingGuide,
      cityParking: URLS.cityParking,
      npsConditions: URLS.npsConditions
    },
    recheck
  };
}

function appendOperationalConditions(conditions = [], operations) {
  return [
    ...conditions,
    {
      label: "How to move through this plan",
      value: operations.movement,
      state: "calculated",
      sourceUrl: URLS.parkingGuide
    },
    {
      label: "Trolley fit for your window",
      value: operations.trolley,
      state: "published",
      sourceUrl: URLS.trolley
    },
    {
      label: "Parking strategy",
      value: operations.parking,
      state: "published",
      sourceUrl: URLS.cityParking
    },
    {
      label: "Separate operating blocks",
      value: operations.special,
      state: "calculated",
      sourceUrl: operations.npsStops ? URLS.npsConditions : URLS.parkingGuide
    }
  ];
}

function appendOperationalSources(sources = []) {
  const out = [...sources];
  const seen = new Set(out.map(row => row.url));
  const extras = [
    {
      name: "Official Gatlinburg trolley schedule",
      state: "published",
      url: URLS.trolley,
      updatedAt: null,
      note: "Official city visitor information publishes seasonal trolley hours, route notes, map and locator access.",
      authority: { label: "official city visitor source" }
    },
    {
      name: "City of Gatlinburg parking",
      state: "published",
      url: URLS.cityParking,
      updatedAt: null,
      note: "Official city parking source. This planner does not fabricate live space counts.",
      authority: { label: "official city source" }
    }
  ];
  for (const row of extras) if (!seen.has(row.url)) out.push(row);
  return out;
}

async function buildDecision(rawQuery = {}) {
  const data = await v3.buildDecision(rawQuery);
  const operations = deriveOperations(data);
  const changeSet = new Set([...(data.whatCouldChange || []), ...operations.recheck]);
  return {
    ...data,
    version: "3.2",
    conditions: appendOperationalConditions(data.conditions || [], operations),
    transit: data.transit ? { ...data.transit, note: operations.trolley } : data.transit,
    whatCouldChange: [...changeSet],
    sources: appendOperationalSources(data.sources || []),
    visitOperations: operations,
    diagnostics: {
      ...(data.diagnostics || {}),
      operationsLayer: true,
      movementMode: operations.movementMode,
      trolleyWindowState: operations.trolleyState
    }
  };
}

async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  try {
    if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
    return res.status(200).json(await buildDecision(req.query || {}));
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: "Gatlinburg winter planner failed",
      detail: String(error?.message || error).slice(0, 220),
      generatedAt: new Date().toISOString()
    });
  }
}

module.exports = handler;
module.exports.buildDecision = buildDecision;
module.exports._test = {
  winterTrolleySeason,
  stopFacts,
  deriveOperations,
  appendOperationalConditions,
  appendOperationalSources
};
