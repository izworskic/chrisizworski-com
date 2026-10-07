"use strict";

const WINDOWS = {
  quick: { id: "quick", label: "Quick afternoon", start: "13:00", end: "17:00" },
  half: { id: "half", label: "Half day", start: "10:00", end: "16:00" },
  full: { id: "full", label: "Full day", start: "09:00", end: "18:00" },
};

const INTENTS = {
  "first-trip": { label: "Best first trip", wineStyle: false },
  "serious-wine": { label: "Wine first", wineStyle: false },
  riesling: { label: "Riesling", wineStyle: true },
  sparkling: { label: "Sparkling", wineStyle: true },
  reds: { label: "Reds", wineStyle: true },
  whites: { label: "Whites", wineStyle: true },
  food: { label: "Wine + food", wineStyle: false },
  views: { label: "Great views", wineStyle: false },
  quiet: { label: "Quiet / relaxed", wineStyle: false },
};

const STYLE_MAP = {
  riesling: ["riesling"],
  sparkling: ["sparkling"],
  reds: ["cabernet-franc", "pinot-noir", "merlot", "dry-reds"],
  whites: ["dry-whites", "chardonnay", "pinot-gris", "riesling"],
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

function toClock(minutes) {
  const safe = clamp(Math.round(minutes), 0, 1439);
  return String(Math.floor(safe / 60)).padStart(2, "0") + ":" + String(safe % 60).padStart(2, "0");
}

function windowFromInput(input = {}) {
  if (input.window && WINDOWS[input.window]) return WINDOWS[input.window];
  const start = toMinutes(input.start);
  const end = toMinutes(input.end);
  if (start !== null && end !== null && end > start + 119) {
    return { id: "custom", label: "Custom window", start: toClock(start), end: toClock(end) };
  }
  return WINDOWS.full;
}

function dayName(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) return null;
  const d = new Date(date + "T12:00:00Z");
  return Number.isNaN(d.getTime()) ? null : ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getUTCDay()];
}

function experienceValue(level) {
  if (level === "high") return 1;
  if (level === "medium") return 0.6;
  if (level === "low") return 0.2;
  return 0.45;
}

function compactnessValue(contract, selectedCluster) {
  const level = selectedCluster?.compactness || contract.region?.experience?.compactness;
  if (level === "high") return 1;
  if (level === "medium" || level === "clustered") return 0.62;
  if (level === "low") return 0.2;
  return 0.45;
}

function localDriveAllowance(contract, selectedCluster) {
  const compactness = compactnessValue(contract, selectedCluster);
  if (compactness >= 0.9) return 35;
  if (compactness >= 0.55) return 55;
  return 75;
}

function operatingFor(contract, date) {
  const day = dayName(date);
  const op = day ? contract.operatingByWeekday?.[day] : null;
  if (!op) {
    const inventory = contract.inventory || {};
    return {
      day,
      knownOpen: 0,
      knownClosed: 0,
      unknown: Number(inventory.unknownHoursCount || inventory.modeledStopCount || inventory.wineryCount || 0),
      source: "coverage-only",
    };
  }
  return { day, ...op, source: "weekday-contract" };
}

function freshnessDays(reviewedAt, targetDate) {
  if (!reviewedAt || !targetDate) return null;
  const reviewed = new Date(reviewedAt + "T12:00:00Z");
  const target = new Date(targetDate + "T12:00:00Z");
  if (Number.isNaN(reviewed.getTime()) || Number.isNaN(target.getTime())) return null;
  return Math.max(0, Math.round((target - reviewed) / 86400000));
}

function confidenceFor(contract, { date, intent, adapterStatus }) {
  const inventory = contract.inventory || {};
  const total = Number(inventory.wineryCount || inventory.modeledStopCount || 0);
  const known = Number(inventory.knownHoursCount || 0);
  const coverage = total > 0 ? known / total : 0;
  const age = freshnessDays(contract.freshness?.wineryTruthReviewedAt, date);
  const reasons = [];
  let rank = 2;

  if (coverage >= 0.75) reasons.push("most modeled winery hours are verified");
  else if (coverage >= 0.35) { rank = Math.min(rank, 1); reasons.push("some winery hours remain unverified"); }
  else { rank = 0; reasons.push("hours coverage is limited; confirm stops before leaving"); }

  if (age !== null && age > 120) { rank = Math.min(rank, 0); reasons.push("regional evidence is old for the selected date"); }
  else if (age !== null && age > 45) { rank = Math.min(rank, 1); reasons.push("regional evidence should be rechecked near the trip date"); }

  if (adapterStatus !== "live" && adapterStatus !== "local") {
    rank = Math.min(rank, 1);
    reasons.push("the live regional adapter was unavailable, so a dated snapshot was used");
  }

  if (INTENTS[intent]?.wineStyle && Number(contract.intentEvidence?.[intent] || 0) === 0) {
    rank = Math.min(rank, 0);
    reasons.push("this wine style is not positively verified in the comparison contract");
  }

  const labels = ["Limited evidence", "Medium confidence", "High confidence"];
  return { class: labels[rank], rank, reasons };
}

function weatherModifier(weather, intent) {
  if (!weather || weather.state === "unavailable") return 0;
  if (weather.rainy && (intent === "views" || intent === "first-trip")) return -3;
  if (!weather.rainy && weather.outdoorFriendly && (intent === "views" || intent === "first-trip")) return 3;
  return 0;
}

function experienceScore(contract, intent) {
  const exp = contract.region?.experience || {};
  const inventory = contract.inventory || {};
  if (intent === "first-trip") return 10 * experienceValue(exp.firstTripAppeal) + 4 * experienceValue(exp.scenery);
  if (intent === "food") return Math.min(9, Number(inventory.foodSignalCount || 0) * 2) + 3 * experienceValue(exp.villages);
  if (intent === "views") return 11 * experienceValue(exp.scenery);
  if (intent === "quiet") return 10 * experienceValue(exp.relaxedPace);
  if (intent === "serious-wine") return 5 * experienceValue(exp.variety);
  return 3 * experienceValue(exp.variety);
}

function selectedClusterFor(contract, travelByTarget) {
  const clusters = contract.region?.clusters;
  if (!clusters) return null;
  const candidates = Object.values(clusters)
    .map((cluster) => ({ ...cluster, travelMin: travelByTarget[contract.region.id + ":" + cluster.id] }))
    .filter((cluster) => Number.isFinite(cluster.travelMin))
    .sort((a, b) => a.travelMin - b.travelMin);
  return candidates[0] || Object.values(clusters)[0] || null;
}

function evaluateRegion(contract, context) {
  const { date, intent, window, travelByTarget, adapterStatus, weather } = context;
  const selectedCluster = selectedClusterFor(contract, travelByTarget);
  const targetKey = selectedCluster ? contract.region.id + ":" + selectedCluster.id : contract.region.id;
  const travelMin = Number(travelByTarget[targetKey]);
  const start = toMinutes(window.start);
  const end = toMinutes(window.end);
  const regionOpen = 11 * 60;
  const regionClose = 18 * 60;
  const localStart = Math.max(regionOpen, start + (Number.isFinite(travelMin) ? travelMin : 9999));
  const localEnd = Math.min(regionClose, end - (Number.isFinite(travelMin) ? travelMin : 9999));
  const localWindow = Math.max(0, localEnd - localStart);
  const driveAllowance = localDriveAllowance(contract, selectedCluster);
  const usableMinutes = Math.max(0, localWindow - driveAllowance);
  const operating = operatingFor(contract, date);
  const inventory = contract.inventory || {};
  const modeledCount = Number(inventory.wineryCount || inventory.modeledStopCount || 0);
  const possibleStops = operating.knownOpen + operating.unknown;
  const gateReasons = [];

  if (!modeledCount || modeledCount < 2) gateReasons.push("not enough trustworthy regional coverage");
  if (!Number.isFinite(travelMin)) gateReasons.push("travel time could not be estimated");
  if (localWindow < 120 || usableMinutes < 75) gateReasons.push("travel leaves too little usable wine-country time");
  if (possibleStops < 2) gateReasons.push("too few potentially operating stops for the selected day");

  const feasible = gateReasons.length === 0;
  const intentEvidence = Number(contract.intentEvidence?.[intent] || 0);
  const evidenceBonus = Math.min(intentEvidence, 3) / 3 * 20;
  const available = Math.max(1, end - start);
  const usableRatio = clamp(localWindow / Math.min(420, available), 0, 1);
  const travelEfficiency = clamp(1 - travelMin / 240, 0, 1);
  const compactness = compactnessValue(contract, selectedCluster);
  const score = feasible
    ? Math.round(
        usableRatio * 34 +
        travelEfficiency * 18 +
        evidenceBonus +
        compactness * 10 +
        experienceScore(contract, intent) +
        weatherModifier(weather, intent)
      )
    : -999 + Math.round(localWindow / 10);

  const confidence = confidenceFor(contract, { date, intent, adapterStatus });
  const why = [];
  if (feasible) {
    why.push(
      travelMin <= 45
        ? "little of your day is lost getting there"
        : travelMin <= 100
          ? "the drive still leaves a workable tasting window"
          : "it remains feasible because your selected day is long enough"
    );
    if (intentEvidence > 0) why.push("the regional data has positive evidence for " + INTENTS[intent].label.toLowerCase());
    if (compactness >= 0.9) why.push("the modeled stops are unusually compact once you arrive");
    else if (selectedCluster) why.push("the broad Southwest region is narrowed to the " + selectedCluster.label + " cluster");
    if (operating.knownOpen >= 3) why.push(operating.knownOpen + " modeled wineries have verified open schedules for " + operating.day);
    else if (operating.unknown > 0) why.push("unknown hours lower confidence rather than being treated as closed");
  }

  return {
    regionId: contract.region.id,
    label: contract.region.label,
    publicLabel: contract.region.publicLabel || contract.region.label,
    score,
    feasible,
    gateReasons,
    travelMin: Number.isFinite(travelMin) ? Math.round(travelMin) : null,
    roundTripMin: Number.isFinite(travelMin) ? Math.round(travelMin * 2) : null,
    localStart: localWindow > 0 ? toClock(localStart) : null,
    localEnd: localWindow > 0 ? toClock(localEnd) : null,
    localWindowMin: Math.round(localWindow),
    usableMinutes: Math.round(usableMinutes),
    localDriveAllowanceMin: driveAllowance,
    intentEvidence,
    operating,
    confidence,
    why,
    selectedCluster: selectedCluster ? { id: selectedCluster.id, label: selectedCluster.label, compactness: selectedCluster.compactness } : null,
    adapterStatus,
    weather: weather || { state: "unavailable" },
    contract,
  };
}

function selectedStops(contract, intent, regionEvaluation) {
  if (regionEvaluation.selectedCluster) {
    return regionEvaluation.selectedCluster.presets?.[intent] || regionEvaluation.selectedCluster.presets?.["first-trip"] || [];
  }
  if (Array.isArray(contract.handoff?.selected)) return contract.handoff.selected;
  return contract.handoff?.presets?.[intent] || contract.handoff?.presets?.["first-trip"] || [];
}

function buildPlanHash(contract, intent, date, evaluation) {
  const selected = selectedStops(contract, intent, evaluation);
  if (!selected.length) return "";
  const payload = {
    v: 1,
    o: contract.handoff?.plannerOrigin || contract.region?.plannerOrigin || "Traverse City",
    d: date,
    s: evaluation.localStart || "11:00",
    e: evaluation.localEnd || "18:00",
    p: evaluation.localWindowMin <= 240 ? "efficient" : "standard",
    x: 0,
    a: contract.handoff?.area || "any",
    b: ["wine"],
    y: STYLE_MAP[intent] || [],
    k: intent === "food" ? ["food"] : intent === "views" ? ["scenic"] : [],
    i: selected,
  };
  return "#plan=" + Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function handoffFor(evaluation, intent, date) {
  const contract = evaluation.contract;
  if (evaluation.regionId === "southwest") {
    const params = new URLSearchParams({
      cluster: evaluation.selectedCluster?.id || "south-berrien",
      intent,
      date,
      start: evaluation.localStart || "11:00",
      end: evaluation.localEnd || "18:00",
    });
    return {
      label: "Build my Southwest Michigan day",
      url: contract.handoff.plannerUrl + "?" + params.toString(),
      preserves: ["date", "intent", "time window", "recommended cluster"],
    };
  }
  const hash = buildPlanHash(contract, intent, date, evaluation);
  return {
    label: "Build my " + evaluation.publicLabel + " day",
    url: contract.handoff?.plannerUrl + hash,
    preserves: ["date", "intent", "time window", "starter stops"],
  };
}

function tradeoff(winner, runner, intent) {
  if (!runner) return null;
  const driveDelta = (runner.roundTripMin || 0) - (winner.roundTripMin || 0);
  if (driveDelta >= 45) {
    return "Choose " + runner.publicLabel + " instead if its experience matters more than about " + Math.round(driveDelta / 15) * 15 + " extra minutes of round-trip travel.";
  }
  if (runner.intentEvidence > winner.intentEvidence && INTENTS[intent]?.wineStyle) {
    return "Choose " + runner.publicLabel + " instead if you want to prioritize its stronger verified " + INTENTS[intent].label.toLowerCase() + " evidence over the winner's easier day.";
  }
  const wCompact = compactnessValue(winner.contract, winner.selectedCluster);
  const rCompact = compactnessValue(runner.contract, runner.selectedCluster);
  if (wCompact > rCompact + 0.2) {
    return "Choose " + runner.publicLabel + " instead if variety and exploration matter more than minimizing driving within wine country.";
  }
  return "Choose " + runner.publicLabel + " instead if its regional character matters more to you than the winner's overall balance of travel, time and fit.";
}

function publicEvaluation(evaluation, intent, date) {
  const copy = { ...evaluation };
  delete copy.score;
  delete copy.contract;
  copy.handoff = evaluation.feasible ? handoffFor(evaluation, intent, date) : null;
  return copy;
}

function decideWineRegion({ contracts, adapterStatuses = {}, date, intent = "first-trip", window: windowInput, travelByTarget = {}, weatherByRegion = {} }) {
  const window = windowFromInput(windowInput || {});
  const normalizedIntent = INTENTS[intent] ? intent : "first-trip";
  const evaluations = contracts.map((contract) => evaluateRegion(contract, {
    date,
    intent: normalizedIntent,
    window,
    travelByTarget,
    adapterStatus: adapterStatuses[contract.region.id] || "local",
    weather: weatherByRegion[contract.region.id],
  })).sort((a, b) => b.score - a.score);

  const feasible = evaluations.filter((row) => row.feasible);
  if (!feasible.length) {
    const nearest = [...evaluations].sort((a, b) => (a.travelMin ?? 9999) - (b.travelMin ?? 9999))[0];
    return {
      state: "NO_WORTHWHILE_REGION",
      window,
      intent: normalizedIntent,
      message: nearest
        ? "None of the modeled wine regions leaves enough usable wine-country time inside this window. " + nearest.publicLabel + " is closest, but the drive would consume too much of the day."
        : "No modeled region can be evaluated for this trip.",
      winner: null,
      alternatives: evaluations.slice(0, 3).map((row) => publicEvaluation(row, normalizedIntent, date)),
    };
  }

  const winner = feasible[0];
  const runner = feasible[1] || null;
  const winnerPublic = publicEvaluation(winner, normalizedIntent, date);
  winnerPublic.tradeoff = tradeoff(winner, runner, normalizedIntent);
  return {
    state: "RECOMMENDATION",
    window,
    intent: normalizedIntent,
    winner: winnerPublic,
    alternatives: feasible.slice(1, 3).map((row) => publicEvaluation(row, normalizedIntent, date)),
    excluded: evaluations.filter((row) => !row.feasible).map((row) => publicEvaluation(row, normalizedIntent, date)),
  };
}

module.exports = {
  WINDOWS,
  INTENTS,
  dayName,
  windowFromInput,
  decideWineRegion,
  buildPlanHash,
};
