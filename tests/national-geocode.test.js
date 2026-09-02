const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const geo=require("../api/national-geocode.js")._test;

test("device coordinates are rounded to about 0.001 degrees",()=>{
  assert.equal(geo.roundCoord(43.5941234),43.594);
  assert.equal(geo.roundCoord(-83.8898765),-83.89);
  assert.deepEqual(geo.validCoordinates(43.5941234,-83.8898765),{
    latitude:43.594,
    longitude:-83.89
  });
});

test("invalid coordinates are rejected before reverse geocoding",()=>{
  assert.equal(geo.validCoordinates(91,-83),null);
  assert.equal(geo.validCoordinates(43,-181),null);
  assert.equal(geo.validCoordinates("nope",-83),null);
});

test("reverse-geocoded location continuity uses a place label rather than coordinates",()=>{
  const address={
    city:"Bay City",
    state:"Michigan",
    "ISO3166-2-lvl4":"US-MI",
    postcode:"48708",
    country_code:"us"
  };
  assert.equal(geo.queryLabel(address),"Bay City, MI");
  const payload=geo.locationPayload({
    display_name:"Bay City, Bay County, Michigan, United States",
    type:"city",
    address
  },geo.queryLabel(address),{latitude:43.594,longitude:-83.89},{timeZone:"America/Detroit"},"device");
  assert.equal(payload.query,"Bay City, MI");
  assert.equal(payload.latitude,43.594);
  assert.equal(payload.longitude,-83.89);
  assert.equal(payload.sourceMode,"device");
  assert.match(payload.coordinate_precision,/0\.001/);
});

test("U.S. candidate detection works for reverse-geocoder rows",()=>{
  assert.equal(geo.isUsCandidate({address:{country_code:"us"}}),true);
  assert.equal(geo.isUsCandidate({address:{"ISO3166-2-lvl4":"US-MI"}}),true);
  assert.equal(geo.isUsCandidate({address:{country_code:"ca"}}),false);
});


test("shared national place toolbar keeps shared links query-based and analytics-safe",()=>{
  const client=fs.readFileSync(require.resolve("../public/assets/national-tools.js"),"utf8");
  assert.match(client,/function renderPlaceToolbar/);
  assert.match(client,/function currentShareUrl/);
  assert.match(client,/withQuery\(path,loc\)/);
  assert.match(client,/navigator\.share/);
  assert.match(client,/clipboard\.writeText/);
  assert.match(client,/National Place Shared/);
  assert.match(client,/National Place Switched/);
  assert.doesNotMatch(client,/National Place Shared[^\n]{0,160}(?:query|latitude|longitude|place)/);
});


test("saved-place comparison stays signal-by-signal without an overall score",()=>{
  const dashboard=fs.readFileSync(require.resolve("../public/assets/national-dashboard.js"),"utf8");
  const hub=fs.readFileSync(require.resolve("../public/national-tools/index.html"),"utf8");
  assert.match(dashboard,/async function compare/);
  assert.match(dashboard,/load\(left,\{measure:false\}\)/);
  assert.match(dashboard,/load\(right,\{measure:false\}\)/);
  assert.match(dashboard,/National Places Compared",\{signals:Math\.max\(pair\[0\]\.cards\.length,pair\[1\]\.cards\.length\)\}/);
  assert.doesNotMatch(dashboard,/National Places Compared[^\n]{0,180}(?:query|latitude|longitude|place)/);
  assert.match(hub,/Compare two places across the same core signals/);
  assert.match(hub,/No overall winner or safety score/);
  assert.match(hub,/D\.compare\(left,right\)/);
  for(const label of ["Aurora","River","Coastal","Frost","Planting","Fall timing"])assert.ok(hub.includes(label),label);
  assert.match(dashboard,/if\(!d\.coastal_available\)return null/);
  const inline=hub.match(/<script>\s*(document\.addEventListener[\s\S]*?)<\/script>/);
  assert.ok(inline,"national hub inline script not found");
  assert.doesNotThrow(()=>new Function(inline[1]));
});
