'use strict';

/**
 * Forecast and daylight assessment contract.
 * Call with a CACHED, timestamped forecast from a verified source adapter.
 * This code does NOT fetch weather, verify trail safety, or assert clear summit views.
 */
const {catalog,evaluateDaylight} = require('./route-engine.cjs');

function parseZonedTime(value, label) {
  if (typeof value !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(value) || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(label + ' needs an ISO-8601 timestamp with an explicit offset');
  }
  return Date.parse(value);
}

function validWeather(hour) {
  return hour && Number.isFinite(hour.cloudPercent) && hour.cloudPercent >= 0 && hour.cloudPercent <= 100 &&
    Number.isFinite(hour.precipProbability) && hour.precipProbability >= 0 && hour.precipProbability <= 100 &&
    Number.isFinite(hour.windGustKmh) && hour.windGustKmh >= 0 && hour.windGustKmh <= 300 &&
    (hour.thunderRisk === true || hour.thunderRisk === false);
}

function gradeForecast({routeId,mode = 'hike',departAt,sunsetAt,forecast,now,
  reserveMinutes = 60,maxForecastAgeMinutes = 180}) {
  const route = catalog.routes.find(r => r.id === routeId);
  if (!route) throw new RangeError('Unknown Sleeping Giant route');
  const departureMs = parseZonedTime(departAt,'departAt');
  const sunsetMs = parseZonedTime(sunsetAt,'sunsetAt');
  const nowMs = parseZonedTime(now,'now');
  if (!Number.isFinite(maxForecastAgeMinutes) || maxForecastAgeMinutes < 15 || maxForecastAgeMinutes > 1440) {
    throw new RangeError('Forecast age limit must be 15–1440 minutes');
  }
  const daylight = evaluateDaylight(route,mode,Math.max(0,(sunsetMs - departureMs) / 60000),reserveMinutes);
  const base = {routeId,mode,daylight,planningOnly:true,
    disclosure:'Forecast opportunity, not a safety, trail-open, view-visibility or cliff-condition verdict.'};
  if (mode !== 'hike' || !route.officialDurationMinutes) {
    return {...base,status:'unrated_trip_duration',signal:'unknown',reason:'No verified total trip time for selected mode.'};
  }
  if (daylight.status !== 'covers_official_upper_with_reserve') {
    return {...base,status:'daylight_not_assured',signal:'unknown',reason:'Conservative official hike-time plus reserve exceeds remaining daylight.'};
  }
  if (!forecast || forecast.provider !== 'ECCC' || !Array.isArray(forecast.hours)) {
    return {...base,status:'forecast_unavailable',signal:'unknown',reason:'No verified ECCC cache snapshot supplied.'};
  }
  let issuedMs;
  try {issuedMs = parseZonedTime(forecast.issuedAt,'forecast.issuedAt');}
  catch {return {...base,status:'forecast_invalid',signal:'unknown',reason:'Forecast issuance time invalid.'};}
  const ageMinutes = (nowMs - issuedMs) / 60000;
  if (ageMinutes < -10 || ageMinutes > maxForecastAgeMinutes) {
    return {...base,status:'forecast_stale',signal:'unknown',ageMinutes,reason:'Forecast issued outside allowed freshness window.'};
  }
  const durationMs = route.officialDurationMinutes.max * 60000;
  const tripEndMs = departureMs + durationMs;
  const sorted = forecast.hours.map(h => {
    try {return {...h,startMs:parseZonedTime(h.startAt,'hour.startAt'),endMs:parseZonedTime(h.endAt,'hour.endAt')};}
    catch {return null;}
  }).filter(Boolean).sort((a,b) => a.startMs - b.startMs);
  let coveredUntil = departureMs;
  const included = [];
  for (const slot of sorted) {
    if (slot.endMs <= coveredUntil || slot.startMs > coveredUntil) continue;
    if (!validWeather(slot) || slot.endMs <= slot.startMs) {
      return {...base,status:'forecast_missing_fields',signal:'unknown',reason:'Forecast hour is incomplete.'};
    }
    included.push(slot);
    coveredUntil = slot.endMs;
    if (coveredUntil >= tripEndMs) break;
  }
  if (coveredUntil < tripEndMs) {
    return {...base,status:'forecast_gap',signal:'unknown',coveredMinutes:Math.max(0,(coveredUntil-departureMs)/60000),
      reason:'Forecast does not cover the conservative complete outing.'};
  }
  const maxPrecipProbability = Math.max(...included.map(h => h.precipProbability));
  const maxWindGustKmh = Math.max(...included.map(h => h.windGustKmh));
  const maxCloudPercent = Math.max(...included.map(h => h.cloudPercent));
  const anyThunderRisk = included.some(h => h.thunderRisk);
  let signal = 'more_favorable_weather';
  if (anyThunderRisk || maxWindGustKmh >= 45 || maxPrecipProbability >= 70) signal = 'higher_weather_concern';
  else if (maxWindGustKmh >= 30 || maxPrecipProbability >= 40) signal = 'mixed_weather';
  const viewHint = maxCloudPercent >= 75 ? 'clouds_may_limit_views' : 'views_not_guaranteed';
  return {...base,status:'forecast_assessed',signal,viewHint,ageMinutes,
    examinedPeriods:included.length,forecastHorizonMinutes:route.officialDurationMinutes.max,
    maxPrecipProbability,maxWindGustKmh,maxCloudPercent,anyThunderRisk,
    forecastSource:forecast.sourceUrl || null,
    caveats:['No direct trail condition, surface, parking or bridge inspection.',
      'The thresholds organize forecast signals; they are NOT calibrated safety thresholds.',
      'Forecast location may differ substantially from the exposed summit.',
      'Confirm official park notices, weather warnings and personal hiking capability.']};
}

module.exports = {parseZonedTime,validWeather,gradeForecast};
