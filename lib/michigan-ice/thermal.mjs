// Shared ACIS request and legacy thaw-adjusted index. Not cave formation or ice safety.
export async function acisRange(sid, sdate, edate) {
  const r = await fetch('https://data.rcc-acis.org/StnData', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sid, sdate, edate, elems: 'maxt,mint' }),
    signal: AbortSignal.timeout(9000)
  });
  if (!r.ok) return null;
  const j = await r.json();
  return (j && j.data) || null;
}
export function afddFrom(rows) {
  if (!rows) return null;
  let a = 0, valid = 0;
  for (const [, mx, mn] of rows) {
    const hi = parseFloat(mx), lo = parseFloat(mn);
    if (!isFinite(hi) || !isFinite(lo)) continue;
    valid++;
    a = Math.max(0, a + (32 - (hi + lo) / 2));
  }
  return valid ? Math.round(a) : null;
}
