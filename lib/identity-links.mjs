// Site-shell identity migration only: preserve link labels, queries, fragments,
// external About pages and every other byte of product content.
export function consolidateIdentityLinks(html) {
  return html.replace(/<!--[\s\S]*?-->|<(script|style|textarea|template)\b[^>]*>[\s\S]*?<\/\1\s*>|(<a\b[^>]*?\bhref\s*=\s*)(["'])([^"']*)\3/gi, (tag, protectedTag, prefix, quote, href) => {
    if (!prefix || !/^(?:\/|https:\/\/)/.test(href)) return tag;
    let url;
    try { url = new URL(href, 'https://chrisizworski.com/'); } catch { return tag; }
    if (url.origin !== 'https://chrisizworski.com' || !/^\/about(?:\/|\/index\.html|\.html)?$/.test(url.pathname)) return tag;
    const destination = '/chris-izworski/' + url.search + url.hash;
    return prefix + quote + destination + quote;
  });
}
