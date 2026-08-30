const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const USER_AGENT = 'ChrisIzworskiIsleRoyaleWaterIntelligence/1.0 (https://chrisizworski.com/isle-royale-map/)';
const BBOX = Object.freeze({south:47.74, west:-89.46, north:48.38, east:-88.08});

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sqSegDistance(point, a, b) {
  let x = a[0], y = a[1];
  let dx = b[0] - x, dy = b[1] - y;
  if (dx || dy) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) { x = b[0]; y = b[1]; }
    else if (t > 0) { x += dx * t; y += dy * t; }
  }
  dx = point[0] - x; dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyLine(points, tolerance = 0.00035) {
  if (!Array.isArray(points) || points.length <= 2) return points || [];
  const sqTolerance = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1; keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxSq = sqTolerance, index = -1;
    for (let i = first + 1; i < last; i++) {
      const sq = sqSegDistance(points[i], points[first], points[last]);
      if (sq > maxSq) { index = i; maxSq = sq; }
    }
    if (index > 0) {
      keep[index] = 1;
      if (index - first > 1) stack.push([first, index]);
      if (last - index > 1) stack.push([index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function normalizeWays(data) {
  const lines = [];
  for (const element of data?.elements || []) {
    if (element?.type !== 'way' || !Array.isArray(element.geometry)) continue;
    const points = element.geometry
      .map(p => [number(p.lon), number(p.lat)])
      .filter(p => p[0] !== null && p[1] !== null);
    if (points.length < 2) continue;
    const simplified = simplifyLine(points);
    if (simplified.length >= 2) lines.push(simplified);
  }
  return lines;
}

async function fetchOverpass(endpoint) {
  const query = `[out:json][timeout:35];way["natural"="coastline"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});out geom;`;
  const url = endpoint + '?data=' + encodeURIComponent(query);
  const response = await fetch(url, {
    headers: {accept:'application/json', 'user-agent':USER_AGENT},
    signal: AbortSignal.timeout(42000)
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
  const data = await response.json();
  const lines = normalizeWays(data);
  if (!lines.length) throw new Error('Overpass returned no coastline geometry');
  return {lines, endpoint};
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET, OPTIONS');
    return res.status(405).json({error:'Method not allowed'});
  }

  const errors = [];
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const result = await fetchOverpass(endpoint);
      const pointCount = result.lines.reduce((sum, line) => sum + line.length, 0);
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({
        source:'OpenStreetMap coastline geometry via Overpass',
        source_url:'https://www.openstreetmap.org/copyright',
        fetched_at:new Date().toISOString(),
        bbox:BBOX,
        line_count:result.lines.length,
        point_count:pointCount,
        lines:result.lines,
        caveat:'Planning shoreline geometry only. This is not a navigation chart and does not establish water depth, hazards, access rights, or a safe route.'
      });
    } catch (error) {
      errors.push(`${endpoint}: ${String(error?.message || error)}`);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({
    error:'Isle Royale shoreline geometry unavailable',
    detail:errors.join(' | ')
  });
};

module.exports._test = {number, sqSegDistance, simplifyLine, normalizeWays, BBOX};
