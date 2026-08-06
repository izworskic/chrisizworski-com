const test = require("node:test");
const assert = require("node:assert");
const { CAMERAS, resolveCamera, isUsable } = require("../lib/field-cameras.js");

test("every registered camera has a label, credit and a real upstream", () => {
  for (const [id, cam] of Object.entries(CAMERAS)) {
    assert.ok(cam.label, `${id} needs a label`);
    assert.ok(cam.credit && cam.creditUrl, `${id} needs attribution`);
    assert.ok(["usgs", "mdot"].includes(cam.source), `${id} has an unknown source`);
    if (cam.source === "mdot") assert.match(cam.file, /^\d+\.jpg$/);
    if (cam.source === "usgs") assert.match(cam.camId, /^MI_/);
  }
});

test("the registry is an allowlist, so an arbitrary id cannot become a proxy target", async () => {
  for (const bad of ["", "../secret", "https://example.com/x.jpg", "unknown-camera"]) {
    assert.equal(await resolveCamera(bad), null, `${bad} must not resolve`);
  }
});

test("MDOT cameras resolve to the MDOT host and nothing else", async () => {
  const c = await resolveCamera("m22-leelanau");
  assert.ok(c.url.startsWith("https://mdotjboss.state.mi.us/docs/drive/camfiles/rwis/"));
  assert.equal(c.contentType, "image/jpeg");
});

test("age, not the hidden flag, decides whether an image is usable", () => {
  const now = Date.now();
  assert.equal(isUsable(new Date(now - 30 * 60000).toISOString(), 26), true, "30 minutes old is fine");
  assert.equal(isUsable(new Date(now - 25 * 3600000).toISOString(), 26), true, "25 hours is inside the window");
  assert.equal(isUsable(new Date(now - 72 * 3600000).toISOString(), 26), false, "three days is not");
  assert.equal(isUsable(new Date(now - 3 * 365 * 24 * 3600000).toISOString(), 26), false, "years-dead cameras must fail");
  assert.equal(isUsable(null, 26), false);
});

test("every fall colour camera names the region page it belongs to", () => {
  const regions = Object.values(CAMERAS).filter((c) => c.region).map((c) => c.region);
  assert.ok(regions.length >= 5, "the colour season needs cameras across the state");
  for (const r of regions) assert.match(r, /^(wup|eup|tip|nwl|nel|cen|swl|sel)$/);
});
