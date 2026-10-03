import fs from 'node:fs';

const PAGE = 'public/duluth-canal-park/index.html';
const CANONICAL = 'https://chrisizworski.com/duluth-canal-park/';
const SOCIAL_IMAGE = 'https://chrisizworski.com/api/duluth-social-card';
const SOCIAL_IMAGE_ID = `${CANONICAL}#primaryimage`;
const SOCIAL_TITLE = 'Duluth Ship Schedule Today, Live Cams & Map';
const SOCIAL_DESCRIPTION = 'See which Duluth ship is coming next with live AIS, Aerial Lift Bridge passage windows, live cams, map and Canal Park viewing spots.';
const SOCIAL_ALT = 'Illustration of a Great Lakes freighter approaching the Duluth Aerial Lift Bridge';

function escapeRe(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function setProperty(html, property, content) {
  const tag = `<meta property="${property}" content="${escapeAttr(content)}">`;
  const re = new RegExp(`<meta\\s+property=["']${escapeRe(property)}["'][^>]*>`, 'i');
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `${tag}\n</head>`);
}

function setName(html, name, content) {
  const tag = `<meta name="${name}" content="${escapeAttr(content)}">`;
  const re = new RegExp(`<meta\\s+name=["']${escapeRe(name)}["'][^>]*>`, 'i');
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `${tag}\n</head>`);
}

let html = fs.readFileSync(PAGE, 'utf8');

html = setProperty(html, 'og:site_name', 'Chris Izworski');
html = setProperty(html, 'og:title', SOCIAL_TITLE);
html = setProperty(html, 'og:description', SOCIAL_DESCRIPTION);
html = setProperty(html, 'og:type', 'website');
html = setProperty(html, 'og:url', CANONICAL);
html = setProperty(html, 'og:image', SOCIAL_IMAGE);
html = setProperty(html, 'og:image:secure_url', SOCIAL_IMAGE);
html = setProperty(html, 'og:image:type', 'image/png');
html = setProperty(html, 'og:image:width', '1200');
html = setProperty(html, 'og:image:height', '630');
html = setProperty(html, 'og:image:alt', SOCIAL_ALT);

html = setName(html, 'twitter:card', 'summary_large_image');
html = setName(html, 'twitter:title', SOCIAL_TITLE);
html = setName(html, 'twitter:description', SOCIAL_DESCRIPTION);
html = setName(html, 'twitter:image', SOCIAL_IMAGE);
html = setName(html, 'twitter:image:alt', SOCIAL_ALT);

const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
if (!jsonLdMatch) throw new Error('Duluth social tuning: JSON-LD graph not found');
const jsonLd = JSON.parse(jsonLdMatch[1]);
const graph = jsonLd['@graph'];
if (!Array.isArray(graph)) throw new Error('Duluth social tuning: JSON-LD @graph missing');

const app = graph.find((node) => node?.['@type'] === 'WebApplication' && node?.['@id'] === `${CANONICAL}#app`);
const page = graph.find((node) => node?.['@type'] === 'WebPage' && node?.['@id'] === CANONICAL);
if (!app || !page) throw new Error('Duluth social tuning: required WebApplication/WebPage nodes missing');

let image = graph.find((node) => node?.['@type'] === 'ImageObject' && node?.['@id'] === SOCIAL_IMAGE_ID);
if (!image) {
  image = { '@type': 'ImageObject', '@id': SOCIAL_IMAGE_ID };
  graph.push(image);
}
Object.assign(image, {
  url: SOCIAL_IMAGE,
  contentUrl: SOCIAL_IMAGE,
  encodingFormat: 'image/png',
  width: 1200,
  height: 630,
  name: 'Duluth Ship Schedule social preview',
  caption: SOCIAL_ALT,
  representativeOfPage: true
});

app.image = { '@id': SOCIAL_IMAGE_ID };
page.primaryImageOfPage = { '@id': SOCIAL_IMAGE_ID };
page.image = { '@id': SOCIAL_IMAGE_ID };
page.dateModified = '2026-10-02';

const updatedJsonLd = `<script type="application/ld+json">\n${JSON.stringify(jsonLd, null, 2)}\n</script>`;
html = html.replace(jsonLdMatch[0], updatedJsonLd);

const required = [
  ['Open Graph site name', '<meta property="og:site_name" content="Chris Izworski">'],
  ['Open Graph first-party image', `<meta property="og:image" content="${SOCIAL_IMAGE}">`],
  ['Open Graph dimensions', '<meta property="og:image:width" content="1200">'],
  ['Open Graph height', '<meta property="og:image:height" content="630">'],
  ['Twitter title', `<meta name="twitter:title" content="${escapeAttr(SOCIAL_TITLE)}">`],
  ['Twitter description', `<meta name="twitter:description" content="${escapeAttr(SOCIAL_DESCRIPTION)}">`],
  ['Twitter image', `<meta name="twitter:image" content="${SOCIAL_IMAGE}">`],
  ['Twitter alt', `<meta name="twitter:image:alt" content="${escapeAttr(SOCIAL_ALT)}">`]
];
for (const [label, needle] of required) {
  if (!html.includes(needle)) throw new Error(`Duluth social tuning verification failed: ${label}`);
}

const verifyLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
const verifyLd = JSON.parse(verifyLdMatch[1]);
const verifyGraph = verifyLd['@graph'];
const verifyImage = verifyGraph.find((node) => node?.['@id'] === SOCIAL_IMAGE_ID);
const verifyApp = verifyGraph.find((node) => node?.['@id'] === `${CANONICAL}#app`);
const verifyPage = verifyGraph.find((node) => node?.['@id'] === CANONICAL);
if (!verifyImage || verifyImage.width !== 1200 || verifyImage.height !== 630) throw new Error('Duluth social tuning verification failed: ImageObject');
if (verifyApp?.image?.['@id'] !== SOCIAL_IMAGE_ID) throw new Error('Duluth social tuning verification failed: WebApplication image');
if (verifyPage?.primaryImageOfPage?.['@id'] !== SOCIAL_IMAGE_ID) throw new Error('Duluth social tuning verification failed: WebPage primary image');

fs.writeFileSync(PAGE, html);
console.log('Duluth Open Graph, X card and image schema metadata synced.');
