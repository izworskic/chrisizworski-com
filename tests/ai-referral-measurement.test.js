'use strict';

const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'public/assets/ai-referral-measurement.js'), 'utf8');
const injector = fs.readFileSync(path.join(root, 'scripts/inject-ga4.mjs'), 'utf8');

function runMeasurement({ referrer = '', search = '', pathname = '/' } = {}) {
  const events = [];
  const storage = new Map();
  const context = {
    URL,
    URLSearchParams,
    Date,
    console,
    document: { referrer },
    window: {
      location: { search, pathname },
      dataLayer: [],
      sessionStorage: {
        getItem(key) { return storage.has(key) ? storage.get(key) : null; },
        setItem(key, value) { storage.set(key, String(value)); },
      },
      gtag(...args) { events.push(args); },
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { events, storage, context };
}

test('ChatGPT referrer produces dedicated and generic AI landing events', () => {
  const { events } = runMeasurement({
    referrer: 'https://chatgpt.com/c/abc123',
    pathname: '/northern-lights-michigan/',
  });
  assert.equal(events.length, 2);
  assert.equal(events[0][0], 'event');
  assert.equal(events[0][1], 'chatgpt_referral_landing');
  assert.equal(events[0][2].ai_assistant, 'chatgpt');
  assert.equal(events[0][2].ai_referrer_host, 'chatgpt.com');
  assert.equal(events[0][2].ai_detection, 'referrer');
  assert.equal(events[0][2].landing_path, '/northern-lights-michigan/');
  assert.equal(events[1][1], 'ai_referral_landing');
});

test('utm_source=chatgpt.com catches referrals when browser referrer is stripped', () => {
  const { events } = runMeasurement({
    search: '?utm_source=chatgpt.com&utm_medium=referral',
    pathname: '/soo-locks/',
  });
  assert.equal(events[0][1], 'chatgpt_referral_landing');
  assert.equal(events[0][2].ai_detection, 'utm');
  assert.equal(events[0][2].referral_utm_source, 'chatgpt.com');
});

test('ordinary non-AI traffic produces no AI referral event', () => {
  const { events } = runMeasurement({
    referrer: 'https://www.google.com/',
    pathname: '/fall-color/',
  });
  assert.deepEqual(events, []);
});

test('measurement layer does not override native GA4 campaign/source attribution', () => {
  assert.doesNotMatch(source, /campaign_source|campaign_medium|traffic_source|session_source/i);
  assert.match(source, /Do not override GA4 campaign\/source attribution/);
});

test('build injector installs the referral layer independently of the GA4 base tag', () => {
  assert.match(injector, /AI_REFERRAL_ASSET\s*=\s*'\/assets\/ai-referral-measurement\.js'/);
  assert.match(injector, /needsAiReferral/);
  assert.match(injector, /AI_REFERRAL_TAG/);
});
