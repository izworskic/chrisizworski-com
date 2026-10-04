const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "niagara-border-crossing", "index.html"), "utf8");
const legacy = fs.readFileSync(path.join(root, "public", "assets", "niagara-visual-layer.20261003.js"), "utf8");
const map = fs.readFileSync(path.join(root, "public", "assets", "niagara-camera-map-leaflet.20261004.js"), "utf8");
const owner = fs.readFileSync(path.join(root, "public", "assets", "niagara-bridge-camera-map.20261004c.js"), "utf8");

test("Niagara orientation layer uses Leaflet and OpenStreetMap as the sole executable map", () => {
  assert.match(html, /id="niagaraBridgeMap"/);
  assert.match(map, /L\.map\(container/);
  assert.match(map, /tile\.openstreetmap\.org/);
  assert.match(map, /OpenStreetMap/);
  assert.match(owner, /dataset\.niagaraMapOwner = "leaflet-osm-v3"/);
  assert.match(legacy, /__NIAGARA_LEGACY_VISUAL_LAYER_DISABLED__/);
  assert.doesNotMatch(legacy, /basemaps\.cartocdn\.com|CARTO_BASEMAP_KEY|mercatorProject|function\s+initMap/);
  assert.doesNotMatch(owner, /suppressLegacyMap|restoreFinalMapId|niagaraBridgeMapLegacySuppressed/);
});

test("Niagara maps four crossings and all nine current international-bridge cameras", () => {
  assert.equal((map.match(/key: "(?:peace|rainbow|whirlpool|lewiston-queenston)"/g) || []).length, 4);
  assert.equal((map.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length, 9);
  assert.match(map, /videoId: "SETJ79HmwI0"/);
  assert.match(map, /videoId: "WPMgP2C3_co"/);
  assert.match(map, /videoId: "DnUFAShZKus"/);
  assert.match(map, /videoId: "9En2186vo5g"/);
  assert.match(map, /videoId: "yygTuX5JaKg"/);
  assert.match(map, /nyssnapshot\.com\/R5_102\.png/);
  assert.match(map, /nyssnapshot\.com\/R5_103\.png/);
  assert.match(map, /nyssnapshot\.com\/R5_101\.png/);
  assert.match(map, /nyssnapshot\.com\/R5_100\.png/);
  assert.match(map, /key: "whirlpool"[\s\S]*cameraCount: 0/);
  assert.doesNotMatch(map, /id: ["']whirlpool["']/);
});

test("Niagara camera pins open an in-context dialog with media fallback", () => {
  assert.match(map, /marker\.on\("click", \(\) => openCameraModal\(camera\)\)/);
  assert.match(map, /niagaraMapCameraDialog/);
  assert.match(map, /showModal/);
  assert.match(map, /renderMediaFallback/);
  assert.match(map, /Official camera source/);
  assert.doesNotMatch(map, /scrollIntoView/);
});

test("original authority/source cards remain in the HTML as non-map supporting content", () => {
  assert.equal((html.match(/camera-source-card/g) || []).length, 4);
  assert.doesNotMatch(html, /<iframe\b/i);
});
