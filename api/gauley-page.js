'use strict';

const fs = require('fs');
const path = require('path');

const canonical = 'https://chrisizworski.com/national-tools/gauley-release-live/';
const gaId = 'G-Y5D2V2W7HN';
let cachedHtml = null;

function stripImports(source) {
  return source.replace(/^import[^;]+;\s*$/gm, '');
}

function stripExports(source) {
  return source.replace(/\bexport\s+(?=(?:const|let|var|function|class)\b)/g, '');
}

function buildPage() {
  const pkgPath = require.resolve('gauley-release-live/package.json');
  const root = path.dirname(pkgPath);
  const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

  const geometry = stripExports(read('lib/geometry.js'));
  const css = read('styles.css');
  const app = stripImports(read('app.js'))
    .replaceAll("getJSON('/api/live')", "getJSON('/api/gauley-live')")
    .replaceAll("getJSON('./api/live')", "getJSON('/api/gauley-live')")
    .replaceAll("getJSON('/api/history')", "getJSON('/api/gauley-history')")
    .replaceAll("getJSON('./api/history')", "getJSON('/api/gauley-history')");

  let html = read('index.html')
    .replace('<link rel="stylesheet" href="/styles.css" />', `<style>${css}</style>`)
    .replace('<script type="module" src="/app.js"></script>', `<script type="module">${geometry}\n${app}</script>`)
    .replace(
      '<meta property="og:type" content="website" />',
      `<meta property="og:type" content="website" />\n  <meta property="og:url" content="${canonical}" />\n  <link rel="canonical" href="${canonical}" />`
    );

  if (!html.includes(gaId)) {
    const ga = `<!-- Google tag (gtag.js) -->\n<script async src="https://www.googletagmanager.com/gtag/js?id=${gaId}"></script>\n<script>\nwindow.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');\n</script>`;
    html = html.replace('</head>', `${ga}\n</head>`);
  }

  if (!html.includes(canonical)) throw new Error('Gauley page canonical injection failed');
  if (!html.includes(gaId)) throw new Error('Gauley page analytics injection failed');
  if (!html.includes("getJSON('/api/gauley-live')")) throw new Error('Gauley live API remap failed');
  if (!html.includes("getJSON('/api/gauley-history')")) throw new Error('Gauley history API remap failed');
  return html;
}

module.exports = function handler(req, res) {
  try {
    cachedHtml ||= buildPage();
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
    return res.status(200).send(cachedHtml);
  } catch (error) {
    console.error('Gauley page render failed', error);
    return res.status(500).send('Gauley Release Live is temporarily unavailable.');
  }
};
