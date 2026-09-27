const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const ui=fs.readFileSync('public/assets/pictured-rocks-planner-v3.js','utf8');
const html=fs.readFileSync('public/labs/pictured-rocks-planner/index.html','utf8');

test('Pictured Rocks uses CARTO Voyager as the primary Leaflet basemap',()=>{
  assert.match(ui,/basemaps\.cartocdn\.com\/rastertiles\/voyager/);
  assert.match(ui,/subdomains:'abcd'/);
  assert.match(ui,/detectRetina:true/);
  assert.match(ui,/OpenStreetMap contributors &copy; CARTO/);
});

test('Pictured Rocks keeps a resilient OSM fallback and CARTO preconnect',()=>{
  assert.match(ui,/cartoLayer\.on\('tileerror'/);
  assert.match(ui,/tile\.openstreetmap\.org/);
  assert.match(html,/a\.basemaps\.cartocdn\.com/);
});
