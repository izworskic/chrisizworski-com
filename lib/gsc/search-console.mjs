const API_ROOT = 'https://www.googleapis.com/webmasters/v3';

export function shiftDate(dateString, deltaDays) {
  const [y, m, d] = dateString.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

export function pacificDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).reduce((acc, p) => { acc[p.type] = p.value; return acc; }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function buildWindows({ now = new Date(), finalLagDays = 2 } = {}) {
  const today = pacificDate(now);
  const currentEnd = shiftDate(today, -finalLagDays);
  const currentStart = shiftDate(currentEnd, -27);
  const previousEnd = shiftDate(currentStart, -1);
  const previousStart = shiftDate(previousEnd, -27);
  const yearAgoStart = shiftDate(currentStart, -364);
  const yearAgoEnd = shiftDate(currentEnd, -364);
  const current7Start = shiftDate(currentEnd, -6);
  const previous7End = shiftDate(current7Start, -1);
  const previous7Start = shiftDate(previous7End, -6);
  return {
    current: { startDate: currentStart, endDate: currentEnd },
    previous: { startDate: previousStart, endDate: previousEnd },
    yearAgo: { startDate: yearAgoStart, endDate: yearAgoEnd },
    current7: { startDate: current7Start, endDate: currentEnd },
    previous7: { startDate: previous7Start, endDate: previous7End },
  };
}

export async function querySearchAnalytics({
  accessToken,
  siteUrl,
  startDate,
  endDate,
  dimensions = [],
  rowLimit = 25000,
  maxRows = 25000,
  dataState = 'final',
  fetchImpl = fetch,
}) {
  if (!accessToken) throw new Error('missing Google access token');
  if (!siteUrl) throw new Error('missing GSC site URL');
  const endpoint = `${API_ROOT}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const rows = [];
  let startRow = 0;
  const pageSize = Math.min(25000, Math.max(1, rowLimit));

  while (rows.length < maxRows) {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: Math.min(pageSize, maxRows - rows.length), startRow, dataState }),
    });
    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = json?.error?.message || json?.error || 'Search Console request failed';
      throw new Error(`GSC query failed (${response.status}): ${message}`);
    }
    const batch = Array.isArray(json.rows) ? json.rows : [];
    rows.push(...batch);
    if (batch.length < pageSize) break;
    startRow += batch.length;
  }
  return rows;
}

export function rowToMetric(row, keyName = 'key') {
  return {
    [keyName]: row?.keys?.[0] || '',
    clicks: Number(row?.clicks || 0),
    impressions: Number(row?.impressions || 0),
    ctr: Number(row?.ctr || 0),
    position: Number(row?.position || 0),
  };
}

export async function collectWindow({ accessToken, siteUrl, window, dimension, maxRows, fetchImpl }) {
  const rows = await querySearchAnalytics({ accessToken, siteUrl, ...window, dimensions: [dimension], maxRows, fetchImpl });
  return rows.map((r) => rowToMetric(r, dimension));
}

export async function collectTotals({ accessToken, siteUrl, window, fetchImpl }) {
  const rows = await querySearchAnalytics({ accessToken, siteUrl, ...window, dimensions: [], maxRows: 1, fetchImpl });
  const r = rows[0] || {};
  return { clicks: Number(r.clicks || 0), impressions: Number(r.impressions || 0), ctr: Number(r.ctr || 0), position: Number(r.position || 0) };
}
