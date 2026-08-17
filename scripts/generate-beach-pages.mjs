import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const catalog = JSON.parse(await readFile(path.join(root, "data", "beaches.json"), "utf8"));
const publicRoot = path.join(root, "public");

function html(value) {
  return String(value == null ? "" : value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function json(value) {
  return JSON.stringify(value, null, 2).replaceAll("<", "\\u003c");
}

function nearbyBeaches(beach) {
  return catalog.beaches
    .filter((candidate) => candidate.slug !== beach.slug && candidate.lake === beach.lake)
    .sort((first, second) => {
      const firstRegion = first.region === beach.region ? 0 : 1;
      const secondRegion = second.region === beach.region ? 0 : 1;
      return firstRegion - secondRegion || second.destinationScore - first.destinationScore || first.name.localeCompare(second.name);
    })
    .slice(0, 3);
}

const TITLE_LIMIT = 60;
const DESCRIPTION_LIMIT = 158;

// Google truncates around 60 characters. Keep the "| Chris Izworski" byline
// whenever it survives that cut, and drop it only when it would be clipped —
// the Person node in the graph and the visible byline carry attribution either way.
function detailTitle(name) {
  const base = `${name} Conditions Today`;
  const candidates = [
    `${base}: Waves, Water & Alerts | Chris Izworski`,
    `${base}: Waves & Water Temp | Chris Izworski`,
    `${base} | Chris Izworski`,
    `${base}: Waves & Water Temp`,
    base,
  ];
  return candidates.find((candidate) => candidate.length <= TITLE_LIMIT) || base;
}

function detailDescription(beach) {
  const candidates = [
    `Check ${beach.name} conditions today: BeachGuard status, NWS swim risk and alerts, ${beach.lake} waves and water temperature, wind, rain, and Beach Day Score.`,
    `${beach.name} conditions today: BeachGuard status, NWS swim risk, ${beach.lake} waves, water temperature, and today's Beach Day Score.`,
    `${beach.name} conditions today: swim risk, ${beach.lake} waves, water temperature, and today's Beach Day Score.`,
    `${beach.name} today: swim risk, waves, water temperature, and Beach Day Score.`,
  ];
  return candidates.find((candidate) => candidate.length <= DESCRIPTION_LIMIT) || candidates[candidates.length - 1];
}

function detailPage(beach) {
  const canonical = `https://chrisizworski.com/great-lakes-beaches/${beach.slug}/`;
  const description = detailDescription(beach);
  const title = detailTitle(beach.name);
  const detailModified = beach.camera ? "2026-08-17" : catalog.version;
  const nearby = nearbyBeaches(beach);
  const cameraStylesheet = beach.camera ? '  <link rel="stylesheet" href="/assets/field-camera.css">\n' : "";
  const cameraSection = beach.camera ? `    <section class="section" aria-labelledby="camera-heading">
      <div class="section-head"><div><p class="section-kicker">Current shoreline context</p><h2 id="camera-heading">See the water now</h2><p class="section-intro">The caption names the camera's actual location. Use the image for broad visibility and surface context only; it cannot show the posted flag, water quality, or every condition at ${html(beach.name)}.</p></div></div>
      <div class="field-camera" data-field-camera="${html(beach.camera)}"><p class="camera-out">Loading the camera...</p></div>
    </section>

` : "";
  const cameraScript = beach.camera ? '  <script src="/assets/field-camera.js" defer></script>\n' : "";
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${canonical}#page`,
        url: canonical,
        name: `${beach.name} Conditions Today`,
        description,
        isPartOf: { "@id": "https://chrisizworski.com/#website" },
        author: { "@id": "https://chrisizworski.com/#person" },
        publisher: { "@id": "https://chrisizworski.com/#person" },
        about: { "@id": `${canonical}#place` },
        dateModified: detailModified,
        inLanguage: "en-US",
      },
      {
        "@type": "Person",
        "@id": "https://chrisizworski.com/#person",
        name: "Chris Izworski",
        url: "https://chrisizworski.com/",
      },
      {
        "@type": ["Place", "TouristAttraction"],
        "@id": `${canonical}#place`,
        name: beach.name,
        description: beach.summary,
        geo: {
          "@type": "GeoCoordinates",
          latitude: beach.lat,
          longitude: beach.lng,
        },
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: `${beach.county} County, Michigan`,
        },
        publicAccess: true,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: "https://chrisizworski.com/" },
          { "@type": "ListItem", position: 2, name: "Michigan Beach Report", item: "https://chrisizworski.com/great-lakes-beaches/" },
          { "@type": "ListItem", position: 3, name: beach.name, item: canonical },
        ],
      },
    ],
  };

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${html(title)}</title>
  <meta name="description" content="${html(description)}">
  <link rel="canonical" href="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${html(beach.name)} Conditions Today">
  <meta property="og:description" content="${html(description)}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:image" content="https://chrisizworski.com/assets/beach-report/sleeping-bear-beach-nps.jpg">
  <meta property="og:image:alt" content="Lake Michigan shoreline at Sleeping Bear Dunes National Lakeshore">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="#064b59">
  <link rel="icon" href="/favicon.ico" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/beach-report.css">
${cameraStylesheet}  <script type="application/ld+json">${json(schema)}</script>
  <script defer src="/_vercel/insights/script.js"></script>
  <script>window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};</script>
  <script>window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};</script>
  <script defer src="/_vercel/speed-insights/script.js"></script>
</head>
<body data-analytics-page="michigan-beach-detail" data-beach-report-page="detail" data-beach-slug="${html(beach.slug)}">
  <a class="skip-link" href="#main">Skip to conditions</a>
  <header class="site-header"><div class="site-header-inner"><a class="site-brand" href="/">Chris Izworski</a><nav class="site-nav" aria-label="Primary navigation"><a href="/tools/">Tools</a><a href="/great-lakes/">Great Lakes</a><a href="/about/">About</a><a href="/great-lakes-beaches/">Beach report</a></nav></div></header>
  <noscript><div class="noscript">Live conditions require JavaScript. Check <a href="https://mienviro.michigan.gov/nsite/beach/map/results">Michigan BeachGuard</a>, the <a href="https://www.weather.gov/greatlakes/beachhazards">NWS beach forecast and alerts</a>, and posted flags directly.</div></noscript>
  <section class="hero" aria-labelledby="page-title">
    <div class="hero-inner"><div class="hero-copy">
      <p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>${html(beach.region)} · ${html(beach.lake)}</p>
      <h1 id="page-title">${html(beach.name)}</h1>
      <p class="hero-lede">${html(beach.summary)}</p>
      <p class="hero-truth">${html(beach.access)} · ${html(beach.county)} County. NWS swim risk is a forecast, not the posted flag; live planning data is not a water-safety certification.</p>
    </div></div>
  </section>
  <p class="photo-credit">Site-wide beach report photo: <a href="https://www.nps.gov/media/photo/view.htm?id=E0B12B9C-69F2-47E7-9E7F-93F11623B476" rel="noopener">Sleeping Bear Dunes National Lakeshore, National Park Service</a> (public domain).</p>
  <div class="live-ribbon" aria-live="polite"><div class="live-ribbon-inner"><div class="live-ribbon-status"><span class="source-dot live" aria-hidden="true"></span><strong id="liveUpdated">Loading ${html(beach.name)} conditions…</strong></div><div class="source-health" id="sourceHealth" aria-label="Live data source health"></div></div></div>

  <main class="page-shell" id="main">
    <div class="beach-detail-layout">
      <article class="beach-detail-card" data-beach-live aria-live="polite"><div class="skeleton" aria-hidden="true"></div></article>
      <aside class="source-card">
        <h3>Before entering the water</h3>
        <ul class="source-list">
          <li><a href="https://mienviro.michigan.gov/nsite/beach/map/results" target="_blank" rel="noopener">Open Michigan BeachGuard</a><span>Check the official site record and sampling history</span></li>
          <li><a href="https://www.weather.gov/greatlakes/beachhazards" target="_blank" rel="noopener">Check NWS forecast and alerts</a><span>Review swim risk, dangerous currents, weather, marine, and lakeshore notices</span></li>
          <li><a href="https://www.michigan.gov/dnr/education/safety-info/beach-safety" target="_blank" rel="noopener">Read the Michigan flag guide</a><span>Check green, yellow, red, and double-red meanings</span></li>
          <li><a href="/great-lakes-beaches/#methodology">Read the score methodology</a><span>See weights, data limits, and override rules</span></li>
        </ul>
        <div class="safety-note">No active alert does not mean a recent water sample exists. NWS risk does not report the on-site flag. Follow the flag, signs, and lifeguard instructions you actually see.</div>
      </aside>
    </div>

${cameraSection}    <section class="section content-grid" aria-labelledby="about-heading">
      <article class="content-section">
        <p class="section-kicker">${html(beach.region)}</p>
        <h2 id="about-heading">About ${html(beach.name)}</h2>
        <p>${html(beach.summary)}</p>
        <p>${html(beach.name)} is a ${html(beach.access.toLowerCase())} on ${html(beach.lake)} in ${html(beach.county)} County. Its report combines a local three-day weather forecast with the nearest relevant, recent NOAA lake observation, Michigan BeachGuard status, a matched NWS Surf Zone Forecast, and relevant NWS land or marine alerts.</p>
        <h3>How to read this page</h3>
        <p>The Beach Day Score compares day-trip potential, not whether entering the water is appropriate. It is N/A unless the required weather values and both water temperature and wave height are present, with the NOAA observation no more than six hours old. Daily ranking also requires explicit low NWS swim risk and no matched official alert. Open the named sources, judge the station distance, and reassess the posted flag and shoreline conditions when you arrive.</p>
      </article>
      <aside><div class="method-card"><h3>Beach character</h3><div class="condition-chips">${(beach.traits || []).map((trait) => `<span class="trait-chip">${html(trait)}</span>`).join("")}</div><p><strong>Access:</strong> ${html(beach.access)}<br><strong>Lake:</strong> ${html(beach.lake)}<br><strong>County:</strong> ${html(beach.county)}</p></div></aside>
    </section>

    <section class="section" aria-labelledby="nearby-heading">
      <div class="section-head"><div><p class="section-kicker">Compare nearby options</p><h2 id="nearby-heading">More ${html(beach.lake)} beaches</h2></div><a href="/great-lakes-beaches/?q=${encodeURIComponent(beach.lake)}">See every ${html(beach.lake)} beach →</a></div>
      <div class="daily-grid">${nearby.map((candidate) => `<article class="method-card"><h3><a href="/great-lakes-beaches/${html(candidate.slug)}/">${html(candidate.name)}</a></h3><p>${html(candidate.summary)}</p></article>`).join("")}</div>
    </section>
  </main>
  <footer class="site-footer"><div class="site-footer-inner"><span>© 2026 Chris Izworski</span><span><a href="/great-lakes-beaches/">Michigan Beach Report</a> · <a href="/best-michigan-beaches-today/">Today’s ranking</a> · <a href="/privacy/">Privacy</a></span></div></footer>
  <script src="/assets/tool-engagement.js" defer></script>
  <script src="/assets/beach-report.js" defer></script>
${cameraScript}</body>
</html>
`;
}

for (const beach of catalog.beaches) {
  const directory = path.join(publicRoot, "great-lakes-beaches", beach.slug);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "index.html"), detailPage(beach));
}


// --- Crawlable beach index on the hub page -------------------------------
// The interactive explorer builds its list in the browser, so before this the
// 50 detail pages had no inbound link from their own hub and 15 had none from
// anywhere on the site. This writes a static, grouped index between the
// markers below so it regenerates from data/beaches.json and never drifts.
const START = "<!-- beach-index:start -->";
const END = "<!-- beach-index:end -->";
const lakeOrder = ["Lake Michigan", "Lake Huron", "Lake Superior", "Lake Erie"];
const byLake = new Map(lakeOrder.map((l) => [l, []]));
for (const beach of [...catalog.beaches].sort((a, b) => a.name.localeCompare(b.name))) {
  if (!byLake.has(beach.lake)) byLake.set(beach.lake, []);
  byLake.get(beach.lake).push(beach);
}
const indexHtml = [
  START,
  '<section class="section" id="beachIndex" aria-labelledby="beach-index-heading">',
  '<div class="section-head"><div><p class="section-kicker">Every beach</p>',
  `<h2 id="beach-index-heading">All ${catalog.beaches.length} Michigan beaches by lake</h2>`,
  '<p class="section-intro">The full list, grouped by lake. Each one has its own page with conditions, water temperature, and what the shoreline is like.</p>',
  "</div></div>",
  ...[...byLake.entries()]
    .filter(([, list]) => list.length)
    .map(([lake, list]) =>
      `<h3>${lake}</h3><ul class="beach-index-list">` +
      list
        .map((b) => `<li><a href="/great-lakes-beaches/${b.slug}/">${escapeHtml(b.name)}</a> <span>${escapeHtml(b.county)} County, ${escapeHtml(b.region)}</span></li>`)
        .join("") +
      "</ul>",
    ),
  "</section>",
  END,
].join("\n");

const hubPath = path.join(publicRoot, "great-lakes-beaches", "index.html");
let hub = await readFile(hubPath, "utf8");
if (hub.includes(START)) {
  hub = hub.replace(new RegExp(`${START}[\\s\\S]*?${END}`), indexHtml);
} else {
  const anchor = '<section class="section" id="beachExplorer"';
  hub = hub.replace(anchor, `${indexHtml}\n${anchor}`);
}
await writeFile(hubPath, hub);
console.log(`Wrote crawlable index of ${catalog.beaches.length} beaches into the hub page.`);

const urls = [
  { loc: "https://chrisizworski.com/great-lakes-beaches/", priority: "0.9", changefreq: "daily", lastmod: "2026-08-10" },
  { loc: "https://chrisizworski.com/best-michigan-beaches-today/", priority: "0.9", changefreq: "daily", lastmod: "2026-08-10" },
  ...catalog.beaches.map((beach) => ({
    loc: `https://chrisizworski.com/great-lakes-beaches/${beach.slug}/`,
    priority: "0.7",
    changefreq: "daily",
    lastmod: beach.camera ? "2026-08-17" : catalog.version,
  })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((entry) => `  <url>\n    <loc>${entry.loc}</loc>\n    <lastmod>${entry.lastmod || catalog.version}</lastmod>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join("\n")}
</urlset>
`;
await writeFile(path.join(publicRoot, "sitemap-beaches.xml"), sitemap);

console.log(`Generated ${catalog.beaches.length} beach detail pages and sitemap-beaches.xml.`);
