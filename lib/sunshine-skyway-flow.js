const zlib = require('node:zlib');

const FL511_TRAFFIC_TILE_BASE = 'https://tiles.ibi511.com/Geoservice/GetTrafficTile';
const FL511_MAP_URL = 'https://fl511.com/map';
const USER_AGENT = 'SunshineSkywayDecision/1.0 (+https://chrisizworski.com/sunshine-skyway-bridge/)';
const ZOOM = 15;
const SAMPLE_RADIUS = 5;
const TILE_TTL_MS = 60_000;
const TILE_STALE_MS = 5 * 60_000;

// OSRM-reconciled I-275 carriageway points across the Skyway. These are static
// geometry only; all traffic state still comes from FL511's live Traffic Speeds
// raster. Keeping the geometry local avoids adding another runtime dependency.
const ROUTE_SAMPLES = {
  southbound: [
    { lat: 27.681105, lon: -82.678499 },
    { lat: 27.654600, lon: -82.676971 },
    { lat: 27.646389, lon: -82.673620 },
    { lat: 27.623265, lon: -82.657750 },
    { lat: 27.599589, lon: -82.639077 },
    { lat: 27.591232, lon: -82.628203 },
    { lat: 27.585184, lon: -82.617974 },
  ],
  northbound: [
    { lat: 27.584966, lon: -82.615035 },
    { lat: 27.594415, lon: -82.632674 },
    { lat: 27.619058, lon: -82.654542 },
    { lat: 27.649993, lon: -82.675346 },
    { lat: 27.658739, lon: -82.677024 },
    { lat: 27.681105, lon: -82.678499 },
  ],
};

// Exact FL511 Traffic Speeds raster colors observed from the public IBI tile
// service. Antialiasing is handled by a color-distance tolerance below.
const FLOW_COLORS = {
  FAST: [36, 157, 116],
  MODERATE: [244, 255, 36],
  SLOW: [77, 0, 1],
  STOPPED: [17, 17, 17],
};

const tileCache = new Map();

function mercatorTilePoint(lat, lon, zoom = ZOOM) {
  const scale = 2 ** zoom;
  const xf = ((Number(lon) + 180) / 360) * scale;
  const latitude = Math.max(-85.05112878, Math.min(85.05112878, Number(lat)));
  const yMerc = (1 - Math.asinh(Math.tan((latitude * Math.PI) / 180)) / Math.PI) / 2;
  const yf = yMerc * scale;
  const x = Math.floor(xf);
  const y = Math.floor(yf);
  return {
    x,
    y,
    px: (xf - x) * 256,
    py: (yf - y) * 256,
    zoom,
  };
}

function tileUrl(x, y, zoom = ZOOM, now = Date.now()) {
  const minuteEpochSeconds = Math.floor(now / 60_000) * 60;
  return `${FL511_TRAFFIC_TILE_BASE}?x=${x}&y=${y}&z=${zoom}&t=${minuteEpochSeconds}`;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngRgba(buffer) {
  const input = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || []);
  if (input.length < 33 || !input.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    throw new Error('INVALID_PNG');
  }

  let offset = 8;
  let width = null;
  let height = null;
  let bitDepth = null;
  let colorType = null;
  let interlace = null;
  const idat = [];

  while (offset + 12 <= input.length) {
    const length = input.readUInt32BE(offset);
    const type = input.toString('ascii', offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > input.length) throw new Error('TRUNCATED_PNG');
    const data = input.subarray(dataStart, dataEnd);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === 'IDAT') {
      idat.push(data);
    } else if (type === 'IEND') {
      break;
    }
    offset = dataEnd + 4;
  }

  if (!width || !height || bitDepth !== 8 || colorType !== 6 || interlace !== 0 || !idat.length) {
    throw new Error('UNSUPPORTED_PNG_FORMAT');
  }

  const bytesPerPixel = 4;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const expected = height * (stride + 1);
  if (inflated.length < expected) throw new Error('TRUNCATED_PNG_DATA');

  const output = Buffer.alloc(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let row = 0; row < height; row += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const rowStart = row * stride;
    const priorStart = (row - 1) * stride;
    for (let column = 0; column < stride; column += 1) {
      const raw = inflated[sourceOffset + column];
      const left = column >= bytesPerPixel ? output[rowStart + column - bytesPerPixel] : 0;
      const up = row > 0 ? output[priorStart + column] : 0;
      const upLeft = row > 0 && column >= bytesPerPixel ? output[priorStart + column - bytesPerPixel] : 0;
      let value;
      if (filter === 0) value = raw;
      else if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) value = raw + paethPredictor(left, up, upLeft);
      else throw new Error(`UNSUPPORTED_PNG_FILTER_${filter}`);
      output[rowStart + column] = value & 0xff;
    }
    sourceOffset += stride;
  }

  return { width, height, data: output };
}

function colorDistanceSquared(r, g, b, target) {
  return (r - target[0]) ** 2 + (g - target[1]) ** 2 + (b - target[2]) ** 2;
}

function classifyPixel(r, g, b, a, tolerance = 34) {
  if (a < 140) return null;
  let best = null;
  for (const [label, target] of Object.entries(FLOW_COLORS)) {
    const distance = colorDistanceSquared(r, g, b, target);
    if (distance > tolerance ** 2) continue;
    if (!best || distance < best.distance) best = { label, distance };
  }
  return best;
}

function sampleFlowClass(image, px, py, radius = SAMPLE_RADIUS) {
  if (!image?.data || !Number.isFinite(px) || !Number.isFinite(py)) return null;
  const cx = Math.round(px);
  const cy = Math.round(py);
  let best = null;
  for (let y = Math.max(0, cy - radius); y <= Math.min(image.height - 1, cy + radius); y += 1) {
    for (let x = Math.max(0, cx - radius); x <= Math.min(image.width - 1, cx + radius); x += 1) {
      const index = (y * image.width + x) * 4;
      const pixel = classifyPixel(image.data[index], image.data[index + 1], image.data[index + 2], image.data[index + 3]);
      if (!pixel) continue;
      const spatial = (x - px) ** 2 + (y - py) ** 2;
      const score = spatial + pixel.distance / 36;
      if (!best || score < best.score) best = { class: pixel.label, score, x, y };
    }
  }
  return best;
}

async function fetchTileCached({ x, y, zoom = ZOOM, fetchImpl = global.fetch, now = Date.now() }) {
  const key = `${zoom}/${x}/${y}`;
  const previous = tileCache.get(key);
  if (previous) {
    const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
    if (ageMs <= TILE_TTL_MS) return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: false };
  }

  const url = tileUrl(x, y, zoom, now);
  try {
    const response = await fetchImpl(url, {
      headers: {
        'user-agent': USER_AGENT,
        referer: 'https://fl511.com/',
        accept: 'image/png,image/*;q=0.9,*/*;q=0.2',
      },
      signal: AbortSignal.timeout(6_000),
    });
    if (!response.ok) throw new Error(`HTTP_${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());
    const image = decodePngRgba(buffer);
    const row = { image, retrievedAt: new Date(now).toISOString(), url };
    tileCache.set(key, row);
    return { ...row, ok: true, ageMs: 0, cacheHit: false, staleFallback: false };
  } catch (error) {
    if (previous) {
      const ageMs = Math.max(0, now - Date.parse(previous.retrievedAt));
      if (ageMs <= TILE_STALE_MS) {
        return { ...previous, ok: true, ageMs, cacheHit: true, staleFallback: true, error: String(error?.message || error) };
      }
    }
    return { ok: false, image: null, retrievedAt: new Date(now).toISOString(), url, ageMs: null, staleFallback: false, error: String(error?.message || error) };
  }
}

function summarizeDirection(samples) {
  const valid = samples.filter(sample => sample.flowClass);
  const counts = { FAST: 0, MODERATE: 0, SLOW: 0, STOPPED: 0 };
  for (const sample of valid) counts[sample.flowClass] += 1;
  if (valid.length < 3) {
    return { state: 'UNAVAILABLE', label: 'Live speed layer unavailable', sampleCount: valid.length, requestedSamples: samples.length, counts };
  }
  let state;
  if (counts.STOPPED >= 2) state = 'STOP_AND_GO';
  else if (counts.SLOW > 0 || counts.STOPPED > 0) state = 'HEAVY_SLOWING';
  else if (counts.MODERATE > 0) state = 'SOME_SLOWING';
  else if (counts.FAST >= Math.ceil(valid.length * 0.6)) state = 'MOVING_WELL';
  else state = 'MIXED';
  const label = {
    MOVING_WELL: 'Traffic moving well',
    SOME_SLOWING: 'Some slowing on the Skyway',
    HEAVY_SLOWING: 'Heavy slowing on the Skyway',
    STOP_AND_GO: 'Stop-and-go traffic on the Skyway',
    MIXED: 'Traffic speeds are mixed',
    UNAVAILABLE: 'Live speed layer unavailable',
  }[state];
  return { state, label, sampleCount: valid.length, requestedSamples: samples.length, counts };
}

function severityRank(state) {
  return ({ UNAVAILABLE: -1, MOVING_WELL: 0, MIXED: 1, SOME_SLOWING: 2, HEAVY_SLOWING: 3, STOP_AND_GO: 4 })[state] ?? -1;
}

async function buildTrafficFlow({ direction = 'northbound', fetchImpl = global.fetch, now = Date.now() } = {}) {
  const selectedDirection = String(direction).toLowerCase() === 'southbound' ? 'southbound' : 'northbound';
  const pointsByDirection = ROUTE_SAMPLES;
  const tileRefs = new Map();
  for (const points of Object.values(pointsByDirection)) {
    for (const point of points) {
      const ref = mercatorTilePoint(point.lat, point.lon, ZOOM);
      tileRefs.set(`${ref.x}/${ref.y}`, ref);
    }
  }

  const tileEntries = await Promise.all([...tileRefs.entries()].map(async ([key, ref]) => [key, await fetchTileCached({ ...ref, fetchImpl, now })]));
  const tiles = new Map(tileEntries);

  const directionResults = {};
  for (const [dir, points] of Object.entries(pointsByDirection)) {
    const samples = points.map(point => {
      const ref = mercatorTilePoint(point.lat, point.lon, ZOOM);
      const tile = tiles.get(`${ref.x}/${ref.y}`);
      const sampled = tile?.ok ? sampleFlowClass(tile.image, ref.px, ref.py, SAMPLE_RADIUS) : null;
      return {
        lat: point.lat,
        lon: point.lon,
        flowClass: sampled?.class || null,
        tileState: tile?.ok ? (tile.staleFallback ? 'stale' : 'live') : 'unavailable',
      };
    });
    directionResults[dir] = { ...summarizeDirection(samples), samples };
  }

  const tileResults = [...tiles.values()];
  const healthyTiles = tileResults.filter(result => result.ok).length;
  const staleTiles = tileResults.filter(result => result.ok && result.staleFallback).length;
  const usableDirections = Object.values(directionResults).filter(result => result.state !== 'UNAVAILABLE');
  const sourceState = healthyTiles === 0 ? 'unavailable' : staleTiles > 0 || healthyTiles < tileResults.length ? 'degraded' : 'ok';
  const overall = usableDirections.length
    ? usableDirections.slice().sort((a, b) => severityRank(b.state) - severityRank(a.state))[0]
    : { state: 'UNAVAILABLE', label: 'Live speed layer unavailable' };
  const selected = directionResults[selectedDirection];

  return {
    state: overall.state,
    label: overall.label,
    selectedDirection,
    selected,
    directions: directionResults,
    source: 'FL511 Traffic Speeds',
    sourceUrl: FL511_MAP_URL,
    retrievedAt: new Date(now).toISOString(),
    sourceHealth: {
      state: sourceState,
      retrievedAt: new Date(now).toISOString(),
      tilesLive: healthyTiles - staleTiles,
      tilesStale: staleTiles,
      tilesRequested: tileResults.length,
      url: FL511_MAP_URL,
    },
    note: 'Categorical flow is read from FL511’s official Traffic Speeds map layer. The tool does not infer mph or delay minutes from the raster.',
  };
}

module.exports = {
  FL511_TRAFFIC_TILE_BASE,
  FL511_MAP_URL,
  FLOW_COLORS,
  ROUTE_SAMPLES,
  mercatorTilePoint,
  tileUrl,
  decodePngRgba,
  classifyPixel,
  sampleFlowClass,
  summarizeDirection,
  buildTrafficFlow,
  _tileCache: tileCache,
};
