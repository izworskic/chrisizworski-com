const LEGACY_NIAGARA = '/national-tools/waterfalls/niagara-falls-live';
const RAINBOW_PLANNER = '/national-tools/niagara-falls-rainbow-planner/';
const RAINBOW_ORIGIN = 'https://aqua-sharp-digits.replit.app';

export const config = {
  matcher: [
    '/national-tools/waterfalls/niagara-falls-live',
    '/national-tools/waterfalls/niagara-falls-live/',
    '/national-tools/waterfalls/niagara-falls-live/:path*',
    '/national-tools/niagara-falls-rainbow-planner',
    '/national-tools/niagara-falls-rainbow-planner/:path*',
  ],
};

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  if (url.pathname === RAINBOW_PLANNER.slice(0, -1)) {
    url.pathname = RAINBOW_PLANNER;
    return Response.redirect(url, 308);
  }

  if (url.pathname === LEGACY_NIAGARA || url.pathname.startsWith(`${LEGACY_NIAGARA}/`)) {
    url.pathname = RAINBOW_PLANNER;
    url.search = '';
    return Response.redirect(url, 308);
  }

  if (url.pathname.startsWith(RAINBOW_PLANNER)) {
    const upstream = new URL(url.pathname + url.search, RAINBOW_ORIGIN);
    const headers = new Headers(request.headers);
    headers.delete('host');
    return fetch(upstream, {
      method: request.method,
      headers,
      redirect: 'manual',
    });
  }
}
