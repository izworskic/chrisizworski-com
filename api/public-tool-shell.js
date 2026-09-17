'use strict';
const publicToolPage = require('../lib/public-tool-page.js');
const sources = require('../lib/public-tool-sources.js');
const handlers = Object.fromEntries(Object.entries(sources).map(([key, url]) => [key, publicToolPage(url)]));

// Only named, preconfigured public HTML documents can be composed here.
// Tool APIs, assets, canonical URLs and decision logic remain owner-controlled.
module.exports = async function handler(req, res) {
  const key = req.query?.tool;
  if (typeof key !== 'string' || !Object.hasOwn(handlers, key)) {
    res.setHeader('X-Robots-Tag', 'noindex');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(404).send('Tool page not found');
  }
  return handlers[key](req, res);
};
