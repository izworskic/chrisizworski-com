export const config = {
  matcher: [
    '/national-tools/waterfalls/niagara-falls-live/border/',
    '/national-tools/waterfalls/niagara-falls-live/water-flow/',
    '/national-tools/waterfalls/niagara-falls-live/maid/',
    '/national-tools/waterfalls/niagara-falls-live/best-time/',
    '/national-tools/waterfalls/niagara-falls-live/visibility/',
    '/national-tools/waterfalls/niagara-falls-live/tonight/',
    '/national-tools/waterfalls/niagara-falls-live/cameras/',
    '/national-tools/waterfalls/niagara-falls-live/map/',
    '/national-tools/waterfalls/niagara-falls-live/rainbow/',
    '/national-tools/waterfalls/niagara-falls-live/river/',
    '/national-tools/waterfalls/niagara-falls-live/maid-of-the-mist/',
  ],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  url.pathname = url.pathname.slice(0, -1);
  return Response.redirect(url, 308);
}
