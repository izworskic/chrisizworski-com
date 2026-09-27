const PICTURED_ROCKS_HOST = 'picturedrocks.chrisizworski.com';
const PICTURED_ROCKS_SOURCE = 'https://chrisizworski.com/labs/pictured-rocks-planner/index.html';

export default async function middleware(request) {
  const url = new URL(request.url);

  if (url.hostname !== PICTURED_ROCKS_HOST || url.pathname !== '/') {
    return;
  }

  const upstream = await fetch(PICTURED_ROCKS_SOURCE, {
    headers: {
      'user-agent': 'chrisizworski.com Pictured Rocks subdomain router'
    }
  });

  if (!upstream.ok) {
    return new Response('Pictured Rocks planner is temporarily unavailable.', {
      status: 503,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'no-store',
        'x-robots-tag': 'noindex, nofollow'
      }
    });
  }

  let html = await upstream.text();

  html = html.replace(
    '<meta name="robots" content="noindex,nofollow">',
    '<meta name="robots" content="index,follow,max-image-preview:large">'
  );

  html = html.replace(
    '<header class="sitebar"><a href="/">Chris Izworski</a><nav aria-label="Site"><a href="/tools/">Tools</a><a href="/great-lakes/">Great Lakes</a></nav></header>',
    '<header class="sitebar"><a href="https://chrisizworski.com/">Chris Izworski</a><nav aria-label="Site"><a href="https://chrisizworski.com/tools/">Tools</a><a href="https://chrisizworski.com/great-lakes/">Great Lakes</a></nav></header>'
  );

  const headers = new Headers(upstream.headers);
  headers.set('content-type', 'text/html; charset=utf-8');
  headers.set('cache-control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=900');
  headers.set('x-robots-tag', 'index, follow, max-image-preview:large');
  headers.delete('content-length');

  return new Response(html, {
    status: 200,
    headers
  });
}
