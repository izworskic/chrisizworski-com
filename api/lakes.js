const standaloneHandler = require('ontario-fishing-lake-finder/api/lakes');

module.exports = async function handler(req, res) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  return standaloneHandler(req, res);
};
