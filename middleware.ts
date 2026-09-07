const LEGACY_NIAGARA = '/national-tools/waterfalls/niagara-falls-live';
const DUPLICATE_RAINBOW_PLANNER = '/national-tools/niagara-falls-rainbow-planner';
const LIVE_RAINBOW_PREDICTOR = '/national-tools/niagara-rainbow/';

export const config = {
  matcher: [
    '/national-tools/waterfalls/niagara-falls-live',
    '/national-tools/waterfalls/niagara-falls-live/',
    '/national-tools/waterfalls/niagara-falls-live/:path*',
    '/national-tools/niagara-falls-rainbow-planner',
    '/national-tools/niagara-falls-rainbow-planner/:path*',
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
}
