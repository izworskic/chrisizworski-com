const NOMINATIM = "https://nominatim.openstreetmap.org/search";
const MICHIGAN_VIEWBOX = "-90.6,49.6,-82.0,41.5";

function cleanQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}

function validCoordinate(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max;
}

function isMichiganCandidate(row = {}) {
  const address = row.address || {};
  const state = String(address.state || "").toLowerCase();
  const stateCode = String(address['ISO3166-2-lvl4'] || address.state_code || "").toUpperCase();
  const display = String(row.display_name || "").toLowerCase();
  return state === "michigan" || stateCode === "US-MI" || stateCode === "MI" || /(?:^|,\s*)michigan(?:,|$)/.test(display);
}

function chooseCandidate(rows = []) {
  const valid = rows.filter(row =>
    validCoordinate(row?.lat, 41.5, 49.6) &&
    validCoordinate(row?.lon, -90.6, -82.0) &&
    isMichiganCandidate(row)
  );
  if (!valid.length) return null;
  const preferred = valid.find(row => {
    const type = String(row.type || "").toLowerCase();
    const cls = String(row.class || row.category || "").toLowerCase();
    return ["city","town","village","hamlet","administrative","bay","lake","river","harbour","marina"].some(x => type.includes(x) || cls.includes(x));
  });
  return preferred || valid[0];
}

async function geocode(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "us",
    viewbox: MICHIGAN_VIEWBOX,
    bounded: "1",
    addressdetails: "1",
  });
  const response = await fetch(`${NOMINATIM}?${params}`, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.8",
      "user-agent": "ChrisIzworskiBoatLaunchFinder/3.0 (+https://chrisizworski.com/michigan-boat-launches/)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`Destination geocoder returned ${response.status}`);
  return chooseCandidate(await response.json());
}

module.exports = async function handler(req, res) {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");

  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const q = cleanQuery(req.query?.q);
  if (q.length < 2) return res.status(400).json({ error: "Enter a Michigan destination" });

  try {
    const row = await geocode(q);
    if (!row) return res.status(404).json({ error: "Destination not found in Michigan" });
    return res.status(200).json({
      query: q,
      displayName: row.display_name || q,
      latitude: Number(row.lat),
      longitude: Number(row.lon),
      type: row.type || null,
      osmType: row.osm_type || null,
      osmId: row.osm_id || null,
      attribution: "Geocoding © OpenStreetMap contributors via Nominatim",
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({
      error: "Destination lookup unavailable",
      detail: String(error?.message || error),
    });
  }
};

module.exports._test = { NOMINATIM, MICHIGAN_VIEWBOX, cleanQuery, validCoordinate, isMichiganCandidate, chooseCandidate };
