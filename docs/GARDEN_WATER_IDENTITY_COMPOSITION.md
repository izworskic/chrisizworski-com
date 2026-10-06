# Garden Water identity composition proposal

Patch prepared for the canonical Garden Water root HTML response only. It uses the existing `publicToolPage(source, transformHtml)` hook in `lib/public-tool-page.js` and does not change the owner URL, request handlers, APIs, data, generated city pages, assets, title, canonical, user interface, or ads.

The constants are transcribed from `izworskic/national-garden-water` main `7e467e7014dba3f1cee9f4e88b3d8dfa0a911f60`, `public/national-tools/garden-water/index.html` blob `aefd838d36f11e2c55b3ab76b897b5cc6efe9d9d`.

Suggested route wiring:

```js
const { composeGardenWaterIdentityGraph } = require('../lib/garden-water-identity-composition.js');
module.exports = require('../lib/public-tool-page.js')(
  'https://national-garden-water.vercel.app/national-tools/garden-water/',
  composeGardenWaterIdentityGraph
);
```

Ten focused fixtures cover owner-graph insertion, idempotence, unrelated-node preservation, malformed/conflicting graphs, nested Person definitions, and a valid WebPage plus WebApplication pair. They run in the main repository's full gate; the production release workflow separately checks the actual canonical route after promotion.
