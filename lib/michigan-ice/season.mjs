// One Michigan-local season clock for the Great Lakes and regional ice network.
// Ice monitoring starts November 1; the new season does not imply ice exists.
export function michiganIceClock(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Detroit', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now).map(part => [part.type, part.value]));
  const month = Number(parts.month), year = Number(parts.year);
  const today = parts.year + '-' + parts.month + '-' + parts.day;
  const seasonYear = month >= 10 ? year : year - 1;
  const seasonStart = seasonYear + '-11-01';
  return {
    today, month, seasonYear, seasonStart,
    active: month >= 11 || month <= 3,
    preSeason: today < seasonStart,
    rolloverWindow: today === seasonYear + '-10-31' ||
      today === seasonYear + '-11-01'
  };
}

export function winterObservationDate(year, dayOfYear) {
  if (!Number.isInteger(year) || !Number.isInteger(dayOfYear) || dayOfYear < 1) return null;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (dayOfYear > (leap ? 366 : 365)) return null;
  return new Date(Date.UTC(year, 0, dayOfYear)).toISOString().slice(0, 10);
}

export function belongsToWinter(date, seasonYear, latest) {
  return typeof date === 'string' &&
    date >= seasonYear + '-11-01' &&
    date <= (seasonYear + 1) + '-05-31' &&
    date <= latest;
}
