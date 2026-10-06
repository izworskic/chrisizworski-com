import fs from 'node:fs';

const URL = 'https://chrisizworski.com/niagara-border-crossing/';
const LASTMOD = '2026-10-06';
const KEY = 'niagara-border-crossing';
const NAME = 'Niagara Border Wait Times Live — Peace, Rainbow & Lewiston';
const DESC = 'Compare live Niagara border waits for Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston with traveler eligibility, cameras and conservative bridge-switch guidance.';
const VISUAL_ASSET_VERSION = '20261003h';
const FALLBACK_ASSET_VERSION = '20261003a';
const ELIGIBILITY_ASSET_VERSION = '20261003a';
const LIVE_CAMERA_ASSET_VERSION = '20261003b';
const SEARCH_GROWTH_ASSET_VERSION = '20261003a';
const SEARCH_ROUTES = [
  { url: 'https://chrisizworski.com/peace-bridge-wait-times/', label: 'Peace Bridge wait times' },
  { url: 'https://chrisizworski.com/rainbow-bridge-wait-times/', label: 'Rainbow Bridge wait times' },
  { url: 'https://chrisizworski.com/lewiston-queenston-bridge-wait-times/', label: 'Lewiston–Queenston Bridge wait times' },
  { url: 'https://chrisizworski.com/whirlpool-rapids-bridge-crossing/', label: 'Whirlpool Rapids Bridge crossing' },
];

function patchTools() {
  const file = 'public/tools/index.html';
  let html = fs.readFileSync(file, 'utf8');
  let changed = false;

  if (!html.includes(`data-featured-tool="${KEY}"`)) {
    const borderCard = html.match(/    <article class="feature-card" data-featured-tool="michigan-border-wait-times">[\s\S]*?    <\/article>\n/);
    if (!borderCard) throw new Error('Niagara discovery: Michigan border featured-card anchor not found');
    const card = `    <article class="feature-card" data-featured-tool="${KEY}">\n      <div class="feature-kicker">Live Niagara border decision</div>\n      <h3><a href="/niagara-border-crossing/" data-track-tool="${KEY}" data-placement="tools-featured">Niagara Border Wait Times Live</a></h3>\n      <p>Compare Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston using official directional waits, traveler eligibility and a conservative detour guardrail.</p>\n      <a class="tool-cta" href="/niagara-border-crossing/" data-track-tool="${KEY}" data-placement="tools-featured">Check Niagara waits <span aria-hidden="true">&rarr;</span></a>\n    </article>\n`;
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

function upsertSitemapEntry(xml, url, priority, preserveLastmod = false) {
  const escapedUrl = url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existingEntryRe = new RegExp(`<url>\\s*<loc>${escapedUrl}<\\/loc>[\\s\\S]*?<\\/url>`, 'm');
  const entry = `  <url>\n    <loc>${url}</loc>\n    <lastmod>${LASTMOD}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
  if (existingEntryRe.test(xml)) {
    const existing = xml.match(existingEntryRe)?.[0] || '';
    const currentLastmod = existing.match(/<lastmod>([^<]+)<\\/lastmod>/)?.[1];
    const nextLastmod = preserveLastmod && currentLastmod ? currentLastmod : LASTMOD;
    const updated = currentLastmod
      ? existing.replace(/<lastmod>[^<]+<\\/lastmod>/, `<lastmod>${nextLastmod}</lastmod>`)
      : existing.replace('</url>', `  <lastmod>${nextLastmod}</lastmod>\n</url>`);
    return xml.replace(existingEntryRe, updated);
  }
  if (!xml.includes('</urlset>')) throw new Error('Niagara discovery: sitemap.xml missing </urlset>');
  return xml.replace('</urlset>', `${entry}\n</urlset>`);
}

function patchSitemap() {
  const file = 'public/sitemap.xml';
  let xml = fs.readFileSync(file, 'utf8');
  xml = upsertSitemapEntry(xml, URL, '0.9');
  for (const route of SEARCH_ROUTES) xml = upsertSitemapEntry(xml, route.url, '0.8', true);
  fs.writeFileSync(file, xml);
  console.log(`Niagara sitemap refreshed with flagship plus ${SEARCH_ROUTES.length} bridge-intent pages.`);
}

function patchLlms() {
  const file = 'public/llms.txt';
  let text = fs.readFileSync(file, 'utf8').trimEnd();
  const lines = [
    ['Niagara border wait times and bridge decision', URL],
    ...SEARCH_ROUTES.map((route) => [route.label, route.url]),
  ];
  for (const [label, url] of lines) {
    if (!text.includes(url)) text += `\n- ${label}: ${url}`;
  }
  fs.writeFileSync(file, `${text}\n`);
  console.log('Niagara llms.txt search cluster refreshed.');
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
  html = html.replace(/data-ui-revision="[^"]+"/, `data-ui-revision="${VISUAL_ASSET_VERSION}-livecams-search"`);
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

function patchSearchGrowth() {
  const file = 'public/niagara-border-crossing/index.html';
  let html = fs.readFileSync(file, 'utf8');
  const title = 'Niagara Border Wait Times Live | Peace, Rainbow &amp; Lewiston';
  const description = 'Live Niagara border wait times for Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston. Compare both directions, cameras, rules and the right bridge.';
  const ogDescription = 'Live Peace, Rainbow, Whirlpool Rapids and Lewiston–Queenston waits with cameras, rules and a traveler-first bridge decision.';

  html = html.replace(/<title>[^<]+<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]+">/, `<meta name="description" content="${description}">`);
  html = html.replace(/<meta property="og:title" content="[^"]+">/, '<meta property="og:title" content="Niagara Border Wait Times Live">');
  html = html.replace(/<meta property="og:description" content="[^"]+">/, `<meta property="og:description" content="${ogDescription}">`);
  html = html.replace(/<meta name="twitter:title" content="[^"]+">/, '<meta name="twitter:title" content="Niagara Border Wait Times Live">');
  html = html.replace(/<meta name="twitter:description" content="[^"]+">/, `<meta name="twitter:description" content="${ogDescription}">`);

  if (!html.includes('niagara-search-growth.20261003.css')) {
    const anchor = /<link rel="stylesheet" href="\/assets\/niagara-persona-polish\.20261003\.css(?:\?v=[^"]+)?">/;
    if (!anchor.test(html)) throw new Error('Niagara search growth: persona CSS anchor not found');
    html = html.replace(anchor, (match) => `<link rel="stylesheet" href="/assets/niagara-search-growth.20261003.css?v=${SEARCH_GROWTH_ASSET_VERSION}">\n${match}`);
  }

  html = html.replace(
    '<h1>Which Niagara bridge should you take right now?</h1>',
    '<h1>Niagara Border Wait Times Live</h1>\n      <p class="hero-question">Which Niagara bridge should you take right now?</p>',
  );
  html = html.replace(
    'Cross Niagara without guessing. See which bridge fits your trip, what traffic is doing there, and what you will encounter from the approach road to the other side.',
    'Compare the current official border waits first, then see which Niagara bridge actually fits your route, traveler type and crossing rules.',
  );

  if (!html.includes('data-niagara-search-intents')) {
    const intents = `  <nav class="niagara-search-intents" data-niagara-search-intents aria-label="Niagara bridge wait pages">\n    <a href="/peace-bridge-wait-times/"><strong>Peace Bridge wait times</strong><span>Buffalo ↔ Fort Erie · passenger, NEXUS & trucks</span></a>\n    <a href="/rainbow-bridge-wait-times/"><strong>Rainbow Bridge wait times</strong><span>Niagara Falls · passenger, walking & bicycles</span></a>\n    <a href="/lewiston-queenston-bridge-wait-times/"><strong>Lewiston–Queenston wait times</strong><span>I-190 ↔ Highway 405 · passenger & trucks</span></a>\n    <a href="/whirlpool-rapids-bridge-crossing/"><strong>Whirlpool Rapids rules & wait</strong><span>NEXUS-only · limited hours</span></a>\n  </nav>`;
    const heroAnchor = '</section>\n\n  <noscript>';
    if (!html.includes(heroAnchor)) throw new Error('Niagara search growth: hero anchor not found');
    html = html.replace(heroAnchor, `</section>\n\n${intents}\n\n  <noscript>`);
  }

  if (!html.includes('id="searchQuestions"')) {
    const questions = `  <section class="niagara-search-questions" id="searchQuestions" aria-labelledby="searchQuestionsHeading">\n    <p class="eyebrow">Straight answers before you drive</p>\n    <h2 id="searchQuestionsHeading">Niagara border wait time questions</h2>\n    <h3>Which Niagara bridge has the shortest wait right now?</h3>\n    <p>The lowest posted customs number is not automatically the best trip. The live comparison above first removes crossings you cannot use, keeps U.S.-bound and Canada-bound sources separate, and only recommends leaving your natural corridor when the reported savings are large enough to justify it.</p>\n    <h3>What are the Peace Bridge wait times?</h3>\n    <p><a href="/peace-bridge-wait-times/">Open the Peace Bridge live page</a> for Buffalo–Fort Erie passenger, NEXUS and commercial streams, plus webcams and tolls.</p>\n    <h3>What are the Rainbow Bridge wait times?</h3>\n    <p><a href="/rainbow-bridge-wait-times/">Open the Rainbow Bridge live page</a> for the Niagara Falls crossing, camera views, walking access and the commercial-truck restriction.</p>\n    <h3>What are the Lewiston–Queenston Bridge wait times?</h3>\n    <p><a href="/lewiston-queenston-bridge-wait-times/">Open the Lewiston–Queenston live page</a> for passenger, commercial and NEXUS reporting on the I-190 / Highway 405 corridor.</p>\n    <h3>Can anyone use Whirlpool Rapids Bridge?</h3>\n    <p>No. Whirlpool is a specialized trusted-traveler crossing. <a href="/whirlpool-rapids-bridge-crossing/">Check Whirlpool Rapids eligibility, hours and wait context</a> before treating it as an option.</p>\n  </section>`;
    const detailsAnchor = '  <div class="details-stack">';
    if (!html.includes(detailsAnchor)) throw new Error('Niagara search growth: details anchor not found');
    html = html.replace(detailsAnchor, `${questions}\n\n${detailsAnchor}`);
  }

  if (!html.includes('data-niagara-search-schema')) {
    const searchSchema = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'BreadcrumbList',
          '@id': `${URL}#breadcrumb`,
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://chrisizworski.com/' },
            { '@type': 'ListItem', position: 2, name: 'Tools', item: 'https://chrisizworski.com/tools/' },
            { '@type': 'ListItem', position: 3, name: 'Niagara Border Wait Times', item: URL },
          ],
        },
        {
          '@type': 'ItemList',
          '@id': `${URL}#crossings`,
          name: 'Niagara border crossing live wait pages',
          numberOfItems: SEARCH_ROUTES.length,
          itemListElement: SEARCH_ROUTES.map((route, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            name: route.label,
            url: route.url,
          })),
        },
      ],
    };
    const script = `<script type="application/ld+json" data-niagara-search-schema>${JSON.stringify(searchSchema)}</script>`;
    const headAnchor = '<script defer src="/_vercel/insights/script.js"></script>';
    if (!html.includes(headAnchor)) throw new Error('Niagara search growth: head schema anchor not found');
    html = html.replace(headAnchor, `${script}\n${headAnchor}`);
  }

  fs.writeFileSync(file, html);
  console.log('Niagara flagship search title, intent links, mobile hierarchy and query answers applied.');
}

patchTools();
patchSitemap();
patchLlms();
patchLiveCameras();
patchVisualAssets();
patchDecisionFallback();
patchEligibilityLabels();
patchSearchGrowth();
