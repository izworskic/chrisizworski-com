// NOAA GLERL selected-winter archive. Separate from live /api/ice-now so
// replay never causes additional current NOAA polygons or NWS requests.
// Archive percentages describe WHOLE LAKES, not bays or safe ice conditions.
export const config = { runtime: 'edge' };

const GLERL = 'https://apps.glerl.noaa.gov/coastwatch/webdata/statistic/ice/dat/';
const KEYS = ['superior','michigan','huron','erie','ontario','stclair','total'];
const MIN_YEAR = 2015;
function latestSeasonStart(now) {
  return now.getUTCFullYear() - (now.getUTCMonth() + 1 < 11 ? 1 : 0);
}
function isoDay(year, day) {
  if (!Number.isInteger(year) || !Number.isInteger(day) || day < 1 ||
      day > ((year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 366 : 365)) return null;
  return new Date(Date.UTC(year,0,day)).toISOString().slice(0,10);
}
function decodeGlData(source, seasonStart) {
  const rows = [];
  for (const line of String(source).split(/\r?\n/)) {
    const cells=line.trim().split(/\s+/);
    if (cells.length !== 9 || !/^\d{4}$/.test(cells[0]) || !/^\d{1,3}$/.test(cells[1])) continue;
    const year=Number(cells[0]), day=Number(cells[1]), iso=isoDay(year,day);
    if (!iso || iso < seasonStart+'-11-01' || iso > (seasonStart+1)+'-05-31') continue;
    const vals=cells.slice(2).map(Number);
    if (vals.some(x=>!Number.isFinite(x)||x<0||x>100)) continue;
    const row={date:iso};
    for(let i=0;i<KEYS.length;i++)row[KEYS[i]]=vals[i];
    rows.push(row);
  }
  rows.sort((a,b)=>a.date.localeCompare(b.date));
  // Repeated entries, if any, are not treated as additional observation days.
  return rows.filter((r,i)=>i===0||r.date!==rows[i-1].date);
}
function response(payload,status,cache) {
  return new Response(JSON.stringify(payload),{
    status,
    headers:{'content-type':'application/json',
      'cache-control':cache,
      'x-robots-tag':'noindex, nofollow'}
  });
}
export default async function handler(req) {
  const now=new Date();
  const latest=latestSeasonStart(now);
  const value=new URL(req.url).searchParams.get('season');
  if (!value || !/^\d{4}$/.test(value)) {
    return response({ok:false,error:'Select a valid winter season.'},400,'no-store');
  }
  const start=Number(value);
  // The UI lists ten previous winters plus the latest; no arbitrary year crawling.
  if (start < Math.max(MIN_YEAR,latest-10) || start > latest) {
    return response({ok:false,error:'Winter is outside the supported season archive.'},400,'no-store');
  }
  const url=GLERL+'g'+start+'_'+(start+1)+'_ice.dat';
  try {
    const upstream=await fetch(url,{
      headers:{'User-Agent':'michigan-ice-report (chrisizworski.com/michigan-ice/)'},
      signal:AbortSignal.timeout(9500)
    });
    if(!upstream.ok) throw new Error('NOAA daily archive unavailable');
    const rows=decodeGlData(await upstream.text(),start);
    if(!rows.length) throw new Error('NOAA daily archive contains no valid winter observations');
    const seasonActive=start===latest && (now.getUTCMonth()+1>=11 || now.getUTCMonth()+1<=3);
    return response({
      ok:true,source:'NOAA GLERL daily mean ice concentration',
      seasonStartYear:start,seasonLabel:start+'–'+String(start+1).slice(2),
      historical:!seasonActive,observedThrough:rows[rows.length-1].date,
      series:rows,
      scope:'Whole-lake percentages only. No local bay coverage, ice thickness, or safe-ice assessment.',
      chartArchive:'https://www.glerl.noaa.gov/data/ice/glicd.php?year='+(start+1)
    },200,seasonActive?'public, max-age=600, s-maxage=1800':'public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400');
  }catch{
    return response({ok:false,seasonStartYear:start,
      error:'NOAA has no usable daily record for this winter right now. Other seasons remain available.'},
      503,'no-store');
  }
}
