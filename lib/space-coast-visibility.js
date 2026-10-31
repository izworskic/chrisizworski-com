'use strict';

// NWS gridded sky cover is a forecast for the grid cell near a spectator.
// It is not a cloud profile along the rocket's flight path and is never
// interchangeable with official launch-weather approval.

function validTimeInterval(value) {
  const match = String(value || '').match(/^([^/]+)\/P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/);
  if (!match) return null;
  const start = Date.parse(match[1]);
  const durationMs = (
    Number(match[2] || 0) * 86400 +
    Number(match[3] || 0) * 3600 +
    Number(match[4] || 0) * 60 +
    Number(match[5] || 0)
  ) * 1000;
  if (!Number.isFinite(start) || !Number.isFinite(durationMs) || durationMs <= 0) return null;
  return { start, end: start + durationMs };
}

function skyCoverAt(data, targetIso, now = Date.now()) {
  const target = Date.parse(targetIso || '');
  if (!Number.isFinite(target)) return { percent: null, status: 'invalid-time', updatedAt: null };
  const props = data?.properties;
  const updatedAt = props?.updateTime || null;
  if (!props?.skyCover || !Array.isArray(props.skyCover.values)) {
    return { percent: null, status: 'missing-field', updatedAt };
  }
  const uom = String(props.skyCover.uom || '');
  if (uom && !/(percent|%)/i.test(uom)) {
    return { percent: null, status: 'unexpected-units', updatedAt };
  }
  const updated = Date.parse(updatedAt || '');
  if (!Number.isFinite(updated) || updated > now + 3600000 || updated < now - 18 * 3600000) {
    return { percent: null, status: 'stale-grid', updatedAt };
  }
  for (const item of props.skyCover.values) {
    const interval = validTimeInterval(item.validTime);
    if (!interval || target < interval.start || target >= interval.end) continue;
    const v = item.value;
    if (v === null || v === undefined || v === '') return { percent: null, status: 'missing-value', updatedAt };
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || n > 100) return { percent: null, status: 'invalid-value', updatedAt };
    return { percent: Math.round(n), status: 'ok', updatedAt };
  }
  return { percent: null, status: 'outside-grid-period', updatedAt };
}

function surfaceSkyAssessment(period, cloud, weatherGrade) {
  const base = weatherGrade(period);
  const p = Number.isInteger(cloud?.percent) && cloud?.status === 'ok' ? cloud.percent : null;
  if (p === null) return {
    ...base, cloudCoverPercent: null,
    cloudEvidence: 'NWS gridded sky-cover forecast unavailable or outside its valid time. No cloud percentage is inferred.',
    cloudStatus: cloud?.status || 'unavailable', forecastUpdatedAt: cloud?.updatedAt || null
  };
  let level = base.level, label = base.label;
  // Clouds are an obstruction signal; a low cloud percentage cannot override
  // rain, fog, thunderstorms or an otherwise incomplete forecast.
  if (base.level === 'good' && p >= 65) {
    level = 'mixed'; label = 'Significant forecast clouds';
  }
  return {
    ...base, level, label,
    cloudCoverPercent: p, cloudStatus: 'ok', forecastUpdatedAt: cloud.updatedAt,
    cloudEvidence: 'NWS forecast sky cover near this viewing area: ' + p +
      '%. This is total forecast sky cover at the spectator grid, not upper-level clouds along the rocket.'
  };
}

function skyComparison(areas) {
  const a = (areas || []).find(x => x.id === 'titusville');
  const b = (areas || []).find(x => x.id === 'port-canaveral');
  const valid = x => x?.cloudStatus === 'ok' &&
    Number.isInteger(x.cloudCoverPercent) &&
    x?.assessment?.level !== 'unknown' &&
    x?.assessment?.level !== 'poor';
  if (!valid(a) || !valid(b)) {
    return { level: 'unknown', winner: null, difference: null,
      label: 'No reliable sky advantage yet',
      detail: 'Both locations need valid near-launch cloud forecasts without major surface-weather hazards before comparing them.' };
  }
  const difference = Math.abs(a.cloudCoverPercent - b.cloudCoverPercent);
  if (difference < 20) {
    return { level: 'comparable', winner: null, difference,
      label: 'Similar forecast cloud cover',
      detail: 'The cloud-cover gap is too small for this tool to favor one coast viewing area. Exact sightlines and trajectory remain unverified.' };
  }
  const winner = a.cloudCoverPercent < b.cloudCoverPercent ? a : b;
  return { level: 'contrast', winner: winner.id, difference,
    label: 'Relatively less forecast cloud near ' + winner.name,
    detail: 'NWS predicts ' + difference +
      ' percentage points less total sky cover there. This is not a verified rocket-viewing advantage.' };
}

module.exports = { validTimeInterval, skyCoverAt, surfaceSkyAssessment, skyComparison };
