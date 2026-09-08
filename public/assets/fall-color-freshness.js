(function (root) {
  "use strict";
  // The feed can be cached for 6 hours and served stale for another 24 hours.
  // Its generation time is not the observation time of every underlying source.
  function assess(payload, knownIds, nowMs = Date.now()) {
    const stamp = typeof payload?.updated === "string" ? Date.parse(payload.updated) : NaN;
    const age = nowMs - stamp;
    if (!Number.isFinite(stamp) || age < -300000 || age > 30 * 3600000 || payload.error || !Array.isArray(payload.regions)) return null;
    const ids = [...new Set(payload.regions.filter(region => {
      if (!knownIds.includes(region?.id)) return false;
      const weather = region.weather;
      const ndvi = region.ndvi;
      const canopyAge = nowMs - Date.parse(ndvi?.date + "T00:00:00Z");
      return (Number.isFinite(weather?.lowestRecent) && Number.isFinite(weather?.coolNights)) ||
        (Number.isFinite(ndvi?.senescence) && ndvi.senescence >= 0 && ndvi.senescence <= 1 && canopyAge >= 0 && canopyAge <= 30 * 86400000);
    }).map(region => region.id))];
    return ids.length ? { updated: new Date(stamp).toISOString(), regionIds: ids } : null;
  }
  if (typeof module === "object" && module.exports) module.exports = { assess };
  else root.FallColorFreshness = { assess };
})(typeof window === "object" ? window : globalThis);
