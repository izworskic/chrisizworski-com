'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Icons = require('../public/assets/seaway-vessel-icons.js');

test('Duluth shared side profiles retain clear freighter hull and visibly distinct categories', () => {
  const cargo = Icons.svg('cargo');
  assert.match(cargo, /viewBox="0 0 72 36"/);
  for (const detail of ['ship-house','ship-stack','ship-hatch','ship-hull']) assert.ok(cargo.includes(detail));
  assert.notEqual(cargo, Icons.svg('unknown'));
  assert.notEqual(cargo, Icons.svg('tanker'));
  assert.notEqual(cargo, Icons.svg('sail'));
  assert.doesNotMatch(cargo, /rotate\(/);
});
