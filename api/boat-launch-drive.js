/*
 * Road distance and drive time from one destination to a small set of launch
 * coordinates, used to rank the boat launch shortlist by how far it actually is
 * to tow a trailer rather than by straight-line distance across open water.
 *
 * One upstream table request per search. Failures are loud (400/502) and never
 * a 200 with an error in the body, so a broken router cannot look like a
 * successful empty ranking.
 */
/*
 * FOSSGIS runs the OpenStreetMap community router and is the right primary for
 * production use, but it queues requests and routinely answers a twelve point
 * table in about nine seconds, which is longer than this function may run. The
 * project-osrm demo host answers the same query in under half a second and is
 * used only as a fallback. Both are free community services, so the route asks
 * for one small table per destination search and the answer is cached at the
 * edge for a day. If this page ever carries real traffic, move to a hosted or
 * self-run routing service rather than leaning harder on either of these.
 */
const OSRM_HOSTS = [
  { url: "https://routing.openstreetmap.de/routed-car/table/v1/driving", label: "routing.openstreetmap.de", timeoutMs: 4500 },
  { url: "http://router.project-osrm.org/table/v1/driving", label: "router.project-osrm.org", timeoutMs: 3500 },
];
const MAX_DESTINATIONS = 24;
const UPSTREAM_TIMEOUT_MS = 4500;

function parsePoint(value) {
  const parts = String(value || "").split(",");
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lon = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) };
}

function parseDestinations(value) {
  const raw = String(value || "")
    .split(";")
    .map(x => x.trim())
    .filter(Boolean);
  if (!raw.length || raw.length > MAX_DESTINATIONS) return null;
  const points = raw.map(parsePoint);
  return points.every(Boolean) ? points : null;
}

function coordinateList(points) {
  return points.map(p => `${p.lon},${p.lat}`).join(";");
}

async function tableFrom(host, origin, destinations) {
  const params = new URLSearchParams({
    sources: "0",
    annotations: "duration,distance",
  });
  const url = `${host.url}/${coordinateList([origin, ...destinations])}?${params}`;
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent":
        "ChrisIzworskiBoatLaunchFinder/3.1 (+https://chrisizworski.com/michigan-boat-launches/)",
    },
    signal: AbortSignal.timeout(host.timeoutMs),
  });
  if (!response.ok) throw new Error(`${host.label} returned ${response.status}`);
  const data = await response.json();
  if (data?.code && data.code !== "Ok") throw new Error(data.message || `${host.label} said ${data.code}`);
  const distances = data?.distances?.[0];
  const durations = data?.durations?.[0];
  if (!Array.isArray(distances)) throw new Error(`${host.label} returned no distance matrix`);
  return { distances, durations: Array.isArray(durations) ? durations : [], host: host.label };
}

async function table(origin, destinations) {
  let lastError = null;
  for (const host of OSRM_HOSTS) {
    try {
      return await tableFrom(host, origin, destinations);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error("No routing host answered");
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const origin = parsePoint(req.query?.from);
  const destinations = parseDestinations(req.query?.to);
  if (!origin || !destinations) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(400).json({
      error: "Provide from=lat,lon and to=lat,lon;lat,lon",
      max_destinations: MAX_DESTINATIONS,
    });
  }

  try {
    const { distances, durations, host } = await table(origin, destinations);
    /*
     * distances[0] is the origin to itself, so leg i of the response describes
     * destination i. A null entry means the router could not reach that point;
     * it is reported as an absent leg rather than as a zero.
     */
    const legs = destinations
      .map((_, index) => {
        const meters = distances[index + 1];
        const seconds = durations[index + 1];
        if (!Number.isFinite(Number(meters))) return null;
        return {
          index,
          meters: Number(meters),
          seconds: Number.isFinite(Number(seconds)) ? Number(seconds) : null,
        };
      })
      .filter(Boolean);

    if (!legs.length) throw new Error("Routing service could not reach any launch coordinate");

    res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return res.status(200).json({
      source: `OSRM routing via ${host}`,
      source_url: "https://routing.openstreetmap.de/",
      attribution: "Routing © OpenStreetMap contributors, served by FOSSGIS",
      profile: "car",
      requested: destinations.length,
      routed: legs.length,
      legs,
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "Drive-distance routing unavailable",
      detail: String(error?.message || error),
    });
  }
};

module.exports._test = {
  OSRM_HOSTS,
  MAX_DESTINATIONS,
  UPSTREAM_TIMEOUT_MS,
  parsePoint,
  parseDestinations,
  coordinateList,
};
