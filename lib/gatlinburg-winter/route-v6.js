"use strict";

const v5 = require("./route-v5.js");
const base = require("./route.js");
const v3 = require("./route-v3.js");

const T = base._test;
const V3 = v3._test;

function addDays(date, delta) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

function crowdRank(level) {
  return ({ lighter: 0, moderate: 1, "moderate-heavy": 2, heavy: 3 })[level] ?? 1;
}

function fixedDateEvents(date) {
  return T.eventsForDate(date).filter(e => e.start === e.end);
}

function syntheticBaseDecision(data, date) {
  const input = { ...data.input, date };
  const sun = T.sunriseSunsetApprox(date);
  const crowd = T.crowdPressure(input);
  return {
    ok: true,
    input,
    headline: {
      state: T.inSeason(date) ? "DATE COMPARISON" : "OUTSIDE WINTER MAGIC",
      dateLabel: T.dateLabel(date),
      sunset: sun.sunset ? T.formatTime(sun.sunset) : null,
      crowdPressure: crowd.label,
      weather: "Live weather is checked after selecting this date",
      mountainVisibility: "Live visibility is checked after selecting this date"
    },
    conditions: [
      {
        label: "Weather",
        value: "Not reused across nearby dates; selecting this date triggers a fresh forecast check.",
        state: "unavailable"
      },
      {
        label: "Smokies access",
        value: "Official park closure status is rechecked after selecting this date.",
        state: "unavailable"
      }
    ],
    events: T.eventsForDate(date),
    itinerary: [],
    alternatives: []
  };
}

function snapshotDate(data, date) {
  const selected = date === data.input.date;
  const comparisonBase = selected ? data : syntheticBaseDecision(data, date);
  const options = V3.buildPlanOptions(comparisonBase);
  const top = options[0] || null;
  const sun = T.sunriseSunsetApprox(date);
  const crowd = T.crowdPressure({ ...data.input, date });
  const events = fixedDateEvents(date);

  let planLabel = top?.label || "No complete plan in this window";
  let stopCount = top?.itinerary?.length || 0;
  let planStops = (top?.itinerary || []).map(x => x.name);
  let verificationCount = (top?.itinerary || []).filter(x => x.verificationRequired).length;
  if (selected && data.itinerary?.length) {
    planLabel = data.decision?.label || planLabel;
    stopCount = data.itinerary.length;
    planStops = data.itinerary.map(x => x.name);
    verificationCount = data.itinerary.filter(x => x.verificationRequired).length;
  }

  return {
    date,
    selected,
    dateLabel: T.dateLabel(date),
    inSeason: T.inSeason(date),
    winterMagic: T.inSeason(date) ? "active" : "outside-season",
    sunset: sun.sunset || null,
    sunsetLabel: sun.sunset ? T.formatTime(sun.sunset) : "Unavailable",
    crowdLevel: crowd.level,
    crowdLabel: crowd.label,
    crowdReason: crowd.reason,
    fixedEvents: events.map(e => ({ id: e.id, name: e.name, time: e.time, sourceUrl: e.sourceUrl })),
    completePlanOptions: options.length,
    feasible: Boolean(selected ? data.itinerary?.length : top),
    planLabel,
    stopCount,
    planStops,
    verificationCount,
    travelMinutes: selected ? null : (top?.travelMinutes ?? null)
  };
}

function sameEventSet(a, b) {
  const aa = (a.fixedEvents || []).map(x => x.id).sort().join("|");
  const bb = (b.fixedEvents || []).map(x => x.id).sort().join("|");
  return aa === bb;
}

function compareSnapshot(selected, other) {
  let weight = 0;
  const details = [];
  let headline = "Very similar day shape";

  if (selected.inSeason !== other.inSeason) {
    weight += 6;
    headline = other.inSeason ? "Winter Magic becomes active" : "Outside Winter Magic season";
    details.push(other.inSeason ? "Winter Magic is active on this nearby date." : "This nearby date falls outside the published Winter Magic season.");
  }

  if (!sameEventSet(selected, other)) {
    weight += 7;
    if (other.fixedEvents.length) {
      headline = `${other.fixedEvents[0].name} changes the day`;
      details.push(`${other.fixedEvents.map(e => e.name).join(" + ")} makes the date event-driven.`);
    } else if (selected.fixedEvents.length) {
      headline = "The fixed event drops out";
      details.push(`The selected date's ${selected.fixedEvents.map(e => e.name).join(" + ")} is not present.`);
    }
  }

  const crowdDelta = crowdRank(other.crowdLevel) - crowdRank(selected.crowdLevel);
  if (crowdDelta < 0) {
    weight += 3;
    if (weight < 6) headline = "Lighter crowd estimate";
    details.push(`Crowd pressure estimate shifts from ${selected.crowdLabel} to ${other.crowdLabel}.`);
  } else if (crowdDelta > 0) {
    weight += 3;
    if (weight < 6) headline = "Heavier crowd estimate";
    details.push(`Crowd pressure estimate shifts from ${selected.crowdLabel} to ${other.crowdLabel}.`);
  }

  if (selected.feasible !== other.feasible) {
    weight += 6;
    headline = other.feasible ? "A complete plan becomes schedulable" : "The selected time window loses a complete plan";
    details.push(other.feasible ? "At least one complete schedule survives the same time window." : "No complete schedule survives the same time window without dropping a stop.");
  } else if (selected.planLabel !== other.planLabel) {
    weight += 2;
    details.push(`Likely complete-plan shape changes to ${other.planLabel}.`);
  } else if (other.feasible) {
    details.push(`Likely complete-plan shape stays ${other.planLabel}.`);
  }

  const selectedSun = selected.sunset ? Number(selected.sunset.slice(0, 2)) * 60 + Number(selected.sunset.slice(3, 5)) : null;
  const otherSun = other.sunset ? Number(other.sunset.slice(0, 2)) * 60 + Number(other.sunset.slice(3, 5)) : null;
  if (selectedSun != null && otherSun != null && selectedSun !== otherSun) {
    const diff = otherSun - selectedSun;
    details.push(`Sunset is ${Math.abs(diff)} minute${Math.abs(diff) === 1 ? "" : "s"} ${diff > 0 ? "later" : "earlier"}.`);
  }

  if (other.verificationCount < selected.verificationCount) {
    weight += 1;
    details.push("Fewer selected stops carry future-hours verification flags in the deterministic comparison plan.");
  } else if (other.verificationCount > selected.verificationCount) {
    weight += 1;
    details.push("More selected stops carry future-hours verification flags in the deterministic comparison plan.");
  }

  const advantage = crowdDelta < 0 && other.feasible && selected.inSeason === other.inSeason && sameEventSet(selected, other)
    ? "Lighter modeled crowd pressure with a similar seasonal setup."
    : null;

  return {
    ...other,
    changeLevel: weight >= 6 ? "major" : weight >= 3 ? "meaningful" : "small",
    headline,
    details: details.slice(0, 3),
    potentialAdvantage: advantage
  };
}

function buildWhyThisDate(data, selectedSnapshot) {
  const reasons = [];
  const fixed = selectedSnapshot.fixedEvents || [];
  const clock = data.decisionClock || {};
  const ops = data.visitOperations || {};
  const verification = (data.itinerary || []).filter(x => x.verificationRequired).length;

  reasons.push({
    label: "Season",
    value: selectedSnapshot.inSeason
      ? "Winter Magic is active, so after-dark seasonal options remain part of the plan."
      : "This date is outside the published Winter Magic season; the seasonal-light portion of the product changes."
  });

  reasons.push({
    label: "Date anchor",
    value: fixed.length
      ? `${fixed.map(e => e.name).join(" + ")} is fixed to this date${fixed[0]?.time ? ` (${fixed[0].time})` : ""}.`
      : "No fixed date-specific event controls the itinerary, so the visit can be sequenced around daylight and your available time."
  });

  reasons.push({
    label: "Daylight",
    value: data.headline?.sunset
      ? `Sunset is ${data.headline.sunset}${(clock.points || []).some(p => p.id === "lights-ready") ? "; the plan deliberately moves its light-focused portion after the useful daylight window." : "."}`
      : "Sunset timing is unavailable for this date."
  });

  reasons.push({
    label: "Plan fit",
    value: (data.itinerary || []).length
      ? `${data.itinerary.length} stops fit as one complete schedule from ${T.formatTime(data.itinerary[0].start)} to ${T.formatTime(data.itinerary.at(-1).end)} without silently dropping a selected stop.`
      : "No complete itinerary currently survives the selected time window."
  });

  reasons.push({
    label: "Crowd tradeoff",
    value: `${selectedSnapshot.crowdLabel} is a modeled date/day/event estimate, not live occupancy.${selectedSnapshot.crowdReason ? ` ${selectedSnapshot.crowdReason}.` : ""}`
  });

  if (ops.movement) reasons.push({ label: "Execution", value: ops.movement });
  if (verification) reasons.push({ label: "Still verify", value: `${verification} selected stop${verification === 1 ? "" : "s"} still require official future-date hours confirmation before committing.` });

  let summary;
  if (fixed.length) {
    summary = `${selectedSnapshot.dateLabel} is event-shaped: ${fixed.map(e => e.name).join(" + ")} becomes the fixed anchor, and the rest of the visit has to fit around it.`;
  } else if ((data.itinerary || []).length) {
    summary = `${selectedSnapshot.dateLabel} supports a complete ${data.itinerary.length}-stop plan in your selected window${selectedSnapshot.inSeason ? " while Winter Magic is active" : ""}. The main date-level tradeoff is ${selectedSnapshot.crowdLabel.toLowerCase()} crowd pressure.`;
  } else {
    summary = `${selectedSnapshot.dateLabel} does not currently produce a complete schedule for this time window; the nearby-date comparison shows what changes without inventing weather or operating status.`;
  }

  return { summary, reasons: reasons.slice(0, 6) };
}

function buildDateIntelligence(data) {
  const dates = [-3, -2, -1, 0, 1, 2, 3].map(delta => addDays(data.input.date, delta));
  const snapshots = dates.map(date => snapshotDate(data, date));
  const selected = snapshots.find(row => row.selected) || snapshotDate(data, data.input.date);
  const nearby = snapshots.filter(row => !row.selected).map(row => compareSnapshot(selected, row));
  const advantages = nearby.filter(row => row.potentialAdvantage);

  return {
    selected,
    whyThisDate: buildWhyThisDate(data, selected),
    nearby,
    nearbyAdvantage: advantages.length ? advantages[0] : null,
    comparisonWindow: "±3 days",
    comparisonMode: "deterministic-calendar-grounded",
    sourcePolicy: "Nearby-date comparisons use published seasonal/event dates, calculated sunset, modeled crowd pressure, hard gates and complete schedule generation. Weather, closures and same-day operating status are not copied across dates; selecting another date reruns the live checks and JEV plan choice."
  };
}

async function buildDecision(rawQuery = {}) {
  const data = await v5.buildDecision(rawQuery);
  const dateIntelligence = buildDateIntelligence(data);
  return {
    ...data,
    version: "3.4",
    dateIntelligence,
    diagnostics: {
      ...(data.diagnostics || {}),
      dateIntelligence: true,
      nearbyDateCount: dateIntelligence.nearby.length,
      nearbyDateMode: dateIntelligence.comparisonMode
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
  addDays,
  crowdRank,
  fixedDateEvents,
  syntheticBaseDecision,
  snapshotDate,
  compareSnapshot,
  buildWhyThisDate,
  buildDateIntelligence
};
