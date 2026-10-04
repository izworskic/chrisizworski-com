import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const mapJs = fs.readFileSync('public/assets/niagara-bridge-camera-map.20261004.js', 'utf8');
const liveJs = fs.readFileSync('public/assets/niagara-live-cameras.20261003.js', 'utf8');

test('Niagara bridge camera map contains exactly the nine NITTEC international bridge cameras', () => {
  const ids = [...mapJs.matchAll(/sourceId:\s*(\d+)/g)].map((match) => Number(match[1]));
  assert.deepEqual(ids.sort((a, b) => a - b), [688, 1001, 1002, 1003, 1004, 1005, 1011, 1021, 1022]);
  assert.equal((mapJs.match(/sourceId:/g) || []).length, 9);
});

test('Niagara bridge camera map uses NITTEC camera coordinates and no fake Whirlpool camera', () => {
  assert.match(mapJs, /42\.90774, lng: -78\.91968/);
  assert.match(mapJs, /43\.08906, lng: -79\.06638/);
  assert.match(mapJs, /43\.09151, lng: -79\.06948/);
  assert.match(mapJs, /43\.15271, lng: -79\.04287/);
  assert.match(mapJs, /43\.15391, lng: -79\.04839/);
  assert.doesNotMatch(mapJs, /group:\s*["']whirlpool["']/);
  assert.match(mapJs, /Whirlpool Rapids currently has no dedicated camera/);
});

test('regional map groups cameras by bridge then exposes individual camera markers', () => {
  assert.match(mapJs, /const DETAIL_ZOOM = 13/);
  assert.match(mapJs, /state\.zoom < DETAIL_ZOOM \? groupCenters : cameras/);
  assert.match(mapJs, /data-camera-group/);
  assert.match(mapJs, /data-camera-id/);
  assert.match(mapJs, /Open this camera/);
});

test('map camera selection reuses the existing embedded camera viewer', () => {
  assert.match(mapJs, /\[data-niagara-camera=/);
  assert.match(mapJs, /button\.click\(\)/);
  assert.match(mapJs, /niagaraCameraViewer/);
  assert.match(mapJs, /action: "map-select"/);
});

test('live camera enhancement loads fingerprinted map only after legacy visual layer is settled', () => {
  assert.match(liveJs, /\/assets\/niagara-bridge-camera-map\.20261004\.js/);
  assert.match(liveJs, /data-niagara-bridge-camera-map/);
  assert.match(liveJs, /scheduleBridgeCameraMap\(\)/);
  assert.match(liveJs, /window\.addEventListener\("load", loadBridgeCameraMap, \{ once: true \}\)/);
});
