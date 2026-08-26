const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'public', 'estivant-pines', 'index.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'public', 'assets', 'estivant-pines.js'), 'utf8');
const sunJs = fs.readFileSync(path.join(root, 'public', 'assets', 'estivant-sun-local.js'), 'utf8');
const benchmark = JSON.parse(fs.readFileSync(path.join(root, 'benchmarks', 'estivant-pines-launch.json'), 'utf8'));

function renderedLength(value) {
  return value.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').length;
}

test('Estivant Pines owns one distinct indexable canonical with bounded SERP strings', () => {
  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const description = html.match(/<meta name="description" content="([^"]+)"/i)?.[1];
  assert.equal(title, 'Estivant Pines Trail Conditions | Chris Izworski');
  assert.ok(renderedLength(title) <= 60, `title is ${renderedLength(title)} chars`);
  assert.ok(description && renderedLength(description) <= 158, `description is ${renderedLength(description || '')} chars`);
  assert.match(html, /<link rel="canonical" href="https:\/\/chrisizworski\.com\/estivant-pines\/">/);
  assert.match(html, /<meta name="robots" content="index,follow/);
  assert.match(html, /<h1>Estivant Pines trail conditions & hike planner<\/h1>/);
});

test('the page defines the canonical Chris Izworski entity and the tool honestly', () => {
  assert.match(html, /"@id":"https:\/\/chrisizworski\.com\/#person"/);
  assert.match(html, /"@type":"SoftwareApplication"/);
  assert.match(html, /"dateModified":"2026-08-25"/);
  assert.match(html, /does <em>not<\/em> claim to know actual mud, blowdowns, parking availability or closures/);
  assert.match(html, /There is no official live trail-condition sensor at Estivant Pines/);
  assert.doesNotMatch(html, /safe to hike|trail is safe|official live trail conditions/i);
});

test('route facts use Michigan Nature Association as the trail authority', () => {
  assert.match(html, /Michigan Nature Association/);
  assert.match(html, /Cathedral Grove loop/);
  assert.match(html, /about a 1-mile loop/);
  assert.match(html, /Bertha Daubendiek trail/);
  assert.match(html, /about 1\.2 miles/);
  assert.match(html, /roughly a 2\.5-mile hike/);
  assert.match(html, /Manganese Road/);
  assert.match(html, /Clark Mine Road/);
  assert.match(html, /Burma Road/);
});

test('trailhead coordinate is consistent across schema, map, directions and NWS point', () => {
  assert.match(html, /"latitude":47\.4456,"longitude":-87\.8776/);
  assert.match(html, /marker=47\.4456%2C-87\.8776/);
  assert.match(html, /query=47\.4456,-87\.8776/);
  assert.match(js, /const LAT = 47\.4456;/);
  assert.match(js, /const LON = -87\.8776;/);
  assert.doesNotMatch(html + js, /47\.44614|-87\.86015/);
});

test('live read uses point-specific NWS forecast, alerts, snow grid and nearby observation', () => {
  assert.match(js, /https:\/\/api\.weather\.gov/);
  assert.match(js, /\/points\/\$\{LAT\.toFixed\(4\)\},\$\{LON\.toFixed\(4\)\}/);
  assert.match(js, /\/alerts\/active\?point=/);
  assert.match(js, /observationStations/);
  assert.match(js, /observations\/latest/);
  assert.match(js, /forecastGridData/);
  assert.match(js, /snowfallAmount/);
  assert.match(js, /snowDepth/);
  assert.match(js, /bugRead/);
  assert.match(js, /This is not a measured bug count/);
  assert.doesNotMatch(js, /localStorage|sessionStorage|navigator\.geolocation/);
});

test('network-independent sunrise sunset drives a buffered hike clock', () => {
  assert.match(html, /Sunrise, sunset & when to start/);
  assert.match(html, /30-minute daylight margin/);
  assert.match(html, /estivant-sun-local\.js/);
  assert.match(sunJs, /Cathedral Grove.*allowance: 75/s);
  assert.match(sunJs, /Bertha Daubendiek.*allowance: 90/s);
  assert.match(sunJs, /Both loops.*allowance: 150/s);
  assert.match(sunJs, /sunset - r\.allowance - 30/);
  assert.match(html, /NOAA solar calculation details/);
  assert.doesNotMatch(sunJs, /fetch\(|aa\.usno\.navy\.mil/);
});

test('snow is described as forecast context rather than an inspected trail measurement', () => {
  assert.match(html, /Snow & winter trail read/);
  assert.match(html, /not a measurement of snow on the Estivant Pines trail/);
  assert.match(js, /Not a trail measurement/);
  assert.match(js, /NWS grid and nearby-station context, not an on-trail sensor/);
});

test('new canonical gate passes with a measurement plan and cannibalization boundary', () => {
  assert.equal(benchmark.canonical, 'https://chrisizworski.com/estivant-pines/');
  assert.equal(benchmark.newCanonicalGate.passes, true);
  assert.ok(benchmark.newCanonicalGate.total >= benchmark.newCanonicalGate.buildThreshold);
  assert.equal(benchmark.searchOwnership.primaryIntent, 'Estivant Pines trail conditions and hike planning');
  assert.ok(benchmark.searchOwnership.doesNotOwn.includes('Keweenaw fall color'));
  assert.equal(benchmark.measurement.windowDays, 28);
  assert.ok(benchmark.preWindowEnhancements.some(x => x.date === '2026-08-25' && /sunrise/i.test(x.change)));
  assert.ok(benchmark.releaseConstraints.some(x => x.includes('/tools/')));
});
