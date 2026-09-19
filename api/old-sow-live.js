import { fetchNoaaBundle } from '../lib/old-sow/noaa.js';
import { fetchWeather, weatherForTime } from '../lib/old-sow/weather.js';
import { buildProduct } from '../lib/old-sow/engine.js';
import { CACHE_TTL_MS, STALE_LIMIT_MS } from '../lib/old-sow/config.js';
import { classifyVisibilityWithHarness, screenUntrustedEvidence } from '../lib/old-sow/harness-client.js';

let cache = null;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, s-maxage=300, stale-while-revalidate=900',
      'x-content-type-options': 'nosniff',
      'x-robots-tag': 'noindex, nofollow'
    }
  });
}

async function freshPayload(now) {
  const [noaaResult, weatherResult] = await Promise.allSettled([fetchNoaaBundle(now), fetchWeather(now)]);
  if (noaaResult.status === 'rejected') throw noaaResult.reason;
  const noaa = noaaResult.value;
  const weather = weatherResult.status === 'fulfilled' ? weatherResult.value : null;
  if (weatherResult.status === 'rejected') noaa.failures.push({ source: 'NWS', message: String(weatherResult.reason?.message || weatherResult.reason) });
  const product = buildProduct(noaa, weather, now);

  const next = product.decision.nextWindow;
  const weatherAtNext = next ? weatherForTime(weather, next.peak) : null;
  let languageModel = { mode: 'not-run', reason: 'No weather excerpt for next window.' };
  let evidenceScreen = { available: false, safe: null, reason: 'No weather excerpt for next window.' };
  if (weatherAtNext?.excerpt) {
    [languageModel, evidenceScreen] = await Promise.all([
      classifyVisibilityWithHarness(weatherAtNext.excerpt, {
        location: weather?.sourceLocation?.label,
        validTime: weatherAtNext.startTime,
        provider: 'National Weather Service'
      }),
      screenUntrustedEvidence(weatherAtNext.excerpt, 'official-weather-forecast')
    ]);
  }

  return {
    ...product,
    operational: {
      dataState: 'fresh',
      cacheAgeMinutes: 0,
      modelClassification: languageModel,
      evidenceScreen,
      modelBoundary: 'The model interprets narrow forecast language only. It does not calculate tide timing, current speed, daylight, safety, or whirlpool probability.'
    }
  };
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const now = new Date();
  if (cache && now.getTime() - cache.savedAt < CACHE_TTL_MS) {
    return json({ ...cache.payload, operational: { ...cache.payload.operational, dataState: 'cached-fresh', cacheAgeMinutes: Math.round((now.getTime() - cache.savedAt) / 60000) } });
  }
  try {
    const payload = await freshPayload(now);
    cache = { savedAt: now.getTime(), payload };
    return json(payload);
  } catch (error) {
    if (cache && now.getTime() - cache.savedAt < STALE_LIMIT_MS) {
      return json({
        ...cache.payload,
        generatedAt: cache.payload.generatedAt,
        operational: {
          ...cache.payload.operational,
          dataState: 'stale-last-known',
          cacheAgeMinutes: Math.round((now.getTime() - cache.savedAt) / 60000),
          staleReason: String(error?.message || error)
        }
      });
    }
    return json({
      error: 'Live source bundle unavailable',
      generatedAt: now.toISOString(),
      live: false,
      detail: String(error?.message || error),
      truthBoundary: { observedOldSow: false, statement: 'No live Old Sow observation is available.' }
    }, 503);
  }
}
