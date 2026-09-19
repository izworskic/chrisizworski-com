// Compact NOAA-style solar approximation, accurate enough for daylight gating.
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function norm360(v) { return ((v % 360) + 360) % 360; }
function dayOfYear(date) {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  return Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - start) / 86400000);
}

function eventUtc(date, lat, lon, sunrise) {
  const n = dayOfYear(date);
  const lngHour = lon / 15;
  const t = n + ((sunrise ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  let L = M + 1.916 * Math.sin(M * RAD) + 0.020 * Math.sin(2 * M * RAD) + 282.634;
  L = norm360(L);
  let RA = DEG * Math.atan(0.91764 * Math.tan(L * RAD));
  RA = norm360(RA);
  const Lq = Math.floor(L / 90) * 90;
  const RAq = Math.floor(RA / 90) * 90;
  RA = (RA + Lq - RAq) / 15;
  const sinDec = 0.39782 * Math.sin(L * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(90.833 * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
  if (cosH > 1 || cosH < -1) return null;
  let H = sunrise ? 360 - DEG * Math.acos(cosH) : DEG * Math.acos(cosH);
  H /= 15;
  const T = H + RA - 0.06571 * t - 6.622;
  const UT = ((T - lngHour) % 24 + 24) % 24;
  const midnight = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return new Date(midnight + UT * 3600000);
}

export function daylightFor(dateInput, lat, lon) {
  const d = new Date(dateInput);
  return { sunrise: eventUtc(d, lat, lon, true), sunset: eventUtc(d, lat, lon, false) };
}

export function daylightState(dateInput, lat, lon) {
  const d = new Date(dateInput);
  const { sunrise, sunset } = daylightFor(d, lat, lon);
  if (!sunrise || !sunset) return { daylight: null, sunrise, sunset };
  return { daylight: d >= sunrise && d <= sunset, sunrise, sunset };
}
