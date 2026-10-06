'use strict';

const { NYCDOT_LINKS } = require('./traffic');

const SOCRATA_SOURCE = 'https://data.cityofnewyork.us/resource/i4gi-tjb9.json';
const BASELINE_KIND = 'NYCDOT_8_WEEK_HOURLY_AVG';
const WINDOW_DAYS = 56;
const MIN_SAMPLES = 24;
const CACHE_TTL_SECONDS = 6 * 24 * 60 * 60;
const MEMORY_TTL_MS = 30 * 60 * 1000;
const memoryCache = new Map();

function number(value) {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function etParts(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);
  const year = get('year');
  const month = get('month');
  const day = get('day');
  return {
    year,
    month,
    day,
    hour: get('hour'),
    dow: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
  };
}

function etDateString(date) {
  const p = etParts(date);
  return [p.year, String(p.month).padStart(2, '0'), String(p.day).padStart(2, '0')].join('-');
}

function baselineCacheKey(now) {
  const p = etParts(now);
  return `nyc:crossing:baseline:v1:${p.dow}:${p.hour}`;
}

function buildBaselineUrl(now = new Date()) {
  const p = etParts(now);
  const start = etDateString(new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000));
  const end = etDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const linkIds = Object.keys(NYCDOT_LINKS).map(id => `'${id}'`).join(',');
  const select = 'link_id,avg(to_number(travel_time)) as avg_travel_time,count(travel_time) as samples';
  const where = [
    "status='0'",
    `link_id in(${linkIds})`,
    `data_as_of between '${start}T00:00:00.000' and '${end}T23:59:59.999'`,
    `date_extract_dow(data_as_of)=${p.dow}`,
    `date_extract_hh(data_as_of)=${p.hour}`,
    'to_number(travel_time)>0',
  ].join(' and ');
  const url = new URL(SOCRATA_SOURCE);
  url.searchParams.set('$select', select);
  url.searchParams.set('$where', where);
  url.searchParams.set('$group', 'link_id');
  url.searchParams.set('$limit', '100');
  return url.toString();
}

function normalizeBaselineRows(rows, now = new Date()) {
  const result = {
    generatedAt: now.toISOString(),
    kind: BASELINE_KIND,
    windowDays: WINDOW_DAYS,
    source: SOCRATA_SOURCE,
    byLinkId: {},
  };
  if (!Array.isArray(rows)) return result;

  for (const row of rows) {
    const linkId = String(row && row.link_id || '');
    if (!NYCDOT_LINKS[linkId]) continue;
    const avgSeconds = number(row.avg_travel_time);
    const samples = number(row.samples);
    if (avgSeconds == null || avgSeconds <= 0 || avgSeconds > 3600 || samples == null || samples < MIN_SAMPLES) continue;
    result.byLinkId[linkId] = {
      baselineMinutes: Math.round((avgSeconds / 60) * 10) / 10,
      samples: Math.round(samples),
    };
  }
  return result;
}

async function redisCommand(command, { env = process.env, fetchImpl = fetch } = {}) {
  const url = env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '';
  const token = env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(3000) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || json.error) throw new Error('NYC baseline cache unavailable');
  return json.result;
}

async function getBaselineDocument({
  now = new Date(),
  fetchImpl = fetch,
  env = process.env,
  redisCommandImpl = redisCommand,
} = {}) {
  const key = baselineCacheKey(now);
  const local = memoryCache.get(key);
  if (local && local.expiresAt > Date.now()) return local.value;

  try {
    const cached = await redisCommandImpl(['GET', key], { env, fetchImpl });
    if (cached) {
      const value = typeof cached === 'string' ? JSON.parse(cached) : cached;
      memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_TTL_MS });
      return value;
    }
  } catch (_) {
    // Historical comparison is additive. A cache problem must never remove live traffic.
  }

  const response = await fetchImpl(buildBaselineUrl(now), {
    headers: { Accept: 'application/json' },
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined,
  });
  if (!response.ok) throw new Error('NYC Open Data baseline HTTP ' + response.status);
  const value = normalizeBaselineRows(await response.json(), now);
  memoryCache.set(key, { value, expiresAt: Date.now() + MEMORY_TTL_MS });

  try {
    await redisCommandImpl(['SET', key, JSON.stringify(value), 'EX', CACHE_TTL_SECONDS], { env, fetchImpl });
  } catch (_) {
    // Keep the fresh in-memory value; do not fail the request because persistence failed.
  }
  return value;
}

async function enrichNycdotBaselines(traffic, options = {}) {
  if (!traffic || !Array.isArray(traffic.routes)) return traffic;
  const liveDotRoutes = traffic.routes.filter(route =>
    route &&
    route.sourceName === 'NYC DOT Traffic Management Center' &&
    route.linkId &&
    number(route.etaMinutes) != null
  );
  if (!liveDotRoutes.length) return traffic;

  try {
    const baseline = await getBaselineDocument(options);
    if (!baseline || !baseline.byLinkId) return traffic;
    for (const route of liveDotRoutes) {
      const historical = baseline.byLinkId[String(route.linkId)];
      if (!historical) continue;
      const baselineMinutes = number(historical.baselineMinutes);
      if (baselineMinutes == null || baselineMinutes <= 0) continue;
      route.baselineMinutes = baselineMinutes;
      route.delayMinutes = Math.round((number(route.etaMinutes) - baselineMinutes) * 10) / 10;
      route.baselineKind = BASELINE_KIND;
      route.baselineSamples = number(historical.samples);
      route.baselineSource = SOCRATA_SOURCE;
    }
  } catch (_) {
    // Baseline failure is explicitly non-fatal; live authority measurements remain useful on their own.
  }
  return traffic;
}

module.exports = {
  SOCRATA_SOURCE,
  BASELINE_KIND,
  WINDOW_DAYS,
  MIN_SAMPLES,
  etParts,
  baselineCacheKey,
  buildBaselineUrl,
  normalizeBaselineRows,
  getBaselineDocument,
  enrichNycdotBaselines,
  _internal: {
    redisCommand,
    memoryCache,
    clearMemoryCache() { memoryCache.clear(); },
  },
};
