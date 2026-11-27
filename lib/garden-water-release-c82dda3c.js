'use strict';
// Owner-built release artifact. Only asset URLs are rewritten here; no tool logic.
const release = require('./garden-water-release-c82dda3c.json');
const prefix = '/assets/garden-water-release-c82dda3c';
function releaseHtml() {
  return release.html
    .replace('/assets/national-garden-water.css?v=20260904-v5', prefix + '/national-garden-water.css')
    .replace('/assets/national-garden-water-page.js?v=20260904-v5', prefix + '/national-garden-water-page.js');
}
module.exports = { release, releaseHtml, prefix };
