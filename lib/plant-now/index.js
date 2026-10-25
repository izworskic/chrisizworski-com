// What to Plant Now in Michigan. The engine lives in public/assets/garden-tools/ so the hub page and
// this module run the same code; this file loads it, with its date, station and place data, for Node.
'use strict';
const path = require('node:path');
const dir = path.join(__dirname, '..', '..', 'public', 'assets', 'garden-tools');
for (const f of ['garden-kit.js', 'michigan-frost.js', 'michigan-places.js']) require(path.join(dir, f));
module.exports = require(path.join(dir, 'plant-now.js'));
