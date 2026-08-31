const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const USER_AGENT = 'ChrisIzworskiIsleRoyaleWaterIntelligence/2.0 (https://chrisizworski.com/isle-royale-map/)';
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

function simplifyLine(points, tolerance = 0.0002) {
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

function geometryPoints(geometry) {
  return (geometry || [])
    .map(p => [number(p.lon), number(p.lat)])
    .filter(p => p[0] !== null && p[1] !== null);
}

function closeEnough(a,b,tolerance=0.00003) {
  return Boolean(a&&b&&Math.abs(a[0]-b[0])<=tolerance&&Math.abs(a[1]-b[1])<=tolerance);
}

function closedRing(points) {
  if (!Array.isArray(points) || points.length < 4) return null;
  const ring = [...points];
  if (!closeEnough(ring[0], ring[ring.length - 1])) return null;
  ring[ring.length - 1] = [...ring[0]];
  return ring;
}

function stitchRings(lines) {
  const pending = (lines || []).filter(line => Array.isArray(line) && line.length >= 2).map(line => [...line]);
  const rings = [];
  while (pending.length) {
    let ring = pending.shift();
    let changed = true;
    while (changed && !closeEnough(ring[0], ring[ring.length - 1])) {
      changed = false;
      for (let i = 0; i < pending.length; i++) {
        const line = pending[i];
        if (closeEnough(ring[ring.length - 1], line[0])) {
          ring = ring.concat(line.slice(1)); pending.splice(i,1); changed = true; break;
        }
        if (closeEnough(ring[ring.length - 1], line[line.length - 1])) {
          ring = ring.concat([...line].reverse().slice(1)); pending.splice(i,1); changed = true; break;
        }
        if (closeEnough(ring[0], line[line.length - 1])) {
          ring = line.slice(0,-1).concat(ring); pending.splice(i,1); changed = true; break;
        }
        if (closeEnough(ring[0], line[0])) {
          ring = [...line].reverse().slice(0,-1).concat(ring); pending.splice(i,1); changed = true; break;
        }
      }
    }
    const closed = closedRing(ring);
    if (closed) rings.push(closed);
  }
  return rings;
}

function normalizeWaterData(data) {
  const coastlines = [];
  const waterPolygons = [];
  const waterBoundaries = [];
  const waterCenterlines = [];
  for (const element of data?.elements || []) {
    const tags = element?.tags || {};
    if (element?.type === 'way' && Array.isArray(element.geometry)) {
      const points = geometryPoints(element.geometry);
      if (points.length < 2) continue;
      if (tags.natural === 'coastline') {
        const simplified = simplifyLine(points, 0.0002);
        if (simplified.length >= 2) coastlines.push(simplified);
        continue;
      }
      if (tags.natural === 'water' || ['riverbank','canal'].includes(tags.waterway)) {
        const ring = closedRing(points);
        if (ring) {
          const simplifiedRing=simplifyLine(ring, 0.00012);
          waterPolygons.push(simplifiedRing);
          waterBoundaries.push(simplifiedRing);
        }
      }
      if (['river','stream','canal'].includes(tags.waterway)) {
        const simplified = simplifyLine(points, 0.00008);
        if (simplified.length >= 2) waterCenterlines.push(simplified);
      }
      continue;
    }
    if (element?.type === 'relation' && (tags.natural === 'water' || tags.waterway === 'riverbank')) {
      const outerLines = [];
      for (const member of element.members || []) {
        if (member?.type !== 'way' || !Array.isArray(member.geometry)) continue;
        const points = geometryPoints(member.geometry);
        if (points.length < 2) continue;
        waterBoundaries.push(simplifyLine(points,0.00008));
        if (member.role !== 'inner') outerLines.push(points);
      }
      for (const ring of stitchRings(outerLines)) waterPolygons.push(simplifyLine(ring, 0.00012));
    }
  }
  return {coastlines, waterPolygons, waterBoundaries, waterCenterlines};
}

async function fetchOverpass(endpoint) {
  const query = `[out:json][timeout:40];
(
  way["natural"="coastline"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["natural"="water"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["natural"="water"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  way["waterway"~"river|stream|canal|riverbank"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
  relation["waterway"="riverbank"](${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east});
);
out geom;`;
  const url = endpoint + '?data=' + encodeURIComponent(query);
  const response = await fetch(url, {
    headers: {accept:'application/json', 'user-agent':USER_AGENT},
    signal: AbortSignal.timeout(47000)
  });
  if (!response.ok) throw new Error(`Overpass returned ${response.status}`);
  const data = await response.json();
  const normalized = normalizeWaterData(data);
  if (!normalized.coastlines.length) throw new Error('Overpass returned no coastline geometry');
  return {...normalized, endpoint};
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
      const coastlinePointCount = result.coastlines.reduce((sum, line) => sum + line.length, 0);
      const inlandPointCount = result.waterPolygons.reduce((sum, ring) => sum + ring.length, 0);
      const centerlinePointCount = result.waterCenterlines.reduce((sum, line) => sum + line.length, 0);
      res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
      return res.status(200).json({
        source:'OpenStreetMap coastline + inland water geometry via Overpass',
        source_url:'https://www.openstreetmap.org/copyright',
        fetched_at:new Date().toISOString(),
        bbox:BBOX,
        line_count:result.coastlines.length,
        point_count:coastlinePointCount,
        inland_water_count:result.waterPolygons.length,
        inland_water_point_count:inlandPointCount,
        water_centerline_count:result.waterCenterlines.length,
        water_centerline_point_count:centerlinePointCount,
        lines:result.coastlines,
        water_polygons:result.waterPolygons,
        water_boundaries:result.waterBoundaries,
        water_centerlines:result.waterCenterlines,
        caveat:'Planning water geometry only. This is not a navigation chart and does not establish water depth, hazards, access rights, or a safe route.'
      });
    } catch (error) {
      errors.push(`${endpoint}: ${String(error?.message || error)}`);
    }
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(502).json({
    error:'Isle Royale water geometry unavailable',
    detail:errors.join(' | ')
  });
};

module.exports._test = {number, sqSegDistance, simplifyLine, geometryPoints, closeEnough, closedRing, stitchRings, normalizeWaterData, BBOX};
