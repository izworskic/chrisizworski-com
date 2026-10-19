// CARTO's basemap key is explicitly PUBLIC and is intended for browser tile URLs.
// Never expose any other project secrets from this handler.
export const config = { runtime: 'edge' };

export default function handler(request) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Robots-Tag': 'noindex, nofollow',
    'Access-Control-Allow-Origin': 'https://chrisizworski.com',
    'Vary': 'Origin'
  };
  if (request.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...headers, Allow: 'GET', 'Cache-Control': 'no-store' }
    });
  }
  const key = String(process.env.CARTO_BASEMAP_PUBLIC_KEY || '').trim();
  if (!key) {
    return new Response(JSON.stringify({ error: 'CARTO public basemap key is not configured' }), {
      status: 503, headers: { ...headers, 'Cache-Control': 'no-store' }
    });
  }
  return new Response(JSON.stringify({ provider: 'CARTO', key }), {
    status: 200,
    headers: { ...headers, 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' }
  });
}
