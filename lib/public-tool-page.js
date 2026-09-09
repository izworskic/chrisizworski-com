'use strict';

// Public HTML composition only. The owner remains responsible for tool content.
// Never forward upstream cookies or preview-host robots headers.
module.exports = function publicToolPage(source, transformHtml) {
  return async function handler(req, res) {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.setHeader('Allow', 'GET, HEAD');
      return res.status(405).send('GET or HEAD only');
    }
    try {
      const upstream = await fetch(source, { signal: AbortSignal.timeout(8000) });
      if (!upstream.ok) throw new Error(`Owner returned ${upstream.status}`);
      let html = await upstream.text();
      if (!/text\/html/i.test(upstream.headers.get('content-type') || '') || !/<\/head>/i.test(html)) {
        throw new Error('Owner did not return an HTML document');
      }
      if (typeof transformHtml === 'function') html = transformHtml(html);
      // Rendering-layer coverage also protects independently deployed owners.
      const tags = [];
      if (!html.includes('G-Y5D2V2W7HN')) tags.push(`<script async src="https://www.googletagmanager.com/gtag/js?id=G-Y5D2V2W7HN"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-Y5D2V2W7HN');</script>`);
      if (!/<script\b[^>]*src=["'][^"']*pagead\/js\/adsbygoogle\.js\b/i.test(html)) tags.push(`<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8222782620788075" crossorigin="anonymous"></script>`);
      if (tags.length) html = html.replace(/<\/head>/i, tags.join('\n') + '\n</head>');
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
      return res.status(200).send(req.method === 'HEAD' ? '' : html);
    } catch {
      res.setHeader('Cache-Control', 'no-store');
      return res.status(502).send('This tool is temporarily unavailable. Please try again shortly.');
    }
  };
};
