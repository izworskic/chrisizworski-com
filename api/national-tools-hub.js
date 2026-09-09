'use strict';
// Public text/html composition; API and preview X-Robots-Tag protection stays in vercel.json.
module.exports = require('../lib/public-tool-page.js')(
  'https://national-outdoor-tools-hub.vercel.app/national-tools/?v=20260909-melvin-price-v3'
);
