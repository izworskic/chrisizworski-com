const LEGACY_NIAGARA = '/national-tools/waterfalls/niagara-falls-live';
const DUPLICATE_RAINBOW_PLANNER = '/national-tools/niagara-falls-rainbow-planner';
const LIVE_RAINBOW_PREDICTOR = '/national-tools/niagara-rainbow/';
const GRAND_COULEE_PATH = '/national-tools/grand-coulee';
const GRAND_COULEE_UPSTREAM = 'https://grand-coulee-live.vercel.app';
const PLATTE_CRANE_PATH = '/national-tools/platte-crane-live';
const PLATTE_CRANE_UPSTREAM = 'https://platte-crane-migration-nebraska.vercel.app';
const FORT_MADISON_PATH = '/national-tools/fort-madison-live';
const FORT_MADISON_UPSTREAM = 'https://fort-madison-live.vercel.app';
const PICTURED_ROCKS_HOST = 'picturedrocks.chrisizworski.com';
const PICTURED_ROCKS_SOURCE = '/labs/pictured-rocks-planner/';
const PICTURED_ROCKS_INDEXABLE_ROBOTS = '<meta name="robots" content="index,follow,max-image-preview:large">';

export const config = {
  matcher: [
    '/',
    '/index.html',
    '/national-tools/waterfalls/niagara-falls-live',
    '/national-tools/waterfalls/niagara-falls-live/',
    '/national-tools/waterfalls/niagara-falls-live/:path*',
    '/national-tools/niagara-falls-rainbow-planner',
    '/national-tools/niagara-falls-rainbow-planner/:path*',
    '/national-tools/grand-coulee',
    '/national-tools/grand-coulee/',
    '/national-tools/grand-coulee/:path*',
    '/national-tools/platte-crane-live',
    '/national-tools/platte-crane-live/',
    '/national-tools/platte-crane-live/:path*',
    '/national-tools/fort-madison-live',
    '/national-tools/fort-madison-live/',
    '/national-tools/fort-madison-live/:path*',
    '/api/status',
    '/api/history',
  ],
};

function requestHostname(request: Request) {
  const headerHost = request.headers.get('host');
  const host = headerHost || new URL(request.url).hostname;
  return String(host).split(':')[0].toLowerCase();
}

async function servePicturedRocksCanonical(request: Request) {
  const sourceUrl = new URL(PICTURED_ROCKS_SOURCE, request.url);

  try {
    // This source path is outside the middleware matcher, so it resolves to the
    // committed static planner without recursively invoking this middleware.
    const upstream = await fetch(sourceUrl, {
      cache: 'no-store',
      headers: {
        'x-pictured-rocks-shell': 'canonical-subdomain',
      },
    });

    if (!upstream.ok) {
      return new Response('Pictured Rocks planner is temporarily unavailable.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    let html = await upstream.text();
    const noindexPattern = /<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']\s*\/?\s*>/i;

    // The lab page must remain noindex in source. If that contract changes,
    // fail closed rather than accidentally serving an unverified indexable copy.
    if (!noindexPattern.test(html)) {
      return new Response('Pictured Rocks planner release contract is not satisfied.', {
        status: 503,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      });
    }

    html = html.replace(noindexPattern, PICTURED_ROCKS_INDEXABLE_ROBOTS);

    const headers = new Headers(upstream.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large');
    headers.set('Vary', 'Host');

    return new Response(html, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Pictured Rocks canonical shell failed', error);
    return new Response('Pictured Rocks planner is temporarily unavailable.', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  if (
    requestHostname(request) === PICTURED_ROCKS_HOST &&
    (url.pathname === '/' || url.pathname === '/index.html')
  ) {
    return servePicturedRocksCanonical(request);
  }

  if (
    url.pathname === LEGACY_NIAGARA ||
    url.pathname.startsWith(`${LEGACY_NIAGARA}/`) ||
    url.pathname === DUPLICATE_RAINBOW_PLANNER ||
    url.pathname.startsWith(`${DUPLICATE_RAINBOW_PLANNER}/`)
  ) {
    url.pathname = LIVE_RAINBOW_PREDICTOR;
    url.search = '';
    return Response.redirect(url, 308);
  }

  if (url.pathname === GRAND_COULEE_PATH) {
    url.pathname = `${GRAND_COULEE_PATH}/`;
    return Response.redirect(url, 308);
  }

  if (url.pathname === PLATTE_CRANE_PATH) {
    url.pathname = `${PLATTE_CRANE_PATH}/`;
    return Response.redirect(url, 308);
  }

  if (url.pathname === FORT_MADISON_PATH) {
    url.pathname = `${FORT_MADISON_PATH}/`;
    return Response.redirect(url, 308);
  }

  if (url.pathname === '/api/status' || url.pathname === '/api/history') {
    const upstream = new URL(`${GRAND_COULEE_PATH}${url.pathname}${url.search}`, GRAND_COULEE_UPSTREAM);
    return fetch(new Request(upstream, request));
  }

  if (url.pathname.startsWith(`${FORT_MADISON_PATH}/`)) {
    const upstreamPath = url.pathname.slice(FORT_MADISON_PATH.length) || '/';
    const upstream = new URL(`${upstreamPath}${url.search}`, FORT_MADISON_UPSTREAM);
    const upstreamRequest = new Request(upstream, request);
    const response = await fetch(upstreamRequest, { cache: 'no-store' });
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    headers.set('CDN-Cache-Control', 'no-store');
    headers.set('Vercel-CDN-Cache-Control', 'no-store');
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  if (url.pathname.startsWith(`${GRAND_COULEE_PATH}/`)) {
    const upstream = new URL(`${url.pathname}${url.search}`, GRAND_COULEE_UPSTREAM);
    return fetch(new Request(upstream, request));
  }

  if (url.pathname.startsWith(`${PLATTE_CRANE_PATH}/`)) {
    const upstream = new URL(`${url.pathname}${url.search}`, PLATTE_CRANE_UPSTREAM);
    return fetch(new Request(upstream, request));
  }
}
