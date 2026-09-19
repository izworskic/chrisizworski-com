let cache = null;

function sendJson(res, data, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=900");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.json(data);
}

module.exports = async function oldSowRoute(req, res) {
  if (req.method !== "GET") return sendJson(res, { error: "Method not allowed" }, 405);

  const [
    { fetchNoaaBundle },
    { fetchWeather, weatherForTime },
    { buildProduct },
    { CACHE_TTL_MS, STALE_LIMIT_MS },
    { classifyVisibilityWithHarness, screenUntrustedEvidence, recommendViewingWindowWithHarness }
  ] = await Promise.all([
    import("./noaa.mjs"),
    import("./weather.mjs"),
    import("./engine.mjs"),
    import("./config.mjs"),
    import("./harness-client.mjs")
  ]);

  const now = new Date();
  if (cache && now.getTime() - cache.savedAt < CACHE_TTL_MS) {
    return sendJson(res, {
      ...cache.payload,
      operational: {
        ...cache.payload.operational,
        dataState: "cached-fresh",
        cacheAgeMinutes: Math.round((now.getTime() - cache.savedAt) / 60000)
      }
    });
  }

  try {
    const [noaaResult, weatherResult] = await Promise.allSettled([
      fetchNoaaBundle(now),
      fetchWeather(now)
    ]);

    if (noaaResult.status === "rejected") throw noaaResult.reason;
    const noaa = noaaResult.value;
    const weather = weatherResult.status === "fulfilled" ? weatherResult.value : null;
    if (weatherResult.status === "rejected") {
      noaa.failures.push({
        source: "NWS",
        message: String(weatherResult.reason?.message || weatherResult.reason)
      });
    }

    let product = buildProduct(noaa, weather, now);

    const baselineNext = product.decision.nextWindow;
    const candidateWindows = (product.windows || [])
      .filter(w => new Date(w.end).getTime() >= now.getTime())
      .slice(0, 8);

    const rawOidc = req?.headers?.["x-vercel-oidc-token"];
    const requestOidc = Array.isArray(rawOidc) ? rawOidc[0] : (rawOidc ? String(rawOidc) : "");

    const windowRecommendation = await recommendViewingWindowWithHarness(candidateWindows, {
      generatedAt: product.generatedAt,
      sourceCoverage: product.decision?.coverage?.label || "unknown",
      representativeCurrentStation: product.representativeCurrentStation?.id || null
    }, requestOidc);

    const jevWindow = windowRecommendation.choiceId
      ? candidateWindows.find(w => w.id === windowRecommendation.choiceId)
      : null;
    const next = jevWindow || baselineNext;

    product = {
      ...product,
      decision: {
        ...product.decision,
        nextWindow: next,
        baselineWindowId: baselineNext?.id || null,
        recommendationEngine: windowRecommendation.mode,
        jevRecommendation: windowRecommendation
      }
    };

    const weatherAtNext = next ? weatherForTime(weather, next.peak) : null;
    let languageModel = { mode: "not-run", reason: "No weather excerpt for next window." };
    let evidenceScreen = { available: false, safe: null, reason: "No weather excerpt for next window." };

    if (weatherAtNext?.excerpt) {
      [languageModel, evidenceScreen] = await Promise.all([
        classifyVisibilityWithHarness(weatherAtNext.excerpt, {
          location: weather?.sourceLocation?.label,
          validTime: weatherAtNext.startTime,
          provider: "National Weather Service"
        }),
        screenUntrustedEvidence(weatherAtNext.excerpt, "official-weather-forecast")
      ]);
    }

    const payload = {
      ...product,
      operational: {
        dataState: "fresh",
        cacheAgeMinutes: 0,
        modelClassification: languageModel,
        evidenceScreen,
        modelBoundary: "JEV may rank only the deterministic NOAA-derived candidate windows and interpret narrow forecast language. It cannot create or alter tide/current windows, daylight, safety state, or whirlpool probability."
      }
    };

    cache = { savedAt: now.getTime(), payload };
    return sendJson(res, payload);
  } catch (error) {
    if (cache && now.getTime() - cache.savedAt < STALE_LIMIT_MS) {
      return sendJson(res, {
        ...cache.payload,
        operational: {
          ...cache.payload.operational,
          dataState: "stale-last-known",
          cacheAgeMinutes: Math.round((now.getTime() - cache.savedAt) / 60000),
          staleReason: String(error?.message || error)
        }
      });
    }

    return sendJson(res, {
      error: "Live source bundle unavailable",
      generatedAt: now.toISOString(),
      live: false,
      detail: String(error?.message || error),
      truthBoundary: {
        observedOldSow: false,
        statement: "No live Old Sow observation is available."
      }
    }, 503);
  }
};
