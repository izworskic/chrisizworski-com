const { CROSSINGS } = require("../lib/border-crossings");

const MEDIA_SOURCES = Object.freeze(
  Object.fromEntries(
    CROSSINGS.flatMap((crossing) =>
      crossing.cameras.map((camera) => [
        camera.id,
        Object.freeze({
          id: camera.id,
          crossingId: crossing.id,
          url: camera.upstream_url,
          contentTypes: ["image/jpeg", "image/jpg", "image/png"],
          cacheControl: "public, max-age=30, s-maxage=50, stale-while-revalidate=300",
        }),
      ]),
    ),
  ),
);

const USER_AGENT =
  "MichiganBorderCrossingLive/1.0 (+https://chrisizworski.com/michigan-border-wait-times/; contact: izworski@gmail.com)";

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value;
}

function selectMediaSource(query = {}) {
  const camera = String(firstQueryValue(query.camera) || "").toLowerCase();
  return MEDIA_SOURCES[camera] || null;
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
    return res.status(400).json({ error: "Unknown border camera" });
  }

  try {
    const upstream = await fetch(source.url, {
      headers: {
        accept: source.contentTypes.join(", "),
        "user-agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);

    const upstreamType = String(upstream.headers.get("content-type") || "")
      .split(";")[0]
      .trim()
      .toLowerCase();
    if (!source.contentTypes.includes(upstreamType)) {
      throw new Error(`Unexpected upstream content type: ${upstreamType || "missing"}`);
    }

    res.setHeader("Content-Type", upstreamType === "image/jpg" ? "image/jpeg" : upstreamType);
    res.setHeader("Cache-Control", source.cacheControl);
    res.setHeader("Content-Disposition", "inline");

    if (req.method === "HEAD") {
      return res.status(200).end();
    }

    const bytes = Buffer.from(await upstream.arrayBuffer());
    if (!bytes.length || bytes.length > 8_000_000) {
      throw new Error("Upstream image size is invalid");
    }
    res.setHeader("Content-Length", String(bytes.length));
    return res.status(200).send(bytes);
  } catch (error) {
    console.error("[border-media] upstream fetch failed", {
      source: source.id,
      crossing: source.crossingId,
      error: error instanceof Error ? error.message : String(error),
    });
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Live camera is temporarily unavailable" });
  }
}

module.exports = handler;
module.exports.MEDIA_SOURCES = MEDIA_SOURCES;
module.exports.selectMediaSource = selectMediaSource;
