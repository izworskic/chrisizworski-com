"use strict";

// Common starting cities with drive minutes to both ferry docks, so the most frequent
// origins resolve instantly and never depend on the public Nominatim geocoder (which
// rate-limits: HTTP 429) or the public OSRM demo routers. Anything not listed still
// falls through to the live geocoder + router in api/mackinac-origin.js.
//
// Minutes are OSRM car-routing durations measured 2026-09-28 from each city centre to
// the Mackinaw City and St. Ignace ferry docks: free-flow planning estimates, not live
// traffic, the same source and meaning as the live path.
// [name, region, lat, lon, minutes to Mackinaw City, minutes to St. Ignace]
const ORIGINS = Object.freeze([
  ["Mackinaw City","MI",45.7839,-84.7278,2,13],
  ["St. Ignace","MI",45.8661,-84.7275,15,1],
  ["Detroit","MI",42.3314,-83.0458,302,311],
  ["Ann Arbor","MI",42.2808,-83.743,285,294],
  ["Lansing","MI",42.7325,-84.5555,238,247],
  ["East Lansing","MI",42.737,-84.4839,235,244],
  ["Grand Rapids","MI",42.9634,-85.6681,255,265],
  ["Kalamazoo","MI",42.2917,-85.5872,308,318],
  ["Flint","MI",43.0125,-83.6875,231,241],
  ["Saginaw","MI",43.4195,-83.9508,200,210],
  ["Bay City","MI",43.5945,-83.8889,185,195],
  ["Midland","MI",43.6156,-84.2472,181,191],
  ["Traverse City","MI",44.7631,-85.6206,148,158],
  ["Petoskey","MI",45.3736,-84.9553,56,66],
  ["Cheboygan","MI",45.6469,-84.4745,24,35],
  ["Gaylord","MI",45.0275,-84.6748,61,71],
  ["Mount Pleasant","MI",43.5978,-84.7675,164,174],
  ["Alpena","MI",45.0617,-83.4327,120,131],
  ["Muskegon","MI",43.2342,-86.2484,284,294],
  ["Holland","MI",42.7875,-86.1089,288,298],
  ["Battle Creek","MI",42.3212,-85.1797,296,305],
  ["Jackson","MI",42.2459,-84.4013,272,282],
  ["Troy","MI",42.6064,-83.1498,279,289],
  ["Novi","MI",42.4806,-83.4755,281,290],
  ["Livonia","MI",42.3684,-83.3527,298,308],
  ["Warren","MI",42.5145,-83.0147,296,306],
  ["Sterling Heights","MI",42.5803,-83.0302,288,298],
  ["Dearborn","MI",42.3223,-83.1763,307,317],
  ["Port Huron","MI",42.9709,-82.4249,299,308],
  ["Frankenmuth","MI",43.3317,-83.738,211,221],
  ["Grayling","MI",44.6614,-84.7148,89,99],
  ["Cadillac","MI",44.2519,-85.4012,160,169],
  ["Ludington","MI",43.9553,-86.4526,255,264],
  ["Houghton Lake","MI",44.3142,-84.7648,115,124],
  ["Charlevoix","MI",45.318,-85.2584,81,90],
  ["Harbor Springs","MI",45.4317,-84.992,56,66],
  ["Marquette","MI",46.5436,-87.3954,206,197],
  ["Sault Ste. Marie","MI",46.4953,-84.3453,66,56],
  ["Escanaba","MI",45.7453,-87.0646,182,173],
  ["Houghton","MI",47.1211,-88.5694,334,325],
  ["Munising","MI",46.4111,-86.6479,152,143],
  ["Newberry","MI",46.3547,-85.5096,93,83],
  ["Chicago","IL",41.8781,-87.6298,455,465],
  ["Milwaukee","WI",43.0389,-87.9065,445,437],
  ["Green Bay","WI",44.5133,-88.0133,320,312],
  ["Madison","WI",43.0731,-89.4012,482,473],
  ["Minneapolis","MN",44.9778,-93.265,626,617],
  ["Indianapolis","IN",39.7684,-86.1581,516,525],
  ["Fort Wayne","IN",41.0793,-85.1394,381,391],
  ["South Bend","IN",41.6764,-86.252,382,392],
  ["Toledo","OH",41.6528,-83.5379,344,354],
  ["Columbus","OH",39.9612,-82.9988,508,517],
  ["Cleveland","OH",41.4993,-81.6944,470,479],
  ["Cincinnati","OH",39.1031,-84.512,563,573],
  ["Pittsburgh","PA",40.4406,-79.9959,598,607],
  ["St. Louis","MO",38.627,-90.1994,749,759],
  ["Louisville","KY",38.2527,-85.7585,632,642],
  ["Toronto","ON",43.6532,-79.3832,508,517],
  ["London","ON",42.9849,-81.2453,385,394],
  ["Windsor","ON",42.3149,-83.0364,306,316],
  ["Sault Ste. Marie","ON",46.5219,-84.3461,68,58]
]);

const REGION_NAMES = Object.freeze({
  MI:"michigan", IL:"illinois", WI:"wisconsin", MN:"minnesota", IN:"indiana", OH:"ohio",
  PA:"pennsylvania", MO:"missouri", KY:"kentucky", ON:"ontario"
});

function norm(s) {
  return String(s || "").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/\bsaint\b/g, "st").replace(/[^a-z0-9 ]+/g, " ").replace(/\b(usa|us|united states|canada|ca)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}

// "Detroit", "Detroit, MI", "detroit michigan", "Sault Ste. Marie, ON" -> row. A bare
// ambiguous name (Sault Ste. Marie) resolves to the Michigan side, like most visitors.
function lookupOrigin(query) {
  const q = norm(query);
  if (!q || /\d/.test(q)) return null;
  let best = null;
  for (const [name, region, lat, lon, mackinaw, stIgnace] of ORIGINS) {
    const n = norm(name), r = region.toLowerCase(), full = REGION_NAMES[region];
    const forms = [n, `${n} ${r}`, `${n} ${full}`];
    if (!forms.includes(q)) continue;
    const row = {name, region, lat, lon, mackinaw, stIgnace};
    if (q !== n) return row;
    if (!best || region === "MI") best = row;
  }
  return best;
}

function originResponse(query, row) {
  const routes = [
    {port: "Mackinaw City", drive_minutes: row.mackinaw, drive_miles: null},
    {port: "St. Ignace", drive_minutes: row.stIgnace, drive_miles: null}
  ];
  const preferred = routes.slice().sort((a, b) => a.drive_minutes - b.drive_minutes)[0];
  return {
    query,
    origin: {label: `${row.name}, ${row.region}`, lat: row.lat, lon: row.lon},
    preferred_port: preferred.port,
    drive_minutes: preferred.drive_minutes,
    drive_miles: null,
    routes,
    source: "Built-in starting city (OSRM car routing, measured 2026-09-28)",
    boundary: "Drive times are planning estimates, not live traffic. Ferry parking and dock check-in time are added separately."
  };
}

module.exports = {ORIGINS, lookupOrigin, originResponse};
