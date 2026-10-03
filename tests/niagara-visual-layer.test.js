const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "public", "niagara-border-crossing", "index.html"), "utf8");
const visual = fs.readFileSync(path.join(root, "public", "assets", "niagara-visual-layer.20261003.js"), "utf8");
const css = fs.readFileSync(path.join(root, "public", "assets", "niagara-visual-layer.20261003.css"), "utf8");

test("Niagara orientation map is first-party and does not depend on Leaflet CDN", () => {
  assert.match(html, /id="niagaraBridgeMap"/);
  assert.match(visual, /niagara-static-map/);
  assert.match(visual, /LEWISTON–QUEENSTON/);
  assert.match(visual, /RAINBOW BRIDGE/);
  assert.match(visual, /PEACE BRIDGE/);
  assert.doesNotMatch(visual, /unpkg\.com|tile\.openstreetmap\.org|window\.L/);
  assert.match(css, /\.niagara-static-map/);
});

test("Niagara camera selector embeds official live still sources without iframes", () => {
  assert.match(visual, /nyssnapshot\.com\/R5_102\.png/);
  assert.match(visual, /nyssnapshot\.com\/R5_103\.png/);
  assert.match(visual, /nyssnapshot\.com\/R5_101\.png/);
  assert.match(visual, /nyssnapshot\.com\/R5_100\.png/);
  assert.match(visual, /i\.ytimg\.com\/vi\/DnUFAShZKus/);
  assert.match(visual, /i\.ytimg\.com\/vi\/9En2186vo5g/);
  assert.match(visual, /data-niagara-camera/);
  assert.match(visual, /CAMERA_REFRESH_MS = 30000/);
  assert.match(css, /\.niagara-camera-tabs/);
  assert.match(css, /\.niagara-camera-frame/);
  assert.doesNotMatch(html, /<iframe\b/i);
});
