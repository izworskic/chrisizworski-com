import fs from 'node:fs';

function replaceKnown(file, oldText, newText) {
  let text = fs.readFileSync(file, 'utf8');
  if (text.includes(newText)) return false;
  if (!text.includes(oldText)) throw new Error(`Neither expected old nor new text found in ${file}`);
  fs.writeFileSync(file, text.replace(oldText, newText));
  return true;
}

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const ballardPin = 'github:izworskic/national-ballard-locks#86fdfd789e16135c801ebf083da068a4a175149c';
if (pkg.dependencies['national-ballard-locks'] !== ballardPin) throw new Error(`Unexpected Ballard pin: ${pkg.dependencies['national-ballard-locks']}`);
replaceKnown('tests/ballard-locks-extracted.test.js', 'github:izworskic/national-ballard-locks#e742334d61e9856be77fc613c642e845a4f3227a', ballardPin);

const edits = [
  ['public/national-tools/blue-spring-live/index.html', 'Blue Spring Live combines current spring and St. Johns River temperatures, weather, manatee signals and park planning to help you choose the best time to visit Blue Spring State Park.', 'Live Blue Spring manatee conditions, spring and St. Johns River temperatures, weather, park planning and the best time to visit Blue Spring State Park.'],
  ['public/national-tools/blue-spring-live/manatee-conditions-today/index.html', 'Blue Spring Manatee Conditions Today | Latest Published Count', 'Blue Spring Manatee Conditions Today | Latest Count'],
  ['public/national-tools/blue-spring-live/manatee-conditions-today/index.html', 'Check Blue Spring manatee conditions today with the latest published count, live spring and St. Johns River temperatures, refuge difference and weather context.', 'Check Blue Spring manatee conditions today with the latest published count, live spring and river temperatures, refuge difference and weather context.'],
  ['public/northern-lights-michigan/keweenaw/index.html', 'Northern Lights Keweenaw Tonight: Live Aurora Forecast | Chris Izworski', 'Northern Lights Keweenaw Tonight | Chris Izworski'],
  ['public/northern-lights-michigan/keweenaw/index.html', 'Can you see the northern lights in the Keweenaw tonight? Live NOAA aurora signal, Kp, solar wind and NWS cloud cover for Copper Harbor, Houghton and the Keweenaw Peninsula.', 'Live NOAA aurora signal, Kp, solar wind and NWS cloud cover for Copper Harbor, Houghton and the Keweenaw Peninsula tonight.'],
  ['public/northern-lights-michigan/mackinaw-city/index.html', 'Northern Lights Mackinaw City Tonight: Headlands Aurora Forecast | Chris Izworski', 'Northern Lights Mackinaw City Tonight | Chris Izworski'],
  ['public/northern-lights-michigan/mackinaw-city/index.html', 'Can you see the northern lights near Mackinaw City tonight? Live NOAA aurora signal, Kp, solar wind and NWS cloud cover for Mackinaw City, the Straits and Headlands area.', 'Live NOAA aurora signal, Kp, solar wind and NWS cloud cover for Mackinaw City, the Straits and Headlands tonight.'],
  ['public/northern-lights-michigan/marquette/index.html', 'Northern Lights Marquette Tonight: Live Aurora Forecast | Chris Izworski', 'Northern Lights Marquette Tonight | Chris Izworski'],
  ['public/northern-lights-michigan/marquette/index.html', 'Can you see the northern lights in Marquette tonight? Live NOAA aurora signal, Kp, solar wind and NWS cloud cover for Marquette and the central Upper Peninsula.', "Live NOAA aurora signal, Kp, solar wind and NWS cloud cover for Marquette and Michigan's central Upper Peninsula tonight."],
  ['public/northern-lights-michigan/munising/index.html', 'Northern Lights Munising Tonight: Pictured Rocks Aurora Forecast | Chris Izworski', 'Northern Lights Munising Tonight | Chris Izworski']
];
for (const edit of edits) replaceKnown(...edit);

replaceKnown('scripts/verify-extracted-routing.mjs', "['ice-out', 'niagara-rainbow'].includes(entry)", "['ice-out', 'niagara-rainbow', 'blue-spring-live'].includes(entry)");

const vpath = 'vercel.json';
const config = JSON.parse(fs.readFileSync(vpath, 'utf8'));
const rewrites = config.rewrites || [];
const marker = rewrites.findIndex(r => r.source === '/national-tools/:path*');
if (marker < 0) throw new Error('National Tools catch-all rewrite not found');
const additions = [
  { source: '/national-tools/elk-rut', destination: 'https://national-outdoor-tools-hub.vercel.app/national-tools/elk-rut/' },
  { source: '/national-tools/elk-rut/', destination: 'https://national-outdoor-tools-hub.vercel.app/national-tools/elk-rut/' },
  { source: '/national-tools/elk-rut/_api/live', destination: 'https://national-outdoor-tools-hub.vercel.app/national-tools/elk-rut/_api/live' }
];
const existing = new Set(rewrites.map(r => r.source));
rewrites.splice(marker, 0, ...additions.filter(r => !existing.has(r.source)));
config.rewrites = rewrites;
fs.writeFileSync(vpath, JSON.stringify(config, null, 2) + '\n');
