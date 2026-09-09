'use strict';
// Public text/html composition; API and preview X-Robots-Tag protection stays in vercel.json.
// Always fetch the current National Tools production alias. The public-tool-page wrapper
// provides the short CDN cache, so this proxy must not pin the hub to an old release query.
module.exports = require('../lib/public-tool-page.js')(
  'https://national-outdoor-tools-hub.vercel.app/national-tools/'
);
