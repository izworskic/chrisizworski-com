const {
  CROSSING_BY_ID,
  localDateInDetroit,
  normalizeCbpTrend,
} = require("../lib/border-crossings");

const USER_AGENT =
  "MichiganBorderCrossingLive/1.0 (+https://chrisizworski.com/michigan-border-wait-times/; contact: izworski@gmail.com)";

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const crossingId = String(firstQueryValue(req.query?.crossing) || "").toLowerCase();
  const vehicle =
    String(firstQueryValue(req.query?.vehicle) || "").toLowerCase() === "commercial"
      ? "commercial"
      : "passenger";
  const requestedLane = String(firstQueryValue(req.query?.lane) || "standard").toLowerCase();
  const allowedLanes =
    vehicle === "commercial" ? ["standard", "fast"] : ["standard", "nexus", "ready"];
  const lane = allowedLanes.includes(requestedLane) ? requestedLane : "standard";
  const crossing = CROSSING_BY_ID.get(crossingId);

  if (!crossing) {
    return res.status(400).json({ error: "Unknown border crossing" });
  }

  const date = localDateInDetroit();
  const url = `https://bwt.cbp.gov/api/bwtwaittimegraph/${crossing.cbp_graph_id}/${date}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`Source returned ${response.status}`);
    const trend = normalizeCbpTrend(await response.json(), vehicle, lane);
    if (!trend) {
      return res.status(200).json({
        available: false,
        crossing_id: crossing.id,
        crossing_name: crossing.name,
        direction: "to_us",
        vehicle,
        lane,
        note: "CBP does not currently provide observed and typical hourly data for this selection.",
        source_name: "U.S. Customs and Border Protection",
        source_url: crossing.official_wait_url,
      });
    }

    const body = {
      available: true,
      crossing_id: crossing.id,
      source_name: "U.S. Customs and Border Protection",
      source_url: crossing.official_wait_url,
      ...trend,
    };
    if (req.method === "HEAD" && typeof res.end === "function") {
      return res.status(200).end();
    }
    return res.status(200).json(body);
  } catch (error) {
    console.error("[border-trends] upstream fetch failed", {
      crossing: crossing.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Official wait history is temporarily unavailable" });
  }
};
