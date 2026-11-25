import { collectBoard, collectFaaStatus } from '../lib/holiday-travel/airport-weather.mjs';

export const config = { runtime: 'edge' };

const BASE_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex, nofollow',
  'cache-control': 'public, max-age=0, s-maxage=1800, stale-while-revalidate=3600'
};

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), {
      status: 405, headers: { ...BASE_HEADERS, allow: 'GET', 'cache-control': 'no-store' }
    });
  }
  const search = new URL(request.url).search;
  // One national snapshot cache key; no arbitrary parameters forwarded.
  if (search === '?view=faa') {
    const result = await collectFaaStatus();
    return new Response(JSON.stringify(result), {
      status: result.status === 'available' ? 200 : 503,
      headers: { ...BASE_HEADERS, 'cache-control': result.status === 'available'
        ? 'public, max-age=0, s-maxage=120, stale-while-revalidate=60'
        : 'public, max-age=0, s-maxage=30' }
    });
  }
  if (search) {
    return new Response(JSON.stringify({ error: 'UNSUPPORTED_PARAMETERS' }), {
      status: 400, headers: { ...BASE_HEADERS, 'cache-control': 'no-store' }
    });
  }
  try {
    const board = await collectBoard();
    return new Response(JSON.stringify(board), { status: 200, headers: BASE_HEADERS });
  } catch {
    return new Response(JSON.stringify({ active: false, source: 'National Weather Service',
      error: 'BOARD_UNAVAILABLE', airports: [] }), {
      status: 503, headers: { ...BASE_HEADERS, 'cache-control': 'no-store' }
    });
  }
}
