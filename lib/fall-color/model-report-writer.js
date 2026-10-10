// Source-grounded fall-color briefing. No LLM, API key, or paid text generation.
// The inputs come from the existing per-region weather/canopy model; this module
// is deliberately pure so the daily report can be tested without network access.
function writeModelReport(snap) {
  const regions = Array.isArray(snap)
    ? snap.filter((r) => r && typeof r.name === "string" && Number.isFinite(r.pct) && r.pct >= 0 && r.pct <= 100)
    : [];
  if (!regions.length) return null;

  const ranked = [...regions].sort((a, b) => b.pct - a.pct);
  const leader = ranked[0];
  const nearPeak = regions.filter((r) => r.phase === "peak" || (r.pct >= 85 && r.phase === "rising"));
  const down = regions.filter((r) => r.phase === "falling" || r.phase === "down");
  const pct = (r) => Math.round(r.pct) + "%";
  const overview = nearPeak.length
    ? "The regional model places " + nearPeak.slice(0, 3).map((r) => r.name).join(", ") +
      " at or approaching peak color. " + leader.name + " is estimated at " + pct(leader) + "."
    : "The strongest modeled color is currently in " + leader.name +
      ", estimated at " + pct(leader) + " (" + leader.label.toLowerCase() + ").";
  const others = ranked.slice(1, 3);
  const contrast = others.length
    ? " Elsewhere, " + others.map((r) => r.name + " is estimated at " + pct(r)).join("; ") + "."
    : "";
  const first = overview + contrast +
    " These percentages are seasonal model estimates, not counts of leaves observed on the ground.";

  const north = regions[0], south = regions[regions.length - 1];
  const spread = north.id !== south.id
    ? " The north-to-south spread runs from " + north.name + " (" + pct(north) +
      ") to " + south.name + " (" + pct(south) + ")."
    : "";
  const weather = leader.weatherFeel && leader.weatherFeel !== "sky forecast unavailable"
    ? " The short-range forecast near " + leader.name + " calls for " + leader.weatherFeel + "."
    : " A reliable short-range weather description is not available for the leading region.";
  const drivers = leader.source && Array.isArray(leader.source.drivers)
    ? leader.source.drivers.filter(Boolean)
    : [];
  const basis = " Today's modeled estimate draws on " +
    (drivers.length ? drivers.join(", ") : "regional seasonal timing") +
    "; consult the source dates shown with the live readings before traveling.";
  const second = "Fall does not advance at the same rate across Michigan." + spread + weather + basis;

  const outing = [leader.drive && "a drive such as " + leader.drive,
    leader.hike && "a walk around " + leader.hike,
    leader.paddle && "a paddle on " + leader.paddle].filter(Boolean);
  const idea = outing.length
    ? "For a closer look, the regional guide includes " + outing.slice(0, 2).join(" or ") + ". "
    : "";
  const past = down.length
    ? down.length + " region" + (down.length === 1 ? " is" : "s are") +
      " modeled as fading or beyond peak, so the best location will depend on your dates. "
    : "Different elevations and local weather can put nearby places at different stages. ";
  const third = idea + past +
    "Use the interactive map and date slider for place-by-place comparisons, and confirm current conditions locally if you are planning a long trip.";

  return [first, second, third].join("\n\n");
}

module.exports = { writeModelReport };
