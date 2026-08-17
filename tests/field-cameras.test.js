const test = require("node:test");
const assert = require("node:assert");
const { CAMERAS, resolveCamera, isUsable, safeWindyUrl } = require("../lib/field-cameras.js");

test("every registered camera has a label, credit and a real upstream", () => {
  for (const [id, cam] of Object.entries(CAMERAS)) {
    assert.ok(cam.label, `${id} needs a label`);
    assert.ok(cam.credit && cam.creditUrl, `${id} needs attribution`);
    assert.ok(["usgs", "mdot", "phenocam", "windy"].includes(cam.source), `${id} has an unknown source`);
    if (cam.source === "mdot") assert.match(cam.file, /^\d+\.jpg$/);
    if (cam.source === "usgs") assert.match(cam.camId, /^MI_/);
    if (cam.source === "phenocam") assert.match(cam.site, /^[a-z0-9]+$/);
    if (cam.source === "windy") {
      assert.ok(Number.isInteger(cam.webcamId), `${id} needs a numeric Windy webcam id`);
      assert.equal(cam.credit, "Webcams provided by Windy.com");
    }
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

test("canopy cameras resolve to PhenoCam and nothing else", async () => {
  const c = await resolveCamera("sylvania-canopy");
  assert.ok(c.url.startsWith("https://phenocam.nau.edu/data/latest/"));
  assert.equal(c.contentType, "image/jpeg");
});

test("Windy cameras keep the key server-side and return only approved Windy URLs", async () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.WINDY_WEBCAMS_API_KEY;
  process.env.WINDY_WEBCAMS_API_KEY = "test-key";
  global.fetch = async (url, options) => {
    assert.match(String(url), /webcams\/api\/v3\/webcams\/1750506347/);
    assert.equal(options.headers["x-windy-api-key"], "test-key");
    return new Response(JSON.stringify({
      webcamId: 1750506347,
      status: "active",
      lastUpdatedOn: new Date().toISOString(),
      images: {
        current: { preview: "https://imgproxy.windy.com/_/preview/plain/current/1750506347/original.jpg" },
        sizes: { preview: { width: 400, height: 224 } },
      },
      location: { latitude: 43.64308, longitude: -83.85113 },
      urls: { detail: "https://windy.com/webcams/1750506347" },
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  try {
    const camera = await resolveCamera("windy-bay-city-yacht-club");
    assert.equal(camera.directImage, true);
    assert.equal(camera.imageWidth, 400);
    assert.equal(camera.imageHeight, 224);
    assert.match(camera.url, /^https:\/\/imgproxy\.windy\.com\//);
    assert.equal(camera.clickUrl, "https://windy.com/webcams/1750506347");
    assert.equal(camera.stale, false);
  } finally {
    global.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.WINDY_WEBCAMS_API_KEY;
    else process.env.WINDY_WEBCAMS_API_KEY = originalKey;
  }
});

test("Windy URL validation rejects lookalike and non-HTTPS hosts", () => {
  const hosts = new Set(["imgproxy.windy.com"]);
  assert.equal(safeWindyUrl("https://imgproxy.windy.com/example.jpg", hosts), "https://imgproxy.windy.com/example.jpg");
  assert.equal(safeWindyUrl("https://imgproxy.windy.com.evil.test/example.jpg", hosts), null);
  assert.equal(safeWindyUrl("http://imgproxy.windy.com/example.jpg", hosts), null);
});

test("every fall colour camera names the region page it belongs to", () => {
  const regions = Object.values(CAMERAS).filter((c) => c.region).map((c) => c.region);
  assert.ok(regions.length >= 5, "the colour season needs cameras across the state");
  for (const r of regions) assert.match(r, /^(wup|eup|tip|nwl|nel|cen|swl|sel)$/);
});
