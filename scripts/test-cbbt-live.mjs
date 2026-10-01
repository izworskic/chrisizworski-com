import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { buildDecisionSnapshot, clearCache } = require('../lib/cbbt/engine');

const strict = process.argv.includes('--strict');
clearCache();
const snapshot = await buildDecisionSnapshot({ query: {} });

const report = {
  generatedAt: snapshot.engine.generatedAt,
  officialStatus: snapshot.officialStatus,
  weather: {
    available: snapshot.weatherNow.available,
    observedAt: snapshot.weatherNow.observedAt,
    freshness: snapshot.weatherNow.freshness,
    wind: snapshot.weatherNow.wind,
  },
  forecast: {
    available: snapshot.forecast.available,
    generatedAt: snapshot.forecast.generatedAt,
    periods: snapshot.forecast.periods?.length || 0,
  },
  alerts: snapshot.alerts.length,
  incidents: snapshot.activeIncidents.length,
  advisories: snapshot.plannedAdvisories.length,
  radar: snapshot.radar,
  health: snapshot.systemHealth,
};

console.log(JSON.stringify(report, null, 2));

if (strict) {
  const failures = [];
  if (snapshot.officialStatus.state === 'UNKNOWN') failures.push('official CBBT status unresolved');
  if (snapshot.officialStatus.state === 'OFFICIAL_STATUS_CONFLICT') failures.push('official CBBT sources conflict');
  if (!snapshot.weatherNow.available) failures.push('NOAA observation unavailable');
  if (!snapshot.forecast.available) failures.push('NWS marine-grid forecast unavailable');
  if (snapshot.engine.weatherMayDeclareRestriction !== false) failures.push('authority invariant violated');
  if (failures.length) {
    console.error(`LIVE CBBT STRICT FAILURE: ${failures.join('; ')}`);
    process.exitCode = 1;
  }
}
