import fs from 'node:fs';

// Main-site metadata limits are part of deployment composition. Keep tool
// behavior in its owning repository and reapply shell metadata after each sync.
const pages = {
  appalachia: { description: 'Outdoor tools for Appalachia and the Ohio Valley: Gauley River releases, Cumberland Falls moonbows and Blue Ridge Parkway fall-color timing.' },
  'bird-migration': { title: 'Bird Migration Near Me | Morning Birding | Chris Izworski', description: 'Check BirdCast migration, local eBird reports and NWS morning weather for a U.S. city or ZIP to plan where to start birding this morning.' },
  'columbia-salmon-run': { description: 'Columbia River salmon counts at Bonneville, The Dalles, John Day and McNary, plus seven-day Chinook, Coho and steelhead trends and seasonal context.' },
  'pacific-northwest': { title: 'Pacific Northwest Outdoor Tools | Chris Izworski', description: 'Pacific Northwest outdoor tools for Ballard Locks ships and salmon, Columbia River salmon counts and Grand Coulee Dam conditions, tours and lake levels.' },
};
for (const [slug, meta] of Object.entries(pages)) {
  const file = `public/synced-national-tools/${slug}/index.html`;
  let html = fs.readFileSync(file, 'utf8');
  if (meta.title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${meta.title}</title>`);
  html = html.replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${meta.description}">`);
  fs.writeFileSync(file, html);
}
const apiFile = 'api/columbia-salmon.js';
let api = fs.readFileSync(apiFile, 'utf8');
if (!api.includes("res.setHeader('X-Robots-Tag'")) {
  api = api.replace('export default async function handler(req, res) {', "export default async function handler(req, res) {\n  res.setHeader('X-Robots-Tag', 'noindex, nofollow');");
  fs.writeFileSync(apiFile, api);
}
