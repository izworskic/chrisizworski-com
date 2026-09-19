// Road routing proxy for the Petoskey Wine Region planner at /petoskey-wine/.
// The planner is a static export vendored into this repo, so this is the one
// piece of it that needs a server. Body: { coordinates: [[lng,lat], ...] }.
// Returns { ok, geometry: [[lat,lng], ...], legs: [{ durationMin, distanceMi }], provider }.
//
// Defaults to the public OSRM demo server. Set MAPBOX_TOKEN to use Mapbox
// Directions instead, which is what production reliability would want.

const UA = "ChrisIzworskiPetoskeyWine/1.0 (+https://chrisizworski.com/petoskey-wine/)";

module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ ok: false, error: "bad json" });
    }
  }

  const coords = body && body.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) {
    return res.status(400).json({ ok: false, error: "need 2+ coordinates" });
  }
  if (coords.length > 12) {
    return res.status(400).json({ ok: false, error: "too many coordinates" });
  }
  for (const c of coords) {
    if (!Array.isArray(c) || c.length !== 2 || !Number.isFinite(c[0]) || !Number.isFinite(c[1])) {
      return res.status(400).json({ ok: false, error: "bad coordinate" });
    }
  }

  const coordStr = coords.map((c) => `${c[0]},${c[1]}`).join(";");
  const token = process.env.MAPBOX_TOKEN;
  const url = token
    ? `https://api.mapbox.com/directions/v5/mapbox/driving/${coordStr}?geometries=geojson&overview=full&access_token=${token}`
    : `https://router.project-osrm.org/route/v1/driving/${coordStr}?geometries=geojson&overview=full`;

  try {
    const upstream = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(9_000),
    });
    if (!upstream.ok) return res.status(502).json({ ok: false, error: `routing ${upstream.status}` });
    const payload = await upstream.json();
    const route = payload.routes && payload.routes[0];
    if (!route || !route.geometry) return res.status(502).json({ ok: false, error: "no route" });
    return res.status(200).json({
      ok: true,
      provider: token ? "mapbox" : "osrm",
      geometry: route.geometry.coordinates.map((c) => [c[1], c[0]]),
      legs: (route.legs || []).map((l) => ({
        durationMin: (l.duration || 0) / 60,
        distanceMi: (l.distance || 0) / 1609.34,
      })),
    });
  } catch {
    return res.status(502).json({ ok: false, error: "routing unavailable" });
  }
};
