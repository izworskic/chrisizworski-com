import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync('public/niagara-border-crossing/index.html', 'utf8');
const map = fs.readFileSync('public/assets/niagara-camera-map-leaflet.20261004.js', 'utf8');
const owner = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004c.js', 'utf8');
const ux = fs.readFileSync('public/assets/niagara-product-v2.20261004.js', 'utf8');
const css = fs.readFileSync('public/assets/niagara-product-v2.20261004.css', 'utf8');

function scoreProduct() {
  const hardVetoes = [];
  if (!/niagara-bridge-camera-map\.20261004c\.js\?v=20261004value3/.test(html)) hardVetoes.push('browser can reuse stale top-level Niagara loader');
  if (/cartocdn\.com|CARTO_BASEMAP_KEY|\?key=/.test(map)) hardVetoes.push('blocked/API-key final map risk');
  if (!/suppressLegacyMap/.test(owner) || !/niagaraBridgeMapLegacySuppressed/.test(owner)) hardVetoes.push('legacy blocked-map flash risk');
  if (/scrollIntoView/.test(map)) hardVetoes.push('camera context jump');
  if (/#9ed8ea|#d7eef3/.test(css)) hardVetoes.push('known pale-blue primary text');
  if (/id: ["']whirlpool["']/.test(map)) hardVetoes.push('invented Whirlpool camera');
  if (!/showModal/.test(map)) hardVetoes.push('camera does not open in place');
  if (!/Compare all four crossings/.test(ux)) hardVetoes.push('four-way comparison competes with primary answer');

  let score = 0;

  const fastDecision = /1\. Which way are you crossing\?/.test(ux)
    && /2\. Which corridor are you already near\?/.test(ux)
    && /Car \/ SUV/.test(ux)
    && /niagara-v2-legacy-control/.test(ux);
  if (fastDecision) score += 20;

  const decisionClarity = /Map \+ cameras/.test(ux)
    && /Rules \+ more detail/.test(ux)
    && /Compare all four crossings/.test(ux)
    && /niagara-compact-compare/.test(css)
    && /niagara-more-details/.test(ux)
    && /More detail — rules, special vehicles, all bridges and sources/.test(ux);
  if (decisionClarity) score += 20;

  const bridgeCount = (map.match(/key: "(?:peace|rainbow|whirlpool|lewiston-queenston)"/g) || []).length;
  const cameraCount = (map.match(/id: ["'](?:peace-|rainbow-|lewiston-|queenston-)/g) || []).length;
  const trust = /tile\.openstreetmap\.org/.test(map)
    && bridgeCount === 4
    && cameraCount === 9
    && /cameraCount: 0/.test(map)
    && !/cartocdn\.com|CARTO_BASEMAP_KEY|\?key=/.test(map)
    && /suppressLegacyMap/.test(owner)
    && /20261004value3/.test(html);
  if (trust) score += 20;

  const locality = /niagaraMapCameraDialog/.test(map)
    && /showModal/.test(map)
    && /marker\.on\("click", \(\) => openCameraModal\(camera\)\)/.test(map)
    && !/scrollIntoView/.test(map);
  if (locality) score += 15;

  const readability = /color:#072f49!important/.test(owner)
    && /\.trip-answer p[^}]*\{[^}]*color:#fff!important/.test(css)
    && /\.mobile-decision-label[^}]*color:#fff!important/.test(css)
    && /font-size:15px!important/.test(css)
    && !/#9ed8ea|#d7eef3/.test(css);
  if (readability) score += 15;

  const personaFit = /NEXUS auto traveler/.test(ux)
    && /Commercial truck/.test(ux)
    && /Vehicle with trailer \/ towing/.test(ux)
    && /Walking/.test(ux)
    && /Bicycle/.test(ux)
    && /niagara-traveler-details/.test(ux)
    && /#bridgeCameras\{display:none!important\}/.test(css);
  if (personaFit) score += 10;

  return { score, hardVetoes, bridgeCount, cameraCount };
}

test('Niagara value/loss benchmark clears release target with no hard vetoes', () => {
  const result = scoreProduct();
  console.log(`Niagara value score: ${result.score}/100; bridges=${result.bridgeCount}; cameras=${result.cameraCount}; vetoes=${result.hardVetoes.join(', ') || 'none'}`);
  assert.deepEqual(result.hardVetoes, []);
  assert.ok(result.score >= 90, `Niagara value score ${result.score}/100 is below 90`);
});
