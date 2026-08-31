const NOMINATIM = "https://nominatim.openstreetmap.org/search";

function cleanQuery(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 100);
}
function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function isUsCandidate(row = {}) {
  const address = row.address || {};
  const countryCode = String(address.country_code || "").toLowerCase();
  const iso = String(address["ISO3166-2-lvl4"] || "").toUpperCase();
  return countryCode === "us" || iso.startsWith("US-");
}
function placeName(address = {}) {
  return address.city || address.town || address.village || address.hamlet || address.municipality || address.county || null;
}
function chooseCandidate(rows = []) {
  const valid = rows.filter((row) => isUsCandidate(row) && finite(row.lat) !== null && finite(row.lon) !== null);
  if (!valid.length) return null;
  const preferred = valid.find((row) => {
    const type = String(row.type || "").toLowerCase();
    return ["city","town","village","hamlet","administrative","postcode"].some((x) => type.includes(x));
  });
  return preferred || valid[0];
}
async function geocode(query) {
  const params = new URLSearchParams({
    q: query,
    format: "jsonv2",
    limit: "5",
    countrycodes: "us",
    addressdetails: "1",
  });
  const response = await fetch(`${NOMINATIM}?${params}`, {
    headers: {
      accept: "application/json",
      "accept-language": "en-US,en;q=0.8",
      "user-agent": "ChrisIzworskiNationalOutdoorTools/1.0 (+https://chrisizworski.com/national-tools/)",
    },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
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
  if (q.length < 2) return res.status(400).json({ error: "Enter a U.S. city or ZIP code" });
  try {
    const row = await geocode(q);
    if (!row) return res.status(404).json({ error: "Location not found in the United States" });
    const address = row.address || {};
    const stateCode = String(address["ISO3166-2-lvl4"] || "").replace(/^US-/, "") || null;
    return res.status(200).json({
      query: q,
      displayName: row.display_name || q,
      place: placeName(address),
      state: address.state || null,
      stateCode,
      postcode: address.postcode || null,
      latitude: finite(row.lat),
      longitude: finite(row.lon),
      type: row.type || null,
      attribution: "Geocoding © OpenStreetMap contributors via Nominatim",
      retrieved_at: new Date().toISOString(),
    });
  } catch (error) {
    res.setHeader("Cache-Control", "no-store");
    return res.status(502).json({ error: "Location lookup unavailable", detail: String(error?.message || error) });
  }
};

module.exports._test = { cleanQuery, finite, isUsCandidate, placeName, chooseCandidate };
