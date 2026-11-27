'use strict';
// Public text/html composition; API and preview X-Robots-Tag protection stays in vercel.json.
const { composeGardenWaterIdentityGraph } = require('../lib/garden-water-identity-composition.js');
const { releaseHtml } = require('../lib/garden-water-release-27f5f98e.js');
module.exports = require('../lib/public-tool-page.js')(
  'https://national-garden-water.vercel.app/national-tools/garden-water/',
  composeGardenWaterIdentityGraph,
  { releaseHtml: releaseHtml() }
);
