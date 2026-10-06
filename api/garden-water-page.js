'use strict';
// Public text/html composition; API and preview X-Robots-Tag protection stays in vercel.json.
const { composeGardenWaterIdentityGraph } = require('../lib/garden-water-identity-composition.js');
module.exports = require('../lib/public-tool-page.js')(
  'https://national-garden-water.vercel.app/national-tools/garden-water/',
  composeGardenWaterIdentityGraph
);
