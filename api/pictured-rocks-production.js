'use strict';

const fs = require('node:fs');
const path = require('node:path');

const TARGET_HOST = 'picturedrocks.chrisizworski.com';
const SOURCE = path.join(process.cwd(), 'public', 'labs', 'pictured-rocks-planner', 'index.html');

function requestHost(req) {
  const forwarded = req.headers && req.headers['x-forwarded-host'];
  const raw = Array.isArray(forwarded) ? forwarded[0] : (forwarded || (req.headers && req.headers.host) || '');
  return String(raw).split(',')[0].trim().split(':')[0].toLowerCase();
}

function productionHtml() {
  let html = fs.readFileSync(SOURCE, 'utf8');
  html = html.replace(
    /<meta\s+name=["']robots["']\s+content=["']noindex,nofollow["']\s*\/?\s*>/i,
    '<meta name="robots" content="index,follow,max-image-preview:large">'
  );
  if (!/name=["']robots["']/i.test(html)) {
    html = html.replace('</head>', '<meta name="robots" content="index,follow,max-image-preview:large">\n</head>');
  }
  html = html.replaceAll('href="/"', 'href="https://chrisizworski.com/"');
  html = html.replaceAll('href="/tools/"', 'href="https://chrisizworski.com/tools/"');
  html = html.replaceAll('href="/great-lakes/"', 'href="https://chrisizworski.com/great-lakes/"');
  return html;
}

module.exports = function handler(req, res) {
  const host = requestHost(req);
  let html;
  try {
    html = productionHtml();
  } catch (error) {
    console.error('pictured-rocks-production read failed', error);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.end('Pictured Rocks planner is temporarily unavailable.');
    return;
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  res.setHeader('Vary', 'Host');
  if (host !== TARGET_HOST) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  }
  res.end(html);
};

module.exports._test = { requestHost, productionHtml, TARGET_HOST, SOURCE };
