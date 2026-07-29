const test = require("node:test");
const assert = require("node:assert/strict");

const mediaHandler = require("../api/border-media");
const { MEDIA_SOURCES, selectMediaSource } = mediaHandler;

function responseRecorder() {
  return {
    body: undefined,
    headers: {},
    statusCode: 200,
    setHeader(name, value) {
      this.headers[String(name).toLowerCase()] = value;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return body;
    },
    send(body) {
      this.body = body;
      return body;
    },
    end() {
      this.body = null;
      return null;
    },
  };
}

test("border media proxy uses a fixed six-camera allowlist", () => {
  assert.equal(Object.keys(MEDIA_SOURCES).length, 6);
  assert.equal(selectMediaSource({ camera: "gordie-ontario-approach" }).crossingId, "gordie-howe");
  assert.equal(selectMediaSource({ camera: "blue-water-queue" }).crossingId, "blue-water");
  assert.equal(selectMediaSource({ camera: "sault-ontario-approach" }).crossingId, "sault-ste-marie");
  assert.equal(selectMediaSource({ camera: "https://example.com/camera.jpg" }), null);
  assert.equal(selectMediaSource({ camera: "../secret" }), null);
});

test("border media proxy returns a validated same-origin camera image with short caching", async () => {
  const originalFetch = global.fetch;
  const image = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  global.fetch = async (url) => {
    assert.equal(String(url), "https://511on.ca/map/Cctv/1250");
    return new Response(image, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
  };

  try {
    const response = responseRecorder();
    await mediaHandler(
      { method: "GET", query: { camera: "sault-ontario-approach" } },
      response,
    );
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, image);
    assert.equal(response.headers["content-type"], "image/jpeg");
    assert.match(response.headers["cache-control"], /s-maxage=50/);
    assert.equal(response.headers["content-length"], String(image.length));
  } finally {
    global.fetch = originalFetch;
  }
});

test("border media proxy rejects unknown, unhealthy, and non-image sources safely", async () => {
  const invalid = responseRecorder();
  await mediaHandler({ method: "GET", query: { camera: "not-real" } }, invalid);
  assert.equal(invalid.statusCode, 400);

  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response("<html>blocked</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  try {
    const response = responseRecorder();
    await mediaHandler(
      { method: "GET", query: { camera: "ambassador-ontario-approach" } },
      response,
    );
    assert.equal(response.statusCode, 502);
    assert.equal(response.headers["cache-control"], "no-store");
  } finally {
    global.fetch = originalFetch;
  }
});
