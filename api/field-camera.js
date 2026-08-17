// Field camera proxy.
//
// Serves an allowlisted camera image, or its metadata with ?meta=1. Images are proxied rather
// than hotlinked, matching the pattern already used by api/mackinac-media.js.
//
// MDOT does not publish a capture time in its listing, so the Last-Modified header on the image
// itself is used. That matters: a road camera that froze three days ago looks exactly like a
// working one, and an unlabelled stale image is worse than showing no camera at all.

const { resolveCamera, isUsable, USER_AGENT } = require("../lib/field-cameras.js");

const MAX_AGE_HOURS = 26;

function first(value) {
  return Array.isArray(value) ? value[0] : value;
}

function metadataBody(camera, id, capturedAt, fresh) {
  return {
    id,
    source: camera.source,
    label: camera.label,
    available: true,
    fresh,
    captured_at: capturedAt,
    age_minutes: capturedAt ? Math.max(0, Math.round((Date.now() - new Date(capturedAt).getTime()) / 60000)) : null,
    image_url: camera.directImage ? camera.url : `/api/field-camera?id=${encodeURIComponent(id)}`,
    image_width: camera.imageWidth || 720,
    image_height: camera.imageHeight || 405,
    click_url: camera.clickUrl || null,
    credit: camera.credit,
    credit_url: camera.creditUrl,
    add_url: camera.addUrl || null,
    region: camera.region || null,
    zone: camera.zone || null,
    latitude: camera.latitude ?? null,
    longitude: camera.longitude ?? null,
    note: camera.note || (camera.source === "mdot"
      ? "Road weather cameras point at the roadway. They are shown for conditions, not as scenic overlooks."
      : null),
  };
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("X-Content-Type-Options", "nosniff");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const id = String(first(req.query?.id) || "").trim();
  const wantsMeta = String(first(req.query?.meta) || "") === "1";

  let camera;
  try {
    camera = await resolveCamera(id, { maxAgeHours: MAX_AGE_HOURS });
  } catch (error) {
    console.error("[field-camera] resolve failed", { id, error: String(error).slice(0, 200) });
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Camera index is temporarily unavailable" });
  }
  if (!camera) return res.status(404).json({ error: "Unknown camera" });

  if (!camera.url) {
    res.setHeader("Cache-Control", "no-store");
    const body = { id, label: camera.label, available: false, reason: camera.reason || "no image published" };
    return res.status(wantsMeta ? 200 : 503).json(body);
  }

  // Windy's terms require the API-provided image URL to be used directly and linked back to
  // its webcam page. Do not proxy or resize these images. The short cache keeps the free-tier
  // URL well inside its expiry window while avoiding a discovery request for every DOM node.
  if (camera.directImage) {
    const fresh = camera.capturedAt ? isUsable(camera.capturedAt, MAX_AGE_HOURS) : true;
    res.setHeader("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
    if (wantsMeta) return res.status(200).json(metadataBody(camera, id, camera.capturedAt, fresh));
    res.setHeader("Location", camera.url);
    return res.status(307).end();
  }

  try {
    const upstream = await fetch(camera.url, {
      headers: { accept: "image/jpeg,image/*", "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
    });
    if (!upstream.ok) throw new Error(`Upstream returned ${upstream.status}`);

    const type = String(upstream.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!type.startsWith("image/")) throw new Error(`Unexpected upstream content type: ${type || "missing"}`);

    // MDOT carries its capture time only on the image response.
    const lastModified = upstream.headers.get("last-modified");
    const capturedAt = camera.capturedAt || (lastModified ? new Date(lastModified).toISOString() : null);
    const fresh = capturedAt ? isUsable(capturedAt, MAX_AGE_HOURS) : true;

    if (wantsMeta) {
      res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=900");
      return res.status(200).json(metadataBody(camera, id, capturedAt, fresh));
    }

    res.setHeader("Content-Type", type);
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300, stale-while-revalidate=900");
    res.setHeader("Content-Disposition", "inline");
    if (capturedAt) res.setHeader("X-Captured-At", capturedAt);
    if (req.method === "HEAD") return res.status(200).end();

    const bytes = Buffer.from(await upstream.arrayBuffer());
    res.setHeader("Content-Length", String(bytes.length));
    return res.status(200).send(bytes);
  } catch (error) {
    console.error("[field-camera] upstream fetch failed", { id, error: String(error).slice(0, 200) });
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Live camera is temporarily unavailable" });
  }
}

module.exports = handler;
