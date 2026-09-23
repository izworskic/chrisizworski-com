"use strict";

const v4 = require("./route-v4.js");
const v2 = require("./route-v2.js");

const V = v2._test;

const LIGHT_IDS = new Set([
  "winter-magic-walk",
  "parkway-lights",
  "riverwalk-lights",
  "moonshine-free-loop",
  "trolley-lights"
]);
const MOUNTAIN_IDS = new Set(["skypark", "anakeesta", "ober-mountain", "ober-snow-tubing", "newfound-gap"]);
const INDOOR_IDS = new Set(["ripley-aquarium", "indoor-ripleys"]);

function mins(v) {
  const m = String(v || "").match(/^(\d{2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function hhmm(n) {
  if (!Number.isFinite(n)) return null;
  const x = Math.max(0, Math.min(1439, Math.round(n)));
  return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`;
}

function displayTimeToHHMM(value) {
  const m = String(value || "").trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = Number(m[1]);
  const minute = Number(m[2]);
  const suffix = m[3].toUpperCase();
  if (h === 12) h = 0;
  if (suffix === "PM") h += 12;
  return hhmm(h * 60 + minute);
}

function exactEventTime(value) {
  return displayTimeToHHMM(value);
}

function candidate(id) {
  return V.candidateById(id);
}

function hasCategory(data, category) {
  return (data.itinerary || []).some(row => candidate(row.id)?.category === category);
}

function indoorAlternative(data) {
  for (const alt of data.alternatives || []) {
    const item = (alt.items || []).find(name => {
      const c = V.candidateByName(name);
      return c && INDOOR_IDS.has(c.id);
    });
    if (item) return item;
  }
  return null;
}

function deriveVisitSignature(data) {
  const ids = new Set((data.itinerary || []).map(row => row.id));
  const parts = [];
  const sunset = displayTimeToHHMM(data.headline?.sunset);
  const lights = [...ids].some(id => LIGHT_IDS.has(id));
  const mountain = [...ids].some(id => MOUNTAIN_IDS.has(id));
  const indoor = [...ids].some(id => INDOOR_IDS.has(id));
  const event = (data.events || []).some(e => exactEventTime(e.time));
  const ops = data.visitOperations || {};

  if (event) parts.push("event-anchored");
  else if (mountain && lights) parts.push("daylight-first mountain");
  else if (indoor && lights) parts.push("indoor anchor");
  else if (mountain) parts.push("daylight-sensitive");
  else if (lights) parts.push("lights-driven evening");
  else parts.push("time-window driven");

  if (lights && sunset) parts.push(`lights take over after ${sunset}`);
  if (ops.movementMode === "downtown-cluster") parts.push("park once downtown");
  else if (ops.movementMode === "mixed") parts.push("separate drive, then downtown cluster");
  else if (ops.movementMode === "vehicle-led") parts.push("vehicle-led sequence");

  if (ops.trolleyState === "late-finish") parts.push("trolley cutoff before finish");
  return parts.join(" → ");
}

function deriveDecisionClock(data) {
  const input = data.input || {};
  const itinerary = data.itinerary || [];
  const ids = new Set(itinerary.map(row => row.id));
  const points = [];
  const seen = new Set();
  const sunset = displayTimeToHHMM(data.headline?.sunset);
  const lights = [...ids].some(id => LIGHT_IDS.has(id));
  const mountain = [...ids].some(id => MOUNTAIN_IDS.has(id));
  const ops = data.visitOperations || {};

  function add(id, time, label, effect, state, sourceUrl, kind = "calculated") {
    if (!time || mins(time) == null || seen.has(id)) return;
    seen.add(id);
    points.push({ id, time, label, effect, state, sourceUrl, kind });
  }

  if (sunset) {
    add(
      "sunset",
      sunset,
      "Sunset",
      mountain && lights
        ? "The value of daylight shifts away from mountain/view stops and toward the downtown light portion of the plan."
        : lights
          ? "Winter Magic moves into its useful after-dark window."
          : "The usable daylight window closes for daylight-sensitive stops.",
      "calculated",
      "https://gml.noaa.gov/grad/solcalc/",
      "solar"
    );
    if (lights) {
      add(
        "lights-ready",
        hhmm(mins(sunset) + 15),
        "Lights become the better use of time",
        "The planner deliberately keeps the light-focused stop after this point instead of spending the better daylight on it.",
        "calculated",
        "https://www.gatlinburg.com/events/annual-events/winter-magic/",
        "seasonal"
      );
    }
  }

  for (const event of data.events || []) {
    const time = exactEventTime(event.time);
    if (!time) continue;
    add(
      `event-${event.id || event.name}`,
      time,
      event.name,
      "This is a fixed published event time, so the rest of the itinerary has to fit around it rather than the other way around.",
      "published",
      event.sourceUrl,
      "event"
    );
  }

  const verificationStops = itinerary.filter(row => row.verificationRequired);
  for (const stop of verificationStops.slice(0, 2)) {
    add(
      `verify-${stop.id}`,
      stop.start,
      `Official-hours gate: ${stop.name}`,
      "This stop remains usable in the plan only if the operator's official hours still support the scheduled slot.",
      "verification",
      stop.officialUrl,
      "operating"
    );
  }

  const downtownRelevant = Number(ops.downtownStops || 0) > 0;
  const visitEnd = mins(input.end);
  if (downtownRelevant && ops.trolleyState && (visitEnd == null || visitEnd >= 20 * 60)) {
    add(
      "trolley-cutoff",
      "22:00",
      "Published general winter trolley window ends",
      ops.trolleyState === "late-finish"
        ? "Your visit continues after this point, so the final movement cannot depend on general trolley service."
        : "The itinerary currently finishes within the published general winter trolley window; a later finish would change that assumption.",
      "published",
      ops.sources?.trolley,
      "transit"
    );
  }

  points.sort((a, b) => mins(a.time) - mins(b.time) || a.label.localeCompare(b.label));

  const alt = indoorAlternative(data);
  const pivots = [];
  if (mountain && /Mixed|Poor/i.test(String(data.headline?.mountainVisibility || ""))) {
    pivots.push({
      trigger: "Mountain visibility deteriorates before the elevation segment",
      response: alt ? `Use ${alt} as the grounded indoor pivot instead of forcing the mountain portion.` : "Rebuild the plan before committing to the mountain portion.",
      source: "NWS/NPS visibility and condition checks"
    });
  }
  if (ops.trolleyState === "late-finish") {
    pivots.push({
      trigger: "You plan to stay downtown after 10:00 PM",
      response: "Keep the return leg independent of general winter trolley service.",
      source: "Published Gatlinburg winter trolley hours"
    });
  }
  if (verificationStops.length) {
    pivots.push({
      trigger: "An operator's official hours do not match the scheduled slot",
      response: "Rebuild the itinerary rather than squeezing the closed or unavailable stop into the day.",
      source: "Official attraction operating pages"
    });
  }
  if (ops.hasMajorEvent) {
    pivots.push({
      trigger: "Event-day traffic, parking or street-control notices change",
      response: "Keep the fixed event as the anchor and rebuild the surrounding movement plan.",
      source: "Official event/city operations notices"
    });
  }

  return {
    signature: deriveVisitSignature(data),
    points,
    pivots,
    sourcePolicy: "Only published, calculated or selected-plan times appear on the clock. No modeled traffic peak is presented as a fact."
  };
}

async function buildDecision(rawQuery = {}) {
  const data = await v4.buildDecision(rawQuery);
  const decisionClock = deriveDecisionClock(data);
  return {
    ...data,
    version: "3.3",
    decisionClock,
    diagnostics: {
      ...(data.diagnostics || {}),
      decisionClock: true,
      decisionClockPoints: decisionClock.points.length,
      decisionClockPivots: decisionClock.pivots.length
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
  mins,
  hhmm,
  displayTimeToHHMM,
  exactEventTime,
  deriveVisitSignature,
  deriveDecisionClock,
  indoorAlternative
};
