'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { buildDecision, chooseViewpoint, describeVisitFit } = require('../lib/kilauea-decision');

function liveInput() {
  return {
    eruption: {
      observedAt: '2026-09-29T09:30:00Z',
      text: 'Lava fountains are ongoing and active at the summit.'
    },
    access: { parkClosed:false, closureUnknown:false, closedViewpoints:[] },
    weather: { hourly:[
      { startTime:'2026-09-29T09:00:00Z', endTime:'2026-09-29T11:00:00Z', shortForecast:'Mostly Clear', precipProbability:5, temperature:61, temperatureUnit:'F' },
      { startTime:'2026-09-29T14:00:00Z', endTime:'2026-09-29T15:00:00Z', shortForecast:'Partly Cloudy', precipProbability:10, temperature:63, temperatureUnit:'F' },
      { startTime:'2026-09-30T18:00:00Z', endTime:'2026-09-30T19:00:00Z', shortForecast:'Mostly Clear', precipProbability:5, temperature:62, temperatureUnit:'F' }
    ]},
    sources: {
      hvo:{status:'ok',name:'USGS HVO'},
      nps:{status:'ok',name:'NPS'},
      weather:{status:'ok',name:'NWS'},
      air:{status:'ok',name:'Hawaii DOH'}
    }
  };
}

const now = new Date('2026-09-29T10:00:00Z');

function decision(profile) {
  return buildDecision(liveInput(), profile, now);
}

test('short-walk photography no longer collapses to the casual viewpoint', () => {
  assert.equal(chooseViewpoint({travel:'one',mobility:'short',experience:'casual',plan:'now'}, {}).id, 'uekahuna');
  assert.equal(chooseViewpoint({travel:'one',mobility:'short',experience:'photo',plan:'now'}, {}).id, 'kilauea-overlook');
  assert.equal(chooseViewpoint({travel:'one',mobility:'walk',experience:'photo',plan:'now'}, {}).id, 'keanakakoi');
});

test('every trip control changes visible visit-fit language', () => {
  const baseline = decision({travel:'one',mobility:'short',experience:'casual',plan:'now'}).visitFit;
  const variants = [
    decision({travel:'here',mobility:'short',experience:'casual',plan:'now'}).visitFit,
    decision({travel:'three',mobility:'short',experience:'casual',plan:'now'}).visitFit,
    decision({travel:'one',mobility:'walk',experience:'casual',plan:'now'}).visitFit,
    decision({travel:'one',mobility:'short',experience:'photo',plan:'now'}).visitFit,
    decision({travel:'one',mobility:'short',experience:'casual',plan:'today'}).visitFit,
    decision({travel:'one',mobility:'short',experience:'casual',plan:'tomorrow'}).visitFit
  ];
  for (const value of variants) assert.notEqual(value, baseline);
});

test('drive distance changes the top action, not just hidden profile state', () => {
  const here = decision({travel:'here',mobility:'short',experience:'casual',plan:'now'});
  const one = decision({travel:'one',mobility:'short',experience:'casual',plan:'now'});
  const three = decision({travel:'three',mobility:'short',experience:'casual',plan:'now'});
  assert.notEqual(here.action, one.action);
  assert.match(here.action, /already there/i);
  assert.match(one.action, /one-hour drive/i);
  assert.match(three.action, /three-hour drive/i);
});

test('visit-fit copy explains why a preference changes the place recommendation', () => {
  const casual = describeVisitFit({travel:'one',mobility:'short',experience:'casual',plan:'now'}, chooseViewpoint({mobility:'short',experience:'casual'}, {}));
  const photo = describeVisitFit({travel:'one',mobility:'short',experience:'photo',plan:'now'}, chooseViewpoint({mobility:'short',experience:'photo'}, {}));
  assert.match(casual, /ease and context get extra weight/i);
  assert.match(casual, /Uēkahuna/);
  assert.match(photo, /Photography matters/i);
  assert.match(photo, /Kīlauea Overlook/);
});

test('choice guard makes personalization visible in the first decision block and is idempotent', async () => {
  const source = path.join(__dirname, '..', 'public', 'synced-national-tools', 'kilauea-live', 'index.html');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kilauea-choice-'));
  const targetDir = path.join(root, 'public', 'synced-national-tools', 'kilauea-live');
  fs.mkdirSync(targetDir, {recursive:true});
  const target = path.join(targetDir, 'index.html');
  fs.copyFileSync(source, target);
  const mod = await import('../scripts/ensure-kilauea-choice-causality.mjs');
  mod.ensureKilaueaChoiceCausality(root);
  const once = fs.readFileSync(target, 'utf8');
  mod.ensureKilaueaChoiceCausality(root);
  const twice = fs.readFileSync(target, 'utf8');
  assert.equal(once, twice);
  assert.match(once, /id="visitFit"/);
  assert.match(once, /d\.decision\?\.visitFit/);
  assert.match(once, /quickAction','visitFit'/);
  assert.match(once, /URLSearchParams\(\{travel:state\.travel,mobility:state\.mobility,experience:state\.experience,plan:state\.plan\}\)/);
});
