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
const PICTURED_ROCKS_TITLE = 'Pictured Rocks Trip Planner: Map, Weather & 1-Day Itinerary';
const PICTURED_ROCKS_DESCRIPTION = 'Plan Pictured Rocks National Lakeshore with a live map, current weather and access, boat vs. hike choices, and realistic 1-day or 2-day itineraries.';
const PICTURED_ROCKS_H1 = 'Pictured Rocks National Lakeshore Trip Planner';
const PICTURED_ROCKS_SOCIAL_IMAGE = 'https://www.nps.gov/common/uploads/structured_data/683601AF-F157-7262-38F31A30A2EA6224.jpg?maxHeight=800&maxWidth=1200&quality=90';
const PICTURED_ROCKS_SEARCH_SCHEMA = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebPage","@id":"https://picturedrocks.chrisizworski.com/#webpage","url":"https://picturedrocks.chrisizworski.com/","name":"${PICTURED_ROCKS_TITLE}","description":"${PICTURED_ROCKS_DESCRIPTION}","inLanguage":"en-US","dateModified":"2026-09-28","isPartOf":{"@type":"WebSite","@id":"https://chrisizworski.com/#website","url":"https://chrisizworski.com/","name":"Chris Izworski"},"about":{"@id":"https://picturedrocks.chrisizworski.com/#destination"},"primaryImageOfPage":{"@type":"ImageObject","url":"${PICTURED_ROCKS_SOCIAL_IMAGE}"}},{"@type":"TouristDestination","@id":"https://picturedrocks.chrisizworski.com/#destination","name":"Pictured Rocks National Lakeshore","description":"National lakeshore on Lake Superior near Munising and Grand Marais, Michigan, known for sandstone cliffs, beaches, waterfalls, dunes, hiking, boat cruises and guided kayaking.","url":"https://www.nps.gov/piro/","sameAs":"https://www.nps.gov/piro/","address":{"@type":"PostalAddress","addressRegion":"MI","addressCountry":"US"}},{"@type":"BreadcrumbList","@id":"https://picturedrocks.chrisizworski.com/#breadcrumb","itemListElement":[{"@type":"ListItem","position":1,"name":"Chris Izworski","item":"https://chrisizworski.com/"},{"@type":"ListItem","position":2,"name":"Pictured Rocks Trip Planner","item":"https://picturedrocks.chrisizworski.com/"}]},{"@type":"ItemList","@id":"https://picturedrocks.chrisizworski.com/#trip-modes","name":"Ways to experience Pictured Rocks","itemListElement":[{"@type":"ListItem","position":1,"name":"Boat cruise"},{"@type":"ListItem","position":2,"name":"Guided kayak"},{"@type":"ListItem","position":3,"name":"Chapel Loop hike"},{"@type":"ListItem","position":4,"name":"Drive and short walks"}]}]}</script>`;
const PICTURED_ROCKS_HEAD_META = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="author" content="Chris Izworski">
<meta name="application-name" content="Pictured Rocks Trip Planner">
<meta property="og:type" content="website">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="Chris Izworski">
<meta property="og:title" content="${PICTURED_ROCKS_TITLE}">
<meta property="og:description" content="${PICTURED_ROCKS_DESCRIPTION}">
<meta property="og:url" content="https://picturedrocks.chrisizworski.com/">
<meta property="og:image" content="${PICTURED_ROCKS_SOCIAL_IMAGE}">
<meta property="og:image:alt" content="Colored sandstone cliffs rising from Lake Superior at Pictured Rocks National Lakeshore">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${PICTURED_ROCKS_TITLE}">
<meta name="twitter:description" content="${PICTURED_ROCKS_DESCRIPTION}">
<meta name="twitter:image" content="${PICTURED_ROCKS_SOCIAL_IMAGE}">
<meta name="twitter:image:alt" content="Colored sandstone cliffs rising from Lake Superior at Pictured Rocks National Lakeshore">
${PICTURED_ROCKS_SEARCH_SCHEMA}
<style data-pictured-rocks-ssr>.trip-shapes .trip-thumb{height:118px;overflow:hidden;background:#dce8e7}.trip-shapes .trip-thumb img{width:100%;height:100%;object-fit:cover;display:block}</style>`;
const NETWORK_ADS_TAG = '<script defer src="https://chrisizworski.com/assets/network-ads-v1.js"></script>';

const PICTURED_ROCKS_TRIP_THUMBNAILS = [
  {
    marker: '<article class="trip-card"><div class="trip-icon">Water</div><h3>Boat cruise</h3>',
    image: PICTURED_ROCKS_SOCIAL_IMAGE,
    alt: 'Colored Pictured Rocks cliff wall viewed from Lake Superior',
  },
  {
    marker: '<article class="trip-card"><div class="trip-icon">Water</div><h3>Guided kayak</h3>',
    image: PICTURED_ROCKS_SOCIAL_IMAGE,
    alt: 'Pictured Rocks sandstone cliffs along Lake Superior',
  },
  {
    marker: '<article class="trip-card"><div class="trip-icon">Trail</div><h3>Chapel hike</h3>',
    image: 'https://www.nps.gov/common/uploads/cropped_image/primary/2249F255-F3BC-3045-85A6A29CC359ECF5.jpg?mode=crop&quality=90&width=1600',
    alt: 'Chapel Rock at Pictured Rocks National Lakeshore',
  },
  {
    marker: '<article class="trip-card"><div class="trip-icon">Road</div><h3>Drive + short walks</h3>',
    image: 'https://www.nps.gov/common/uploads/structured_data/6714EE96-A13B-894C-6B03888F3D6641DD.jpg?maxHeight=800&maxWidth=1200&quality=90',
    alt: 'Miners Castle above Lake Superior at Pictured Rocks National Lakeshore',
  },
];

function addPicturedRocksTripThumbnails(html: string) {
  for (const item of PICTURED_ROCKS_TRIP_THUMBNAILS) {
    if (!html.includes(item.marker)) continue;
    const thumb = `<div class="trip-thumb"><img src="${item.image}" alt="${item.alt}" loading="lazy" decoding="async"></div>`;
    html = html.replace(item.marker, item.marker.replace('><div class="trip-icon">', `>${thumb}<div class="trip-icon">`));
  }
  return html;
}

function optimizePicturedRocksSearchSurface(html: string) {
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${PICTURED_ROCKS_TITLE}</title>`);
  html = html.replace(
    /<meta\s+name=["']description["']\s+content=["'][^"']*["']\s*\/?\s*>/i,
    `<meta name="description" content="${PICTURED_ROCKS_DESCRIPTION}">`,
  );
  html = html.replace(/<h1>[\s\S]*?<\/h1>/i, `<h1>${PICTURED_ROCKS_H1}</h1>`);
  return html;
}

// HTML documents only: never alter Next flight responses, APIs, assets or errors.
async function withNetworkAds(response: Response, request: Request) {
  if (request.method !== 'GET' || !response.ok ||
      !/text\/html/i.test(response.headers.get('content-type') || '')) return response;
  const original = await response.text();
  const html = original.includes('/assets/network-ads-v1.js') ? original :
    original.replace(/<\/head>/i, NETWORK_ADS_TAG + '\n</head>');
  const headers = new Headers(response.headers);
  // These describe the upstream bytes, not the composed document.
  for (const name of ['content-length', 'content-encoding', 'etag']) headers.delete(name);
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

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
    html = optimizePicturedRocksSearchSurface(html);
    html = addPicturedRocksTripThumbnails(html);
    html = html.replace(/<\/head>/i, PICTURED_ROCKS_HEAD_META + '\n' + NETWORK_ADS_TAG + '\n</head>');

    const headers = new Headers(upstream.headers);
    headers.set('Content-Type', 'text/html; charset=utf-8');
    headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=900');
    headers.set('X-Robots-Tag', 'index, follow, max-image-preview:large');
    headers.set('Vary', 'Host');
    for (const name of ['content-length', 'content-encoding', 'etag']) headers.delete(name);

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
    return withNetworkAds(new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    }), request);
  }

  if (url.pathname.startsWith(`${GRAND_COULEE_PATH}/`)) {
    const upstream = new URL(`${url.pathname}${url.search}`, GRAND_COULEE_UPSTREAM);
    return fetch(new Request(upstream, request));
  }

  if (url.pathname.startsWith(`${PLATTE_CRANE_PATH}/`)) {
    const upstream = new URL(`${url.pathname}${url.search}`, PLATTE_CRANE_UPSTREAM);
    return withNetworkAds(await fetch(new Request(upstream, request)), request);
  }
}
