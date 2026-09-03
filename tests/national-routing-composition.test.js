const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const cfg=JSON.parse(fs.readFileSync(path.join(__dirname,'../vercel.json'),'utf8'));
const rewrites=cfg.rewrites||[];
const bySource=new Map(rewrites.map(r=>[r.source,r.destination]));

const plantingOrigin='https://national-planting.vercel.app';
const hubOrigin='https://national-outdoor-tools-hub.vercel.app';

const plantingRoutes={
  '/assets/national-planting-engine.js':plantingOrigin+'/assets/national-planting-engine.js',
  '/assets/national-planting-page-v3.js':plantingOrigin+'/assets/national-planting-page-v3.js',
  '/assets/national-planting-season-years.js':plantingOrigin+'/assets/national-planting-season-years.js',
  '/assets/national-planting-v3.css':plantingOrigin+'/assets/national-planting-v3.css',
  '/data/national-planting-crops.json':plantingOrigin+'/data/national-planting-crops.json',
  '/data/national-planting-v3.json':plantingOrigin+'/data/national-planting-v3.json'
};

const hubRoutes={
  '/national-tools/garden':hubOrigin+'/national-tools/garden/',
  '/national-tools/garden/':hubOrigin+'/national-tools/garden/',
  '/national-tools/fall':hubOrigin+'/national-tools/fall/',
  '/national-tools/fall/':hubOrigin+'/national-tools/fall/',
  '/national-tools/water':hubOrigin+'/national-tools/water/',
  '/national-tools/water/':hubOrigin+'/national-tools/water/',
  '/national-tools/night-sky':hubOrigin+'/national-tools/night-sky/',
  '/national-tools/night-sky/':hubOrigin+'/national-tools/night-sky/'
};

test('main-domain router exposes every planting v3 runtime dependency',()=>{
  for(const [source,destination] of Object.entries(plantingRoutes)){
    assert.equal(bySource.get(source),destination,source+' must route to national-planting');
  }
});

test('national specialist hub routes are explicit and precede catch-all',()=>{
  const catchAll=rewrites.findIndex(r=>r.source==='/national-tools/:path*');
  assert.ok(catchAll>=0,'national tools catch-all must exist');
  for(const [source,destination] of Object.entries(hubRoutes)){
    assert.equal(bySource.get(source),destination,source+' must route to national hub');
    const index=rewrites.findIndex(r=>r.source===source);
    assert.ok(index>=0&&index<catchAll,source+' must precede the hub catch-all');
  }
});

test('planting page and its API dependencies remain on canonical main-domain routes',()=>{
  assert.equal(bySource.get('/national-tools/planting/'),plantingOrigin+'/national-tools/planting/');
  assert.equal(bySource.get('/api/national-geocode'),'https://national-outdoor-core.vercel.app/api/national-geocode');
  assert.equal(bySource.get('/api/national-frost'),'https://national-frost.vercel.app/api/national-frost');
});
