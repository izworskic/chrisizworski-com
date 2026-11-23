import fs from 'node:fs';
const source = JSON.parse(fs.readFileSync('public/holiday-travel/data/national.json', 'utf8'));
const top = source.airports
  .filter((a) => Number.isFinite(a.flights) && Number.isFinite(a.lat) && Number.isFinite(a.lon))
  .sort((a, b) => b.flights - a.flights || a.code.localeCompare(b.code))
  .slice(0, 30)
  .map(({ code, city, flights, lat, lon }) => ({ code, city, flights, lat, lon }));
if (top.length !== 30) throw new Error('Expected 30 BTS airports with coordinates');
const result = '// Generated from public/holiday-travel/data/national.json by scripts/holiday-travel/build-airport-weather-list.mjs.\n' +
  '// BTS holiday flight counts select the 30 busiest airports; not live flight volumes.\n' +
  'export const AIRPORTS = ' + JSON.stringify(top, null, 2) + ';\n';
const path = 'lib/holiday-travel/busiest-airports.mjs';
if (process.argv.includes('--check')) {
  if (fs.readFileSync(path, 'utf8') !== result) {
    console.error('Committed busiest airports are out of sync with national.json');
    process.exitCode = 1;
  }
} else {
  fs.mkdirSync('lib/holiday-travel', { recursive: true });
  fs.writeFileSync(path, result);
  console.log('Selected ' + top.length + ' airports by committed BTS holiday flight counts');
}
