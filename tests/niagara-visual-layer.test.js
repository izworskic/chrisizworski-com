const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "niagara-border-crossing", "index.html"), "utf8");
const visual = fs.readFileSync(path.join(root, "public", "assets", "niagara-visual-layer.20261003.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "assets", "niagara-visual-layer.20261003.css"), "utf8");

test("Niagara orientation layer uses a real CARTO Voyager basemap with interactive bridge markers", () => {
  assert.match(html, /id="niagaraBridgeMap"/);
  assert.match(visual, /basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.match(visual, /CARTO_BASEMAP_KEY/);
  assert.match(visual, /mercatorProject/);
  assert.match(visual, /data\.mapCrossing|dataset\.mapCrossing/);
  assert.match(visual, /OpenStreetMap contributors/);
  assert.match(visual, /© CARTO/);
  assert.match(css, /\.niagara-carto-map/);
  assert.match(css, /\.niagara-carto-marker/);
  assert.doesNotMatch(visual, /niagara-static-map/);
  assert.doesNotMatch(visual, /unpkg\.com|tile\.openstreetmap\.org|window\.L/);
});

test("Niagara embeds all current international-bridge camera stills without removing source cards", () => {
  assert.match(visual, /nyssnapshot\.com\/R5_102\.png/);
  assert.match(visual, /nyssnapshot\.com\/R5_103\.png/);
  assert.match(visual, /nyssnapshot\.com\/R5_101\.png/);
  assert.match(visual, /nyssnapshot\.com\/R5_100\.png/);
  assert.match(visual, /i\.ytimg\.com\/vi\/SETJ79HmwI0/);
  assert.match(visual, /i\.ytimg\.com\/vi\/WPMgP2C3_co/);
  assert.match(visual, /i\.ytimg\.com\/vi\/DnUFAShZKus/);
  assert.match(visual, /i\.ytimg\.com\/vi\/9En2186vo5g/);
  assert.match(visual, /i\.ytimg\.com\/vi\/yygTuX5JaKg/);
  assert.match(visual, /data-niagara-camera/);
  assert.match(visual, /CAMERA_REFRESH_MS = 30000/);
  assert.match(visual, /loading="lazy"/);
  assert.match(visual, /IntersectionObserver/);
  assert.match(visual, /sourceGrid\.before\(host\)/);
  assert.doesNotMatch(visual, /sourceGrid\.innerHTML/);
  assert.doesNotMatch(visual, /role="tab"/);
  assert.match(visual, /refresh\.hidden = true/);
  assert.match(visual, /badge\.hidden = true/);
  assert.match(css, /\.niagara-camera-tabs/);
  assert.match(css, /\.niagara-camera-frame/);
  assert.equal((html.match(/camera-source-card/g) || []).length, 4);
  assert.doesNotMatch(html, /<iframe\b/i);
});
