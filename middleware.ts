const LEGACY_NIAGARA = '/national-tools/waterfalls/niagara-falls-live';
const DUPLICATE_RAINBOW_PLANNER = '/national-tools/niagara-falls-rainbow-planner';
const LIVE_RAINBOW_PREDICTOR = '/national-tools/niagara-rainbow/';
const GRAND_COULEE_PATH = '/national-tools/grand-coulee';
const GRAND_COULEE_UPSTREAM = 'https://grand-coulee-live.vercel.app';
const PLATTE_CRANE_PATH = '/national-tools/platte-crane-live';
const PLATTE_CRANE_UPSTREAM = 'https://platte-crane-migration-nebraska.vercel.app';
const FORT_MADISON_PATH = '/national-tools/fort-madison-live';
const FORT_MADISON_UPSTREAM = 'https://fort-madison-live.vercel.app';

export const config = {
  matcher: [
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

export default function middleware(request: Request) {
  const url = new URL(request.url);

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
    return fetch(new Request(upstream, request));
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
