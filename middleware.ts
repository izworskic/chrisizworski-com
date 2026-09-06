const NIAGARA_PREFIX = '/national-tools/waterfalls/niagara-falls-live';

export const config = {
  matcher: [
    `${NIAGARA_PREFIX}/border/`,
    `${NIAGARA_PREFIX}/water-flow/`,
    `${NIAGARA_PREFIX}/maid/`,
    `${NIAGARA_PREFIX}/best-time/`,
    `${NIAGARA_PREFIX}/visibility/`,
    `${NIAGARA_PREFIX}/tonight/`,
    `${NIAGARA_PREFIX}/cameras/`,
    `${NIAGARA_PREFIX}/map/`,
    `${NIAGARA_PREFIX}/rainbow/`,
    `${NIAGARA_PREFIX}/river/`,
    `${NIAGARA_PREFIX}/maid-of-the-mist/`,
  ],
};

export default function middleware(request: Request) {
  const url = new URL(request.url);
  if (url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1);
  }

  return Response.redirect(url, 308);
}
