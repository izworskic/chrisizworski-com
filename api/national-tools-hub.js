'use strict';
// Public text/html composition; API and preview X-Robots-Tag protection stays in vercel.json.
// Always fetch the current National Tools production alias. The public-tool-page wrapper
// provides the short CDN cache, so this proxy must not pin the hub to an old release query.
// The hub repository owns its complete directory. Mutating that HTML again here can create
// duplicate cards and structured-data drift when both deployment layers add the same tool.
module.exports = require('../lib/public-tool-page.js')(
  'https://national-outdoor-tools-hub.vercel.app/national-tools/'
);
