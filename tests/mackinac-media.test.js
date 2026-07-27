const test = require("node:test");
const assert = require("node:assert/strict");

const mediaHandler = require("../api/mackinac-media");
const { selectMediaSource } = mediaHandler;

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

test("Mackinac media source selection only allows fixed camera and radar feeds", () => {
  assert.equal(selectMediaSource({ asset: "camera", direction: "north" }).id, "camera-north");
  assert.equal(selectMediaSource({ asset: "camera", direction: "south" }).id, "camera-south");
  assert.equal(selectMediaSource({ asset: "radar" }).id, "radar-kapx");
  assert.equal(selectMediaSource({ asset: "camera", direction: "east" }), null);
  assert.equal(selectMediaSource({ asset: "https://example.com/image.jpg" }), null);
});

test("Mackinac media proxy returns an image with CDN caching", async () => {
  const originalFetch = global.fetch;
  const image = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  global.fetch = async (url) => {
    assert.match(String(url), /MacBridge_image4_medium\.jpg$/);
    return new Response(image, {
      status: 200,
      headers: { "content-type": "image/jpeg" },
    });
  };

  try {
    const response = responseRecorder();
    await mediaHandler(
      { method: "GET", query: { asset: "camera", direction: "north" } },
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

test("Mackinac media proxy fails safely on an invalid or unhealthy source", async () => {
  const invalidResponse = responseRecorder();
  await mediaHandler(
    { method: "GET", query: { asset: "camera", direction: "east" } },
    invalidResponse,
  );
  assert.equal(invalidResponse.statusCode, 400);

  const originalFetch = global.fetch;
  global.fetch = async () =>
    new Response("Unavailable", {
      status: 503,
      headers: { "content-type": "text/plain" },
    });

  try {
    const upstreamResponse = responseRecorder();
    await mediaHandler(
      { method: "GET", query: { asset: "radar" } },
      upstreamResponse,
    );
    assert.equal(upstreamResponse.statusCode, 502);
    assert.equal(upstreamResponse.headers["cache-control"], "no-store");
  } finally {
    global.fetch = originalFetch;
  }
});
