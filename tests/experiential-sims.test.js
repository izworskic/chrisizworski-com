const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const skySrc = read('public/assets/aurora-sky-sim.js');
const sky = new Function(skySrc.slice(skySrc.indexOf('var R = 6371'), skySrc.indexOf('var canvas')) + ';return {model, REGIONS, magLat};')();
const lockSrc = read('public/assets/soo-lock-sim.js');
const lock = new Function(lockSrc.slice(lockSrc.indexOf('var LOCKS'), lockSrc.indexOf('var PHASES')) +
  lockSrc.match(/function lockFor[\s\S]*?\n/)[0] + lockSrc.match(/function gallons[\s\S]*?\n/)[0] + ';return {LOCKS, SHIPS, lockFor, gallons};')();
const clear = {dark: true, moon: false, clouds: 0};

test('aurora preview: higher Kp brings the aurora higher and brighter', () => {
  let prev = null;
  for (let kp = 2; kp <= 9; kp++) {
    const p = sky.model('marquette', kp, clear);
    if (prev) { assert.ok(p.low >= prev.low && p.eye >= prev.eye, 'Kp ' + kp); }
    prev = p;
  }
  assert.equal(sky.model('keweenaw', 9, clear).low, 90, 'a severe storm puts the oval overhead in the Keweenaw');
});

test('aurora preview: the U.P. sees it before southern Michigan, in line with the page thresholds', () => {
  const firstEye = id => { for (let kp = 0; kp <= 9; kp += 0.1) if (sky.model(id, kp, clear).eye >= 0.25) return kp; return 10; };
  const up = firstEye('marquette'), straits = firstEye('mackinaw-city'), detroit = firstEye('detroit');
  assert.ok(up < straits && straits < detroit);
  assert.ok(up >= 4 && up <= 5.2, 'Marquette eye threshold ' + up.toFixed(1));
  assert.ok(detroit >= 6 && detroit <= 7.5, 'Detroit eye threshold ' + detroit.toFixed(1));
  assert.ok(Math.abs(sky.magLat(46.55, -87.40) - 55.4) < 0.3, 'Marquette geomagnetic latitude');
});

test('aurora preview: clouds, moon and town light only ever take away', () => {
  const base = sky.model('bay-city', 6.5, clear);
  assert.ok(sky.model('bay-city', 6.5, {...clear, clouds: 80}).eye < base.eye);
  assert.ok(sky.model('bay-city', 6.5, {...clear, moon: true}).eye < base.eye);
  assert.ok(sky.model('bay-city', 6.5, {...clear, dark: false}).eye < base.eye);
  assert.equal(sky.model('bay-city', 6.5, {...clear, clouds: 100}).eye, 0);
});

test('Soo lock: ships go to the lock that fits them, from the chamber sizes on the page', () => {
  assert.equal(lock.lockFor(lock.SHIPS.tregurtha), 'poe');
  assert.equal(lock.lockFor(lock.SHIPS.anderson), 'poe', '767 ft is longer than the MacArthur limit');
  assert.equal(lock.lockFor(lock.SHIPS.saltie), 'poe');
  assert.equal(lock.lockFor(lock.SHIPS.fitzgerald), 'macarthur');
  assert.equal(lock.lockFor(lock.SHIPS.mackinaw), 'macarthur');
  for (const s of Object.values(lock.SHIPS)) {
    const l = lock.LOCKS[lock.lockFor(s)];
    assert.ok(s.len < l.len && s.beam < l.beam, s.name + ' fits');
  }
  assert.equal(lock.gallons(lock.LOCKS.poe), 20.7);
  const html = read('public/soo-locks/index.html');
  assert.match(html, /Poe Lock \(1968\)[\s\S]*?Length: <b>1,200 ft<\/b><br>Width: <b>110 ft<\/b>/);
  assert.match(html, /MacArthur Lock \(1943\)[\s\S]*?Length: <b>800 ft<\/b><br>Width: <b>80 ft<\/b>/);
});

test('both interactive modules are on their pages, loaded once, and free of em dashes', () => {
  const nl = read('public/northern-lights-michigan/index.html');
  assert.equal((nl.match(/id="aurora-sky-sim"/g) || []).length, 1);
  assert.equal((nl.match(/src="\/assets\/aurora-sky-sim\.js"/g) || []).length, 1);
  assert.ok(nl.includes('href="#aurora-sky-sim"'));
  const soo = read('public/soo-locks/index.html');
  assert.equal((soo.match(/id="soo-lock-sim"/g) || []).length, 1);
  assert.equal((soo.match(/src="\/assets\/soo-lock-sim\.js"/g) || []).length, 1);
  for (const f of ['public/assets/aurora-sky-sim.js', 'public/assets/aurora-sky-sim.css', 'public/assets/soo-lock-sim.js', 'public/assets/soo-lock-sim.css']) {
    assert.ok(!read(f).includes('—'), f);
  }
  const nlSec = nl.slice(nl.indexOf('id="aurora-sky-sim"'), nl.indexOf('<h2 class="sh">The Kp Scale</h2>'));
  const sooSec = soo.slice(soo.indexOf('id="soo-lock-sim"'), soo.indexOf('Navigation Season: When'));
  assert.ok(!nlSec.includes('—') && !sooSec.includes('—'));
});
