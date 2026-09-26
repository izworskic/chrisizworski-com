const PICTURED_ROCKS_HOST = 'picturedrocks.chrisizworski.com';
const PICTURED_ROCKS_SOURCE = '/labs/pictured-rocks-planner/';
const INDEXABLE_ROBOTS = '<meta name="robots" content="index,follow,max-image-preview:large">';

// Only the site root needs host-aware treatment. Assets and the live API remain
// ordinary routes on the same deployment, and the /labs preview keeps its own
// noindex contract when visited on chrisizworski.com.
export const config = {
  matcher: ['/', '/index.html'],
};

function requestHostname(request) {
  const headerHost = request.headers.get('host');
  const host = headerHost || new URL(request.url).hostname;
  return String(host).split(':')[0].toLowerCase();
}

export default async function middleware(request) {
  if (requestHostname(request) !== PICTURED_ROCKS_HOST) return;

  const sourceUrl = new URL(PICTURED_ROCKS_SOURCE, request.url);

  try {
    // The source path does not match this middleware, so this internal request
    // resolves to the committed static planner without recursing through here.
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

    html = html.replace(noindexPattern, INDEXABLE_ROBOTS);

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
