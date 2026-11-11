'use strict';
// Public text/html composition. X-Robots-Tag for /api/ and previews is in vercel.json.
const fs = require('node:fs');
const path = require('node:path');
const { createPageHandler } = require('../lib/freighter-page');
module.exports = createPageHandler(() => fs.readFileSync(path.join(process.cwd(), 'public/great-lakes-freighter-tracking/index.html'), 'utf8'));
