const POSITION_BUCKETS = [
  { id: '1-3', min: 0, max: 3 },
  { id: '4-5', min: 3, max: 5 },
  { id: '6-10', min: 5, max: 10 },
  { id: '11-20', min: 10, max: 20 },
  { id: '21-50', min: 20, max: 50 },
  { id: '51+', min: 50, max: Infinity },
];

function clamp(n, min = 0, max = 100) { return Math.max(min, Math.min(max, n)); }
function ratio(cur, prev) { return prev > 0 ? (cur - prev) / prev : (cur > 0 ? 1 : 0); }
function pct(v) { return Number((v * 100).toFixed(1)); }

export function positionBucket(position) {
  return (POSITION_BUCKETS.find((b) => position > b.min && position <= b.max) || POSITION_BUCKETS.at(-1)).id;
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function buildCtrBenchmarks(rows) {
  const groups = new Map(POSITION_BUCKETS.map((b) => [b.id, []]));
  for (const row of rows) {
    if (row.impressions < 20 || !Number.isFinite(row.position)) continue;
    groups.get(positionBucket(row.position)).push(row.ctr || 0);
  }
  const out = {};
  for (const [bucket, values] of groups) out[bucket] = median(values);
  return out;
}

export function pageFamily(input) {
  try {
    const url = new URL(input);
    const parts = url.pathname.split('/').filter(Boolean);
    if (!parts.length) return 'home';
    if (parts[0] === 'national-tools') {
      if (!parts[1]) return 'national-tools';
      if (['coastal', 'aurora', 'bridges', 'waterfalls'].includes(parts[1]) && parts[2]) return `${parts[1]}/${parts[2]}`;
      return parts[1];
    }
    return parts[0];
  } catch {
    return 'unknown';
  }
}

function classification(cur, prev, yearAgo) {
  const g = ratio(cur.impressions, prev.impressions);
  const yoy = ratio(cur.impressions, yearAgo.impressions);
  const seasonalBase = yearAgo.impressions >= 100 && yearAgo.impressions >= cur.impressions * 0.35;
  const returning = prev.impressions < cur.impressions * 0.65;
  if (cur.impressions >= 100 && seasonalBase && returning) return 'SEASONAL';
  if (cur.impressions >= 200 && g >= 0.6 && (yearAgo.impressions < 50 || yoy >= 0.5)) return 'BREAKOUT';
  if (cur.impressions >= 75 && g >= 0.3 && cur.position <= 20) return 'EMERGING';
  if (prev.impressions >= 100 && g <= -0.3) return 'DECAYING';
  if (cur.impressions >= 100) return 'STABLE';
  return 'NEW_UNPROVEN';
}

function breakoutScore(cur, prev) {
  const growth = clamp(ratio(cur.impressions, prev.impressions), -1, 2);
  const impression = clamp(Math.log10(cur.impressions + 1) / 4 * 25, 0, 25);
  const growthPts = clamp(growth / 2 * 30, 0, 30);
  const rankPts = cur.position <= 3 ? 12 : cur.position <= 10 ? 25 : cur.position <= 20 ? 18 : cur.position <= 40 ? 8 : 2;
  const rankImprovement = prev.position > 0 ? clamp((prev.position - cur.position) / prev.position * 20, 0, 20) : 0;
  return Math.round(clamp(impression + growthPts + rankPts + rankImprovement));
}

export function compareDimension(currentRows, previousRows, yearAgoRows, keyField) {
  const prev = new Map(previousRows.map((r) => [r[keyField], r]));
  const yoy = new Map(yearAgoRows.map((r) => [r[keyField], r]));
  const ctrBenchmarks = keyField === 'page' ? buildCtrBenchmarks(currentRows) : {};
  const compared = currentRows.map((cur) => {
    const p = prev.get(cur[keyField]) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const y = yoy.get(cur[keyField]) || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
    const growth = ratio(cur.impressions, p.impressions);
    const clickGrowth = ratio(cur.clicks, p.clicks);
    const expectedCtr = keyField === 'page' ? Number(ctrBenchmarks[positionBucket(cur.position)] || 0) : 0;
    const ctrGap = Math.max(0, expectedCtr - cur.ctr);
    const potentialClicks = Math.round(cur.impressions * ctrGap);
    const edgeScore = breakoutScore(cur, p);
    return {
      [keyField]: cur[keyField],
      family: keyField === 'page' ? pageFamily(cur[keyField]) : undefined,
      classification: classification(cur, p, y),
      breakoutScore: edgeScore,
      clicks: cur.clicks,
      impressions: cur.impressions,
      ctr: pct(cur.ctr),
      position: Number(cur.position.toFixed(2)),
      impressionGrowthPct: pct(growth),
      clickGrowthPct: pct(clickGrowth),
      previous: { clicks: p.clicks, impressions: p.impressions, ctr: pct(p.ctr), position: Number((p.position || 0).toFixed(2)) },
      yearAgo: { clicks: y.clicks, impressions: y.impressions, ctr: pct(y.ctr), position: Number((y.position || 0).toFixed(2)) },
      expectedCtrPct: keyField === 'page' ? pct(expectedCtr) : undefined,
      ctrGapPct: keyField === 'page' ? pct(ctrGap) : undefined,
      potentialClicks: keyField === 'page' ? potentialClicks : undefined,
    };
  });
  return { rows: compared, ctrBenchmarks };
}

export function aggregateFamilies(pageRows) {
  const groups = new Map();
  for (const row of pageRows) {
    const key = row.family || 'unknown';
    const g = groups.get(key) || { family: key, clicks: 0, impressions: 0, weightedPosition: 0, pages: 0, breakouts: 0, emerging: 0 };
    g.clicks += row.clicks;
    g.impressions += row.impressions;
    g.weightedPosition += row.position * Math.max(row.impressions, 1);
    g.pages += 1;
    if (row.classification === 'BREAKOUT') g.breakouts += 1;
    if (row.classification === 'EMERGING') g.emerging += 1;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    ...g,
    ctr: g.impressions ? Number((g.clicks / g.impressions * 100).toFixed(2)) : 0,
    position: g.impressions ? Number((g.weightedPosition / g.impressions).toFixed(2)) : 0,
    weightedPosition: undefined,
  })).sort((a, b) => b.impressions - a.impressions);
}

export function buildReport({ generatedAt, siteUrl, windows, totals, pages, queries }) {
  const p = compareDimension(pages.current, pages.previous, pages.yearAgo, 'page');
  const q = compareDimension(queries.current, queries.previous, queries.yearAgo, 'query');
  const pageRows = p.rows;
  const queryRows = q.rows;
  const byBreakout = [...pageRows].sort((a, b) => b.breakoutScore - a.breakoutScore || b.impressions - a.impressions);
  const byCtr = [...pageRows].sort((a, b) => b.potentialClicks - a.potentialClicks || b.impressions - a.impressions);
  const byImpressions = [...pageRows].sort((a, b) => b.impressions - a.impressions);
  const queryGrowth = [...queryRows].sort((a, b) => b.impressionGrowthPct - a.impressionGrowthPct || b.impressions - a.impressions);
  return {
    version: 1,
    generatedAt,
    siteUrl,
    windows,
    totals,
    ctrBenchmarks: p.ctrBenchmarks,
    families: aggregateFamilies(pageRows).slice(0, 100),
    pages: {
      breakout: byBreakout.filter((r) => ['BREAKOUT', 'EMERGING', 'SEASONAL'].includes(r.classification)).slice(0, 100),
      ctrOpportunities: byCtr.filter((r) => r.potentialClicks > 0).slice(0, 100),
      top: byImpressions.slice(0, 250),
      decaying: byImpressions.filter((r) => r.classification === 'DECAYING').slice(0, 100),
    },
    queries: {
      growth: queryGrowth.filter((r) => r.impressions >= 20).slice(0, 200),
      top: [...queryRows].sort((a, b) => b.impressions - a.impressions).slice(0, 300),
    },
  };
}
