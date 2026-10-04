const test = require('node:test');
const assert = require('node:assert/strict');

const { mergeNiagaraSources } = require('../lib/niagara-border-crossings');

function lane(wait = 0) {
  return {
    available: true,
    status: 'reported',
    wait_minutes: wait,
    display: wait === 0 ? 'No delay' : `${wait} min`,
    lanes_open: null,
    updated_at: '2026-10-04T00:00:00.000Z',
  };
}

function emptyOperator(name, url) {
  return {
    source_name: name,
    source_url: url,
    updated_at: '2026-10-04T00:00:00.000Z',
    waits: {
      peace: { to_us: {}, to_canada: {} },
      rainbow: { to_us: {}, to_canada: {} },
      whirlpool: { to_us: {}, to_canada: {} },
      'lewiston-queenston': { to_us: {}, to_canada: {} },
    },
  };
}

test('Whirlpool never falls back to Peace Bridge operator data', () => {
  const nfbc = emptyOperator('Niagara Falls Bridge Commission', 'https://www.niagarafallsbridges.com/services/traffic-conditions');
  const peace = emptyOperator('Buffalo and Fort Erie Public Bridge Authority', 'https://www.peacebridge.com/Traffic/index.php');
  peace.waits.whirlpool.to_canada.nexus = lane(0);

  const crossings = mergeNiagaraSources([], '', { nfbc, peace });
  const whirlpool = crossings.find((crossing) => crossing.id === 'whirlpool');

  assert.equal(whirlpool.waits.to_canada.operator_source.name, 'Niagara Falls Bridge Commission');
  assert.equal(whirlpool.waits.to_canada.operator_source.available, false);
  assert.equal(whirlpool.waits.to_canada.passenger.nexus.available, false);
  assert.equal(whirlpool.source_available.operator, false);
});

test('Peace Bridge never falls back to NFBC operator data', () => {
  const nfbc = emptyOperator('Niagara Falls Bridge Commission', 'https://www.niagarafallsbridges.com/services/traffic-conditions');
  const peace = emptyOperator('Buffalo and Fort Erie Public Bridge Authority', 'https://www.peacebridge.com/Traffic/index.php');
  nfbc.waits.peace.to_canada.nexus = lane(0);

  const crossings = mergeNiagaraSources([], '', { nfbc, peace });
  const crossing = crossings.find((item) => item.id === 'peace');

  assert.equal(crossing.waits.to_canada.operator_source.name, 'Buffalo and Fort Erie Public Bridge Authority');
  assert.equal(crossing.waits.to_canada.operator_source.available, false);
  assert.equal(crossing.waits.to_canada.passenger.nexus.available, false);
  assert.equal(crossing.source_available.operator, false);
});
