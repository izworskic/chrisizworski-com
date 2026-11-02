'use strict';

// A launch-side forecast *context* layer. NWS grids do not measure electrified
// clouds, rocket-triggered lightning, upper-level winds, sea-state downrange,
// or mission-specific flight commit criteria. Never infer a range GO/NO-GO.
const { validTimeInterval } = require('./space-coast-visibility');
const NWS = 'https://api.weather.gov';
const MAX_AGE_MS = 18 * 3600000;
const HORIZON_MS = 7 * 86400000;
const SITES = Object.freeze({
  florida: { name: 'Cape Canaveral / Kennedy vicinity', lat: 28.58, lon: -80.61,
    official: 'https://www.patrick.spaceforce.mil/About-Us/Weather/' },
  california: { name: 'Vandenberg range vicinity', lat: 34.74, lon: -120.57,
    official: 'https://www.vandenberg.spaceforce.mil/News/' },
  texas: { name: 'Starbase range vicinity', lat: 25.997, lon: -97.157,
    official: 'https://www.starbase.texas.gov/beach-road-access' },
  virginia: { name: 'Wallops range vicinity', lat: 37.84, lon: -75.48,
    official: 'https://www.nasa.gov/wallops-launch-schedule/' },
  alaska: { name: 'Kodiak range vicinity', lat: 57.43, lon: -152.34,
    official: 'https://akaerospace.com/' },
  hawaii: { name: 'Pacific Missile Range Facility vicinity', lat: 22.02, lon: -159.78,
    official: 'https://cnrh.cnic.navy.mil/Installations/PMRF-Barking-Sands/' }
});
const OFFSETS = Object.freeze([-24, -12, -6, 0, 2]);

function unavailable(reason, site = null) {
  return { status: 'unknown', level: 'unknown', label: 'Launch-side weather not established',
    detail: reason, site: site ? { name: site.name, approximation: 'Regional reference point, not the rocket pad' } : null,
    checkedAt: null, forecastUpdatedAt: null, sourceUrl: null, officialUrl: site?.official || null,
    signals: [], readings: null, timeline: [], officialApproval: 'not-verified',
    officialProbabilityOfViolation: null };
}
function freshGrid(data, now) {
  const updatedAt = data?.properties?.updateTime || null;
  const t = Date.parse(updatedAt || '');
  return { ok: Number.isFinite(t) && t <= now + 3600000 && t >= now - MAX_AGE_MS, updatedAt };
}
function gridValue(data, field, at, now) {
  const fresh = freshGrid(data, now);
  if (!fresh.ok) return null;
  const layer = data?.properties?.[field];
  if (!layer || !Array.isArray(layer.values)) return null;
  for (const row of layer.values) {
    const span = validTimeInterval(row.validTime);
    if (!span || at < span.start || at >= span.end) continue;
    if (row.value == null || row.value === '') return null;
    const value = Number(row.value);
    if (!Number.isFinite(value)) return null;
    return { value, uom: String(layer.uom || '') };
  }
  return null;
}
function percent(reading) {
  if (!reading || (reading.uom && !/(percent|%)/i.test(reading.uom))) return null;
  return reading.value >= 0 && reading.value <= 100 ? Math.round(reading.value) : null;
}
function windMph(reading) {
  if (!reading || reading.value < 0) return null;
  const unit = reading.uom.toLowerCase();
  if (/m_s-1|m\/s|meter.*second/.test(unit)) return Math.round(reading.value * 2.236936);
  if (/km_h-1|km\/h/.test(unit)) return Math.round(reading.value * 0.621371);
  if (/mi_h-1|mph|mile.*hour/.test(unit)) return Math.round(reading.value);
  return null; // Unknown units do not get guessed.
}
function sample(data, at, now, period = null) {
  const thunder = percent(gridValue(data, 'probabilityOfThunder', at, now));
  const rain = percent(gridValue(data, 'probabilityOfPrecipitation', at, now));
  const gust = windMph(gridValue(data, 'windGust', at, now));
  const wind = windMph(gridValue(data, 'windSpeed', at, now));
  const clouds = percent(gridValue(data, 'skyCover', at, now));
  const phrase = typeof period?.shortForecast === 'string' ? period.shortForecast.slice(0, 140) : null;
  const textThunder = Boolean(phrase && /thunder|lightning/i.test(phrase));
  const signals = [];
  if (thunder >= 40 || textThunder) signals.push({ id: 'thunder', level: 'elevated',
    label: 'Thunderstorm potential in the local forecast', value: thunder == null ? null : thunder + '%',
    detail: 'Lightning and electrified-cloud rules require dedicated range measurements. NWS thunder forecasts are only an early warning.' });
  else if (thunder >= 20) signals.push({ id: 'thunder', level: 'watch',
    label: 'Thunder potential worth monitoring', value: thunder + '%',
    detail: 'This is an area forecast, not a probability of violating a rocket launch rule.' });
  if (rain >= 60) signals.push({ id: 'rain', level: 'elevated', label: 'High precipitation chance',
    value: rain + '%', detail: 'Local NWS precipitation forecast; flight criteria vary by rocket and mission.' });
  else if (rain >= 35) signals.push({ id: 'rain', level: 'watch', label: 'Showers possible',
    value: rain + '%', detail: 'Rain near the range could affect operations or viewing; no scrub prediction is implied.' });
  const air = gust == null ? wind : gust;
  if (air >= 35) signals.push({ id: 'wind', level: 'elevated', label: 'Strong local surface wind signal',
    value: air + ' mph', detail: 'Local forecast gust/wind, not verified launch-pad or upper-air wind.' });
  else if (air >= 22) signals.push({ id: 'wind', level: 'watch', label: 'Breezy range-area forecast',
    value: air + ' mph', detail: 'Mission-specific surface wind and upper-air limits are unknown.' });
  // A cloud-only or vague text forecast is not enough to call the launch-side
  // hazard screen reassuring. Hazard warnings still display when any source
  // explicitly indicates a material concern.
  const hazardGroups = [thunder, rain, gust == null ? wind : gust].filter(v => v !== null).length;
  const known = signals.length > 0 || hazardGroups >= 2;
  const level = !known ? 'unknown' : signals.some(s => s.level === 'elevated') ? 'elevated' :
    signals.length ? 'watch' : 'observed';
  return { level, readings: { thunderPercent: thunder, precipitationPercent: rain,
    gustMph: gust, windMph: wind, cloudCoverPercent: clouds, shortForecast: phrase },
    signals };
}
function buildTimeline(grid, target, now, hourly) {
  return OFFSETS.map(hours => {
    const at = target + hours * 3600000;
    if (at < now - 1800000 || at > now + HORIZON_MS) return null;
    const period = (hourly?.properties?.periods || []).find(x =>
      at >= Date.parse(x.startTime) && at < Date.parse(x.endTime)) || null;
    const result = sample(grid, at, now, period);
    return { hoursFromTarget: hours, at: new Date(at).toISOString(),
      level: result.level, readings: result.readings, signals: result.signals.map(x => x.id) };
  }).filter(Boolean);
}
function evaluate(grid, hourly, launch, now = Date.now(), site = null, sourceUrl = null) {
  const target = Date.parse(launch.net);
  const current = (hourly?.properties?.periods || []).find(x =>
    target >= Date.parse(x.startTime) && target < Date.parse(x.endTime)) || null;
  if (!freshGrid(grid, now).ok) return unavailable('The NWS gridded forecast is missing, stale, or has no valid update time.', site);
  const result = sample(grid, target, now, current);
  if (result.level === 'unknown') return unavailable('No usable NWS forecast fields cover the selected launch time.', site);
  const titles = { elevated: 'Elevated surface-weather signals',
    watch: 'Some surface-weather concerns to watch',
    observed: 'No major surface signals in the available fields' };
  return {
    status: 'forecast', level: result.level, label: titles[result.level],
    detail: 'NWS range-area forecast signals only. These are not a launch probability, rocket-specific constraints, or a flight-weather decision.',
    site: { name: site.name, approximation: 'Regional reference point, not the rocket pad' },
    forecastUpdatedAt: grid.properties.updateTime, checkedAt: new Date(now).toISOString(),
    sourceUrl, officialUrl: site.official, readings: result.readings,
    signals: result.signals, timeline: buildTimeline(grid, target, now, hourly),
    officialApproval: 'not-verified', officialProbabilityOfViolation: null
  };
}
async function launchWeatherFor(region, launch, fetchJson, now = Date.now()) {
  const site = SITES[region?.id];
  if (!site) return unavailable('No supported launch range was selected.');
  if (!launch || !['minute', 'second'].includes(launch.netPrecision)) {
    return unavailable('A minute-precise published mission target is required; date-only missions remain unassessed.', site);
  }
  const target = Date.parse(launch.net);
  if (!Number.isFinite(target) || target < now - 15 * 60000 || target > now + HORIZON_MS) {
    return unavailable('This mission is outside the seven-day launch-side forecast horizon.', site);
  }
  try {
    const headers = { Accept: 'application/geo+json' };
    const point = await fetchJson(NWS + '/points/' + site.lat.toFixed(4) + ',' + site.lon.toFixed(4), headers, 7000);
    const gridUrl = point?.properties?.forecastGridData;
    const hourlyUrl = point?.properties?.forecastHourly;
    const valid = u => typeof u === 'string' && u.startsWith(NWS + '/gridpoints/');
    if (!valid(gridUrl)) return unavailable('NWS did not return a valid range-area gridded forecast address.', site);
    const [grid, hourly] = await Promise.all([
      fetchJson(gridUrl, headers, 7500),
      valid(hourlyUrl) ? fetchJson(hourlyUrl, headers, 7500).catch(() => null) : Promise.resolve(null)
    ]);
    return evaluate(grid, hourly, launch, now, site, gridUrl);
  } catch (_) {
    return unavailable('The NWS range-area weather source could not be checked. The tool will not infer launch conditions.', site);
  }
}
module.exports = { SITES, gridValue, freshGrid, sample, buildTimeline, evaluate,
  launchWeatherFor, unavailable };
