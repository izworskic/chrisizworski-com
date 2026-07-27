const MEDIA_SOURCES = Object.freeze({
  "camera:north": {
    id: "camera-north",
    url: "https://www.mackinacbridge.org/wp-content/camimages/MacBridge_image4_medium.jpg",
    contentType: "image/jpeg",
    cacheControl: "public, max-age=30, s-maxage=50, stale-while-revalidate=300",
  },
  "camera:south": {
    id: "camera-south",
    url: "https://www.mackinacbridge.org/wp-content/camimages/MacBridge_image2_large.jpg",
    contentType: "image/jpeg",
    cacheControl: "public, max-age=30, s-maxage=50, stale-while-revalidate=300",
  },
  radar: {
    id: "radar-kapx",
    url: "https://radar.weather.gov/ridge/standard/KAPX_loop.gif",
    contentType: "image/gif",
    cacheControl: "public, max-age=60, s-maxage=120, stale-while-revalidate=600",
  },
});

const USER_AGENT =
  "MackinacBridgeLive/1.0 (+https://chrisizworski.com/mackinac-bridge-live/; contact: izworski@gmail.com)";

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function selectMediaSource(query = {}) {
  const asset = String(firstQueryValue(query.asset) || "").toLowerCase();
  if (asset === "radar") return MEDIA_SOURCES.radar;
  if (asset !== "camera") return null;

  const direction = String(firstQueryValue(query.direction) || "").toLowerCase();
  return MEDIA_SOURCES[`camera:${direction}`] || null;
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const source = selectMediaSource(req.query);
  if (!source) {
    return res.status(400).json({ error: "Unknown Mackinac media source" });
  }

  try {
    const upstream = await fetch(source.url, {
      headers: {
        accept: source.contentType,
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!upstream.ok) {
      throw new Error(`Upstream returned ${upstream.status}`);
    }

    const upstreamType = String(upstream.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (upstreamType !== source.contentType) {
      throw new Error(`Unexpected upstream content type: ${upstreamType || "missing"}`);
    }

    res.setHeader("Content-Type", source.contentType);
    res.setHeader("Cache-Control", source.cacheControl);
    res.setHeader("Content-Disposition", "inline");

    if (req.method === "HEAD") {
      return res.status(200).end();
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Length", String(bytes.length));
    return res.status(200).send(bytes);
  } catch (error) {
    console.error("[mackinac-media] upstream fetch failed", {
      source: source.id,
      error: error instanceof Error ? error.message : String(error),
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Live media is temporarily unavailable" });
  }
}

module.exports = handler;
module.exports.MEDIA_SOURCES = MEDIA_SOURCES;
module.exports.selectMediaSource = selectMediaSource;
