import fs from 'node:fs';

const URL = 'https://chrisizworski.com/niagara-border-crossing/';
const LASTMOD = '2026-10-03';
const KEY = 'niagara-border-crossing';
const NAME = 'Niagara Border Crossing Wait Times — Which Bridge Should You Take?';
const DESC = 'Compare Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston with official directional border waits, hard vehicle eligibility, NEXUS rules, freshness and conservative diversion-aware guidance.';
const VISUAL_ASSET_VERSION = '20261003h';
const FALLBACK_ASSET_VERSION = '20261003a';
const ELIGIBILITY_ASSET_VERSION = '20261003a';
const LIVE_CAMERA_ASSET_VERSION = '20261003a';

function patchTools() {
  const file = 'public/tools/index.html';
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!html.includes(`data-featured-tool="${KEY}"`)) {
    const borderCard = html.match(/    <article class="feature-card" data-featured-tool="michigan-border-wait-times">[\s\S]*?    <\/article>\n/);
    if (!borderCard) throw new Error('Niagara discovery: Michigan border featured-card anchor not found');
    const card = `    <article class="feature-card" data-featured-tool="${KEY}">\n      <div class="feature-kicker">Live Niagara border decision</div>\n      <h3><a href="/niagara-border-crossing/" data-track-tool="${KEY}" data-placement="tools-featured">Niagara Border Crossing Decision</a></h3>\n      <p>Choose between Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston using official directional waits, traveler eligibility and a conservative detour guardrail.</p>\n      <a class="tool-cta" href="/niagara-border-crossing/" data-track-tool="${KEY}" data-placement="tools-featured">Choose a Niagara crossing <span aria-hidden="true">&rarr;</span></a>\n    </article>\n`;
    html = html.replace(borderCard[0], `${borderCard[0]}${card}`);
    changed = true;
  }

  if (!html.includes(`data-tool-key="${KEY}"`)) {
    const borderLink = '<a href="/michigan-border-wait-times/">';
    const linkIndex = html.indexOf(borderLink);
    if (linkIndex < 0) throw new Error('Niagara discovery: Michigan border catalog anchor not found');
    const cardIndex = html.lastIndexOf('  <div class="tool-card"', linkIndex);
    if (cardIndex < 0) throw new Error('Niagara discovery: border catalog card boundary not found');
    const card = `  <div class="tool-card" data-tool-key="${KEY}" data-tags="planning live-data borders travel new-york ontario buffalo niagara" data-months="1,2,3,4,5,6,7,8,9,10,11,12">\n    <div class="tk">Live data<span class="tk-season" hidden> / useful now</span></div>\n    <div class="tool-title"><a href="/niagara-border-crossing/">${NAME}</a></div>\n    <div class="tool-desc">${DESC}</div>\n  </div>\n`;
    html = html.slice(0, cardIndex) + card + html.slice(cardIndex);
    changed = true;
  }

  const schemaRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let match;
  let patched = false;
  while ((match = schemaRe.exec(html))) {
    try {
      const data = JSON.parse(match[1]);
      const graph = data?.['@graph'];
      if (!Array.isArray(graph)) continue;
      const itemList = graph.find((node) => node?.['@id'] === 'https://chrisizworski.com/tools/#toollist');
      if (!itemList || !Array.isArray(itemList.itemListElement)) continue;
      if (!itemList.itemListElement.some((entry) => entry?.item?.url === URL)) {
        itemList.itemListElement.push({
          '@type': 'ListItem',
          position: itemList.itemListElement.length + 1,
          item: {
            '@type': 'WebApplication',
            name: NAME,
            url: URL,
            description: DESC,
            applicationCategory: 'TravelApplication',
            operatingSystem: 'Any web browser',
            isAccessibleForFree: true,
            author: { '@id': 'https://chrisizworski.com/#person' },
            creator: { '@id': 'https://chrisizworski.com/#person' },
          },
        });
      }
      itemList.itemListElement.forEach((entry, index) => { entry.position = index + 1; });
      itemList.numberOfItems = itemList.itemListElement.length;
      const replacement = `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
      html = html.slice(0, match.index) + replacement + html.slice(match.index + match[0].length);
      patched = true;
      changed = true;
      break;
    } catch {
      // Keep scanning for the canonical collection graph.
    }
  }
  if (!patched) throw new Error('Niagara discovery: tools JSON-LD collection not found');

  const catalogCount = (html.match(/class="tool-card"/g) || []).length;
  html = html.replace(/search all \d+ tools by name or topic/i, `search all ${catalogCount} tools by name or topic`);
  fs.writeFileSync(file, html);
  console.log(`Niagara tools discovery ${changed ? 'applied' : 'already present'}; catalog count ${catalogCount}.`);
}

function patchSitemap() {
  const file = 'public/sitemap.xml';
  let xml = fs.readFileSync(file, 'utf8');
  const escapedUrl = URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingEntryRe = new RegExp(`<url>\\s*<loc>${escapedUrl}<\\/loc>[\\s\\S]*?<\\/url>`, 'm');
  const entry = `  <url>\n    <loc>${URL}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>`;

  if (existingEntryRe.test(xml)) {
    const existing = xml.match(existingEntryRe)?.[0] || '';
    const updated = existing.match(/<lastmod>[^<]+<\/lastmod>/)
      ? existing.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${LASTMOD}</lastmod>`)
      : existing.replace('</url>', `  <lastmod>${LASTMOD}</lastmod>\n</url>`);
    xml = xml.replace(existingEntryRe, updated);
    fs.writeFileSync(file, xml);
    console.log(`Niagara sitemap entry refreshed to ${LASTMOD}.`);
    return;
  }

  if (!xml.includes('</urlset>')) throw new Error('Niagara discovery: sitemap.xml missing </urlset>');
  xml = xml.replace('</urlset>', `${entry}\n</urlset>`);
  fs.writeFileSync(file, xml);
  console.log(`Niagara sitemap entry added with lastmod ${LASTMOD}.`);
}

function patchLlms() {
  const file = 'public/llms.txt';
  let text = fs.readFileSync(file, 'utf8');
  if (!text.includes(URL)) {
    text = `${text.trimEnd()}\n- Niagara border crossing decision: ${URL}\n`;
    fs.writeFileSync(file, text);
    console.log('Niagara llms.txt entry added.');
  } else {
    console.log('Niagara llms.txt entry already present.');
  }
}

function patchLiveCameras() {
  const file = 'public/niagara-border-crossing/index.html';
  let html = fs.readFileSync(file, 'utf8');
  const css = `/assets/niagara-live-cameras.20261003.css?v=${LIVE_CAMERA_ASSET_VERSION}`;
  const js = `/assets/niagara-live-cameras.20261003.js?v=${LIVE_CAMERA_ASSET_VERSION}`;
  const cssTag = `<link rel="stylesheet" href="${css}">`;
  const jsTag = `<script defer src="${js}"></script>`;
  const cssPattern = /<link rel="stylesheet" href="\/assets\/niagara-live-cameras\.20261003\.css(?:\?v=[^"]+)?">/;
  const jsPattern = /<script defer src="\/assets\/niagara-live-cameras\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;
  const visualCss = /<link rel="stylesheet" href="\/assets\/niagara-visual-layer\.20261003\.css(?:\?v=[^"]+)?">/;
  const visualJs = /<script defer src="\/assets\/niagara-visual-layer\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;

  if (cssPattern.test(html)) html = html.replace(cssPattern, cssTag);
  else if (visualCss.test(html)) html = html.replace(visualCss, (match) => `${cssTag}\n${match}`);
  else throw new Error('Niagara live cameras: visual CSS anchor not found');

  if (jsPattern.test(html)) html = html.replace(jsPattern, jsTag);
  else if (visualJs.test(html)) html = html.replace(visualJs, (match) => `${jsTag}\n${match}`);
  else throw new Error('Niagara live cameras: visual JS anchor not found');

  fs.writeFileSync(file, html);
  console.log(`Niagara live cameras loaded at ${LIVE_CAMERA_ASSET_VERSION}.`);
}

function patchVisualAssets() {
  const file = 'public/niagara-border-crossing/index.html';
  let html = fs.readFileSync(file, 'utf8');
  const cssPattern = /\/assets\/niagara-visual-layer\.20261003\.css(?:\?v=[^"']+)?/g;
  const jsPattern = /\/assets\/niagara-visual-layer\.20261003\.js(?:\?v=[^"']+)?/g;
  const cssUrl = `/assets/niagara-visual-layer.20261003.css?v=${VISUAL_ASSET_VERSION}`;
  const jsUrl = `/assets/niagara-visual-layer.20261003.js?v=${VISUAL_ASSET_VERSION}`;
  if (!cssPattern.test(html) || !jsPattern.test(html)) {
    throw new Error('Niagara visual cache bust: expected visual asset references not found');
  }
  html = html.replace(cssPattern, cssUrl).replace(jsPattern, jsUrl);
  html = html.replace(/data-ui-revision="[^"]+"/, `data-ui-revision="${VISUAL_ASSET_VERSION}` + '-livecams');
  fs.writeFileSync(file, html);
  console.log(`Niagara visual assets cache-busted to ${VISUAL_ASSET_VERSION}.`);
}

function patchDecisionFallback() {
  const file = 'public/niagara-border-crossing/index.html';
  let html = fs.readFileSync(file, 'utf8');
  const asset = `/assets/niagara-decision-fallback.20261003.js?v=${FALLBACK_ASSET_VERSION}`;
  const assetPattern = /<script defer src="\/assets\/niagara-decision-fallback\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;
  const anchor = /<script defer src="\/assets\/niagara-visual-layer\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;
  if (assetPattern.test(html)) {
    html = html.replace(assetPattern, `<script defer src="${asset}"></script>`);
  } else if (anchor.test(html)) {
    html = html.replace(anchor, (match) => `${match}\n<script defer src="${asset}"></script>`);
  } else {
    throw new Error('Niagara decision fallback: visual-layer script anchor not found');
  }
  fs.writeFileSync(file, html);
  console.log(`Niagara decision fallback loaded at ${FALLBACK_ASSET_VERSION}.`);
}

function patchEligibilityLabels() {
  const file = 'public/niagara-border-crossing/index.html';
  let html = fs.readFileSync(file, 'utf8');
  const asset = `/assets/niagara-eligibility-labels.20261003.js?v=${ELIGIBILITY_ASSET_VERSION}`;
  const assetPattern = /<script defer src="\/assets\/niagara-eligibility-labels\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;
  const fallbackAnchor = /<script defer src="\/assets\/niagara-decision-fallback\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;
  const visualAnchor = /<script defer src="\/assets\/niagara-visual-layer\.20261003\.js(?:\?v=[^"]+)?"><\/script>/;

  if (assetPattern.test(html)) {
    html = html.replace(assetPattern, `<script defer src="${asset}"></script>`);
  } else if (fallbackAnchor.test(html)) {
    html = html.replace(fallbackAnchor, (match) => `${match}\n<script defer src="${asset}"></script>`);
  } else if (visualAnchor.test(html)) {
    html = html.replace(visualAnchor, (match) => `${match}\n<script defer src="${asset}"></script>`);
  } else {
    throw new Error('Niagara eligibility labels: script anchor not found');
  }

  fs.writeFileSync(file, html);
  console.log(`Niagara eligibility labels loaded at ${ELIGIBILITY_ASSET_VERSION}.`);
}

patchTools();
patchSitemap();
patchLlms();
patchLiveCameras();
patchVisualAssets();
patchDecisionFallback();
patchEligibilityLabels();
