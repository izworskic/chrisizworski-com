// NOAA GLERL daily climatology and current-season comparison for the existing ice endpoint.
// A recorded 0 is an observation. NA, malformed values and absent dates remain null.
import { michiganIceClock, winterObservationDate, belongsToWinter } from './season.mjs';

export const ICE_LAKES = Object.freeze([
  { key: 'superior', file: 'sup', label: 'Lake Superior' },
  { key: 'michigan', file: 'mic', label: 'Lake Michigan' },
  { key: 'huron', file: 'hur', label: 'Lake Huron' },
  { key: 'erie', file: 'eri', label: 'Lake Erie' },
  { key: 'ontario', file: 'ont', label: 'Lake Ontario' },
  { key: 'total', file: 'bas', label: 'Great Lakes total' }
]);

function measured(value) {
  if (value === undefined || value === null || value === 'NA' || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : null;
}

export function dailyLabel(dateISO) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO || '')) return null;
  const d = new Date(dateISO + 'T12:00:00Z');
  if (!Number.isFinite(d.getTime())) return null;
  const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return names[d.getUTCMonth()] + '-' + String(d.getUTCDate()).padStart(2, '0');
}

// GLERL: header = ice years (1973 ...); rows = "Feb-20  NA  2.1 ...".
// Only per-year numerical cells count. In particular, do not coerce NA to zero.
export function parseDailyClimatology(text) {
  if (typeof text !== 'string') return null;
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  const years = (lines.shift() || '').trim().split(/\s+/).map(Number);
  if (years.length < 2 || years.some(y => !Number.isInteger(y) || y < 1900 || y > 2200)) return null;
  const dates = new Map();
  for (const line of lines) {
    const cells = line.trim().split(/\s+/);
    if (!/^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2}$/.test(cells[0]) || cells.length < years.length + 1) continue;
    const record = new Map();
    years.forEach((year, i) => record.set(year, measured(cells[i + 1])));
    dates.set(cells[0], record);
  }
  return dates.size ? { years, dates } : null;
}

export function parseSeasonCover(text, startYear, latestISO) {
  if (typeof text !== 'string') return [];
  const rows = new Map();
  for (const line of text.split(/\r?\n/)) {
    const c = line.trim().split(/\s+/);
    if (c.length !== 9 || !/^\d{4}$/.test(c[0]) || !/^\d{1,3}$/.test(c[1])) continue;
    const date = winterObservationDate(Number(c[0]), Number(c[1]));
    if (!belongsToWinter(date, startYear, latestISO)) continue;
    const values = c.slice(2).map(measured);
    // Reject corrupt rows, but keep a valid zero and each unavailable lake separately.
    if (values.every(v => v === null)) continue;
    const item = { date };
    ['superior','michigan','huron','erie','ontario','stclair','total']
      .forEach((key, i) => { item[key] = values[i]; });
    rows.set(date, item);
  }
  return [...rows.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function round(n) { return Math.round(n * 10) / 10; }
function statistics(record, current, lastIceYear, firstYear, lastYear) {
  if (!record) return null;
  const pairs = [...record.entries()].filter(([, value]) => value !== null);
  if (!pairs.length) return null;
  const ordered = pairs.slice().sort((a, b) => a[1] - b[1] || a[0] - b[0]);
  const vals = ordered.map(([, val]) => val);
  const middle = Math.floor(vals.length / 2);
  const median = vals.length % 2 ? vals[middle] : (vals[middle - 1] + vals[middle]) / 2;
  const lowerCount = current === null ? null : vals.filter(v => v < current).length;
  const tieCount = current === null ? null : vals.filter(v => v === current).length;
  const rank = current === null ? null : Math.min(vals.length, Math.max(1, lowerCount + 1));
  return {
    yearsOfRecord: vals.length, firstYear, lastYear,
    mean: round(vals.reduce((s, n) => s + n, 0) / vals.length),
    median: round(median), min: vals[0], minYear: ordered[0][0],
    max: vals[vals.length - 1], maxYear: ordered[ordered.length - 1][0],
    current, lastYearValue: record.get(lastIceYear) ?? null,
    lastYearIceYear: lastIceYear, rank, lowerCount,
    // Midrank percentile treats ties, including years with observed 0%, fairly.
    percentile: current === null ? null : round(100 * (lowerCount + tieCount / 2) / vals.length)
  };
}

function peakForSeries(rows, key) {
  let peak = null;
  for (const row of rows) {
    const value = row[key];
    if (value !== null && value !== undefined && (!peak || value > peak.value))
      peak = { date: row.date, value };
  }
  return peak;
}

function peakForRecordedYear(climo, iceYear) {
  if (!climo) return null;
  let peak = null;
  for (const [label, record] of climo.dates) {
    const value = record.get(iceYear);
    if (value !== null && value !== undefined && (!peak || value > peak.value))
      peak = { date: label, value };
  }
  return peak;
}

// Self-contained output for the existing /api/ice handler; no extra API route or cache.
// Each GLERL file resolves independently, so one missing lake cannot erase the others.
export async function buildIceRecord(now = new Date(), fetcher = fetch) {
  const clock = michiganIceClock(now);
  const iceYear = clock.seasonYear + 1;
  const today = clock.today;
  const date = dailyLabel(today);
  const offSeason = (clock.month >= 6 && clock.month <= 10) ||
    (clock.month === 11 && Number(today.slice(-2)) < 15);

  const climoPromises = ICE_LAKES.map(async lake => {
    try {
      const response = await fetcher('https://www.glerl.noaa.gov/data/ice/glicd/daily/' + lake.file + '.txt',
        { headers: { 'User-Agent': 'michigan-ice-report (chrisizworski.com/michigan-ice/)' } });
      return response.ok ? parseDailyClimatology(await response.text()) : null;
    } catch { return null; }
  });

  let season = [];
  if (!offSeason) {
    try {
      const url = 'https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/g' +
        clock.seasonYear + '_' + iceYear + '_ice.dat';
      const response = await fetcher(url, {
        headers: { 'User-Agent': 'michigan-ice-report (chrisizworski.com/michigan-ice/)' }
      });
      if (response.ok) season = parseSeasonCover(await response.text(), clock.seasonYear, today);
    } catch { /* unavailable is not an observed zero */ }
  }
  const climatologies = await Promise.all(climoPromises);
  const table = {};
  const chart = {};
  const yearLabels = {};
  ICE_LAKES.forEach((lake, index) => {
    const parsed = climatologies[index];
    const todayRow = season.find(row => row.date === today);
    const todayValue = offSeason ? null : (todayRow?.[lake.key] ?? null);
    const record = parsed?.dates.get(date);
    const base = statistics(record, todayValue, iceYear - 1,
      parsed?.years[0] ?? null, parsed?.years[parsed.years.length - 1] ?? null);
    const seasonPeak = offSeason ? peakForRecordedYear(parsed, iceYear - 1)
      : peakForSeries(season, lake.key);
    table[lake.key] = base ? { date, ...base, seasonPeak } : null;
    yearLabels[lake.key] = parsed ? parsed.years.length : null;
    chart[lake.key] = parsed
      ? [...parsed.dates].map(([label, values]) => {
          const day = statistics(values, null, iceYear - 1, parsed.years[0],
            parsed.years[parsed.years.length - 1]);
          const cur = offSeason ? (values.get(iceYear - 1) ?? null)
            : (season.find(x => dailyLabel(x.date) === label)?.[lake.key] ?? null);
          return day ? { date: label, mean: day.mean, min: day.min, max: day.max,
            current: cur, yearsOfRecord: day.yearsOfRecord } : null;
        }).filter(Boolean)
      : [];
  });
  return {
    observedDate: today, iceYear, seasonLabel: clock.seasonYear + '–' + String(iceYear).slice(-2),
    offSeason, yearsAvailable: Math.max(0, ...Object.values(yearLabels).filter(Number.isFinite)),
    lakes: table, series: chart,
    note: 'The 54-year archive contains NA gaps. The comparison denominator is the number of recorded winters on the selected calendar date, not an assumed 54 measurements.'
  };
}
