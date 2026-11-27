// Discovery shims for /thousand-islands-ships/: Tools card, sitemap entry and a handoff from the
// Seaway hub. Idempotent; runs after generate-seaway and add-seaway-discovery in build:site.
import fs from 'node:fs';
const route = '/thousand-islands-ships/', absolute = 'https://chrisizworski.com' + route;
const places = JSON.parse(fs.readFileSync('data/thousand-islands/places.json', 'utf8'));

const tools = 'public/tools/index.html';
let html = fs.readFileSync(tools, 'utf8');
if (!html.includes('data-tool-id="thousand-islands-ships"')) {
  const card = `<div class="tool-card" data-tool-id="thousand-islands-ships" data-tool-key="thousand-islands-ships" data-tags="boating planning transportation great-lakes ships seaway thousand-islands new-york ontario" data-months="3,4,5,6,7,8,9,10,11,12"><div class="tk">Ship times<span class="tk-season" hidden> / riverbank planner</span></div><div class="tool-title"><a href="${route}">Thousand Islands Ship Watch</a></div><div class="tool-desc">See when the next freighter should pass Boldt Castle or Clayton, with windows tested on 2025 passages.</div></div>`;
  const at = html.indexOf('<div class="tool-card" data-tool-id="welland-canal"');
  if (at < 0) throw Error('Tools directory Welland anchor missing');
  html = html.slice(0, at) + card + html.slice(at);
  fs.writeFileSync(tools, html);
}

const sitemap = 'public/sitemap.xml';
html = fs.readFileSync(sitemap, 'utf8');
if (!html.includes(`<loc>${absolute}</loc>`)) {
  html = html.replace('</urlset>', `  <url><loc>${absolute}</loc><lastmod>${places.dateModified}</lastmod></url>\n</urlset>`);
  fs.writeFileSync(sitemap, html);
}

const hub = 'public/st-lawrence-seaway/index.html';
html = fs.readFileSync(hub, 'utf8');
if (!html.includes('data-tis-discovery')) {
  const needle = '<section class="station" id="ship-watch"';
  if (html.split(needle).length !== 2) throw Error('Seaway hub ship-watch anchor missing');
  const note = `<p class="field-note" data-tis-discovery style="margin:18px 0;padding:14px"><strong>Watching from the Thousand Islands?</strong> <a href="${route}">See when the next ship should pass Boldt Castle or Clayton</a>, with windows tested on last season's passages.</p>`;
  html = html.replace(needle, note + needle);
  fs.writeFileSync(hub, html);
}
console.log('Thousand Islands Ship Watch discovery applied');
