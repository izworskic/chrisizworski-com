'use strict';
// Public text/html composition; API and preview X-Robots-Tag protection stays in vercel.json.
const { composeGardenWaterIdentityGraph } = require('../lib/garden-water-identity-composition.js');
const { releaseHtml } = require('../lib/garden-water-release-c82dda3c.js');
module.exports = require('../lib/public-tool-page.js')(
  null,
  composeGardenWaterIdentityGraph,
  { releaseHtml: releaseHtml() }
);
