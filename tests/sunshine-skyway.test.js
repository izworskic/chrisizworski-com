const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseOperationalSignal,
  resolveOperationalState,
  buildWindContext,
  calculateToll,
  evaluateVehicleContext,
  STATIC_CAMERAS,
  TOLL_POLICY,
} = require('../lib/sunshine-skyway');

const LIVE = { alerts: { state: 'ok' }, traffic: { state: 'ok' } };

test('explicit official Sunshine Skyway closure language produces CLOSED', () => {
  const result = resolveOperationalState({
    alertsText: 'Tampa Bay | Pinellas | I-275 / Sunshine Skyway Bridge – All lanes closed due to high winds.',
    trafficText: 'Traffic Events',
    sourceHealth: LIVE,
  });
  assert.equal(result.state, 'CLOSED');
  assert.equal(result.reason, 'EXPLICIT_OFFICIAL_CLOSURE_SIGNAL');
});

test('raw or forecast wind never produces an operational closure', () => {
  const wind = buildWindContext({ periods: [{ startTime: '2026-10-05T16:00:00Z', windSpeed: '45 mph', windDirection: 'E' }], alerts: [] });
  assert.equal(wind.level, 'HIGH_WIND_CLOSURE_RISK_CONTEXT');
  const status = resolveOperationalState({ alertsText: 'FL511 Alerts', trafficText: 'Traffic Events', sourceHealth: LIVE });
  assert.equal(status.state, 'NO_CLOSURE_SIGNAL_FOUND');
  assert.notEqual(status.state, 'CLOSED');
});

test('40 mph is represented as conditional FHP context, not an automatic closure rule', () => {
  const wind = buildWindContext({ periods: [{ startTime: '2026-10-05T16:00:00Z', windSpeed: '40 mph' }], alerts: [] });
  assert.equal(wind.closureDecisionMphContext, 40);
  assert.match(wind.authorityNote, /FHP may deem closure necessary/i);
  assert.match(wind.authorityNote, /never closes the bridge/i);
});

test('generic FL511 navigation text cannot fabricate a Skyway closure', () => {
  const signals = parseOperationalSignal('FL511 Map Traffic Closures Detour Routes Traffic Cameras Sunshine Skyway Bridge camera view available.');
  assert.equal(signals.some(signal => signal.level === 'CLOSED'), false);
});

test('missing live official sources fail closed to UNKNOWN', () => {
  const result = resolveOperationalState({
    alertsText: 'Sunshine Skyway Bridge all lanes closed',
    trafficText: '',
    sourceHealth: { alerts: { state: 'degraded_cached' }, traffic: { state: 'unavailable' } },
  });
  assert.equal(result.state, 'UNKNOWN');
  assert.equal(result.staleSignals.some(signal => signal.level === 'CLOSED'), true);
});

test('one live source is insufficient for an optimistic no-closure conclusion', () => {
  const result = resolveOperationalState({
    alertsText: 'FL511 Alerts', trafficText: '',
    sourceHealth: { alerts: { state: 'ok' }, traffic: { state: 'unavailable' } },
  });
  assert.equal(result.state, 'UNKNOWN');
});

test('explicit bridge impact remains IMPACTED rather than becoming CLOSED', () => {
  const result = resolveOperationalState({
    alertsText: 'Sunshine Skyway Bridge: a crash has one lane blocked. Expect delays.',
    trafficText: 'Traffic Events', sourceHealth: LIVE,
  });
  assert.equal(result.state, 'IMPACTED');
});

test('current Sunshine Skyway toll schedule is all-electronic and direction maps to the correct plaza', () => {
  assert.equal(TOLL_POLICY.collection, 'ALL_ELECTRONIC');
  assert.equal(TOLL_POLICY.effectiveDate, '2026-04-12');
  const north = calculateToll({ direction: 'northbound', axles: 2, payment: 'sunpass' });
  assert.equal(north.amount, 1.16);
  assert.match(north.plaza, /South Plaza/i);
  const south = calculateToll({ direction: 'southbound', axles: 2, payment: 'toll_by_plate' });
  assert.equal(south.amount, 1.62);
  assert.match(south.plaza, /North Plaza/i);
});

test('multi-axle toll formula matches the official schedule', () => {
  assert.equal(calculateToll({ axles: 3, payment: 'sunpass' }).amount, 2.32);
  assert.equal(calculateToll({ axles: 4, payment: 'toll_by_plate' }).amount, 4.86);
  assert.equal(calculateToll({ axles: 5, payment: 'sunpass' }).amount, 4.64);
  assert.equal(calculateToll({ axles: 6, payment: 'toll_by_plate' }).amount, 8.10);
});

test('cash is not accepted as a current payment mode', () => {
  const result = calculateToll({ axles: 2, payment: 'cash' });
  assert.equal(result.state, 'UNKNOWN_PAYMENT');
  assert.equal(result.amount, null);
  assert.match(result.note, /all-electronic/i);
});

test('wind-sensitive vehicle receives context, not an invented legal prohibition', () => {
  const caution = evaluateVehicleContext({
    vehicle: 'rv', officialState: 'NO_CLOSURE_SIGNAL_FOUND',
    windContext: { level: 'HIGH_WIND_CLOSURE_RISK_CONTEXT' },
  });
  assert.equal(caution.state, 'CAUTION');
  assert.match(caution.reason, /No class-specific prohibition is being invented/i);
  const ordinary = evaluateVehicleContext({ vehicle: 'rv', officialState: 'NO_CLOSURE_SIGNAL_FOUND', windContext: { level: 'ROUTINE_CONTEXT' } });
  assert.equal(ordinary.state, 'NO_SPECIAL_RESTRICTION_FOUND');
});

test('an official closure applies to every selected vehicle class', () => {
  for (const vehicle of ['car', 'motorcycle', 'rv', 'trailer', 'high_profile']) {
    assert.equal(evaluateVehicleContext({ vehicle, officialState: 'CLOSED', windContext: {} }).state, 'PROHIBITED');
  }
});

test('V1 camera set is official and anchored to the verified FL511 Skyway camera', () => {
  assert.ok(STATIC_CAMERAS.length >= 1);
  assert.equal(STATIC_CAMERAS.every(camera => camera.official === true), true);
  assert.equal(STATIC_CAMERAS.some(camera => camera.embedUrl === 'https://fl511.com/tooltip/Cameras/2553'), true);
});
