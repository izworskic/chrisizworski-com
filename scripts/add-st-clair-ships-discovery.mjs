// Discovery shims for /st-clair-river-ships/: Tools card, sitemap entry, a Freighter Central
// feature and a handoff from the Port Huron entry on the ship-watching spots page. Idempotent;
// runs after the pages it edits are generated in build:site.
import fs from 'node:fs';
const route = '/st-clair-river-ships/', absolute = 'https://chrisizworski.com' + route;
const page = JSON.parse(fs.readFileSync('data/st-clair-river-ships/page.json', 'utf8'));
const edit = (file, marker, fn) => { const html = fs.readFileSync(file, 'utf8'); if (html.includes(marker)) return; fs.writeFileSync(file, fn(html)); };
const insertBefore = (html, needle, text, label) => {
  const at = html.indexOf(needle);
  if (at < 0) throw Error(label + ' anchor missing');
  return html.slice(0, at) + text + html.slice(at);
};

edit('public/tools/index.html', 'data-tool-id="st-clair-river-ships"', html => insertBefore(html, '<div class="tool-card" data-tool-id="welland-canal"',
  `<div class="tool-card" data-tool-id="st-clair-river-ships" data-tool-key="st-clair-river-ships" data-tags="boating planning transportation great-lakes ships michigan port-huron st-clair-river" data-months="1,3,4,5,6,7,8,9,10,11,12"><div class="tk">Ship times<span class="tk-season" hidden> / riverbank planner</span></div><div class="tool-title"><a href="${route}">St. Clair River Ship Watch</a></div><div class="tool-desc">See when the next freighter should pass Port Huron, Marysville, St. Clair, Marine City or Algonac, with windows tested on 2025 passages.</div></div>`, 'Tools directory Welland'));

edit('public/sitemap.xml', `<loc>${absolute}</loc>`, html => html.replace('</urlset>', `  <url><loc>${absolute}</loc><lastmod>${page.dateModified}</lastmod></url>\n</urlset>`));

edit('public/freighters/index.html', 'data-st-clair-discovery="freighters"', html => insertBefore(html, '<article class="feature" data-seaway-discovery="freighters">',
  `<article class="feature" data-st-clair-discovery="freighters"><p class="card-kicker">Port Huron to Algonac · Michigan</p><h3><a href="${route}">St. Clair River Ship Watch</a></h3><p>Pick a river town and see when the next freighter should pass, with windows tested on last season's passages.</p><a class="text-link" href="${route}">See the next ships →</a></article>\n`, 'Freighter Central Seaway feature'));

edit('public/great-lakes-ship-watching-spots/index.html', 'data-st-clair-discovery="spots"', html => {
  const needle = '<h3>Vantage Point · Port Huron</h3>';
  const at = html.indexOf(needle);
  if (at < 0) throw Error('Ship-watching spots Port Huron anchor missing');
  const end = html.indexOf('</p></article>', at);
  if (end < 0) throw Error('Ship-watching spots Port Huron paragraph end missing');
  return html.slice(0, end) + ` <a href="${route}" data-st-clair-discovery="spots">See when the next ship should pass Port Huron and the river towns.</a>` + html.slice(end);
});
console.log('St. Clair River Ship Watch discovery applied');
