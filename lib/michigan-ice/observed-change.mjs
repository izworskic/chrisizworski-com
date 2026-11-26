// Descriptive NOAA lake-wide change. No extrapolation, safety inference or forecast.
export const LAKES = Object.freeze(['superior','michigan','huron','erie','ontario']);
const KEYS = [...LAKES,'total'];
const DAY = 86400000;
const MAX_AGE = 48 * 3600000;
const valid = v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100;
const day = s => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const n = Date.parse(s+'T00:00:00Z');
  return Number.isFinite(n) && new Date(n).toISOString().slice(0,10) === s ? n : null;
};
const iso = n => new Date(n).toISOString().slice(0,10);
const round = n => Math.round(n*10)/10;
export function buildObservedChange(rows, {today, now, offSeason=false}={}) {
  const t = day(today), clock = now instanceof Date ? now.getTime() : NaN;
  const empty = state => ({state, observedAt:null, maxAgeHours:48, lakes:[], fastestGrowth:null, fastestRetreat:null});
  if (offSeason) return empty('off-season');
  if (t===null || !Number.isFinite(clock) || !Array.isArray(rows)) return empty('unavailable');
  const index = new Map(), duplicates = new Set();
  for (const row of rows) {
    const n=day(row?.date);
    if (n===null || n>t || n>clock || !KEYS.some(k=>valid(row[k]))) continue;
    if (index.has(n) || row.ambiguous === true) duplicates.add(n);
    index.set(n,row);
  }
  if (!index.size) return empty('unavailable');
  const newest=Math.max(...index.keys());
  if (duplicates.has(newest)) return empty('unavailable');
  if (clock-newest>MAX_AGE) return {...empty('stale'),observedAt:iso(newest)};
  const current=index.get(newest);
  const lakes=KEYS.map(key=>{
    const cover=valid(current[key])?current[key]:null;
    const changes=Object.fromEntries([1,3,7].map(days=>{
      const d=newest-days*DAY, base=index.get(d);
      return [days,cover!==null && !duplicates.has(d) && valid(base?.[key]) ? {from:iso(d),percentagePoints:round(cover-base[key])}:null];
    }));
    return {key,cover,changes};
  });
  const comparable=lakes.filter(r=>LAKES.includes(r.key));
  let fastestGrowth=null,fastestRetreat=null;
  if (comparable.every(r=>r.changes[7]!==null)) {
    const values=comparable.map(r=>r.changes[7].percentagePoints);
    const extreme=v=>({percentagePoints:v,keys:comparable.filter(r=>r.changes[7].percentagePoints===v).map(r=>r.key)});
    if (Math.max(...values)>0) fastestGrowth=extreme(Math.max(...values));
    if (Math.min(...values)<0) fastestRetreat=extreme(Math.min(...values));
  }
  return {state:'observed',observedAt:iso(newest),maxAgeHours:48,lakes,fastestGrowth,fastestRetreat};
}
