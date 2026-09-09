const LEGACY_NIAGARA = '/national-tools/waterfalls/niagara-falls-live';
const DUPLICATE_RAINBOW_PLANNER = '/national-tools/niagara-falls-rainbow-planner';
const LIVE_RAINBOW_PREDICTOR = '/national-tools/niagara-rainbow/';
const GRAND_COULEE_PATH = '/national-tools/grand-coulee';
const GRAND_COULEE_UPSTREAM = 'https://grand-coulee-live.vercel.app';

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

  if (url.pathname === '/api/status' || url.pathname === '/api/history') {
    const upstream = new URL(`${GRAND_COULEE_PATH}${url.pathname}${url.search}`, GRAND_COULEE_UPSTREAM);
    return fetch(new Request(upstream, request));
  }

  if (url.pathname.startsWith(`${GRAND_COULEE_PATH}/`)) {
    const upstream = new URL(`${url.pathname}${url.search}`, GRAND_COULEE_UPSTREAM);
    return fetch(new Request(upstream, request));
  }
}
