const AIS_STREAM_URL = "wss://stream.aisstream.io/v0/stream";
const SOO_LOCKS_BOUNDS = [[[46.36, -84.58], [46.66, -84.14]]];
const POSITION_MESSAGE_TYPES = [
  "PositionReport",
  "StandardClassBPositionReport",
  "ExtendedClassBPositionReport",
];

function finiteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanText(value, fallback = "Unknown vessel") {
  const text = String(value || "")
    .replace(/@+$/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text || fallback;
}

function parseAisMessage(payload) {
  if (!payload || !POSITION_MESSAGE_TYPES.includes(payload.MessageType)) return null;

  const message = payload.Message?.[payload.MessageType] || {};
  const metadata = payload.MetaData || payload.Metadata || {};
  const latitude = finiteNumber(message.Latitude ?? metadata.latitude ?? metadata.Latitude);
  const longitude = finiteNumber(message.Longitude ?? metadata.longitude ?? metadata.Longitude);
  const mmsi = String(metadata.MMSI ?? message.UserID ?? "").replace(/\D/g, "");

  if (
    latitude === null ||
    longitude === null ||
    latitude < 46.36 ||
    latitude > 46.66 ||
    longitude < -84.58 ||
    longitude > -84.14 ||
    !/^\d{7,9}$/.test(mmsi)
  ) {
    return null;
  }

  const course = finiteNumber(message.Cog);
  const heading = finiteNumber(message.TrueHeading);
  const speed = finiteNumber(message.Sog);

  return {
    mmsi,
    name: cleanText(metadata.ShipName ?? message.Name),
    latitude,
    longitude,
    course: course !== null && course >= 0 && course < 360 ? course : null,
    heading: heading !== null && heading >= 0 && heading < 360 ? heading : null,
    speed: speed !== null && speed >= 0 && speed < 100 ? speed : null,
    received_at: cleanText(metadata.time_utc, new Date().toISOString()),
  };
}

function websocketMessageText(data) {
  if (typeof data === "string") return data;
  if (Buffer.isBuffer(data)) return data.toString("utf8");
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString("utf8");
  if (ArrayBuffer.isView(data)) return Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8");
  return String(data || "");
}

function collectVesselSnapshot(apiKey, options = {}) {
  const WebSocketImpl = options.WebSocketImpl || globalThis.WebSocket;
  const captureMs = options.captureMs ?? 4_000;
  const connectTimeoutMs = options.connectTimeoutMs ?? 2_500;

  if (!WebSocketImpl) return Promise.reject(new Error("WebSocket runtime unavailable"));

  return new Promise((resolve, reject) => {
    const vessels = new Map();
    let socket;
    let opened = false;
    let settled = false;
    let captureTimer;

    const connectTimer = setTimeout(() => {
      finish(new Error("AIS connection timed out"));
    }, connectTimeoutMs);

    function finish(error) {
      if (settled) return;
      settled = true;
      clearTimeout(connectTimer);
      clearTimeout(captureTimer);

      try {
        if (socket && socket.readyState < 2) socket.close(1000, "snapshot complete");
      } catch {
        // The response can still complete if the upstream socket is already gone.
      }

      if (error) {
        reject(error);
        return;
      }

      resolve(
        [...vessels.values()]
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 100),
      );
    }

    try {
      socket = new WebSocketImpl(AIS_STREAM_URL);
    } catch (error) {
      finish(error);
      return;
    }

    socket.onopen = () => {
      opened = true;
      clearTimeout(connectTimer);
      socket.send(
        JSON.stringify({
          APIKey: apiKey,
          BoundingBoxes: SOO_LOCKS_BOUNDS,
          FilterMessageTypes: POSITION_MESSAGE_TYPES,
        }),
      );
      captureTimer = setTimeout(() => finish(), captureMs);
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(websocketMessageText(event.data));
        if (payload?.error) {
          finish(new Error("AIS provider rejected the subscription"));
          return;
        }
        const vessel = parseAisMessage(payload);
        if (vessel) vessels.set(vessel.mmsi, vessel);
      } catch {
        // Ignore malformed upstream frames while the short snapshot continues.
      }
    };

    socket.onerror = () => {
      finish(new Error("AIS connection failed"));
    };

    socket.onclose = () => {
      if (settled) return;
      if (opened) finish();
      else finish(new Error("AIS connection closed before opening"));
    };
  });
}

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=45, stale-while-revalidate=120");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = String(process.env.AISSTREAM_API_KEY || "").trim();
  if (!apiKey) {
    res.setHeader("X-Data-Fallback", "map-only");
    return res.status(200).json({
      status: "unavailable",
      reason: "missing_configuration",
      source: "AISStream.io",
      fetched_at: new Date().toISOString(),
      count: 0,
      vessels: [],
    });
  }

  try {
    const vessels = await collectVesselSnapshot(apiKey);
    return res.status(200).json({
      status: "live",
      source: "AISStream.io",
      fetched_at: new Date().toISOString(),
      count: vessels.length,
      vessels,
    });
  } catch {
    res.setHeader("X-Data-Fallback", "map-only");
    return res.status(200).json({
      status: "unavailable",
      reason: "feed_temporarily_unavailable",
      source: "AISStream.io",
      fetched_at: new Date().toISOString(),
      count: 0,
      vessels: [],
    });
  }
}

module.exports = handler;
module.exports.collectVesselSnapshot = collectVesselSnapshot;
module.exports.parseAisMessage = parseAisMessage;
