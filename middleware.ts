const RAINBOW_PLANNER = '/national-tools/niagara-falls-rainbow-planner/';

export const config = {
  matcher: [
    '/national-tools/waterfalls/niagara-falls-live',
    '/national-tools/waterfalls/niagara-falls-live/',
    '/national-tools/waterfalls/niagara-falls-live/:path*',
  ],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  url.pathname = RAINBOW_PLANNER;
  url.search = '';
  return Response.redirect(url, 308);
}
